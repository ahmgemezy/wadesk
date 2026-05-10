"use client";

import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { plans } from "@/lib/marketing/pricing-data";
import { usePlan } from "@/lib/hooks/use-plan";
import { openCheckout } from "@/lib/paddle";
import { useT, useLocale } from "@/lib/i18n/context";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ExternalLink, Zap } from "lucide-react";
import { toast } from "sonner";

type PaidPlan = "starter" | "growth" | "business";

function isPaidPlan(plan: string): plan is PaidPlan {
  return plan === "starter" || plan === "growth" || plan === "business";
}

export function PlanSelector() {
  const { plan: currentPlan, hasSubscription } = usePlan();
  const createCheckout = useAction(api.billing.createCheckout);
  const updateSubscription = useAction(api.billing.updateSubscription);
  const getCustomerPortalUrl = useAction(api.billing.getCustomerPortalUrl);

  const [loading, setLoading] = useState<string | null>(null);
  const t = useT();
  const locale = useLocale();

  async function handleSelectPlan(planId: string) {
    if (planId === currentPlan || planId === "free") return;
    if (!isPaidPlan(planId)) return;

    setLoading(planId);
    try {
      if (!hasSubscription) {
        const { transactionId } = await createCheckout({ plan: planId });
        openCheckout({
          transactionId,
          onComplete: () => {
            toast.success(t("Payment successful! Your plan is being updated…", "تم الدفع بنجاح! جارٍ تحديث خطتك…"));
          },
        });
      } else {
        await updateSubscription({ plan: planId });
      }
    } catch (err) {
      console.error("[PlanSelector] plan change failed:", err);
    } finally {
      setLoading(null);
    }
  }

  async function handleManageSubscription() {
    setLoading("portal");
    try {
      const { url } = await getCustomerPortalUrl();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("[PlanSelector] portal failed:", err);
    } finally {
      setLoading(null);
    }
  }

  if (currentPlan === undefined) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isLoading = loading === plan.id;
          const isFree = plan.id === "free";
          const isHighlighted = plan.highlighted;
          const features = locale === "en" ? plan.featuresEn : plan.featuresAr;
          const tagline = locale === "en" ? plan.taglineEn : plan.taglineAr;

          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border-2 p-5 transition-all flex flex-col ${
                isCurrent
                  ? "border-primary bg-primary/5"
                  : isHighlighted
                  ? "border-primary shadow-lg shadow-primary/10"
                  : "border-border"
              }`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between mb-2">
                <span className="font-bold text-lg">
                  {t(plan.nameEn, plan.nameAr)}
                </span>
                <div className="flex gap-2 flex-wrap justify-end">
                  {isHighlighted && (
                    <Badge className="text-xs gap-1 bg-primary text-primary-foreground">
                      <Zap className="h-3 w-3" />
                      {t("Most Popular", "الأكثر شيوعاً")}
                    </Badge>
                  )}
                  {isCurrent && (
                    <Badge variant="secondary" className="text-xs">
                      {t("Current plan", "الخطة الحالية")}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="mb-1 flex items-baseline gap-2">
                {plan.originalPriceUSD && (
                  <span className="text-sm text-muted-foreground line-through">
                    ${plan.originalPriceUSD}
                  </span>
                )}
                <span className="text-3xl font-extrabold">
                  {plan.price.USD === "0" ? t("Free", "مجاني") : `$${plan.price.USD}`}
                </span>
                {plan.price.USD !== "0" && (
                  <span className="text-sm text-muted-foreground">
                    /{t("mo", "شهر")}
                  </span>
                )}
              </div>

              {/* Tagline */}
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed min-h-10">
                {tagline}
              </p>

              <div className="border-t mb-4" />

              {/* Feature list */}
              <ul className="space-y-2.5 mb-6 flex-1">
                {features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {!isFree && !isCurrent && (
                <Button
                  size="sm"
                  variant={isHighlighted ? "default" : "outline"}
                  disabled={isLoading}
                  className="w-full"
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {isLoading
                    ? t("Loading…", "جارٍ التحميل…")
                    : t("Get started", "ابدأ الآن")}
                </Button>
              )}

              {isCurrent && !isFree && (
                <p className="text-xs text-muted-foreground text-center">
                  {t("Your active plan", "خطتك الحالية النشطة")}
                </p>
              )}

              {isFree && isCurrent && (
                <p className="text-xs text-muted-foreground text-center">
                  {t("No credit card required", "لا يلزم بطاقة ائتمان")}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {hasSubscription && (
        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            disabled={loading === "portal"}
            onClick={handleManageSubscription}
            className="text-muted-foreground gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            {t("Manage subscription (cancel, invoices)", "إدارة الاشتراك (إلغاء، فواتير)")}
          </Button>
        </div>
      )}
    </div>
  );
}
