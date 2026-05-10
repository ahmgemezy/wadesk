# Template Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Sub-agent boundaries:** This plan is explicitly designed for parallel or sequential sub-agent execution. Clear boundaries are marked with `── SUB-AGENT BOUNDARY ──` comments. Each boundary represents an independent unit with no shared state that could cause conflicts. Recommended splits:
> - **Sub-agent 1** → Tasks 1–2 (data layer: static library + Convex action)
> - **Sub-agent 2** → Tasks 3–4 (leaf UI components: card + preview sheet)
> - **Sub-agent 3** → Task 5 (Meta submit form — depends on Task 2 types)
> - **Sub-agent 4** → Task 6 (library tab — depends on Tasks 3–5)
> - **Sub-agent 5** → Task 7 (final wiring — depends on all above)
>
> Each sub-agent MUST read `CLAUDE.md` and `PROJECT_STATE.md` before starting.

**Goal:** Add a curated pre-built template library to Settings → Templates so users can browse categorised examples, preview them, and either save them as quick-reply templates or submit them directly to Meta for approval — all without leaving WABDesk.

**Architecture:** A static TypeScript file (`lib/templateLibrary.ts`) holds ~50 pre-built templates with named `{{variable}}` placeholders. A new "Template Library" tab is added to the existing `TemplatesSettings` component. Clicking a card opens a preview sheet; "Use This Template" either pre-fills the existing create dialog (quick-reply) or opens a `MetaSubmitForm` that calls a new `submitToMeta` Convex action which POSTs to the Meta Graph API and saves the result as a `PENDING` record in `metaTemplates`.

**Tech Stack:** Next.js 15 App Router, Convex actions/mutations, shadcn/ui (`Sheet`, `Select`, `Dialog`, `Tabs` — install needed), Tailwind CSS, TypeScript strict, `useT()` i18n hook, Meta Graph API v25.0

**Spec:** `docs/superpowers/specs/2026-04-25-template-library-design.md`

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `lib/templateLibrary.ts` | **Create** | Static array of ~50 pre-built templates with type definition |
| `components/templates/library-template-card.tsx` | **Create** | Single template card in the grid |
| `components/templates/library-template-preview.tsx` | **Create** | Side sheet preview with WhatsApp bubble and action buttons |
| `components/templates/meta-submit-form.tsx` | **Create** | Dialog form for submitting a Meta template via API |
| `components/templates/template-library-tab.tsx` | **Create** | Full library tab: search, filters, card grid, preview sheet state |
| `components/settings/templates-settings.tsx` | **Modify** | Wrap existing content in a "My Templates" tab, add "Template Library" tab |
| `convex/metaTemplates.ts` | **Modify** | Add `submitToMeta` action |

---

## ── SUB-AGENT 1 BOUNDARY ──

## Task 1: Install shadcn Tabs + create static template library

**Files:**
- Create: `lib/templateLibrary.ts`

- [ ] **Step 1.1: Install shadcn Tabs component**

```bash
cd /Users/ahmedgemmezy/Documents/WABDesk
npx shadcn@latest add tabs --yes
```

Expected: creates `components/ui/tabs.tsx`. Verify:

```bash
ls components/ui/tabs.tsx
```

- [ ] **Step 1.2: Create `lib/templateLibrary.ts`**

```typescript
// lib/templateLibrary.ts

export type LibraryTemplateType = "meta" | "quick_reply";
export type MetaCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";

export type LibraryTemplate = {
  id: string;
  title: string;
  type: LibraryTemplateType;
  category: string;
  language: "ar" | "en";
  body: string;
  variables: string[];
  metaCategory?: MetaCategory;
};

export const LIBRARY_CATEGORIES: Record<LibraryTemplateType, string[]> = {
  meta: [
    "promotions",
    "orders",
    "appointments",
    "payments",
    "welcome",
    "feedback",
    "alerts",
    "reengagement",
  ],
  quick_reply: [
    "greetings",
    "complaints",
    "support",
    "closing",
    "handoff",
    "out_of_hours",
  ],
};

export const CATEGORY_LABELS: Record<string, { en: string; ar: string; icon: string }> = {
  promotions:   { en: "Promotions & Offers",    ar: "العروض والخصومات",    icon: "📢" },
  orders:       { en: "Order Updates",           ar: "تحديثات الطلبات",     icon: "📦" },
  appointments: { en: "Appointments",            ar: "المواعيد",            icon: "📅" },
  payments:     { en: "Payments & Invoices",     ar: "المدفوعات والفواتير", icon: "💳" },
  welcome:      { en: "Welcome & Onboarding",    ar: "الترحيب",             icon: "👋" },
  feedback:     { en: "Feedback & CSAT",         ar: "التقييم",             icon: "⭐" },
  alerts:       { en: "Alerts & Notifications",  ar: "التنبيهات",           icon: "🔔" },
  reengagement: { en: "Re-engagement",           ar: "إعادة التواصل",       icon: "🔄" },
  greetings:    { en: "Greetings",               ar: "التحيات",             icon: "🤝" },
  complaints:   { en: "Complaints & Escalation", ar: "الشكاوى والتصعيد",   icon: "😟" },
  support:      { en: "Technical Support",       ar: "الدعم الفني",         icon: "🛠️" },
  closing:      { en: "Closing & Resolution",    ar: "الإغلاق",             icon: "✅" },
  handoff:      { en: "Handoff & Transfer",      ar: "التحويل",             icon: "🔀" },
  out_of_hours: { en: "Out of Hours",            ar: "خارج أوقات العمل",    icon: "🌙" },
};

function vars(body: string): string[] {
  const matches = body.matchAll(/\{\{(\w+)\}\}/g);
  return [...new Set([...matches].map((m) => m[1].toLowerCase()))];
}

const RAW: Omit<LibraryTemplate, "variables">[] = [
  // ── META: PROMOTIONS ──────────────────────────────────────────────────────
  {
    id: "promo-flash-sale-ar",
    title: "Flash Sale",
    type: "meta",
    category: "promotions",
    language: "ar",
    body: "🎉 خصم {{discount}}% على جميع المنتجات! العرض ساري لمدة {{hours}} ساعة فقط. سارع بالطلب الآن!",
    metaCategory: "MARKETING",
  },
  {
    id: "promo-flash-sale-en",
    title: "Flash Sale",
    type: "meta",
    category: "promotions",
    language: "en",
    body: "🎉 {{discount}}% OFF everything! Offer valid for {{hours}} hours only. Order now!",
    metaCategory: "MARKETING",
  },
  {
    id: "promo-seasonal-ar",
    title: "Seasonal Offer",
    type: "meta",
    category: "promotions",
    language: "ar",
    body: "مرحباً {{name}}! بمناسبة {{occasion}}، نقدم لك خصم {{discount}}% باستخدام كود {{code}}. استمتع بالتسوق! 🛍️",
    metaCategory: "MARKETING",
  },
  {
    id: "promo-seasonal-en",
    title: "Seasonal Offer",
    type: "meta",
    category: "promotions",
    language: "en",
    body: "Hi {{name}}! To celebrate {{occasion}}, enjoy {{discount}}% off with code {{code}}. Happy shopping! 🛍️",
    metaCategory: "MARKETING",
  },
  {
    id: "promo-new-arrival-ar",
    title: "New Arrival",
    type: "meta",
    category: "promotions",
    language: "ar",
    body: "وصل الجديد! 🛍️ تشكيلة {{product}} متاحة الآن. تسوّق قبل نفاد الكمية.",
    metaCategory: "MARKETING",
  },
  {
    id: "promo-new-arrival-en",
    title: "New Arrival",
    type: "meta",
    category: "promotions",
    language: "en",
    body: "New arrivals are here! 🛍️ The {{product}} collection is now available. Shop before it sells out.",
    metaCategory: "MARKETING",
  },

  // ── META: ORDERS ──────────────────────────────────────────────────────────
  {
    id: "order-confirmed-ar",
    title: "Order Confirmed",
    type: "meta",
    category: "orders",
    language: "ar",
    body: "✅ تم تأكيد طلبك رقم {{order_id}}. سنبدأ التجهيز فوراً وسنخطرك عند الشحن.",
    metaCategory: "UTILITY",
  },
  {
    id: "order-confirmed-en",
    title: "Order Confirmed",
    type: "meta",
    category: "orders",
    language: "en",
    body: "✅ Order #{{order_id}} confirmed! We'll start processing right away and notify you when shipped.",
    metaCategory: "UTILITY",
  },
  {
    id: "order-shipped-ar",
    title: "Order Shipped",
    type: "meta",
    category: "orders",
    language: "ar",
    body: "📦 طلبك رقم {{order_id}} اتشحن! رقم التتبع: {{tracking_number}}. هيوصلك خلال {{days}} أيام.",
    metaCategory: "UTILITY",
  },
  {
    id: "order-shipped-en",
    title: "Order Shipped",
    type: "meta",
    category: "orders",
    language: "en",
    body: "📦 Order #{{order_id}} is on its way! Tracking: {{tracking_number}}. Expected in {{days}} days.",
    metaCategory: "UTILITY",
  },
  {
    id: "order-delivered-ar",
    title: "Order Delivered",
    type: "meta",
    category: "orders",
    language: "ar",
    body: "🎉 طلبك رقم {{order_id}} اتوصّل! نتمنى تكون راضي. لو في أي مشكلة تواصل معنا.",
    metaCategory: "UTILITY",
  },
  {
    id: "order-delivered-en",
    title: "Order Delivered",
    type: "meta",
    category: "orders",
    language: "en",
    body: "🎉 Order #{{order_id}} has been delivered! Hope you love it. Reach out if anything needs attention.",
    metaCategory: "UTILITY",
  },

  // ── META: APPOINTMENTS ────────────────────────────────────────────────────
  {
    id: "appt-confirmed-ar",
    title: "Appointment Confirmed",
    type: "meta",
    category: "appointments",
    language: "ar",
    body: "✅ تم تأكيد موعدك يوم {{date}} الساعة {{time}} في {{location}}. نراك قريباً!",
    metaCategory: "UTILITY",
  },
  {
    id: "appt-confirmed-en",
    title: "Appointment Confirmed",
    type: "meta",
    category: "appointments",
    language: "en",
    body: "✅ Appointment confirmed for {{date}} at {{time}} at {{location}}. See you soon!",
    metaCategory: "UTILITY",
  },
  {
    id: "appt-reminder-ar",
    title: "Appointment Reminder",
    type: "meta",
    category: "appointments",
    language: "ar",
    body: "⏰ تذكير: موعدك يوم {{date}} الساعة {{time}}. لو محتاج تعيد جدولة تواصل معنا مسبقاً.",
    metaCategory: "UTILITY",
  },
  {
    id: "appt-reminder-en",
    title: "Appointment Reminder",
    type: "meta",
    category: "appointments",
    language: "en",
    body: "⏰ Reminder: Your appointment is on {{date}} at {{time}}. Need to reschedule? Contact us in advance.",
    metaCategory: "UTILITY",
  },
  {
    id: "appt-cancelled-ar",
    title: "Appointment Cancelled",
    type: "meta",
    category: "appointments",
    language: "ar",
    body: "❌ تم إلغاء موعدك يوم {{date}}. تواصل معنا لحجز موعد جديد في أي وقت.",
    metaCategory: "UTILITY",
  },
  {
    id: "appt-cancelled-en",
    title: "Appointment Cancelled",
    type: "meta",
    category: "appointments",
    language: "en",
    body: "❌ Your appointment on {{date}} has been cancelled. Contact us anytime to book a new one.",
    metaCategory: "UTILITY",
  },

  // ── META: PAYMENTS ────────────────────────────────────────────────────────
  {
    id: "payment-received-ar",
    title: "Payment Received",
    type: "meta",
    category: "payments",
    language: "ar",
    body: "✅ استلمنا دفعتك بقيمة {{amount}} بتاريخ {{date}}. شكراً لثقتك بنا!",
    metaCategory: "UTILITY",
  },
  {
    id: "payment-received-en",
    title: "Payment Received",
    type: "meta",
    category: "payments",
    language: "en",
    body: "✅ Payment of {{amount}} received on {{date}}. Thank you for your trust!",
    metaCategory: "UTILITY",
  },
  {
    id: "payment-due-ar",
    title: "Payment Due",
    type: "meta",
    category: "payments",
    language: "ar",
    body: "📋 تذكير: الفاتورة رقم {{invoice_id}} بقيمة {{amount}} مستحقة بتاريخ {{due_date}}.",
    metaCategory: "UTILITY",
  },
  {
    id: "payment-due-en",
    title: "Payment Due",
    type: "meta",
    category: "payments",
    language: "en",
    body: "📋 Reminder: Invoice #{{invoice_id}} for {{amount}} is due on {{due_date}}.",
    metaCategory: "UTILITY",
  },
  {
    id: "payment-failed-ar",
    title: "Payment Failed",
    type: "meta",
    category: "payments",
    language: "ar",
    body: "⚠️ للأسف فشلت عملية الدفع رقم {{payment_id}}. تواصل معنا لحل المشكلة في أقرب وقت.",
    metaCategory: "UTILITY",
  },
  {
    id: "payment-failed-en",
    title: "Payment Failed",
    type: "meta",
    category: "payments",
    language: "en",
    body: "⚠️ Payment #{{payment_id}} failed. Please contact us to resolve this as soon as possible.",
    metaCategory: "UTILITY",
  },

  // ── META: WELCOME ─────────────────────────────────────────────────────────
  {
    id: "welcome-new-ar",
    title: "Welcome New Customer",
    type: "meta",
    category: "welcome",
    language: "ar",
    body: "أهلاً وسهلاً {{name}}! 🎉 يسعدنا انضمامك لعائلة {{business}}. فريقنا جاهز لمساعدتك في أي وقت.",
    metaCategory: "MARKETING",
  },
  {
    id: "welcome-new-en",
    title: "Welcome New Customer",
    type: "meta",
    category: "welcome",
    language: "en",
    body: "Welcome {{name}}! 🎉 We're thrilled to have you join {{business}}. Our team is ready to help anytime.",
    metaCategory: "MARKETING",
  },
  {
    id: "welcome-account-ar",
    title: "Account Created",
    type: "meta",
    category: "welcome",
    language: "ar",
    body: "تم إنشاء حسابك في {{business}} بنجاح! يمكنك الآن الاستمتاع بجميع خدماتنا.",
    metaCategory: "UTILITY",
  },
  {
    id: "welcome-account-en",
    title: "Account Created",
    type: "meta",
    category: "welcome",
    language: "en",
    body: "Your {{business}} account has been successfully created! You can now enjoy all our services.",
    metaCategory: "UTILITY",
  },

  // ── META: FEEDBACK ────────────────────────────────────────────────────────
  {
    id: "feedback-csat-ar",
    title: "CSAT Request",
    type: "meta",
    category: "feedback",
    language: "ar",
    body: "شكراً لتواصلك مع {{business}} 😊 كيف كانت تجربتك معنا؟ ردّك مهم جداً لتطوير خدمتنا.",
    metaCategory: "UTILITY",
  },
  {
    id: "feedback-csat-en",
    title: "CSAT Request",
    type: "meta",
    category: "feedback",
    language: "en",
    body: "Thanks for contacting {{business}} 😊 How was your experience? Your feedback helps us improve.",
    metaCategory: "UTILITY",
  },
  {
    id: "feedback-review-ar",
    title: "Review Request",
    type: "meta",
    category: "feedback",
    language: "ar",
    body: "عميلنا العزيز {{name}}، نتمنى تكون راضياً عن خدمتنا. شاركنا رأيك لنتحسن أكثر! 🌟",
    metaCategory: "MARKETING",
  },
  {
    id: "feedback-review-en",
    title: "Review Request",
    type: "meta",
    category: "feedback",
    language: "en",
    body: "Dear {{name}}, we hope you're satisfied with our service. Share your feedback to help us improve! 🌟",
    metaCategory: "MARKETING",
  },

  // ── META: ALERTS ──────────────────────────────────────────────────────────
  {
    id: "alert-account-ar",
    title: "Account Security Alert",
    type: "meta",
    category: "alerts",
    language: "ar",
    body: "⚠️ تم تسجيل دخول لحسابك في {{business}} من جهاز جديد بتاريخ {{date}}. لو مش أنت، تواصل معنا فوراً.",
    metaCategory: "UTILITY",
  },
  {
    id: "alert-account-en",
    title: "Account Security Alert",
    type: "meta",
    category: "alerts",
    language: "en",
    body: "⚠️ Your {{business}} account was accessed from a new device on {{date}}. If this wasn't you, contact us immediately.",
    metaCategory: "UTILITY",
  },
  {
    id: "alert-service-ar",
    title: "Service Update",
    type: "meta",
    category: "alerts",
    language: "ar",
    body: "📢 إشعار مهم من {{business}}: {{message}}. لأي استفسار تواصل معنا.",
    metaCategory: "UTILITY",
  },
  {
    id: "alert-service-en",
    title: "Service Update",
    type: "meta",
    category: "alerts",
    language: "en",
    body: "📢 Important update from {{business}}: {{message}}. Contact us for any questions.",
    metaCategory: "UTILITY",
  },

  // ── META: RE-ENGAGEMENT ───────────────────────────────────────────────────
  {
    id: "reengagement-winback-ar",
    title: "Win-Back",
    type: "meta",
    category: "reengagement",
    language: "ar",
    body: "مش شايفينك من زمان {{name}} 😢 عندنا عروض جديدة تناسبك. تواصل معنا وهنساعدك!",
    metaCategory: "MARKETING",
  },
  {
    id: "reengagement-winback-en",
    title: "Win-Back",
    type: "meta",
    category: "reengagement",
    language: "en",
    body: "We miss you {{name}} 😢 We have new offers just for you. Reach out and let us help!",
    metaCategory: "MARKETING",
  },
  {
    id: "reengagement-followup-ar",
    title: "Follow-Up",
    type: "meta",
    category: "reengagement",
    language: "ar",
    body: "هل كل شيء تمام؟ آخر تواصل كان منذ {{days}} أيام. فريقنا جاهز لو محتاج أي مساعدة.",
    metaCategory: "UTILITY",
  },
  {
    id: "reengagement-followup-en",
    title: "Follow-Up",
    type: "meta",
    category: "reengagement",
    language: "en",
    body: "Is everything okay? It's been {{days}} days since we last spoke. Our team is here if you need anything.",
    metaCategory: "UTILITY",
  },

  // ── QUICK-REPLY: GREETINGS ────────────────────────────────────────────────
  {
    id: "qr-greeting-opening-ar",
    title: "Opening Greeting",
    type: "quick_reply",
    category: "greetings",
    language: "ar",
    body: "أهلاً {{name}}! كيف أقدر أساعدك اليوم؟ 😊",
  },
  {
    id: "qr-greeting-opening-en",
    title: "Opening Greeting",
    type: "quick_reply",
    category: "greetings",
    language: "en",
    body: "Hi {{name}}! How can I help you today? 😊",
  },
  {
    id: "qr-greeting-formal-ar",
    title: "Formal Welcome",
    type: "quick_reply",
    category: "greetings",
    language: "ar",
    body: "السلام عليكم ورحمة الله، أهلاً بك في {{business}}. كيف يمكنني خدمتك؟",
  },
  {
    id: "qr-greeting-formal-en",
    title: "Formal Welcome",
    type: "quick_reply",
    category: "greetings",
    language: "en",
    body: "Hello and welcome to {{business}}. How may I assist you today?",
  },
  {
    id: "qr-greeting-returning-ar",
    title: "Returning Customer",
    type: "quick_reply",
    category: "greetings",
    language: "ar",
    body: "أهلاً {{name}}! سعيدين بعودتك. كيف نقدر نساعدك؟",
  },
  {
    id: "qr-greeting-returning-en",
    title: "Returning Customer",
    type: "quick_reply",
    category: "greetings",
    language: "en",
    body: "Welcome back {{name}}! Great to hear from you again. How can we help?",
  },

  // ── QUICK-REPLY: COMPLAINTS ───────────────────────────────────────────────
  {
    id: "qr-complaint-apology-ar",
    title: "Apology",
    type: "quick_reply",
    category: "complaints",
    language: "ar",
    body: "نعتذر جداً عن الإزعاج {{name}}. هنحل المشكلة دي فوراً ونضمن مش تتكرر.",
  },
  {
    id: "qr-complaint-apology-en",
    title: "Apology",
    type: "quick_reply",
    category: "complaints",
    language: "en",
    body: "We sincerely apologize for the inconvenience {{name}}. We'll resolve this right away and ensure it doesn't happen again.",
  },
  {
    id: "qr-complaint-escalation-ar",
    title: "Escalation Acknowledgment",
    type: "quick_reply",
    category: "complaints",
    language: "ar",
    body: "فهمت المشكلة {{name}}. هرفع الموضوع للقسم المختص وهيتواصل معك خلال {{hours}} ساعات.",
  },
  {
    id: "qr-complaint-escalation-en",
    title: "Escalation Acknowledgment",
    type: "quick_reply",
    category: "complaints",
    language: "en",
    body: "I understand your concern {{name}}. I'm escalating this to the relevant team and they'll contact you within {{hours}} hours.",
  },

  // ── QUICK-REPLY: SUPPORT ──────────────────────────────────────────────────
  {
    id: "qr-support-troubleshoot-ar",
    title: "Troubleshooting Steps",
    type: "quick_reply",
    category: "support",
    language: "ar",
    body: "جرب الخطوات دي لحل المشكلة:\n1️⃣ أعد تشغيل التطبيق\n2️⃣ امسح الكاش\n3️⃣ حدّث للإصدار الأخير\n\nلو المشكلة استمرت، رجع لنا.",
  },
  {
    id: "qr-support-troubleshoot-en",
    title: "Troubleshooting Steps",
    type: "quick_reply",
    category: "support",
    language: "en",
    body: "Try these steps to resolve the issue:\n1️⃣ Restart the app\n2️⃣ Clear the cache\n3️⃣ Update to the latest version\n\nLet us know if the issue persists.",
  },
  {
    id: "qr-support-ticket-ar",
    title: "Support Ticket Created",
    type: "quick_reply",
    category: "support",
    language: "ar",
    body: "تم فتح تذكرة دعم رقم {{ticket_id}} لمشكلتك. هيتواصل معك أحد من فريقنا خلال {{hours}} ساعات.",
  },
  {
    id: "qr-support-ticket-en",
    title: "Support Ticket Created",
    type: "quick_reply",
    category: "support",
    language: "en",
    body: "Support ticket #{{ticket_id}} has been created. A team member will contact you within {{hours}} hours.",
  },

  // ── QUICK-REPLY: CLOSING ──────────────────────────────────────────────────
  {
    id: "qr-closing-resolved-ar",
    title: "Issue Resolved",
    type: "quick_reply",
    category: "closing",
    language: "ar",
    body: "تم حل مشكلتك بنجاح! 🎉 لو عندك أي استفسار تاني أنا هنا.",
  },
  {
    id: "qr-closing-resolved-en",
    title: "Issue Resolved",
    type: "quick_reply",
    category: "closing",
    language: "en",
    body: "Your issue has been resolved! 🎉 If you have any other questions, I'm here to help.",
  },
  {
    id: "qr-closing-thankyou-ar",
    title: "Thank You & Goodbye",
    type: "quick_reply",
    category: "closing",
    language: "ar",
    body: "شكراً على تواصلك معنا {{name}}! يسعدنا دائماً خدمتك. وداعاً! 👋",
  },
  {
    id: "qr-closing-thankyou-en",
    title: "Thank You & Goodbye",
    type: "quick_reply",
    category: "closing",
    language: "en",
    body: "Thank you for contacting us {{name}}! It's always a pleasure serving you. Goodbye! 👋",
  },

  // ── QUICK-REPLY: HANDOFF ──────────────────────────────────────────────────
  {
    id: "qr-handoff-agent-ar",
    title: "Agent Transfer",
    type: "quick_reply",
    category: "handoff",
    language: "ar",
    body: "هحولك لـ {{agent_name}} اللي هيكمل معك. لحظة من فضلك... 🔀",
  },
  {
    id: "qr-handoff-agent-en",
    title: "Agent Transfer",
    type: "quick_reply",
    category: "handoff",
    language: "en",
    body: "I'm transferring you to {{agent_name}} who will continue assisting you. One moment please... 🔀",
  },
  {
    id: "qr-handoff-dept-ar",
    title: "Department Transfer",
    type: "quick_reply",
    category: "handoff",
    language: "ar",
    body: "بناءً على استفسارك، هحولك لقسم {{department}}. هيتواصل معك متخصص قريباً.",
  },
  {
    id: "qr-handoff-dept-en",
    title: "Department Transfer",
    type: "quick_reply",
    category: "handoff",
    language: "en",
    body: "Based on your inquiry, I'm transferring you to the {{department}} department. A specialist will be with you shortly.",
  },

  // ── QUICK-REPLY: OUT OF HOURS ─────────────────────────────────────────────
  {
    id: "qr-ooh-standard-ar",
    title: "Outside Business Hours",
    type: "quick_reply",
    category: "out_of_hours",
    language: "ar",
    body: "شكراً لتواصلك! ساعات عملنا من {{start_time}} لـ {{end_time}}. هيرد عليك أحد من فريقنا في أقرب وقت.",
  },
  {
    id: "qr-ooh-standard-en",
    title: "Outside Business Hours",
    type: "quick_reply",
    category: "out_of_hours",
    language: "en",
    body: "Thanks for reaching out! Our hours are {{start_time}} to {{end_time}}. A team member will get back to you as soon as possible.",
  },
  {
    id: "qr-ooh-holiday-ar",
    title: "Holiday Notice",
    type: "quick_reply",
    category: "out_of_hours",
    language: "ar",
    body: "نحن في إجازة {{holiday_name}} ونعود {{return_date}}. شكراً لتفهمك! 🎉",
  },
  {
    id: "qr-ooh-holiday-en",
    title: "Holiday Notice",
    type: "quick_reply",
    category: "out_of_hours",
    language: "en",
    body: "We're on {{holiday_name}} holiday and will return on {{return_date}}. Thank you for your understanding! 🎉",
  },
];

export const LIBRARY_TEMPLATES: LibraryTemplate[] = RAW.map((t) => ({
  ...t,
  variables: vars(t.body),
}));
```

- [ ] **Step 1.3: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | grep "templateLibrary" || echo "No errors in templateLibrary"
```

Expected: no output mentioning `templateLibrary`.

- [ ] **Step 1.4: Commit**

```bash
git add components/ui/tabs.tsx lib/templateLibrary.ts
git commit -m "feat(template-library): add shadcn tabs + static template library data"
```

---

## Task 2: Add `submitToMeta` Convex action

**Files:**
- Modify: `convex/metaTemplates.ts`

- [ ] **Step 2.1: Add `submitToMeta` action to `convex/metaTemplates.ts`**

Open `convex/metaTemplates.ts` and add the following at the end of the file (before the last closing brace if there is one, otherwise append):

```typescript
// ── Public action — submit a new template to Meta for approval ────────────

export const submitToMeta = action({
  args: {
    channelId: v.id("channels"),
    name: v.string(),         // lowercase, underscores, unique in WABA
    body: v.string(),         // body with named {{variable}} placeholders
    metaCategory: v.union(
      v.literal("MARKETING"),
      v.literal("UTILITY"),
      v.literal("AUTHENTICATION"),
    ),
    language: v.string(),     // "ar" | "en"
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.orgId) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;

    const channel = await ctx.runQuery(internal.metaTemplates.getChannelInternal, {
      channelId: args.channelId,
      tenantId,
    });
    if (!channel) throw new ConvexError("CHANNEL_NOT_FOUND");

    const token = process.env.META_SYSTEM_USER_TOKEN;
    if (!token) throw new ConvexError("META_SYSTEM_USER_TOKEN not configured");

    // Convert named {{variable}} placeholders to Meta's numbered format {{1}}, {{2}}, ...
    const numberedBody = convertToNumberedVars(args.body);

    const payload = {
      name: args.name,
      language: args.language,
      category: args.metaCategory,
      components: [{ type: "BODY", text: numberedBody }],
    };

    const res = await fetch(
      `${META_BASE}/${channel.wabaId}/message_templates`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await res.json() as Record<string, unknown>;

    if (!res.ok) {
      const errMsg =
        (data?.error as Record<string, unknown> | undefined)?.message ??
        `Meta API error ${res.status}`;
      throw new ConvexError(String(errMsg));
    }

    // Cache the new PENDING template locally
    await ctx.runMutation(internal.metaTemplates.upsertBatch, {
      tenantId,
      channelId: args.channelId,
      wabaId: channel.wabaId,
      templates: [
        {
          name: args.name,
          language: args.language,
          status: "PENDING",
          category: args.metaCategory,
          components: payload.components,
        },
      ],
    });

    return { id: String(data.id ?? ""), status: "PENDING" };
  },
});

function convertToNumberedVars(body: string): string {
  let counter = 0;
  const seen = new Map<string, number>();
  return body.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
    const lower = name.toLowerCase();
    if (!seen.has(lower)) seen.set(lower, ++counter);
    return `{{${seen.get(lower)}}}`;
  });
}
```

- [ ] **Step 2.2: Verify Convex types regenerate cleanly**

```bash
npx convex dev --once 2>&1 | tail -5
```

Expected: exits 0, no TypeScript errors in `metaTemplates.ts`.

- [ ] **Step 2.3: Commit**

```bash
git add convex/metaTemplates.ts
git commit -m "feat(template-library): add submitToMeta Convex action"
```

---

## ── SUB-AGENT 2 BOUNDARY ──

## Task 3: LibraryTemplateCard component

**Files:**
- Create: `components/templates/library-template-card.tsx`

> **Context for sub-agent:** The `LibraryTemplate` type lives in `lib/templateLibrary.ts`. The `useT()` hook from `lib/i18n/context.tsx` returns `(en: string, ar: string) => string`. Use `ms-` / `me-` instead of `ml-` / `mr-` for RTL support.

- [ ] **Step 3.1: Create `components/templates/library-template-card.tsx`**

```typescript
"use client";

import { Badge } from "@/components/ui/badge";
import type { LibraryTemplate } from "@/lib/templateLibrary";
import { CATEGORY_LABELS } from "@/lib/templateLibrary";
import { useT } from "@/lib/i18n/context";

interface Props {
  template: LibraryTemplate;
  onClick: (template: LibraryTemplate) => void;
}

export function LibraryTemplateCard({ template, onClick }: Props) {
  const t = useT();
  const catMeta = CATEGORY_LABELS[template.category];

  return (
    <button
      type="button"
      onClick={() => onClick(template)}
      className="w-full text-start rounded-lg border bg-card hover:bg-accent/50 hover:border-primary/30 transition-colors p-4 flex flex-col gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold leading-tight line-clamp-1">
          {template.title}
        </span>
        <Badge variant="outline" className="shrink-0 text-[10px] uppercase tracking-wider">
          {template.language === "ar" ? "AR" : "EN"}
        </Badge>
      </div>

      {/* Body preview */}
      <p
        className="text-xs text-muted-foreground line-clamp-2 leading-relaxed"
        dir={template.language === "ar" ? "rtl" : "ltr"}
      >
        {template.body}
      </p>

      {/* Badges row */}
      <div className="flex flex-wrap gap-1.5 mt-auto">
        {template.type === "meta" ? (
          <Badge variant="secondary" className="text-[10px] bg-orange-500/10 text-orange-600 dark:text-orange-400 border-0">
            📢 {t("Meta", "ميتا")}
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-0">
            💬 {t("Quick-Reply", "رد سريع")}
          </Badge>
        )}
        {catMeta && (
          <Badge variant="outline" className="text-[10px]">
            {catMeta.icon} {t(catMeta.en, catMeta.ar)}
          </Badge>
        )}
      </div>
    </button>
  );
}
```

- [ ] **Step 3.2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | grep "library-template-card" || echo "No errors"
```

- [ ] **Step 3.3: Commit**

```bash
git add components/templates/library-template-card.tsx
git commit -m "feat(template-library): add LibraryTemplateCard component"
```

---

## Task 4: LibraryTemplatePreview Sheet component

**Files:**
- Create: `components/templates/library-template-preview.tsx`

> **Context for sub-agent:** Shadcn `Sheet` is at `components/ui/sheet.tsx`. The preview renders a WhatsApp-style chat bubble inline (no reuse of `WhatsAppTemplatePreview` which expects Meta's component array format). Variables in the body are highlighted with a green span.

- [ ] **Step 4.1: Create `components/templates/library-template-preview.tsx`**

```typescript
"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCopyIcon } from "lucide-react";
import { toast } from "sonner";
import type { LibraryTemplate } from "@/lib/templateLibrary";
import { CATEGORY_LABELS } from "@/lib/templateLibrary";
import { useT } from "@/lib/i18n/context";

interface Props {
  template: LibraryTemplate | null;
  open: boolean;
  onClose: () => void;
  onUseQuickReply: (template: LibraryTemplate) => void;
  onUseMeta: (template: LibraryTemplate) => void;
}

/** Wraps {{variable}} tokens in a highlighted span for preview rendering */
function highlightVars(body: string): React.ReactNode[] {
  const parts = body.split(/(\{\{\w+\}\})/g);
  return parts.map((part, i) => {
    if (/^\{\{\w+\}\}$/.test(part)) {
      return (
        <span
          key={i}
          className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded px-0.5 font-mono text-xs"
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function LibraryTemplatePreview({
  template,
  open,
  onClose,
  onUseQuickReply,
  onUseMeta,
}: Props) {
  const t = useT();

  if (!template) return null;

  const catMeta = CATEGORY_LABELS[template.category];

  function handleCopy() {
    navigator.clipboard.writeText(template!.body);
    toast.success(t("Copied to clipboard", "تم النسخ"));
  }

  function handleUse() {
    if (template!.type === "meta") {
      onUseMeta(template!);
    } else {
      onUseQuickReply(template!);
    }
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="end" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-lg">{template.title}</SheetTitle>
          <div className="flex flex-wrap gap-1.5">
            {template.type === "meta" ? (
              <Badge variant="secondary" className="text-xs bg-orange-500/10 text-orange-600 dark:text-orange-400 border-0">
                📢 Meta
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-0">
                💬 {t("Quick-Reply", "رد سريع")}
              </Badge>
            )}
            {catMeta && (
              <Badge variant="outline" className="text-xs">
                {catMeta.icon} {t(catMeta.en, catMeta.ar)}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs uppercase">
              {template.language}
            </Badge>
          </div>
        </SheetHeader>

        {/* WhatsApp bubble preview */}
        <div className="rounded-xl bg-[#0a1628] p-3 mb-4">
          <div
            className="inline-block bg-[#1f2c34] rounded-lg px-3 py-2 text-sm text-[#e9edef] leading-relaxed max-w-full"
            dir={template.language === "ar" ? "rtl" : "ltr"}
          >
            {highlightVars(template.body)}
            <div className="text-[10px] text-[#8696a0] mt-1 text-end">✓✓ 9:41 AM</div>
          </div>
        </div>

        {/* Variables */}
        {template.variables.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              {t("Variables", "المتغيرات")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {template.variables.map((v) => (
                <Badge
                  key={v}
                  variant="outline"
                  className="text-xs font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                >
                  {`{{${v}}}`}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Type-specific note */}
        {template.type === "meta" ? (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 mb-4">
            ⚠️{" "}
            {t(
              "Meta templates require approval before use in broadcasts. Submitting will send it to Meta for review.",
              "قوالب ميتا تحتاج موافقة قبل الاستخدام في الحملات. الإرسال سيذهب إلى ميتا للمراجعة.",
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 mb-4">
            ✅{" "}
            {t(
              "Quick-reply templates are ready to use immediately — no Meta approval needed.",
              "قوالب الرد السريع جاهزة للاستخدام فوراً — لا تحتاج موافقة ميتا.",
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button className="flex-1" onClick={handleUse}>
            {template.type === "meta"
              ? t("Submit to Meta", "إرسال لميتا")
              : t("Use This Template", "استخدم هذا القالب")}
          </Button>
          <Button variant="outline" size="icon" onClick={handleCopy} title={t("Copy body", "نسخ النص")}>
            <ClipboardCopyIcon className="size-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 4.2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | grep "library-template-preview" || echo "No errors"
```

- [ ] **Step 4.3: Commit**

```bash
git add components/templates/library-template-preview.tsx
git commit -m "feat(template-library): add LibraryTemplatePreview sheet component"
```

---

## ── SUB-AGENT 3 BOUNDARY ──

## Task 5: MetaSubmitForm component

**Files:**
- Create: `components/templates/meta-submit-form.tsx`

> **Context for sub-agent:** Reads `api.channels.listForTenant` (returns `{ _id, displayName, displayPhone, wabaId }[]`). Calls `useAction(api.metaTemplates.submitToMeta)`. The `convertToNameSlug` helper converts a template title to a safe Meta template name. Shadcn `Select` is at `components/ui/select.tsx`. `Dialog` is at `components/ui/dialog.tsx`.

- [ ] **Step 5.1: Create `components/templates/meta-submit-form.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import type { LibraryTemplate, MetaCategory } from "@/lib/templateLibrary";
import { useT } from "@/lib/i18n/context";

interface Props {
  template: LibraryTemplate | null;
  open: boolean;
  onClose: () => void;
}

const META_CATEGORIES: MetaCategory[] = ["MARKETING", "UTILITY", "AUTHENTICATION"];

/** Converts a human-readable title to a Meta-safe template name slug */
function toNameSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

export function MetaSubmitForm({ template, open, onClose }: Props) {
  const t = useT();
  const channels = useQuery(api.channels.listForTenant) as
    | { _id: string; displayName: string; displayPhone?: string; wabaId: string }[]
    | undefined;
  const submitToMeta = useAction(api.metaTemplates.submitToMeta);

  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [metaCategory, setMetaCategory] = useState<MetaCategory>("MARKETING");
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [channelId, setChannelId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from template whenever dialog opens
  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen && template) {
      setName(toNameSlug(template.title));
      setBody(template.body);
      setMetaCategory(template.metaCategory ?? "MARKETING");
      setLanguage(template.language);
      setChannelId(channels?.[0]?._id ?? "");
      setError(null);
    }
    if (!nextOpen) onClose();
  }

  async function handleSubmit() {
    if (!channelId || !name.trim() || !body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitToMeta({
        channelId: channelId as Id<"channels">,
        name: name.trim(),
        body: body.trim(),
        metaCategory,
        language,
      });
      toast.success(
        t(
          "Template submitted — Meta will review it within a few hours",
          "تم إرسال القالب — ستراجعه ميتا خلال بضع ساعات",
        ),
      );
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const nameIsValid = /^[a-z0-9_]+$/.test(name.trim()) && name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Submit Template to Meta", "إرسال القالب لميتا")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Template name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              {t("Template Name", "اسم القالب")}
              <span className="ms-1 text-xs text-muted-foreground font-normal">
                {t("(lowercase + underscores only)", "(أحرف صغيرة ومسطّرات فقط)")}
              </span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              dir="ltr"
              placeholder="flash_sale_offer"
              className={!nameIsValid && name.length > 0 ? "border-destructive" : ""}
            />
            {!nameIsValid && name.length > 0 && (
              <p className="text-xs text-destructive">
                {t("Only lowercase letters, numbers, and underscores allowed", "أحرف صغيرة وأرقام ومسطّرات فقط")}
              </p>
            )}
          </div>

          {/* Template body */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("Template Body", "نص القالب")}</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-28 resize-none"
              dir="auto"
            />
            <p className="text-xs text-muted-foreground">
              {t(
                "Variables like {{name}} are auto-converted to {{1}}, {{2}}, ... on submit.",
                "المتغيرات مثل {{name}} تُحوَّل تلقائياً إلى {{1}}, {{2}}, ... عند الإرسال.",
              )}
            </p>
          </div>

          {/* Meta category + language row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("Meta Category", "فئة ميتا")}</label>
              <Select value={metaCategory} onValueChange={(v) => setMetaCategory(v as MetaCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {META_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("Language", "اللغة")}</label>
              <Select value={language} onValueChange={(v) => setLanguage(v as "ar" | "en")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية (ar)</SelectItem>
                  <SelectItem value="en">English (en)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Channel selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("Submit to Channel", "إرسال إلى القناة")}</label>
            <Select value={channelId} onValueChange={setChannelId}>
              <SelectTrigger>
                <SelectValue placeholder={t("Select channel…", "اختر القناة...")} />
              </SelectTrigger>
              <SelectContent>
                {channels?.map((ch) => (
                  <SelectItem key={ch._id} value={ch._id}>
                    {ch.displayName}
                    {ch.displayPhone ? ` — ${ch.displayPhone}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Inline error */}
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
              ⚠️ {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t mt-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t("Cancel", "إلغاء")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !channelId || !nameIsValid || !body.trim()}
          >
            {submitting && <Loader2Icon className="size-4 me-2 animate-spin" />}
            {t("Submit to Meta for Approval", "إرسال لميتا للمراجعة")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5.2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | grep "meta-submit-form" || echo "No errors"
```

- [ ] **Step 5.3: Commit**

```bash
git add components/templates/meta-submit-form.tsx
git commit -m "feat(template-library): add MetaSubmitForm component"
```

---

## ── SUB-AGENT 4 BOUNDARY ──

## Task 6: TemplateLibraryTab component

**Files:**
- Create: `components/templates/template-library-tab.tsx`

> **Context for sub-agent:**
> - `LibraryTemplateCard` is at `components/templates/library-template-card.tsx`
> - `LibraryTemplatePreview` is at `components/templates/library-template-preview.tsx`
> - `MetaSubmitForm` is at `components/templates/meta-submit-form.tsx`
> - `LIBRARY_TEMPLATES`, `LIBRARY_CATEGORIES`, `CATEGORY_LABELS`, `LibraryTemplate`, `LibraryTemplateType` are all exported from `lib/templateLibrary.ts`
> - This component receives `onUseQuickReply(template)` as a prop — the parent (`TemplatesSettings`) will open its own create dialog pre-filled using this callback
> - All filtering is client-side (static data, no Convex query needed)

- [ ] **Step 6.1: Create `components/templates/template-library-tab.tsx`**

```typescript
"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LibraryTemplateCard } from "@/components/templates/library-template-card";
import { LibraryTemplatePreview } from "@/components/templates/library-template-preview";
import { MetaSubmitForm } from "@/components/templates/meta-submit-form";
import {
  LIBRARY_TEMPLATES,
  LIBRARY_CATEGORIES,
  CATEGORY_LABELS,
  type LibraryTemplate,
  type LibraryTemplateType,
} from "@/lib/templateLibrary";
import { useT } from "@/lib/i18n/context";
import { SearchIcon } from "lucide-react";

interface Props {
  onUseQuickReply: (template: LibraryTemplate) => void;
}

type TypeFilter = "all" | LibraryTemplateType;

export function TemplateLibraryTab({ onUseQuickReply }: Props) {
  const t = useT();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [previewTemplate, setPreviewTemplate] = useState<LibraryTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [metaFormTemplate, setMetaFormTemplate] = useState<LibraryTemplate | null>(null);
  const [metaFormOpen, setMetaFormOpen] = useState(false);

  // Derive active categories based on type filter
  const activeCategories = useMemo<string[]>(() => {
    if (typeFilter === "all") {
      return [
        ...LIBRARY_CATEGORIES.meta,
        ...LIBRARY_CATEGORIES.quick_reply,
      ];
    }
    return LIBRARY_CATEGORIES[typeFilter];
  }, [typeFilter]);

  // Reset category filter when type changes
  function handleTypeFilter(next: TypeFilter) {
    setTypeFilter(next);
    setCategoryFilter("all");
  }

  // Apply all filters
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return LIBRARY_TEMPLATES.filter((tpl) => {
      if (typeFilter !== "all" && tpl.type !== typeFilter) return false;
      if (categoryFilter !== "all" && tpl.category !== categoryFilter) return false;
      if (q && !tpl.title.toLowerCase().includes(q) && !tpl.body.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [search, typeFilter, categoryFilter]);

  function handleCardClick(template: LibraryTemplate) {
    setPreviewTemplate(template);
    setPreviewOpen(true);
  }

  function handleUseQuickReply(template: LibraryTemplate) {
    onUseQuickReply(template);
  }

  function handleUseMeta(template: LibraryTemplate) {
    setMetaFormTemplate(template);
    setMetaFormOpen(true);
  }

  const TYPE_FILTERS: { value: TypeFilter; label: string; labelAr: string }[] = [
    { value: "all",        label: "All",                  labelAr: "الكل" },
    { value: "meta",       label: "📢 Meta (Broadcast)",  labelAr: "📢 ميتا (حملات)" },
    { value: "quick_reply",label: "💬 Quick-Reply",        labelAr: "💬 رد سريع" },
  ];

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          className="ps-9"
          placeholder={t("Search templates…", "البحث في القوالب...")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          dir="auto"
        />
      </div>

      {/* Type filter pills */}
      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => handleTypeFilter(f.value)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              typeFilter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {t(f.label, f.labelAr)}
          </button>
        ))}
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setCategoryFilter("all")}
          className={`rounded-full px-2.5 py-1 text-xs transition-colors border ${
            categoryFilter === "all"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-muted-foreground"
          }`}
        >
          {t("All categories", "كل الفئات")}
        </button>
        {activeCategories.map((cat) => {
          const meta = CATEGORY_LABELS[cat];
          if (!meta) return null;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat === categoryFilter ? "all" : cat)}
              className={`rounded-full px-2.5 py-1 text-xs transition-colors border ${
                categoryFilter === cat
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-muted-foreground"
              }`}
            >
              {meta.icon} {t(meta.en, meta.ar)}
            </button>
          );
        })}
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} {t("templates", "قالب")}
      </p>

      {/* Card grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed bg-muted/30">
          <p className="text-sm text-muted-foreground">
            {t("No templates match your search.", "لا توجد قوالب تطابق بحثك.")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((tpl) => (
            <LibraryTemplateCard
              key={tpl.id}
              template={tpl}
              onClick={handleCardClick}
            />
          ))}
        </div>
      )}

      {/* Preview sheet */}
      <LibraryTemplatePreview
        template={previewTemplate}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onUseQuickReply={handleUseQuickReply}
        onUseMeta={handleUseMeta}
      />

      {/* Meta submit form */}
      <MetaSubmitForm
        template={metaFormTemplate}
        open={metaFormOpen}
        onClose={() => setMetaFormOpen(false)}
      />
    </div>
  );
}
```

- [ ] **Step 6.2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | grep "template-library-tab" || echo "No errors"
```

- [ ] **Step 6.3: Commit**

```bash
git add components/templates/template-library-tab.tsx
git commit -m "feat(template-library): add TemplateLibraryTab component"
```

---

## ── SUB-AGENT 5 BOUNDARY ──

## Task 7: Refactor TemplatesSettings to add tabs

**Files:**
- Modify: `components/settings/templates-settings.tsx`

> **Context for sub-agent:** The current `TemplatesSettings` component manages `messageTemplates` (quick-reply templates). It has `openForCreate()` and `openForEdit()` helpers. We need to:
> 1. Wrap the existing content in a "My Templates" tab using shadcn `Tabs`
> 2. Add a "📚 Template Library" tab rendering `TemplateLibraryTab`
> 3. Extend `openForCreate()` to accept optional pre-fill data so library templates can pre-fill the create dialog
>
> The `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` components come from `@/components/ui/tabs` (installed in Task 1).

- [ ] **Step 7.1: Replace `components/settings/templates-settings.tsx` with the tabbed version**

```typescript
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useT } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { PlusIcon, PencilIcon, Trash2Icon, Loader2Icon } from "lucide-react";
import { extractVariables } from "@/lib/templateHelpers";
import { TemplateLibraryTab } from "@/components/templates/template-library-tab";
import type { LibraryTemplate } from "@/lib/templateLibrary";

export function TemplatesSettings() {
  const t = useT();

  const templates = useQuery(api.messageTemplates.list, {}) as
    | {
        _id: string;
        title: string;
        body: string;
        category?: string;
        language: "ar" | "en";
        variables: string[];
      }[]
    | undefined;

  const createTemplate = useMutation(api.messageTemplates.create);
  const updateTemplate = useMutation(api.messageTemplates.update);
  const removeTemplate = useMutation(api.messageTemplates.remove);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [saving, setSaving] = useState(false);

  const detectedVars = extractVariables(body);

  function openForCreate(prefill?: Pick<LibraryTemplate, "title" | "body" | "category" | "language">) {
    setEditingId(null);
    setTitle(prefill?.title ?? "");
    setBody(prefill?.body ?? "");
    setCategory(prefill?.category ?? "");
    setLanguage(prefill?.language ?? "ar");
    setDialogOpen(true);
  }

  function openForEdit(
    tpl: { _id: string; title: string; body: string; category?: string; language?: "ar" | "en" },
  ) {
    setEditingId(tpl._id);
    setTitle(tpl.title);
    setBody(tpl.body);
    setCategory(tpl.category || "");
    setLanguage(tpl.language ?? "ar");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateTemplate({
          id: editingId as Id<"messageTemplates">,
          title: title.trim(),
          body: body.trim(),
          category: category.trim() || undefined,
          language,
        });
        toast.success(t("Template updated", "تم تحديث القالب"));
      } else {
        await createTemplate({
          title: title.trim(),
          body: body.trim(),
          category: category.trim() || undefined,
          language,
        });
        toast.success(t("Template created", "تم إنشاء القالب"));
      }
      setDialogOpen(false);
    } catch {
      toast.error(t("Failed to save template", "فشل حفظ القالب"));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      await removeTemplate({ id: id as Id<"messageTemplates"> });
      toast.success(t("Template deleted", "تم حذف القالب"));
    } catch {
      toast.error(t("Failed to delete", "فشل الحذف"));
    }
  }

  return (
    <>
      <Tabs defaultValue="my-templates">
        <TabsList className="mb-4">
          <TabsTrigger value="my-templates">
            {t("My Templates", "قوالبي")}
          </TabsTrigger>
          <TabsTrigger value="library">
            📚 {t("Template Library", "مكتبة القوالب")}
          </TabsTrigger>
        </TabsList>

        {/* ── My Templates tab ─────────────────────────────────────────── */}
        <TabsContent value="my-templates" className="space-y-4">
          <div className="flex items-center justify-end">
            <Button onClick={() => openForCreate()}>
              <PlusIcon className="size-4 me-2" />
              {t("Add Template", "إضافة قالب")}
            </Button>
          </div>

          {templates === undefined ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader className="pb-2 pe-16 space-y-0">
                    <Skeleton className="h-5 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed bg-muted/30">
              <h3 className="text-lg font-medium">
                {t("No Templates Yet", "لا توجد قوالب بعد")}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                {t(
                  "Create message templates with placeholders to standardize your replies.",
                  "أنشئ قوالب رسائل بمتغيرات لتوحيد ردودك.",
                )}
              </p>
              <Button variant="outline" onClick={() => openForCreate()}>
                <PlusIcon className="size-4 me-2" />
                {t("Create your first template", "أنشئ قالبك الأول")}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((tpl) => (
                <Card key={tpl._id} className="relative group overflow-hidden flex flex-col">
                  <div className="absolute top-2 inset-e-2 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openForEdit(tpl)}
                    >
                      <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleRemove(tpl._id)}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                  <CardHeader className="pb-2 pe-16 space-y-0 text-start">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <Badge
                        variant={tpl.language === "ar" ? "default" : "outline"}
                        className="w-fit font-normal text-[10px] uppercase tracking-wider"
                      >
                        {tpl.language === "ar" ? "AR" : "EN"}
                      </Badge>
                      {tpl.category && (
                        <Badge
                          variant="secondary"
                          className="w-fit font-normal text-[10px] uppercase tracking-wider"
                        >
                          {tpl.category}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base font-semibold leading-tight line-clamp-1">
                      {tpl.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 text-sm text-muted-foreground space-y-2 text-start">
                    <p className="whitespace-pre-wrap opacity-90 line-clamp-3">
                      {tpl.body}
                    </p>
                    {tpl.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tpl.variables.map((variable) => (
                          <Badge key={variable} variant="outline" className="text-[10px]">
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Template Library tab ──────────────────────────────────────── */}
        <TabsContent value="library">
          <TemplateLibraryTab
            onUseQuickReply={(tpl) => openForCreate(tpl)}
          />
        </TabsContent>
      </Tabs>

      {/* Create / Edit dialog — shared between both tabs */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-130">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? t("Edit Template", "تعديل القالب")
                : t("Add New Template", "إضافة قالب جديد")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("Title", "العنوان")}</label>
              <Input
                placeholder={t("e.g. Welcome Message", "مثال: رسالة ترحيب")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                dir="auto"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("Body", "النص")}</label>
              <Textarea
                placeholder={t(
                  "Hello {{name}}, thank you for contacting us!",
                  "مرحباً {{name}}، شكراً لتواصلك معنا!",
                )}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-35 resize-none"
                dir="auto"
              />
              {detectedVars.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    {t("Variables:", "المتغيرات:")}
                  </span>
                  {detectedVars.map((variable) => (
                    <Badge key={variable} variant="secondary" className="text-xs">
                      {`{{${variable}}}`}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("Category (optional)", "الفئة (اختياري)")}
              </label>
              <Input
                placeholder={t("e.g. Support", "مثال: دعم")}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                dir="auto"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("Language", "اللغة")}</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage("ar")}
                  className={`flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors ${
                    language === "ar"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-muted"
                  }`}
                >
                  العربية
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors ${
                    language === "en"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-muted"
                  }`}
                >
                  English
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("Cancel", "إلغاء")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !title.trim() || !body.trim()}
            >
              {saving && <Loader2Icon className="size-4 me-2 animate-spin" />}
              {t("Save", "حفظ")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 7.2: Run TypeScript check — must be clean (except the 3 pre-existing errors)**

```bash
npx tsc --noEmit 2>&1
```

Expected: only the same 3 pre-existing errors that existed before this feature. No new errors. If new errors appear, fix them before committing.

- [ ] **Step 7.3: Start dev server and verify the page renders**

```bash
npm run dev
```

Open `http://localhost:3000/settings/templates`. Expected:
- Two tabs visible: "My Templates" and "📚 Template Library"
- "My Templates" tab shows existing templates / empty state unchanged
- Clicking "Template Library" tab shows search box, type filter pills, category chips, and template cards grid
- Clicking a card opens the preview sheet
- For quick-reply templates: "Use This Template" closes sheet, opens pre-filled create dialog — save works
- For Meta templates: "Submit to Meta" button opens the MetaSubmitForm dialog

- [ ] **Step 7.4: Commit**

```bash
git add components/settings/templates-settings.tsx
git commit -m "feat(template-library): wire tabs into TemplatesSettings — feature complete"
```

---

## Task 8: Update PROJECT_STATE.md

- [ ] **Step 8.1: Add the feature to PROJECT_STATE.md**

Open `PROJECT_STATE.md` and add to the "Recent Changes" or "Completed Features" section:

```
- template-library: Pre-built template library in Settings → Templates; two tabs (My Templates / Template Library); ~50 curated templates across 14 categories; Arabic + English; preview sheet with WhatsApp bubble; quick-reply templates pre-fill create dialog; Meta templates submit via Convex action to Meta Graph API (POST /{wabaId}/message_templates); variable auto-conversion {{named}} → {{1}}; new files: lib/templateLibrary.ts, components/templates/library-template-card.tsx, components/templates/library-template-preview.tsx, components/templates/meta-submit-form.tsx, components/templates/template-library-tab.tsx; modified: components/settings/templates-settings.tsx, convex/metaTemplates.ts
```

- [ ] **Step 8.2: Commit**

```bash
git add PROJECT_STATE.md
git commit -m "docs: update PROJECT_STATE with template-library feature"
```

---

## Self-Review Checklist

| Spec requirement | Task |
|---|---|
| Both Meta + Quick-Reply templates | Tasks 1, 3, 4, 5, 6, 7 |
| 14 categories (8 Meta + 6 QR), AR + EN | Task 1 |
| Static `lib/templateLibrary.ts` | Task 1 |
| "Template Library" tab on settings page | Task 7 |
| Search + type filter + category chips | Task 6 |
| Card with title, body preview, language badge, type badge, category badge | Task 3 |
| Preview sheet with WhatsApp bubble + variable highlight | Task 4 |
| Type-specific note (amber Meta / green QR) | Task 4 |
| Copy body button | Task 4 |
| Quick-Reply → pre-fills existing create dialog | Tasks 4, 6, 7 |
| Meta → opens submit form | Tasks 4, 6 |
| Submit form: name slug, body, category, language, channel selector | Task 5 |
| Variable auto-conversion {{named}} → {{1}} in Convex action | Task 2 |
| `submitToMeta` Convex action → Meta Graph API | Task 2 |
| Saves as PENDING in `metaTemplates` | Task 2 |
| Inline error on Meta API failure (no form dismiss) | Task 5 |
| Plan gating (Free can browse, Starter+ can save) | Existing `assertTemplateLimitNotReached` in `messageTemplates.create` handles QR limit; Meta submit has no explicit plan gate — Free users cannot submit Meta templates since they have 0 template slots. ⚠️ **Note:** If the team decides Free users should also be blocked from Meta submission (even though those templates don't use a `messageTemplates` slot), add `assertPlanAtLeast(plan, "starter")` at the top of `submitToMeta`. |
| RTL support (dir attributes, ms-/me- spacing) | All components |
| Template name `dir="ltr"` (Meta requirement) | Task 5 |
