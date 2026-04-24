import { v, ConvexError } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { getCallerIdentity, assertAdmin, getCallerRole, type OrgRole } from "./lib/auth";
import type { Id } from "./_generated/dataModel";

export const listForChannel = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }
    const all = await ctx.db
      .query("departments")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();
    return all.filter((d) => !d.isArchived);
  },
});

export const listForTransfer = query({
  args: { channelId: v.id("channels"), excludeDepartmentId: v.optional(v.id("departments")) },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const channel = await ctx.db.get(args.channelId);
    // Defensive: if channel doesn't exist or belongs to wrong tenant, return empty array
    // This handles orphaned conversations with invalid channelIds gracefully
    if (!channel || channel.tenantId !== tenantId) {
      return [];
    }
    const all = await ctx.db
      .query("departments")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();
    return all
      .filter((d) => !d.isArchived && d._id !== args.excludeDepartmentId)
      .map((d) => ({ _id: d._id, name: d.name, isDefault: d.isDefault ?? false }));
  },
});

export const get = query({
  args: { departmentId: v.id("departments") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const dept = await ctx.db.get(args.departmentId);
    if (!dept || dept.tenantId !== tenantId) return null;
    return dept;
  },
});

export const create = mutation({
  args: {
    channelId: v.id("channels"),
    name: v.string(),
    description: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);

    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    if (args.isDefault) {
      const existingDefault = await ctx.db
        .query("departments")
        .withIndex("by_channel_default", (q) =>
          q.eq("channelId", args.channelId).eq("isDefault", true)
        )
        .first();
      if (existingDefault) {
        await ctx.db.patch(existingDefault._id, { isDefault: false });
      }
    }

    return ctx.db.insert("departments", {
      tenantId,
      channelId: args.channelId,
      name: args.name,
      description: args.description,
      isDefault: args.isDefault ?? false,
      color: args.color,
      createdBy: callerId,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    departmentId: v.id("departments"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);

    const dept = await ctx.db.get(args.departmentId);
    if (!dept || dept.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.color !== undefined) updates.color = args.color;

    await ctx.db.patch(args.departmentId, updates);
  },
});

export const setDefault = mutation({
  args: { departmentId: v.id("departments") },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);

    const dept = await ctx.db.get(args.departmentId);
    if (!dept || dept.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }
    if (!dept.channelId) {
      throw new ConvexError("DEPARTMENT_HAS_NO_CHANNEL");
    }

    const existingDefault = await ctx.db
      .query("departments")
      .withIndex("by_channel_default", (q) =>
        q.eq("channelId", dept.channelId!).eq("isDefault", true)
      )
      .first();
    if (existingDefault) {
      await ctx.db.patch(existingDefault._id, { isDefault: false });
    }

    await ctx.db.patch(args.departmentId, { isDefault: true });
  },
});

export const archive = mutation({
  args: { departmentId: v.id("departments") },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);

    const dept = await ctx.db.get(args.departmentId);
    if (!dept || dept.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }
    if (dept.isDefault) {
      throw new ConvexError("CANNOT_ARCHIVE_DEFAULT");
    }

    await ctx.db.patch(args.departmentId, { isArchived: true, updatedAt: Date.now() });
  },
});

export const unarchive = mutation({
  args: { departmentId: v.id("departments") },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);

    const dept = await ctx.db.get(args.departmentId);
    if (!dept || dept.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    await ctx.db.patch(args.departmentId, { isArchived: false, updatedAt: Date.now() });
  },
});

export const getDefaultForChannel = internalQuery({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("departments")
      .withIndex("by_channel_default", (q) =>
        q.eq("channelId", args.channelId).eq("isDefault", true)
      )
      .first();
  },
});

export const createDefaultDepartment = internalMutation({
  args: {
    tenantId: v.string(),
    channelId: v.id("channels"),
    name: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("departments")
      .withIndex("by_channel_default", (q) =>
        q.eq("channelId", args.channelId).eq("isDefault", true)
      )
      .first();
    if (existing) return existing._id;

    return ctx.db.insert("departments", {
      tenantId: args.tenantId,
      channelId: args.channelId,
      name: args.name,
      isDefault: true,
      isArchived: false,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });
  },
});
