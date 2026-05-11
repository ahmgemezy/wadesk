import { v, ConvexError } from "convex/values";
import { query, mutation, internalMutation, internalQuery, action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getCallerIdentity, isAdminOrSupervisor } from "./lib/auth";
import { enforceRateLimit, makeUserMutationKey } from "./lib/rateLimit";
import {
  incrementParticipantMessageCount,
  openParticipantStint,
} from "./lib/participants";

export const listForConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) return [];

    // Follow-up carve-out: conversations with a follow-up are shared work
    // visible to the whole team. Use the denormalized flag on conversations
    // (maintained by followUps mutations) to avoid scanning all messages.
    if (
      !isAdminOrSupervisor(orgRole) &&
      conversation.assignedAgentId !== callerId &&
      conversation.assignedAgentId !== undefined
    ) {
      if (!conversation.hasFollowUp) return [];
    }

    return ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .take(500);
  },
});

export const sendReply = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);

    await enforceRateLimit(ctx, makeUserMutationKey(callerId, "sendReply"), {
      windowMs: 60_000,
      maxRequests: 60,
    });

    if (args.content.length > 4096) {
      throw new ConvexError("MESSAGE_TOO_LONG");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    if (
      !isAdminOrSupervisor(orgRole) &&
      conversation.assignedAgentId !== callerId &&
      conversation.assignedAgentId !== undefined
    ) {
      throw new ConvexError("FORBIDDEN");
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      tenantId,
      direction: "outbound",
      content: args.content,
      contentType: "text",
      isInternalNote: false,
      authorId: callerId,
      status: "sending",
      timestamp: Date.now(),
      createdAt: Date.now(),
    });

    const channel = await ctx.db.get(conversation.channelId);
    if (!channel) throw new ConvexError("CHANNEL_NOT_FOUND");

    const contact = await ctx.db.get(conversation.contactId);
    if (!contact) throw new ConvexError("CONTACT_NOT_FOUND");

    let assignedAgentId = conversation.assignedAgentId;
    if (!assignedAgentId) {
      let effectiveMode: string | undefined;
      if (conversation.departmentId) {
        const dept = await ctx.db.get(conversation.departmentId);
        effectiveMode = dept?.assignmentMode ?? "manual";
      } else {
        effectiveMode = channel.assignmentMode;
      }
      if (effectiveMode === "first_reply") {
        assignedAgentId = callerId;
      }
    }

    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
      lastMessagePreview: args.content.slice(0, 100),
      assignedAgentId,
      ...(conversation.slaBreachedAt !== undefined ? { slaBreachedAt: undefined } : {}),
    });

    if (!conversation.assignedAgentId && assignedAgentId === callerId) {
      await openParticipantStint(ctx, {
        tenantId,
        conversationId: args.conversationId,
        agentId: callerId,
        departmentId: conversation.departmentId,
      });
    }

    await ctx.scheduler.runAfter(0, internal.actions.sendWhatsAppMessage.sendMessage, {
      messageId,
      phoneNumberId: channel.phoneNumberId,
      contactPhone: contact.phone,
      content: args.content,
      tenantId,
    });

    await incrementParticipantMessageCount(ctx, {
      tenantId,
      conversationId: args.conversationId,
      agentId: callerId,
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
      throw new ConvexError("NOT_FOUND");
    }

    if (
      !isAdminOrSupervisor(orgRole) &&
      conversation.assignedAgentId !== callerId &&
      conversation.assignedAgentId !== undefined
    ) {
      throw new ConvexError("FORBIDDEN");
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
    source: v.optional(v.union(v.literal("customer"), v.literal("api"), v.literal("mobile"))),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("messages")
      .withIndex("by_meta_message_id", (q) => q.eq("metaMessageId", args.metaMessageId))
      .first();
    if (existing) return { messageId: existing._id, conversationId: existing.conversationId, isNewConversation: false, isDuplicate: true };

    const mediaPreview = (ct: string, content: string) => content || (
      ct === "image" ? "📷 Photo" :
      ct === "video" ? "🎥 Video" :
      ct === "audio" ? "🎵 Voice message" :
      ct === "sticker" ? "🎨 Sticker" :
      ct === "document" ? "📄 Document" :
      content
    );

    const contactId: Id<"contacts"> = await ctx.runMutation(internal.contacts.upsertByPhone, {
      tenantId: args.tenantId,
      phone: args.senderPhone,
      displayName: args.senderDisplayName,
      wabaId: args.wabaId,
      channelId: args.channelId,
    });

    let conversation = await ctx.db
      .query("conversations")
      .withIndex("by_tenant_channel", (q) =>
        q.eq("tenantId", args.tenantId).eq("channelId", args.channelId),
      )
      .filter((q) => q.eq(q.field("contactId"), contactId))
      .first();

    let isNewConversation = false;
    let didReopen = false;

    // Outside-window check: if the existing conversation is resolved and the
    // reopen window has elapsed, treat this inbound as a brand new case —
    // null the local var so the new-conversation branch below runs.
    if (conversation && conversation.status === "resolved") {
      const channel = await ctx.db.get(args.channelId);
      const windowHours = channel?.reopenWindowHours ?? 24;
      const windowMs = windowHours * 60 * 60 * 1000;
      const resolvedTime = conversation.resolvedAt ?? conversation.lastMessageAt;
      if (args.timestamp - resolvedTime >= windowMs) {
        conversation = null;
      }
    }

    if (conversation && conversation.status === "forwarded") {
      conversation = null;
    }

    if (!conversation) {
      let departmentId: Id<"departments"> | undefined;
      const defaultDept = await ctx.runQuery(
        internal.departments.getDefaultForChannel,
        { channelId: args.channelId }
      ) as { _id: Id<"departments"> } | null;
      if (defaultDept) {
        departmentId = defaultDept._id;
      }

      const conversationId: Id<"conversations"> = await ctx.db.insert("conversations", {
        tenantId: args.tenantId,
        channelId: args.channelId,
        contactId,
        status: "open",
        labels: [],
        lastMessageAt: args.timestamp,
        lastMessagePreview: mediaPreview(args.contentType, args.content).slice(0, 100),
        unreadCount: 1,
        createdAt: args.timestamp,
        lastInboundAt: args.timestamp,
        departmentId,
        departmentAssignedAt: departmentId ? args.timestamp : undefined,
        ...(args.assignedAgentId ? { assignedAgentId: args.assignedAgentId } : {}),
      });
      conversation = await ctx.db.get(conversationId);
      isNewConversation = true;
      const contact = await ctx.db.get(contactId);
      await ctx.db.patch(contactId, {
        totalConversations: (contact?.totalConversations ?? 0) + 1,
      });
    } else {
      const wasResolved = conversation.status === "resolved";
      const patch: Record<string, unknown> = {
        lastMessageAt: args.timestamp,
        lastMessagePreview: mediaPreview(args.contentType, args.content).slice(0, 100),
        unreadCount: (conversation.unreadCount ?? 0) + 1,
        lastInboundAt: args.timestamp,
      };
      if (wasResolved) {
        patch.status = "open";
        patch.slaBreachedAt = undefined;
        patch.resolvedAt = undefined;
        didReopen = true;
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
      ...(args.source ? { source: args.source } : {}),
      status: "sent",
      timestamp: args.timestamp,
      createdAt: Date.now(),
    });

    // ── Customer reopened a resolved conversation within the window ──────────
    if (didReopen && conversation) {
      const contact = await ctx.db.get(contactId);
      const contactName =
        contact?.customName ?? contact?.displayName ?? contact?.phone ?? "Customer";
      await ctx.db.insert("messages", {
        conversationId: conversation._id,
        tenantId: args.tenantId,
        direction: "outbound",
        content: "",
        contentType: "system_event",
        eventType: "reopened",
        eventData: { actorName: contactName },
        isInternalNote: false,
        status: "sent",
        timestamp: args.timestamp,
        createdAt: Date.now(),
      });

      if (conversation.assignedAgentId) {
        const channel = await ctx.db.get(args.channelId);
        const channelName = channel?.displayName ?? "";
        await ctx.runMutation(internal.notifications.notifyDispatch, {
          tenantId: args.tenantId,
          userId: conversation.assignedAgentId,
          eventType: "conversation_reopened",
          referenceId: conversation._id,
          contactName,
          message: `${contactName} replied to a resolved conversation${channelName ? ` on ${channelName}` : ""}`,
          emailVariables: {
            contactName,
            channelName,
            conversationId: conversation._id,
          },
        });
      }
    }

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
    if (!conversation || conversation.tenantId !== tenantId) throw new ConvexError("NOT_FOUND");

    if (!isAdminOrSupervisor(orgRole) && conversation.assignedAgentId !== callerId && conversation.assignedAgentId !== undefined) {
      throw new ConvexError("FORBIDDEN");
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
      ...(conversation.slaBreachedAt !== undefined ? { slaBreachedAt: undefined } : {}),
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
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);

    const conversation = await ctx.runQuery(internal.messages.getConversationInternal, {
      conversationId: args.conversationId,
      tenantId,
    });
    if (!conversation) throw new ConvexError("NOT_FOUND");

    if (!isAdminOrSupervisor(orgRole) && conversation.assignedAgentId !== callerId && conversation.assignedAgentId !== undefined) {
      throw new ConvexError("FORBIDDEN");
    }

    const mediaUrl = await ctx.storage.getUrl(args.storageId);
    if (!mediaUrl) throw new ConvexError("STORAGE_URL_FAILED");

    const now = Date.now();
    const messageId: Id<"messages"> = await ctx.runMutation(internal.messages.insertMediaMessage, {
      conversationId: args.conversationId,
      tenantId,
      authorId: callerId,
      contentType: args.contentType,
      mediaUrl,
      filename: args.filename,
      caption: args.caption,
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
        caption: args.caption,
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
    caption: v.optional(v.string()),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const preview = args.contentType === "image" ? "📷 Photo" : args.contentType === "document" ? `📄 ${args.filename ?? "Document"}` : args.contentType === "audio" ? "🎵 Audio" : "🎥 Video";
    // For documents: show filename in bubble (unless caption provided). For images/video/audio: show caption or empty (no filename leak).
    const content = args.caption ?? (args.contentType === "document" ? (args.filename ?? preview) : "");
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      tenantId: args.tenantId,
      direction: "outbound",
      content,
      contentType: args.contentType,
      isInternalNote: false,
      authorId: args.authorId,
      mediaUrl: args.mediaUrl,
      status: "sending",
      timestamp: args.now,
      createdAt: args.now,
    });
    const conv = await ctx.db.get(args.conversationId);
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: args.now,
      lastMessagePreview: preview,
      ...(conv?.slaBreachedAt !== undefined ? { slaBreachedAt: undefined } : {}),
    });
    return messageId;
  },
});

export const retryMessage = action({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);

    const message = await ctx.runQuery(internal.messages.getMessageInternal, {
      messageId: args.messageId,
      tenantId,
    });
    if (!message) throw new ConvexError("NOT_FOUND");
    if (message.status !== "failed") throw new ConvexError("NOT_FAILED");

    const conversation = await ctx.runQuery(internal.messages.getConversationInternal, {
      conversationId: message.conversationId,
      tenantId,
    });
    if (!conversation) throw new ConvexError("NOT_FOUND");

    if (!isAdminOrSupervisor(orgRole) && conversation.assignedAgentId !== callerId && conversation.assignedAgentId !== undefined) {
      throw new ConvexError("FORBIDDEN");
    }

    await ctx.runMutation(internal.messages.resetMessageStatus, {
      messageId: args.messageId,
      tenantId,
    });

    const channel = await ctx.runQuery(internal.messages.getChannelInternal, {
      channelId: conversation.channelId,
      tenantId,
    });
    const contact = await ctx.runQuery(internal.messages.getContactInternal, {
      contactId: conversation.contactId,
      tenantId,
    });
    if (!channel || !contact) throw new ConvexError("CHANNEL_OR_CONTACT_NOT_FOUND");

    if (message.contentType === "text" || message.contentType === "unsupported" || message.contentType === "template" || message.contentType === "location" || message.contentType === "system_event" || message.contentType === "sticker") {
      await ctx.scheduler.runAfter(0, internal.actions.sendWhatsAppMessage.sendMessage, {
        messageId: args.messageId,
        phoneNumberId: channel.phoneNumberId,
        contactPhone: contact.phone,
        content: message.content,
        tenantId,
      });
    } else {
      if (!message.mediaUrl) throw new ConvexError("NO_MEDIA_URL");
      const isDocument = message.contentType === "document";
      await ctx.scheduler.runAfter(0, internal.actions.sendWhatsAppMessage.sendMediaMessage, {
        messageId: args.messageId,
        phoneNumberId: channel.phoneNumberId,
        contactPhone: contact.phone,
        mediaUrl: message.mediaUrl,
        contentType: message.contentType as "image" | "document" | "audio" | "video",
        filename: isDocument ? message.content || undefined : undefined,
        caption: !isDocument && message.content ? message.content : undefined,
        tenantId,
      });
    }
  },
});

export const getMessageInternal = internalQuery({
  args: { messageId: v.id("messages"), tenantId: v.string() },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (!msg || msg.tenantId !== args.tenantId) return null;
    return msg;
  },
});

export const resetMessageStatus = internalMutation({
  args: { messageId: v.id("messages"), tenantId: v.string() },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (!msg || msg.tenantId !== args.tenantId) return;
    await ctx.db.patch(args.messageId, { status: "sending", failureReason: undefined });
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

    // Idempotent: already set to this value, nothing to do.
    if (msg.metaMessageId === args.metaMessageId) return;

    // If a different row already owns this wamid (echo arrived first and the secondary dedup
    // in processEcho patched the api row directly), do NOT overwrite — that row is canonical.
    // Log the anomaly so we can diagnose any Level-2 dedup miss; never delete data here.
    const existingWithWamid = await ctx.db
      .query("messages")
      .withIndex("by_meta_message_id", (q) => q.eq("metaMessageId", args.metaMessageId))
      .first();
    if (existingWithWamid && existingWithWamid._id !== args.messageId) {
      console.log(JSON.stringify({
        tag: "[SET_WAMID]",
        event: "wamid_already_owned_by_other_row",
        currentRow: args.messageId,
        ownerRow: existingWithWamid._id,
        ownerSource: existingWithWamid.source,
      }));
      return;
    }

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
      throw new ConvexError("NOT_FOUND");
    }

    if (
      !isAdminOrSupervisor(orgRole) &&
      conversation.assignedAgentId !== callerId &&
      conversation.assignedAgentId !== undefined
    ) {
      throw new ConvexError("FORBIDDEN");
    }

    const quotedMsg = await ctx.db.get(args.quotedMessageId);
    if (!quotedMsg || quotedMsg.conversationId !== args.conversationId) {
      throw new ConvexError("QUOTED_MESSAGE_NOT_FOUND");
    }

    if (!quotedMsg.metaMessageId) {
      throw new ConvexError("QUOTED_MESSAGE_HAS_NO_META_ID");
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
    if (!channel || !contact) throw new ConvexError("CHANNEL_OR_CONTACT_NOT_FOUND");

    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
      lastMessagePreview: args.content.slice(0, 100),
      ...(conversation.slaBreachedAt !== undefined ? { slaBreachedAt: undefined } : {}),
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
    if (!msg || msg.tenantId !== tenantId) throw new ConvexError("NOT_FOUND");

    if (!isAdminOrSupervisor(orgRole) && msg.authorId !== callerId) {
      throw new ConvexError("FORBIDDEN");
    }

    if (msg.direction !== "outbound" || msg.isInternalNote) {
      throw new ConvexError("CANNOT_DELETE_THIS_MESSAGE");
    }

    if (!msg.metaMessageId) {
      throw new ConvexError("NO_META_MESSAGE_ID");
    }

    const conversation = await ctx.db.get(msg.conversationId);
    if (!conversation) throw new ConvexError("CONVERSATION_NOT_FOUND");
    const channel = await ctx.db.get(conversation.channelId);
    if (!channel) throw new ConvexError("CHANNEL_NOT_FOUND");

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
    if (!msg || msg.tenantId !== tenantId) throw new ConvexError("NOT_FOUND");

    if (!msg.metaMessageId) throw new ConvexError("NO_META_MESSAGE_ID");

    const conversation = await ctx.db.get(msg.conversationId);
    if (!conversation) throw new ConvexError("CONVERSATION_NOT_FOUND");
    const channel = await ctx.db.get(conversation.channelId);
    const contact = await ctx.db.get(conversation.contactId);
    if (!channel || !contact) throw new ConvexError("CHANNEL_OR_CONTACT_NOT_FOUND");

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

export const createOutboundForward = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    tenantId: v.string(),
    content: v.string(),
    authorId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      tenantId: args.tenantId,
      direction: "outbound",
      content: args.content,
      contentType: "text",
      isInternalNote: false,
      authorId: args.authorId,
      status: "sending",
      timestamp: now,
      createdAt: now,
    });
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
      lastMessagePreview: args.content.slice(0, 100),
    });
    return messageId;
  },
});

export const markFailed = internalMutation({
  args: { messageId: v.id("messages"), reason: v.string() },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (!msg) return;
    await ctx.db.patch(args.messageId, {
      status: "failed",
      failureReason: args.reason,
    });
  },
});

export const getStatusInternal = internalQuery({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const m = await ctx.db.get(args.messageId);
    if (!m) return null;
    return { status: m.status, failureReason: m.failureReason };
  },
});

export const updateMediaUrl = internalMutation({
  args: {
    messageId: v.id("messages"),
    mediaUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { mediaUrl: args.mediaUrl });
  },
});
