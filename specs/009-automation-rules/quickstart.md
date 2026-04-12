# Quickstart: Automation Rules (009)

## Prerequisites

- Branch: `009-automation-rules` (already checked out)
- Running: `npx convex dev` + `npm run dev`
- Signed in as an Admin in a tenant org

---

## Implementation Order

Follow this order to avoid broken states at each step:

### Step 1 — Schema (convex/schema.ts)

Add three new tables to `defineSchema`:
- `automationRules` (see data-model.md)
- `businessHours`
- `ruleFireLog`

Run `npx convex dev` — schema auto-deploys. No data migration needed (new tables).

Also add to `convex/lib/planLimits.ts`:
```ts
export const AUTOMATION_RULE_LIMITS: Record<Plan, number> = {
  free: 2,
  starter: 10,
  growth: 30,
  business: Infinity,
};
export function assertAutomationRuleLimitNotReached(count: number, plan: Plan): void {
  const limit = AUTOMATION_RULE_LIMITS[plan] ?? 2;
  if (count >= limit) throw new ConvexError({ message: "PLAN_LIMIT_REACHED", data: { plan, limit } });
}
```

---

### Step 2 — Backend (convex/automations.ts)

Create `convex/automations.ts` with:

**Public API** (authenticated, Admin+Supervisor):
- `listRules` — query, ordered by priority
- `getBusinessHours` — query
- `createRule` — mutation with plan limit check
- `updateRule` — mutation
- `deleteRule` — mutation (re-sequences priority)
- `toggleRule` — mutation
- `reorderRules` — mutation (rewrites priority 0…N-1)
- `saveBusinessHours` — mutation (Admin only)

**Internal** (for webhook + cron):
- `evaluateAndFireAutomations` — internalMutation
- `checkNoReplyTimeouts` — internalMutation

Key patterns to follow (matches existing codebase):
```ts
import { getCallerIdentity, assertAdminOrSupervisor } from "./lib/auth";
import { internal } from "./_generated/api";
// Use ctx.db.query("automationRules").withIndex("by_tenant", q => q.eq("tenantId", tenantId))
```

---

### Step 3 — Helper Library (lib/automationHelpers.ts)

Pure functions — no Convex imports:

```ts
// interpolateTemplate(template, vars) → string
// isOutsideBusinessHours(schedule, timezone) → boolean
// resolveAgentName(assignedAgentId) → "فريق الدعم" | string
```

`isOutsideBusinessHours` uses `Intl.DateTimeFormat` with the tenant timezone to get current local day + time, then checks against the schedule.

---

### Step 4 — Hook into Webhook (convex/http.ts)

After the `log("message_inserted", ...)` line (around line 218), add:

```ts
// Evaluate automation rules (after assignment to avoid race)
await ctx.runMutation(internal.automations.evaluateAndFireAutomations, {
  tenantId: channel.tenantId,
  channelId: channel._id,
  conversationId: result.conversationId,
  messageContent: content,
  isNewConversation: result.isNewConversation,
});
```

Place this AFTER the round-robin block so assignment happens first.

---

### Step 5 — Cron (convex/crons.ts)

Add:
```ts
crons.interval(
  "check-automation-timeouts",
  { minutes: 1 },
  internal.automations.checkNoReplyTimeouts,
);
```

---

### Step 6 — UI Components

Build in this order:
1. `AutomationRuleCard.tsx` (stateless display first, add toggle mutation second)
2. `AutomationRuleForm.tsx` (form shell → trigger type selector → response field → preview → submit)
3. `app/dashboard/automations/page.tsx` (Server Component shell + client rule list)

RTL checklist for each component:
- `dir="rtl"` on root container
- `ms-` / `me-` for horizontal spacing (not `ml-`/`mr-`)
- Drag handle on inline-start side
- Arabic label text for all UI strings

---

## Smoke Test Sequence

1. Log in as Admin in a tenant org
2. Navigate to `/dashboard/automations`
3. Create a keyword rule: trigger = "مرحبا", response = "أهلاً {{customer_name}}!"
4. Send "مرحبا" from a WhatsApp test number to the connected channel
5. Verify automated reply received within 30 seconds
6. Toggle rule off → send "مرحبا" again → verify NO automated reply
7. Create a second rule (first_message), verify it fires for a brand-new test contact
8. Verify plan limit: on Free plan, attempt to create a 3rd rule → upgrade prompt shown

---

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Rule fires even when agent replied | Ensure `authorId: "automation"` is set on all auto-sent messages; check query filters `authorId != "automation"` |
| Outside hours check wrong timezone | Log `tenantTimezone` and compare against `Intl.DateTimeFormat` output |
| Priority gaps after delete | `deleteRule` must re-sequence all remaining rules in one mutation |
| Double-fire on no-reply timeout | `ruleFireLog` `by_rule_conversation` index lookup must happen before firing |
| RTL drag handle wrong side | Use `start` logical side; test in both Arabic and English browser locale |
