// convex/sla.ts
// SLA (Service Level Agreement) breach detection.
//
// checkBreaches: scans open conversations every 5 minutes. If a conversation
// has an unanswered inbound message older than the channel's SLA threshold,
// it marks the conversation as breached and sends in-app notifications to
// channel supervisors.
//
// Breach is cleared automatically when an agent sends a reply. Clearing paths:
//   messages.ts  sendReply (line 105), sendQuotedReply (line 724),
//                sendLocationReply (line 409), insertMediaMessage (line 562)
//   inbox.ts     sendMessage (line 237) — reply type only, not internal notes
//   messages.ts  createInbound (line 284) — reopen-of-resolved branch only
// Does NOT clear on: internal notes, assignment changes, status changes,
// automation auto-responses, CSAT sends, broadcast sends, scheduled message dispatch.

import { v, ConvexError } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";
import { getCallerIdentity, assertAdmin, type OrgRole } from "./lib/auth";
import { internal, components } from "./_generated/api";

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

        // Notify channel supervisors + all org admins
        const supervisors = await ctx.db
          .query("channelMembers")
          .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
          .filter((q) => q.eq(q.field("role"), "org:supervisor"))
          .collect();

        // Admins have org-wide access but may not appear as supervisors in
        // channelMembers (the invite code stores them with role "org:agent").
        // Query Better Auth directly to find all org admins.
        let adminUserIds: string[] = [];
        try {
          const orgMembers = await ctx.runQuery(
            components.betterAuth.orgQueries.listOrgMembers,
            { organizationId: channel.tenantId },
          );
          adminUserIds = (orgMembers as Array<{ userId: string; role: string }>)
            .filter((m) => m.role === "org:admin")
            .map((m) => m.userId);
        } catch {
          // If the component query fails, fall back to supervisors-only.
        }

        const contact = await ctx.db.get(conv.contactId);
        const contactName = contact?.customName ?? contact?.displayName ?? contact?.phone ?? "";

        // Deduplicate: a supervisor who is also an admin should get one notification.
        const supervisorUserIds = new Set(supervisors.map((s) => s.userId));
        const recipientIds = [
          ...supervisors.map((s) => s.userId),
          ...adminUserIds.filter((id) => !supervisorUserIds.has(id)),
        ];

        for (const userId of recipientIds) {
          await ctx.runMutation(internal.notifications.notifyDispatch, {
            tenantId: channel.tenantId,
            userId,
            eventType: "sla_breach",
            referenceId: conv._id,
            contactName,
            message: `SLA breach: no reply to ${contactName} for over ${channel.slaThresholdMinutes} minutes`,
            emailVariables: {
              contactName,
              channelName: channel.displayName,
              thresholdMinutes: String(channel.slaThresholdMinutes ?? 0),
              conversationId: conv._id,
            },
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
