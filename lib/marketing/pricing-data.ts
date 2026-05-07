type Currency = "EGP" | "SAR" | "AED" | "USD";

type PlanPrice = Record<Currency, string>;

type Plan = {
  id: "free" | "starter" | "growth" | "business";
  nameAr: string;
  nameEn: string;
  taglineEn: string;
  taglineAr: string;
  price: PlanPrice;
  originalPriceUSD?: string;
  isFree: boolean;
  agentLimit: number | null;
  channelLimit: number | null;
  conversationLimit: number | null;
  featuresAr: string[];
  featuresEn: string[];
  highlighted: boolean;
};

type FeatureHighlight = {
  id: string;
  icon: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
};

type Differentiator = {
  id: string;
  titleAr: string;
  titleEn: string;
  statementAr: string;
  statementEn: string;
  icon: string;
};

const plans: Plan[] = [
  {
    id: "free",
    nameAr: "مجاني",
    nameEn: "Free",
    taglineEn: "Try WABDesk free — no credit card required.",
    taglineAr: "جرّب WABDesk مجاناً — بدون بطاقة ائتمان.",
    price: { EGP: "0", SAR: "0", AED: "0", USD: "0" },
    isFree: true,
    agentLimit: 2,
    channelLimit: 1,
    conversationLimit: 500,
    featuresAr: [
      "وكيلان — ابدأ مع فريقك الأساسي",
      "رقم واتساب واحد",
      "500 محادثة شهرياً",
      "صندوق وارد مشترك للفريق",
      "تخصيص المحادثات",
      "الردود السريعة",
    ],
    featuresEn: [
      "2 agents — start with your core team",
      "1 WhatsApp number",
      "500 conversations/month",
      "Shared team inbox",
      "Conversation assignment",
      "Quick replies",
    ],
    highlighted: false,
  },
  {
    id: "starter",
    nameAr: "ستارتر",
    nameEn: "Starter",
    taglineEn: "For small teams ready to handle customers like pros.",
    taglineAr: "للفرق الصغيرة الجاهزة لخدمة عملائها باحترافية.",
    price: { EGP: "199", SAR: "49", AED: "49", USD: "15" },
    originalPriceUSD: "19.99",
    isFree: false,
    agentLimit: 5,
    channelLimit: 1,
    conversationLimit: null,
    featuresAr: [
      "حتى 5 وكلاء",
      "رقم واتساب واحد",
      "محادثات غير محدودة",
      "صندوق وارد مشترك",
      "تخصيص المحادثات",
      "الردود السريعة",
      "ملاحظات داخلية للفريق",
      "تحليلات أساسية",
    ],
    featuresEn: [
      "Up to 5 agents",
      "1 WhatsApp number",
      "Unlimited conversations",
      "Shared team inbox",
      "Conversation assignment",
      "Quick replies",
      "Internal notes (team-only)",
      "Basic analytics",
    ],
    highlighted: false,
  },
  {
    id: "growth",
    nameAr: "نمو",
    nameEn: "Growth",
    taglineEn: "The complete toolkit for serious customer service teams.",
    taglineAr: "الأدوات الكاملة لفرق خدمة العملاء الجادة.",
    price: { EGP: "399", SAR: "99", AED: "99", USD: "29" },
    originalPriceUSD: "49.99",
    isFree: false,
    agentLimit: 15,
    channelLimit: 3,
    conversationLimit: null,
    featuresAr: [
      "كل مميزات Starter",
      "حتى 15 وكيلاً",
      "3 أرقام واتساب",
      "محادثات غير محدودة",
      "رسائل البث الجماعي",
      "استطلاعات رضا العملاء (CSAT)",
      "تنبيهات وقت الاستجابة (SLA)",
      "قواعد الأتمتة",
      "تحرير ملف الأعمال",
      "تحليلات متقدمة",
      "دعم ذو أولوية",
    ],
    featuresEn: [
      "Everything in Starter",
      "Up to 15 agents",
      "3 WhatsApp numbers",
      "Unlimited conversations",
      "Broadcast messages",
      "CSAT customer surveys",
      "SLA & response time alerts",
      "Automation rules",
      "Business profile editing",
      "Advanced analytics",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    id: "business",
    nameAr: "أعمال",
    nameEn: "Business",
    taglineEn: "No limits, no compromises — maximum scale.",
    taglineAr: "بلا حدود، بلا تنازلات — أقصى قدرة ممكنة.",
    price: { EGP: "799", SAR: "199", AED: "199", USD: "59" },
    originalPriceUSD: "99.99",
    isFree: false,
    agentLimit: null,
    channelLimit: null,
    conversationLimit: null,
    featuresAr: [
      "كل مميزات Growth",
      "وكلاء غير محدودين",
      "أرقام واتساب غير محدودة",
      "محادثات غير محدودة",
      "وصول API",
      "جلسة تهيئة مخصصة",
      "قواعد SLA متقدمة",
      "دعم مخصص على مدار الساعة",
    ],
    featuresEn: [
      "Everything in Growth",
      "Unlimited agents",
      "Unlimited WhatsApp numbers",
      "Unlimited conversations",
      "API access",
      "Dedicated onboarding session",
      "Advanced SLA rules",
      "24/7 dedicated support",
    ],
    highlighted: false,
  },
];

const features: FeatureHighlight[] = [
  {
    id: "multi-agent-inbox",
    icon: "Users",
    titleAr: "صندوق بريد متعدد الوكلاء",
    titleEn: "Multi-Agent Inbox",
    descriptionAr:
      "ادر محادثات واتساب بفريق كامل من لوحة تحكم واحدة. وزع المحادثات على الوكلاء تلقائياً أو يدوياً.",
    descriptionEn:
      "Manage WhatsApp conversations with your entire team from a single dashboard. Assign chats to agents automatically or manually.",
  },
  {
    id: "real-time-assignment",
    icon: "GitBranch",
    titleAr: "تخصيص فوري للمحادثات",
    titleEn: "Real-Time Assignment",
    descriptionAr:
      "خصص المحادثات للوكلاء المتاحين تلقائياً. ضمان ردود سريعة لكل عميل.",
    descriptionEn:
      "Automatically assign conversations to available agents. Ensure fast responses for every customer.",
  },
  {
    id: "internal-notes",
    icon: "StickyNote",
    titleAr: "ملاحظات داخلية",
    titleEn: "Internal Notes",
    descriptionAr:
      "تواصل مع فريقك داخل المحادثة بدون أن يرى العميل. تنسيق أفضل وحل أسرع للمشاكل.",
    descriptionEn:
      "Communicate with your team inside the conversation without the customer seeing. Better coordination and faster issue resolution.",
  },
  {
    id: "quick-replies",
    icon: "Zap",
    titleAr: "ردود سريعة",
    titleEn: "Quick Replies",
    descriptionAr:
      "احفظ ردود مسبقة وأرسلها بنقرة واحدة. وفّر وقت فريقك وحسّن اتساق الردود.",
    descriptionEn:
      "Save pre-written responses and send them with one click. Save your team's time and improve response consistency.",
  },
];

const differentiators: Differentiator[] = [
  {
    id: "zero-markup",
    titleAr: "بدون رسوم إضافية على رسائل Meta",
    titleEn: "Zero Markup on Meta Messages",
    statementAr:
      "ندفع لـ Meta ما تدفعه أنت بالضبط. لا فوترة مخفية، لا هوامش إضافية. ما تراه هو ما تدفعه.",
    statementEn:
      "We pass through Meta's exact costs to you. No hidden billing, no extra margins. What you see is what you pay.",
    icon: "BadgePercent",
  },
  {
    id: "arabic-first",
    titleAr: "واجهة عربية أولاً",
    titleEn: "Arabic-First UX",
    statementAr:
      "ليست مجرد ترجمة — بل واجهة مصممة للعربية من البداية. تخطيط RTL أصلي، خطوط عربية واضحة، وتجربة مريحة.",
    statementEn:
      "Built for Arab markets — designed right-to-left from day one. Native RTL layout, clear Arabic fonts, and a comfortable experience.",
    icon: "Languages",
  },
  {
    id: "local-currency",
    titleAr: "فوترة بالعملة المحلية",
    titleEn: "Local Currency Billing",
    statementAr:
      "ادفع بالجنيه المصري أو الريال السعودي أو الدرهم الإماراتي أو الدولار الأمريكي. بدون تحويل عملات أو رسوم بنكية إضافية.",
    statementEn:
      "Pay in Egyptian Pounds, Saudi Riyals, UAE Dirhams, or US Dollars. No currency conversion or extra bank fees.",
    icon: "Banknote",
  },
];

export type { Currency, PlanPrice, Plan, FeatureHighlight, Differentiator };
export { plans, features, differentiators };
