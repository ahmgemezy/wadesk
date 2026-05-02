"use node";

import { internalAction, action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { resolveUserEmail, getAdminEmails, resolveOrgName } from "../lib/emailHelpers";

export const slaBreachEmail = internalAction({
  args: {
    supervisorUserId: v.string(),
    contactName: v.string(),
    channelName: v.string(),
    thresholdMinutes: v.number(),
    conversationId: v.string(),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const [email, locale] = await Promise.all([
      resolveUserEmail(args.supervisorUserId),
      ctx.runQuery(internal.lib.tenants.getEmailLocale, { tenantId: args.tenantId }),
    ]);
    if (!email) {
      console.warn(`[EMAIL] slaBreachEmail: no email for user ${args.supervisorUserId}`);
      return;
    }
    await ctx.runAction(internal.actions.sendEmail.sendEmail, {
      to: email,
      templateKey: "sla_breach",
      locale,
      variables: {
        contactName: args.contactName,
        channelName: args.channelName,
        thresholdMinutes: String(args.thresholdMinutes),
        conversationId: args.conversationId,
      },
    });
  },
});

export const followupDueEmail = internalAction({
  args: {
    agentUserId: v.string(),
    contactName: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const [email, locale] = await Promise.all([
      resolveUserEmail(args.agentUserId),
      ctx.runQuery(internal.lib.tenants.getEmailLocale, { tenantId: args.tenantId }),
    ]);
    if (!email) {
      console.warn(`[EMAIL] followupDueEmail: no email for user ${args.agentUserId}`);
      return;
    }
    await ctx.runAction(internal.actions.sendEmail.sendEmail, {
      to: email,
      templateKey: "followup_due",
      locale,
      variables: {
        contactName: args.contactName,
        status: args.status,
      },
    });
  },
});

export const newAssignmentEmail = internalAction({
  args: {
    agentUserId: v.string(),
    contactName: v.string(),
    channelName: v.string(),
    conversationId: v.string(),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const [email, locale] = await Promise.all([
      resolveUserEmail(args.agentUserId),
      ctx.runQuery(internal.lib.tenants.getEmailLocale, { tenantId: args.tenantId }),
    ]);
    if (!email) {
      console.warn(`[EMAIL] newAssignmentEmail: no email for user ${args.agentUserId}`);
      return;
    }
    await ctx.runAction(internal.actions.sendEmail.sendEmail, {
      to: email,
      templateKey: "new_assignment",
      locale,
      variables: {
        contactName: args.contactName,
        channelName: args.channelName,
        conversationId: args.conversationId,
        assignedByName: "",
      },
    });
  },
});

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
