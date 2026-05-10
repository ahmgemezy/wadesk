import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCallerIdentity, assertAdminOrSupervisor } from "./lib/auth";

export const list = query({
  args: {
    category: v.optional(v.string()),
    channelId: v.optional(v.id("channels")),
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const all = await ctx.db
      .query("quickReplies")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    const channelFiltered = args.channelId
      ? all.filter((r) => !r.channelId || r.channelId === args.channelId)
      : all;

    if (args.category) {
      return channelFiltered.filter((r) => r.category === args.category);
    }
    return channelFiltered;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    channelId: v.optional(v.id("channels")),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);

    assertAdminOrSupervisor(orgRole as Parameters<typeof assertAdminOrSupervisor>[0]);

    return ctx.db.insert("quickReplies", {
      tenantId,
      channelId: args.channelId,
      title: args.title,
      content: args.content,
      usageCount: 0,
      category: args.category,
      createdBy: callerId,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("quickReplies"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);

    assertAdminOrSupervisor(orgRole as Parameters<typeof assertAdminOrSupervisor>[0]);

    const quickReply = await ctx.db.get(args.id);
    if (!quickReply || quickReply.tenantId !== tenantId) {
      throw new Error("NOT_FOUND");
    }

    const patch: Record<string, unknown> = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.content !== undefined) patch.content = args.content;
    if (args.category !== undefined) patch.category = args.category;

    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("quickReplies") },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);

    assertAdminOrSupervisor(orgRole as Parameters<typeof assertAdminOrSupervisor>[0]);

    const quickReply = await ctx.db.get(args.id);
    if (!quickReply || quickReply.tenantId !== tenantId) {
      throw new Error("NOT_FOUND");
    }

    await ctx.db.delete(args.id);
  },
});
