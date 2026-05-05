import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { query, mutation, internalMutation, internalQuery, action } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCallerIdentity, getCallerRole, assertAdmin } from "./lib/auth";
import {
  closeActiveParticipantStint,
  incrementParticipantMessageCount,
  openParticipantStint,
} from "./lib/participants";
import type { Id } from "./_generated/dataModel";

function isAdminOrSupervisor(orgRole: string): boolean {
  return orgRole === "org:admin" || orgRole === "admin" || orgRole === "org:supervisor";
}

async function callerHasConversationAccess(
  ctx: QueryCtx | MutationCtx,
  conversation: { tenantId: string; assignedAgentId?: string; departmentId?: Id<"departments"> },
  callerId: string,
  orgRole: string,
): Promise<boolean> {
  if (isAdminOrSupervisor(orgRole)) return true;
  if (conversation.assignedAgentId === callerId) return true;
  if (!conversation.assignedAgentId) {
    // Match inbox visibility: unassigned conversations with no department are
    // visible to all agents (the global "Unassigned" queue), so transfer must
    // be allowed too. Unassigned-with-department requires dept membership.
    if (!conversation.departmentId) return true;
    const member = await ctx.db
      .query("departmentMembers")
      .withIndex("by_department", (q: any) =>
        q.eq("departmentId", conversation.departmentId)
      )
      .filter((q: any) => q.eq(q.field("userId"), callerId))
      .first();
    return !!member;
  }
  return false;
}

export const listForCaller = query({
  args: {
    channelId: v.optional(v.id("channels")),
    status: v.optional(
      v.union(
        v.literal("open"),
        v.literal("pending"),
        v.literal("resolved"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);

    let conversations;

    if (isAdminOrSupervisor(orgRole)) {
      if (args.status) {
        conversations = await ctx.db
          .query("conversations")
          .withIndex("by_tenant_status", (q) =>
            q.eq("tenantId", tenantId).eq("status", args.status!),
          )
          .order("desc")
          .collect();
      } else {
        conversations = await ctx.db
          .query("conversations")
          .withIndex("by_last_message", (q) => q.eq("tenantId", tenantId))
          .order("desc")
          .collect();
      }
    } else {
      const assigned = await ctx.db
        .query("conversations")
        .withIndex("by_tenant_agent", (q) =>
          q.eq("tenantId", tenantId).eq("assignedAgentId", callerId),
        )
        .collect();

      const unassigned = await ctx.db
        .query("conversations")
        .withIndex("by_tenant_agent", (q) =>
          q.eq("tenantId", tenantId).eq("assignedAgentId", undefined),
        )
        .collect();

      conversations = [...assigned, ...unassigned];
      conversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

      if (args.status) {
        conversations = conversations.filter((c) => c.status === args.status);
      }
    }

    if (args.channelId) {
      conversations = conversations.filter(
        (c) => c.channelId === args.channelId,
      );
    }

    return conversations;
  },
});

export const get = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) return null;

    if (
      !isAdminOrSupervisor(orgRole) &&
      conversation.assignedAgentId !== callerId &&
      conversation.assignedAgentId !== undefined
    ) {
      return null;
    }

    let isCurrentUserDeptMember = false;
    if (conversation.departmentId) {
      const membership = await ctx.db
        .query("departmentMembers")
        .withIndex("by_department_user", (q) =>
          q
            .eq("departmentId", conversation.departmentId as Id<"departments">)
            .eq("userId", callerId),
        )
        .first();
      isCurrentUserDeptMember = !!membership;
    }

    return { ...conversation, isCurrentUserDeptMember };
  },
});

export const assign = mutation({
  args: {
    conversationId: v.id("conversations"),
    agentId: v.optional(v.string()),
    agentName: v.optional(v.string()),
    agentJobTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);

    if (!isAdminOrSupervisor(orgRole)) {
      throw new ConvexError("FORBIDDEN");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    const previousAgentId = conversation.assignedAgentId;

    if (conversation.assignedAgentId) {
      await closeActiveParticipantStint(ctx, { tenantId, conversationId: args.conversationId });
    }

    await ctx.db.patch(args.conversationId, {
      assignedAgentId: args.agentId,
      assignedAt: args.agentId ? Date.now() : undefined,
      assignmentType: args.agentId ? "manual" : "unassigned",
      lastMessageAt: Date.now(),
    });

    if (args.agentId) {
      await openParticipantStint(ctx, {
        tenantId,
        conversationId: args.conversationId,
        agentId: args.agentId,
        departmentId: conversation.departmentId,
      });
    }

    if (args.agentId && args.agentId !== previousAgentId) {
      const contact = await ctx.db.get(conversation.contactId);
      const channel = await ctx.db.get(conversation.channelId);
      const contactName =
        contact?.customName ?? contact?.displayName ?? contact?.phone ?? "";
      const channelName = channel?.displayName ?? "";

      const assignIdentity = await ctx.auth.getUserIdentity();
      const assignActorName = assignIdentity?.name ?? assignIdentity?.email ?? "Someone";

      await ctx.runMutation(internal.notifications.notifyDispatch, {
        tenantId,
        userId: args.agentId,
        eventType: "conversation_assigned",
        referenceId: args.conversationId,
        contactName,
        message: `${contactName} was assigned to you by ${assignActorName}`,
        emailVariables: {
          contactName,
          channelName,
          conversationId: args.conversationId,
          assignedByName: assignActorName,
        },
      });
    }

    const now = Date.now();
    const assignIdentity = await ctx.auth.getUserIdentity();
    const assignActorName = assignIdentity?.name ?? assignIdentity?.email ?? "Someone";

    if (args.agentId) {
      await ctx.db.insert("messages", {
        conversationId: args.conversationId,
        tenantId,
        direction: "outbound",
        content: "",
        contentType: "system_event",
        eventType: "agent_assigned",
        eventData: { actorName: assignActorName, agentName: args.agentName ?? args.agentId, agentJobTitle: args.agentJobTitle },
        isInternalNote: false,
        authorId: callerId,
        status: "sent",
        timestamp: now,
        createdAt: now,
      });
    } else {
      await ctx.db.insert("messages", {
        conversationId: args.conversationId,
        tenantId,
        direction: "outbound",
        content: "",
        contentType: "system_event",
        eventType: "agent_unassigned",
        eventData: { actorName: assignActorName },
        isInternalNote: false,
        authorId: callerId,
        status: "sent",
        timestamp: now,
        createdAt: now,
      });
    }
  },
});

export const setStatus = mutation({
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

    if (
      !isAdminOrSupervisor(orgRole) &&
      conversation.assignedAgentId !== callerId &&
      conversation.assignedAgentId !== undefined
    ) {
      throw new ConvexError("FORBIDDEN");
    }

    await ctx.db.patch(args.conversationId, {
      status: args.status,
      resolvedAt: args.status === "resolved" ? Date.now() : undefined,
    });

    const statusIdentity = (args.status === "resolved" || args.status === "open")
      ? await ctx.auth.getUserIdentity()
      : null;

    const resolvedActorName =
      args.actorName ?? statusIdentity?.name ?? statusIdentity?.email ?? "Agent";

    if (args.status === "resolved" || args.status === "open") {
      const statusNow = Date.now();
      await ctx.db.insert("messages", {
        conversationId: args.conversationId,
        tenantId,
        direction: "outbound",
        content: "",
        contentType: "system_event",
        eventType: args.status === "resolved" ? "resolved" : "reopened",
        eventData: { actorName: resolvedActorName },
        isInternalNote: false,
        authorId: callerId,
        status: "sent",
        timestamp: statusNow,
        createdAt: statusNow,
      });
    }

    if (args.status === "resolved") {
      const agentName = args.actorName ?? statusIdentity?.name ?? statusIdentity?.email ?? undefined;

      await closeActiveParticipantStint(ctx, { tenantId, conversationId: args.conversationId });

      if (conversation.assignedAgentId) {
        await ctx.scheduler.runAfter(0, internal.conversationMetrics.recordResolution, {
          conversationId: args.conversationId,
          resolvedAt: Date.now(),
          assignedAgentId: conversation.assignedAgentId,
          agentName,
        });
      }

      // Fire conversation_resolved event on the contact's timeline
      if (conversation.contactId) {
        await ctx.runMutation(internal.contactEvents.internalCreate, {
          tenantId,
          contactId: conversation.contactId,
          type: "conversation_resolved",
          actorId: callerId,
          metadata: { conversationId: args.conversationId },
        });
      }

      // Schedule CSAT message (Growth+; plan + template gates enforced inside the action)
      const csatConfig = await ctx.db
        .query("csatSettings")
        .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
        .first();
      if (csatConfig?.enabled) {
        const delayMs = (csatConfig.delayMinutes ?? 5) * 60 * 1000;
        await ctx.scheduler.runAfter(delayMs, internal.csat.sendCsatMessage, {
          conversationId: args.conversationId,
          tenantId,
        });
      }
    }
  },
});

export const unassignAll = internalMutation({
  args: { agentId: v.string(), tenantId: v.string() },
  handler: async (ctx, args) => {
    const assigned = await ctx.db
      .query("conversations")
      .withIndex("by_tenant_agent", (q) =>
        q.eq("tenantId", args.tenantId).eq("assignedAgentId", args.agentId),
      )
      .collect();

    let count = 0;
    for (const conv of assigned) {
      if (conv.status !== "resolved") {
        await closeActiveParticipantStint(ctx, { tenantId: args.tenantId, conversationId: conv._id });
        await ctx.db.patch(conv._id, { assignedAgentId: undefined });
        count++;
      }
    }
    return { count };
  },
});

export const getOrCreate = mutation({
  args: {
    contactId: v.id("contacts"),
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);

    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    // Try to find an existing open conversation for this contact + channel
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_tenant_channel", (q) =>
        q.eq("tenantId", tenantId).eq("channelId", args.channelId),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("contactId"), args.contactId),
          q.neq(q.field("status"), "resolved"),
        ),
      )
      .first();

    if (existing) return existing._id;

    let departmentId: Id<"departments"> | undefined;
    const defaultDept = await ctx.runQuery(
      internal.departments.getDefaultForChannel,
      { channelId: args.channelId }
    ) as { _id: Id<"departments"> } | null;
    if (defaultDept) {
      departmentId = defaultDept._id;
    }

    const now = Date.now();
    const conversationId: Id<"conversations"> = await ctx.db.insert("conversations", {
      tenantId,
      channelId: args.channelId,
      contactId: args.contactId,
      status: "open",
      labels: [],
      lastMessageAt: now,
      lastMessagePreview: "",
      unreadCount: 0,
      createdAt: now,
      departmentId,
      departmentAssignedAt: departmentId ? now : undefined,
    });

    await ctx.db.patch(args.contactId, {
      totalConversations: (contact.totalConversations ?? 0) + 1,
    });

    await ctx.scheduler.runAfter(0, internal.conversationMetrics.create, {
      tenantId,
      conversationId,
      channelId: args.channelId,
      createdAt: now,
    });

    return conversationId;
  },
});

export const remove = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const { tenantId } = await getCallerIdentity(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    // Delete all messages in this conversation
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    // Delete the conversation metrics record if present
    const metrics = await ctx.db
      .query("conversationMetrics")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .first();
    if (metrics) await ctx.db.delete(metrics._id);

    // Delete automation rule fire logs for this conversation
    const fireLogs = await ctx.db
      .query("ruleFireLog")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    for (const log of fireLogs) await ctx.db.delete(log._id);

    await ctx.db.delete(args.conversationId);
  },
});

export const getInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.conversationId);
  },
});

export const assignInternal = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    agentId: v.string(),
    tenantId: v.string(),
    assignmentType: v.optional(v.union(
      v.literal("round_robin"),
      v.literal("manual"),
    )),
    agentName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== args.tenantId) return;

    const previousAgentId = conversation.assignedAgentId;

    if (previousAgentId) {
      await closeActiveParticipantStint(ctx, { tenantId: args.tenantId, conversationId: args.conversationId });
    }

    await ctx.db.patch(args.conversationId, {
      assignedAgentId: args.agentId,
      assignedAt: Date.now(),
      assignmentType: args.assignmentType ?? "manual",
      lastMessageAt: Date.now(),
    });

    await openParticipantStint(ctx, {
      tenantId: args.tenantId,
      conversationId: args.conversationId,
      agentId: args.agentId,
      departmentId: conversation.departmentId,
    });

    if (args.agentId !== previousAgentId) {
      const contact = await ctx.db.get(conversation.contactId);
      const channel = await ctx.db.get(conversation.channelId);
      const contactName =
        contact?.customName ?? contact?.displayName ?? contact?.phone ?? "";
      const channelName = channel?.displayName ?? "";

      await ctx.runMutation(internal.notifications.notifyDispatch, {
        tenantId: args.tenantId,
        userId: args.agentId,
        eventType: "conversation_assigned",
        referenceId: args.conversationId,
        contactName,
        message: `${contactName} was assigned to you by System`,
        emailVariables: {
          contactName,
          channelName,
          conversationId: args.conversationId,
          assignedByName: "System",
        },
      });
    }

    const agentProfile = await ctx.db
      .query("memberProfiles")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", args.agentId),
      )
      .first();

    const nowInternal = Date.now();
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      tenantId: args.tenantId,
      direction: "outbound",
      content: "",
      contentType: "system_event",
      eventType: "agent_assigned",
      eventData: {
        actorName: "System",
        agentName: args.agentName ?? args.agentId,
        agentJobTitle: agentProfile?.jobTitle,
      },
      isInternalNote: false,
      status: "sent",
      timestamp: nowInternal,
      createdAt: nowInternal,
    });
  },
});

export const internalCloseAllForChannel = internalMutation({
  args: { channelId: v.id("channels"), tenantId: v.string() },
  handler: async (ctx, args) => {
    const convs = await ctx.db
      .query("conversations")
      .withIndex("by_tenant_channel", (q) =>
        q.eq("tenantId", args.tenantId).eq("channelId", args.channelId)
      )
      .filter((q) => q.neq(q.field("status"), "resolved"))
      .collect();
    for (const conv of convs) {
      await ctx.db.patch(conv._id, { status: "resolved" });
    }
  },
});

export const transferWithinChannel = mutation({
  args: {
    conversationId: v.id("conversations"),
    targetDepartmentId: v.id("departments"),
    assignAgentId: v.optional(v.string()),
    internalNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    if (!(await callerHasConversationAccess(ctx, conversation, callerId, orgRole))) {
      throw new ConvexError("FORBIDDEN");
    }

    const targetDept = await ctx.db.get(args.targetDepartmentId);
    if (!targetDept || targetDept.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }
    if (targetDept.isArchived) {
      throw new ConvexError("DEPARTMENT_ARCHIVED");
    }
    if (!targetDept.channelId || targetDept.channelId !== conversation.channelId) {
      throw new ConvexError("CROSS_CHANNEL_USE_FORWARD");
    }
    if (targetDept._id === conversation.departmentId && !args.assignAgentId) {
      throw new ConvexError("NO_OP_TRANSFER");
    }

    if (args.assignAgentId) {
      const member = await ctx.db
        .query("departmentMembers")
        .withIndex("by_department", (q) => q.eq("departmentId", args.targetDepartmentId))
        .filter((q) => q.eq(q.field("userId"), args.assignAgentId!))
        .first();
      if (!member) {
        throw new ConvexError("AGENT_NOT_IN_DEPARTMENT");
      }
    }

    const oldDept = conversation.departmentId
      ? await ctx.db.get(conversation.departmentId)
      : null;

    if (conversation.assignedAgentId) {
      await closeActiveParticipantStint(ctx, { tenantId, conversationId: args.conversationId });
    }

    const now = Date.now();
    await ctx.db.patch(args.conversationId, {
      departmentId: args.targetDepartmentId,
      departmentAssignedAt: now,
      departmentAssignedBy: callerId,
      ...(args.assignAgentId
        ? {
            assignedAgentId: args.assignAgentId,
            assignedAt: now,
            assignmentType: "manual" as const,
            previousAgentId: conversation.assignedAgentId,
          }
        : {
            assignedAgentId: undefined,
            assignmentType: "manual" as const,
          }),
    });

    if (args.assignAgentId) {
      await openParticipantStint(ctx, {
        tenantId,
        conversationId: args.conversationId,
        agentId: args.assignAgentId,
        departmentId: args.targetDepartmentId,
      });
    }

    const identity = await ctx.auth.getUserIdentity();
    const actorName = identity?.name ?? identity?.email ?? "Someone";
    const fromName = oldDept?.name ?? "Unassigned";
    const toName = targetDept.name;

    let agentName: string | undefined;
    let agentJobTitle: string | undefined;
    if (args.assignAgentId) {
      const member = await ctx.db
        .query("departmentMembers")
        .withIndex("by_department_user", (q) =>
          q.eq("departmentId", args.targetDepartmentId).eq("userId", args.assignAgentId!),
        )
        .first();
      agentName = member?.userName ?? args.assignAgentId;

      const agentProfile = await ctx.db
        .query("memberProfiles")
        .withIndex("by_tenant_user", (q) =>
          q.eq("tenantId", tenantId).eq("userId", args.assignAgentId!),
        )
        .first();
      agentJobTitle = agentProfile?.jobTitle ?? undefined;
    }

    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      tenantId,
      direction: "outbound",
      content: "",
      contentType: "system_event",
      eventType: "transfer_within_channel",
      eventData: { actorName, fromDept: fromName, toDept: toName, agentName, agentJobTitle },
      isInternalNote: false,
      authorId: callerId,
      status: "sent",
      timestamp: now,
      createdAt: now,
    });

    if (args.internalNote && args.internalNote.trim().length > 0) {
      await ctx.db.insert("messages", {
        conversationId: args.conversationId,
        tenantId,
        direction: "outbound",
        content: args.internalNote.trim(),
        contentType: "text",
        isInternalNote: true,
        authorId: callerId,
        status: "sent",
        timestamp: now + 1,
        createdAt: now + 1,
      });
    }

    const deptMembers = await ctx.db
      .query("departmentMembers")
      .withIndex("by_department", (q) => q.eq("departmentId", args.targetDepartmentId))
      .collect();

    const memberIds = deptMembers.map((m) => m.userId);
    const supervisorIds: string[] = targetDept.supervisors ?? [];
    const recipients = [...new Set([...memberIds, ...supervisorIds])].filter(
      (id) => id !== callerId && id !== args.assignAgentId,
    );

    const contact = await ctx.db.get(conversation.contactId);
    const contactName = contact?.customName ?? contact?.displayName ?? "";

    for (const userId of recipients) {
      await ctx.runMutation(internal.notifications.notifyDispatch, {
        tenantId,
        userId,
        eventType: "conversation_transferred",
        referenceId: args.conversationId,
        contactName,
        message: `${contactName} was transferred to ${toName} by ${actorName}`,
        emailVariables: {
          contactName,
          targetDept: toName,
          actorName,
          conversationId: args.conversationId,
        },
      });
    }

    if (args.assignAgentId) {
      const channelForEmail = await ctx.db.get(conversation.channelId);
      await ctx.runMutation(internal.notifications.notifyDispatch, {
        tenantId,
        userId: args.assignAgentId,
        eventType: "conversation_assigned",
        referenceId: args.conversationId,
        contactName,
        message: `${contactName} was assigned to you by ${actorName}`,
        emailVariables: {
          contactName,
          channelName: channelForEmail?.displayName ?? "",
          conversationId: args.conversationId,
          assignedByName: actorName,
        },
      });
    }
  },
});

export const claim = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);

        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation || conversation.tenantId !== tenantId) {
            throw new ConvexError("NOT_FOUND");
        }
        if (conversation.assignedAgentId) {
            throw new ConvexError("ALREADY_ASSIGNED");
        }
        if (!conversation.departmentId) {
            throw new ConvexError("NOT_IN_DEPARTMENT_QUEUE");
        }

        if (!isAdminOrSupervisor(orgRole)) {
            const membership = await ctx.db
                .query("departmentMembers")
                .withIndex("by_department_user", (q) =>
                    q
                        .eq("departmentId", conversation.departmentId as Id<"departments">)
                        .eq("userId", callerId),
                )
                .first();
            if (!membership) throw new ConvexError("NOT_DEPARTMENT_MEMBER");
        }

        const now = Date.now();
        const identity = await ctx.auth.getUserIdentity();
        const callerName = identity?.name ?? identity?.email ?? "Agent";

        await ctx.db.patch(args.conversationId, {
            assignedAgentId: callerId,
            assignedAt: now,
            assignmentType: "manual",
            lastMessageAt: now,
        });

        await openParticipantStint(ctx, {
          tenantId,
          conversationId: args.conversationId,
          agentId: callerId,
          departmentId: conversation.departmentId,
        });

        const callerProfile = await ctx.db
          .query("memberProfiles")
          .withIndex("by_tenant_user", (q) =>
            q.eq("tenantId", tenantId).eq("userId", callerId),
          )
          .first();

        await ctx.db.insert("messages", {
            conversationId: args.conversationId,
            tenantId,
            direction: "outbound",
            content: "",
            contentType: "system_event",
            eventType: "agent_assigned",
            eventData: { actorName: callerName, agentName: callerName, agentJobTitle: callerProfile?.jobTitle },
            isInternalNote: false,
            authorId: callerId,
            status: "sent",
            timestamp: now,
            createdAt: now,
        });
    },
});

export const _validateForward = internalQuery({
  args: {
    conversationId: v.id("conversations"),
    targetChannelId: v.id("channels"),
    targetDepartmentId: v.optional(v.id("departments")),
    callerId: v.string(),
    orgRole: v.string(),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== args.tenantId) {
      throw new ConvexError("NOT_FOUND");
    }
    if (conversation.status === "resolved" || conversation.status === "forwarded") {
      throw new ConvexError("CONVERSATION_NOT_OPEN");
    }
    if (
      !(await callerHasConversationAccess(ctx, conversation, args.callerId, args.orgRole))
    ) {
      throw new ConvexError("FORBIDDEN");
    }

    const sourceChannel = await ctx.db.get(conversation.channelId);
    if (!sourceChannel) throw new ConvexError("CHANNEL_NOT_FOUND");

    const targetChannel = await ctx.db.get(args.targetChannelId);
    if (!targetChannel || targetChannel.tenantId !== args.tenantId) {
      throw new ConvexError("NOT_FOUND");
    }
    if (targetChannel._id === sourceChannel._id) {
      throw new ConvexError("CROSS_CHANNEL_USE_TRANSFER");
    }
    if (targetChannel.status !== undefined && targetChannel.status !== "active") {
      throw new ConvexError("TARGET_CHANNEL_INACTIVE");
    }

    let targetDeptName: string | undefined;
    if (args.targetDepartmentId) {
      const dept = await ctx.db.get(args.targetDepartmentId);
      if (!dept || dept.tenantId !== args.tenantId) throw new ConvexError("NOT_FOUND");
      if (dept.channelId !== args.targetChannelId) {
        throw new ConvexError("DEPARTMENT_NOT_IN_TARGET_CHANNEL");
      }
      if (dept.isArchived) throw new ConvexError("DEPARTMENT_ARCHIVED");
      targetDeptName = dept.name;
    }

    const now = Date.now();
    const lastInbound = conversation.lastInboundAt ?? 0;
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    if (now - lastInbound >= TWENTY_FOUR_HOURS_MS) {
      throw new ConvexError("OUTSIDE_24H_WINDOW");
    }

    const contact = await ctx.db.get(conversation.contactId);

    return {
      sourceChannelId: sourceChannel._id,
      sourcePhoneNumberId: sourceChannel.phoneNumberId,
      contactPhone: contact?.phone ?? "",
      contactName: contact?.customName ?? contact?.displayName ?? "",
      targetBranchName: targetChannel.displayName,
      targetBranchNumber: targetChannel.displayPhone ?? "",
      targetDeptName,
    };
  },
});

export const _finalizeForward = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    targetChannelId: v.id("channels"),
    targetDepartmentId: v.optional(v.id("departments")),
    callerId: v.string(),
    actorName: v.string(),
    targetBranchName: v.string(),
    targetBranchNumber: v.string(),
    targetDeptName: v.optional(v.string()),
    renderedText: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const conv = await ctx.db.get(args.conversationId);
    if (!conv) return;

    await closeActiveParticipantStint(ctx, { tenantId: conv.tenantId, conversationId: args.conversationId });

    await ctx.db.patch(args.conversationId, {
      status: "forwarded",
      forwardedToChannelId: args.targetChannelId,
      forwardedToDepartmentId: args.targetDepartmentId,
      forwardedAt: now,
      forwardedBy: args.callerId,
      assignedAgentId: undefined,
      departmentId: undefined,
    });

    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      tenantId: conv.tenantId,
      direction: "outbound",
      content: "",
      contentType: "system_event",
      eventType: "forward_to_branch",
      eventData: {
        actorName: args.actorName,
        targetBranchName: args.targetBranchName,
        targetBranchNumber: args.targetBranchNumber,
        targetDeptName: args.targetDeptName,
      },
      isInternalNote: false,
      authorId: args.callerId,
      status: "sent",
      timestamp: now,
      createdAt: now,
    });
  },
});

export const previewForwardMessage = query({
  args: {
    conversationId: v.id("conversations"),
    targetChannelId: v.id("channels"),
  },
  handler: async (ctx, args): Promise<string | null> => {
    const { tenantId } = await getCallerIdentity(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) return null;
    const target = await ctx.db.get(args.targetChannelId);
    if (!target || target.tenantId !== tenantId) return null;
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .first();
    const templates = tenant?.forwardMessageTemplates ?? {
      ar: "للحصول على خدمة أفضل، تواصل مع فرع {{branchName}} على {{branchNumber}}",
      en: "For better service, please contact our {{branchName}} branch at {{branchNumber}}",
    };
    const lang: "ar" | "en" = "ar";
    const number = target.displayPhone
      ? (target.displayPhone.startsWith("+") ? target.displayPhone : `+${target.displayPhone}`)
      : "";
    return templates[lang]
      .replaceAll("{{branchName}}", target.displayName)
      .replaceAll("{{branchNumber}}", number);
  },
});

export const forwardToBranch = action({
  args: {
    conversationId: v.id("conversations"),
    targetChannelId: v.id("channels"),
    targetDepartmentId: v.optional(v.id("departments")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.orgId) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;
    const callerId = identity.subject;
    const orgRole = (identity.orgRole as string | undefined) ?? "org:agent";
    const actorName = identity?.name ?? identity?.email ?? "Someone";

    const ctxData: {
      sourceChannelId: any;
      sourcePhoneNumberId: string;
      contactPhone: string;
      contactName: string;
      targetBranchName: string;
      targetBranchNumber: string;
      targetDeptName?: string;
    } = await ctx.runQuery(internal.conversations._validateForward, {
      conversationId: args.conversationId,
      targetChannelId: args.targetChannelId,
      targetDepartmentId: args.targetDepartmentId,
      callerId,
      orgRole,
      tenantId,
    });

    const templates: { ar: string; en: string } = await ctx.runQuery(internal.lib.tenants.getForwardTemplates, {
      tenantId,
    });

    const conversation: any = await ctx.runQuery(internal.conversations.getInternal, {
      conversationId: args.conversationId,
    });
    const lang: "ar" | "en" =
      conversation && (conversation as any).contactLanguage === "en" ? "en" : "ar";

    const formattedNumber = ctxData.targetBranchNumber
      ? (ctxData.targetBranchNumber.startsWith("+")
          ? ctxData.targetBranchNumber
          : `+${ctxData.targetBranchNumber}`)
      : "";

    const renderedText = templates[lang]
      .replaceAll("{{branchName}}", ctxData.targetBranchName)
      .replaceAll("{{branchNumber}}", formattedNumber);

    const messageId: any = await ctx.runMutation(internal.messages.createOutboundForward, {
      conversationId: args.conversationId,
      tenantId,
      content: renderedText,
      authorId: callerId,
    });

    // sendMessage swallows Meta errors and marks the message as "failed" instead
    // of throwing — so a try/catch alone won't tell us whether the customer
    // actually received the redirect. Read the message status back and bail
    // before finalizing if Meta rejected it.
    try {
      await ctx.runAction(internal.actions.sendWhatsAppMessage.sendMessage, {
        messageId,
        phoneNumberId: ctxData.sourcePhoneNumberId,
        contactPhone: ctxData.contactPhone,
        content: renderedText,
        tenantId,
      });
    } catch (e) {
      await ctx.runMutation(internal.messages.markFailed, {
        messageId,
        reason: e instanceof Error ? e.message : "Forward send failed",
      });
      throw new ConvexError("FORWARD_SEND_FAILED");
    }

    const sendResult = await ctx.runQuery(internal.messages.getStatusInternal, {
      messageId,
    });
    if (!sendResult || sendResult.status === "failed" || sendResult.status === "sending") {
      throw new ConvexError("FORWARD_SEND_FAILED");
    }

    await ctx.runMutation(internal.conversations._finalizeForward, {
      conversationId: args.conversationId,
      targetChannelId: args.targetChannelId,
      targetDepartmentId: args.targetDepartmentId,
      callerId,
      actorName,
      targetBranchName: ctxData.targetBranchName,
      targetBranchNumber: formattedNumber,
      targetDeptName: ctxData.targetDeptName,
      renderedText,
    });
  },
});
