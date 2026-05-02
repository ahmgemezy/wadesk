import { query, internalQuery, internalMutation, mutation } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import type { Plan } from "./planLimits";
import { getCallerIdentity, assertAdmin } from "./auth";

export const getCurrentPlan = query({
  args: {},
  handler: async (ctx): Promise<Plan> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.orgId) return "free";
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", identity.orgId as string))
      .first();
    return (tenant?.plan as Plan) ?? "free";
  },
});

export const getPlan = internalQuery({
  args: { tenantId: v.string() },
  handler: async (ctx, args): Promise<Plan> => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();
    return (tenant?.plan as Plan) ?? "free";
  },
});

export const updatePlan = mutation({
  args: { plan: v.union(v.literal("free"), v.literal("starter"), v.literal("growth"), v.literal("business")) },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as import("./auth").OrgRole);

    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .first();

    if (!tenant) {
      throw new ConvexError("TENANT_NOT_FOUND");
    }

    await ctx.db.patch(tenant._id, { plan: args.plan });
  },
});

export const ensureTenant = internalMutation({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();

    if (existing) return existing;

    return ctx.db.insert("tenants", {
      tenantId: args.tenantId,
      plan: "free",
      createdAt: Date.now(),
    });
  },
});

export const getTenantInternal = internalQuery({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();
  },
});

export const getSubscriptionStatus = query({
  args: {},
  handler: async (ctx): Promise<{ plan: Plan; hasSubscription: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.orgId) return { plan: "free", hasSubscription: false };
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", identity.orgId as string))
      .first();
    return {
      plan: (tenant?.plan as Plan) ?? "free",
      hasSubscription: !!tenant?.paddle_subscription_id,
    };
  },
});

export const getEmailLocale = internalQuery({
  args: { tenantId: v.string() },
  handler: async (ctx, args): Promise<"ar" | "en"> => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();
    return tenant?.emailLocale ?? "ar";
  },
});

export const getEmailLocalePublic = query({
  args: {},
  handler: async (ctx): Promise<"ar" | "en"> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.orgId) return "ar";
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", identity.orgId as string))
      .first();
    return tenant?.emailLocale ?? "ar";
  },
});

export const updateEmailLocale = mutation({
  args: { locale: v.union(v.literal("ar"), v.literal("en")) },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as import("./auth").OrgRole);
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .first();
    if (!tenant) throw new ConvexError("TENANT_NOT_FOUND");
    await ctx.db.patch(tenant._id, { emailLocale: args.locale });
  },
});

export const getTenantBySubscriptionId = internalQuery({
  args: { subscriptionId: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("tenants").collect();
    return all.find((t) => t.paddle_subscription_id === args.subscriptionId) ?? null;
  },
});
