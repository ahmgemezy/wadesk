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
    <section id="features" className="bg-muted/30 px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 text-center text-3xl font-bold sm:text-4xl">
          {t(locale, "features.heading")}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = iconMap[feature.icon];
            return (
              <div
                key={feature.id}
                className="rounded-xl border bg-background p-6"
              >
                {Icon && (
                  <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="size-5 text-primary" />
                  </div>
                )}
                <h3 className="mb-2 text-lg font-semibold">
                  {locale === "ar" ? feature.titleAr : feature.titleEn}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
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
