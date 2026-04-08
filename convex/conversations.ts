import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getCallerIdentity } from "./lib/auth";

function isAdminOrSupervisor(orgRole: string): boolean {
  return orgRole === "org:admin" || orgRole === "admin" || orgRole === "org:supervisor";
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

    return conversation;
  },
});

export const assign = mutation({
  args: {
    conversationId: v.id("conversations"),
    agentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);

    if (!isAdminOrSupervisor(orgRole)) {
      throw new ConvexError("FORBIDDEN");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    await ctx.db.patch(args.conversationId, {
      assignedAgentId: args.agentId,
      lastMessageAt: Date.now(),
    });
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

    await ctx.db.patch(args.conversationId, { status: args.status });
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
        await ctx.db.patch(conv._id, { assignedAgentId: undefined });
        count++;
      }
    }
    return { count };
  },
});

export const assignInternal = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    agentId: v.string(),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== args.tenantId) return;
    await ctx.db.patch(args.conversationId, {
      assignedAgentId: args.agentId,
      lastMessageAt: Date.now(),
    });
  },
});
