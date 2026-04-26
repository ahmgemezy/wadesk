import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

export const listDisconnectedChannels = internalQuery({
  args: {},
  handler: async (ctx) => {
    const disconnected = await ctx.db
      .query("channels")
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "disconnected"),
          q.eq(q.field("status"), "reconnect_required")
        )
      )
      .collect();
    // Filter to only channels with disconnectedAt set (required by retention logic)
    return disconnected.filter(
      (c): c is typeof c & { disconnectedAt: number } =>
        c.disconnectedAt !== undefined
    );
  },
});

export const purgeChannel = internalMutation({
  args: {
    channelId: v.id("channels"),
    tenantId: v.string(),
    collectedContactIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const contactIds = new Set<string>(args.collectedContactIds ?? []);

    // 1. Channel members
    const channelMembers = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();
    for (const cm of channelMembers) {
      await ctx.db.delete(cm._id);
    }

    // 2. Departments + members
    const departments = await ctx.db
      .query("departments")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();
    for (const dept of departments) {
      const deptMembers = await ctx.db
        .query("departmentMembers")
        .withIndex("by_department", (q) => q.eq("departmentId", dept._id))
        .collect();
      for (const dm of deptMembers) {
        await ctx.db.delete(dm._id);
      }
      await ctx.db.delete(dept._id);
    }

    // 3. Conversations (batched 50)
    const BATCH = 50;
    const convs = await ctx.db
      .query("conversations")
      .withIndex("by_tenant_channel", (q) =>
        q.eq("tenantId", args.tenantId).eq("channelId", args.channelId)
      )
      .take(BATCH);

    for (const conv of convs) {
      contactIds.add(conv.contactId);

      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .collect();
      for (const msg of messages) {
        await ctx.db.delete(msg._id);
      }

      const metrics = await ctx.db
        .query("conversationMetrics")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .first();
      if (metrics) await ctx.db.delete(metrics._id);

      const fireLogs = await ctx.db
        .query("ruleFireLog")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .collect();
      for (const log of fireLogs) {
        await ctx.db.delete(log._id);
      }

      await ctx.db.delete(conv._id);
    }

    if (convs.length === BATCH) {
      await ctx.scheduler.runAfter(0, internal.channelRetention.purgeChannel, {
        channelId: args.channelId,
        tenantId: args.tenantId,
        collectedContactIds: Array.from(contactIds),
      });
      return;
    }

    // 4. Orphaned contacts
    for (const contactIdStr of contactIds) {
      const contactDocs = await ctx.db
        .query("conversations")
        .withIndex("by_contact", (q) => q.eq("contactId", contactIdStr as any))
        .collect();
      if (contactDocs.length === 0) {
        await ctx.db.delete(contactIdStr as any);
      }
    }

    // 5. Delete channel itself
    await ctx.db.delete(args.channelId);
  },
});

export const markWarningSent = internalMutation({
  args: { channelId: v.id("channels"), day: v.number() },
  handler: async (ctx, args) => {
    const ch = await ctx.db.get(args.channelId);
    if (!ch) return;
    const existing = ch.deactivationWarningsSent ?? [];
    if (existing.includes(args.day)) return;
    await ctx.db.patch(args.channelId, {
      deactivationWarningsSent: [...existing, args.day],
    });
  },
});
