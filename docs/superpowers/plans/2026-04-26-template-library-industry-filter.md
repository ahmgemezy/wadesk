# Template Library Industry & Purpose Filter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add industry tabs and purpose chips to the Template Library so users can browse templates by their business vertical (E-commerce, Healthcare, etc.) and by Meta purpose (Marketing / Utility / Authentication).

**Architecture:** Pure frontend change — all 66 library templates live in `lib/templateLibrary.ts` as static data. Add an `industries: Industry[]` field to each template, new type/constant exports, then update the tab component (new industry tabs + purpose chips, replacing the old type filter) and card component (merged purpose+type badge + industry tags in footer).

**Tech Stack:** TypeScript, React, Next.js App Router, Tailwind CSS, shadcn/ui `Badge`

---

## Files Changed

| File | Change |
|---|---|
| `lib/templateLibrary.ts` | Add `Industry` type, `INDUSTRY_LABELS` constant, `industries` field to `LibraryTemplate`, tag all 66 templates |
| `components/templates/library-template-card.tsx` | Replace type badge with merged purpose+type badge; add industry tags (max 2 + overflow) |
| `components/templates/template-library-tab.tsx` | Add `industryFilter` + `purposeFilter` state; add industry tab bar; replace type filter buttons with purpose chips; update `filtered` memo |

---

## Task 1: Add `Industry` type, `INDUSTRY_LABELS`, and update `LibraryTemplate` in `lib/templateLibrary.ts`

**Files:**
- Modify: `lib/templateLibrary.ts`

- [ ] **Step 1: Add the `Industry` type and `INDUSTRY_LABELS` constant**

Open `lib/templateLibrary.ts`. After line 1 (the existing type exports), insert:

```ts
export type Industry =
  | "ecommerce"
  | "food"
  | "health"
  | "realestate"
  | "education"
  | "beauty"
  | "auto"
  | "finance"
  | "travel"
  | "general";

export const INDUSTRY_LABELS: Record<Industry, { en: string; ar: string; icon: string }> = {
  ecommerce:  { en: "E-commerce & Retail",  ar: "التجارة الإلكترونية", icon: "🛍️" },
  food:       { en: "Food & Restaurants",   ar: "المطاعم والأكل",      icon: "🍽️" },
  health:     { en: "Healthcare & Clinics", ar: "الصحة والعيادات",     icon: "🏥" },
  realestate: { en: "Real Estate",          ar: "العقارات",            icon: "🏠" },
  education:  { en: "Education & Training", ar: "التعليم والتدريب",    icon: "🎓" },
  beauty:     { en: "Beauty & Salons",      ar: "الجمال والصالونات",   icon: "💅" },
  auto:       { en: "Auto & Services",      ar: "السيارات والخدمات",   icon: "🚗" },
  finance:    { en: "Finance & Insurance",  ar: "المالية والتأمين",    icon: "💰" },
  travel:     { en: "Travel & Tourism",     ar: "السفر والسياحة",      icon: "✈️" },
  general:    { en: "General / Other",      ar: "عام",                 icon: "⚙️" },
};
```

- [ ] **Step 2: Add `industries` field to the `LibraryTemplate` type**

Replace the existing `LibraryTemplate` type (lines 4–13) with:

```ts
export type LibraryTemplate = {
  id: string;
  title: string;
  type: LibraryTemplateType;
  category: string;
  language: "ar" | "en";
  body: string;
  variables: string[];
  metaCategory?: MetaCategory;
  industries: Industry[];
};
```

- [ ] **Step 3: Verify TypeScript catches the missing field**

Run:
```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: errors on every entry in `RAW` complaining `industries` is missing. This confirms the type change is wired up.

- [ ] **Step 4: Commit the type scaffolding**

```bash
git add lib/templateLibrary.ts
git commit -m "feat(template-library): add Industry type and INDUSTRY_LABELS constant"
```

---

## Task 2: Tag all 66 templates with `industries` arrays

**Files:**
- Modify: `lib/templateLibrary.ts` (the `RAW` array)

The rule: `"general"` means the template is universal and will appear under every industry tab. Only tag templates with specific industries when the content is genuinely vertical-specific.

- [ ] **Step 1: Add `industries` to every entry in the `RAW` array**

Apply these changes to the `RAW` array. Every `{...}` entry gets an `industries` field added. Below is the complete updated `RAW` array — replace the existing one in full:

```ts
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
    industries: ["ecommerce", "food", "beauty"],
  },
  {
    id: "promo-flash-sale-en",
    title: "Flash Sale",
    type: "meta",
    category: "promotions",
    language: "en",
    body: "🎉 {{discount}}% OFF everything! Offer valid for {{hours}} hours only. Order now!",
    metaCategory: "MARKETING",
    industries: ["ecommerce", "food", "beauty"],
  },
  {
    id: "promo-seasonal-ar",
    title: "Seasonal Offer",
    type: "meta",
    category: "promotions",
    language: "ar",
    body: "مرحباً {{name}}! بمناسبة {{occasion}}، نقدم لك خصم {{discount}}% باستخدام كود {{code}}. استمتع بالتسوق! 🛍️",
    metaCategory: "MARKETING",
    industries: ["ecommerce", "food", "beauty", "travel"],
  },
  {
    id: "promo-seasonal-en",
    title: "Seasonal Offer",
    type: "meta",
    category: "promotions",
    language: "en",
    body: "Hi {{name}}! To celebrate {{occasion}}, enjoy {{discount}}% off with code {{code}}. Happy shopping! 🛍️",
    metaCategory: "MARKETING",
    industries: ["ecommerce", "food", "beauty", "travel"],
  },
  {
    id: "promo-new-arrival-ar",
    title: "New Arrival",
    type: "meta",
    category: "promotions",
    language: "ar",
    body: "وصل الجديد! 🛍️ تشكيلة {{product}} متاحة الآن. تسوّق قبل نفاد الكمية.",
    metaCategory: "MARKETING",
    industries: ["ecommerce"],
  },
  {
    id: "promo-new-arrival-en",
    title: "New Arrival",
    type: "meta",
    category: "promotions",
    language: "en",
    body: "New arrivals are here! 🛍️ The {{product}} collection is now available. Shop before it sells out.",
    metaCategory: "MARKETING",
    industries: ["ecommerce"],
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
    industries: ["ecommerce", "food"],
  },
  {
    id: "order-confirmed-en",
    title: "Order Confirmed",
    type: "meta",
    category: "orders",
    language: "en",
    body: "✅ Order #{{order_id}} confirmed! We'll start processing right away and notify you when shipped.",
    metaCategory: "UTILITY",
    industries: ["ecommerce", "food"],
  },
  {
    id: "order-shipped-ar",
    title: "Order Shipped",
    type: "meta",
    category: "orders",
    language: "ar",
    body: "📦 طلبك رقم {{order_id}} اتشحن! رقم التتبع: {{tracking_number}}. هيوصلك خلال {{days}} أيام.",
    metaCategory: "UTILITY",
    industries: ["ecommerce"],
  },
  {
    id: "order-shipped-en",
    title: "Order Shipped",
    type: "meta",
    category: "orders",
    language: "en",
    body: "📦 Order #{{order_id}} is on its way! Tracking: {{tracking_number}}. Expected in {{days}} days.",
    metaCategory: "UTILITY",
    industries: ["ecommerce"],
  },
  {
    id: "order-delivered-ar",
    title: "Order Delivered",
    type: "meta",
    category: "orders",
    language: "ar",
    body: "🎉 طلبك رقم {{order_id}} اتوصّل! نتمنى تكون راضي. لو في أي مشكلة تواصل معنا.",
    metaCategory: "UTILITY",
    industries: ["ecommerce", "food"],
  },
  {
    id: "order-delivered-en",
    title: "Order Delivered",
    type: "meta",
    category: "orders",
    language: "en",
    body: "🎉 Order #{{order_id}} has been delivered! Hope you love it. Reach out if anything needs attention.",
    metaCategory: "UTILITY",
    industries: ["ecommerce", "food"],
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
    industries: ["health", "beauty", "auto", "education"],
  },
  {
    id: "appt-confirmed-en",
    title: "Appointment Confirmed",
    type: "meta",
    category: "appointments",
    language: "en",
    body: "✅ Appointment confirmed for {{date}} at {{time}} at {{location}}. See you soon!",
    metaCategory: "UTILITY",
    industries: ["health", "beauty", "auto", "education"],
  },
  {
    id: "appt-reminder-ar",
    title: "Appointment Reminder",
    type: "meta",
    category: "appointments",
    language: "ar",
    body: "⏰ تذكير: موعدك يوم {{date}} الساعة {{time}}. لو محتاج تعيد جدولة تواصل معنا مسبقاً.",
    metaCategory: "UTILITY",
    industries: ["health", "beauty", "auto", "education"],
  },
  {
    id: "appt-reminder-en",
    title: "Appointment Reminder",
    type: "meta",
    category: "appointments",
    language: "en",
    body: "⏰ Reminder: Your appointment is on {{date}} at {{time}}. Need to reschedule? Contact us in advance.",
    metaCategory: "UTILITY",
    industries: ["health", "beauty", "auto", "education"],
  },
  {
    id: "appt-cancelled-ar",
    title: "Appointment Cancelled",
    type: "meta",
    category: "appointments",
    language: "ar",
    body: "❌ تم إلغاء موعدك يوم {{date}}. تواصل معنا لحجز موعد جديد في أي وقت.",
    metaCategory: "UTILITY",
    industries: ["health", "beauty", "auto", "education"],
  },
  {
    id: "appt-cancelled-en",
    title: "Appointment Cancelled",
    type: "meta",
    category: "appointments",
    language: "en",
    body: "❌ Your appointment on {{date}} has been cancelled. Contact us anytime to book a new one.",
    metaCategory: "UTILITY",
    industries: ["health", "beauty", "auto", "education"],
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
    industries: ["ecommerce", "realestate", "finance", "health"],
  },
  {
    id: "payment-received-en",
    title: "Payment Received",
    type: "meta",
    category: "payments",
    language: "en",
    body: "✅ Payment of {{amount}} received on {{date}}. Thank you for your trust!",
    metaCategory: "UTILITY",
    industries: ["ecommerce", "realestate", "finance", "health"],
  },
  {
    id: "payment-due-ar",
    title: "Payment Due",
    type: "meta",
    category: "payments",
    language: "ar",
    body: "📋 تذكير: الفاتورة رقم {{invoice_id}} بقيمة {{amount}} مستحقة بتاريخ {{due_date}}.",
    metaCategory: "UTILITY",
    industries: ["realestate", "finance", "health", "ecommerce"],
  },
  {
    id: "payment-due-en",
    title: "Payment Due",
    type: "meta",
    category: "payments",
    language: "en",
    body: "📋 Reminder: Invoice #{{invoice_id}} for {{amount}} is due on {{due_date}}.",
    metaCategory: "UTILITY",
    industries: ["realestate", "finance", "health", "ecommerce"],
  },
  {
    id: "payment-failed-ar",
    title: "Payment Failed",
    type: "meta",
    category: "payments",
    language: "ar",
    body: "⚠️ للأسف فشلت عملية الدفع رقم {{payment_id}}. تواصل معنا لحل المشكلة في أقرب وقت.",
    metaCategory: "UTILITY",
    industries: ["ecommerce", "finance"],
  },
  {
    id: "payment-failed-en",
    title: "Payment Failed",
    type: "meta",
    category: "payments",
    language: "en",
    body: "⚠️ Payment #{{payment_id}} failed. Please contact us to resolve this as soon as possible.",
    metaCategory: "UTILITY",
    industries: ["ecommerce", "finance"],
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
    industries: ["general"],
  },
  {
    id: "welcome-new-en",
    title: "Welcome New Customer",
    type: "meta",
    category: "welcome",
    language: "en",
    body: "Welcome {{name}}! 🎉 We're thrilled to have you join {{business}}. Our team is ready to help anytime.",
    metaCategory: "MARKETING",
    industries: ["general"],
  },
  {
    id: "welcome-account-ar",
    title: "Account Created",
    type: "meta",
    category: "welcome",
    language: "ar",
    body: "تم إنشاء حسابك في {{business}} بنجاح! يمكنك الآن الاستمتاع بجميع خدماتنا.",
    metaCategory: "UTILITY",
    industries: ["general"],
  },
  {
    id: "welcome-account-en",
    title: "Account Created",
    type: "meta",
    category: "welcome",
    language: "en",
    body: "Your {{business}} account has been successfully created! You can now enjoy all our services.",
    metaCategory: "UTILITY",
    industries: ["general"],
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
    industries: ["general"],
  },
  {
    id: "feedback-csat-en",
    title: "CSAT Request",
    type: "meta",
    category: "feedback",
    language: "en",
    body: "Thanks for contacting {{business}} 😊 How was your experience? Your feedback helps us improve.",
    metaCategory: "UTILITY",
    industries: ["general"],
  },
  {
    id: "feedback-review-ar",
    title: "Review Request",
    type: "meta",
    category: "feedback",
    language: "ar",
    body: "عميلنا العزيز {{name}}، نتمنى تكون راضياً عن خدمتنا. شاركنا رأيك لنتحسن أكثر! 🌟",
    metaCategory: "MARKETING",
    industries: ["general"],
  },
  {
    id: "feedback-review-en",
    title: "Review Request",
    type: "meta",
    category: "feedback",
    language: "en",
    body: "Dear {{name}}, we hope you're satisfied with our service. Share your feedback to help us improve! 🌟",
    metaCategory: "MARKETING",
    industries: ["general"],
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
    industries: ["general", "finance"],
  },
  {
    id: "alert-account-en",
    title: "Account Security Alert",
    type: "meta",
    category: "alerts",
    language: "en",
    body: "⚠️ Your {{business}} account was accessed from a new device on {{date}}. If this wasn't you, contact us immediately.",
    metaCategory: "UTILITY",
    industries: ["general", "finance"],
  },
  {
    id: "alert-service-ar",
    title: "Service Update",
    type: "meta",
    category: "alerts",
    language: "ar",
    body: "📢 إشعار مهم من {{business}}: {{message}}. لأي استفسار تواصل معنا.",
    metaCategory: "UTILITY",
    industries: ["general"],
  },
  {
    id: "alert-service-en",
    title: "Service Update",
    type: "meta",
    category: "alerts",
    language: "en",
    body: "📢 Important update from {{business}}: {{message}}. Contact us for any questions.",
    metaCategory: "UTILITY",
    industries: ["general"],
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
    industries: ["ecommerce", "food", "beauty"],
  },
  {
    id: "reengagement-winback-en",
    title: "Win-Back",
    type: "meta",
    category: "reengagement",
    language: "en",
    body: "We miss you {{name}} 😢 We have new offers just for you. Reach out and let us help!",
    metaCategory: "MARKETING",
    industries: ["ecommerce", "food", "beauty"],
  },
  {
    id: "reengagement-followup-ar",
    title: "Follow-Up",
    type: "meta",
    category: "reengagement",
    language: "ar",
    body: "هل كل شيء تمام؟ آخر تواصل كان منذ {{days}} أيام. فريقنا جاهز لو محتاج أي مساعدة.",
    metaCategory: "UTILITY",
    industries: ["general"],
  },
  {
    id: "reengagement-followup-en",
    title: "Follow-Up",
    type: "meta",
    category: "reengagement",
    language: "en",
    body: "Is everything okay? It's been {{days}} days since we last spoke. Our team is here if you need anything.",
    metaCategory: "UTILITY",
    industries: ["general"],
  },

  // ── QUICK-REPLY: GREETINGS ────────────────────────────────────────────────
  {
    id: "qr-greeting-opening-ar",
    title: "Opening Greeting",
    type: "quick_reply",
    category: "greetings",
    language: "ar",
    body: "أهلاً {{name}}! كيف أقدر أساعدك اليوم؟ 😊",
    industries: ["general"],
  },
  {
    id: "qr-greeting-opening-en",
    title: "Opening Greeting",
    type: "quick_reply",
    category: "greetings",
    language: "en",
    body: "Hi {{name}}! How can I help you today? 😊",
    industries: ["general"],
  },
  {
    id: "qr-greeting-formal-ar",
    title: "Formal Welcome",
    type: "quick_reply",
    category: "greetings",
    language: "ar",
    body: "السلام عليكم ورحمة الله، أهلاً بك في {{business}}. كيف يمكنني خدمتك؟",
    industries: ["general"],
  },
  {
    id: "qr-greeting-formal-en",
    title: "Formal Welcome",
    type: "quick_reply",
    category: "greetings",
    language: "en",
    body: "Hello and welcome to {{business}}. How may I assist you today?",
    industries: ["general"],
  },
  {
    id: "qr-greeting-returning-ar",
    title: "Returning Customer",
    type: "quick_reply",
    category: "greetings",
    language: "ar",
    body: "أهلاً {{name}}! سعيدين بعودتك. كيف نقدر نساعدك؟",
    industries: ["general"],
  },
  {
    id: "qr-greeting-returning-en",
    title: "Returning Customer",
    type: "quick_reply",
    category: "greetings",
    language: "en",
    body: "Welcome back {{name}}! Great to hear from you again. How can we help?",
    industries: ["general"],
  },

  // ── QUICK-REPLY: COMPLAINTS ───────────────────────────────────────────────
  {
    id: "qr-complaint-apology-ar",
    title: "Apology",
    type: "quick_reply",
    category: "complaints",
    language: "ar",
    body: "نعتذر جداً عن الإزعاج {{name}}. هنحل المشكلة دي فوراً ونضمن مش تتكرر.",
    industries: ["general"],
  },
  {
    id: "qr-complaint-apology-en",
    title: "Apology",
    type: "quick_reply",
    category: "complaints",
    language: "en",
    body: "We sincerely apologize for the inconvenience {{name}}. We'll resolve this right away and ensure it doesn't happen again.",
    industries: ["general"],
  },
  {
    id: "qr-complaint-escalation-ar",
    title: "Escalation Acknowledgment",
    type: "quick_reply",
    category: "complaints",
    language: "ar",
    body: "فهمت المشكلة {{name}}. هرفع الموضوع للقسم المختص وهيتواصل معك خلال {{hours}} ساعات.",
    industries: ["general"],
  },
  {
    id: "qr-complaint-escalation-en",
    title: "Escalation Acknowledgment",
    type: "quick_reply",
    category: "complaints",
    language: "en",
    body: "I understand your concern {{name}}. I'm escalating this to the relevant team and they'll contact you within {{hours}} hours.",
    industries: ["general"],
  },

  // ── QUICK-REPLY: SUPPORT ──────────────────────────────────────────────────
  {
    id: "qr-support-troubleshoot-ar",
    title: "Troubleshooting Steps",
    type: "quick_reply",
    category: "support",
    language: "ar",
    body: "جرب الخطوات دي لحل المشكلة:\n1️⃣ أعد تشغيل التطبيق\n2️⃣ امسح الكاش\n3️⃣ حدّث للإصدار الأخير\n\nلو المشكلة استمرت، رجع لنا.",
    industries: ["general"],
  },
  {
    id: "qr-support-troubleshoot-en",
    title: "Troubleshooting Steps",
    type: "quick_reply",
    category: "support",
    language: "en",
    body: "Try these steps to resolve the issue:\n1️⃣ Restart the app\n2️⃣ Clear the cache\n3️⃣ Update to the latest version\n\nLet us know if the issue persists.",
    industries: ["general"],
  },
  {
    id: "qr-support-ticket-ar",
    title: "Support Ticket Created",
    type: "quick_reply",
    category: "support",
    language: "ar",
    body: "تم فتح تذكرة دعم رقم {{ticket_id}} لمشكلتك. هيتواصل معك أحد من فريقنا خلال {{hours}} ساعات.",
    industries: ["general"],
  },
  {
    id: "qr-support-ticket-en",
    title: "Support Ticket Created",
    type: "quick_reply",
    category: "support",
    language: "en",
    body: "Support ticket #{{ticket_id}} has been created. A team member will contact you within {{hours}} hours.",
    industries: ["general"],
  },

  // ── QUICK-REPLY: CLOSING ──────────────────────────────────────────────────
  {
    id: "qr-closing-resolved-ar",
    title: "Issue Resolved",
    type: "quick_reply",
    category: "closing",
    language: "ar",
    body: "تم حل مشكلتك بنجاح! 🎉 لو عندك أي استفسار تاني أنا هنا.",
    industries: ["general"],
  },
  {
    id: "qr-closing-resolved-en",
    title: "Issue Resolved",
    type: "quick_reply",
    category: "closing",
    language: "en",
    body: "Your issue has been resolved! 🎉 If you have any other questions, I'm here to help.",
    industries: ["general"],
  },
  {
    id: "qr-closing-thankyou-ar",
    title: "Thank You & Goodbye",
    type: "quick_reply",
    category: "closing",
    language: "ar",
    body: "شكراً على تواصلك معنا {{name}}! يسعدنا دائماً خدمتك. وداعاً! 👋",
    industries: ["general"],
  },
  {
    id: "qr-closing-thankyou-en",
    title: "Thank You & Goodbye",
    type: "quick_reply",
    category: "closing",
    language: "en",
    body: "Thank you for contacting us {{name}}! It's always a pleasure serving you. Goodbye! 👋",
    industries: ["general"],
  },

  // ── QUICK-REPLY: HANDOFF ──────────────────────────────────────────────────
  {
    id: "qr-handoff-agent-ar",
    title: "Agent Transfer",
    type: "quick_reply",
    category: "handoff",
    language: "ar",
    body: "هحولك لـ {{agent_name}} اللي هيكمل معك. لحظة من فضلك... 🔀",
    industries: ["general"],
  },
  {
    id: "qr-handoff-agent-en",
    title: "Agent Transfer",
    type: "quick_reply",
    category: "handoff",
    language: "en",
    body: "I'm transferring you to {{agent_name}} who will continue assisting you. One moment please... 🔀",
    industries: ["general"],
  },
  {
    id: "qr-handoff-dept-ar",
    title: "Department Transfer",
    type: "quick_reply",
    category: "handoff",
    language: "ar",
    body: "بناءً على استفسارك، هحولك لقسم {{department}}. هيتواصل معك متخصص قريباً.",
    industries: ["general"],
  },
  {
    id: "qr-handoff-dept-en",
    title: "Department Transfer",
    type: "quick_reply",
    category: "handoff",
    language: "en",
    body: "Based on your inquiry, I'm transferring you to the {{department}} department. A specialist will be with you shortly.",
    industries: ["general"],
  },

  // ── QUICK-REPLY: OUT OF HOURS ─────────────────────────────────────────────
  {
    id: "qr-ooh-standard-ar",
    title: "Outside Business Hours",
    type: "quick_reply",
    category: "out_of_hours",
    language: "ar",
    body: "شكراً لتواصلك! ساعات عملنا من {{start_time}} لـ {{end_time}}. هيرد عليك أحد من فريقنا في أقرب وقت.",
    industries: ["general"],
  },
  {
    id: "qr-ooh-standard-en",
    title: "Outside Business Hours",
    type: "quick_reply",
    category: "out_of_hours",
    language: "en",
    body: "Thanks for reaching out! Our hours are {{start_time}} to {{end_time}}. A team member will get back to you as soon as possible.",
    industries: ["general"],
  },
  {
    id: "qr-ooh-holiday-ar",
    title: "Holiday Notice",
    type: "quick_reply",
    category: "out_of_hours",
    language: "ar",
    body: "نحن في إجازة {{holiday_name}} ونعود {{return_date}}. شكراً لتفهمك! 🎉",
    industries: ["general"],
  },
  {
    id: "qr-ooh-holiday-en",
    title: "Holiday Notice",
    type: "quick_reply",
    category: "out_of_hours",
    language: "en",
    body: "We're on {{holiday_name}} holiday and will return on {{return_date}}. Thank you for your understanding! 🎉",
    industries: ["general"],
  },
];
```

- [ ] **Step 2: Verify TypeScript is clean**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (all 66 templates now have `industries`).

- [ ] **Step 3: Commit**

```bash
git add lib/templateLibrary.ts
git commit -m "feat(template-library): tag all 66 templates with industry arrays"
```

---

## Task 3: Update `library-template-card.tsx` — merged badge + industry tags

**Files:**
- Modify: `components/templates/library-template-card.tsx`

Replace the entire file content with:

- [ ] **Step 1: Write the updated card component**

```tsx
"use client";

import { Badge } from "@/components/ui/badge";
import type { LibraryTemplate } from "@/lib/templateLibrary";
import { CATEGORY_LABELS, INDUSTRY_LABELS } from "@/lib/templateLibrary";
import { useT } from "@/lib/i18n/context";

interface Props {
  template: LibraryTemplate;
  onClick: (template: LibraryTemplate) => void;
}

function PurposeBadge({ template, t }: { template: LibraryTemplate; t: (en: string, ar: string) => string }) {
  if (template.type === "quick_reply") {
    return (
      <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 border-0">
        💬 {t("Quick-Reply", "رد سريع")}
      </Badge>
    );
  }
  if (template.metaCategory === "MARKETING") {
    return (
      <Badge variant="secondary" className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-0">
        🎯 {t("Marketing Broadcast", "حملة تسويقية")}
      </Badge>
    );
  }
  if (template.metaCategory === "AUTHENTICATION") {
    return (
      <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0">
        🔐 {t("Auth Broadcast", "حملة مصادقة")}
      </Badge>
    );
  }
  // UTILITY (default for meta)
  return (
    <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-0">
      🔧 {t("Utility Broadcast", "حملة خدمية")}
    </Badge>
  );
}

export function LibraryTemplateCard({ template, onClick }: Props) {
  const t = useT();
  const catMeta = CATEGORY_LABELS[template.category];

  const displayIndustries = template.industries.slice(0, 2);
  const extraCount = template.industries.length - 2;

  return (
    <button
      type="button"
      onClick={() => onClick(template)}
      className="w-full text-start rounded-lg border bg-card hover:bg-accent/50 hover:border-primary/30 transition-colors p-4 flex flex-col gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold leading-tight line-clamp-1">
          {template.title}
        </span>
        <Badge variant="outline" className="shrink-0 text-[10px] uppercase tracking-wider">
          {template.language === "ar" ? "AR" : "EN"}
        </Badge>
      </div>

      <p
        className="text-xs text-muted-foreground line-clamp-2 leading-relaxed"
        dir={template.language === "ar" ? "rtl" : "ltr"}
      >
        {template.body}
      </p>

      <div className="flex flex-wrap gap-1.5 mt-auto pt-1 border-t border-border/50">
        <PurposeBadge template={template} t={t} />
        {catMeta && (
          <Badge variant="outline" className="text-[10px]">
            {catMeta.icon} {t(catMeta.en, catMeta.ar)}
          </Badge>
        )}
        {displayIndustries.map((ind) => {
          const indMeta = INDUSTRY_LABELS[ind];
          return (
            <Badge key={ind} variant="outline" className="text-[10px] text-muted-foreground">
              {indMeta.icon} {t(indMeta.en, indMeta.ar)}
            </Badge>
          );
        })}
        {extraCount > 0 && (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            +{extraCount}
          </Badge>
        )}
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Verify no type errors**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Open the browser and visually verify a card**

Navigate to `http://localhost:3000` (or whichever port the dev server runs on) → Settings → Templates → Template Library tab.

Check:
- Cards show `🎯 Marketing Broadcast` / `🔧 Utility Broadcast` / `💬 Quick-Reply` instead of the old `📢 Meta` / `💬 Quick-Reply`
- Industry tags appear in the footer (e.g., `🛍️ E-commerce`)
- A template with >2 industries shows `+N` overflow badge

- [ ] **Step 4: Commit**

```bash
git add components/templates/library-template-card.tsx
git commit -m "feat(template-library): merged purpose+type badge and industry tags on cards"
```

---

## Task 4: Update `template-library-tab.tsx` — industry tabs + purpose chips + new filter logic

**Files:**
- Modify: `components/templates/template-library-tab.tsx`

- [ ] **Step 1: Write the updated tab component**

Replace the entire file with:

```tsx
"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { LibraryTemplateCard } from "@/components/templates/library-template-card";
import { LibraryTemplatePreview } from "@/components/templates/library-template-preview";
import { MetaSubmitForm } from "@/components/templates/meta-submit-form";
import {
  LIBRARY_TEMPLATES,
  LIBRARY_CATEGORIES,
  CATEGORY_LABELS,
  INDUSTRY_LABELS,
  type LibraryTemplate,
  type Industry,
  type MetaCategory,
} from "@/lib/templateLibrary";
import { useT } from "@/lib/i18n/context";
import { SearchIcon } from "lucide-react";

interface Props {
  onUseQuickReply: (template: LibraryTemplate) => void;
}

const ALL_CATEGORIES = [
  ...LIBRARY_CATEGORIES.meta,
  ...LIBRARY_CATEGORIES.quick_reply,
];

const INDUSTRY_ORDER: Industry[] = [
  "ecommerce", "food", "health", "realestate",
  "education", "beauty", "auto", "finance", "travel", "general",
];

const PURPOSE_FILTERS: { value: "all" | MetaCategory; labelEn: string; labelAr: string }[] = [
  { value: "all",            labelEn: "All purposes",        labelAr: "كل الأغراض" },
  { value: "MARKETING",      labelEn: "🎯 Marketing",         labelAr: "🎯 تسويقي" },
  { value: "UTILITY",        labelEn: "🔧 Utility",           labelAr: "🔧 خدمي" },
  { value: "AUTHENTICATION", labelEn: "🔐 Authentication",    labelAr: "🔐 مصادقة" },
];

export function TemplateLibraryTab({ onUseQuickReply }: Props) {
  const t = useT();
  const plan = useQuery(api.lib.tenants.getCurrentPlan);
  const isFree = plan === "free";

  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState<"all" | Industry>("all");
  const [purposeFilter, setPurposeFilter] = useState<"all" | MetaCategory>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [previewTemplate, setPreviewTemplate] = useState<LibraryTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [metaFormTemplate, setMetaFormTemplate] = useState<LibraryTemplate | null>(null);
  const [metaFormOpen, setMetaFormOpen] = useState(false);

  function handleIndustryFilter(next: "all" | Industry) {
    setIndustryFilter(next);
    setPurposeFilter("all");
    setCategoryFilter("all");
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return LIBRARY_TEMPLATES.filter((tpl) => {
      // "general" tagged templates appear under any specific industry tab
      if (
        industryFilter !== "all" &&
        !tpl.industries.includes(industryFilter) &&
        !tpl.industries.includes("general")
      ) return false;
      // purpose filter: quick_reply has no metaCategory → excluded when purpose is active
      if (purposeFilter !== "all" && tpl.metaCategory !== purposeFilter) return false;
      if (categoryFilter !== "all" && tpl.category !== categoryFilter) return false;
      if (q && !tpl.title.toLowerCase().includes(q) && !tpl.body.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [search, industryFilter, purposeFilter, categoryFilter]);

  function handleCardClick(template: LibraryTemplate) {
    setPreviewTemplate(template);
    setPreviewOpen(true);
  }

  function handleUseQuickReply(template: LibraryTemplate) {
    if (isFree) return;
    onUseQuickReply(template);
  }

  function handleUseMeta(template: LibraryTemplate) {
    if (isFree) return;
    setMetaFormTemplate(template);
    setMetaFormOpen(true);
  }

  return (
    <div className="space-y-4">
      {isFree && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
          {t(
            "Browse templates freely! Upgrade to Starter to save quick-reply templates or submit Meta templates for approval.",
            "تصفّح القوالب بحرية! ارتقِ إلى خطة ستارتر لحفظ قوالب الرد السريع أو إرسال قوالب ميتا للمراجعة.",
          )}
        </div>
      )}

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

      {/* Industry tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1 border-b border-border scrollbar-none" dir="ltr">
        <button
          type="button"
          onClick={() => handleIndustryFilter("all")}
          className={`shrink-0 px-3 py-2 text-xs font-medium rounded-t transition-colors border-b-2 -mb-px ${
            industryFilter === "all"
              ? "border-primary text-foreground bg-muted/50"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          🌐 {t("All", "الكل")}
        </button>
        {INDUSTRY_ORDER.map((ind) => {
          const meta = INDUSTRY_LABELS[ind];
          return (
            <button
              key={ind}
              type="button"
              onClick={() => handleIndustryFilter(ind)}
              className={`shrink-0 px-3 py-2 text-xs font-medium rounded-t transition-colors border-b-2 -mb-px ${
                industryFilter === ind
                  ? "border-primary text-foreground bg-muted/50"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {meta.icon} {t(meta.en, meta.ar)}
            </button>
          );
        })}
      </div>

      {/* Purpose chips */}
      <div className="flex flex-wrap gap-2">
        {PURPOSE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setPurposeFilter(f.value)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              purposeFilter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {t(f.labelEn, f.labelAr)}
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
        {ALL_CATEGORIES.map((cat) => {
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

      <p className="text-xs text-muted-foreground">
        {filtered.length}{" "}
        {filtered.length === 1
          ? t("template", "قالب")
          : filtered.length === 2
            ? t("templates", "قالبان")
            : t("templates", "قوالب")}
      </p>

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

      <LibraryTemplatePreview
        template={previewTemplate}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onUseQuickReply={handleUseQuickReply}
        onUseMeta={handleUseMeta}
        isFree={isFree}
      />

      <MetaSubmitForm
        template={metaFormTemplate}
        open={metaFormOpen}
        onClose={() => setMetaFormOpen(false)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify no type errors**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Visual QA in browser**

Go to Settings → Templates → Template Library. Check these scenarios:

| Scenario | Expected result |
|---|---|
| Click "🏥 Healthcare" tab | Shows only appointment, payment, feedback, CSAT templates + all `general` templates |
| Click "🛍️ E-commerce" tab | Shows flash sale, orders, payments, promotions + general templates |
| Click "🎯 Marketing" purpose chip | Quick-Reply templates disappear; only MARKETING-tagged meta templates remain |
| Click "🔧 Utility" purpose chip | Only UTILITY-tagged meta templates shown |
| Click "📢 Promotions & Offers" category chip | Filters to promotions category within active industry + purpose |
| Click "🏥 Healthcare" then "Marketing" | Intersection: MARKETING templates tagged health (none in current data → shows only `general` MARKETING ones like Welcome, Review Request) |
| Search "flash" | Filters across all active filters |
| Click "🌐 All" | Resets to all 66 templates |

- [ ] **Step 4: Test RTL layout**

Switch UI language to Arabic (if the language toggle exists) or check that the industry tab bar scrolls correctly and the purpose/category chips render properly in RTL.

- [ ] **Step 5: Commit**

```bash
git add components/templates/template-library-tab.tsx
git commit -m "feat(template-library): industry tabs and purpose chips with combined filter logic"
```

---

## Task 5: Final integration check

- [ ] **Step 1: Full type check**

```bash
npx tsc --noEmit
```

Expected: exit 0, no errors.

- [ ] **Step 2: Verify all 66 templates appear under "All" tab**

In the browser, go to Template Library → "All" tab, "All purposes", "All categories". Confirm the count reads **66 templates**.

- [ ] **Step 3: Verify `general` templates appear under every industry tab**

Click each industry tab in turn. Confirm templates like "Opening Greeting", "CSAT Request", and "Outside Business Hours" appear in all of them (they're tagged `general`).

- [ ] **Step 4: Commit any final polish and open PR**

```bash
git add -p  # stage any remaining tweaks
git commit -m "chore(template-library): final polish and QA"
```
