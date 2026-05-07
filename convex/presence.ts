import { v, ConvexError } from "convex/values";
import { query, mutation } from "./_generated/server";
import { components } from "./_generated/api";
import { getCallerIdentity } from "./lib/auth";

export const heartbeat = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHORIZED");

    const callerId = identity.subject;
    let tenantId = (identity.orgId as string | undefined) || undefined;

    // The Convex JWT orgId can be empty briefly after Better Auth setActive
    // while the token is refreshing. Fall back to the member table so the
    // heartbeat works regardless of JWT state.
    if (!tenantId) {
      const members = await ctx.runQuery(
        components.betterAuth.orgQueries.listMembersByUserId,
        { userId: callerId },
      );
      if (members.length > 0) tenantId = members[0].organizationId;
    }

    if (!tenantId) return { ok: false }; // user has no org yet

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", callerId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "online",
        lastSeenAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("presence", {
        userId: callerId,
        tenantId,
        status: "online",
        lastSeenAt: now,
        updatedAt: now,
      });
    }

    return { ok: true };
  },
});

export const setStatus = mutation({
  args: {
    status: v.union(v.literal("online"), v.literal("away"), v.literal("offline")),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", callerId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        lastSeenAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("presence", {
        userId: callerId,
        tenantId,
        status: args.status,
        lastSeenAt: now,
        updatedAt: now,
      });
    }

    return { ok: true };
  },
});

export const listOnline = query({
  args: {
    tenantId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let tenantId = args.tenantId;
    
    // If no tenantId provided, get from auth
    if (!tenantId) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity?.orgId) {
        return [];
      }
      tenantId = identity.orgId as string;
    }
    
    const now = Date.now();
    const timeout = now - 60_000;

    const all = await ctx.db
      .query("presence")
      .withIndex("by_tenant_user", (q) => q.eq("tenantId", tenantId))
      .filter((q) => q.gte(q.field("lastSeenAt"), timeout))
      .collect();

    return all
      .filter((p) => p.status !== "offline")
      .map((p) => ({
        userId: p.userId,
        status: p.status,
        lastSeenAt: p.lastSeenAt,
      }));
  },
});

export const getMyStatus = query({
  args: {},
  handler: async (ctx) => {
    const { callerId } = await getCallerIdentity(ctx);

    const presence = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", callerId))
      .first();

    if (!presence) {
      return { status: "offline" as const, lastSeenAt: null };
    }

    return {
      status: presence.status,
      lastSeenAt: presence.lastSeenAt,
    };
  },
});