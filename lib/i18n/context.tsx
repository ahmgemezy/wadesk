"use client";

import { createContext, useContext } from "react";

type Locale = "ar" | "en";

const LocaleContext = createContext<Locale>("ar");

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Returns a translation function: t("English text", "النص العربي") */
export function useT() {
  const locale = useLocale();
  return (en: string, ar: string): string => (locale === "en" ? en : ar);
}

/** Utility to translate system default labels consistently */
export function useTranslatedLabel() {
  const t = useT();
  return (name: string) => {
    if (!name) return name;
    if (name === "شكوى" || name === "Complaint") return t("Complaint", "شكوى");
    if (name === "استفسار" || name === "Inquiry") return t("Inquiry", "استفسار");
    if (name === "مبيعات" || name === "Sales") return t("Sales", "مبيعات");
    if (name === "دعم فني" || name === "Tech Support" || name === "Technical Support") return t("Tech Support", "دعم فني");
    return name;
  };
}
