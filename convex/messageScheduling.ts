import { v, ConvexError } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCallerIdentity, type OrgRole } from "./lib/auth";

export const scheduleMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    scheduledAt: v.number(),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    const isAdminOrSupervisor =
      orgRole === "org:admin" ||
      orgRole === "admin" ||
      orgRole === "org:supervisor";

    if (!isAdminOrSupervisor && conversation.assignedAgentId !== callerId && conversation.assignedAgentId !== undefined) {
      throw new ConvexError("FORBIDDEN");
    }

    if (args.scheduledAt <= Date.now()) {
      throw new ConvexError("SCHEDULE_TIME_MUST_BE_FUTURE");
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
      status: "scheduled",
      scheduledAt: args.scheduledAt,
      timestamp: now,
      createdAt: now,
    });

    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
      lastMessagePreview: `[مجدول] ${args.content.slice(0, 80)}`,
    });

    return messageId;
  },
});

export const cancelScheduled = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);

    const message = await ctx.db.get(args.messageId);
    if (!message || message.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    if (message.status !== "scheduled") {
      throw new ConvexError("NOT_SCHEDULED");
    }

    if (message.authorId !== callerId) {
      throw new ConvexError("FORBIDDEN");
    }

    await ctx.db.delete(args.messageId);
    return { ok: true };
  },
});

export const listScheduled = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);

    const all = await ctx.db
      .query("messages")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    const results = [];
    for (const msg of all) {
      if (msg.status !== "scheduled" || msg.authorId !== callerId) continue;
      results.push({
        id: msg._id as string,
        conversationId: msg.conversationId as string,
        content: msg.content,
        scheduledAt: msg.scheduledAt,
        createdAt: msg.createdAt,
      });
    }

    return results.slice(0, 50);
  },
});

export const processScheduledMessages = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const all = await ctx.db.query("messages").collect();
    const scheduled = all.filter((m) => m.status === "scheduled" && m.scheduledAt && m.scheduledAt <= now);

    for (const msg of scheduled.slice(0, 20)) {
      const conversation = await ctx.db.get(msg.conversationId);
      if (!conversation) {
        await ctx.db.patch(msg._id, { status: "failed", failureReason: "CONVERSATION_NOT_FOUND" });
        continue;
      }

      const channel = await ctx.db.get(conversation.channelId);
      const contact = await ctx.db.get(conversation.contactId);
      if (!channel || !contact) {
        await ctx.db.patch(msg._id, { status: "failed", failureReason: "CHANNEL_OR_CONTACT_NOT_FOUND" });
        continue;
      }

      await ctx.db.patch(msg._id, { status: "sending" });

      await ctx.scheduler.runAfter(0, internal.actions.sendWhatsAppMessage.sendMessage, {
        messageId: msg._id,
        phoneNumberId: channel.phoneNumberId,
        contactPhone: contact.phone,
        content: msg.content,
        tenantId: msg.tenantId,
      });
    }
  },
});