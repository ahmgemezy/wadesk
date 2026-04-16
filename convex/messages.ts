import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery, action } from "./_generated/server";
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
      ...(conversation.slaBreachedAt !== undefined ? { slaBreachedAt: undefined } : {}),
    });

    await ctx.scheduler.runAfter(0, internal.actions.sendWhatsAppMessage.sendMessage, {
      messageId,
      phoneNumberId: channel.phoneNumberId,
      contactPhone: contact.phone,
      content: args.content,
      tenantId,
    });

    await ctx.scheduler.runAfter(0, internal.conversationMetrics.recordFirstResponse, {
      conversationId: args.conversationId,
      firstResponseAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.conversationMetrics.incrementMessageCount, {
      conversationId: args.conversationId,
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

    await ctx.scheduler.runAfter(0, internal.conversationMetrics.incrementMessageCount, {
      conversationId: args.conversationId,
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
        lastInboundAt: args.timestamp,
        ...(args.assignedAgentId ? { assignedAgentId: args.assignedAgentId } : {}),
      });
      conversation = await ctx.db.get(conversationId);
      isNewConversation = true;
      const contact = await ctx.db.get(contactId);
      await ctx.db.patch(contactId, {
        totalConversations: (contact?.totalConversations ?? 0) + 1,
      });
    } else {
      const patch: Record<string, unknown> = {
        lastMessageAt: args.timestamp,
        lastMessagePreview: args.content.slice(0, 100),
        unreadCount: (conversation.unreadCount ?? 0) + 1,
        lastInboundAt: args.timestamp,
      };
      if (conversation.status === "resolved") {
        patch.status = "open";
        patch.slaBreachedAt = undefined;
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

      await ctx.scheduler.runAfter(0, internal.conversationMetrics.create, {
        tenantId: args.tenantId,
        conversationId: conversation!._id,
        channelId: args.channelId,
        createdAt: args.timestamp,
        initialMessageCount: 1,
      });
    } else {
      await ctx.scheduler.runAfter(0, internal.conversationMetrics.incrementMessageCount, {
        conversationId: conversation!._id,
      });
    }

    return { messageId, conversationId: conversation!._id, isNewConversation, isDuplicate: false };
  },
});

export const sendLocationReply = mutation({
  args: {
    conversationId: v.id("conversations"),
    latitude: v.number(),
    longitude: v.number(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) throw new Error("NOT_FOUND");

    const isAdminOrSupervisor = orgRole === "org:admin" || orgRole === "admin" || orgRole === "org:supervisor";
    if (!isAdminOrSupervisor && conversation.assignedAgentId !== callerId && conversation.assignedAgentId !== undefined) {
      throw new Error("FORBIDDEN");
    }

    const now = Date.now();
    const coordStr = `${args.latitude},${args.longitude}`;
    const content = args.name ? `${coordStr}|${args.name}` : coordStr;

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      tenantId,
      direction: "outbound",
      content,
      contentType: "location",
      isInternalNote: false,
      authorId: callerId,
      status: "sending",
      timestamp: now,
      createdAt: now,
    });

    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
      lastMessagePreview: `📍 ${args.name ?? "Location"}`,
    });

    const channel = await ctx.db.get(conversation.channelId);
    const contact = await ctx.db.get(conversation.contactId);
    if (channel && contact) {
      await ctx.scheduler.runAfter(0, internal.actions.sendWhatsAppMessage.sendLocation, {
        messageId,
        phoneNumberId: channel.phoneNumberId,
        contactPhone: contact.phone,
        latitude: args.latitude,
        longitude: args.longitude,
        name: args.name,
        tenantId,
      });
    }

    return messageId;
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getCallerIdentity(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const sendMediaReply = action({
  args: {
    conversationId: v.id("conversations"),
    storageId: v.id("_storage"),
    contentType: v.union(
      v.literal("image"),
      v.literal("document"),
      v.literal("audio"),
      v.literal("video"),
    ),
    filename: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.orgId) throw new Error("UNAUTHORIZED");
    const tenantId = identity.orgId as string;
    const callerId = identity.subject;
    const orgRole = (identity.orgRole as string | undefined) ?? "org:agent";

    const conversation = await ctx.runQuery(internal.messages.getConversationInternal, {
      conversationId: args.conversationId,
      tenantId,
    });
    if (!conversation) throw new Error("NOT_FOUND");

    const isAdminOrSupervisor = orgRole === "org:admin" || orgRole === "admin" || orgRole === "org:supervisor";
    if (!isAdminOrSupervisor && conversation.assignedAgentId !== callerId && conversation.assignedAgentId !== undefined) {
      throw new Error("FORBIDDEN");
    }

    const mediaUrl = await ctx.storage.getUrl(args.storageId);
    if (!mediaUrl) throw new Error("STORAGE_URL_FAILED");

    const now = Date.now();
    const messageId: Id<"messages"> = await ctx.runMutation(internal.messages.insertMediaMessage, {
      conversationId: args.conversationId,
      tenantId,
      authorId: callerId,
      contentType: args.contentType,
      mediaUrl,
      filename: args.filename,
      now,
    });

    const channel = await ctx.runQuery(internal.messages.getChannelInternal, {
      channelId: conversation.channelId,
      tenantId,
    });
    const contact = await ctx.runQuery(internal.messages.getContactInternal, {
      contactId: conversation.contactId,
      tenantId,
    });

    if (channel && contact) {
      await ctx.scheduler.runAfter(0, internal.actions.sendWhatsAppMessage.sendMediaMessage, {
        messageId,
        phoneNumberId: channel.phoneNumberId,
        contactPhone: contact.phone,
        mediaUrl,
        contentType: args.contentType,
        filename: args.filename,
        tenantId,
      });
    }

    return messageId;
  },
});

export const getConversationInternal = internalQuery({
  args: { conversationId: v.id("conversations"), tenantId: v.string() },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.tenantId !== args.tenantId) return null;
    return conv;
  },
});

export const getChannelInternal = internalQuery({
  args: { channelId: v.id("channels"), tenantId: v.string() },
  handler: async (ctx, args) => {
    const ch = await ctx.db.get(args.channelId);
    if (!ch || ch.tenantId !== args.tenantId) return null;
    return ch;
  },
});

export const getContactInternal = internalQuery({
  args: { contactId: v.id("contacts"), tenantId: v.string() },
  handler: async (ctx, args) => {
    const c = await ctx.db.get(args.contactId);
    if (!c || c.tenantId !== args.tenantId) return null;
    return c;
  },
});

export const insertMediaMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    tenantId: v.string(),
    authorId: v.string(),
    contentType: v.union(v.literal("image"), v.literal("document"), v.literal("audio"), v.literal("video")),
    mediaUrl: v.string(),
    filename: v.optional(v.string()),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const preview = args.contentType === "image" ? "📷 Photo" : args.contentType === "document" ? `📄 ${args.filename ?? "Document"}` : args.contentType === "audio" ? "🎵 Audio" : "🎥 Video";
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      tenantId: args.tenantId,
      direction: "outbound",
      content: args.filename ?? preview,
      contentType: args.contentType,
      isInternalNote: false,
      authorId: args.authorId,
      mediaUrl: args.mediaUrl,
      status: "sending",
      timestamp: args.now,
      createdAt: args.now,
    });
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: args.now,
      lastMessagePreview: preview,
    });
    return messageId;
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
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message || message.tenantId !== args.tenantId) return;
    await ctx.db.patch(args.messageId, {
      status: args.status,
      ...(args.failureReason !== undefined ? { failureReason: args.failureReason } : {}),
    });
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

export const setMetaMessageId = internalMutation({
  args: {
    messageId: v.id("messages"),
    metaMessageId: v.string(),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (!msg || msg.tenantId !== args.tenantId) return;
    await ctx.db.patch(args.messageId, { metaMessageId: args.metaMessageId });
  },
});

export const markDeletedInDb = internalMutation({
  args: {
    messageId: v.id("messages"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (!msg || msg.tenantId !== args.tenantId) return;
    await ctx.db.patch(args.messageId, { deletedAt: Date.now() });
  },
});

export const sendQuotedReply = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    quotedMessageId: v.id("messages"),
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

    const quotedMsg = await ctx.db.get(args.quotedMessageId);
    if (!quotedMsg || quotedMsg.conversationId !== args.conversationId) {
      throw new Error("QUOTED_MESSAGE_NOT_FOUND");
    }

    if (!quotedMsg.metaMessageId) {
      throw new Error("QUOTED_MESSAGE_HAS_NO_META_ID");
    }

    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      tenantId,
      direction: "outbound",
      content: args.content,
      contentType: "text",
      isInternalNote: false,
      authorId: callerId,
      status: "sending",
      timestamp: now,
      createdAt: now,
      quotedMessageId: args.quotedMessageId,
    });

    const channel = await ctx.db.get(conversation.channelId);
    const contact = await ctx.db.get(conversation.contactId);
    if (!channel || !contact) throw new Error("CHANNEL_OR_CONTACT_NOT_FOUND");

    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
      lastMessagePreview: args.content.slice(0, 100),
    });

    await ctx.scheduler.runAfter(
      0,
      internal.actions.sendWhatsAppMessage.sendQuotedMessage,
      {
        messageId,
        phoneNumberId: channel.phoneNumberId,
        contactPhone: contact.phone,
        content: args.content,
        quotedMetaMessageId: quotedMsg.metaMessageId,
        tenantId,
      },
    );

    return messageId;
  },
});

export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);

    const msg = await ctx.db.get(args.messageId);
    if (!msg || msg.tenantId !== tenantId) throw new Error("NOT_FOUND");

    const isAdminOrSupervisor =
      orgRole === "org:admin" || orgRole === "admin" || orgRole === "org:supervisor";
    if (!isAdminOrSupervisor && msg.authorId !== callerId) {
      throw new Error("FORBIDDEN");
    }

    if (msg.direction !== "outbound" || msg.isInternalNote) {
      throw new Error("CANNOT_DELETE_THIS_MESSAGE");
    }

    if (!msg.metaMessageId) {
      throw new Error("NO_META_MESSAGE_ID");
    }

    const conversation = await ctx.db.get(msg.conversationId);
    if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");
    const channel = await ctx.db.get(conversation.channelId);
    if (!channel) throw new Error("CHANNEL_NOT_FOUND");

    await ctx.db.patch(args.messageId, { deletedAt: Date.now() });

    await ctx.scheduler.runAfter(
      0,
      internal.actions.sendWhatsAppMessage.deleteWhatsAppMessage,
      {
        messageId: args.messageId,
        phoneNumberId: channel.phoneNumberId,
        metaMessageId: msg.metaMessageId,
        tenantId,
      },
    );
  },
});

export const reactToMessage = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);

    const msg = await ctx.db.get(args.messageId);
    if (!msg || msg.tenantId !== tenantId) throw new Error("NOT_FOUND");

    if (!msg.metaMessageId) throw new Error("NO_META_MESSAGE_ID");

    const conversation = await ctx.db.get(msg.conversationId);
    if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");
    const channel = await ctx.db.get(conversation.channelId);
    const contact = await ctx.db.get(conversation.contactId);
    if (!channel || !contact) throw new Error("CHANNEL_OR_CONTACT_NOT_FOUND");

    const existing = msg.reactions ?? [];
    const alreadyReacted = existing.findIndex((r) => r.reactorId === callerId);

    let updatedReactions;
    if (alreadyReacted !== -1 && existing[alreadyReacted].emoji === args.emoji) {
      updatedReactions = existing.filter((r) => r.reactorId !== callerId);
    } else if (alreadyReacted !== -1) {
      updatedReactions = existing.map((r) =>
        r.reactorId === callerId ? { emoji: args.emoji, reactorId: callerId } : r,
      );
    } else {
      updatedReactions = [...existing, { emoji: args.emoji, reactorId: callerId }];
    }

    await ctx.db.patch(args.messageId, { reactions: updatedReactions });

    await ctx.scheduler.runAfter(
      0,
      internal.actions.sendWhatsAppMessage.sendReaction,
      {
        phoneNumberId: channel.phoneNumberId,
        contactPhone: contact.phone,
        metaMessageId: msg.metaMessageId,
        emoji: args.emoji,
        tenantId,
      },
    );
  },
});

export const handleIncomingReaction = internalMutation({
  args: {
    tenantId: v.string(),
    metaMessageId: v.string(),
    reactorPhone: v.string(),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const msg = await ctx.db
      .query("messages")
      .withIndex("by_meta_message_id", (q) =>
        q.eq("metaMessageId", args.metaMessageId),
      )
      .first();
    if (!msg || msg.tenantId !== args.tenantId) return;

    const existing = msg.reactions ?? [];

    let updatedReactions;
    if (args.emoji === "") {
      updatedReactions = existing.filter((r) => r.reactorId !== args.reactorPhone);
    } else {
      const alreadyReacted = existing.findIndex(
        (r) => r.reactorId === args.reactorPhone,
      );
      if (alreadyReacted !== -1) {
        updatedReactions = existing.map((r) =>
          r.reactorId === args.reactorPhone
            ? { emoji: args.emoji, reactorId: args.reactorPhone }
            : r,
        );
      } else {
        updatedReactions = [
          ...existing,
          { emoji: args.emoji, reactorId: args.reactorPhone },
        ];
      }
    }

    await ctx.db.patch(msg._id, { reactions: updatedReactions });
  },
});
