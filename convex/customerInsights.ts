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

export const listJourneys = query({
  args: {
    contactId: v.id("contacts"),
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    if (!tenantId) {
      throw new Error("Unauthorized");
    }

    // Fetch journeys sorted by timestamp
    const journeys = await ctx.db
      .query("customerJourneys")
      .withIndex("by_contact_timestamp", (q) => q.eq("contactId", args.contactId))
      .order("desc")
      .take(100); // Limit to 100 for now

    return journeys;
  },
});

export const logJourneyEvent = mutation({
  args: {
    contactId: v.id("contacts"),
    eventType: v.string(),
    description: v.string(),
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

    await ctx.db.insert("customerJourneys", {
      tenantId,
      contactId: args.contactId,
      eventType: args.eventType,
      description: args.description,
      timestamp: Date.now(),
    });
  },
});
