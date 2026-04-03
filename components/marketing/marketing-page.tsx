"use client";

import { useMarketingLocale, type MarketingLocale } from "@/lib/marketing/i18n";
import { plans, features, differentiators } from "@/lib/marketing/pricing-data";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { HeroSection } from "@/components/marketing/hero-section";
import { FeaturesSection } from "@/components/marketing/features-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { DifferentiatorsSection } from "@/components/marketing/differentiators-section";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

function MarketingPage({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { locale, setLocale } = useMarketingLocale();

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} lang={locale} className="flex min-h-dvh flex-col">
      <MarketingNav isAuthenticated={isAuthenticated} locale={locale} setLocale={setLocale} />
      <main className="flex-1">
        <HeroSection isAuthenticated={isAuthenticated} locale={locale} />
        <FeaturesSection features={features} locale={locale} />
        <PricingSection plans={plans} locale={locale} />
        <DifferentiatorsSection differentiators={differentiators} locale={locale} />
      </main>
      <MarketingFooter locale={locale} />
    </div>
  );
}

export { MarketingPage };
