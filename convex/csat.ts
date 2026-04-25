// convex/csat.ts
// CSAT (Customer Satisfaction) flow.
// Triggered when a conversation is resolved. Sends a WhatsApp text asking 1–5 rating.
// Captures the reply in the webhook before it becomes a regular message.

import { v, ConvexError } from "convex/values";
import { query, mutation, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCallerIdentity, assertAdmin, type OrgRole } from "./lib/auth";

const META_API_BASE = "https://graph.facebook.com/v25.0";

// ── Send CSAT message ────────────────────────────────────────────────────────
// Called by ctx.scheduler from inbox.updateStatus when status → "resolved".

export const sendCsatMessage = internalAction({
  args: {
    conversationId: v.id("conversations"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get settings — bail if CSAT disabled
    const settings: { enabled: boolean; delayMinutes: number } | null = await ctx.runQuery(internal.csat.getSettingsInternal, {
      tenantId: args.tenantId,
    });
    if (!settings?.enabled) return;

    // Get conversation + channel + contact
    const conversation = await ctx.runQuery(internal.csat.getConversationForCsat, {
      conversationId: args.conversationId,
    });
    if (!conversation) return;

    // Only send if conversation is still resolved (agent may have reopened it)
    if (conversation.status !== "resolved") return;

    const { channel, contact } = conversation;
    if (!channel || !contact) return;

    // Check plan (Growth and above only)
    const plan: string | null = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId: args.tenantId });
    if (plan === "free" || plan === "starter") return;

    const accessToken = process.env.META_SYSTEM_USER_TOKEN;
    if (!accessToken) return;

    // TODO: Replace free-form text with a pre-approved WhatsApp template message
    // (e.g. template named "csat_request") to comply with the 24-hour messaging window.
    const message =
      `شكراً على تواصلك مع ${channel.displayName} 😊\n\n` +
      `كيف كانت تجربتك معنا؟\n\n` +
      `1 - سيء جداً\n` +
      `2 - سيء\n` +
      `3 - مقبول\n` +
      `4 - جيد\n` +
      `5 - ممتاز\n\n` +
      `أرسل الرقم المناسب`;

    try {
      const res = await fetch(`${META_API_BASE}/${channel.phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: contact.phone,
          type: "text",
          text: { body: message },
        }),
      });

      if (!res.ok) return;

      // Record that CSAT was sent
      await ctx.runMutation(internal.csat.markCsatSent, {
        conversationId: args.conversationId,
        sentAt: Date.now(),
      });
    } catch {
      // Silently fail — CSAT is non-critical
    }
  },
});

// ── Mark CSAT as sent ────────────────────────────────────────────────────────

export const markCsatSent = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    sentAt: v.number(),
  },
  handler: async (ctx, args) => {
    const metric = await ctx.db
      .query("conversationMetrics")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .first();
    if (!metric) return;
    await ctx.db.patch(metric._id, { csatSentAt: args.sentAt });
  },
});

// ── Check and record CSAT response ──────────────────────────────────────────
// Called from convex/http.ts BEFORE createInbound.
// Returns true if message was a CSAT reply (caller should skip createInbound).
// Returns false if it was a normal message (caller should proceed normally).

export const checkAndRecordResponse = internalMutation({
  args: {
    tenantId: v.string(),
    senderPhone: v.string(),
    content: v.string(),
    channelId: v.optional(v.id("channels")),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const trimmed = args.content.trim();
    if (!/^[1-5]$/.test(trimmed)) return false;

    const score = parseInt(trimmed, 10);

    const contact = await ctx.db
      .query("contacts")
      .withIndex("by_tenant_phone", (q) =>
        q.eq("tenantId", args.tenantId).eq("phone", args.senderPhone),
      )
      .first();
    if (!contact) return false;

    let conversations;
    if (args.channelId) {
      conversations = await ctx.db
        .query("conversations")
        .withIndex("by_tenant_channel", (q) =>
          q.eq("tenantId", args.tenantId).eq("channelId", args.channelId!),
        )
        .order("desc")
        .collect();
      conversations = conversations.filter((c) => c.contactId === contact._id);
      if (conversations.length > 0) conversations = [conversations[0]];
    } else {
      conversations = await ctx.db
        .query("conversations")
        .withIndex("by_contact", (q) => q.eq("contactId", contact._id))
        .order("desc")
        .take(1);
    }
    if (conversations.length === 0) return false;

    const conversation = conversations[0];

    // Find metric for this conversation with csatSentAt set but csatScore not set
    const metric = await ctx.db
      .query("conversationMetrics")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
      .first();

    if (!metric || !metric.csatSentAt || metric.csatScore !== undefined) return false;

    // Record the CSAT score
    await ctx.db.patch(metric._id, {
      csatScore: score,
      csatRespondedAt: Date.now(),
    });

    return true;
  },
});

// ── Internal helpers ─────────────────────────────────────────────────────────

export const getSettingsInternal = internalQuery({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("csatSettings")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .first();
  },
});

export const getConversationForCsat = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;
    const channel = await ctx.db.get(conversation.channelId);
    const contact = await ctx.db.get(conversation.contactId);
    return { ...conversation, channel, contact };
  },
});

// ── Public: get settings for UI ──────────────────────────────────────────────

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const settings = await ctx.db
      .query("csatSettings")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .first();
    // Return defaults if not configured yet
    return settings ?? { enabled: false, delayMinutes: 5, _id: null };
  },
});

// ── Public: update settings (Admin only, Growth+) ────────────────────────────

export const updateSettings = mutation({
  args: {
    enabled: v.boolean(),
    delayMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);

    if (args.delayMinutes < 0 || args.delayMinutes > 60) {
      throw new ConvexError("DELAY_OUT_OF_RANGE");
    }

    const existing = await ctx.db
      .query("csatSettings")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        delayMinutes: args.delayMinutes,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("csatSettings", {
        tenantId,
        enabled: args.enabled,
        delayMinutes: args.delayMinutes,
        updatedAt: Date.now(),
      });
    }
  },
});

// ── Internal: average score for analytics ────────────────────────────────────

export const getAverageScore = internalQuery({
  args: {
    tenantId: v.string(),
    fromTimestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const metrics = await ctx.db
      .query("conversationMetrics")
      .withIndex("by_tenant_created", (q) =>
        q.eq("tenantId", args.tenantId).gte("createdAt", args.fromTimestamp),
      )
      .collect();

    const withScores = metrics.filter((m) => m.csatScore !== undefined);
    if (withScores.length === 0) return null;

    const total = withScores.reduce((sum, m) => sum + (m.csatScore ?? 0), 0);
    return {
      average: Math.round((total / withScores.length) * 10) / 10,
      count: withScores.length,
    };
  },
});

// ── Public: average score for analytics dashboard ────────────────────────────

export const getAverageScorePublic = query({
  args: { fromTimestamp: v.number() },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const metrics = await ctx.db
      .query("conversationMetrics")
      .withIndex("by_tenant_created", (q) =>
        q.eq("tenantId", tenantId).gte("createdAt", args.fromTimestamp),
      )
      .collect();
    const withScores = metrics.filter((m) => m.csatScore !== undefined);
    if (withScores.length === 0) return null;
    const total = withScores.reduce((sum, m) => sum + (m.csatScore ?? 0), 0);
    return {
      average: Math.round((total / withScores.length) * 10) / 10,
      count: withScores.length,
    };
  },
});
