"use node";

import * as React from "react";
import { render } from "@react-email/render";
import { internalAction } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { ChannelExpiringSoon } from "../emails/templates/channelExpiringSoon";
import { ChannelDeleted } from "../emails/templates/channelDeleted";
import { SlaBreach } from "../emails/templates/slaBreach";
import { FollowupDue } from "../emails/templates/followupDue";
import { NewAssignment } from "../emails/templates/newAssignment";
import { AgentWelcome } from "../emails/templates/agentWelcome";
import { BillingPaymentFailed } from "../emails/templates/billingPaymentFailed";
import { BillingSubscriptionExpired } from "../emails/templates/billingSubscriptionExpired";

const SUBJECTS: Record<string, Record<"ar" | "en", string>> = {
  channel_expiring_soon: {
    ar: "إجراء مطلوب: سيُحذف رقم واتساب خلال {{daysLeft}} أيام",
    en: "Action Required: WhatsApp Number Deletes in {{daysLeft}} Days",
  },
  channel_deleted: {
    ar: "تم حذف رقم واتساب نهائياً",
    en: "WhatsApp Number Permanently Deleted",
  },
  sla_breach: {
    ar: "تنبيه: تجاوز وقت الاستجابة المسموح به",
    en: "Alert: SLA Response Time Exceeded",
  },
  followup_due: {
    ar: "تحديث: متابعة العميل",
    en: "Update: Customer Follow-up",
  },
  new_assignment: {
    ar: "إشعار: محادثة جديدة تم تعيينها إليك",
    en: "Notification: New Conversation Assigned to You",
  },
  agent_welcome: {
    ar: "مرحباً بك في WaDesk",
    en: "Welcome to WaDesk",
  },
  billing_payment_failed: {
    ar: "فشل تجديد الاشتراك — يرجى تحديث بيانات الدفع",
    en: "Subscription Payment Failed — Action Required",
  },
  billing_subscription_expired: {
    ar: "انتهت صلاحية الاشتراك",
    en: "Your Subscription Has Expired",
  },
};

function resolveSubject(
  templateKey: string,
  locale: "ar" | "en",
  variables: Record<string, string>,
): string {
  let subject = SUBJECTS[templateKey]?.[locale] ?? templateKey;
  for (const [key, value] of Object.entries(variables)) {
    subject = subject.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return subject;
}

function buildElement(
  templateKey: string,
  locale: "ar" | "en",
  variables: Record<string, string>,
): React.ReactElement {
  const props = { locale, variables };
  switch (templateKey) {
    case "channel_expiring_soon":
      return React.createElement(ChannelExpiringSoon, props);
    case "channel_deleted":
      return React.createElement(ChannelDeleted, props);
    case "sla_breach":
      return React.createElement(SlaBreach, props);
    case "followup_due":
      return React.createElement(FollowupDue, props);
    case "new_assignment":
      return React.createElement(NewAssignment, props);
    case "agent_welcome":
      return React.createElement(AgentWelcome, props);
    case "billing_payment_failed":
      return React.createElement(BillingPaymentFailed, props);
    case "billing_subscription_expired":
      return React.createElement(BillingSubscriptionExpired, props);
    default:
      throw new ConvexError(`TEMPLATE_NOT_FOUND: ${templateKey}`);
  }
}

export const sendEmail = internalAction({
  args: {
    to: v.string(),
    templateKey: v.string(),
    locale: v.union(v.literal("ar"), v.literal("en")),
    variables: v.record(v.string(), v.string()),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.log("[EMAIL_SKIP] RESEND_API_KEY not configured");
      return { ok: false, reason: "RESEND_NOT_CONFIGURED" };
    }

    const enrichedVariables: Record<string, string> = {
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://app.wadesk.com",
      ...args.variables,
    };

    const element = buildElement(args.templateKey, args.locale, enrichedVariables);
    const html = await render(element);
    const subject = resolveSubject(args.templateKey, args.locale, enrichedVariables);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "WaDesk <noreply@wadesk.com>",
        to: args.to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[EMAIL_ERROR]", err);
      throw new ConvexError(`EMAIL_SEND_FAILED: ${err}`);
    }

    return { ok: true };
  },
});
