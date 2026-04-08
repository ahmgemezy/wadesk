type Currency = "EGP" | "SAR" | "AED" | "USD";

type PlanPrice = Record<Currency, string>;

type Plan = {
  id: "free" | "starter" | "growth" | "business";
  nameAr: string;
  nameEn: string;
  price: PlanPrice;
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
    price: { EGP: "0", SAR: "0", AED: "0", USD: "0" },
    isFree: true,
    agentLimit: 2,
    channelLimit: 1,
    conversationLimit: 500,
    featuresAr: [
      "وكيلان كحد أقصى",
      "إدارة واتساب واحدة",
      "500 محادثة شهرياً",
      "تخصيص المحادثات",
      "الردود السريعة",
    ],
    featuresEn: [
      "Up to 2 agents",
      "1 WhatsApp department",
      "500 conversations/month",
      "Conversation assignment",
      "Quick replies",
    ],
    highlighted: false,
  },
  {
    id: "starter",
    nameAr: "ستارتر",
    nameEn: "Starter",
    price: { EGP: "199", SAR: "49", AED: "49", USD: "15" },
    isFree: false,
    agentLimit: 5,
    channelLimit: 1,
    conversationLimit: null,
    featuresAr: [
      "5 وكلاء كحد أقصى",
      "إدارة واتساب واحدة",
      "محادثات غير محدودة",
      "تخصيص المحادثات",
      "الردود السريعة",
      "الملاحظات الداخلية",
    ],
    featuresEn: [
      "Up to 5 agents",
      "1 WhatsApp department",
      "Unlimited conversations",
      "Conversation assignment",
      "Quick replies",
      "Internal notes",
    ],
    highlighted: false,
  },
  {
    id: "growth",
    nameAr: "نمو",
    nameEn: "Growth",
    price: { EGP: "399", SAR: "99", AED: "99", USD: "29" },
    isFree: false,
    agentLimit: 15,
    channelLimit: 3,
    conversationLimit: null,
    featuresAr: [
      "15 وكيلاً كحد أقصى",
      "3 إدارات واتساب",
      "محادثات غير محدودة",
      "تخصيص المحادثات",
      "الردود السريعة",
      "الملاحظات الداخلية",
      "تقارير وتحليلات",
      "أولوية الدعم",
    ],
    featuresEn: [
      "Up to 15 agents",
      "3 WhatsApp departments",
      "Unlimited conversations",
      "Conversation assignment",
      "Quick replies",
      "Internal notes",
      "Analytics & reports",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    id: "business",
    nameAr: "أعمال",
    nameEn: "Business",
    price: { EGP: "799", SAR: "199", AED: "199", USD: "59" },
    isFree: false,
    agentLimit: null,
    channelLimit: null,
    conversationLimit: null,
    featuresAr: [
      "وكلاء غير محدودين",
      "إدارات غير محدودة",
      "محادثات غير محدودة",
      "تخصيص المحادثات",
      "الردود السريعة",
      "الملاحظات الداخلية",
      "تقارير وتحليلات متقدمة",
      "دعم مخصص على مدار الساعة",
      "تكامل API",
    ],
    featuresEn: [
      "Unlimited agents",
      "Unlimited WhatsApp departments",
      "Unlimited conversations",
      "Conversation assignment",
      "Quick replies",
      "Internal notes",
      "Advanced analytics & reports",
      "Dedicated 24/7 support",
      "API access",
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
