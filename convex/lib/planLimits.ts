import { ConvexError } from "convex/values";

const PLAN_LIMITS: Record<string, number> = {
  free: 2,
  starter: 5,
  growth: 15,
  business: Infinity,
};

export type Plan = "free" | "starter" | "growth" | "business";

export function assertAgentLimitNotReached(
  clerkOrgMemberships: { data: unknown[] },
  plan: Plan,
): void {
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  if (clerkOrgMemberships.data.length >= limit) {
    throw new ConvexError({
      message: "PLAN_LIMIT_REACHED",
      data: { currentPlan: plan, limit },
    });
  }
}
