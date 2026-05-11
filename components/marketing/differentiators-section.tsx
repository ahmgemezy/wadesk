"use client";

import { BadgePercent, Languages, Banknote, type LucideIcon } from "lucide-react";
import { type MarketingLocale, t } from "@/lib/marketing/i18n";
import { type Differentiator } from "@/lib/marketing/pricing-data";
import { DT } from "@/lib/design-tokens";

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
    <section id="why-wabdesk" className="bg-white dark:bg-[#000000] px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className={`mb-12 text-center text-[34px] font-semibold tracking-[-0.5px] ${DT.TEXT_PRIMARY}`}>
          {t(locale, "differentiators.heading")}
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {differentiators.map((d) => {
            const Icon = iconMap[d.icon];
            return (
              <div key={d.id} className={`${DT.CARD_SM} p-6`}>
                {Icon && (
                  <div className={`mb-4 inline-flex rounded-2xl ${DT.BG_BLUE_TINT} p-3 ${DT.TEXT_BLUE}`}>
                    <Icon className="size-5" />
                  </div>
                )}
                <h3 className={`${DT.H3} mb-2`}>
                  {locale === "ar" ? d.titleAr : d.titleEn}
                </h3>
                <p className={`${DT.MUTED} leading-relaxed`}>
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
