"use client";

import { BadgePercent, Languages, Banknote, type LucideIcon } from "lucide-react";
import { type MarketingLocale, t } from "@/lib/marketing/i18n";
import { type Differentiator } from "@/lib/marketing/pricing-data";

const iconMap: Record<string, LucideIcon> = {
  BadgePercent,
  Languages,
  Banknote,
};

function DifferentiatorsSection({
  differentiators,
  locale,
}: {
  differentiators: Differentiator[];
  locale: MarketingLocale;
}) {
  return (
    <section id="why-wadesk" className="bg-muted/30 px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 text-center text-3xl font-bold sm:text-4xl">
          {t(locale, "differentiators.heading")}
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {differentiators.map((d) => {
            const Icon = iconMap[d.icon];
            return (
              <div
                key={d.id}
                className="rounded-xl border bg-background p-6"
              >
                {Icon && (
                  <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="size-5 text-primary" />
                  </div>
                )}
                <h3 className="mb-2 text-lg font-semibold">
                  {locale === "ar" ? d.titleAr : d.titleEn}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {locale === "ar" ? d.statementAr : d.statementEn}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export { DifferentiatorsSection };
