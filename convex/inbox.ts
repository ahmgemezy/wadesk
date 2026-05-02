// convex/inbox.ts
// Real-time inbox queries and mutations — task 012
// WhatsApp API send call is wired in task 013.

import { v, ConvexError } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCallerIdentity, assertAdminOrSupervisor, type OrgRole } from "./lib/auth";
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
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    const isAdminOrSupervisor =
      orgRole === "org:admin" ||
      orgRole === "admin" ||
      orgRole === "org:supervisor";

    const all = await ctx.db
      .query("conversations")
      .withIndex("by_last_message", (q) => q.eq("tenantId", tenantId))
      .order("desc")
      .collect();

    let filtered = all;
    if (args.filter === "mine") {
      filtered = all.filter((c) => c.assignedAgentId === callerId);
    } else if (args.filter === "unassigned") {
      filtered = all.filter((c) => !c.assignedAgentId);
    } else if (!isAdminOrSupervisor) {
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
    return conv;
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
      .collect();
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

    const isAdminOrSupervisor =
      orgRole === "org:admin" || orgRole === "admin" || orgRole === "org:supervisor";
    if (
      !isAdminOrSupervisor &&
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

    const isAdminOrSupervisor =
      orgRole === "org:admin" ||
      orgRole === "admin" ||
      orgRole === "org:supervisor";

    if (!isAdminOrSupervisor) {
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
      .collect();

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

// ─── Seed (dev only) ──────────────────────────────────────────────────────────

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const { tenantId } = await getCallerIdentity(ctx);

    // Upsert a seed channel
    let channel = await ctx.db
      .query("channels")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .first();

    if (!channel) {
      const channelId = await ctx.db.insert("channels", {
        tenantId,
        phoneNumberId: "seed_phone_id",
        displayName: "WhatsApp Business (Seed)",
        wabaId: "seed_waba_id",
        assignmentMode: "manual",
        roundRobinIndex: 0,
        isActive: true,
        createdAt: Date.now(),
      });
      channel = await ctx.db.get(channelId);
    }

    if (!channel) throw new ConvexError("SEED_CHANNEL_FAILED");

    const channelId = channel._id as Id<"channels">;

    let departmentId: Id<"departments"> | undefined;
    const existingDept = await ctx.db
      .query("departments")
      .withIndex("by_channel_default", (q) =>
        q.eq("channelId", channelId).eq("isDefault", true)
      )
      .first();
    if (existingDept) {
      departmentId = existingDept._id;
    } else {
      departmentId = await ctx.db.insert("departments", {
        tenantId,
        channelId,
        name: "General",
        isDefault: true,
        isArchived: false,
        createdBy: "seed",
        createdAt: Date.now(),
      });
    }

    const seedContacts = [
      { phone: "+201012345678", displayName: "أحمد محمد", customName: "Ahmed Mohamed" },
      { phone: "+201098765432", displayName: "فاطمة علي", customName: "Fatma Ali" },
      { phone: "+966501234567", displayName: "عبدالله الغامدي" },
      { phone: "+971501234567", displayName: "مريم الهاشمي" },
      { phone: "+201155443322", displayName: "محمود سعيد" },
      { phone: "+966509876543", displayName: "نورة العتيبي" },
      { phone: "+201011223344", displayName: "خالد عبدالرحمن" },
      { phone: "+201099887766", displayName: "سارة يوسف" },
    ];

    const contactIds: Id<"contacts">[] = [];
    for (const c of seedContacts) {
      const existing = await ctx.db
        .query("contacts")
        .withIndex("by_tenant_phone", (q) =>
          q.eq("tenantId", tenantId).eq("phone", c.phone),
        )
        .first();
      if (existing) {
        contactIds.push(existing._id);
      } else {
        const id = await ctx.db.insert("contacts", {
          tenantId,
          phone: c.phone,
          displayName: c.displayName,
          customName: c.customName,
          tags: [],
          source: "manual",
          isArchived: false,
          firstSeenAt: Date.now(),
          lastSeenAt: Date.now(),
          createdAt: Date.now(),
        });
        contactIds.push(id);
      }
    }

    const statuses = ["open", "open", "pending", "open", "resolved", "open", "pending", "open"] as const;
    const previews = [
      "عايز أعرف الأسعار بتاعتكم",
      "متى موعد التسليم؟",
      "في مشكلة في الطلب",
      "شكراً على خدمتكم الممتازة",
      "تم حل المشكلة 👍",
      "محتاج مساعدة في الاستخدام",
      "هل يمكنني إلغاء الطلب؟",
      "سأتواصل معكم لاحقاً",
    ];

    for (let i = 0; i < contactIds.length; i++) {
      const contactId = contactIds[i];
      const now = Date.now() - i * 1000 * 60 * 10; // 10 min apart

      // Check if conversation exists for this contact+channel
      const existingConv = await ctx.db
        .query("conversations")
        .withIndex("by_tenant_channel", (q) =>
          q.eq("tenantId", tenantId).eq("channelId", channelId),
        )
        .filter((q) => q.eq(q.field("contactId"), contactId))
        .first();

      if (existingConv) continue;

      const conversationId = await ctx.db.insert("conversations", {
        tenantId,
        channelId,
        contactId,
        status: statuses[i],
        labels: [],
        lastMessageAt: now,
        lastMessagePreview: previews[i],
        unreadCount: i % 3 === 0 ? 2 : 0,
        createdAt: now - 1000 * 60 * 60,
        departmentId,
        departmentAssignedAt: departmentId ? now - 1000 * 60 * 60 : undefined,
      });

      const msgBase = now - 1000 * 60 * 5;
      const msgs = [
        { direction: "inbound" as const, content: previews[i], delta: 0 },
        { direction: "outbound" as const, content: "شكراً على تواصلك، سنساعدك فوراً", delta: 60000 },
        { direction: "inbound" as const, content: "حسناً، أنتظر ردكم", delta: 120000 },
        { direction: "outbound" as const, content: "تم الأخذ بعين الاعتبار، سنتواصل معك قريباً", delta: 180000 },
      ];

      for (const msg of msgs) {
        await ctx.db.insert("messages", {
          conversationId,
          tenantId,
          direction: msg.direction,
          content: msg.content,
          contentType: "text",
          isInternalNote: false,
          authorId: msg.direction === "outbound" ? "seed_agent" : undefined,
          status: "read",
          timestamp: msgBase + msg.delta,
          createdAt: msgBase + msg.delta,
        });
      }
    }

    return { ok: true };
  },
});
