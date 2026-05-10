// convex/cleanup.ts
// Background cleanup jobs. Registered in crons.ts.

import { internalMutation } from "./_generated/server";

// Delete rateLimits rows whose window has certainly expired.
// The longest window used by enforceRateLimit is 60 s; tryConsumeQuota
// uses date-encoded keys (1-day windows). A 2-day cutoff safely covers both.
const RATE_LIMIT_STALE_MS = 2 * 24 * 60 * 60 * 1000; // 2 days

export const purgeStaleRateLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - RATE_LIMIT_STALE_MS;
    // No index on windowStart — scan up to 500 rows per run and filter.
    const batch = await ctx.db.query("rateLimits").take(500);
    const stale = batch.filter((r) => r.windowStart < cutoff);
    await Promise.all(stale.map((r) => ctx.db.delete(r._id)));
    return stale.length;
  },
});
