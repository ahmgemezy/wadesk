// convex/broadcastTemplates.ts
import { v } from "convex/values";
import { query, mutation, action, internalQuery, internalMutation, internalAction } from "./_generated/server";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getCallerIdentity, getCallerRole, assertAdminOrSupervisor } from "./lib/auth";
import {
  assertBroadcastTemplateLimitNotReached,
  getBroadcastTemplateLimit,
  type Plan,
} from "./lib/planLimits";

const META_BASE = "https://graph.facebook.com/v25.0";

function extractVariables(body: string): string[] {
  const matches = body.matchAll(/\{\{(\w+)\}\}/g);
  return [...new Set([...matches].map((m) => m[1].toLowerCase()))];
}

// ── Public query ──────────────────────────────────────────────────────────────

export const list = query({
  args: { metaStatus: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);

    if (args.metaStatus) {
      return ctx.db
        .query("broadcastTemplates")
        .withIndex("by_tenant_status", (q) =>
          q.eq("tenantId", tenantId).eq("metaStatus", args.metaStatus as "draft" | "pending" | "approved" | "rejected" | "paused"),
        )
        .order("desc")
        .collect();
    }

    return ctx.db
      .query("broadcastTemplates")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .order("desc")
      .collect();
  },
});

export const getLimitInfo = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const plan: Plan = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId });
    const all = await ctx.db
      .query("broadcastTemplates")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
    return { count: all.length, limit: getBroadcastTemplateLimit(plan), plan };
  },
});

// ── Public mutations ──────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    channelId: v.id("channels"),
    name: v.string(),
    title: v.string(),
    language: v.string(),
    category: v.union(v.literal("MARKETING"), v.literal("UTILITY")),
    headerType: v.union(
      v.literal("NONE"), v.literal("TEXT"),
      v.literal("IMAGE"), v.literal("VIDEO"), v.literal("DOCUMENT"),
    ),
    headerText: v.optional(v.string()),
    headerMediaUrl: v.optional(v.string()),
    body: v.string(),
    footer: v.optional(v.string()),
    buttons: v.optional(v.array(v.object({
      type: v.union(v.literal("URL"), v.literal("PHONE_NUMBER"), v.literal("QUICK_REPLY")),
      text: v.string(),
      value: v.string(),
      isDynamic: v.optional(v.boolean()),
    }))),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as Parameters<typeof assertAdminOrSupervisor>[0]);

    // Verify channel belongs to tenant
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) throw new ConvexError("CHANNEL_NOT_FOUND");

    const plan: Plan = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId });
    const existing = await ctx.db
      .query("broadcastTemplates")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
    assertBroadcastTemplateLimitNotReached(existing.length, plan);

    return ctx.db.insert("broadcastTemplates", {
      tenantId,
      channelId: args.channelId,
      name: args.name,
      title: args.title,
      language: args.language,
      category: args.category,
      headerType: args.headerType,
      headerText: args.headerText,
      headerMediaUrl: args.headerMediaUrl,
      body: args.body,
      variables: extractVariables(args.body),
      footer: args.footer,
      buttons: args.buttons,
      metaStatus: "draft",
      createdBy: callerId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("broadcastTemplates"),
    channelId: v.optional(v.id("channels")),
    name: v.optional(v.string()),
    title: v.optional(v.string()),
    language: v.optional(v.string()),
    category: v.optional(v.union(v.literal("MARKETING"), v.literal("UTILITY"))),
    headerType: v.optional(v.union(
      v.literal("NONE"), v.literal("TEXT"),
      v.literal("IMAGE"), v.literal("VIDEO"), v.literal("DOCUMENT"),
    )),
    headerText: v.optional(v.string()),
    headerMediaUrl: v.optional(v.string()),
    body: v.optional(v.string()),
    footer: v.optional(v.string()),
    buttons: v.optional(v.array(v.object({
      type: v.union(v.literal("URL"), v.literal("PHONE_NUMBER"), v.literal("QUICK_REPLY")),
      text: v.string(),
      value: v.string(),
      isDynamic: v.optional(v.boolean()),
    }))),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as Parameters<typeof assertAdminOrSupervisor>[0]);

    const tpl = await ctx.db.get(args.id);
    if (!tpl || tpl.tenantId !== tenantId) throw new ConvexError("NOT_FOUND");
    if (tpl.metaStatus === "pending" || tpl.metaStatus === "approved") {
      throw new ConvexError("TEMPLATE_LOCKED");
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.channelId !== undefined) patch.channelId = args.channelId;
    if (args.name !== undefined) patch.name = args.name;
    if (args.title !== undefined) patch.title = args.title;
    if (args.language !== undefined) patch.language = args.language;
    if (args.category !== undefined) patch.category = args.category;
    if (args.headerType !== undefined) patch.headerType = args.headerType;
    if (args.headerText !== undefined) patch.headerText = args.headerText;
    if (args.headerMediaUrl !== undefined) patch.headerMediaUrl = args.headerMediaUrl;
    if (args.footer !== undefined) patch.footer = args.footer;
    if (args.buttons !== undefined) patch.buttons = args.buttons;
    if (args.body !== undefined) {
      patch.body = args.body;
      patch.variables = extractVariables(args.body);
    }

    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("broadcastTemplates") },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as Parameters<typeof assertAdminOrSupervisor>[0]);

    const tpl = await ctx.db.get(args.id);
    if (!tpl || tpl.tenantId !== tenantId) throw new ConvexError("NOT_FOUND");
    if (tpl.metaStatus === "pending" || tpl.metaStatus === "approved") {
      throw new ConvexError("TEMPLATE_LOCKED");
    }

    await ctx.db.delete(args.id);
  },
});
