import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCallerIdentity, assertAdmin, type OrgRole } from "./lib/auth";
import {
  TOGGLEABLE_EVENT_TYPES,
  toggleableEventTypeValidator,
  EVENT_DEFAULTS,
  GROWTH_PLUS_ONLY_EVENTS,
  EMAIL_DAILY_CAP_BY_PLAN,
  makeEmailDailyKey,
  todayYmd,
} from "./lib/notificationEvents";
import { readPlan } from "./lib/tenants";
import { tryConsumeQuota } from "./lib/rateLimit";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const BELL_LIMIT = 10;

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
      v.literal("channel_token_expired"),
      v.literal("channel_deleted"),
      v.literal("agent_welcome"),
      v.literal("billing_payment_failed"),
      v.literal("billing_subscription_expired"),
      v.literal("conversation_transferred"),
      v.literal("conversation_reopened"),
      v.literal("new_assignment"),
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

// Recent notifications for the bell popover — read + unread, capped to 10.
export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    return ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) =>
        q.eq("tenantId", tenantId).eq("userId", callerId),
      )
      .order("desc")
      .take(BELL_LIMIT);
  },
});

// Full notification log for the settings page.
export const listAllForUser = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    return ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) =>
        q.eq("tenantId", tenantId).eq("userId", callerId),
      )
      .order("desc")
      .take(500);
  },
});

// ── Public mutations ──────────────────────────────────────────────────────────

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    const n = await ctx.db.get(args.notificationId);
    if (!n || n.tenantId !== tenantId || n.userId !== callerId) return;
    if (n.read) return;
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

// Admin-only: delete a single notification.
export const remove = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);
    const n = await ctx.db.get(args.notificationId);
    if (!n || n.tenantId !== tenantId || n.userId !== callerId) return;
    await ctx.db.delete(args.notificationId);
  },
});

// Admin-only: delete all notifications for the caller.
export const removeAll = mutation({
  args: {},
  handler: async (ctx) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);
    const all = await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) =>
        q.eq("tenantId", tenantId).eq("userId", callerId),
      )
      .collect();
    await Promise.all(all.map((n) => ctx.db.delete(n._id)));
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

// ── Retention: purge notifications older than 30 days ────────────────────────

export const purgeOld = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - RETENTION_MS;
    // Iterate in batches to stay under Convex limits.
    const stale = await ctx.db
      .query("notifications")
      .withIndex("by_created", (q) => q.lt("createdAt", cutoff))
      .take(500);
    await Promise.all(stale.map((n) => ctx.db.delete(n._id)));
    return stale.length;
  },
});

/**
 * Central notification dispatcher. Reads user preferences (with default
 * fallback), checks plan gating, writes the in-app notifications row if
 * inAppEnabled, and schedules the email send if emailEnabled and the
 * tenant's daily email cap hasn't been exhausted.
 *
 * Called from every notification call site that previously did a direct
 * `ctx.db.insert("notifications", ...)`. Fire-and-forget — caller does
 * not need to handle the email send.
 *
 * For transactional events (agent_welcome, billing_*, channel_token_expired,
 * channel_deleted), do NOT call this helper. Those go through the legacy
 * direct-insert paths because they are not user-toggleable.
 */
export const notifyDispatch = internalMutation({
  args: {
    tenantId: v.string(),
    userId: v.string(),
    eventType: toggleableEventTypeValidator,
    referenceId: v.string(),
    contactName: v.optional(v.string()),
    message: v.string(),
    // Optional template variables forwarded opaquely to notifySend (which
    // hands them to the React Email render call). Dispatch never inspects
    // these — keep payload shape consistent with each event's template.
    emailVariables: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // 1. Plan check — Growth+-only events short-circuit on lower plans.
    const plan = await readPlan(ctx, args.tenantId);
    if (
      GROWTH_PLUS_ONLY_EVENTS.has(args.eventType) &&
      (plan === "free" || plan === "starter")
    ) {
      return;
    }

    // 2. Read preferences row (or fall back to event defaults).
    const prefRow = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_tenant_user_event", (q) =>
        q
          .eq("tenantId", args.tenantId)
          .eq("userId", args.userId)
          .eq("eventType", args.eventType),
      )
      .first();
    const defaults = EVENT_DEFAULTS[args.eventType];
    const inAppEnabled = prefRow?.inAppEnabled ?? defaults.inAppEnabled;
    const emailEnabledByPref = prefRow?.emailEnabled ?? defaults.emailEnabled;

    // 3. Email channel plan-gate: Free plan has no email channel.
    const emailGateOpen = plan !== "free";
    const wantsEmail = emailEnabledByPref && emailGateOpen;

    // 4. In-app row — write if enabled.
    if (inAppEnabled) {
      await ctx.db.insert("notifications", {
        tenantId: args.tenantId,
        userId: args.userId,
        type: args.eventType,
        referenceId: args.referenceId,
        contactName: args.contactName,
        message: args.message,
        read: false,
        createdAt: Date.now(),
      });
    }

    // 5. Email — if enabled and under daily cap, schedule the send.
    //    Email resolution happens INSIDE notifySend (which has Node available
    //    via "use node"). notifyDispatch never touches Clerk — it cannot,
    //    because mutations are not Node-context.
    if (wantsEmail) {
      const cap = EMAIL_DAILY_CAP_BY_PLAN[plan];
      if (cap !== null) {
        const key = makeEmailDailyKey(args.tenantId, todayYmd());
        const slotConsumed = await tryConsumeQuota(ctx, key, cap);
        if (slotConsumed) {
          await ctx.scheduler.runAfter(0, internal.actions.notifyEmail.notifySend, {
            userId: args.userId,
            tenantId: args.tenantId,
            eventType: args.eventType,
            variables: args.emailVariables ?? {},
          });
        }
        // If !slotConsumed, silently drop the email — in-app row still went out.
      }
    }
  },
});

/**
 * Returns the calling user's notification preferences as a complete matrix
 * (one entry per toggleable event type). Falls back to EVENT_DEFAULTS for
 * any event the user has not explicitly saved a row for.
 */
export const getPreferences = query({
  args: { channelId: v.optional(v.id("channels")) },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    if (!tenantId) return [];
    const rows = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", callerId),
      )
      .collect();
    // When channelId provided, prefer channel-specific rows; fall back to global (no channelId)
    const scoped = args.channelId
      ? rows.filter((r) => r.channelId === args.channelId || !r.channelId)
      : rows.filter((r) => !r.channelId);
    const byEvent = new Map(scoped.map((r) => [r.eventType, r]));
    return TOGGLEABLE_EVENT_TYPES.map((et) => {
      const row = byEvent.get(et);
      const def = EVENT_DEFAULTS[et];
      return {
        eventType: et,
        inAppEnabled: row?.inAppEnabled ?? def.inAppEnabled,
        emailEnabled: row?.emailEnabled ?? def.emailEnabled,
      };
    });
  },
});

/**
 * Upsert the calling user's preference for a single event type. The UI
 * calls this once per toggle (no batching). Plan gating is NOT enforced
 * here — gating happens at dispatch time. Users on Free can still save
 * their email preferences for the day they upgrade.
 */
export const updatePreference = mutation({
  args: {
    eventType: toggleableEventTypeValidator,
    inAppEnabled: v.boolean(),
    emailEnabled: v.boolean(),
    channelId: v.optional(v.id("channels")),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    if (!tenantId) throw new Error("Unauthorized");
    // Match on both eventType and channelId (null-safe)
    const rows = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_tenant_user_event", (q) =>
        q
          .eq("tenantId", tenantId)
          .eq("userId", callerId)
          .eq("eventType", args.eventType),
      )
      .collect();
    const existing = rows.find((r) =>
      args.channelId ? r.channelId === args.channelId : !r.channelId,
    ) ?? null;
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        inAppEnabled: args.inAppEnabled,
        emailEnabled: args.emailEnabled,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("notificationPreferences", {
        tenantId,
        userId: callerId,
        channelId: args.channelId,
        eventType: args.eventType,
        inAppEnabled: args.inAppEnabled,
        emailEnabled: args.emailEnabled,
        updatedAt: now,
      });
    }
  },
});
