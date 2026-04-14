/**
 * @fileoverview Internal write-only read-model for analytics.
 *
 * All functions here are `internalMutation` — never callable from the client.
 * They are triggered by `ctx.scheduler.runAfter(0, ...)` from `conversations.ts`
 * and `messages.ts` to write denormalized metrics records without blocking the
 * main mutation response.
 */
import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const create = internalMutation({
  args: {
    tenantId: v.string(),
    conversationId: v.id("conversations"),
    channelId: v.id("channels"),
    createdAt: v.number(),
    initialMessageCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("conversationMetrics", {
      tenantId: args.tenantId,
      conversationId: args.conversationId,
      channelId: args.channelId,
      messageCount: args.initialMessageCount ?? 0,
      createdAt: args.createdAt,
    });
  },
});

export const recordFirstResponse = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    firstResponseAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("conversationMetrics")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .first();
    if (!existing || existing.firstResponseAt !== undefined) return;

    await ctx.db.patch(existing._id, {
      firstResponseAt: args.firstResponseAt,
      firstResponseTimeSeconds: (args.firstResponseAt - existing.createdAt) / 1000,
    });
  },
});

export const recordResolution = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    resolvedAt: v.number(),
    assignedAgentId: v.optional(v.string()),
    agentName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("conversationMetrics")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .first();
    if (!existing) return;

    await ctx.db.patch(existing._id, {
      resolvedAt: args.resolvedAt,
      assignedAgentId: args.assignedAgentId,
      agentName: args.agentName,
    });
  },
});

export const incrementMessageCount = internalMutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("conversationMetrics")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .first();
    if (!existing) return;

    await ctx.db.patch(existing._id, {
      messageCount: existing.messageCount + 1,
    });
  },
});

/**
 * One-time backfill: creates missing conversationMetrics records for any
 * conversation that doesn't have one yet. Safe to run multiple times.
 * Run via: npx convex run conversationMetrics:backfillMissingMetrics '{"tenantId":"<your-org-id>"}'
 */
export const backfillMissingMetrics = mutation({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    const { tenantId } = args;

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_tenant_channel", (q) => q.eq("tenantId", tenantId))
      .collect();

    let created = 0;
    for (const conv of conversations) {
      const existing = await ctx.db
        .query("conversationMetrics")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .first();
      if (existing) continue;

      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .collect();
      const messageCount = messages.filter((m) => !m.isInternalNote).length;

      await ctx.db.insert("conversationMetrics", {
        tenantId,
        conversationId: conv._id,
        channelId: conv.channelId,
        messageCount,
        createdAt: conv.createdAt,
      });
      created++;
    }

    return { created };
  },
});
