import { v, ConvexError } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCallerIdentity, assertAdminOrSupervisor, assertAdmin, type OrgRole } from "./lib/auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId } = await getCallerIdentity(ctx);
    return ctx.db
      .query("conversationLabels")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    color: v.string(),
    emoji: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as OrgRole);

    if (!args.name.trim()) throw new ConvexError("NAME_REQUIRED");

    const existing = await ctx.db
      .query("conversationLabels")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    if (existing.some((l) => l.name.toLowerCase() === args.name.trim().toLowerCase())) {
      throw new ConvexError("LABEL_EXISTS");
    }

    return ctx.db.insert("conversationLabels", {
      tenantId,
      name: args.name.trim(),
      color: args.color,
      emoji: args.emoji,
      createdBy: callerId,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { labelId: v.id("conversationLabels") },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);

    const label = await ctx.db.get(args.labelId);
    if (!label || label.tenantId !== tenantId) throw new ConvexError("NOT_FOUND");

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    for (const conv of conversations) {
      if ((conv.labels ?? []).includes(label.name)) {
        await ctx.db.patch(conv._id, {
          labels: (conv.labels ?? []).filter((n) => n !== label.name),
        });
      }
    }

    await ctx.db.delete(args.labelId);
  },
});

export const update = mutation({
  args: {
    labelId: v.id("conversationLabels"),
    name: v.string(),
    color: v.string(),
    emoji: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as OrgRole);

    const label = await ctx.db.get(args.labelId);
    if (!label || label.tenantId !== tenantId) throw new ConvexError("NOT_FOUND");

    if (!args.name.trim()) throw new ConvexError("NAME_REQUIRED");

    const nameChanged = label.name.toLowerCase() !== args.name.trim().toLowerCase();
    if (nameChanged) {
      const existing = await ctx.db
        .query("conversationLabels")
        .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
        .collect();
      if (existing.some((l) => l._id !== args.labelId && l.name.toLowerCase() === args.name.trim().toLowerCase())) {
        throw new ConvexError("LABEL_EXISTS");
      }

      // Rename label reference in all conversations
      const conversations = await ctx.db
        .query("conversations")
        .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
        .collect();
      for (const conv of conversations) {
        if ((conv.labels ?? []).includes(label.name)) {
          await ctx.db.patch(conv._id, {
            labels: (conv.labels ?? []).map((n) => (n === label.name ? args.name.trim() : n)),
          });
        }
      }
    }

    await ctx.db.patch(args.labelId, {
      name: args.name.trim(),
      color: args.color,
      emoji: args.emoji ?? undefined,
    });
  },
});

export const addToConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    labelName: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    if (conversation.labels.includes(args.labelName)) return;

    await ctx.db.patch(args.conversationId, {
      labels: [...conversation.labels, args.labelName],
    });
  },
});

export const removeFromConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    labelName: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    await ctx.db.patch(args.conversationId, {
      labels: conversation.labels.filter((n) => n !== args.labelName),
    });
  },
});
