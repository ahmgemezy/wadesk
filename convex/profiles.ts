import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getCallerIdentity } from "./lib/auth";

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    return await ctx.db
      .query("memberProfiles")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", callerId),
      )
      .first();
  },
});

export const updateMyProfile = mutation({
  args: {
    phone: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);

    const existing = await ctx.db
      .query("memberProfiles")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", callerId),
      )
      .first();

    const updateData: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.phone !== undefined) updateData.phone = args.phone || undefined;
    if (args.jobTitle !== undefined) updateData.jobTitle = args.jobTitle || undefined;
    if (args.bio !== undefined) updateData.bio = args.bio || undefined;

    if (existing) {
      await ctx.db.patch(existing._id, updateData);
    } else {
      await ctx.db.insert("memberProfiles", {
        tenantId,
        userId: callerId,
        phone: args.phone,
        jobTitle: args.jobTitle,
        bio: args.bio,
        updatedAt: Date.now(),
      });
    }
  },
});

export const generateAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getCallerIdentity(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getStorageUrlInternal = internalMutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const getStorageUrl = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await getCallerIdentity(ctx);
    return await ctx.storage.getUrl(args.storageId);
  },
});
