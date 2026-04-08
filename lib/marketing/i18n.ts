"use client";

import { useState, useEffect, useCallback } from "react";

type MarketingLocale = "ar" | "en";

type Dictionary = Record<string, { ar: string; en: string }>;

const dictionary: Dictionary = {
  "nav.signIn": { ar: "تسجيل الدخول", en: "Sign In" },
  "nav.signUp": { ar: "ابدأ مجاناً", en: "Start Free" },
  "nav.dashboard": { ar: "الذهاب إلى لوحة التحكم", en: "Go to Dashboard" },
  "nav.features": { ar: "المميزات", en: "Features" },
  "nav.pricing": { ar: "الأسعار", en: "Pricing" },
  "nav.whyWadesk": { ar: "لماذا وا ديسك؟", en: "Why WaDesk?" },
  "hero.title": {
    ar: "صندوق بريد WhatsApp للفرق",
    en: "WhatsApp Team Inbox",
  },
  "hero.subtitle": {
    ar: "منصة دعم عملاء على واتساب للشركات الصغيرة والمتوسطة في مصر والخليج. إدارة محادثات واتساب بفريق متعدد الوكلاء.",
    en: "WhatsApp customer support platform for small and medium businesses in Egypt and the Gulf. Manage WhatsApp conversations with a multi-agent team.",
  },
  "cta.signup": { ar: "ابدأ مجاناً", en: "Start Free" },
  "cta.dashboard": {
    ar: "الذهاب إلى لوحة التحكم",
    en: "Go to Dashboard",
  },
  "cta.learnMore": { ar: "تعرف أكثر", en: "Learn More" },
  "cta.startNow": { ar: "ابدأ الآن", en: "Start Now" },
  "cta.contactUs": { ar: "تواصل معنا", en: "Contact Us" },
  "features.heading": { ar: "المميزات", en: "Features" },
  "pricing.heading": { ar: "الأسعار", en: "Pricing" },
  "pricing.noCard": {
    ar: "لا يلزم بطاقة ائتمانية",
    en: "No credit card required",
  },
  "pricing.month": { ar: "/ شهرياً", en: "/ month" },
  "pricing.agents": { ar: "وكلاء", en: "agents" },
  "pricing.channels": { ar: "إدارات", en: "departments" },
  "pricing.unlimited": { ar: "غير محدود", en: "Unlimited" },
  "pricing.bestValue": { ar: "أفضل قيمة", en: "Best Value" },
  "differentiators.heading": {
    ar: "لماذا وا ديسك؟",
    en: "Why WaDesk?",
  },
  "footer.signUp": { ar: "إنشاء حساب", en: "Sign Up" },
  "footer.signIn": { ar: "تسجيل الدخول", en: "Sign In" },
  "footer.pricing": { ar: "الأسعار", en: "Pricing" },
  "footer.copyright": {
    ar: "© 2026 وا ديسك. جميع الحقوق محفوظة.",
    en: "© 2026 WaDesk. All rights reserved.",
  },
};

function t(locale: MarketingLocale, key: string): string {
  const entry = dictionary[key];
  if (!entry) return key;
  return entry[locale];
}

const STORAGE_KEY = "wadesk-marketing-locale";

function useMarketingLocale() {
  const [locale, setLocaleState] = useState<MarketingLocale>("ar");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "ar" || stored === "en") {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((newLocale: MarketingLocale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
  }, []);

  return { locale, setLocale };
}

export type { MarketingLocale };
export { t, useMarketingLocale };
