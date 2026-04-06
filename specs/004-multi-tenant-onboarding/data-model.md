# Data Model: Multi-Tenant Onboarding

## Entities

### onboardingState (new table)

| Field | Type | Notes |
|-------|------|-------|
| `tenantId` | `v.string()` | Tenant scope — ALWAYS included |
| `completedSteps` | `v.array(v.string())` | Ordered list of completed step keys |
| `createdBy` | `v.string()` | Clerk subject of the admin who started onboarding |
| `createdAt` | `v.number()` | Unix timestamp |
| `completedAt` | `v.optional(v.number())` | Set when onboarding_complete step is reached |

Step keys (enum-like string literals):
- `"workspace_named"` — org exists in Clerk with a name (set when CreateOrganization succeeds and user returns to /onboarding)
- `"whatsapp_connected"` — at least one active channel exists for the tenant
- `"team_invited_or_skipped"` — either an invite was sent or the user clicked "Skip"
- `"onboarding_complete"` — final marker; once present, redirect to /inbox forever

Indexes:
```ts
.index("by_tenant", ["tenantId"])
```

---

## Schema Diff (convex/schema.ts)

### Add new table:

```ts
onboardingState: defineTable({
  tenantId: v.string(),
  completedSteps: v.array(v.string()),
  createdBy: v.string(),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
})
  .index("by_tenant", ["tenantId"]),
```

No changes to existing tables.

---

## State Transitions

```
[user creates Clerk org]
  → ensureCreated mutation creates onboardingState{completedSteps: ["workspace_named"]}

[user completes Embedded Signup — channel created]
  → markStep("whatsapp_connected")

[user sends invite OR clicks Skip]
  → markStep("team_invited_or_skipped")

[user clicks "Go to Inbox"]
  → markStep("onboarding_complete"), set completedAt
  → redirect to /inbox
  → dashboard layout: onboarding_complete ∈ completedSteps → no redirect
```

---

## Dashboard Layout Gate Logic

```
Server component check (fetchQuery):
  if orgId:
    state = fetchQuery(onboarding.getState, { tenantId: orgId })
    if state is null OR "onboarding_complete" not in state.completedSteps:
      if user role is org:agent → redirect /inbox (agents skip wizard)
      else → redirect /onboarding
```
