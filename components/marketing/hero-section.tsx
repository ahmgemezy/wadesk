"use client";

import Link from "next/link";
import { type MarketingLocale, t } from "@/lib/marketing/i18n";
import { DT } from "@/lib/design-tokens";

function HeroSection({
  isAuthenticated,
  locale,
}: {
  isAuthenticated: boolean;
  locale: MarketingLocale;
}) {
  return (
    <section className="flex min-h-[70vh] items-center justify-center bg-[#F5F5F7] dark:bg-[#111111] px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-[48px] font-semibold tracking-[-1px] leading-tight text-[#1D1D1F] dark:text-white">
          {t(locale, "hero.title")}
        </h1>
        <p className={`mt-6 ${DT.MUTED} text-[18px] leading-relaxed`}>
          {t(locale, "hero.subtitle")}
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href={isAuthenticated ? "/inbox" : "/sign-up"}
            className={`${DT.BTN_PRIMARY} px-8 py-3 text-[16px]`}
          >
            {isAuthenticated
              ? t(locale, "cta.dashboard")
              : t(locale, "cta.signup")}
          </Link>
          {!isAuthenticated && (
            <Link
              href="#features"
              className={`${DT.BTN_OUTLINE} px-8 py-3 text-[16px]`}
            >
              {t(locale, "cta.learnMore")}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export { HeroSection };
