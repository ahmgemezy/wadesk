import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { getCallerIdentity } from "./lib/auth";

// ── Internal: create a notification ──────────────────────────────────────────

export const internalCreate = internalMutation({
  args: {
    tenantId: v.string(),
    userId: v.string(),
    type: v.union(
      v.literal("followup_due"),
      v.literal("sla_breach"),
      v.literal("template_approved"),
      v.literal("template_rejected"),
      v.literal("channel_expiring_soon"),
      v.literal("channel_deleted"),
      v.literal("agent_welcome"),
      v.literal("billing_payment_failed"),
      v.literal("billing_subscription_expired"),
    ),
    referenceId: v.string(),
    contactName: v.optional(v.string()),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      tenantId: args.tenantId,
      userId: args.userId,
      type: args.type,
      referenceId: args.referenceId,
      contactName: args.contactName,
      message: args.message,
      read: false,
      createdAt: Date.now(),
    });
  },
});

// ── Public queries ────────────────────────────────────────────────────────────

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", callerId).eq("read", false),
      )
      .collect();
    return unread.length;
  },
});

export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    return ctx.db
      .query("notifications")
      .withIndex("by_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", callerId).eq("read", false),
      )
      .order("desc")
      .take(30);
  },
});

// ── Public mutations ──────────────────────────────────────────────────────────

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    const n = await ctx.db.get(args.notificationId);
    if (!n || n.tenantId !== tenantId || n.userId !== callerId) return;
    await ctx.db.patch(args.notificationId, { read: true });
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", callerId).eq("read", false),
      )
      .collect();
    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { read: true })));
  },
});

export const hasWelcomeNotification = internalQuery({
  args: { userId: v.string(), tenantId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notifications")
      .withIndex("by_user_type", (q) =>
        q.eq("tenantId", args.tenantId)
         .eq("userId", args.userId)
         .eq("type", "agent_welcome"),
      )
      .first();
    return existing !== null;
  },
});
