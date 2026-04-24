import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const insert = internalMutation({
  args: {
    tenantId: v.optional(v.string()),
    wabaId: v.string(),
    eventType: v.string(),
    payload: v.any(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("webhook_events", {
      tenantId: args.tenantId,
      wabaId: args.wabaId,
      eventType: args.eventType,
      payload: args.payload,
      error: args.error,
      createdAt: Date.now(),
    });
  },
});
