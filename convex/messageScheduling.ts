import { v, ConvexError } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCallerIdentity, isAdminOrSupervisor, type OrgRole } from "./lib/auth";

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

    if (!isAdminOrSupervisor(orgRole) && conversation.assignedAgentId !== callerId && conversation.assignedAgentId !== undefined) {
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

// Tunables for the scheduled-message processor.
// MAX_RETRY_ATTEMPTS — retry budget for messages that get stuck in "processing"
//   (cron crashed mid-send, action timed out, etc.). Bumped on each bounce
//   back from "processing" → "scheduled" by the reaper. Phase 1.5 will also
//   bump this on transient Meta API failures from the send action itself.
// PROCESSING_TIMEOUT_MS — a row may sit in "processing" for at most this long
//   before the reaper considers it stuck. 10 min is generous vs. normal Meta
//   latency (sub-second to a few seconds) and short enough to keep ghosts off
//   the inbox UI.
// BATCH_SIZE — max messages dispatched per cron tick. Cron runs every minute
//   (convex/crons.ts), so steady-state throughput cap is BATCH_SIZE/min. Bump
//   this constant if a backlog ever forms.
const MAX_RETRY_ATTEMPTS = 5;
const PROCESSING_TIMEOUT_MS = 10 * 60 * 1000;
const BATCH_SIZE = 100;

// Failure-code constants. Prefix convention:
//   INTERNAL_* → WABDesk bugs / cron issues (this file).
//   META_*     → Meta API errors (introduced in Phase 1.5, not yet present).
//   No prefix  → preexisting strings (CONVERSATION_NOT_FOUND,
//                CHANNEL_OR_CONTACT_NOT_FOUND) that are also used as
//                client-facing ConvexError codes in convex/messages.ts;
//                left unprefixed to avoid touching code outside Phase 1 scope.
const FAILURE_INTERNAL_MAX_RETRIES = "INTERNAL_MAX_RETRIES_EXCEEDED";
const FAILURE_INTERNAL_STUCK_PROCESSING = "INTERNAL_STUCK_PROCESSING_TIMEOUT";

export const processScheduledMessages = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // ─ Step 1: reap rows stuck in "processing" past the timeout.
    // Indexed read on (status, scheduledAt) prefix; bounded by BATCH_SIZE.
    // If a row is past PROCESSING_TIMEOUT_MS and has retry budget remaining,
    // bounce it back to "scheduled" for re-dispatch on a later tick. Otherwise
    // mark failed and stop retrying.
    const stuck = await ctx.db
      .query("messages")
      .withIndex("by_status_and_scheduledAt", (q) => q.eq("status", "processing"))
      .take(BATCH_SIZE);

    for (const msg of stuck) {
      const startedAt = msg.processingStartedAt ?? msg._creationTime;
      if (now - startedAt < PROCESSING_TIMEOUT_MS) continue;

      const retryCount = msg.retryCount ?? 0;
      if (retryCount >= MAX_RETRY_ATTEMPTS) {
        await ctx.db.patch(msg._id, {
          status: "failed",
          failureReason: FAILURE_INTERNAL_MAX_RETRIES,
          lastFailureAt: now,
        });
        continue;
      }

      await ctx.db.patch(msg._id, {
        status: "scheduled",
        retryCount: retryCount + 1,
        lastFailureAt: now,
        lastErrorCode: FAILURE_INTERNAL_STUCK_PROCESSING,
        processingStartedAt: undefined,
      });
    }

    // ─ Step 2: dispatch due scheduled messages via the indexed query.
    // The (status, scheduledAt) index lets storage filter by status AND
    // range-scan by scheduledAt in a single read — replaces the prior full
    // table scan of every message ever sent.
    const due = await ctx.db
      .query("messages")
      .withIndex("by_status_and_scheduledAt", (q) =>
        q.eq("status", "scheduled").lte("scheduledAt", now),
      )
      .take(BATCH_SIZE);

    for (const msg of due) {
      const conversation = await ctx.db.get(msg.conversationId);
      if (!conversation) {
        await ctx.db.patch(msg._id, {
          status: "failed",
          failureReason: "CONVERSATION_NOT_FOUND",
          lastFailureAt: now,
        });
        continue;
      }

      const [channel, contact] = await Promise.all([
        ctx.db.get(conversation.channelId),
        ctx.db.get(conversation.contactId),
      ]);
      if (!channel || !contact) {
        await ctx.db.patch(msg._id, {
          status: "failed",
          failureReason: "CHANNEL_OR_CONTACT_NOT_FOUND",
          lastFailureAt: now,
        });
        continue;
      }

      // Idempotency boundary: transition scheduled → processing BEFORE
      // scheduling the send action. The next cron tick cannot observe this
      // row as "scheduled" until either the send completes (→ "sent" /
      // "failed") or the reaper bounces it back.
      await ctx.db.patch(msg._id, {
        status: "processing",
        processingStartedAt: now,
      });

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