import { ConvexError } from "convex/values";

const AGENT_LIMITS: Record<string, number> = {
  free: 3,
  starter: 5,
  growth: 15,
  business: Infinity,
};

const CHANNEL_LIMITS: Record<string, number> = {
  free: 1,
  starter: 2,
  growth: 5,
  business: Infinity,
};

export type Plan = "free" | "starter" | "growth" | "business";

export function assertSupervisorRoleAllowed(plan: Plan): void {
  if (plan === "free") {
    throw new ConvexError({
      message: "PLAN_LIMIT_REACHED",
      data: { reason: "Supervisor role is not available on the Free plan. Upgrade to Starter or above." },
    });
  }
}

export function getChannelLimit(plan: Plan): number {
  return CHANNEL_LIMITS[plan] ?? CHANNEL_LIMITS.free;
}

export function assertAgentLimitNotReached(
  clerkOrgMemberships: { data: unknown[] },
  plan: Plan,
): void {
  const limit = AGENT_LIMITS[plan] ?? AGENT_LIMITS.free;
  if (clerkOrgMemberships.data.length >= limit) {
    throw new ConvexError({
      message: "PLAN_LIMIT_REACHED",
      data: { currentPlan: plan, limit },
    });
  }
}

const AUTOMATION_RULE_LIMITS: Record<Plan, number> = {
  free: 2,
  starter: 10,
  growth: 30,
  business: Infinity,
};

export function assertAutomationRuleLimitNotReached(
  currentCount: number,
  plan: Plan,
): void {
  const limit = AUTOMATION_RULE_LIMITS[plan] ?? AUTOMATION_RULE_LIMITS.free;
  if (currentCount >= limit) {
    throw new ConvexError({
      message: "PLAN_LIMIT_REACHED",
      data: { plan, limit },
    });
  }
}

const LIST_LIMITS: Record<Plan, number> = {
  free: 3,
  starter: 10,
  growth: Infinity,
  business: Infinity,
};

export function assertListLimitNotReached(
  currentCount: number,
  plan: Plan,
): void {
  const limit = LIST_LIMITS[plan] ?? LIST_LIMITS.free;
  if (currentCount >= limit) {
    throw new ConvexError({
      message: "PLAN_LIMIT_REACHED",
      data: { plan, limit, feature: "contactLists" },
    });
  }
}

export function assertBroadcastsAllowed(plan: Plan): void {
  if (plan === "free") {
    throw new ConvexError({
      message: "PLAN_LIMIT_REACHED",
      data: { reason: "Broadcasts are not available on the Free plan. Upgrade to Starter or above." },
    });
  }
}
