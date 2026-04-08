"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { plans } from "@/lib/marketing/pricing-data";
import { useState } from "react";

export function PlanSelector() {
  const currentPlan = useQuery(api.lib.tenants.getCurrentPlan);
  const updatePlan = useMutation(api.lib.tenants.updatePlan);
  const [loading, setLoading] = useState<string | null>(null);

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
              <span className="absolute top-2 end-2 text-xs font-medium text-primary">
                الحالية / Current
              </span>
            )}
            <div className="font-semibold">
              {plan.nameAr} / {plan.nameEn}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {plan.price.USD === "0"
                ? "مجاني / Free"
                : `$${plan.price.USD}/mo`}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {plan.agentLimit
                ? `حتى ${plan.agentLimit} وكلاء / Up to ${plan.agentLimit} agents`
                : "وكلاء غير محدودين / Unlimited agents"}
            </div>
          </button>
        );
      })}
    </div>
  );
}
