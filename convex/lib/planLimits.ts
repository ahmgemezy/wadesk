import { ConvexError } from "convex/values";

export type Plan = "free" | "starter" | "growth" | "business";

export const PLAN_RANK: Record<Plan, number> = {
  free: 0,
  starter: 1,
  growth: 2,
  business: 3,
};

export function assertPlanAtLeast(current: Plan, required: Plan): void {
  if (PLAN_RANK[current] < PLAN_RANK[required]) {
    throw new ConvexError({
      message: "PLAN_LIMIT_REACHED",
      data: { currentPlan: current, requiredPlan: required },
    });
  }
}

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
  if (plan === "free" || plan === "starter") {
    throw new ConvexError({
      message: "PLAN_LIMIT_REACHED",
      data: { reason: "Broadcasts are available on Growth and above. Please upgrade your plan." },
    });
  }
}

const TEMPLATE_LIMITS: Record<Plan, number> = {
  free: 0,
  starter: 10,
  growth: 50,
  business: Infinity,
};

export function assertTemplateLimitNotReached(
  currentCount: number,
  plan: Plan,
): void {
  const limit = TEMPLATE_LIMITS[plan] ?? TEMPLATE_LIMITS.free;
  if (currentCount >= limit) {
    throw new ConvexError({
      message: "PLAN_LIMIT_REACHED",
      data: { plan, limit, feature: "messageTemplates" },
    });
  }
}

const BROADCAST_TEMPLATE_LIMITS: Record<Plan, number> = {
  free: 2,
  starter: 6,
  growth: 20,
  business: Infinity,
};

export function assertBroadcastTemplateLimitNotReached(
  currentCount: number,
  plan: Plan,
): void {
  const limit = BROADCAST_TEMPLATE_LIMITS[plan] ?? BROADCAST_TEMPLATE_LIMITS.free;
  if (currentCount >= limit) {
    throw new ConvexError({
      message: "PLAN_LIMIT_REACHED",
      data: { plan, limit, feature: "broadcastTemplates" },
    });
  }
}

export function getBroadcastTemplateLimit(plan: Plan): number {
  return BROADCAST_TEMPLATE_LIMITS[plan] ?? BROADCAST_TEMPLATE_LIMITS.free;
}
