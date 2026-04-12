# Data Model: Automation Rules (009)

## New Convex Tables

### `automationRules`

One document per rule per tenant. Ordered by `priority` (ascending = highest priority).

```ts
automationRules: defineTable({
  tenantId: v.string(),                  // Clerk orgId — always filter by this
  name: v.string(),                      // Admin-given name, e.g. "رد خارج ساعات العمل"
  enabled: v.boolean(),                  // Toggle on/off instantly
  priority: v.number(),                  // Integer 0…N; lower = higher priority

  triggerType: v.union(
    v.literal("keyword"),
    v.literal("outside_hours"),
    v.literal("first_message"),
    v.literal("no_reply_timeout"),
  ),

  // Trigger config — only relevant field is populated per triggerType
  keywordList: v.optional(v.array(v.string())),  // For "keyword" trigger
  timeoutMinutes: v.optional(v.number()),         // For "no_reply_timeout" trigger
  // "outside_hours" reads businessHours table; no extra config here
  // "first_message" has no extra config

  responseTemplate: v.string(),          // Text with {{variables}}

  createdBy: v.string(),                 // Clerk userId of creator
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_tenant", ["tenantId"])
  .index("by_tenant_enabled", ["tenantId", "enabled"])
  .index("by_tenant_priority", ["tenantId", "priority"])
```

### `businessHours`

One document per tenant. Created/updated from Settings.

```ts
businessHours: defineTable({
  tenantId: v.string(),
  timezone: v.string(),                  // IANA, e.g. "Africa/Cairo", "Asia/Riyadh"
  // schedule stored as v.any() — typed as BusinessHoursSchedule in TS
  // shape: { sun: { open: "09:00", close: "17:00", enabled: true }, mon: {...}, ... }
  schedule: v.any(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_tenant", ["tenantId"])
```

### `ruleFireLog`

Tracks when a rule fired for a conversation. Used to prevent double-fires for no-reply timeout.

```ts
ruleFireLog: defineTable({
  tenantId: v.string(),
  ruleId: v.id("automationRules"),
  conversationId: v.id("conversations"),
  firedAt: v.number(),
  triggerType: v.string(),               // Denormalized for analytics
})
  .index("by_tenant", ["tenantId"])
  .index("by_rule_conversation", ["ruleId", "conversationId"])
  .index("by_conversation", ["conversationId"])
```

---

## TypeScript Types (lib/automationHelpers.ts)

```ts
export type TriggerType =
  | "keyword"
  | "outside_hours"
  | "first_message"
  | "no_reply_timeout";

export type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export type DaySchedule = {
  open: string;    // "HH:MM" 24h
  close: string;   // "HH:MM" 24h
  enabled: boolean;
};

export type BusinessHoursSchedule = Record<DayKey, DaySchedule>;

export type InterpolationVars = {
  customer_name: string;   // with fallback already applied
  business_name: string;
  agent_name: string;      // with fallback already applied
  current_time: string;
};
```

---

## Schema Changes Summary

| Table | Change | Reason |
|-------|--------|--------|
| `automationRules` | **NEW** | Core rules storage |
| `businessHours` | **NEW** | Outside Hours trigger dependency; reusable for CSAT/SLA |
| `ruleFireLog` | **NEW** | No-reply timeout idempotency; future analytics |
| `planLimits.ts` | **MODIFY** | Add `AUTOMATION_RULE_LIMITS` constant |
| `crons.ts` | **MODIFY** | Add 1-minute `check-automation-timeouts` cron |
| `http.ts` | **MODIFY** | Hook `evaluateAndFireAutomations` after `createInbound` |

---

## Validation Rules

| Rule | Constraint |
|------|-----------|
| `name` | Required, 1–100 characters |
| `responseTemplate` | Required, 1–1000 characters, cannot be empty or whitespace-only |
| `keywordList` | Required when `triggerType = "keyword"`, at least 1 keyword, each keyword 1–50 chars |
| `timeoutMinutes` | Required when `triggerType = "no_reply_timeout"`, integer 1–1440 |
| `priority` | Non-negative integer; system-managed on create (appended to end of list) |
| Plan limit | Checked atomically in `createRule` mutation; throws `ConvexError("PLAN_LIMIT_REACHED")` |
| Outside hours | `businessHours` record must exist for tenant; blocked at form level with clear prompt |

---

## State: Rule Evaluation Flow

```
Incoming message received (http.ts)
  │
  ▼
messages.createInbound → { conversationId, isNewConversation, isDuplicate }
  │
  ├── isDuplicate → skip
  │
  ▼
automations.evaluateAndFireAutomations (internalMutation)
  │
  ├── 1. Is agent already active on conversation? (outbound non-note message exists)
  │      YES → stop, no rule fires
  │      NO  → continue
  │
  ├── 2. Fetch enabled rules ordered by priority asc
  │
  ├── 3. For each rule:
  │      ├── triggerType = "keyword"         → message content contains keyword?
  │      ├── triggerType = "outside_hours"   → current time outside businessHours?
  │      ├── triggerType = "first_message"   → isNewConversation && contact.totalConversations === 1?
  │      └── triggerType = "no_reply_timeout"→ (handled by cron, skip here)
  │
  └── First match → insert outbound message + schedule sendWhatsAppMessage + write ruleFireLog → stop

Cron (every 1 min) → automations.checkNoReplyTimeouts
  │
  ├── Fetch all enabled no_reply_timeout rules across all tenants
  ├── For each rule: find qualifying open conversations
  ├── Skip if ruleFireLog entry exists for same rule+conversation in current window
  └── Fire: insert outbound message + schedule sendMessage + write ruleFireLog
```
