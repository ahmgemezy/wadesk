"use client";

import { useSyncExternalStore, useEffect, useCallback } from "react";
import { setLocale as setLocaleCookie } from "@/lib/shell/locale-action";
import { LOCALE_CHANGE_EVENT } from "@/lib/events";

type MarketingLocale = "ar" | "en";

type Dictionary = Record<string, { ar: string; en: string }>;

const dictionary: Dictionary = {
  "nav.signIn": { ar: "تسجيل الدخول", en: "Sign In" },
  "nav.signUp": { ar: "ابدأ مجاناً", en: "Start Free" },
  "nav.dashboard": { ar: "الذهاب إلى لوحة التحكم", en: "Go to Dashboard" },
  "nav.features": { ar: "المميزات", en: "Features" },
  "nav.pricing": { ar: "الأسعار", en: "Pricing" },
  "nav.whyWadesk": { ar: "لماذا واب ديسك؟", en: "Why WABDesk?" },
  "hero.title": {
    ar: "صندوق بريد WhatsApp للفرق",
    en: "WhatsApp Team Inbox",
  },
  "hero.subtitle": {
    ar: "منصة WhatsApp Business متعددة الوكلاء، عربية أولاً، للشركات الصغيرة والمتوسطة في الأسواق الناطقة بالعربية.",
    en: "Arabic-first multi-agent WhatsApp Business platform built for SMBs in Arabic-speaking markets.",
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
    ar: "لماذا واب ديسك؟",
    en: "Why WABDesk?",
  },
  "footer.signUp": { ar: "إنشاء حساب", en: "Sign Up" },
  "footer.signIn": { ar: "تسجيل الدخول", en: "Sign In" },
  "footer.pricing": { ar: "الأسعار", en: "Pricing" },
  "footer.privacy": { ar: "سياسة الخصوصية", en: "Privacy Policy" },
  "footer.terms": { ar: "شروط الخدمة", en: "Terms of Service" },
  "footer.dpa": { ar: "اتفاقية معالجة البيانات", en: "DPA" },
  "footer.cookies": { ar: "سياسة ملفات تعريف الارتباط", en: "Cookie Policy" },
  "footer.cookieSettings": { ar: "إعدادات ملفات تعريف الارتباط", en: "Cookie Settings" },
  "footer.copyright": {
    ar: "© 2026 واب ديسك. جميع الحقوق محفوظة.",
    en: "© 2026 WABDesk. All rights reserved.",
  },
};

function t(locale: MarketingLocale, key: string): string {
  const entry = dictionary[key];
  if (!entry) return key;
  return entry[locale];
}

const STORAGE_KEY = "wabdesk-marketing-locale";

// Module-level store so all hook instances share a single reactive source of truth.
// Without this, LegalPageWrapper and content components each hold independent state
// and toggling locale in the wrapper doesn't re-render the content component.
let _locale: MarketingLocale = "ar";
const _listeners = new Set<() => void>();

function _getSnapshot(): MarketingLocale {
  return _locale;
}

function _subscribe(listener: () => void): () => void {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
}

function useMarketingLocale() {
  // Hydrate from localStorage once on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "ar" || stored === "en") {
      _locale = stored;
      _listeners.forEach((l) => l());
    }
  }, []);

  const locale = useSyncExternalStore(_subscribe, _getSnapshot, () => "ar" as MarketingLocale);

  const setLocale = useCallback((newLocale: MarketingLocale) => {
    _locale = newLocale;
    localStorage.setItem(STORAGE_KEY, newLocale);
    _listeners.forEach((l) => l());
    setLocaleCookie(newLocale);
    window.dispatchEvent(new CustomEvent(LOCALE_CHANGE_EVENT, { detail: newLocale }));
  }, []);

  return { locale, setLocale };
}

export type { MarketingLocale };
export { t, useMarketingLocale };
