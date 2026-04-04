import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import { getCallerIdentity } from "./lib/auth";

export const listForTenant = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId } = await getCallerIdentity(ctx);
    return ctx.db
      .query("contacts")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
  },
});

export const upsertByPhone = internalMutation({
  args: {
    tenantId: v.string(),
    phone: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_tenant_phone", (q) =>
        q.eq("tenantId", args.tenantId).eq("phone", args.phone),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastSeenAt: Date.now(),
        displayName: args.displayName ?? existing.displayName,
      });
      return existing._id;
    }

    return ctx.db.insert("contacts", {
      tenantId: args.tenantId,
      phone: args.phone,
      displayName: args.displayName ?? args.phone,
      tags: [],
      source: "auto",
      firstSeenAt: Date.now(),
      lastSeenAt: Date.now(),
      createdAt: Date.now(),
    });
  },
});
