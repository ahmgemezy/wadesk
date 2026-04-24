import { v, ConvexError } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import { getCallerIdentity, getCallerRole, assertAdmin } from "./lib/auth";
import type { Id } from "./_generated/dataModel";

export const listForDepartment = query({
  args: { departmentId: v.id("departments") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const dept = await ctx.db.get(args.departmentId);
    if (!dept || dept.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }
    const members = await ctx.db
      .query("departmentMembers")
      .withIndex("by_department", (q) => q.eq("departmentId", args.departmentId))
      .collect();
    const supervisors = members
      .filter((m) => m.role === "org:supervisor")
      .sort((a, b) => (a.userName ?? "").localeCompare(b.userName ?? ""));
    const agents = members
      .filter((m) => m.role === "org:agent")
      .sort((a, b) => (a.userName ?? "").localeCompare(b.userName ?? ""));
    return [...supervisors, ...agents];
  },
});

export const listForUser = query({
  args: {},
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    return ctx.db
      .query("departmentMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", callerId)
      )
      .collect();
  },
});

export const getChannelsForUser = internalQuery({
  args: { tenantId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("departmentMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", args.userId)
      )
      .collect();

    const deptIds = [...new Set(memberships.map((m) => m.departmentId))];
    const channelIds: Id<"channels">[] = [];
    for (const deptId of deptIds) {
      const dept = await ctx.db.get(deptId);
      if (dept?.channelId && !channelIds.includes(dept.channelId)) {
        channelIds.push(dept.channelId);
      }
    }
    return channelIds;
  },
});

export const isUserInDepartment = query({
  args: { departmentId: v.id("departments") },
  handler: async (ctx, args) => {
    const { callerId } = await getCallerIdentity(ctx);
    const membership = await ctx.db
      .query("departmentMembers")
      .withIndex("by_department_user", (q) =>
        q.eq("departmentId", args.departmentId).eq("userId", callerId)
      )
      .first();
    return membership !== null;
  },
});

export const addMember = mutation({
  args: {
    departmentId: v.id("departments"),
    userId: v.string(),
    userName: v.string(),
    userEmail: v.string(),
    userImageUrl: v.optional(v.string()),
    role: v.union(v.literal("org:supervisor"), v.literal("org:agent")),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    const dept = await ctx.db.get(args.departmentId);
    if (!dept || dept.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    if (orgRole !== "org:admin" && orgRole !== "admin") {
      if (args.role === "org:supervisor") {
        throw new ConvexError("FORBIDDEN");
      }
      const callerMembership = await ctx.db
        .query("departmentMembers")
        .withIndex("by_department_user", (q) =>
          q.eq("departmentId", args.departmentId).eq("userId", callerId)
        )
        .first();
      if (!callerMembership || callerMembership.role !== "org:supervisor") {
        throw new ConvexError("FORBIDDEN");
      }
    }

    const existing = await ctx.db
      .query("departmentMembers")
      .withIndex("by_department_user", (q) =>
        q.eq("departmentId", args.departmentId).eq("userId", args.userId)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        role: args.role,
        userName: args.userName,
        userEmail: args.userEmail,
        userImageUrl: args.userImageUrl,
      });
      return existing._id;
    }

    return ctx.db.insert("departmentMembers", {
      tenantId,
      departmentId: args.departmentId,
      userId: args.userId,
      userName: args.userName,
      userEmail: args.userEmail,
      userImageUrl: args.userImageUrl,
      role: args.role,
      addedBy: callerId,
      addedAt: Date.now(),
      createdAt: Date.now(),
    });
  },
});

export const removeMember = mutation({
  args: {
    departmentId: v.id("departments"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    const dept = await ctx.db.get(args.departmentId);
    if (!dept || dept.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    const membership = await ctx.db
      .query("departmentMembers")
      .withIndex("by_department_user", (q) =>
        q.eq("departmentId", args.departmentId).eq("userId", args.userId)
      )
      .first();
    if (!membership) return;

    if (orgRole !== "org:admin" && orgRole !== "admin") {
      if (membership.role === "org:supervisor") {
        throw new ConvexError("FORBIDDEN");
      }
      const callerMembership = await ctx.db
        .query("departmentMembers")
        .withIndex("by_department_user", (q) =>
          q.eq("departmentId", args.departmentId).eq("userId", callerId)
        )
        .first();
      if (!callerMembership || callerMembership.role !== "org:supervisor") {
        throw new ConvexError("FORBIDDEN");
      }
    }

    await ctx.db.delete(membership._id);
  },
});

export const getMembersForChannel = internalQuery({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const departments = await ctx.db
      .query("departments")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();

    const allMembers: Array<{
      userId: string;
      userName: string;
      role: string;
      departmentId: Id<"departments">;
    }> = [];

    for (const dept of departments) {
      if (dept.isArchived) continue;
      const members = await ctx.db
        .query("departmentMembers")
        .withIndex("by_department", (q) => q.eq("departmentId", dept._id))
        .collect();
      for (const m of members) {
        allMembers.push({
          userId: m.userId,
          userName: m.userName,
          role: m.role,
          departmentId: m.departmentId,
        });
      }
    }
    return allMembers;
  },
});
