import { v, ConvexError } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getCallerIdentity, getCallerRole, assertAdmin } from "./lib/auth";

export const listForChannel = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }
    const members = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();
    const supervisors = members
      .filter((m) => m.role === "org:supervisor")
      .sort((a, b) => a.userName.localeCompare(b.userName));
    const agents = members
      .filter((m) => m.role === "org:agent")
      .sort((a, b) => a.userName.localeCompare(b.userName));
    return [...supervisors, ...agents];
  },
});

export const isCallerMember = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) return false;
    const membership = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", callerId)
      )
      .first();
    return membership !== null;
  },
});

export const addMember = mutation({
  args: {
    channelId: v.id("channels"),
    userId: v.string(),
    userName: v.string(),
    userEmail: v.string(),
    userImageUrl: v.optional(v.string()),
    role: v.union(v.literal("org:supervisor"), v.literal("org:agent")),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    const callerRole = await getCallerRole(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }
    if (callerRole === "org:supervisor") {
      if (args.role === "org:supervisor") {
        throw new ConvexError("FORBIDDEN");
      }
      const callerMembership = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel_user", (q) =>
          q.eq("channelId", args.channelId).eq("userId", callerId)
        )
        .first();
      if (!callerMembership) {
        throw new ConvexError("FORBIDDEN");
      }
    } else {
      assertAdmin(callerRole);
    }
    const existing = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", args.userId)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        role: args.role,
        userName: args.userName,
        userEmail: args.userEmail,
        userImageUrl: args.userImageUrl,
        addedBy: callerId,
      });
      return existing._id;
    }
    return ctx.db.insert("channelMembers", {
      tenantId,
      channelId: args.channelId,
      userId: args.userId,
      userName: args.userName,
      userEmail: args.userEmail,
      userImageUrl: args.userImageUrl,
      role: args.role,
      addedBy: callerId,
      createdAt: Date.now(),
    });
  },
});

export const removeMember = mutation({
  args: {
    channelId: v.id("channels"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    const callerRole = await getCallerRole(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }
    const membership = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", args.userId)
      )
      .first();
    if (!membership) return;
    if (callerRole === "org:supervisor") {
      if (membership.role === "org:supervisor") {
        throw new ConvexError("FORBIDDEN");
      }
      const callerMembership = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel_user", (q) =>
          q.eq("channelId", args.channelId).eq("userId", callerId)
        )
        .first();
      if (!callerMembership) {
        throw new ConvexError("FORBIDDEN");
      }
    } else {
      assertAdmin(callerRole);
    }
    await ctx.db.delete(membership._id);
  },
});

export const addMemberInternal = internalMutation({
  args: {
    tenantId: v.string(),
    channelId: v.id("channels"),
    userId: v.string(),
    userName: v.string(),
    userEmail: v.string(),
    userImageUrl: v.optional(v.string()),
    role: v.union(v.literal("org:supervisor"), v.literal("org:agent")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", args.userId)
      )
      .first();
    if (existing) return existing._id;
    return ctx.db.insert("channelMembers", {
      tenantId: args.tenantId,
      channelId: args.channelId,
      userId: args.userId,
      userName: args.userName,
      userEmail: args.userEmail,
      userImageUrl: args.userImageUrl,
      role: args.role,
      addedBy: "system",
      createdAt: Date.now(),
    });
  },
});
