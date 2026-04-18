# Paddle Billing Integration — Design Spec

**Date:** 2026-04-18  
**Status:** Approved  
**Scope:** Paddle.js v2 checkout, subscription management, webhook handler, plan enforcement

---

## 1. Overview

Replace the placeholder `PlanSelector` (which directly mutates `tenant.plan` without payment) with a real Paddle Billing integration. Tenants upgrade/downgrade plans through Paddle checkout or Paddle's subscription update API. Plan limits continue to be enforced server-side in Convex.

**Key decisions:**
- No Paddle-native trial — the Free plan is the trial, immediate billing on first upgrade
- Server-initiated checkout (Convex action creates Paddle transaction → returns `transactionId` to client)
- In-app plan switching for paid↔paid (Paddle subscription update API, no overlay)
- Paddle Customer Portal for cancellations only
- Price IDs stored in env vars, not hardcoded

---

## 2. Schema Changes

Add three optional fields to the `tenants` table in `convex/schema.ts`:

```ts
paddle_customer_id:      v.optional(v.string()),  // Paddle customer ID, set on first checkout.completed
paddle_subscription_id:  v.optional(v.string()),  // Paddle subscription ID, set on subscription.activated
plan_activated_at:       v.optional(v.number()),  // Unix ms timestamp of last plan change
```

`plan` already exists as `v.union(v.literal("free"), v.literal("starter"), v.literal("growth"), v.literal("business"))` — no change.

---

## 3. Environment Variables

### Convex environment (server-side only)
```env
PADDLE_API_KEY=               # Paddle secret API key
PADDLE_WEBHOOK_SECRET=        # For webhook signature verification
PADDLE_PRICE_STARTER=         # Paddle price ID for Starter plan
PADDLE_PRICE_GROWTH=          # Paddle price ID for Growth plan
PADDLE_PRICE_BUSINESS=        # Paddle price ID for Business plan
PADDLE_SANDBOX=true           # "true" in dev, "false" in production
```

### Next.js environment (client-safe)
```env
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=   # Paddle browser-safe token (not the API key)
NEXT_PUBLIC_PADDLE_SANDBOX=true    # mirrors PADDLE_SANDBOX
```

---

## 4. Checkout & Plan Change Flows

### Flow A — First paid purchase (Free → paid plan)

1. User on Free plan clicks a paid plan card
2. Client calls Convex action `billing.createCheckout({ plan })`
3. Convex action:
   - Gets `tenantId` + `email` from Clerk auth context
   - Validates tenant is currently on Free (blocks if already paid — use Flow B instead)
   - Calls `POST https://api.paddle.com/transactions` with:
     - `items: [{ priceId, quantity: 1 }]`
     - `customer: { email }` (pre-filled from Clerk)
     - `custom_data: { tenantId }` (authoritative binding, set server-side)
   - Returns `{ transactionId }`
4. Client opens Paddle overlay: `paddle.Checkout.open({ transactionId })`
5. Customer enters card → Paddle processes → fires `subscription.activated` webhook
6. Webhook handler updates `tenant.plan`, `paddle_customer_id`, `paddle_subscription_id`, `plan_activated_at`

### Flow B — Plan change between paid plans (upgrade or downgrade)

1. User on a paid plan clicks a different paid plan card
2. Client calls Convex action `billing.updateSubscription({ plan })`
3. Convex action:
   - Gets `tenantId` from auth context → reads `paddle_subscription_id` from tenant
   - Calls `PATCH https://api.paddle.com/subscriptions/{paddle_subscription_id}` with:
     - `items: [{ priceId, quantity: 1 }]`
     - `proration_billing_mode: "prorated_immediately"`
   - No overlay needed — resolves instantly
4. Paddle fires `subscription.updated` webhook
5. Webhook handler updates `tenant.plan` and `plan_activated_at`

### Flow C — Cancellation (paid → Free)

1. User clicks "Manage subscription" button
2. Convex action `billing.getCustomerPortalUrl` returns Paddle portal URL
3. Convex action returns Paddle Customer Portal URL → client navigates to it (external Paddle page)
4. Paddle fires `subscription.canceled` webhook
5. Webhook handler sets `tenant.plan = "free"`, clears `paddle_subscription_id`

---

## 5. Webhook Handler

**Route:** `app/api/paddle/webhook/route.ts` (Next.js API route, not Convex)

Paddle requires a standard HTTPS endpoint — same pattern as the Meta webhook.

### Signature Verification
Paddle sends `Paddle-Signature` header containing a timestamp and HMAC-SHA256 hash. Verify before processing any event. Reject with HTTP 400 on failure.

Use manual HMAC-SHA256 verification (or `@paddle/paddle-node-sdk` server package if installed separately) — do not confuse with `@paddle/paddle-js` which is client-only.

### Events Handled

| Event | Action |
|---|---|
| `subscription.activated` | Set `plan`, `paddle_customer_id`, `paddle_subscription_id`, `plan_activated_at` |
| `subscription.updated` | Update `plan`, `plan_activated_at` |
| `subscription.canceled` | Set `plan = "free"`, clear `paddle_subscription_id`, clear `paddle_customer_id` |
| All others | Return 200 (no-op) |

### tenantId Resolution

`custom_data.tenantId` (set during checkout creation) is the authoritative link for `subscription.activated`. For `subscription.updated` and `subscription.canceled`, look up tenant by `paddle_subscription_id` field.

### Internal Flow
```
POST /api/paddle/webhook
  → verify Paddle-Signature
  → parse event + extract tenantId
  → call internal Convex action: api.billing.handlePaddleEvent({ event, tenantId })
  → Convex updates tenant document
  → return 200
```

---

## 6. Convex Functions (`convex/billing.ts`)

### `billing.createCheckout` — public action
- Auth: any authenticated member (Clerk orgId = tenantId)
- Input: `{ plan: "starter" | "growth" | "business" }`
- Validates tenant is on Free plan
- Creates Paddle transaction via Paddle REST API
- Returns `{ transactionId: string }`

### `billing.updateSubscription` — public action
- Auth: Admin only — verify `organizationMembership.role === "org:admin"` inside the action
- Input: `{ plan: "starter" | "growth" | "business" }`
- Reads `paddle_subscription_id` from tenant
- Throws if tenant has no active subscription (i.e. currently on Free — use createCheckout instead)
- Calls Paddle PATCH /subscriptions
- Returns `{ ok: true }`

### `billing.getCustomerPortalUrl` — public action
- Auth: Admin only — same role check as above
- Returns Paddle Customer Portal URL for the tenant's `paddle_customer_id`
- Throws if `paddle_customer_id` is not set (tenant never paid)

### `billing.handlePaddleEvent` — internal action
- Called only by webhook route (internal, not exposed to clients)
- Input: `{ eventType, tenantId, paddleCustomerId, paddleSubscriptionId, newPlan }`
- Runs `ctx.db.patch` to update the tenant document

---

## 7. Plan Enforcement

Extend `convex/lib/planLimits.ts` — additive only, no breaking changes.

### New: `assertPlanAtLeast`
```ts
const PLAN_RANK: Record<Plan, number> = { free: 0, starter: 1, growth: 2, business: 3 };

export function assertPlanAtLeast(current: Plan, required: Plan): void {
  if (PLAN_RANK[current] < PLAN_RANK[required]) {
    throw new ConvexError({
      message: "PLAN_LIMIT_REACHED",
      data: { currentPlan: current, requiredPlan: required },
    });
  }
}
```

**Usage examples:**
- Round Robin: `assertPlanAtLeast(plan, "growth")`
- WhatsApp profile editing: `assertPlanAtLeast(plan, "growth")`
- Broadcasts: `assertPlanAtLeast(plan, "starter")`

### New: `usePlan()` client hook (`lib/hooks/use-plan.ts`)
```ts
// returns: { plan, isPaid, atLeast(p: Plan): boolean }
```

Used in UI to show upgrade prompts and conditionally disable feature buttons.

---

## 8. Client-Side Paddle Wrapper (`lib/paddle.ts`)

Thin wrapper around Paddle.js v2:

```ts
initPaddle(clientToken, sandbox)  // called once in root layout (client component)
openCheckout(transactionId)       // opens overlay
openCustomerPortal(customerId)    // opens Paddle portal
```

Paddle.js v2 is loaded via `@paddle/paddle-js` npm package (not a script tag).

---

## 9. UI Changes (`components/settings/plan-selector.tsx`)

Rewrite the existing placeholder component:

- Shows all 4 plan cards (Free, Starter, Growth, Business)
- Current plan: "Current plan" badge, disabled button
- Free plan card: always visible; if already on free, shows "Current plan"
- Paid plan cards show price in USD (Paddle handles geo-currency display in overlay)
- Single `handlePlanSelect(plan)` handler:
  - If `currentPlan === "free"` → Flow A (createCheckout → overlay)
  - If `currentPlan` is paid → Flow B (updateSubscription → instant)
- "Manage subscription" link at bottom → opens Paddle portal (cancel/billing history)
- Loading state per card during async operations

---

## 10. New Files

| File | Purpose |
|---|---|
| `app/api/paddle/webhook/route.ts` | Webhook receiver + signature verification |
| `convex/billing.ts` | All Paddle-related Convex actions |
| `lib/paddle.ts` | Client-side Paddle.js wrapper |
| `lib/hooks/use-plan.ts` | `usePlan()` React hook |

## Modified Files

| File | Change |
|---|---|
| `convex/schema.ts` | Add 3 fields to `tenants` table |
| `convex/lib/planLimits.ts` | Add `assertPlanAtLeast` + `PLAN_RANK` |
| `components/settings/plan-selector.tsx` | Full rewrite to real Paddle flow |
| `app/layout.tsx` (or a client wrapper) | Add `initPaddle()` call |

---

## 11. Out of Scope (v1)

- Annual billing discount (separate Paddle price variants)
- In-app cancellation flow (Paddle Customer Portal handles it)
- Invoice/receipt display
- Grace period after failed payment (Paddle handles dunning)
- Multi-currency display on plan cards (Paddle overlay handles it)
