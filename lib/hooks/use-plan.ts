"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PLAN_RANK, type Plan } from "@/convex/lib/planLimits";

export function usePlan() {
  const status = useQuery(api.lib.tenants.getSubscriptionStatus);

  const plan: Plan = status?.plan ?? "free";
  const isPaid = plan !== "free";
  const hasSubscription = status?.hasSubscription ?? false;

  function atLeast(required: Plan): boolean {
    return PLAN_RANK[plan] >= PLAN_RANK[required];
  }

  return { plan, isPaid, hasSubscription, atLeast };
}
