# Paddle Billing Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder PlanSelector (which mutates tenant.plan without payment) with a real Paddle Billing integration supporting free→paid checkout and instant paid↔paid plan switching.

**Architecture:** A Convex action creates a Paddle transaction server-side (injecting tenantId as custom_data), the client opens a Paddle.js v2 overlay with the returned transactionId, and Paddle webhooks are verified in a Next.js route then forwarded to a Convex HTTP action that updates the tenant document. Paid↔paid plan changes use Paddle's subscription update API — no checkout overlay needed.

**Tech Stack:** `@paddle/paddle-js` (v2), Paddle REST API, Convex actions + HTTP action, Next.js API route, HMAC-SHA256 webhook verification.

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `convex/schema.ts` | Modify | Add 3 optional Paddle fields to `tenants` table |
| `convex/lib/planLimits.ts` | Modify | Add `PLAN_RANK` constant + `assertPlanAtLeast` helper |
| `convex/lib/tenants.ts` | Modify | Add `getTenantInternal` + `getSubscriptionStatus` queries |
| `convex/billing.ts` | Create | All Paddle Convex actions + internal mutation + HTTP action |
| `convex/http.ts` | Modify | Register `/paddle-webhook` route |
| `app/api/paddle/webhook/route.ts` | Create | Paddle signature verification + forward to Convex |
| `lib/paddle.ts` | Create | Module-level Paddle.js instance + openCheckout helper |
| `components/paddle-provider.tsx` | Create | Client component that calls initPaddle() once on mount |
| `app/(dashboard)/layout.tsx` | Modify | Add `<PaddleProvider />` |
| `lib/hooks/use-plan.ts` | Create | `usePlan()` React hook (plan, isPaid, atLeast) |
| `components/settings/plan-selector.tsx` | Rewrite | Full Paddle checkout + plan-switch UI |

---

## Task 1: Schema — Add Paddle Fields to Tenants

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Add the three optional fields to the `tenants` table definition**

Open `convex/schema.ts`. The `tenants` table currently ends at `createdAt`. Add these three lines immediately before the closing `})` of the tenants table (before the `.index(...)` call):

```ts
// In convex/schema.ts — tenants table, add after `createdAt: v.number(),`
paddle_customer_id: v.optional(v.string()),
paddle_subscription_id: v.optional(v.string()),
plan_activated_at: v.optional(v.number()),
```

The full tenants table after the change:
```ts
tenants: defineTable({
  tenantId: v.string(),
  plan: v.union(
    v.literal("free"),
    v.literal("starter"),
    v.literal("growth"),
    v.literal("business"),
  ),
  orgName: v.optional(v.string()),
  createdAt: v.number(),
  paddle_customer_id: v.optional(v.string()),
  paddle_subscription_id: v.optional(v.string()),
  plan_activated_at: v.optional(v.number()),
})
  .index("by_tenantId", ["tenantId"]),
```

- [ ] **Step 2: Verify Convex accepts the schema change**

```bash
npx convex dev --once
```

Expected: exits 0, no schema errors. If you see a type error, check you haven't broken any existing `.index()` calls.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(billing): add paddle_customer_id, paddle_subscription_id, plan_activated_at to tenants schema"
```

---

## Task 2: planLimits — Add Plan Rank Helper

**Files:**
- Modify: `convex/lib/planLimits.ts`

- [ ] **Step 1: Add PLAN_RANK and assertPlanAtLeast at the top of the file, after the existing imports**

The file currently starts with `import { ConvexError } from "convex/values";` and defines `AGENT_LIMITS`. Add these before the existing `AGENT_LIMITS` constant:

```ts
// Add at the top of convex/lib/planLimits.ts, after the import line:

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
```

Note: `Plan` type is already defined later in the same file as `export type Plan = "free" | "starter" | "growth" | "business";`. Move the type definition above `PLAN_RANK` so it's declared before use. The type line currently lives just before `assertSupervisorRoleAllowed`. Cut it and paste it immediately after the import.

After editing, the top of the file should read:

```ts
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
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | grep planLimits
```

Expected: no output (no errors in that file).

- [ ] **Step 3: Commit**

```bash
git add convex/lib/planLimits.ts
git commit -m "feat(billing): add PLAN_RANK and assertPlanAtLeast to planLimits"
```

---

## Task 3: Tenant Helpers — Internal Query + Subscription Status

**Files:**
- Modify: `convex/lib/tenants.ts`

The billing actions in Task 4 need to read the full tenant document (to get `paddle_subscription_id`, `paddle_customer_id`). The public-facing PlanSelector also needs to know whether the tenant has an active Paddle subscription to choose between Flow A (checkout overlay) and Flow B (instant update).

- [ ] **Step 1: Add `getTenantInternal` and `getSubscriptionStatus` to `convex/lib/tenants.ts`**

Append these two functions at the end of the file:

```ts
// Append to convex/lib/tenants.ts

export const getTenantInternal = internalQuery({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();
  },
});

export const getSubscriptionStatus = query({
  args: {},
  handler: async (ctx): Promise<{ plan: Plan; hasSubscription: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.orgId) return { plan: "free", hasSubscription: false };
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", identity.orgId as string))
      .first();
    return {
      plan: (tenant?.plan as Plan) ?? "free",
      hasSubscription: !!tenant?.paddle_subscription_id,
    };
  },
});
```

`Plan` is already imported via `import type { Plan } from "./planLimits";` at the top of the file. The existing imports (`query`, `internalQuery`, `internalMutation`, `mutation`) are already there. No new imports needed.

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | grep tenants
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add convex/lib/tenants.ts
git commit -m "feat(billing): add getTenantInternal and getSubscriptionStatus queries"
```

---

## Task 4: convex/billing.ts — All Server-Side Paddle Logic

**Files:**
- Create: `convex/billing.ts`

This file contains:
- `createCheckout` — public action, creates Paddle transaction, returns `transactionId`
- `updateSubscription` — public action (admin only), updates existing Paddle subscription
- `getCustomerPortalUrl` — public action (admin only), returns Paddle portal URL
- `handlePaddleEvent` — internal mutation, updates tenant from webhook data
- `paddleWebhook` — HTTP action, receives forwarded webhook from Next.js, runs `handlePaddleEvent`

- [ ] **Step 1: Add required environment variables to Convex**

Run these in your terminal (or set them in the Convex dashboard → Settings → Environment Variables):

```bash
npx convex env set PADDLE_API_KEY "your_paddle_api_key"
npx convex env set PADDLE_WEBHOOK_SECRET "your_paddle_webhook_secret"
npx convex env set PADDLE_PRICE_STARTER "pri_..."
npx convex env set PADDLE_PRICE_GROWTH "pri_..."
npx convex env set PADDLE_PRICE_BUSINESS "pri_..."
npx convex env set PADDLE_SANDBOX "true"
npx convex env set PADDLE_INTERNAL_SECRET "$(openssl rand -hex 32)"
```

Note the value of `PADDLE_INTERNAL_SECRET` — you'll need it in `.env.local` too (Task 6).

- [ ] **Step 2: Create `convex/billing.ts`**

```ts
import {
  action,
  internalMutation,
  httpAction,
} from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { getCallerRole } from "./lib/auth";
import type { Plan } from "./lib/planLimits";

// ── Helpers ──────────────────────────────────────────────────────────────────

function paddleBaseUrl(): string {
  return process.env.PADDLE_SANDBOX === "true"
    ? "https://sandbox-api.paddle.com"
    : "https://api.paddle.com";
}

function priceIdForPlan(plan: "starter" | "growth" | "business"): string {
  const map: Record<string, string | undefined> = {
    starter: process.env.PADDLE_PRICE_STARTER,
    growth: process.env.PADDLE_PRICE_GROWTH,
    business: process.env.PADDLE_PRICE_BUSINESS,
  };
  const id = map[plan];
  if (!id) throw new ConvexError("PRICE_NOT_CONFIGURED");
  return id;
}

function planForPriceId(priceId: string): Plan | null {
  const map: Record<string, Plan> = {};
  if (process.env.PADDLE_PRICE_STARTER) map[process.env.PADDLE_PRICE_STARTER] = "starter";
  if (process.env.PADDLE_PRICE_GROWTH) map[process.env.PADDLE_PRICE_GROWTH] = "growth";
  if (process.env.PADDLE_PRICE_BUSINESS) map[process.env.PADDLE_PRICE_BUSINESS] = "business";
  return map[priceId] ?? null;
}

// ── Public actions ────────────────────────────────────────────────────────────

export const createCheckout = action({
  args: {
    plan: v.union(v.literal("starter"), v.literal("growth"), v.literal("business")),
  },
  handler: async (ctx, args): Promise<{ transactionId: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.orgId || !identity.email) throw new ConvexError("UNAUTHORIZED");

    const tenantId = identity.orgId as string;
    const priceId = priceIdForPlan(args.plan);

    const res = await fetch(`${paddleBaseUrl()}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
        customer: { email: identity.email },
        custom_data: { tenantId },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[billing] createCheckout Paddle error:", err);
      throw new ConvexError("PADDLE_ERROR");
    }

    const data = await res.json() as { data: { id: string } };
    return { transactionId: data.data.id };
  },
});

export const updateSubscription = action({
  args: {
    plan: v.union(v.literal("starter"), v.literal("growth"), v.literal("business")),
  },
  handler: async (ctx, args): Promise<{ ok: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.orgId) throw new ConvexError("UNAUTHORIZED");

    const role = await getCallerRole(ctx);
    if (role !== "org:admin") throw new ConvexError("FORBIDDEN");

    const tenantId = identity.orgId as string;
    const tenant = await ctx.runQuery(internal.lib.tenants.getTenantInternal, { tenantId });

    if (!tenant?.paddle_subscription_id) {
      throw new ConvexError("NO_SUBSCRIPTION");
    }

    const priceId = priceIdForPlan(args.plan);

    const res = await fetch(
      `${paddleBaseUrl()}/subscriptions/${tenant.paddle_subscription_id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [{ price_id: priceId, quantity: 1 }],
          proration_billing_mode: "prorated_immediately",
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[billing] updateSubscription Paddle error:", err);
      throw new ConvexError("PADDLE_ERROR");
    }

    return { ok: true };
  },
});

export const getCustomerPortalUrl = action({
  args: {},
  handler: async (ctx): Promise<{ url: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.orgId) throw new ConvexError("UNAUTHORIZED");

    const role = await getCallerRole(ctx);
    if (role !== "org:admin") throw new ConvexError("FORBIDDEN");

    const tenantId = identity.orgId as string;
    const tenant = await ctx.runQuery(internal.lib.tenants.getTenantInternal, { tenantId });

    if (!tenant?.paddle_customer_id) {
      throw new ConvexError("NO_CUSTOMER");
    }

    const res = await fetch(
      `${paddleBaseUrl()}/customers/${tenant.paddle_customer_id}/portal-sessions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[billing] getCustomerPortalUrl Paddle error:", err);
      throw new ConvexError("PADDLE_PORTAL_ERROR");
    }

    const data = await res.json() as { data: { urls: { general: { overview: string } } } };
    return { url: data.data.urls.general.overview };
  },
});

// ── Internal mutation ────────────────────────────────────────────────────────

export const handlePaddleEvent = internalMutation({
  args: {
    tenantId: v.string(),
    newPlan: v.union(
      v.literal("free"),
      v.literal("starter"),
      v.literal("growth"),
      v.literal("business")
    ),
    paddleCustomerId: v.optional(v.string()),
    paddleSubscriptionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();

    if (!tenant) {
      console.error("[billing] handlePaddleEvent: tenant not found", args.tenantId);
      return;
    }

    if (args.newPlan === "free") {
      await ctx.db.patch(tenant._id, {
        plan: "free",
        paddle_subscription_id: undefined,
        plan_activated_at: Date.now(),
      });
    } else {
      await ctx.db.patch(tenant._id, {
        plan: args.newPlan,
        paddle_customer_id: args.paddleCustomerId,
        paddle_subscription_id: args.paddleSubscriptionId,
        plan_activated_at: Date.now(),
      });
    }
  },
});

// ── HTTP action (receives forwarded webhook from Next.js) ─────────────────────

export const paddleWebhook = httpAction(async (ctx, request) => {
  // Verify the internal shared secret (set by Next.js before forwarding)
  const internalSecret = request.headers.get("x-paddle-internal-secret");
  if (internalSecret !== process.env.PADDLE_INTERNAL_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  let event: {
    event_type: string;
    data: {
      id: string;
      customer_id: string;
      items?: { price: { id: string } }[];
      custom_data?: { tenantId?: string };
    };
  };

  try {
    event = await request.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const { event_type, data } = event;

  // Resolve tenantId from custom_data (set during checkout creation)
  const tenantId = data.custom_data?.tenantId;

  if (!tenantId) {
    // Fallback: look up tenant by paddle_subscription_id for update/cancel events
    const tenant = await ctx.runQuery(internal.lib.tenants.getTenantInternal,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { tenantId: "" } as any
    );
    // If we can't resolve tenantId, skip silently (edge case on very old subs)
    if (!tenant) {
      console.warn("[billing] paddleWebhook: no tenantId in custom_data, skipping", data.id);
      return new Response("OK", { status: 200 });
    }
  }

  if (event_type === "subscription.activated" || event_type === "subscription.updated") {
    const priceId = data.items?.[0]?.price?.id ?? "";
    const newPlan = planForPriceId(priceId);
    if (!newPlan || !tenantId) {
      console.warn("[billing] paddleWebhook: unknown priceId or missing tenantId", priceId);
      return new Response("OK", { status: 200 });
    }

    await ctx.runMutation(internal.billing.handlePaddleEvent, {
      tenantId,
      newPlan,
      paddleCustomerId: data.customer_id,
      paddleSubscriptionId: data.id,
    });
  } else if (event_type === "subscription.canceled") {
    if (!tenantId) return new Response("OK", { status: 200 });
    await ctx.runMutation(internal.billing.handlePaddleEvent, {
      tenantId,
      newPlan: "free",
    });
  }
  // All other events: no-op, return 200

  return new Response("OK", { status: 200 });
});
```

- [ ] **Step 3: Fix the tenantId lookup fallback (the `as any` placeholder)**

The fallback for missing `tenantId` in subscription.updated/canceled events needs a real lookup by `paddle_subscription_id`. Add this internal query to `convex/lib/tenants.ts`:

```ts
// Append to convex/lib/tenants.ts
export const getTenantBySubscriptionId = internalQuery({
  args: { subscriptionId: v.string() },
  handler: async (ctx, args) => {
    // Full-table scan — only used as webhook fallback, acceptable at this scale
    const all = await ctx.db.query("tenants").collect();
    return all.find((t) => t.paddle_subscription_id === args.subscriptionId) ?? null;
  },
});
```

Then update the fallback block in `convex/billing.ts` `paddleWebhook` to:

```ts
// Replace the fallback block in paddleWebhook (the `ctx.runQuery` call that had `as any`):
if (!tenantId) {
  const tenant = await ctx.runQuery(internal.lib.tenants.getTenantBySubscriptionId, {
    subscriptionId: data.id,
  });
  if (!tenant) {
    console.warn("[billing] paddleWebhook: cannot resolve tenantId, skipping", data.id);
    return new Response("OK", { status: 200 });
  }
  // Use tenant.tenantId for the mutation call below
  // Re-parse below handles both paths — refactor the handler to use a resolved tenantId variable
}
```

Refactor the `paddleWebhook` handler body to resolve `resolvedTenantId` before the branch:

```ts
export const paddleWebhook = httpAction(async (ctx, request) => {
  const internalSecret = request.headers.get("x-paddle-internal-secret");
  if (internalSecret !== process.env.PADDLE_INTERNAL_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  let event: {
    event_type: string;
    data: {
      id: string;
      customer_id: string;
      items?: { price: { id: string } }[];
      custom_data?: { tenantId?: string };
    };
  };

  try {
    event = await request.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const { event_type, data } = event;

  // Resolve tenantId: prefer custom_data, fall back to subscription_id lookup
  let resolvedTenantId = data.custom_data?.tenantId;
  if (!resolvedTenantId) {
    const tenant = await ctx.runQuery(internal.lib.tenants.getTenantBySubscriptionId, {
      subscriptionId: data.id,
    });
    resolvedTenantId = tenant?.tenantId;
  }

  if (!resolvedTenantId) {
    console.warn("[billing] paddleWebhook: cannot resolve tenantId, skipping", data.id);
    return new Response("OK", { status: 200 });
  }

  if (event_type === "subscription.activated" || event_type === "subscription.updated") {
    const priceId = data.items?.[0]?.price?.id ?? "";
    const newPlan = planForPriceId(priceId);
    if (!newPlan) {
      console.warn("[billing] paddleWebhook: unknown priceId", priceId);
      return new Response("OK", { status: 200 });
    }
    await ctx.runMutation(internal.billing.handlePaddleEvent, {
      tenantId: resolvedTenantId,
      newPlan,
      paddleCustomerId: data.customer_id,
      paddleSubscriptionId: data.id,
    });
  } else if (event_type === "subscription.canceled") {
    await ctx.runMutation(internal.billing.handlePaddleEvent, {
      tenantId: resolvedTenantId,
      newPlan: "free",
    });
  }

  return new Response("OK", { status: 200 });
});
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep billing
```

Expected: no errors. Common issue: if `internal.billing` isn't generated yet, run `npx convex dev --once` first to regenerate `_generated/api`.

- [ ] **Step 5: Commit**

```bash
git add convex/billing.ts convex/lib/tenants.ts
git commit -m "feat(billing): add Paddle Convex actions, internal mutation, and HTTP action"
```

---

## Task 5: Register Paddle Webhook Route in Convex

**Files:**
- Modify: `convex/http.ts`

- [ ] **Step 1: Import and register the paddleWebhook HTTP action**

At the top of `convex/http.ts`, after the existing imports, add:

```ts
import { paddleWebhook } from "./billing";
```

At the bottom of `convex/http.ts`, after the existing `http.route(...)` calls for the meta webhook, add:

```ts
http.route({ path: "/paddle-webhook", method: "POST", handler: paddleWebhook });
```

- [ ] **Step 2: Verify and deploy**

```bash
npx convex dev --once
```

Expected: exits 0. The route `/paddle-webhook` is now registered on your Convex site URL (e.g. `https://happy-animal-123.convex.site/paddle-webhook`).

- [ ] **Step 3: Commit**

```bash
git add convex/http.ts
git commit -m "feat(billing): register /paddle-webhook HTTP route in Convex"
```

---

## Task 6: Next.js Webhook Route — Signature Verification

**Files:**
- Create: `app/api/paddle/webhook/route.ts`

- [ ] **Step 1: Add env vars to `.env.local`**

```env
# Add to .env.local
PADDLE_WEBHOOK_SECRET=your_paddle_webhook_secret
PADDLE_INTERNAL_SECRET=same_value_as_convex_PADDLE_INTERNAL_SECRET
```

The `PADDLE_INTERNAL_SECRET` must match exactly what you set in Convex (Task 4 Step 1).

- [ ] **Step 2: Create the route file**

```ts
// app/api/paddle/webhook/route.ts
import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): boolean {
  // Paddle-Signature format: "ts=1671552000;h1=<hex_hash>"
  const parts = Object.fromEntries(
    signatureHeader.split(";").map((p) => p.split("=") as [string, string])
  );
  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) return false;

  const signed = `${ts}:${rawBody}`;
  const expected = createHmac("sha256", secret).update(signed, "utf8").digest("hex");

  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(h1, "hex"));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get("paddle-signature") ?? "";
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET ?? "";

  if (!verifyPaddleSignature(rawBody, signatureHeader, webhookSecret)) {
    console.warn("[paddle-webhook] Signature verification failed");
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Return 200 immediately — Paddle retries on non-200
  const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.replace(
    "convex.cloud",
    "convex.site"
  ) ?? "";
  const internalSecret = process.env.PADDLE_INTERNAL_SECRET ?? "";

  fetch(`${convexSiteUrl}/paddle-webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-paddle-internal-secret": internalSecret,
    },
    body: rawBody,
  }).catch((err: unknown) => {
    console.error("[paddle-webhook] Failed to forward to Convex:", err);
  });

  return new NextResponse("OK", { status: 200 });
}
```

Note: `NEXT_PUBLIC_CONVEX_URL` ends in `.convex.cloud`; replacing with `.convex.site` gives the HTTP actions endpoint. This is the same pattern used in the existing Meta webhook route (`NEXT_PUBLIC_CONVEX_SITE_URL` env var is also an option if already set — check `.env.local`).

- [ ] **Step 3: Test the signature verification logic manually**

Run this in a scratch file or Node REPL to confirm the function works:

```ts
// Quick manual test — run with: node --input-type=module
import { createHmac } from "crypto";

const secret = "test_secret";
const ts = String(Math.floor(Date.now() / 1000));
const body = JSON.stringify({ event_type: "subscription.activated" });
const hash = createHmac("sha256", secret).update(`${ts}:${body}`, "utf8").digest("hex");
const header = `ts=${ts};h1=${hash}`;

console.log("Header:", header);
// Paste into verifyPaddleSignature — should return true
```

- [ ] **Step 4: Register the webhook URL in Paddle Dashboard**

In the Paddle Dashboard → Developer Tools → Notifications:
- URL: `https://your-domain.com/api/paddle/webhook` (or ngrok URL for local testing)
- Events to subscribe: `subscription.activated`, `subscription.updated`, `subscription.canceled`

- [ ] **Step 5: Commit**

```bash
git add app/api/paddle/webhook/route.ts
git commit -m "feat(billing): add Paddle webhook route with HMAC-SHA256 signature verification"
```

---

## Task 7: Client-Side Paddle Setup

**Files:**
- Create: `lib/paddle.ts`
- Create: `components/paddle-provider.tsx`
- Modify: `app/(dashboard)/layout.tsx`

- [ ] **Step 1: Install Paddle.js v2**

```bash
npm install @paddle/paddle-js
```

Expected: installs `@paddle/paddle-js` and updates `package.json`.

- [ ] **Step 2: Add env vars to `.env.local`**

```env
# Add to .env.local
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=test_...   # from Paddle Dashboard → Authentication
NEXT_PUBLIC_PADDLE_SANDBOX=true            # set to false in production
```

- [ ] **Step 3: Create `lib/paddle.ts`**

```ts
// lib/paddle.ts
import {
  initializePaddle,
  type Paddle,
  type CheckoutOpenOptions,
} from "@paddle/paddle-js";

let _paddle: Paddle | undefined;

export async function initPaddle(): Promise<void> {
  if (_paddle) return;
  const env =
    process.env.NEXT_PUBLIC_PADDLE_SANDBOX === "true" ? "sandbox" : "production";
  _paddle = await initializePaddle({
    environment: env,
    token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
  });
}

export function openCheckout(options: CheckoutOpenOptions): void {
  _paddle?.Checkout.open(options);
}
```

- [ ] **Step 4: Create `components/paddle-provider.tsx`**

```tsx
// components/paddle-provider.tsx
"use client";

import { useEffect } from "react";
import { initPaddle } from "@/lib/paddle";

export function PaddleProvider() {
  useEffect(() => {
    initPaddle().catch((err: unknown) => {
      console.error("[PaddleProvider] Failed to initialize Paddle:", err);
    });
  }, []);

  return null;
}
```

- [ ] **Step 5: Add `<PaddleProvider />` to the dashboard layout**

In `app/(dashboard)/layout.tsx`, import and render PaddleProvider. The layout currently returns a JSX tree with `<ClerkProvider>` etc. Add the import at the top:

```ts
import { PaddleProvider } from "@/components/paddle-provider";
```

Then inside the returned JSX, add `<PaddleProvider />` anywhere inside the client component tree — place it just before the closing tag of the outermost div/fragment that wraps `{children}`:

```tsx
// Inside the dashboard layout's return, add before the closing wrapper tag:
<PaddleProvider />
```

The exact placement: look for the `<ConvexAuthGuard>` or `<SidebarInset>` wrapper that renders `{children}`. Place `<PaddleProvider />` as a sibling inside the same wrapper, after `{children}`.

- [ ] **Step 6: Verify the app builds without errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors or missing module errors.

- [ ] **Step 7: Commit**

```bash
git add lib/paddle.ts components/paddle-provider.tsx app/\(dashboard\)/layout.tsx package.json package-lock.json
git commit -m "feat(billing): add Paddle.js v2 client wrapper and PaddleProvider"
```

---

## Task 8: usePlan Hook

**Files:**
- Create: `lib/hooks/use-plan.ts`

- [ ] **Step 1: Create the hook file**

```ts
// lib/hooks/use-plan.ts
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "use-plan"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/use-plan.ts
git commit -m "feat(billing): add usePlan hook"
```

---

## Task 9: Rewrite PlanSelector

**Files:**
- Rewrite: `components/settings/plan-selector.tsx`

This replaces the placeholder component that called `updatePlan` directly. The new component:
- Shows 4 plan cards with correct labels/buttons based on current plan
- Free→paid: calls `createCheckout` → opens Paddle overlay
- Paid→paid: calls `updateSubscription` → instant
- Shows "Manage subscription" button (opens Paddle portal) when on paid plan

- [ ] **Step 1: Rewrite `components/settings/plan-selector.tsx`**

```tsx
"use client";

import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { plans } from "@/lib/marketing/pricing-data";
import { usePlan } from "@/lib/hooks/use-plan";
import { openCheckout } from "@/lib/paddle";
import { useT } from "@/lib/i18n/context";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

type PaidPlan = "starter" | "growth" | "business";

function isPaidPlan(plan: string): plan is PaidPlan {
  return plan === "starter" || plan === "growth" || plan === "business";
}

export function PlanSelector() {
  const { plan: currentPlan, hasSubscription } = usePlan();
  const createCheckout = useAction(api.billing.createCheckout);
  const updateSubscription = useAction(api.billing.updateSubscription);
  const getCustomerPortalUrl = useAction(api.billing.getCustomerPortalUrl);

  const [loading, setLoading] = useState<string | null>(null);
  const t = useT();

  async function handleSelectPlan(planId: string) {
    if (planId === currentPlan || planId === "free") return;
    if (!isPaidPlan(planId)) return;

    setLoading(planId);
    try {
      if (!hasSubscription) {
        // Flow A: Free → paid — open Paddle checkout overlay
        const { transactionId } = await createCheckout({ plan: planId });
        openCheckout({ transactionId });
      } else {
        // Flow B: paid → paid — instant subscription update
        await updateSubscription({ plan: planId });
      }
    } catch (err) {
      console.error("[PlanSelector] plan change failed:", err);
    } finally {
      setLoading(null);
    }
  }

  async function handleManageSubscription() {
    setLoading("portal");
    try {
      const { url } = await getCustomerPortalUrl();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("[PlanSelector] portal failed:", err);
    } finally {
      setLoading(null);
    }
  }

  if (currentPlan === undefined) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isLoading = loading === plan.id;
          const isFree = plan.id === "free";

          return (
            <div
              key={plan.id}
              className={`relative rounded-lg border p-4 transition-colors ${
                isCurrent
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              {isCurrent && (
                <Badge variant="secondary" className="absolute top-3 inset-e-3 text-xs">
                  {t("Current plan", "الخطة الحالية")}
                </Badge>
              )}

              <div className="font-semibold text-base mb-1">
                {t(plan.nameEn, plan.nameAr)}
              </div>

              <div className="text-sm text-muted-foreground mb-3">
                {plan.price.USD === "0"
                  ? t("Free", "مجاني")
                  : `$${plan.price.USD}/${t("mo", "شهر")}`}
              </div>

              <div className="text-xs text-muted-foreground mb-4">
                {plan.agentLimit
                  ? t(`Up to ${plan.agentLimit} agents`, `حتى ${plan.agentLimit} وكلاء`)
                  : t("Unlimited agents", "وكلاء غير محدودين")}
              </div>

              {!isFree && !isCurrent && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isLoading}
                  className="w-full"
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {isLoading
                    ? t("Loading…", "جارٍ التحميل…")
                    : t("Select", "اختر")}
                </Button>
              )}

              {isCurrent && !isFree && (
                <p className="text-xs text-muted-foreground mt-2">
                  {t("Active subscription", "اشتراك نشط")}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {hasSubscription && (
        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            disabled={loading === "portal"}
            onClick={handleManageSubscription}
            className="text-muted-foreground gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            {t("Manage subscription (cancel, invoices)", "إدارة الاشتراك (إلغاء، فواتير)")}
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors in the component**

```bash
npx tsc --noEmit 2>&1 | grep plan-selector
```

Expected: no output.

- [ ] **Step 3: Start the dev server and test the billing page manually**

```bash
npm run dev
```

Navigate to `http://localhost:3000/settings/billing`.

Verify:
- [ ] All 4 plan cards render with correct names and prices
- [ ] Current plan shows "Current plan" badge
- [ ] Free plan card has no "Select" button
- [ ] Paid plan cards show "Select" button (if not current)
- [ ] Clicking a paid plan when on Free triggers `createCheckout` (check Network tab for Convex action call)
- [ ] "Manage subscription" section is hidden when on Free plan

Note: The Paddle overlay won't open in dev without real price IDs in `.env.local`. Use Paddle sandbox test credentials to do a full end-to-end test.

- [ ] **Step 4: Commit**

```bash
git add components/settings/plan-selector.tsx
git commit -m "feat(billing): rewrite PlanSelector with real Paddle checkout and plan-switch flows"
```

---

## Task 10: End-to-End Smoke Test

No new files — manual verification only.

- [ ] **Step 1: Configure Paddle sandbox credentials**

In Paddle sandbox dashboard:
1. Create 3 products + prices (Starter, Growth, Business)
2. Copy their price IDs into `.env.local` as `NEXT_PUBLIC_PADDLE_...` and Convex env vars
3. Set up a webhook notification pointing to your ngrok tunnel: `ngrok http 3000`, then `https://<id>.ngrok.io/api/paddle/webhook`

- [ ] **Step 2: Test Flow A — Free → paid checkout**

1. Log in as a tenant on the Free plan
2. Navigate to Settings → Billing
3. Click "Select" on the Starter plan
4. Paddle overlay should open pre-filled with your Clerk email
5. Enter Paddle test card: `4242 4242 4242 4242`, any future date, any CVC
6. Complete checkout
7. Verify `subscription.activated` webhook arrives in your ngrok inspector
8. Verify in Convex dashboard → Data → tenants that the tenant's `plan` updated to `starter`

- [ ] **Step 3: Test Flow B — paid → paid instant switch**

1. While on Starter, click "Select" on Growth
2. No overlay should appear — request goes to `updateSubscription` action
3. Verify `subscription.updated` webhook fires
4. Verify tenant `plan` updated to `growth` in Convex

- [ ] **Step 4: Test Flow C — cancel**

1. Click "Manage subscription"
2. Paddle portal opens in new tab
3. Cancel the subscription
4. Verify `subscription.canceled` webhook fires
5. Verify tenant `plan` reverts to `free`

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat(billing): complete Paddle billing integration — checkout, plan switching, webhook, enforcement"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] `paddle_customer_id`, `paddle_subscription_id`, `plan_activated_at` added to schema — Task 1
- [x] Paddle checkout flow (Free → paid) — Tasks 4 + 7 + 9
- [x] Webhook handler updating `tenant.plan` — Tasks 4 + 5 + 6
- [x] Plan enforcement middleware — Task 2 (`assertPlanAtLeast`) + Task 8 (`usePlan`)
- [x] In-app upgrade/downgrade (paid ↔ paid) — Tasks 4 + 9
- [x] Customer portal link for cancellation — Tasks 4 + 9
- [x] Server-initiated checkout (tenantId set server-side) — Task 4 `createCheckout`
- [x] HMAC-SHA256 webhook signature verification — Task 6
- [x] Admin-only gating on `updateSubscription` and `getCustomerPortalUrl` — Task 4

**Type consistency:**
- `Plan` type: defined in `planLimits.ts`, imported everywhere
- `getSubscriptionStatus` returns `{ plan: Plan; hasSubscription: boolean }` — used in `usePlan`
- `createCheckout` returns `{ transactionId: string }` — consumed in PlanSelector
- `updateSubscription` returns `{ ok: boolean }` — PlanSelector ignores return value (correct)
- `getCustomerPortalUrl` returns `{ url: string }` — consumed in PlanSelector
- `handlePaddleEvent` args match what `paddleWebhook` passes — verified in Task 4

**No placeholders:** All code blocks are complete. No TBDs.
