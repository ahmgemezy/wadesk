import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { getCallerRole, getCallerIdentity, assertAdmin } from "./lib/auth";
import { internal } from "./_generated/api";
import type { Plan } from "./lib/planLimits";

export const listForTenant = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId } = await getCallerIdentity(ctx);
    return ctx.db
      .query("channels")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
  },
});

export const listByPhoneId = internalQuery({
  args: { phoneNumberId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("channels")
      .withIndex("by_phone_number_id", (q) => q.eq("phoneNumberId", args.phoneNumberId))
      .collect();
  },
});

export const listByTenantId = internalQuery({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("channels")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

export const getById = internalQuery({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.channelId);
  },
});

export const get = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) return null;
    return channel;
  },
});

export const setAssignmentMode = mutation({
  args: {
    channelId: v.id("channels"),
    mode: v.union(
      v.literal("first_reply"),
      v.literal("manual"),
      v.literal("round_robin"),
    ),
  },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const { tenantId } = await getCallerIdentity(ctx);

    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    if (args.mode === "round_robin") {
      const plan: Plan = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId });
      if (plan === "free" || plan === "starter") {
        throw new ConvexError({ code: "PLAN_REQUIRED", requiredPlan: "growth" });
      }
    }

    await ctx.db.patch(args.channelId, { assignmentMode: args.mode });
  },
});

export const incrementRoundRobinIndex = internalMutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) return;
    await ctx.db.patch(args.channelId, {
      roundRobinIndex: channel.roundRobinIndex + 1,
    });
  },
});
