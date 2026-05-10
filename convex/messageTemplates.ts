import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCallerIdentity, assertAdminOrSupervisor } from "./lib/auth";
import { assertTemplateLimitNotReached, type Plan } from "./lib/planLimits";

function extractVariables(body: string): string[] {
  const matches = body.matchAll(/\{\{(\w+)\}\}/g);
  return [...new Set([...matches].map((m) => m[1].toLowerCase()))];
}

export const list = query({
  args: {
    category: v.optional(v.string()),
    channelId: v.optional(v.id("channels")),
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const all = await ctx.db
      .query("messageTemplates")
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
    body: v.string(),
    category: v.optional(v.string()),
    language: v.union(v.literal("ar"), v.literal("en")),
    channelId: v.optional(v.id("channels")),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);

    assertAdminOrSupervisor(orgRole as Parameters<typeof assertAdminOrSupervisor>[0]);

    const plan: Plan = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId });
    const existing = await ctx.db
      .query("messageTemplates")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
    assertTemplateLimitNotReached(existing.length, plan);

    const variables = extractVariables(args.body);

    return ctx.db.insert("messageTemplates", {
      tenantId,
      channelId: args.channelId,
      title: args.title,
      body: args.body,
      category: args.category,
      language: args.language,
      variables,
      createdBy: callerId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("messageTemplates"),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    category: v.optional(v.string()),
    language: v.optional(v.union(v.literal("ar"), v.literal("en"))),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);

    assertAdminOrSupervisor(orgRole as Parameters<typeof assertAdminOrSupervisor>[0]);

    const template = await ctx.db.get(args.id);
    if (!template || template.tenantId !== tenantId) {
      throw new Error("NOT_FOUND");
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) patch.title = args.title;
    if (args.body !== undefined) {
      patch.body = args.body;
      patch.variables = extractVariables(args.body);
    }
    if (args.category !== undefined) patch.category = args.category;
    if (args.language !== undefined) patch.language = args.language;

    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("messageTemplates") },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);

    assertAdminOrSupervisor(orgRole as Parameters<typeof assertAdminOrSupervisor>[0]);

    const template = await ctx.db.get(args.id);
    if (!template || template.tenantId !== tenantId) {
      throw new Error("NOT_FOUND");
    }

    await ctx.db.delete(args.id);
  },
});
