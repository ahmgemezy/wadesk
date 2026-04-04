import { query, internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import type { Plan } from "./planLimits";

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
