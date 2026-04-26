"use node";

import { internalAction } from "../_generated/server";
import { v, ConvexError } from "convex/values";

type EmailTemplate = {
  subject: string;
  body: string;
  isHtml?: boolean;
};

const TEMPLATES: Record<string, Record<string, EmailTemplate>> = {
  sla_breach: {
    ar: {
      subject: "تنبيه: تجاوز فترة الاستجابة المسموحة",
      body: `مرحباً،

تم تجاوز فترة الاستجابة المسموحة في محادثة مع {{contactName}}.

يرجى الرد في أقرب وقت ممكن.

شكراً لك، فريق WaDesk`,
    },
    en: {
      subject: "Alert: SLA Response Time Exceeded",
      body: `Hello,

The SLA response time has been exceeded for a conversation with {{contactName}}.

Please respond as soon as possible.

Thanks,
WaDesk Team`,
    },
  },
  followup_due: {
    ar: {
      subject: "تنبيه: متابعة مستحقة",
      body: `مرحباً،

لديك متابعة مستحقة مع {{contactName}}.

يرجى إكمال المتابعة.

شكراً لك، فريق WaDesk`,
    },
    en: {
      subject: "Alert: Follow-up Due",
      body: `Hello,

You have a follow-up due with {{contactName}}.

Please complete the follow-up.

Thanks,
WaDesk Team`,
    },
  },
  new_assignment: {
    ar: {
      subject: "إشعار: محادثة جديدة",
      body: `مرحباً،

تمت محادثة جديدة مع {{contactName}}.

تسجيل الدخول إلى WaDesk للرد.

شكراً لك، فريق WaDesk`,
    },
    en: {
      subject: "Notification: New Conversation",
      body: `Hello,

A new conversation has started with {{contactName}}.

Log in to WaDesk to reply.

Thanks,
WaDesk Team`,
    },
  },
  channel_expiring_soon: {
    ar: {
      subject: "إجراء مطلوب: سيتم حذف رقم واتساب خلال {{daysLeft}} أيام",
      body: `مرحباً،

رقم واتساب "{{channelName}}" غير متصل وسيتم حذفه نهائياً خلال {{daysLeft}} أيام (في {{deleteDate}}).

لمنع الحذف، أعد توصيل رقمك من الإعدادات > أرقام واتساب.

شكراً،
فريق WaDesk`,
    },
    en: {
      subject: "Action Required: WhatsApp Number Deletes in {{daysLeft}} Days",
      body: `Hello,

Your WhatsApp number "{{channelName}}" has been disconnected and will be permanently deleted in {{daysLeft}} days (on {{deleteDate}}).

To prevent deletion, reconnect from Settings > WhatsApp Numbers.

Thanks,
WaDesk Team`,
    },
  },
  channel_deleted: {
    ar: {
      subject: "تم حذف رقم واتساب نهائياً",
      body: `مرحباً،

تم حذف رقم واتساب "{{channelName}}" وجميع بياناته (محادثات، رسائل، أقسام) نهائياً لأنه ظل غير متصل لمدة 30 يوماً.

شكراً،
فريق WaDesk`,
    },
    en: {
      subject: "WhatsApp Number Permanently Deleted",
      body: `Hello,

Your WhatsApp number "{{channelName}}" and all its data (conversations, messages, departments) have been permanently deleted after 30 days of being disconnected.

Thanks,
WaDesk Team`,
    },
  },
};

export const sendEmail = internalAction({
  args: {
    to: v.string(),
    templateKey: v.string(),
    locale: v.union(v.literal("ar"), v.literal("en")),
    variables: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.log("[EMAIL_SKIP] RESEND_API_KEY not configured");
      return { ok: false, reason: "RESEND_NOT_CONFIGURED" };
    }

    const template = TEMPLATES[args.templateKey]?.[args.locale];
    if (!template) {
      throw new ConvexError(`TEMPLATE_NOT_FOUND: ${args.templateKey}`);
    }

    let body = template.body;
    for (const [key, value] of Object.entries(args.variables)) {
      body = body.replace(new RegExp(`{{${key}}}`, "g"), value);
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "WaDesk <noreply@wadesk.com>",
        to: args.to,
        subject: template.subject,
        text: body,
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