import { v, ConvexError } from "convex/values";
import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getCallerRole, assertAdminOrSupervisor, type OrgRole } from "./lib/auth";

export const listAllContactsForExport = internalQuery({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contacts")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

export const listCustomFieldsForContact = internalQuery({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customFields")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .collect();
  },
});

export const listAllConversationsForExport = internalQuery({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

export const listMessagesForConversation = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();
  },
});

export const getContactForExport = internalQuery({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.contactId);
  },
});

export const getChannelForExport = internalQuery({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    return channel ? { name: channel.displayName, phone: channel.displayPhone ?? channel.phoneNumberId } : null;
  },
});

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export const generateContactsExport = action({
  args: {},
  handler: async (ctx) => {
    const role = await getCallerRole(ctx);
    assertAdminOrSupervisor(role as OrgRole);

    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.orgId) throw new ConvexError("NO_ORG");
    const tenantId = identity.orgId as string;

    const contacts: Array<Record<string, unknown>> = await ctx.runQuery(
      internal.export.listAllContactsForExport,
      { tenantId },
    );

    const header = "phone,name,tags,stage,notes,customFields,firstSeen,lastSeen,source";
    const rows = await Promise.all(
      contacts.map(async (contact) => {
        const customFields: Array<{ key: string; value: string }> = await ctx.runQuery(
          internal.export.listCustomFieldsForContact,
          { contactId: contact._id as Id<"contacts"> },
        );

        const cfJson = JSON.stringify(
          Object.fromEntries(customFields.map((f) => [f.key, f.value])),
        );

        return [
          escapeCsvField(contact.phone as string),
          escapeCsvField((contact.customName as string) || (contact.displayName as string) || ""),
          escapeCsvField((contact.tags as string[]).join(";")),
          escapeCsvField((contact.stage as string) || ""),
          escapeCsvField((contact.notes as string) || ""),
          escapeCsvField(cfJson),
          escapeCsvField(new Date(contact.firstSeenAt as number).toISOString()),
          escapeCsvField(new Date(contact.lastSeenAt as number).toISOString()),
          escapeCsvField(contact.source as string),
        ].join(",");
      }),
    );

    const csv = [header, ...rows].join("\n");
    const storageId = await ctx.storage.store(
      new Blob([csv], { type: "text/csv" }),
    );
    const url = await ctx.storage.getUrl(storageId);
    return url;
  },
});

export const generateConversationsExport = action({
  args: {},
  handler: async (ctx) => {
    const role = await getCallerRole(ctx);
    assertAdminOrSupervisor(role as OrgRole);

    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.orgId) throw new ConvexError("NO_ORG");
    const tenantId = identity.orgId as string;

    const conversations: Array<Record<string, unknown>> = await ctx.runQuery(
      internal.export.listAllConversationsForExport,
      { tenantId },
    );

    const exportData = await Promise.all(
      conversations.map(async (conv) => {
        const [messages, contact, channel] = await Promise.all([
          ctx.runQuery(internal.export.listMessagesForConversation, {
            conversationId: conv._id as Id<"conversations">,
          }) as Promise<Array<Record<string, unknown>>>,
          ctx.runQuery(internal.export.getContactForExport, {
            contactId: conv.contactId as Id<"contacts">,
          }) as Promise<Record<string, unknown> | null>,
          ctx.runQuery(internal.export.getChannelForExport, {
            channelId: conv.channelId as Id<"channels">,
          }) as Promise<{ name: string; phone: string } | null>,
        ]);

        return {
          id: conv._id,
          contact: contact
            ? {
                phone: contact.phone as string,
                name: (contact.customName as string) || (contact.displayName as string) || "",
              }
            : null,
          channel: channel ?? null,
          status: conv.status,
          labels: conv.labels,
          assignedAgentId: conv.assignedAgentId ?? null,
          createdAt: new Date(conv.createdAt as number).toISOString(),
          resolvedAt: conv.status === "resolved" && conv.lastMessageAt
            ? new Date(conv.lastMessageAt as number).toISOString()
            : null,
          messages: messages.map((m) => ({
            from: m.direction === "inbound" ? "customer" : "agent",
            type: m.contentType,
            content: m.content,
            sentAt: new Date(m.timestamp as number).toISOString(),
            isInternal: m.isInternalNote ?? false,
          })),
        };
      }),
    );

    const json = JSON.stringify(exportData, null, 2);
    const storageId = await ctx.storage.store(
      new Blob([json], { type: "application/json" }),
    );
    const url = await ctx.storage.getUrl(storageId);
    return url;
  },
});
