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
