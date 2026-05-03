import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCallerIdentity } from "./lib/auth";

export const getContactInsights = query({
  args: {
    contactId: v.id("contacts"),
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    if (!tenantId) {
      throw new Error("Unauthorized");
    }

    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.tenantId !== tenantId) {
      return null;
    }

    return {
      healthScore: contact.healthScore ?? null,
      sentimentOverall: contact.sentimentOverall ?? null,
    };
  },
});

export const updateContactInsights = mutation({
  args: {
    contactId: v.id("contacts"),
    healthScore: v.optional(v.number()),
    sentimentOverall: v.optional(
      v.union(v.literal("positive"), v.literal("neutral"), v.literal("negative"))
    ),
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    if (!tenantId) {
      throw new Error("Unauthorized");
    }

    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.tenantId !== tenantId) {
      throw new Error("Contact not found");
    }

    const updates: Partial<typeof contact> = {};
    if (args.healthScore !== undefined) updates.healthScore = args.healthScore;
    if (args.sentimentOverall !== undefined) updates.sentimentOverall = args.sentimentOverall;

    await ctx.db.patch(args.contactId, updates);
  },
});
