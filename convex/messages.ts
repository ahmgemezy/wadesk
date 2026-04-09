import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getCallerIdentity } from "./lib/auth";

export const listForConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) return [];

    const isAdminOrSupervisor =
      orgRole === "org:admin" || orgRole === "admin" || orgRole === "org:supervisor";
    if (
      !isAdminOrSupervisor &&
      conversation.assignedAgentId !== callerId &&
      conversation.assignedAgentId !== undefined
    ) {
      return [];
    }

    return ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .collect();
  },
});

export const sendReply = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) {
      throw new Error("NOT_FOUND");
    }

    const isAdminOrSupervisor =
      orgRole === "org:admin" || orgRole === "admin" || orgRole === "org:supervisor";
    if (
      !isAdminOrSupervisor &&
      conversation.assignedAgentId !== callerId &&
      conversation.assignedAgentId !== undefined
    ) {
      throw new Error("FORBIDDEN");
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      tenantId,
      direction: "outbound",
      content: args.content,
      contentType: "text",
      isInternalNote: false,
      authorId: callerId,
      status: "sent",
      timestamp: Date.now(),
      createdAt: Date.now(),
    });

    const channel = await ctx.db.get(conversation.channelId);
    if (!channel) throw new Error("CHANNEL_NOT_FOUND");

    const contact = await ctx.db.get(conversation.contactId);
    if (!contact) throw new Error("CONTACT_NOT_FOUND");

    let assignedAgentId = conversation.assignedAgentId;
    if (
      !assignedAgentId &&
      channel.assignmentMode === "first_reply"
    ) {
      assignedAgentId = callerId;
    }

    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
      lastMessagePreview: args.content.slice(0, 100),
      assignedAgentId,
    });

    await ctx.scheduler.runAfter(0, internal.actions.sendWhatsAppMessage.sendMessage, {
      messageId,
      phoneNumberId: channel.phoneNumberId,
      contactPhone: contact.phone,
      content: args.content,
      tenantId,
    });

    return messageId;
  },
});

export const addInternalNote = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) {
      throw new Error("NOT_FOUND");
    }

    const isAdminOrSupervisor =
      orgRole === "org:admin" || orgRole === "admin" || orgRole === "org:supervisor";
    if (
      !isAdminOrSupervisor &&
      conversation.assignedAgentId !== callerId &&
      conversation.assignedAgentId !== undefined
    ) {
      throw new Error("FORBIDDEN");
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      tenantId,
      direction: "outbound",
      content: args.content,
      contentType: "text",
      isInternalNote: true,
      authorId: callerId,
      status: "sent",
      timestamp: Date.now(),
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
    });

    return messageId;
  },
});

export const createInbound = internalMutation({
  args: {
    tenantId: v.string(),
    channelId: v.id("channels"),
    metaMessageId: v.string(),
    senderPhone: v.string(),
    wabaId: v.optional(v.string()),
    content: v.string(),
    contentType: v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("audio"),
      v.literal("document"),
      v.literal("video"),
      v.literal("sticker"),
      v.literal("location"),
      v.literal("unsupported"),
    ),
    mediaUrl: v.optional(v.string()),
    timestamp: v.number(),
    senderDisplayName: v.optional(v.string()),
    assignedAgentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("messages")
      .withIndex("by_meta_message_id", (q) => q.eq("metaMessageId", args.metaMessageId))
      .first();
    if (existing) return { messageId: existing._id, conversationId: existing.conversationId, isNewConversation: false, isDuplicate: true };

    const contactId: Id<"contacts"> = await ctx.runMutation(internal.contacts.upsertByPhone, {
      tenantId: args.tenantId,
      phone: args.senderPhone,
      displayName: args.senderDisplayName,
      wabaId: args.wabaId,
      incrementConversations: true,
    });

    let conversation = await ctx.db
      .query("conversations")
      .withIndex("by_tenant_channel", (q) =>
        q.eq("tenantId", args.tenantId).eq("channelId", args.channelId),
      )
      .filter((q) => q.eq(q.field("contactId"), contactId))
      .first();

    let isNewConversation = false;

    if (!conversation) {
      const conversationId = await ctx.db.insert("conversations", {
        tenantId: args.tenantId,
        channelId: args.channelId,
        contactId,
        status: "open",
        labels: [],
        lastMessageAt: args.timestamp,
        lastMessagePreview: args.content.slice(0, 100),
        unreadCount: 1,
        createdAt: args.timestamp,
        ...(args.assignedAgentId ? { assignedAgentId: args.assignedAgentId } : {}),
      });
      conversation = await ctx.db.get(conversationId);
      isNewConversation = true;
    } else {
      const patch: Record<string, unknown> = {
        lastMessageAt: args.timestamp,
        lastMessagePreview: args.content.slice(0, 100),
        unreadCount: (conversation.unreadCount ?? 0) + 1,
      };
      if (conversation.status === "resolved") {
        patch.status = "open";
      }
      await ctx.db.patch(conversation._id, patch);
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: conversation!._id,
      tenantId: args.tenantId,
      direction: "inbound",
      content: args.content,
      contentType: args.contentType,
      isInternalNote: false,
      authorId: args.senderPhone,
      metaMessageId: args.metaMessageId,
      ...(args.mediaUrl ? { mediaUrl: args.mediaUrl } : {}),
      status: "sent",
      timestamp: args.timestamp,
      createdAt: Date.now(),
    });

    // ── Customer Journey: fire conversation_started event on new convos ──────
    if (isNewConversation) {
      await ctx.runMutation(internal.contactEvents.internalCreate, {
        tenantId: args.tenantId,
        contactId,
        type: "conversation_started",
        actorId: undefined,
        metadata: { conversationId: conversation!._id },
      });
    }

    return { messageId, conversationId: conversation!._id, isNewConversation, isDuplicate: false };
  },
});

export const clearUnread = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) return;
    await ctx.db.patch(args.conversationId, { unreadCount: 0 });
  },
});

export const updateStatus = internalMutation({
  args: {
    messageId: v.id("messages"),
    status: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("read"),
      v.literal("failed"),
    ),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message || message.tenantId !== args.tenantId) return;
    await ctx.db.patch(args.messageId, { status: args.status });
  },
});

export const updateStatusByMetaId = internalMutation({
  args: {
    metaMessageId: v.string(),
    status: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("read"),
      v.literal("failed"),
    ),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db
      .query("messages")
      .withIndex("by_meta_message_id", (q) => q.eq("metaMessageId", args.metaMessageId))
      .first();
    if (!message || message.tenantId !== args.tenantId) return;
    await ctx.db.patch(message._id, { status: args.status });
  },
});
