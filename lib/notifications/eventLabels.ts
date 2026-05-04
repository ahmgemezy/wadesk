import type { ToggleableEventType } from "@/convex/lib/notificationEvents";

/**
 * Human-readable labels for each toggleable notification event type.
 * Consumed by NotificationsPreferences UI (Stage 4).
 *
 * The ToggleableEventType import is type-only — zero runtime bundle from the
 * Convex module. If TypeScript cannot resolve @/convex/lib/notificationEvents,
 * Stage 1 has not been applied.
 */
export const EVENT_LABELS: Record<
  ToggleableEventType,
  { en: string; ar: string; descriptionEn: string; descriptionAr: string }
> = {
  sla_breach: {
    en: "SLA breach",
    ar: "تجاوز اتفاقية مستوى الخدمة",
    descriptionEn: "Alert when an open conversation exceeds your SLA threshold.",
    descriptionAr: "تنبيه عند تجاوز محادثة مفتوحة عتبة اتفاقية مستوى الخدمة.",
  },
  followup_due: {
    en: "Follow-up due",
    ar: "متابعة مستحقة",
    descriptionEn: "Alert when a scheduled follow-up is sent or fails.",
    descriptionAr: "تنبيه عند إرسال متابعة مجدولة أو فشلها.",
  },
  conversation_transferred: {
    en: "Conversation transferred",
    ar: "محادثة محولة",
    descriptionEn: "Alert when a conversation is transferred to your department.",
    descriptionAr: "تنبيه عند تحويل محادثة إلى قسمك.",
  },
  conversation_assigned: {
    en: "Conversation assigned",
    ar: "محادثة معيّنة",
    descriptionEn: "Alert when a conversation is assigned to you.",
    descriptionAr: "تنبيه عند تعيين محادثة لك.",
  },
  conversation_reopened: {
    en: "Conversation reopened",
    ar: "محادثة أُعيد فتحها",
    descriptionEn: "Alert when a customer replies to a resolved conversation.",
    descriptionAr: "تنبيه عندما يرد عميل على محادثة تم إغلاقها.",
  },
  csat_received: {
    en: "CSAT received",
    ar: "تقييم رضا العملاء وصل",
    descriptionEn: "Alert when a customer submits a satisfaction rating.",
    descriptionAr: "تنبيه عند إرسال عميل تقييم الرضا.",
  },
  channel_expiring_soon: {
    en: "Channel expiring soon",
    ar: "القناة على وشك الانتهاء",
    descriptionEn: "Alert when your WhatsApp channel nears the 30-day retention limit.",
    descriptionAr: "تنبيه عندما تقترب قناة واتساب من حد الاحتفاظ البالغ 30 يوماً.",
  },
};
