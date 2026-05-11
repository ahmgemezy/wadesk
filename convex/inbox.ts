// convex/inbox.ts
// Real-time inbox queries and mutations — task 012
// WhatsApp API send call is wired in task 013.

import { v, ConvexError } from "convex/values";
import { query, mutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { internal } from "./_generated/api";
import { getCallerIdentity, assertAdminOrSupervisor, isAdminOrSupervisor, type OrgRole } from "./lib/auth";
import type { Id } from "./_generated/dataModel";

// ─── List Conversations ───────────────────────────────────────────────────────

export const listConversations = query({
  args: {
    filter: v.union(
      v.literal("all"),
      v.literal("mine"),
      v.literal("unassigned"),
    ),
    contactStage: v.optional(v.union(
      v.literal("all"),
      v.literal("lead"),
      v.literal("prospect"),
      v.literal("customer"),
      v.literal("retained"),
      v.literal("churned"),
    )),
    departmentId: v.optional(v.id("departments")),
    channelId: v.optional(v.id("channels")),
    status: v.optional(v.union(
      v.literal("open"),
      v.literal("pending"),
      v.literal("resolved"),
      v.literal("forwarded"),
    )),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    // When status is known, use the composite index to skip full-tenant scan.
    // Without status, fall back to by_last_message bounded to 1000 rows.
    const all = args.status
      ? await ctx.db
          .query("conversations")
          .withIndex("by_tenant_status_last_message", (q) =>
            q.eq("tenantId", tenantId).eq("status", args.status!)
          )
          .order("desc")
          .take(1000)
      : await ctx.db
          .query("conversations")
          .withIndex("by_last_message", (q) => q.eq("tenantId", tenantId))
          .order("desc")
          .take(1000);

    let filtered = all;
    if (args.filter === "mine") {
      filtered = all.filter((c) => c.assignedAgentId === callerId);
    } else if (args.filter === "unassigned") {
      filtered = all.filter((c) => !c.assignedAgentId);
    } else if (!isAdminOrSupervisor(orgRole)) {
      // Agents see: assigned-to-me, unassigned, OR conversations that contain
      // a follow-up (so the team can collaborate on outreach across
      // departments without being blocked by assignment).
      filtered = all.filter(
        (c) =>
          c.assignedAgentId === callerId ||
          !c.assignedAgentId ||
          c.hasFollowUp === true,
      );
    }

    if (args.channelId) {
      filtered = filtered.filter((c) => c.channelId === args.channelId);
    }

    if (args.departmentId) {
      filtered = filtered.filter((c) => c.departmentId === args.departmentId);
    }

    if (args.status) {
      filtered = filtered.filter((c) => c.status === args.status);
    }

    const page = filtered.slice(0, 200);

    const rawResult = await Promise.all(
      page.map(async (conv) => {
        const contact = await ctx.db.get(conv.contactId);
        const name = contact?.customName ?? contact?.displayName ?? "";
        const initials = name
          .split(" ")
          .map((w: string) => w[0] ?? "")
          .filter(Boolean)
          .slice(0, 2)
          .join("")
          .toUpperCase() || "؟";

        let departmentName: string | undefined;
        if (conv.departmentId) {
          const dept = await ctx.db.get(conv.departmentId);
          departmentName = dept?.name;
        }

        const metric = await ctx.db
          .query("conversationMetrics")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
          .first();

        return {
          id: conv._id as string,
          contactId: conv.contactId as string,
          contactName: name || undefined,
          contactPhone: contact?.phone,
          contactAvatarInitials: initials,
          contactStage: (contact?.stage ?? "lead") as string,
          assignedAgentId: conv.assignedAgentId,
          status: conv.status,
          labels: conv.labels,
          slaBreachedAt: conv.slaBreachedAt,
          lastMessagePreview: conv.lastMessagePreview,
          lastMessageAt: conv.lastMessageAt,
          unreadCount: conv.unreadCount,
          channelId: conv.channelId as string,
          departmentId: conv.departmentId ? (conv.departmentId as string) : undefined,
          departmentName,
          csatScore: metric?.csatScore,
        };
      }),
    );

    const stageFiltered =
      args.contactStage && args.contactStage !== "all"
        ? rawResult.filter((r) => r.contactStage === args.contactStage)
        : rawResult;

    return stageFiltered.slice(0, 50);
  },
});

// ─── Get Messages ─────────────────────────────────────────────────────────────

export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.tenantId !== tenantId) return null;

    let forwardedToChannelName: string | undefined;
    let forwardedToDepartmentName: string | undefined;
    if (conv.forwardedToChannelId) {
      const target = await ctx.db.get(conv.forwardedToChannelId);
      if (target && target.tenantId === tenantId) {
        forwardedToChannelName = target.displayName;
      }
    }
    if (conv.forwardedToDepartmentId) {
      const dept = await ctx.db.get(conv.forwardedToDepartmentId);
      if (dept && dept.tenantId === tenantId) {
        forwardedToDepartmentName = dept.name;
      }
    }

    return { ...conv, forwardedToChannelName, forwardedToDepartmentName };
  },
});

export const getMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) return [];

    return ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .take(200);
  },
});

export const getMessagesPaginated = query({
  args: {
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) {
      return { page: [], isDone: true, continueCursor: "" };
    }
    return ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .paginate(args.paginationOpts);
  },
});

// ─── Send Message ─────────────────────────────────────────────────────────────
// Persists message to DB. WhatsApp API call added in task 013.

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    type: v.union(v.literal("reply"), v.literal("note")),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    if (
      !isAdminOrSupervisor(orgRole) &&
      conversation.assignedAgentId !== callerId &&
      conversation.assignedAgentId !== undefined
    ) {
      throw new ConvexError("FORBIDDEN");
    }

    const isNote = args.type === "note";
    const now = Date.now();

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      tenantId,
      direction: "outbound",
      content: args.content,
      contentType: "text",
      isInternalNote: isNote,
      authorId: callerId,
      source: isNote ? undefined : "api",
      status: "sending",
      timestamp: now,
      createdAt: now,
    });

    if (!isNote) {
      const channel = await ctx.db.get(conversation.channelId);
      const contact = await ctx.db.get(conversation.contactId);

      let assignedAgentId = conversation.assignedAgentId;
      if (!assignedAgentId && channel?.assignmentMode === "first_reply") {
        assignedAgentId = callerId;
      }

      await ctx.db.patch(args.conversationId, {
        lastMessageAt: now,
        lastMessagePreview: args.content.slice(0, 80),
        unreadCount: 0,
        assignedAgentId,
        ...(conversation.slaBreachedAt !== undefined ? { slaBreachedAt: undefined } : {}),
      });

      if (channel && contact) {
        await ctx.scheduler.runAfter(0, internal.actions.sendWhatsAppMessage.sendMessage, {
          messageId,
          phoneNumberId: channel.phoneNumberId,
          contactPhone: contact.phone,
          content: args.content,
          tenantId,
        });
      }

      await ctx.scheduler.runAfter(0, internal.conversationMetrics.recordFirstResponse, {
        conversationId: args.conversationId,
        firstResponseAt: now,
      });

      await ctx.scheduler.runAfter(0, internal.conversationMetrics.incrementMessageCount, {
        conversationId: args.conversationId,
      });
    }

    return messageId;
  },
});

// ─── Update Conversation Status ───────────────────────────────────────────────

export const updateStatus = mutation({
  args: {
    conversationId: v.id("conversations"),
    status: v.union(
      v.literal("open"),
      v.literal("pending"),
      v.literal("resolved"),
    ),
    actorName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    if (!isAdminOrSupervisor(orgRole)) {
      // Agent can only resolve conversations assigned to them
      if (conversation.assignedAgentId !== callerId) {
        throw new ConvexError("FORBIDDEN");
      }
      if (args.status !== "resolved") {
        throw new ConvexError("FORBIDDEN");
      }
    }

    await ctx.db.patch(args.conversationId, {
      status: args.status,
      resolvedAt: args.status === "resolved" ? Date.now() : undefined,
    });

    if (args.status === "resolved" || args.status === "open") {
      const identity = await ctx.auth.getUserIdentity();
      const actorName =
        args.actorName ?? identity?.name ?? identity?.email ?? "Agent";
      const now = Date.now();
      await ctx.db.insert("messages", {
        conversationId: args.conversationId,
        tenantId,
        direction: "outbound",
        content: "",
        contentType: "system_event",
        eventType: args.status === "resolved" ? "resolved" : "reopened",
        eventData: { actorName },
        isInternalNote: false,
        authorId: callerId,
        status: "sent",
        timestamp: now,
        createdAt: now,
      });
    }

    // Schedule CSAT if resolving
    if (args.status === "resolved") {
      const csatConfig = await ctx.db
        .query("csatSettings")
        .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
        .first();
      const delayMs = (csatConfig?.delayMinutes ?? 5) * 60 * 1000;
      const shouldSend = csatConfig?.enabled ?? false;
      if (shouldSend) {
        await ctx.scheduler.runAfter(delayMs, internal.csat.sendCsatMessage, {
          conversationId: args.conversationId,
          tenantId,
        });
      }
    }
  },
});

// ─── Assign Conversation ──────────────────────────────────────────────────────

export const assignConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    agentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as OrgRole);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    await ctx.db.patch(args.conversationId, {
      assignedAgentId: args.agentId,
    });
  },
});

// ─── Mark as Read ─────────────────────────────────────────────────────────────

// Returns recent internal notes for conversations belonging to a contact
export const getInternalNotesByContact = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.tenantId !== tenantId) return [];

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .take(20);

    const notesList: { _id: string; content: string; timestamp: number; authorId?: string }[] = [];
    for (const conv of conversations) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .filter((q) => q.eq(q.field("isInternalNote"), true))
        .order("desc")
        .take(5);
      for (const m of messages) {
        notesList.push({ _id: m._id, content: m.content, timestamp: m.timestamp, authorId: m.authorId });
      }
    }

    return notesList.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
  },
});

export const markAsRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) return;
    await ctx.db.patch(args.conversationId, { unreadCount: 0 });
  },
});

export const markAsUnread = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) return;
    await ctx.db.patch(args.conversationId, { unreadCount: 1 });
  },
});

// ─── Queue Counts (sidebar tree) ────────────────────────────────────────────

export const queueCounts = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    const isAdmin = orgRole === "org:admin";
    const isPrivileged = isAdminOrSupervisor(orgRole);

    const allChannels = await ctx.db
      .query("channels")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    const channelMemberships = await ctx.db
      .query("channelMembers")
      .withIndex("by_tenant_user", (q) => q.eq("tenantId", tenantId).eq("userId", callerId))
      .collect();
    const myChannelIds = new Set(channelMemberships.map((m) => m.channelId));

    const activeChannels = allChannels.filter(
      (c) =>
        c.isActive !== false &&
        c.status !== "disconnected" &&
        c.status !== "reconnect_required"
    );

    const visibleChannels = isAdmin
      ? activeChannels
      : activeChannels.filter((c) => myChannelIds.has(c._id));

    const allDepts = await ctx.db
      .query("departments")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    const myDeptMemberships = await ctx.db
      .query("departmentMembers")
      .withIndex("by_tenant_user", (q) => q.eq("tenantId", tenantId).eq("userId", callerId))
      .collect();
    const myDeptIds = new Set(myDeptMemberships.map((m) => m.departmentId));

    const allOpen = await ctx.db
      .query("conversations")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "open")
      )
      .take(5000);

    const allPending = await ctx.db
      .query("conversations")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "pending")
      )
      .take(5000);

    const allActive = [...allOpen, ...allPending];

    const visible = (c: (typeof allActive)[number]): boolean => {
      if (isPrivileged) return true;
      if (c.assignedAgentId === callerId) return true;
      if (!c.assignedAgentId && c.departmentId && myDeptIds.has(c.departmentId)) return true;
      return false;
    };

    const channelsResult = visibleChannels.map((channel) => {
      const inChannel = allActive.filter((c) => c.channelId === channel._id && visible(c));
      const unassigned = inChannel.filter((c) => !c.departmentId).length;

      const channelDepts = allDepts.filter(
        (d) =>
          d.channelId === channel._id &&
          !d.isArchived &&
          (isPrivileged || myDeptIds.has(d._id))
      );

      const departments = channelDepts.map((d) => {
        const inDept = inChannel.filter((c) => c.departmentId === d._id);
        return {
          _id: d._id,
          name: d.name,
          isDefault: d.isDefault ?? false,
          total: inDept.length,
          unassignedInDept: inDept.filter((c) => !c.assignedAgentId).length,
          mineInDept: inDept.filter((c) => c.assignedAgentId === callerId).length,
        };
      });

      return {
        _id: channel._id,
        displayName: channel.displayName,
        total: inChannel.length,
        unassigned,
        departments,
      };
    });

    const mine = allActive.filter((c) => c.assignedAgentId === callerId).length;

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", callerId).eq("read", false)
      )
      .take(999);

    const forwardedAll = await ctx.db
      .query("conversations")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "forwarded")
      )
      .take(9999);
    const resolvedAll = await ctx.db
      .query("conversations")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "resolved")
      )
      .take(9999);

    const forwarded = isPrivileged
      ? forwardedAll.length
      : forwardedAll.filter((c) =>
          c.assignedAgentId === callerId ||
          (c.departmentId && myDeptIds.has(c.departmentId))
        ).length;
    const resolved = isPrivileged
      ? resolvedAll.length
      : resolvedAll.filter((c) =>
          c.assignedAgentId === callerId ||
          (c.departmentId && myDeptIds.has(c.departmentId))
        ).length;

    return {
      mine,
      mentions: unreadNotifications.length,
      channels: channelsResult,
      forwarded,
      resolved,
      isPrivileged,
    };
  },
});
