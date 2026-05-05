"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { arSA, enUS } from "@clerk/localizations";
import { useState, useEffect } from "react";

export const LOCALE_CHANGE_EVENT = "wabdesk:locale-change";

export function ClerkProviderWithLocale({
  locale: serverLocale,
  children,
}: {
  locale: "ar" | "en";
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useState<"ar" | "en">(serverLocale);

  useEffect(() => {
    const handler = (e: Event) => {
      setLocale((e as CustomEvent<"ar" | "en">).detail);
    };
    window.addEventListener(LOCALE_CHANGE_EVENT, handler);
    return () => window.removeEventListener(LOCALE_CHANGE_EVENT, handler);
  }, []);

  return (
    <ClerkProvider localization={locale === "ar" ? arSA : enUS}>
      {children}
    </ClerkProvider>
  );
}
