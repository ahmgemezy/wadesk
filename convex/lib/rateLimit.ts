import { ConvexError } from "convex/values";
import type { GenericMutationCtx } from "convex/server";
import type { DataModel } from "../_generated/dataModel";

type Ctx = GenericMutationCtx<DataModel>;

const WINDOW_MS = 60_000;

type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: WINDOW_MS,
  maxRequests: 60,
};

export async function enforceRateLimit(
  ctx: Ctx,
  key: string,
  config: Partial<RateLimitConfig> = {},
): Promise<void> {
  const { windowMs, maxRequests } = { ...DEFAULT_CONFIG, ...config };
  const now = Date.now();
  const windowStart = now - windowMs;

  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();

  if (!existing) {
    await ctx.db.insert("rateLimits", {
      key,
      count: 1,
      windowStart: now,
    });
    return;
  }

  if (existing.windowStart < windowStart) {
    await ctx.db.patch(existing._id, {
      count: 1,
      windowStart: now,
    });
    return;
  }

  if (existing.count >= maxRequests) {
    throw new ConvexError({
      message: "RATE_LIMIT_EXCEEDED",
      data: { key, maxRequests, windowMs },
    });
  }

  await ctx.db.patch(existing._id, {
    count: existing.count + 1,
  });
}

export function makeUserMutationKey(userId: string, mutation: string): string {
  return `${userId}:${mutation}`;
}

export function makeTenantMutationKey(tenantId: string, mutation: string): string {
  return `tenant:${tenantId}:${mutation}`;
}
