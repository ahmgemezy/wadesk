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
