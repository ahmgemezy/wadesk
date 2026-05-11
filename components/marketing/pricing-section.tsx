"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { type MarketingLocale, t } from "@/lib/marketing/i18n";
import { type Plan, type Currency } from "@/lib/marketing/pricing-data";
import { DT } from "@/lib/design-tokens";

const currencyLabels: Record<string, { symbol: string; label: string }> = {
  EGP: { symbol: "ج.م", label: "EGP" },
  SAR: { symbol: "ر.س", label: "SAR" },
  AED: { symbol: "د.إ", label: "AED" },
  USD: { symbol: "$", label: "USD" },
};

function formatPrices(price: Plan["price"]): string {
  const currencies: Currency[] = ["EGP", "SAR", "AED", "USD"];
  return currencies
    .map((c) => {
      const val = price[c];
      const { symbol } = currencyLabels[c];
      return c === "USD" ? `${symbol}${val}` : `${val} ${symbol}`;
    })
    .join(" / ");
}

function PricingSection({
  plans,
  locale,
}: {
  plans: Plan[];
  locale: MarketingLocale;
}) {
  return (
    <section id="pricing" className="bg-[#F5F5F7] dark:bg-[#111111] px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 text-center text-[34px] font-semibold tracking-[-0.5px] text-[#1D1D1F] dark:text-white">
          {t(locale, "pricing.heading")}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col p-6 ${
                plan.highlighted
                  ? `${DT.CARD} ring-2 ring-[#0071E3] dark:ring-[#0A84FF]`
                  : DT.CARD
              }`}
            >
              {plan.highlighted && (
                <div className={`${DT.BADGE_BLUE} absolute -top-3 left-1/2 -translate-x-1/2`}>
                  {t(locale, "pricing.bestValue")}
                </div>
              )}

              <div className="mb-4">
                <h3 className={DT.H3}>
                  {locale === "ar" ? plan.nameAr : plan.nameEn}
                </h3>
              </div>

              <div className="mb-4">
                {plan.isFree ? (
                  <span className="text-[40px] font-semibold tracking-[-0.5px] text-[#1D1D1F] dark:text-white">
                    {locale === "ar" ? "مجاني" : "Free"}
                  </span>
                ) : (
                  <p className={`${DT.BODY} leading-relaxed`}>
                    <span className="text-[40px] font-semibold tracking-[-0.5px] text-[#1D1D1F] dark:text-white">
                      {formatPrices(plan.price)}
                    </span>
                    <span className={DT.MUTED}>
                      {t(locale, "pricing.month")}
                    </span>
                  </p>
                )}
              </div>

              {plan.isFree && (
                <span className={`${DT.BADGE_NEUTRAL} mb-4 w-fit`}>
                  {t(locale, "pricing.noCard")}
                </span>
              )}

              <div className={`mb-4 space-y-1 ${DT.MUTED}`}>
                <p>
                  {(plan.agentLimit ?? null) === null
                    ? t(locale, "pricing.unlimited")
                    : plan.agentLimit}{" "}
                  {t(locale, "pricing.agents")}
                </p>
                <p>
                  {(plan.channelLimit ?? null) === null
                    ? t(locale, "pricing.unlimited")
                    : plan.channelLimit}{" "}
                  {t(locale, "pricing.channels")}
                </p>
              </div>

              <ul className="mb-6 flex-1 space-y-2">
                {(locale === "ar"
                  ? plan.featuresAr
                  : plan.featuresEn
                ).map((feature, i) => (
                  <li key={i} className={`${DT.BODY} flex items-start gap-2`}>
                    <Check className="mt-0.5 size-4 shrink-0 text-[#34C759] dark:text-[#30D158]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href="/sign-up" className={`${DT.BTN_SM_PRIMARY} w-full`}>
                {plan.isFree
                  ? t(locale, "cta.signup")
                  : t(locale, "cta.startNow")}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export { PricingSection };
