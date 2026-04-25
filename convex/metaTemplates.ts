import { v } from "convex/values";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const META_BASE = "https://graph.facebook.com/v25.0";

export type MetaTemplateComponent = {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION";
  text?: string;
  buttons?: Array<{
    type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
    text: string;
    url?: string;
    phone_number?: string;
  }>;
  example?: unknown;
};

// ── Public query — list cached templates for a channel ────────────────────────

export const listForChannel = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.orgId) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;

    return ctx.db
      .query("metaTemplates")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .filter((q) => q.eq(q.field("tenantId"), tenantId))
      .order("asc")
      .collect();
  },
});

// ── Public action — sync templates from Meta and cache in DB ─────────────────

export const syncFromMeta = action({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.orgId) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;

    const channel = await ctx.runQuery(internal.metaTemplates.getChannelInternal, {
      channelId: args.channelId,
      tenantId,
    });
    if (!channel) throw new ConvexError("CHANNEL_NOT_FOUND");

    const token = process.env.META_SYSTEM_USER_TOKEN;
    if (!token) throw new ConvexError("META_SYSTEM_USER_TOKEN not set");

    const res = await fetch(
      `${META_BASE}/${channel.wabaId}/message_templates?fields=name,language,status,category,components&limit=100`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) {
      const err = await res.text();
      throw new ConvexError(`Meta API error: ${err}`);
    }

    const data = (await res.json()) as {
      data: Array<{
        name: string;
        language: string;
        status: string;
        category?: string;
        components: MetaTemplateComponent[];
      }>;
    };

    await ctx.runMutation(internal.metaTemplates.upsertBatch, {
      tenantId,
      channelId: args.channelId,
      wabaId: channel.wabaId,
      templates: data.data,
    });

    return data.data;
  },
});

// ── Internal helpers ──────────────────────────────────────────────────────────

export const getChannelInternal = internalQuery({
  args: { channelId: v.id("channels"), tenantId: v.string() },
  handler: async (ctx, args) => {
    const ch = await ctx.db.get(args.channelId);
    if (!ch || ch.tenantId !== args.tenantId) return null;
    return ch;
  },
});

export const upsertBatch = internalMutation({
  args: {
    tenantId: v.string(),
    channelId: v.id("channels"),
    wabaId: v.string(),
    templates: v.array(
      v.object({
        id: v.optional(v.string()),
        name: v.string(),
        language: v.string(),
        status: v.string(),
        category: v.optional(v.string()),
        components: v.any(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const tpl of args.templates) {
      const existing = await ctx.db
        .query("metaTemplates")
        .withIndex("by_waba_name_lang", (q) =>
          q.eq("wabaId", args.wabaId).eq("name", tpl.name).eq("language", tpl.language),
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          status: tpl.status,
          category: tpl.category,
          components: tpl.components,
          lastSyncedAt: now,
        });
      } else {
        await ctx.db.insert("metaTemplates", {
          tenantId: args.tenantId,
          channelId: args.channelId,
          wabaId: args.wabaId,
          name: tpl.name,
          language: tpl.language,
          status: tpl.status,
          category: tpl.category,
          components: tpl.components,
          lastSyncedAt: now,
        });
      }
    }
  },
});

export const updateStatusFromWebhook = internalMutation({
  args: {
    wabaId: v.string(),
    templateName: v.string(),
    language: v.optional(v.string()),
    newStatus: v.string(),
  },
  handler: async (ctx, args) => {
    const templates = await ctx.db
      .query("metaTemplates")
      .withIndex("by_waba_name_lang", (q) =>
        q.eq("wabaId", args.wabaId).eq("name", args.templateName),
      )
      .collect();

    for (const tpl of templates) {
      if (!args.language || tpl.language === args.language) {
        await ctx.db.patch(tpl._id, { status: args.newStatus, lastSyncedAt: Date.now() });
      }
    }

    return templates[0]?.tenantId ?? null;
  },
});

// Placeholder — returns empty until admin user IDs are tracked in Convex.
// Template status updates still happen; per-user notifications deferred.
export const getAdminsForTenant = internalQuery({
  args: { tenantId: v.string() },
  handler: async (_ctx, _args): Promise<Array<{ userId: string }>> => {
    return [];
  },
});

export const insertNotification = internalMutation({
  args: {
    tenantId: v.string(),
    userId: v.string(),
    type: v.union(v.literal("template_approved"), v.literal("template_rejected")),
    referenceId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      tenantId: args.tenantId,
      userId: args.userId,
      type: args.type,
      referenceId: args.referenceId,
      message: args.message,
      read: false,
      createdAt: Date.now(),
    });
  },
});

export const submitToMeta = action({
  args: {
    channelId: v.id("channels"),
    name: v.string(),
    body: v.string(),
    metaCategory: v.union(
      v.literal("MARKETING"),
      v.literal("UTILITY"),
      v.literal("AUTHENTICATION"),
    ),
    language: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.orgId) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;

    const channel = await ctx.runQuery(internal.metaTemplates.getChannelInternal, {
      channelId: args.channelId,
      tenantId,
    });
    if (!channel) throw new ConvexError("CHANNEL_NOT_FOUND");

    const token = process.env.META_SYSTEM_USER_TOKEN;
    if (!token) throw new ConvexError("META_SYSTEM_USER_TOKEN not configured");

    const numberedBody = convertToNumberedVars(args.body);

    const payload = {
      name: args.name,
      language: args.language,
      category: args.metaCategory,
      components: [{ type: "BODY", text: numberedBody }],
    };

    const res = await fetch(
      `${META_BASE}/${channel.wabaId}/message_templates`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await res.json() as Record<string, unknown>;

    if (!res.ok) {
      const errMsg =
        (data?.error as Record<string, unknown> | undefined)?.message ??
        `Meta API error ${res.status}`;
      throw new ConvexError(String(errMsg));
    }

    await ctx.runMutation(internal.metaTemplates.upsertBatch, {
      tenantId,
      channelId: args.channelId,
      wabaId: channel.wabaId,
      templates: [
        {
          name: args.name,
          language: args.language,
          status: "PENDING",
          category: args.metaCategory,
          components: payload.components,
        },
      ],
    });

    return { id: String(data.id ?? ""), status: "PENDING" };
  },
});

function convertToNumberedVars(body: string): string {
  let counter = 0;
  const seen = new Map<string, number>();
  return body.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
    const lower = name.toLowerCase();
    if (!seen.has(lower)) seen.set(lower, ++counter);
    return `{{${seen.get(lower)}}}`;
  });
}
