import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const backfillDepartments = internalMutation({
  args: {},
  handler: async (ctx) => {
    const channels = await ctx.db.query("channels").collect();

    let created = 0;
    let skipped = 0;

    for (const channel of channels) {
      const existingDefault = await ctx.db
        .query("departments")
        .withIndex("by_channel_default", (q) =>
          q.eq("channelId", channel._id).eq("isDefault", true)
        )
        .first();

      if (existingDefault) {
        skipped++;
        continue;
      }

      const existingDepts = await ctx.db
        .query("departments")
        .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
        .collect();

      if (existingDepts.length > 0) {
        const first = existingDepts[0];
        if (!first.isDefault) {
          await ctx.db.patch(first._id, { isDefault: true });
        }
        skipped++;
        continue;
      }

      await ctx.db.insert("departments", {
        tenantId: channel.tenantId,
        channelId: channel._id,
        name: "General",
        isDefault: true,
        isArchived: false,
        createdBy: "migration",
        createdAt: Date.now(),
      });
      created++;
    }

    return { created, skipped, total: channels.length };
  },
});

export const migrateChannelMembersToDepartments = internalMutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const batch = args.batchSize ?? 100;
    const channelMembers = await ctx.db
      .query("channelMembers")
      .take(batch);

    let migrated = 0;
    let skipped = 0;

    for (const cm of channelMembers) {
      const defaultDept = await ctx.db
        .query("departments")
        .withIndex("by_channel_default", (q) =>
          q.eq("channelId", cm.channelId).eq("isDefault", true)
        )
        .first();

      if (!defaultDept) {
        skipped++;
        continue;
      }

      const existing = await ctx.db
        .query("departmentMembers")
        .withIndex("by_department_user", (q) =>
          q.eq("departmentId", defaultDept._id).eq("userId", cm.userId)
        )
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("departmentMembers", {
        tenantId: cm.tenantId,
        departmentId: defaultDept._id,
        userId: cm.userId,
        userName: cm.userName,
        userEmail: cm.userEmail,
        userImageUrl: cm.userImageUrl,
        role: cm.role,
        addedBy: cm.addedBy,
        addedAt: cm.createdAt,
        createdAt: cm.createdAt,
      });
      migrated++;
    }

    return { migrated, skipped, processed: channelMembers.length };
  },
});

export const backfillConversationDepartments = internalMutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const batch = args.batchSize ?? 100;
    const conversations = await ctx.db
      .query("conversations")
      .filter((q) => q.eq(q.field("departmentId"), undefined))
      .take(batch);

    let updated = 0;
    let skipped = 0;

    for (const conv of conversations) {
      const defaultDept = await ctx.db
        .query("departments")
        .withIndex("by_channel_default", (q) =>
          q.eq("channelId", conv.channelId).eq("isDefault", true)
        )
        .first();

      if (!defaultDept) {
        skipped++;
        continue;
      }

      await ctx.db.patch(conv._id, {
        departmentId: defaultDept._id,
        departmentAssignedAt: conv.createdAt,
      });
      updated++;
    }

    return { updated, skipped, processed: conversations.length };
  },
});
