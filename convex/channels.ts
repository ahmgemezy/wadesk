import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { getCallerRole, assertAdmin } from "./lib/auth";

export const listForTenant = query({
  args: {},
  handler: async (ctx) => {
    const { getCallerIdentity } = await import("./lib/auth");
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
    const { getCallerIdentity } = await import("./lib/auth");
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

    const { getCallerIdentity } = await import("./lib/auth");
    const { tenantId } = await getCallerIdentity(ctx);

    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    if (args.mode === "round_robin") {
      // TODO: check tenant plan when plan field exists
      // For now, allow on all plans — plan gating can be added when billing is integrated
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
