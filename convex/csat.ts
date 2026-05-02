// convex/csat.ts
// CSAT (Customer Satisfaction) flow.
// Triggered when a conversation is resolved. Sends a WhatsApp template asking 1–5 rating.
// WaDesk auto-submits the template to Meta when CSAT is enabled — no manual Meta work needed.
// Admin chooses Arabic or English; the correct template is submitted and used for sending.

import { v, ConvexError } from "convex/values";
import { query, mutation, action, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCallerIdentity, getCallerRole, assertAdmin, type OrgRole } from "./lib/auth";

const META_API_BASE = "https://graph.facebook.com/v25.0";
const CSAT_TEMPLATE_NAME = "csat_rating";

// Two pre-built templates — admin picks one; WaDesk submits it to Meta automatically.
const CSAT_TEMPLATE_CONFIG = {
  ar: {
    metaLanguage: "ar",
    body: "شكراً على تواصلك مع *{{1}}* 😊\n\nكيف كانت تجربتك معنا؟\n\n1 - سيء جداً\n2 - سيء\n3 - مقبول\n4 - جيد\n5 - ممتاز\n\nأرسل الرقم المناسب",
    exampleName: "اسم شركتك",
    previewPlaceholder: "[اسم الشركة]",
  },
  en: {
    metaLanguage: "en_US",
    body: "Thank you for contacting *{{1}}* 😊\n\nHow was your experience with us?\n\n1 - Very Bad\n2 - Bad\n3 - Acceptable\n4 - Good\n5 - Excellent\n\nReply with the number",
    exampleName: "Your Company",
    previewPlaceholder: "[Company Name]",
  },
} as const;

type CsatLanguage = keyof typeof CSAT_TEMPLATE_CONFIG;

// ── Send CSAT message ────────────────────────────────────────────────────────
// Called by ctx.scheduler from inbox.updateStatus when status → "resolved".

export const sendCsatMessage = internalAction({
  args: {
    conversationId: v.id("conversations"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const settings: { enabled: boolean; delayMinutes: number; language?: string } | null =
      await ctx.runQuery(internal.csat.getSettingsInternal, { tenantId: args.tenantId });
    if (!settings?.enabled) return;

    const conversation = await ctx.runQuery(internal.csat.getConversationForCsat, {
      conversationId: args.conversationId,
    });
    if (!conversation) return;
    if (conversation.status !== "resolved") return;

    const { channel, contact } = conversation;
    if (!channel || !contact) return;

    // Plan gate: Growth and above only
    const plan: string | null = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId: args.tenantId });
    if (plan === "free" || plan === "starter") return;

    const language = ((settings.language ?? "ar") as CsatLanguage);
    const templateConfig = CSAT_TEMPLATE_CONFIG[language];

    // Gate: template must be APPROVED in Meta before we can send
    const template = await ctx.runQuery(internal.csat.getCsatTemplateByWabaId, {
      wabaId: channel.wabaId,
      metaLanguage: templateConfig.metaLanguage,
    });
    if (!template || template.status !== "APPROVED") return;

    const accessToken = process.env.META_SYSTEM_USER_TOKEN;
    if (!accessToken) return;

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
          type: "template",
          template: {
            name: CSAT_TEMPLATE_NAME,
            language: { code: templateConfig.metaLanguage },
            components: [
              {
                type: "body",
                parameters: [{ type: "text", text: channel.displayName ?? "" }],
              },
            ],
          },
        }),
      });

      if (!res.ok) return;

      // Render the CSAT body with the channel name substituted for {{1}}.
      const renderedBody = templateConfig.body.replace("{{1}}", channel.displayName ?? "");

      await ctx.runMutation(internal.csat.markCsatSent, {
        conversationId: args.conversationId,
        tenantId: args.tenantId,
        channelId: channel._id,
        sentAt: Date.now(),
        renderedBody,
      });
    } catch {
      // CSAT is non-critical
    }
  },
});

// ── Mark CSAT as sent ────────────────────────────────────────────────────────

export const markCsatSent = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    tenantId: v.string(),
    channelId: v.id("channels"),
    sentAt: v.number(),
    renderedBody: v.string(),
  },
  handler: async (ctx, args) => {
    // Upsert metrics row — older conversations may predate the metrics table.
    // Without this, csatSentAt is never recorded and checkAndRecordResponse
    // can never match the customer's reply.
    const metric = await ctx.db
      .query("conversationMetrics")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .first();
    if (metric) {
      await ctx.db.patch(metric._id, { csatSentAt: args.sentAt });
    } else {
      const conversation = await ctx.db.get(args.conversationId);
      await ctx.db.insert("conversationMetrics", {
        tenantId: args.tenantId,
        conversationId: args.conversationId,
        channelId: args.channelId,
        messageCount: 0,
        createdAt: conversation?.createdAt ?? args.sentAt,
        csatSentAt: args.sentAt,
      });
    }

    // Insert the CSAT outbound into the conversation thread so the agent sees
    // exactly what was sent to the customer.
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      tenantId: args.tenantId,
      direction: "outbound",
      content: args.renderedBody,
      contentType: "text",
      isInternalNote: false,
      status: "sent",
      timestamp: args.sentAt,
      createdAt: args.sentAt,
    });
  },
});

// ── Check and record CSAT response ──────────────────────────────────────────
// Called from webhook processor BEFORE createInbound.
// Returns true if message was a CSAT reply (caller should skip createInbound).

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

    const normalizedPhone = args.senderPhone.startsWith("+") ? args.senderPhone : `+${args.senderPhone}`;
    const contact = await ctx.db
      .query("contacts")
      .withIndex("by_tenant_phone", (q) =>
        q.eq("tenantId", args.tenantId).eq("phone", normalizedPhone),
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

    const metric = await ctx.db
      .query("conversationMetrics")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
      .first();

    if (!metric || !metric.csatSentAt || metric.csatScore !== undefined) return false;

    const respondedAt = Date.now();
    await ctx.db.patch(metric._id, {
      csatScore: score,
      csatRespondedAt: respondedAt,
    });

    // Insert a system-event pill in the thread so the agent sees the rating.
    await ctx.db.insert("messages", {
      conversationId: conversation._id,
      tenantId: args.tenantId,
      direction: "outbound",
      content: "",
      contentType: "system_event",
      eventType: "csat_received",
      eventData: { csatScore: score },
      isInternalNote: false,
      status: "sent",
      timestamp: respondedAt,
      createdAt: respondedAt,
    });

    return true;
  },
});

// ── Auto-submit CSAT template to Meta for all tenant channels ─────────────
// Called when admin enables CSAT or changes language.

export const ensureCsatTemplatesForTenant = internalAction({
  args: {
    tenantId: v.string(),
    language: v.union(v.literal("ar"), v.literal("en")),
    forceResubmit: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const channels = await ctx.runQuery(internal.channels.listByTenantId, {
      tenantId: args.tenantId,
    });

    const token = process.env.META_SYSTEM_USER_TOKEN;
    if (!token || channels.length === 0) return;

    for (const channel of channels) {
      await ctx.runAction(internal.csat.submitCsatTemplateForChannel, {
        tenantId: args.tenantId,
        channelId: channel._id,
        wabaId: channel.wabaId,
        language: args.language,
        skipIfPendingOrApproved: !args.forceResubmit,
      });
    }
  },
});

// ── Submit template for a single channel (internal) ──────────────────────────

export const submitCsatTemplateForChannel = internalAction({
  args: {
    tenantId: v.string(),
    channelId: v.id("channels"),
    wabaId: v.string(),
    language: v.union(v.literal("ar"), v.literal("en")),
    skipIfPendingOrApproved: v.boolean(),
  },
  handler: async (ctx, args) => {
    const token = process.env.META_SYSTEM_USER_TOKEN;
    if (!token) return;

    const templateConfig = CSAT_TEMPLATE_CONFIG[args.language];
    const { metaLanguage, body, exampleName } = templateConfig;

    const components = [
      {
        type: "BODY",
        text: body,
        example: { body_text: [[exampleName]] },
      },
    ];

    // Fetch current status from Meta — avoids duplicate submissions
    let metaStatus: string | null = null;
    let metaTemplateId: string | null = null;
    try {
      const getRes = await fetch(
        `${META_API_BASE}/${args.wabaId}/message_templates?name=${CSAT_TEMPLATE_NAME}&fields=id,name,language,status,category,components&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (getRes.ok) {
        const getData = await getRes.json() as {
          data?: Array<{ id: string; name: string; language: string; status: string; category?: string; components: unknown }>;
        };
        const existing = getData.data?.find(
          (t) => t.name === CSAT_TEMPLATE_NAME && t.language === metaLanguage,
        );
        if (existing) {
          metaStatus = existing.status;
          metaTemplateId = existing.id;
          await ctx.runMutation(internal.metaTemplates.upsertBatch, {
            tenantId: args.tenantId,
            channelId: args.channelId,
            wabaId: args.wabaId,
            templates: [
              {
                id: existing.id,
                name: existing.name,
                language: existing.language,
                status: existing.status,
                category: existing.category,
                components: existing.components,
              },
            ],
          });
        }
      }
    } catch {
      // Continue to submission attempt even if GET failed
    }

    if (args.skipIfPendingOrApproved && (metaStatus === "APPROVED" || metaStatus === "PENDING")) {
      return;
    }

    // Delete rejected template so we can resubmit with the same name
    if (metaStatus === "REJECTED" && metaTemplateId) {
      try {
        await fetch(`${META_API_BASE}/${metaTemplateId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Best-effort delete
      }
    }

    // Submit to Meta
    try {
      const postRes = await fetch(
        `${META_API_BASE}/${args.wabaId}/message_templates`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: CSAT_TEMPLATE_NAME,
            language: metaLanguage,
            category: "UTILITY",
            components,
          }),
        },
      );

      const newStatus = postRes.ok ? "PENDING" : "REJECTED";

      await ctx.runMutation(internal.metaTemplates.upsertBatch, {
        tenantId: args.tenantId,
        channelId: args.channelId,
        wabaId: args.wabaId,
        templates: [
          {
            name: CSAT_TEMPLATE_NAME,
            language: metaLanguage,
            status: newStatus,
            category: "UTILITY",
            components,
          },
        ],
      });
    } catch {
      // Silently fail — non-critical
    }
  },
});

// ── Public: sync template statuses from Meta ─────────────────────────────────

export const syncCsatTemplateStatuses = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.orgId) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const settings = await ctx.runQuery(internal.csat.getSettingsInternal, { tenantId });
    const language = ((settings?.language ?? "ar") as CsatLanguage);
    const metaLanguage = CSAT_TEMPLATE_CONFIG[language].metaLanguage;

    const channels = await ctx.runQuery(internal.channels.listByTenantId, { tenantId });
    const token = process.env.META_SYSTEM_USER_TOKEN;
    if (!token) return;

    for (const channel of channels) {
      try {
        const res = await fetch(
          `${META_API_BASE}/${channel.wabaId}/message_templates?name=${CSAT_TEMPLATE_NAME}&fields=id,name,language,status,category,components&limit=10`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) continue;

        const data = await res.json() as {
          data?: Array<{ id?: string; name: string; language: string; status: string; category?: string; components: unknown }>;
        };
        const found = data.data?.find(
          (t) => t.name === CSAT_TEMPLATE_NAME && t.language === metaLanguage,
        );
        if (!found) continue;

        await ctx.runMutation(internal.metaTemplates.upsertBatch, {
          tenantId,
          channelId: channel._id,
          wabaId: channel.wabaId,
          templates: [found],
        });
      } catch {
        // Continue for other channels
      }
    }
  },
});

// ── Public: resubmit rejected template for one channel ───────────────────────

export const resubmitCsatTemplate = action({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.orgId) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const channel = await ctx.runQuery(internal.channels.getById, {
      channelId: args.channelId,
      tenantId,
    });
    if (!channel || channel.tenantId !== tenantId) throw new ConvexError("CHANNEL_NOT_FOUND");

    const settings = await ctx.runQuery(internal.csat.getSettingsInternal, { tenantId });
    const language = ((settings?.language ?? "ar") as CsatLanguage);

    await ctx.runAction(internal.csat.submitCsatTemplateForChannel, {
      tenantId,
      channelId: channel._id,
      wabaId: channel.wabaId,
      language,
      skipIfPendingOrApproved: false,
    });
  },
});

// ── Public: template statuses for CSAT settings UI ───────────────────────────

export const getCsatTemplateStatuses = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId } = await getCallerIdentity(ctx);

    const settings = await ctx.db
      .query("csatSettings")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .first();

    const language = ((settings?.language ?? "ar") as CsatLanguage);
    const metaLanguage = CSAT_TEMPLATE_CONFIG[language].metaLanguage;

    const channels = await ctx.db
      .query("channels")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    return Promise.all(
      channels.map(async (channel) => {
        const template = await ctx.db
          .query("metaTemplates")
          .withIndex("by_waba_name_lang", (q) =>
            q.eq("wabaId", channel.wabaId).eq("name", CSAT_TEMPLATE_NAME).eq("language", metaLanguage),
          )
          .first();

        return {
          channelId: channel._id,
          channelName: channel.displayName,
          displayPhone: channel.displayPhone ?? null,
          status: template?.status ?? null,
          lastSyncedAt: template?.lastSyncedAt ?? null,
        };
      }),
    );
  },
});

// ── Internal helpers ─────────────────────────────────────────────────────────

export const getCsatTemplateByWabaId = internalQuery({
  args: { wabaId: v.string(), metaLanguage: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("metaTemplates")
      .withIndex("by_waba_name_lang", (q) =>
        q.eq("wabaId", args.wabaId).eq("name", CSAT_TEMPLATE_NAME).eq("language", args.metaLanguage),
      )
      .first();
  },
});

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

// ── Public: per-contact CSAT summary (for contact panel) ─────────────────────

export const getContactCsat = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.tenantId !== tenantId) return null;

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .collect();

    const metrics = await Promise.all(
      conversations.map((c) =>
        ctx.db
          .query("conversationMetrics")
          .withIndex("by_conversation", (q) => q.eq("conversationId", c._id))
          .first(),
      ),
    );

    const scored = metrics
      .filter((m): m is NonNullable<typeof m> => m !== null && m.csatScore !== undefined)
      .sort((a, b) => (b.csatRespondedAt ?? 0) - (a.csatRespondedAt ?? 0));

    if (scored.length === 0) return { count: 0, average: null, lastScore: null };

    const total = scored.reduce((sum, m) => sum + (m.csatScore ?? 0), 0);
    return {
      count: scored.length,
      average: Math.round((total / scored.length) * 10) / 10,
      lastScore: scored[0].csatScore ?? null,
    };
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
    return settings
      ? { ...settings, language: settings.language ?? "ar" as const }
      : { enabled: false, delayMinutes: 5, language: "ar" as const, _id: null };
  },
});

// ── Public: update settings (Admin only) ─────────────────────────────────────
// Submits the selected language template to Meta whenever CSAT is enabled or language changes.

export const updateSettings = mutation({
  args: {
    enabled: v.boolean(),
    delayMinutes: v.number(),
    language: v.union(v.literal("ar"), v.literal("en")),
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

    const prevLanguage = existing?.language ?? "ar";
    const languageChanged = prevLanguage !== args.language;

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        delayMinutes: args.delayMinutes,
        language: args.language,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("csatSettings", {
        tenantId,
        enabled: args.enabled,
        delayMinutes: args.delayMinutes,
        language: args.language,
        updatedAt: Date.now(),
      });
    }

    // Submit template when enabling OR when language changes while already enabled
    if (args.enabled) {
      await ctx.scheduler.runAfter(0, internal.csat.ensureCsatTemplatesForTenant, {
        tenantId,
        language: args.language,
        forceResubmit: languageChanged,
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

// ── Public: template preview text (for UI) ───────────────────────────────────
// Returns the preview body and placeholder for the selected language.

export const getTemplatePreview = query({
  args: { language: v.union(v.literal("ar"), v.literal("en")) },
  handler: async (_ctx, args) => {
    const config = CSAT_TEMPLATE_CONFIG[args.language];
    return {
      body: config.body.replace("{{1}}", config.previewPlaceholder),
      dir: args.language === "ar" ? "rtl" : "ltr",
    };
  },
});
