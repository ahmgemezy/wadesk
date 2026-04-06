import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCallerIdentity } from "./lib/auth";

export const list = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.tenantId !== tenantId) {
      return [];
    }
    return ctx.db
      .query("customFields")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .collect();
  },
});

export const upsert = mutation({
  args: {
    contactId: v.id("contacts"),
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.tenantId !== tenantId) {
      throw new Error("Contact not found");
    }

    const existing = await ctx.db
      .query("customFields")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .collect();

    const match = existing.find((f) => f.key === args.key);
    if (match) {
      await ctx.db.patch(match._id, { value: args.value });
      return match._id;
    }

    return ctx.db.insert("customFields", {
      tenantId,
      contactId: args.contactId,
      key: args.key,
      value: args.value,
      createdAt: Date.now(),
    });
  },
});

export const delete_ = mutation({
  args: { customFieldId: v.id("customFields") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const field = await ctx.db.get(args.customFieldId);
    if (!field) {
      throw new Error("Custom field not found");
    }
    const contact = await ctx.db.get(field.contactId);
    if (!contact || contact.tenantId !== tenantId) {
      throw new Error("Contact not found");
    }
    await ctx.db.delete(args.customFieldId);
  },
});
