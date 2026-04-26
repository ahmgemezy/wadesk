// convex/sla.ts
// SLA (Service Level Agreement) breach detection.
//
// checkBreaches: scans open conversations every 5 minutes. If a conversation
// has an unanswered inbound message older than the channel's SLA threshold,
// it marks the conversation as breached and sends in-app notifications to
// channel supervisors.
//
// Breach is cleared automatically when an agent sends a reply
// (handled in messages.ts sendReply, sendQuotedReply, sendLocationReply, insertMediaMessage
// and inbox.ts sendMessage).

import { v, ConvexError } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";
import { getCallerIdentity, assertAdmin, type OrgRole } from "./lib/auth";
import { internal } from "./_generated/api";

// ── Check breaches (called by cron every 5 minutes) ──────────────────────────

export const checkBreaches = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const slaChannels = await ctx.db
      .query("channels")
      .withIndex("by_sla_configured", (q) => q.eq("slaEnabled", true))
      .collect();

    for (const channel of slaChannels) {
      const thresholdMs = (channel.slaThresholdMinutes ?? 0) * 60 * 1000;

      // Get open (non-resolved) conversations in this channel
      const conversations = await ctx.db
        .query("conversations")
        .withIndex("by_tenant_channel", (q) =>
          q.eq("tenantId", channel.tenantId).eq("channelId", channel._id),
        )
        .filter((q) => q.neq(q.field("status"), "resolved"))
        .collect();

      for (const conv of conversations) {
        // Skip if already breached
        if (conv.slaBreachedAt !== undefined) continue;

        // Skip if no inbound message tracked yet
        if (!conv.lastInboundAt) continue;

        // Check if elapsed time since last inbound > threshold
        const elapsed = now - conv.lastInboundAt;
        if (elapsed <= thresholdMs) continue;

        // Mark as breached
        await ctx.db.patch(conv._id, { slaBreachedAt: now });

        // Notify channel supervisors
        const supervisors = await ctx.db
          .query("channelMembers")
          .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
          .filter((q) => q.eq(q.field("role"), "org:supervisor"))
          .collect();

        const contact = await ctx.db.get(conv.contactId);
        const contactName = contact?.customName ?? contact?.displayName ?? contact?.phone ?? "";

        for (const supervisor of supervisors) {
          await ctx.db.insert("notifications", {
            tenantId: channel.tenantId,
            userId: supervisor.userId,
            type: "sla_breach",
            referenceId: conv._id,
            contactName,
            message: `SLA breach: no reply to ${contactName} for over ${channel.slaThresholdMinutes} minutes`,
            read: false,
            createdAt: now,
          });
        }
      }
    }
  },
});

// ── Update SLA threshold for a channel (Admin only) ──────────────────────────

export const updateChannelSlaThreshold = mutation({
  args: {
    channelId: v.id("channels"),
    thresholdMinutes: v.optional(v.number()), // undefined or 0 = disabled
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);

    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    const threshold = args.thresholdMinutes;
    const enabled = threshold && threshold > 0;
    await ctx.db.patch(args.channelId, {
      slaThresholdMinutes: enabled ? threshold : undefined,
      slaEnabled: enabled ? true : undefined,
    });
  },
});
