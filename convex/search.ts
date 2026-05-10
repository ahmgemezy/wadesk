import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCallerIdentity, isAdminOrSupervisor } from "./lib/auth";
import type { Id } from "./_generated/dataModel";

type SearchResult = {
  type: "conversation" | "message";
  id: string;
  preview: string;
  contactName?: string;
  contactPhone?: string;
  timestamp: number;
};

export const globalSearch = query({
  args: {
    query: v.string(),
    type: v.optional(v.union(v.literal("all"), v.literal("conversations"), v.literal("messages"))),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);

    const searchType = args.type ?? "all";
    const queryText = args.query.trim();
    if (queryText.length < 2) return [];

    const results: SearchResult[] = [];

    if (searchType === "all" || searchType === "conversations") {
      const convos = await ctx.db
        .query("conversations")
        .withSearchIndex("search_preview", (q) =>
          q.search("lastMessagePreview", queryText).eq("tenantId", tenantId),
        )
        .take(20);

      for (const conv of convos) {
        if (!isAdminOrSupervisor(orgRole) && conv.assignedAgentId !== callerId && conv.assignedAgentId !== undefined) {
          continue;
        }
        const contact = await ctx.db.get(conv.contactId);
        results.push({
          type: "conversation",
          id: conv._id as string,
          preview: conv.lastMessagePreview,
          contactName: contact?.customName ?? contact?.displayName ?? "",
          contactPhone: contact?.phone ?? "",
          timestamp: conv.lastMessageAt,
        });
      }
    }

    if (searchType === "all" || searchType === "messages") {
      const messages = await ctx.db
        .query("messages")
        .withSearchIndex("search_content", (q) =>
          q.search("content", queryText).eq("tenantId", tenantId),
        )
        .take(30);

      for (const msg of messages) {
        if (msg.isInternalNote) continue;
        const conv = await ctx.db.get(msg.conversationId);
        if (!isAdminOrSupervisor(orgRole) && conv?.assignedAgentId !== callerId && conv?.assignedAgentId !== undefined) {
          continue;
        }
        results.push({
          type: "message",
          id: msg._id as string,
          preview: msg.content.slice(0, 100),
          timestamp: msg.timestamp,
        });
      }
    }

    return results.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
  },
});

export const searchContacts = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const queryText = args.query.trim();
    if (queryText.length < 2) return [];

    const contacts = await ctx.db
      .query("contacts")
      .withSearchIndex("search_by_name", (q) =>
        q.search("displayName", queryText).eq("tenantId", tenantId),
      )
      .take(20);

    return contacts.map((c) => ({
      id: c._id as string,
      name: c.customName ?? c.displayName,
      phone: c.phone,
      stage: c.stage,
    }));
  },
});