"use client";

import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { plans } from "@/lib/marketing/pricing-data";
import { usePlan } from "@/lib/hooks/use-plan";
import { openCheckout } from "@/lib/paddle";
import { useT } from "@/lib/i18n/context";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

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

  async function handleSelectPlan(planId: string) {
    if (planId === currentPlan || planId === "free") return;
    if (!isPaidPlan(planId)) return;

    setLoading(planId);
    try {
      if (!hasSubscription) {
        const { transactionId } = await createCheckout({ plan: planId });
        openCheckout({ transactionId });
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

          return (
            <div
              key={plan.id}
              className={`relative rounded-lg border p-4 transition-colors ${
                isCurrent
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              {isCurrent && (
                <Badge variant="secondary" className="absolute top-3 inset-e-3 text-xs">
                  {t("Current plan", "الخطة الحالية")}
                </Badge>
              )}

              <div className="font-semibold text-base mb-1">
                {t(plan.nameEn, plan.nameAr)}
              </div>

              <div className="text-sm text-muted-foreground mb-3">
                {plan.price.USD === "0"
                  ? t("Free", "مجاني")
                  : `$${plan.price.USD}/${t("mo", "شهر")}`}
              </div>

              <div className="text-xs text-muted-foreground mb-4">
                {plan.agentLimit
                  ? t(`Up to ${plan.agentLimit} agents`, `حتى ${plan.agentLimit} وكلاء`)
                  : t("Unlimited agents", "وكلاء غير محدودين")}
              </div>

              {!isFree && !isCurrent && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isLoading}
                  className="w-full"
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {isLoading
                    ? t("Loading…", "جارٍ التحميل…")
                    : t("Select", "اختر")}
                </Button>
              )}

              {isCurrent && !isFree && (
                <p className="text-xs text-muted-foreground mt-2">
                  {t("Active subscription", "اشتراك نشط")}
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
