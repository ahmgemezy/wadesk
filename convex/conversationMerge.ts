import { v, ConvexError } from "convex/values";
import { mutation } from "./_generated/server";
import { getCallerIdentity, assertAdminOrSupervisor, type OrgRole } from "./lib/auth";

export const mergeConversations = mutation({
  args: {
    primaryConversationId: v.id("conversations"),
    secondaryConversationIds: v.array(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as OrgRole);

    const primary = await ctx.db.get(args.primaryConversationId);
    if (!primary || primary.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    const primaryContact = await ctx.db.get(primary.contactId);
    if (!primaryContact) {
      throw new ConvexError("PRIMARY_CONTACT_NOT_FOUND");
    }

    let messagesMerged = 0;
    const now = Date.now();

    for (const secondaryId of args.secondaryConversationIds) {
      const secondary = await ctx.db.get(secondaryId);
      if (!secondary || secondary.tenantId !== tenantId) continue;
      if (secondary._id === primary._id) continue;

      const secondaryContact = await ctx.db.get(secondary.contactId);
      if (!secondaryContact || secondaryContact._id === primaryContact._id) continue;

      const secondaryMessages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", secondaryId))
        .collect();

      for (const msg of secondaryMessages) {
        if (msg.isInternalNote) continue;
        await ctx.db.patch(msg._id, {
          conversationId: primary._id,
        });
        messagesMerged++;
      }

      await ctx.db.patch(secondaryId, {
        mergedInto: primary._id,
        status: "resolved",
        mergedAt: now,
      });
    }

    const mergedLabels = new Set(primary.labels ?? []);
    for (const secondaryId of args.secondaryConversationIds) {
      const secondary = await ctx.db.get(secondaryId);
      if (secondary?.labels) {
        secondary.labels.forEach((l) => mergedLabels.add(l));
      }
    }

    await ctx.db.patch(primary._id, {
      labels: Array.from(mergedLabels),
      lastMessageAt: now,
      lastMessagePreview: `[merged] ${messagesMerged} messages merged`,
      totalMergedCount: (primary.totalMergedCount ?? 0) + messagesMerged,
    });

    return { messagesMerged };
  },
});

export const isMergeable = mutation({
  args: {
    conversationIds: v.array(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);

    if (args.conversationIds.length < 2 || args.conversationIds.length > 5) {
      return { mergeable: false, reason: "INVALID_COUNT" };
    }

    const contacts = new Set<string>();
    for (const convId of args.conversationIds) {
      const conv = await ctx.db.get(convId);
      if (!conv || conv.tenantId !== tenantId) {
        return { mergeable: false, reason: "NOT_FOUND" };
      }
      contacts.add(conv.contactId);
    }

    if (contacts.size < 2) {
      return { mergeable: true, reason: null };
    }

    return { mergeable: false, reason: "DIFFERENT_CONTACTS" };
  },
});