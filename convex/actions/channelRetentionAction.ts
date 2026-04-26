"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { clerkClient } from "@clerk/nextjs/server";
import type { Id } from "../_generated/dataModel";

export const processChannelRetention = internalAction({
  args: {},
  handler: async (ctx) => {
    const channels = await ctx.runQuery(
      internal.channelRetention.listDisconnectedChannels,
      {}
    );

    for (const channel of channels) {
      const elapsedDays = Math.floor(
        (Date.now() - channel.disconnectedAt) / 86_400_000
      );
      const channelId = channel._id as Id<"channels">;

      if (elapsedDays >= 30) {
        // Day 30+: purge the channel
        await ctx.runMutation(internal.channelRetention.purgeChannel, {
          channelId,
          tenantId: channel.tenantId,
        });

        const adminEmails = await getAdminEmails(channel.tenantId);

        // Send deletion emails
        for (const { email } of adminEmails) {
          await ctx.runAction(internal.actions.sendEmail.sendEmail, {
            to: email,
            templateKey: "channel_deleted",
            locale: "en",
            variables: { channelName: channel.displayName },
          });
        }

        // Create deletion notifications
        for (const { userId } of adminEmails) {
          await ctx.runMutation(internal.notifications.internalCreate, {
            tenantId: channel.tenantId,
            userId,
            type: "channel_deleted",
            referenceId: channelId,
            message: `WhatsApp number "${channel.displayName}" has been permanently deleted.`,
          });
        }
      } else if (elapsedDays >= 25 && elapsedDays < 30) {
        // Days 25-29: send warning if not already sent
        const warningsSent = channel.deactivationWarningsSent ?? [];
        if (!warningsSent.includes(elapsedDays)) {
          const daysLeft = 30 - elapsedDays;
          const deleteDate = new Date(
            channel.disconnectedAt + 30 * 86_400_000
          ).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });

          const adminEmails = await getAdminEmails(channel.tenantId);

          // Send warning emails
          for (const { email } of adminEmails) {
            await ctx.runAction(internal.actions.sendEmail.sendEmail, {
              to: email,
              templateKey: "channel_expiring_soon",
              locale: "en",
              variables: {
                channelName: channel.displayName,
                daysLeft: String(daysLeft),
                deleteDate,
              },
            });
          }

          // Create warning notifications
          for (const { userId } of adminEmails) {
            await ctx.runMutation(internal.notifications.internalCreate, {
              tenantId: channel.tenantId,
              userId,
              type: "channel_expiring_soon",
              referenceId: channelId,
              message: `WhatsApp number "${channel.displayName}" will be deleted in ${daysLeft} days.`,
            });
          }

          // Mark warning as sent for this day
          await ctx.runMutation(internal.channelRetention.markWarningSent, {
            channelId,
            day: elapsedDays,
          });
        }
      }
    }
  },
});

async function getAdminEmails(
  orgId: string
): Promise<Array<{ userId: string; email: string }>> {
  try {
    const client = await clerkClient();
    const memberships = await client.organizations.getOrganizationMembershipList(
      { organizationId: orgId, limit: 100 }
    );
    return memberships.data
      .filter((m) => m.role === "org:admin")
      .filter((m) => m.publicUserData?.userId)
      .map((m) => ({
        userId: m.publicUserData!.userId!,
        email: (m.publicUserData?.identifier ?? "") as string,
      }))
      .filter((m) => m.email);
  } catch {
    return [];
  }
}
