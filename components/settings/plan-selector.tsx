"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { plans } from "@/lib/marketing/pricing-data";
import { useState } from "react";
import { useT } from "@/lib/i18n/context";

export function PlanSelector() {
  const currentPlan = useQuery(api.lib.tenants.getCurrentPlan);
  const updatePlan = useMutation(api.lib.tenants.updatePlan);
  const [loading, setLoading] = useState<string | null>(null);

  const t = useT();
  if (currentPlan === undefined) return null;

  const handleSelect = async (planId: "free" | "starter" | "growth" | "business") => {
    if (planId === currentPlan) return;
    setLoading(planId);
    try {
      await updatePlan({ plan: planId });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {plans.map((plan) => {
        const isActive = currentPlan === plan.id;
        const isLoading = loading === plan.id;

        return (
          <button
            key={plan.id}
            onClick={() => handleSelect(plan.id)}
            disabled={isLoading}
            className={`relative rounded-lg border p-4 text-start transition-colors ${
              isActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            } ${isLoading ? "opacity-60" : ""}`}
          >
            {isActive && (
              <span className="absolute top-2 inset-e-2 text-xs font-medium text-primary">
                {t("Current", "الحالية")}
              </span>
            )}
            <div className="font-semibold">
              {t(plan.nameEn, plan.nameAr)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {plan.price.USD === "0"
                ? t("Free", "مجاني")
                : `$${plan.price.USD}/mo`}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {plan.agentLimit
                ? t(`Up to ${plan.agentLimit} agents`, `حتى ${plan.agentLimit} وكلاء`)
                : t("Unlimited agents", "وكلاء غير محدودين")}
            </div>
          </button>
        );
      })}
    </div>
  );
}
