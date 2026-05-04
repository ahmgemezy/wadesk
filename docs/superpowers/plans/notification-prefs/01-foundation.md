# Notification Prefs — Stage 1: Foundation Code

> Implementer: GLM 5.1.
> Reviewer: Claude Code.
> Approver: Ahmed.
>
> Apply sections in this order: **1 → 2 → 3 → 4 → 7 → 5 → 6.**
> Run `npx tsc --noEmit` after **each** section. Stop on the first error and report.
>
> **Read this entire document once before applying any section.** Each AFTER block is the literal final state of the file (or relevant slice), not a diff. Copy the AFTER block, do not patch the BEFORE block.

---

> ## ⚠️ Stage 1 Amendment — Email Resolution Architecture (2026-05-04)
>
> **This document was amended after Stage 2 review surfaced an architectural
> defect in the email-resolution flow.** Stage 1 originally had `notifyDispatch`
> accept an `email` arg from callers. This is incompatible with mutation context
> (Clerk Node SDK requires `"use node"`, which mutations cannot use).
>
> **Fix:** `notifyDispatch.args` accepts `userId` only. `notifySend` (an action
> with Node available) resolves the email via `resolveUserEmail` from
> `convex/lib/emailHelpers.ts` — the canonical helper used by `slaBreachEmail`
> and other existing `*Email` wrappers.
>
> Sections affected: Section 5b (notifyDispatch), Section 7 (notifySend).
> Call sites pass `userId`, never `email`. Apply this fix BEFORE any Stage 2
> migration.
>
> **Acknowledged tradeoff:** if email resolution fails inside `notifySend`
> (e.g., Clerk lookup fails, user has no primary email on file), the daily-
> email-cap slot consumed by `notifyDispatch.tryConsumeQuota` is "spent"
> without an email being sent. Acceptable — soft cap, rare failure mode,
> recovering the slot adds complexity for marginal savings.

---

## Pre-flight checklist

Verify the following files are at the line counts shown. If any file's line count differs by more than ±3 lines, **stop and re-confirm with the reviewer before applying** — the BEFORE blocks below were captured against these exact counts.

| File | Expected lines | Touched in section |
| --- | --- | --- |
| [convex/schema.ts](convex/schema.ts) | 703 | 1 |
| [convex/lib/rateLimit.ts](convex/lib/rateLimit.ts) | 68 | 3 |
| [convex/lib/tenants.ts](convex/lib/tenants.ts) | 199 | 4 |
| [convex/notifications.ts](convex/notifications.ts) | 175 | 5, 6 |
| [convex/actions/notifyEmail.ts](convex/actions/notifyEmail.ts) | 199 | 7 |
| [convex/lib/notificationEvents.ts](convex/lib/notificationEvents.ts) | new file | 2 |

Total: **5 modified files + 1 new file.** Anything else in `git status` is a violation.

Confirmation command before starting:
```bash
wc -l convex/schema.ts convex/lib/rateLimit.ts convex/lib/tenants.ts convex/notifications.ts convex/actions/notifyEmail.ts
```

---

## Section 1 — Schema additions to `convex/schema.ts`

### 1a — Split `channel_expiring_soon` literal

Add a new `channel_token_expired` literal alongside the existing `channel_expiring_soon`. Both literals coexist; existing rows keep using the original.

**BEFORE** — current `notifications.type` union (lines 375–389 of `convex/schema.ts`):

```ts
    type: v.union(
      v.literal("followup_due"),
      v.literal("sla_breach"),
      v.literal("template_approved"),
      v.literal("template_rejected"),
      v.literal("channel_expiring_soon"),
      v.literal("channel_deleted"),
      v.literal("agent_welcome"),
      v.literal("billing_payment_failed"),
      v.literal("billing_subscription_expired"),
      v.literal("conversation_transferred"),
      v.literal("conversation_reopened"),
      v.literal("new_assignment"),
    ),
```

**AFTER** — same block with `channel_token_expired` added immediately after `channel_expiring_soon`:

```ts
    type: v.union(
      v.literal("followup_due"),
      v.literal("sla_breach"),
      v.literal("template_approved"),
      v.literal("template_rejected"),
      v.literal("channel_expiring_soon"),
      v.literal("channel_token_expired"),
      v.literal("channel_deleted"),
      v.literal("agent_welcome"),
      v.literal("billing_payment_failed"),
      v.literal("billing_subscription_expired"),
      v.literal("conversation_transferred"),
      v.literal("conversation_reopened"),
      v.literal("new_assignment"),
    ),
```

**Note:** Do not remove `channel_expiring_soon` — both literals coexist; existing rows keep using the original. Stage 2 will migrate the misnamed call site at `convex/followUps.ts:476` from `channel_expiring_soon` to `channel_token_expired`. Until then, no row uses the new literal — that is expected.

### 1b — New `notificationPreferences` table

**Placement:** Insert immediately before the `memberProfiles` definition. In the file as captured, `memberProfiles: defineTable({` starts at **line 693** (preceded by the closing `,` of `memberActionLog`'s last index on line 692, then a blank line). **Verify this line number with `grep -n 'memberProfiles:' convex/schema.ts` before editing.**

Insert this block (with the trailing blank line preserved so `memberProfiles` keeps its current vertical spacing):

```ts
  notificationPreferences: defineTable({
    tenantId: v.string(),
    userId: v.string(),
    eventType: v.union(
      v.literal("sla_breach"),
      v.literal("followup_due"),
      v.literal("conversation_transferred"),
      v.literal("conversation_assigned"),
      v.literal("conversation_reopened"),
      v.literal("csat_received"),
      v.literal("channel_expiring_soon"),
    ),
    inAppEnabled: v.boolean(),
    emailEnabled: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_tenant_user", ["tenantId", "userId"])
    .index("by_tenant_user_event", ["tenantId", "userId", "eventType"]),

```

#### Anti-instructions for Section 1

- **DO NOT** remove or rename the `channel_expiring_soon` literal — Stage 2 migrates callers, this section only adds the new literal.
- **DO NOT** add fields like `createdAt`, `metadata`, `quietHoursStart`, `quietHoursEnd`, `digest`, `priority`, `severity`, or any field beyond the 6 above. They are out of scope for v1.
- **DO NOT** add `_creationTime` — Convex provides it implicitly.
- **DO NOT** change the `eventType` union to include `channel_token_expired`, `agent_welcome`, `billing_*`, `template_*`, or `channel_deleted`. Those are transactional (always-sent) and are deliberately excluded from the user-toggleable matrix.
- **DO NOT** reorder existing tables.

---

## Section 2 — `convex/lib/notificationEvents.ts` (new file)

This is a brand-new file. Create it with this exact body:

```ts
// convex/lib/notificationEvents.ts
// Single source of truth for notification event types and their defaults.
// Stage 1 of notification-prefs feature. DO NOT add fields here.

import { v } from "convex/values";
import type { Plan } from "./planLimits";

/**
 * User-toggleable event types. These are the events that appear in the
 * preferences UI. Transactional events (agent_welcome, channel_token_expired,
 * channel_deleted, billing_*) bypass this list and always send.
 */
export const TOGGLEABLE_EVENT_TYPES = [
  "sla_breach",
  "followup_due",
  "conversation_transferred",
  "conversation_assigned",
  "conversation_reopened",
  "csat_received",
  "channel_expiring_soon",
] as const;

export type ToggleableEventType = (typeof TOGGLEABLE_EVENT_TYPES)[number];

/**
 * Convex validator for the toggleable union. Use this for any mutation
 * argument that takes an eventType from the matrix.
 */
export const toggleableEventTypeValidator = v.union(
  v.literal("sla_breach"),
  v.literal("followup_due"),
  v.literal("conversation_transferred"),
  v.literal("conversation_assigned"),
  v.literal("conversation_reopened"),
  v.literal("csat_received"),
  v.literal("channel_expiring_soon"),
);

/**
 * Default preferences applied when no row exists for (tenantId, userId, eventType).
 * Decision 2a: opt-out, defaults all on for in-app. Email defaults are conservative
 * (cost-aware) — see notification-prefs/01-foundation.md for the table.
 */
export const EVENT_DEFAULTS: Record<
  ToggleableEventType,
  { inAppEnabled: boolean; emailEnabled: boolean }
> = {
  sla_breach:               { inAppEnabled: true,  emailEnabled: true  },
  followup_due:             { inAppEnabled: true,  emailEnabled: false },
  conversation_transferred: { inAppEnabled: true,  emailEnabled: false },
  conversation_assigned:    { inAppEnabled: true,  emailEnabled: true  },
  conversation_reopened:    { inAppEnabled: true,  emailEnabled: false },
  csat_received:            { inAppEnabled: true,  emailEnabled: false },
  channel_expiring_soon:    { inAppEnabled: true,  emailEnabled: true  },
};

/**
 * Events restricted to Growth+ plans. The toggle UI must hide or disable
 * these for Free/Starter users. notifyDispatch must short-circuit if the
 * tenant's plan is below the gate.
 */
export const GROWTH_PLUS_ONLY_EVENTS = new Set<ToggleableEventType>([
  "sla_breach",
  "csat_received",
]);

/**
 * Daily email cap per plan. Free is N/A — email channel is fully locked
 * behind Starter+. Soft cap: notifyDispatch silently drops the email
 * dispatch (in-app still fires) when reached.
 */
export const EMAIL_DAILY_CAP_BY_PLAN: Record<Plan, number | null> = {
  free: null, // email channel disabled entirely
  starter: 50,
  growth: 200,
  business: 1000,
};

/** Helper: returns the daily quota key for the rateLimits table. */
export function makeEmailDailyKey(tenantId: string, dateYmd: string): string {
  return `email:daily:${tenantId}:${dateYmd}`;
}

/** Helper: today's date in YYYY-MM-DD (UTC). */
export function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}
```

#### Anti-instructions for Section 2

- **DO NOT** import this file from any of Stage 1's other deliverables yet — Stages 2–6 will wire it up. *Exception:* Section 5 (`notifyDispatch`), Section 7 (`notifySend`), and Section 6 (`getPreferences` / `updatePreference`) are the **first consumers** within this stage and must import it. No other file imports from it in Stage 1.
- **DO NOT** add `agent_welcome`, `channel_token_expired`, `channel_deleted`, `billing_*`, `template_*`, or `new_assignment` to `TOGGLEABLE_EVENT_TYPES`. They are transactional and always sent.
- **DO NOT** add `notificationRoute` or any UI-routing logic here — this is a pure-data module.
- **DO NOT** export mutable state.

---

## Section 3 — `convex/lib/rateLimit.ts` (add `tryConsumeQuota`)

**BEFORE** — full file (68 lines):

```ts
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
```

**AFTER** — full file with `tryConsumeQuota` appended (no other changes; imports already include `GenericMutationCtx` and `DataModel`):

```ts
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
```

#### Anti-instructions for Section 3

- **DO NOT** modify or wrap `enforceRateLimit` — leave it untouched.
- **DO NOT** add `try/catch` around the `tryConsumeQuota` body.
- **DO NOT** add a `windowMs` parameter — the caller encodes the window in the key (date-stamped).
- **DO NOT** make `tryConsumeQuota` throw on over-cap — returning `false` is the entire reason this helper exists separately from `enforceRateLimit`.
- **DO NOT** patch `windowStart` in the existing-row branch — date-keyed rows do not need rollover.

---

## Section 4 — `convex/lib/tenants.ts` (add `readPlan`)

**BEFORE** — file head (lines 1–28, the imports + `getCurrentPlan` + `getPlan`):

```ts
import { query, internalQuery, internalMutation, mutation } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import type { Plan } from "./planLimits";
import { getCallerIdentity, assertAdmin, type OrgRole } from "./auth";

export const getCurrentPlan = query({
  args: {},
  handler: async (ctx): Promise<Plan> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.orgId) return "free";
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", identity.orgId as string))
      .first();
    return (tenant?.plan as Plan) ?? "free";
  },
});

export const getPlan = internalQuery({
  args: { tenantId: v.string() },
  handler: async (ctx, args): Promise<Plan> => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();
    return (tenant?.plan as Plan) ?? "free";
  },
});
```

**AFTER** — same slice with two import-line additions and a new `readPlan` plain async function appended **at the end of the file** (after the existing last export `updateForwardTemplate`). The two new `import type` lines are added under the existing imports; nothing existing is removed.

Imports block — replace lines 1–4 with:

```ts
import { query, internalQuery, internalMutation, mutation } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel } from "../_generated/dataModel";
import type { Plan } from "./planLimits";
import { getCallerIdentity, assertAdmin, type OrgRole } from "./auth";
```

Append at the end of the file (after the closing `});` of `updateForwardTemplate` at line 199):

```ts

/**
 * Read the tenant's plan from inside a mutation context (where ctx.runQuery
 * is unavailable). Returns "free" if the tenant row is missing.
 *
 * Use from internalMutation handlers; for actions, prefer
 * ctx.runQuery(internal.lib.tenants.getPlan).
 */
export async function readPlan(
  ctx: GenericMutationCtx<DataModel> | GenericQueryCtx<DataModel>,
  tenantId: string,
): Promise<Plan> {
  const tenant = await ctx.db
    .query("tenants")
    .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
    .first();
  return (tenant?.plan as Plan | undefined) ?? "free";
}
```

#### Anti-instructions for Section 4

- **DO NOT** refactor `getPlan` or `getCurrentPlan` to call `readPlan` — that's pre-existing duplication, leave it alone (CLAUDE.md §30.6, surgical changes).
- **DO NOT** export `readPlan` as a Convex `query` — it's a plain async function. No `internalQuery({...})` wrapper.
- **DO NOT** delete the `Ctx` type alias (it doesn't exist in this file — that's `rateLimit.ts`). If you find yourself wanting to add one, stop — this file deliberately uses inline `GenericMutationCtx<DataModel>` types.
- **DO NOT** add a `readPlanByOrgId` or any other variant — `readPlan(ctx, tenantId)` is the only signature needed.

---

## Section 7 — `convex/actions/notifyEmail.ts` (add `notifySend`)

> Apply this section **before** Section 5. `notifyDispatch` (Section 5) references `internal.actions.notifyEmail.notifySend`, which only exists after this section is applied. Reverse order means Convex codegen will fail to find the symbol.

**BEFORE** — file head (lines 1–7):

```ts
"use node";

import { internalAction, action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { resolveUserEmail, getAdminEmails, resolveOrgName } from "../lib/emailHelpers";

```

(The remainder of the file — `slaBreachEmail`, `followupDueEmail`, `newAssignmentEmail`, `agentWelcomeEmail`, `sendWelcomeOnJoin`, `billingPaymentFailedEmail`, `billingSubscriptionExpiredEmail` — is unchanged. **Do not touch any of them.**)

**AFTER** — same head with one import line added, and the new `notifySend` action plus its `mapEventToTemplateKey` helper appended at the **end of the file** (after `billingSubscriptionExpiredEmail`'s closing `});`):

Replace lines 1–7 with:

```ts
"use node";

import { internalAction, action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { resolveUserEmail, getAdminEmails, resolveOrgName } from "../lib/emailHelpers";
import {
  toggleableEventTypeValidator,
  type ToggleableEventType,
} from "../lib/notificationEvents";

```

(`resolveUserEmail` is already exported from `convex/lib/emailHelpers.ts` and is the canonical Clerk-resolution path used by the existing `slaBreachEmail`, `followupDueEmail`, and `newAssignmentEmail` wrappers — no new dependency needed.)

Append at the very end of the file:

```ts

/**
 * Generic notification email dispatcher. Resolves the recipient's email from
 * Clerk (via the lib/emailHelpers helper, which uses @clerk/nextjs/server),
 * then forwards to internal.actions.sendEmail with the appropriate template.
 * Called only by notifyDispatch via ctx.scheduler.runAfter.
 *
 * Email resolution lives here (not in notifyDispatch) because Clerk Node SDK
 * requires "use node", which is action-only. If email resolution fails or
 * the user has no primary email, this action returns silently — the daily-
 * cap slot in rateLimits has already been consumed by notifyDispatch
 * (acknowledged tradeoff per the Stage 1 amendment callout near the top
 * of this document).
 */
export const notifySend = internalAction({
  args: {
    userId: v.string(),
    tenantId: v.string(),
    eventType: toggleableEventTypeValidator,
    variables: v.any(),
  },
  handler: async (ctx, args) => {
    // 1. Resolve email via the canonical helper (matches slaBreachEmail's pattern).
    const email = await resolveUserEmail(args.userId);
    if (!email) {
      console.warn("notifySend: user has no primary email", args.userId);
      return;
    }

    // 2. Look up locale + map event to template.
    const locale = await ctx.runQuery(internal.lib.tenants.getEmailLocale, {
      tenantId: args.tenantId,
    });
    const templateKey = mapEventToTemplateKey(args.eventType);
    if (!templateKey) {
      // Event has no email template yet (e.g. csat_received before Stage 6).
      // Silent skip — in-app row already fired upstream.
      return;
    }

    // 3. Forward to the existing sendEmail action.
    await ctx.runAction(internal.actions.sendEmail.sendEmail, {
      to: email,
      templateKey,
      locale,
      variables: args.variables,
    });
  },
});

/**
 * Maps a toggleable eventType to the matching templateKey understood by
 * sendEmail. Templates that don't exist yet return null — Stage 6 fills these in.
 */
function mapEventToTemplateKey(eventType: ToggleableEventType): string | null {
  switch (eventType) {
    case "sla_breach":               return "sla_breach";
    case "followup_due":             return "followup_due_sent"; // failure variant uses different path
    case "conversation_assigned":    return "new_assignment";
    case "channel_expiring_soon":    return "channel_expiring_soon";
    case "conversation_transferred": return null; // Stage 6 — template TBD
    case "conversation_reopened":    return null; // Stage 6 — template TBD
    case "csat_received":            return null; // Stage 6 — template TBD
  }
}
```

**Exhaustive-switch note:** the `switch` over `ToggleableEventType` has **no `default:` branch** on purpose. TypeScript flags any new toggleable event added to `TOGGLEABLE_EVENT_TYPES` (Section 2) that isn't mapped here as a compile error. This is the desired behavior — it forces a Stage-6-style "decide what template this event uses" decision rather than silently returning `undefined`.

The `internal.actions.sendEmail.sendEmail` reference resolves to the existing internal action at [convex/actions/sendEmail.ts:97](convex/actions/sendEmail.ts#L97); no changes needed there. The four `templateKey` values returned (`"sla_breach"`, `"followup_due_sent"`, `"new_assignment"`, `"channel_expiring_soon"`) are all already present in the `SUBJECTS` map in [convex/actions/sendEmail.ts:16-53](convex/actions/sendEmail.ts#L16-L53) and are all wired in `buildElement` at [convex/actions/sendEmail.ts:67-95](convex/actions/sendEmail.ts#L67-L95).

#### Anti-instructions for Section 7

- **DO NOT** add a `default:` case to the switch — exhaustive switches catch missing events at compile time. Adding `default:` defeats the purpose.
- **DO NOT** inline the templateKey mapping at every call site — keep it in `mapEventToTemplateKey`.
- **DO NOT** swallow errors from `sendEmail` — let them propagate. Convex will retry the scheduled action.
- **DO NOT** modify any of the existing email actions (`slaBreachEmail`, `followupDueEmail`, etc.) — Stage 2 will retire them gradually as call sites migrate to `notifyDispatch`. Stage 1 leaves them intact.
- **DO NOT** "use node" twice — the directive is already present at the top of the file.
- **DO NOT** convert the `mapEventToTemplateKey` function to an exported const — it is intentionally module-private.
- **DO NOT** introduce a new Clerk-client construction pattern. The canonical Clerk-resolution path in this codebase is `resolveUserEmail(userId)` from `convex/lib/emailHelpers.ts`. Match `slaBreachEmail`'s usage exactly — consistency wins.
- **DO NOT** import `@clerk/backend` or `@clerk/clerk-sdk-node` — they are not installed. Use `resolveUserEmail`.
- **DO NOT** swallow the email-resolution result silently with no log — `console.warn` on missing email is required for observability.
- **DO NOT** retry inside this handler — Convex retries failed actions automatically; manual retry would compound.
- **DO NOT** call `tryConsumeQuota` here to "give back" the slot — the soft-cap leak is acknowledged.

---

## Section 5 — `convex/notifications.ts` changes

Apply Section 7 before this section, otherwise `internal.actions.notifyEmail.notifySend` will not exist and Convex codegen will fail.

### 5a — Fix `internalCreate` validator (Risk 2 from Stage 0)

The schema's `notifications.type` union has 13 literals after Section 1; `internalCreate`'s validator only has 11. Add `new_assignment` (Risk 2 fix) and `channel_token_expired` (Section 1a forward-compat for Stage 2). The schema remains the source of truth.

**BEFORE** — `internalCreate`'s `args.type` union (lines 14–26 of `convex/notifications.ts`):

```ts
    type: v.union(
      v.literal("followup_due"),
      v.literal("sla_breach"),
      v.literal("template_approved"),
      v.literal("template_rejected"),
      v.literal("channel_expiring_soon"),
      v.literal("channel_deleted"),
      v.literal("agent_welcome"),
      v.literal("billing_payment_failed"),
      v.literal("billing_subscription_expired"),
      v.literal("conversation_transferred"),
      v.literal("conversation_reopened"),
    ),
```

**AFTER** — same block with two literals added (placement: `channel_token_expired` immediately after `channel_expiring_soon` to mirror the schema order, `new_assignment` at the end):

```ts
    type: v.union(
      v.literal("followup_due"),
      v.literal("sla_breach"),
      v.literal("template_approved"),
      v.literal("template_rejected"),
      v.literal("channel_expiring_soon"),
      v.literal("channel_token_expired"),
      v.literal("channel_deleted"),
      v.literal("agent_welcome"),
      v.literal("billing_payment_failed"),
      v.literal("billing_subscription_expired"),
      v.literal("conversation_transferred"),
      v.literal("conversation_reopened"),
      v.literal("new_assignment"),
    ),
```

### 5b — Add `notifyDispatch`

> ### ⚠️ CRITICAL — Schema field-shape verification
>
> The original Stage 1 prompt described the `notifications` table fields as `(tenantId, userId, type, referenceId?, contactName?, message, read, createdAt)` — but **`referenceId` is NOT optional** in the actual schema. Reading [convex/schema.ts:390](convex/schema.ts#L390) at the time of writing confirms `referenceId: v.string()` (REQUIRED).
>
> Therefore the `notifyDispatch` args below declare `referenceId: v.string()` (REQUIRED), not `v.optional(v.string())`. The `ctx.db.insert("notifications", { ... referenceId: args.referenceId })` call is well-typed against the actual schema. This deviates from the prompt's draft snippet but matches the schema, which the prompt itself instructs you to prefer ("GLM must match the schema, not this template").
>
> All 14 existing notification call sites already pass a `referenceId` (verified in Stage 0), so requiring it imposes no migration cost.
>
> **If GLM is reading this and the schema has been changed since (e.g. someone made `referenceId` optional), STOP and report.** Do not paper over the discrepancy.

**Imports block** — replace the existing imports at the top of `convex/notifications.ts` with:

```ts
import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCallerIdentity, assertAdmin, type OrgRole } from "./lib/auth";
import {
  TOGGLEABLE_EVENT_TYPES,
  toggleableEventTypeValidator,
  EVENT_DEFAULTS,
  GROWTH_PLUS_ONLY_EVENTS,
  EMAIL_DAILY_CAP_BY_PLAN,
  makeEmailDailyKey,
  todayYmd,
} from "./lib/notificationEvents";
import { readPlan } from "./lib/tenants";
import { tryConsumeQuota } from "./lib/rateLimit";
```

**Append `notifyDispatch` at the end of the file** (after `purgeOld`'s closing `});` at line 175):

```ts

/**
 * Central notification dispatcher. Reads user preferences (with default
 * fallback), checks plan gating, writes the in-app notifications row if
 * inAppEnabled, and schedules the email send if emailEnabled and the
 * tenant's daily email cap hasn't been exhausted.
 *
 * Called from every notification call site that previously did a direct
 * `ctx.db.insert("notifications", ...)`. Fire-and-forget — caller does
 * not need to handle the email send.
 *
 * For transactional events (agent_welcome, billing_*, channel_token_expired,
 * channel_deleted), do NOT call this helper. Those go through the legacy
 * direct-insert paths because they are not user-toggleable.
 */
export const notifyDispatch = internalMutation({
  args: {
    tenantId: v.string(),
    userId: v.string(),
    eventType: toggleableEventTypeValidator,
    referenceId: v.string(),
    contactName: v.optional(v.string()),
    message: v.string(),
    // Optional template variables forwarded opaquely to notifySend (which
    // hands them to the React Email render call). Dispatch never inspects
    // these — keep payload shape consistent with each event's template.
    emailVariables: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // 1. Plan check — Growth+-only events short-circuit on lower plans.
    const plan = await readPlan(ctx, args.tenantId);
    if (
      GROWTH_PLUS_ONLY_EVENTS.has(args.eventType) &&
      (plan === "free" || plan === "starter")
    ) {
      return;
    }

    // 2. Read preferences row (or fall back to event defaults).
    const prefRow = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_tenant_user_event", (q) =>
        q
          .eq("tenantId", args.tenantId)
          .eq("userId", args.userId)
          .eq("eventType", args.eventType),
      )
      .first();
    const defaults = EVENT_DEFAULTS[args.eventType];
    const inAppEnabled = prefRow?.inAppEnabled ?? defaults.inAppEnabled;
    const emailEnabledByPref = prefRow?.emailEnabled ?? defaults.emailEnabled;

    // 3. Email channel plan-gate: Free plan has no email channel.
    const emailGateOpen = plan !== "free";
    const wantsEmail = emailEnabledByPref && emailGateOpen;

    // 4. In-app row — write if enabled.
    if (inAppEnabled) {
      await ctx.db.insert("notifications", {
        tenantId: args.tenantId,
        userId: args.userId,
        type: args.eventType,
        referenceId: args.referenceId,
        contactName: args.contactName,
        message: args.message,
        read: false,
        createdAt: Date.now(),
      });
    }

    // 5. Email — if enabled and under daily cap, schedule the send.
    //    Email resolution happens INSIDE notifySend (which has Node available
    //    via "use node"). notifyDispatch never touches Clerk — it cannot,
    //    because mutations are not Node-context.
    if (wantsEmail) {
      const cap = EMAIL_DAILY_CAP_BY_PLAN[plan];
      if (cap !== null) {
        const key = makeEmailDailyKey(args.tenantId, todayYmd());
        const slotConsumed = await tryConsumeQuota(ctx, key, cap);
        if (slotConsumed) {
          await ctx.scheduler.runAfter(0, internal.actions.notifyEmail.notifySend, {
            userId: args.userId,
            tenantId: args.tenantId,
            eventType: args.eventType,
            variables: args.emailVariables ?? {},
          });
        }
        // If !slotConsumed, silently drop the email — in-app row still went out.
      }
    }
  },
});
```

**Type-check assertion to make explicit:** `eventType` (a `ToggleableEventType`) is a strict subset of `notifications.type` (the schema's 13-literal union after Section 1). Therefore `type: args.eventType` in step 4 type-checks. If GLM sees a TypeScript error on that line, the schema literal union is missing one of the 7 toggleable values — go fix the schema, do **not** cast or stringify the event type.

#### Anti-instructions for Section 5

- **DO NOT** wrap any of the steps in try/catch. Convex mutations roll back on throw; the system needs to see failures.
- **DO NOT** add a `digest`, `quietHours`, `priority`, or `severity` branch.
- **DO NOT** call `notifyDispatch` for transactional events from feature code — they have their own paths and bypass preferences.
- **DO NOT** convert `notifyDispatch` to an action just to call `runQuery` for the plan or preferences. Mutations read the DB directly via `ctx.db`. The `readPlan` helper exists precisely to avoid this temptation.
- **DO NOT** make `referenceId` optional. The schema requires it. All 14 existing call sites already pass it.
- **DO NOT** schedule the email send with a delay other than `0`. The "fire-and-forget" semantics depend on the action enqueueing immediately.
- **DO NOT** filter `wantsEmail` on whether the *call site* would have sent an email previously — the gate is the user's preference + plan + cap, full stop. Stage 2 ports each call site; this dispatcher does not need site-aware logic.
- **DO NOT** read `notificationPreferences` outside the `by_tenant_user_event` index — full-table scans on this table are not safe at scale.
- **DO NOT** add an `email` arg to `notifyDispatch`. Mutations cannot resolve email-from-userId (no Node access). The action-side `notifySend` resolves email via Clerk; that is the only correct location.

---

## Section 6 — Public CRUD for the preferences row

**Placement decision:** put both functions in `convex/notifications.ts` rather than a new `convex/notificationPreferences.ts`. Reason: they are tightly coupled to `notifyDispatch` (which lives there) and the existing CRUD for `notifications` rows (also there) — splitting introduces an avoidable file boundary for ~50 lines of code. If the surface grows past ~200 lines in a later stage, a split is reasonable then.

**Append both functions at the end of `convex/notifications.ts`**, after the `notifyDispatch` block from Section 5. The imports block updated in Section 5 (which already includes `TOGGLEABLE_EVENT_TYPES`, `EVENT_DEFAULTS`, `toggleableEventTypeValidator`, and `getCallerIdentity` from `lib/auth`) covers everything these functions need — no further import changes.

```ts

/**
 * Returns the calling user's notification preferences as a complete matrix
 * (one entry per toggleable event type). Falls back to EVENT_DEFAULTS for
 * any event the user has not explicitly saved a row for.
 */
export const getPreferences = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    if (!tenantId) return [];
    const rows = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", callerId),
      )
      .collect();
    const byEvent = new Map(rows.map((r) => [r.eventType, r]));
    return TOGGLEABLE_EVENT_TYPES.map((et) => {
      const row = byEvent.get(et);
      const def = EVENT_DEFAULTS[et];
      return {
        eventType: et,
        inAppEnabled: row?.inAppEnabled ?? def.inAppEnabled,
        emailEnabled: row?.emailEnabled ?? def.emailEnabled,
      };
    });
  },
});

/**
 * Upsert the calling user's preference for a single event type. The UI
 * calls this once per toggle (no batching). Plan gating is NOT enforced
 * here — gating happens at dispatch time. Users on Free can still save
 * their email preferences for the day they upgrade.
 */
export const updatePreference = mutation({
  args: {
    eventType: toggleableEventTypeValidator,
    inAppEnabled: v.boolean(),
    emailEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    if (!tenantId) throw new Error("Unauthorized");
    const existing = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_tenant_user_event", (q) =>
        q
          .eq("tenantId", tenantId)
          .eq("userId", callerId)
          .eq("eventType", args.eventType),
      )
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        inAppEnabled: args.inAppEnabled,
        emailEnabled: args.emailEnabled,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("notificationPreferences", {
        tenantId,
        userId: callerId,
        eventType: args.eventType,
        inAppEnabled: args.inAppEnabled,
        emailEnabled: args.emailEnabled,
        updatedAt: now,
      });
    }
  },
});
```

**Note on the dead `if (!tenantId)` checks:** `getCallerIdentity` already throws `ConvexError("UNAUTHORIZED")` on no identity and `ConvexError("NO_ORG")` on no `orgId` — `tenantId` is therefore always a non-empty string when the helper returns. The `if (!tenantId) return [];` and `if (!tenantId) throw new Error("Unauthorized");` lines are defensive duplicates of an already-guaranteed invariant. They are harmless and match the prompt's prescribed code; keep them.

#### Anti-instructions for Section 6

- **DO NOT** add a `bulkUpdate` mutation — single-event upsert is sufficient. UI calls it once per toggle.
- **DO NOT** validate the user's plan in `updatePreference` — gating happens at dispatch time, not save time. Users on Free can still save their email preferences for the day they upgrade.
- **DO NOT** delete pref rows in `updatePreference` even if both flags become false — empty rows are fine.
- **DO NOT** assert role in `getPreferences` or `updatePreference`. Every authenticated agent has the right to manage their own preferences. No `assertAdmin` / `assertAdminOrSupervisor`.
- **DO NOT** read or write another user's preferences. The `userId` is always `callerId` — never an argument.
- **DO NOT** add a `resetToDefaults` mutation. Users can manually toggle each row; deletion is unnecessary because absence already means "default."
- **DO NOT** add a `clearAll` admin tool — preferences are per-user-private.

---

## Verification — what GLM must paste back after each section

After applying each numbered section, paste **all of the following** into the response before moving on:

1. **Literal `npx tsc --noEmit` output** (paste exactly what the terminal emits — do not paraphrase, do not say "no errors", paste the actual stdout/stderr even if empty, with the exit code).
2. **The actual diff applied** for that section, via `git diff <file>` for each file touched (or `git diff` if only one file was touched).
3. **Confirmation in plain text** that no anti-instruction in that section was violated. Use the form:
   > "Section N anti-instructions: confirmed none violated."
   If something was violated, **stop and report** instead.

Order reminder: **1 → 2 → 3 → 4 → 7 → 5 → 6.** Run `npx tsc --noEmit` between every pair.

---

## Stage 1 — completion criteria

- All 7 sections applied in the prescribed order.
- `npx tsc --noEmit` clean (empty stdout, exit 0) at every checkpoint AND at the end.
- `npx convex dev --once --typecheck=disable` accepts the schema. No migration warning is expected — both new structures (literal addition + new table) are additive.
- `git status` shows exactly the following modified or added paths and nothing else:
  - `M convex/schema.ts`
  - `M convex/lib/rateLimit.ts`
  - `M convex/lib/tenants.ts`
  - `M convex/notifications.ts`
  - `M convex/actions/notifyEmail.ts`
  - `?? convex/lib/notificationEvents.ts`
  - (The Convex generated files under `convex/_generated/` will also change after `npx convex dev` — this is expected and not a violation.)
- No edits to `PROGRESS.md`, `CLAUDE.md`, `PROJECT_STATE.md`, `AUDIT_REPORT.md`, or any UI / app / lib (non-Convex) source. Those come in the final stage.
- **Zero new call sites of `notifyDispatch` from feature code.** Stage 1 builds the helper; Stage 2 wires the call sites. If `grep -rn 'notifyDispatch' convex/ --include='*.ts'` returns anything outside `convex/notifications.ts`, that's a violation.
- **Zero changes to existing email actions** (`slaBreachEmail`, `followupDueEmail`, `newAssignmentEmail`, `agentWelcomeEmail`, `billingPaymentFailedEmail`, `billingSubscriptionExpiredEmail`, `sendWelcomeOnJoin`). They retire in later stages.

---

*If you disagree with any decision above, explain before complying with the next stage.*
