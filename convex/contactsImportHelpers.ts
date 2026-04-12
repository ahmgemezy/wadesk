import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getCountryFromPhone } from "../lib/phoneGeo";

export const importBatchChunk = internalMutation({
  args: {
    tenantId: v.string(),
    rows: v.array(
      v.object({
        phone: v.string(),
        name: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        notes: v.optional(v.string()),
      }),
    ),
    onDuplicate: v.union(v.literal("skip"), v.literal("overwrite")),
    startIndex: v.number(),
  },
  handler: async (ctx, args) => {
    let added = 0;
    let skipped = 0;
    const failedRows: { row: number; reason: string }[] = [];

    for (let i = 0; i < args.rows.length; i++) {
      const row = args.rows[i];
      const rowNumber = args.startIndex + i + 1;

      if (!row.phone || !/^\+?\d{7,15}$/.test(row.phone)) {
        failedRows.push({ row: rowNumber, reason: "Invalid phone format" });
        continue;
      }

      const existing = await ctx.db
        .query("contacts")
        .withIndex("by_tenant_phone", (q) =>
          q.eq("tenantId", args.tenantId).eq("phone", row.phone),
        )
        .first();

      if (existing) {
        if (args.onDuplicate === "skip") {
          skipped++;
          continue;
        }
        const patch: Record<string, unknown> = { lastSeenAt: Date.now() };
        if (row.name) {
          patch.displayName = row.name;
          patch.customName = row.name;
        }
        if (row.tags) patch.tags = row.tags;
        if (row.notes) patch.notes = row.notes;
        await ctx.db.patch(existing._id, patch);
        skipped++;
        continue;
      }

      const geoCountry = getCountryFromPhone(row.phone)?.countryIso ?? undefined;

      await ctx.db.insert("contacts", {
        tenantId: args.tenantId,
        phone: row.phone,
        displayName: row.name ?? row.phone,
        customName: row.name,
        tags: row.tags ?? [],
        notes: row.notes,
        country: geoCountry,
        source: "import",
        isArchived: false,
        firstSeenAt: Date.now(),
        lastSeenAt: Date.now(),
        createdAt: Date.now(),
      });
      added++;
    }

    return { added, skipped, failed: failedRows.length, failedRows };
  },
});

export const checkDuplicatePhones = internalQuery({
  args: {
    tenantId: v.string(),
    phones: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing: Record<string, Id<"contacts">> = {};
    for (const phone of args.phones) {
      const contact = await ctx.db
        .query("contacts")
        .withIndex("by_tenant_phone", (q) =>
          q.eq("tenantId", args.tenantId).eq("phone", phone),
        )
        .first();
      if (contact) {
        existing[phone] = contact._id;
      }
    }
    return existing;
  },
});
