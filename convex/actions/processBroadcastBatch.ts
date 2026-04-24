"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { decrypt } from "../lib/encryption";

const META_BASE = "https://graph.facebook.com/v21.0";
const MAX_RETRIES = 3;

export const processBroadcastBatch = internalAction({
  args: {
    broadcastId: v.id("broadcasts"),
    batchIndex: v.number(),
    batchSize: v.number(),
    // When provided, only process these specific contacts (retry batch)
    retryContacts: v.optional(v.array(v.object({
      contactId: v.string(), // stored as string (Id serialized)
      phone: v.string(),
      name: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    // 1. Fetch broadcast
    const broadcast = await ctx.runQuery(internal.broadcasts.getInternal, {
      broadcastId: args.broadcastId,
    });
    if (!broadcast || broadcast.status !== "sending") return;

    // 2. Determine contacts to process this run
    let batch: Array<{ contactId: string; phone: string; name?: string }>;

    if (args.retryContacts && args.retryContacts.length > 0) {
      batch = args.retryContacts;
    } else {
      const allRecipients = broadcast.recipientSnapshot;
      const start = args.batchIndex * args.batchSize;
      batch = allRecipients
        .slice(start, start + args.batchSize)
        .map((r) => ({ contactId: r.contactId as string, phone: r.phone, name: r.name }));
    }

    // 3. If normal batch is empty → we've processed all → mark complete
    if (batch.length === 0 && !args.retryContacts) {
      await ctx.runMutation(internal.broadcasts.markComplete, { broadcastId: args.broadcastId });
      return;
    }

    // 4. Get channel + decrypt token
    const channel = await ctx.runQuery(internal.broadcasts.getChannelInternal, {
      channelId: broadcast.channelId,
      tenantId: broadcast.tenantId,
    });
    if (!channel) {
      await ctx.runMutation(internal.broadcasts.markComplete, { broadcastId: args.broadcastId });
      return;
    }

    let token: string;
    if (channel.accessToken) {
      token = await decrypt(channel.accessToken);
    } else {
      token = process.env.META_SYSTEM_USER_TOKEN ?? "";
    }
    if (!token) {
      await ctx.runMutation(internal.broadcasts.markComplete, { broadcastId: args.broadcastId });
      return;
    }

    // 5. Process each contact
    const retryMap = broadcast.retryMap ?? {};
    const failedForRetry: Array<{ contactId: string; phone: string; name?: string }> = [];

    for (const contact of batch) {
      const attempts = retryMap[contact.contactId] ?? 0;

      if (attempts >= MAX_RETRIES) {
        // Already exhausted retries — skip (already counted as failed)
        continue;
      }

      try {
        const res = await fetch(`${META_BASE}/${channel.phoneNumberId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: contact.phone,
            type: "template",
            template: {
              name: broadcast.templateName,
              language: { code: broadcast.templateLanguage },
            },
          }),
        });

        if (res.ok) {
          await ctx.runMutation(internal.broadcasts.incrementSent, { broadcastId: args.broadcastId });
        } else {
          // Increment retry count
          await ctx.runMutation(internal.broadcasts.incrementRetry, {
            broadcastId: args.broadcastId,
            contactId: contact.contactId,
          });
          // Re-fetch retryMap to check new count
          const updatedBroadcast = await ctx.runQuery(internal.broadcasts.getInternal, { broadcastId: args.broadcastId });
          const newAttempts = (updatedBroadcast?.retryMap ?? {})[contact.contactId] ?? 0;
          if (newAttempts >= MAX_RETRIES) {
            // Exhausted — count as permanently failed
            await ctx.runMutation(internal.broadcasts.markFailed, { broadcastId: args.broadcastId });
          } else {
            failedForRetry.push(contact);
          }
        }
      } catch {
        // Network error — treat same as API failure
        await ctx.runMutation(internal.broadcasts.incrementRetry, {
          broadcastId: args.broadcastId,
          contactId: contact.contactId,
        });
        const updatedBroadcast = await ctx.runQuery(internal.broadcasts.getInternal, { broadcastId: args.broadcastId });
        const newAttempts = (updatedBroadcast?.retryMap ?? {})[contact.contactId] ?? 0;
        if (newAttempts >= MAX_RETRIES) {
          await ctx.runMutation(internal.broadcasts.markFailed, { broadcastId: args.broadcastId });
        } else {
          failedForRetry.push(contact);
        }
      }
    }

    // 6. Schedule retry batch for failed contacts (60s delay)
    if (failedForRetry.length > 0) {
      await ctx.scheduler.runAfter(60_000, internal.actions.processBroadcastBatch.processBroadcastBatch, {
        broadcastId: args.broadcastId,
        batchIndex: args.batchIndex, // not used when retryContacts is set
        batchSize: args.batchSize,
        retryContacts: failedForRetry,
      });
    }

    // 7. Schedule next normal batch (2s delay) — only if this wasn't a retry batch
    if (!args.retryContacts) {
      await ctx.scheduler.runAfter(2_000, internal.actions.processBroadcastBatch.processBroadcastBatch, {
        broadcastId: args.broadcastId,
        batchIndex: args.batchIndex + 1,
        batchSize: args.batchSize,
      });
    }
  },
});
