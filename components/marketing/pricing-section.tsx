"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { type MarketingLocale, t } from "@/lib/marketing/i18n";
import { type Plan, type Currency } from "@/lib/marketing/pricing-data";

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
    <section id="pricing" className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 text-center text-3xl font-bold sm:text-4xl">
          {t(locale, "pricing.heading")}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-xl border bg-background p-6 ${
                plan.highlighted
                  ? "ring-2 ring-primary shadow-lg"
                  : ""
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                  {t(locale, "pricing.bestValue")}
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-semibold">
                  {locale === "ar" ? plan.nameAr : plan.nameEn}
                </h3>
              </div>

              <div className="mb-4">
                {plan.isFree ? (
                  <span className="text-2xl font-bold">
                    {locale === "ar" ? "مجاني" : "Free"}
                  </span>
                ) : (
                  <p className="text-sm font-medium leading-relaxed">
                    {formatPrices(plan.price)}
                    <span className="text-muted-foreground">
                      {t(locale, "pricing.month")}
                    </span>
                  </p>
                )}
              </div>

              {plan.isFree && (
                <span className="mb-4 inline-block w-fit rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  {t(locale, "pricing.noCard")}
                </span>
              )}

              <div className="mb-4 space-y-1 text-sm text-muted-foreground">
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
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/sign-up"
                className={`inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-lg text-sm font-medium ${
                  plan.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/80"
                    : "border border-border hover:bg-muted"
                }`}
              >
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
