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

// Normalizes phone numbers without "+" prefix and merges duplicate contacts.
// Run via Convex dashboard: migrations:normalizeContactPhones
// Call repeatedly until result.processed === 0.
export const normalizeContactPhones = internalMutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const batch = args.batchSize ?? 50;

    // Find contacts whose phone doesn't start with "+"
    const contacts = await ctx.db
      .query("contacts")
      .filter((q) => q.not(q.eq(q.field("phone").toString().slice(0, 1), "+")))
      .take(batch * 4); // over-fetch since filter is post-index

    const withoutPlus = contacts.filter((c) => !c.phone.startsWith("+")).slice(0, batch);

    let normalized = 0;
    let merged = 0;

    for (const contact of withoutPlus) {
      const normalizedPhone = `+${contact.phone}`;

      // Check if a canonical contact already exists with the "+" prefix
      const canonical = await ctx.db
        .query("contacts")
        .withIndex("by_tenant_phone", (q) =>
          q.eq("tenantId", contact.tenantId).eq("phone", normalizedPhone)
        )
        .first();

      if (canonical) {
        // Merge: re-point all references to the canonical contact, then delete the duplicate
        const oldId = contact._id;
        const newId = canonical._id;

        // conversations
        const convs = await ctx.db
          .query("conversations")
          .withIndex("by_contact", (q) => q.eq("contactId", oldId))
          .collect();
        for (const c of convs) await ctx.db.patch(c._id, { contactId: newId });

        // customFields
        const fields = await ctx.db
          .query("customFields")
          .withIndex("by_contact", (q) => q.eq("contactId", oldId))
          .collect();
        for (const f of fields) await ctx.db.patch(f._id, { contactId: newId });

        // followUps
        const fups = await ctx.db
          .query("followUps")
          .withIndex("by_contact", (q) => q.eq("contactId", oldId))
          .collect();
        for (const f of fups) await ctx.db.patch(f._id, { contactId: newId });

        // contactEvents
        const events = await ctx.db
          .query("contactEvents")
          .withIndex("by_contact", (q) => q.eq("contactId", oldId))
          .collect();
        for (const e of events) await ctx.db.patch(e._id, { contactId: newId });

        await ctx.db.delete(oldId);
        merged++;
      } else {
        // No duplicate — just fix the phone field in place
        await ctx.db.patch(contact._id, { phone: normalizedPhone });
        normalized++;
      }
    }

    return { processed: withoutPlus.length, normalized, merged };
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
