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

/**
 * Soft rate-limit counter. Increments the count for `key` if currently below
 * `max`; returns `true` if the increment landed (i.e. caller may proceed),
 * `false` if at-or-over cap (caller should silently skip).
 *
 * Unlike enforceRateLimit, this NEVER throws. It is intended for soft caps
 * (e.g. daily email guardrails) where over-cap means "skip this side-effect"
 * rather than "the user did something wrong."
 *
 * Window semantics: caller is responsible for using a key that encodes the
 * window boundary (e.g. `email:daily:tenantA:2026-05-04`). This function
 * does NOT clear or roll over windows — stale rows just become unused.
 */
export async function tryConsumeQuota(
  ctx: GenericMutationCtx<DataModel>,
  key: string,
  max: number,
): Promise<boolean> {
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  const now = Date.now();
  if (!existing) {
    if (max <= 0) return false;
    await ctx.db.insert("rateLimits", { key, count: 1, windowStart: now });
    return true;
  }
  if (existing.count >= max) return false;
  await ctx.db.patch(existing._id, { count: existing.count + 1 });
  return true;
}
