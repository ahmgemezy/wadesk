/**
 * @fileoverview Internal write-only read-model for analytics.
 *
 * All functions here are `internalMutation` — never callable from the client.
 * They are triggered by `ctx.scheduler.runAfter(0, ...)` from `conversations.ts`
 * and `messages.ts` to write denormalized metrics records without blocking the
 * main mutation response.
 */
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const create = internalMutation({
  args: {
    tenantId: v.string(),
    conversationId: v.id("conversations"),
    channelId: v.id("channels"),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("conversationMetrics", {
      tenantId: args.tenantId,
      conversationId: args.conversationId,
      channelId: args.channelId,
      messageCount: 0,
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
