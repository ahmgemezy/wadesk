"use node";

import { internalAction, action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { resolveUserEmail, getAdminEmails, resolveOrgName } from "../lib/emailHelpers";
import {
  toggleableEventTypeValidator,
  type ToggleableEventType,
} from "../lib/notificationEvents";

export const agentWelcomeEmail = internalAction({
  args: {
    userId: v.string(),
    email: v.string(),
    agentName: v.string(),
    orgName: v.string(),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const alreadySent = await ctx.runQuery(internal.notifications.hasWelcomeNotification, {
      userId: args.userId,
      tenantId: args.tenantId,
    });
    if (alreadySent) return;

    const locale = await ctx.runQuery(internal.lib.tenants.getEmailLocale, {
      tenantId: args.tenantId,
    });
    await ctx.runAction(internal.actions.sendEmail.sendEmail, {
      to: args.email,
      templateKey: "agent_welcome",
      locale,
      variables: {
        agentName: args.agentName,
        orgName: args.orgName,
      },
    });

    await ctx.runMutation(internal.notifications.internalCreate, {
      tenantId: args.tenantId,
      userId: args.userId,
      type: "agent_welcome",
      referenceId: args.tenantId,
      message: "welcome email sent",
    });
  },
});

export const sendWelcomeOnJoin = action({
  args: {
    email: v.string(),
    agentName: v.string(),
    orgName: v.string(),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;
    await ctx.runAction(internal.actions.notifyEmail.agentWelcomeEmail, {
      userId: identity.subject,
      email: args.email,
      agentName: args.agentName,
      orgName: args.orgName,
      tenantId: args.tenantId,
    });
  },
});

export const billingPaymentFailedEmail = internalAction({
  args: {
    tenantId: v.string(),
    planName: v.string(),
  },
  handler: async (ctx, args) => {
    const [adminEmails, orgName, locale] = await Promise.all([
      getAdminEmails(args.tenantId),
      resolveOrgName(args.tenantId),
      ctx.runQuery(internal.lib.tenants.getEmailLocale, { tenantId: args.tenantId }),
    ]);
    for (const { email } of adminEmails) {
      await ctx.runAction(internal.actions.sendEmail.sendEmail, {
        to: email,
        templateKey: "billing_payment_failed",
        locale,
        variables: { orgName, planName: args.planName },
      });
    }
  },
});

export const billingSubscriptionExpiredEmail = internalAction({
  args: {
    tenantId: v.string(),
    planName: v.string(),
  },
  handler: async (ctx, args) => {
    const [adminEmails, orgName, locale] = await Promise.all([
      getAdminEmails(args.tenantId),
      resolveOrgName(args.tenantId),
      ctx.runQuery(internal.lib.tenants.getEmailLocale, { tenantId: args.tenantId }),
    ]);
    for (const { email } of adminEmails) {
      await ctx.runAction(internal.actions.sendEmail.sendEmail, {
        to: email,
        templateKey: "billing_subscription_expired",
        locale,
        variables: { orgName, planName: args.planName },
      });
    }
  },
});

/**
 * Generic notification email dispatcher. Resolves the recipient's email from
 * Clerk (via the lib/emailHelpers helper, which uses @clerk/nextjs/server),
 * then forwards to internal.actions.sendEmail with the appropriate template.
 * Called only by notifyDispatch via ctx.scheduler.runAfter.
 *
 * Email resolution lives here (not in notifyDispatch) because Clerk Node SDK
 * requires "use node", which is action-only. If email resolution fails or
 * the user has no primary email, this action returns silently — the daily-
 * cap slot in rateLimits has already been consumed by notifyDispatch
 * (acknowledged tradeoff per the Stage 1 amendment callout near the top
 * of this document).
 */
export const notifySend = internalAction({
  args: {
    userId: v.string(),
    tenantId: v.string(),
    eventType: toggleableEventTypeValidator,
    variables: v.any(),
  },
  handler: async (ctx, args) => {
    // 1. Resolve email via the canonical helper.
    const email = await resolveUserEmail(args.userId);
    if (!email) {
      console.warn("notifySend: user has no primary email", args.userId);
      return;
    }

    // 2. Look up locale + map event to template.
    const locale = await ctx.runQuery(internal.lib.tenants.getEmailLocale, {
      tenantId: args.tenantId,
    });
    const templateKey = mapEventToTemplateKey(args.eventType);
    if (!templateKey) {
      // Event has no email template yet (e.g. csat_received before Stage 6).
      // Silent skip — in-app row already fired upstream.
      return;
    }

    // 3. Forward to the existing sendEmail action.
    await ctx.runAction(internal.actions.sendEmail.sendEmail, {
      to: email,
      templateKey,
      locale,
      variables: args.variables,
    });
  },
});

/**
 * Maps a toggleable eventType to the matching templateKey understood by
 * sendEmail. Templates that don't exist yet return null — Stage 6 fills these in.
 */
function mapEventToTemplateKey(eventType: ToggleableEventType): string | null {
  switch (eventType) {
    case "sla_breach":               return "sla_breach";
    case "followup_due":             return "followup_due_sent"; // failure variant uses different path
    case "conversation_assigned":    return "new_assignment";
    case "channel_expiring_soon":    return "channel_expiring_soon";
    case "conversation_transferred": return null; // Stage 6 — template TBD
    case "conversation_reopened":    return null; // Stage 6 — template TBD
    case "csat_received":            return null; // Stage 6 — template TBD
  }
}
