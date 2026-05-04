type Locale = "ar" | "en";

interface KlaroConfig {
  version: number;
  elementID: string;
  storageMethod: "cookie";
  cookieName: string;
  cookieExpiresAfterDays: number;
  cookieDomain: undefined;
  privacyPolicy: string;
  default: boolean;
  mustConsent: boolean;
  acceptAll: boolean;
  hideDeclineAll: boolean;
  hideLearnMore: boolean;
  noNotice: boolean;
  htmlTexts: boolean;
  embedded: boolean;
  disablePoweredBy: boolean;
  lang: Locale;
  translations: Record<string, unknown>;
  services: unknown[];
}

export function getKlaroConfig(locale: Locale = "ar"): KlaroConfig {
  return {
    version: 1,
    elementID: "klaro",
    storageMethod: "cookie",
    cookieName: "klaro",
    cookieExpiresAfterDays: 365,
    cookieDomain: undefined,
    privacyPolicy: "/privacy",
    default: false,
    mustConsent: false,
    acceptAll: true,
    hideDeclineAll: false,
    hideLearnMore: false,
    noNotice: false,
    htmlTexts: true,
    embedded: false,
    disablePoweredBy: true,
    lang: locale,
    translations: getTranslations(),
    services: [
      {
        name: "essential",
        title:
          locale === "ar"
            ? "ملفات تعريف الارتباط الأساسية"
            : "Essential Cookies",
        description:
          locale === "ar"
            ? "مطلوبة لتسجيل الدخول وتشغيل المنصة بشكل آمن. لا يمكن تعطيلها."
            : "Required for sign-in and secure platform operation. Cannot be disabled.",
        purposes: ["essential"],
        required: true,
        default: true,
      },
      {
        name: "google-analytics",
        title: "Google Analytics 4",
        description:
          locale === "ar"
            ? "يساعدنا في فهم كيفية استخدام الزوار للموقع لتحسين تجربتهم."
            : "Helps us understand how visitors use the site to improve their experience.",
        purposes: ["analytics"],
        cookies: [/^_ga/, /^_gid/, /^_gat/],
        callback: function (consent: boolean) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const w = window as any;
          if (typeof window !== "undefined" && typeof w.gtag === "function") {
            w.gtag("consent", "update", {
              analytics_storage: consent ? "granted" : "denied",
            });
          }
        },
        required: false,
        optOut: false,
        onlyOnce: true,
      },
      {
        name: "google-tag-manager",
        title: "Google Tag Manager",
        description:
          locale === "ar"
            ? "إدارة وتشغيل أدوات القياس والتسويق الأخرى."
            : "Manages and runs our measurement and marketing tools.",
        purposes: ["analytics", "marketing"],
        cookies: [/^_gtm/],
        required: false,
        optOut: false,
        onlyOnce: true,
      },
      {
        name: "facebook-pixel",
        title: "Facebook Pixel",
        description:
          locale === "ar"
            ? "لقياس فعالية إعلاناتنا على فيسبوك وإنستغرام."
            : "Measures the effectiveness of our ads on Facebook and Instagram.",
        purposes: ["marketing"],
        cookies: [/^_fbp/, /^fr$/],
        callback: function (consent: boolean) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const w = window as any;
          if (typeof window !== "undefined" && typeof w.fbq === "function") {
            w.fbq("consent", consent ? "grant" : "revoke");
          }
        },
        required: false,
        optOut: false,
        onlyOnce: true,
      },
      {
        name: "google-ads",
        title: "Google Ads",
        description:
          locale === "ar"
            ? "لقياس تحويلات الإعلانات وتحسين استهداف الحملات."
            : "Measures ad conversions and improves campaign targeting.",
        purposes: ["marketing"],
        cookies: [/^_gcl/, /^_gac/],
        callback: function (consent: boolean) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const w = window as any;
          if (typeof window !== "undefined" && typeof w.gtag === "function") {
            w.gtag("consent", "update", {
              ad_storage: consent ? "granted" : "denied",
              ad_user_data: consent ? "granted" : "denied",
              ad_personalization: consent ? "granted" : "denied",
            });
          }
        },
        required: false,
        optOut: false,
        onlyOnce: true,
      },
    ],
  };
}

function getTranslations(): Record<string, unknown> {
  return {
    ar: {
      consentNotice: {
        description:
          "نستخدم ملفات تعريف الارتباط (Cookies) لتشغيل المنصة، تحليل الاستخدام، وتحسين خدماتنا. يمكنك قبول الكل أو تخصيص اختياراتك.",
        learnMore: "تخصيص الإعدادات",
      },
      consentModal: {
        title: "إعدادات ملفات تعريف الارتباط",
        description:
          "يمكنك التحكم في الخدمات التي تجمع بياناتك. الخدمات الأساسية مطلوبة لتشغيل المنصة بشكل صحيح.",
      },
      ok: "قبول الكل",
      acceptAll: "قبول الكل",
      acceptSelected: "حفظ الاختيار",
      decline: "رفض الكل",
      close: "إغلاق",
      save: "حفظ",
      privacyPolicy: {
        name: "سياسة الخصوصية",
        text: "لمعرفة المزيد، اقرأ {privacyPolicy}.",
      },
      purposeItem: {
        service: "خدمة",
        services: "خدمات",
      },
      contextualConsent: {
        description: "هذا المحتوى من {title}. هل توافق على تحميله؟",
        acceptOnce: "نعم",
        acceptAlways: "نعم وحفظ الموافقة",
      },
      purposes: {
        essential: { title: "أساسية", description: "ضرورية لتشغيل المنصة." },
        analytics: {
          title: "التحليلات",
          description: "لفهم كيفية استخدام الموقع.",
        },
        marketing: {
          title: "التسويق",
          description: "لقياس فعالية الإعلانات.",
        },
      },
      service: {
        disableAll: {
          title: "تفعيل/تعطيل الكل",
          description: "استخدم هذا للتفعيل أو التعطيل دفعة واحدة.",
        },
        optOut: { title: "(opt-out)", description: "مفعّل افتراضياً." },
        required: { title: "(مطلوب)", description: "لا يمكن تعطيله." },
        purposes: "الأغراض",
        purpose: "الغرض",
      },
    },
    en: {
      consentNotice: {
        description:
          "We use cookies to run the platform, analyze usage, and improve our services. You can accept all or customize your choices.",
        learnMore: "Customize",
      },
      consentModal: {
        title: "Cookie Preferences",
        description:
          "Control which services collect your data. Essential services are required for the platform to work correctly.",
      },
      ok: "Accept all",
      acceptAll: "Accept all",
      acceptSelected: "Save selection",
      decline: "Decline all",
      close: "Close",
      save: "Save",
      privacyPolicy: {
        name: "Privacy Policy",
        text: "Read more in our {privacyPolicy}.",
      },
      purposeItem: {
        service: "service",
        services: "services",
      },
      contextualConsent: {
        description: "This content is from {title}. Do you want to load it?",
        acceptOnce: "Yes",
        acceptAlways: "Yes and save consent",
      },
      purposes: {
        essential: {
          title: "Essential",
          description: "Required for the platform to function.",
        },
        analytics: {
          title: "Analytics",
          description: "Help us understand site usage.",
        },
        marketing: {
          title: "Marketing",
          description: "Measure ad effectiveness.",
        },
      },
      service: {
        disableAll: {
          title: "Enable/disable all",
          description: "Toggle all services at once.",
        },
        optOut: { title: "(opt-out)", description: "Enabled by default." },
        required: { title: "(required)", description: "Cannot be disabled." },
        purposes: "Purposes",
        purpose: "Purpose",
      },
    },
  };
}
