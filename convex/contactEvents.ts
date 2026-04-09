import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { getCallerIdentity } from "./lib/auth";

// ── Internal: write a timeline event ─────────────────────────────────────────

export const internalCreate = internalMutation({
  args: {
    tenantId: v.string(),
    contactId: v.id("contacts"),
    type: v.union(
      v.literal("stage_changed"),
      v.literal("assigned"),
      v.literal("note_updated"),
      v.literal("tags_changed"),
      v.literal("followup_scheduled"),
      v.literal("followup_sent"),
      v.literal("followup_failed"),
      v.literal("conversation_started"),
      v.literal("conversation_resolved"),
      v.literal("lost"),
    ),
    actorId: v.optional(v.string()),
    metadata: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("contactEvents", {
      tenantId: args.tenantId,
      contactId: args.contactId,
      type: args.type,
      actorId: args.actorId,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});

// ── Public: get paginated timeline for a contact ──────────────────────────────

export const getTimeline = query({
  args: {
    contactId: v.id("contacts"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    // Verify contact belongs to tenant
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.tenantId !== tenantId) {
      return { page: [], isDone: true, continueCursor: "" };
    }
    return ctx.db
      .query("contactEvents")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
