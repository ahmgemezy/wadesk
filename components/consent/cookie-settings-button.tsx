"use client";

import { useMarketingLocale } from "@/lib/marketing/i18n";

export function CookieSettingsButton() {
  const { locale } = useMarketingLocale();

  function openSettings() {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const klaro = (window as any).klaro;
      if (klaro?.show) {
        klaro.show(undefined, true);
      }
    }
  }

  return (
    <button
      type="button"
      onClick={openSettings}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
    >
      {locale === "ar" ? "إعدادات ملفات تعريف الارتباط" : "Cookie Settings"}
    </button>
  );
}
