"use client";

import Link from "next/link";
import { type MarketingLocale, t } from "@/lib/marketing/i18n";

function HeroSection({
  isAuthenticated,
  locale,
}: {
  isAuthenticated: boolean;
  locale: MarketingLocale;
}) {
  return (
    <section className="flex min-h-[70vh] items-center justify-center px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          {t(locale, "hero.title")}
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
          {t(locale, "hero.subtitle")}
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href={isAuthenticated ? "/inbox" : "/sign-up"}
            className="inline-flex h-12 min-w-45 cursor-pointer items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground hover:bg-primary/80"
          >
            {isAuthenticated
              ? t(locale, "cta.dashboard")
              : t(locale, "cta.signup")}
          </Link>
          {!isAuthenticated && (
            <Link
              href="#features"
              className="inline-flex h-12 min-w-45 cursor-pointer items-center justify-center rounded-lg border border-border px-6 text-base font-medium hover:bg-muted"
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
