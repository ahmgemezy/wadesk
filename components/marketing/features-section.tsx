"use client";

import {
  Users,
  GitBranch,
  StickyNote,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { type MarketingLocale, t } from "@/lib/marketing/i18n";
import { type FeatureHighlight } from "@/lib/marketing/pricing-data";
import { DT } from "@/lib/design-tokens";

const iconMap: Record<string, LucideIcon> = {
  Users,
  GitBranch,
  StickyNote,
  Zap,
};

function FeaturesSection({
  features,
  locale,
}: {
  features: FeatureHighlight[];
  locale: MarketingLocale;
}) {
  return (
    <section id="features" className="bg-white dark:bg-[#000000] px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 text-center text-[34px] font-semibold tracking-[-0.5px] text-[#1D1D1F] dark:text-white">
          {t(locale, "features.heading")}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = iconMap[feature.icon];
            return (
              <div key={feature.id} className={`${DT.CARD_SM} p-6`}>
                {Icon && (
                  <div className="mb-4 inline-flex rounded-2xl bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 p-3 text-[#0071E3] dark:text-[#0A84FF]">
                    <Icon className="size-5" />
                  </div>
                )}
                <h3 className={`${DT.H3} mb-2`}>
                  {locale === "ar" ? feature.titleAr : feature.titleEn}
                </h3>
                <p className={`${DT.MUTED} leading-relaxed`}>
                  {locale === "ar"
                    ? feature.descriptionAr
                    : feature.descriptionEn}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export { FeaturesSection };
