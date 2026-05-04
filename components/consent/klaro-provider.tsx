"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useMarketingLocale } from "@/lib/marketing/i18n";
import "klaro/dist/klaro.css";
import "@/styles/klaro.css";

export function KlaroProvider() {
  const pathname = usePathname();
  const { locale } = useMarketingLocale();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (typeof window === "undefined") return;

      const Klaro = await import("klaro/dist/klaro-no-css");
      if (cancelled) return;

      const { getKlaroConfig } = await import("@/lib/klaro/config");
      const config = getKlaroConfig(locale);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).klaro = Klaro;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).klaroConfig = config;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Klaro as any).setup(config);
    })();

    return () => {
      cancelled = true;
    };
  // Re-initialize on route change (fixes Klaro issue #552 with Next.js App Router)
  // and when locale changes so the banner renders in the correct language.
  }, [pathname, locale]);

  return <div id="klaro" dir={locale === "ar" ? "rtl" : "ltr"} />;
}
