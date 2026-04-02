# Data Model: WhatsApp Embedded Signup

**Feature**: `003-whatsapp-embedded-signup` | **Date**: 2026-04-02

This feature modifies the `channels` table introduced in `001-multi-agent-inbox` and introduces a new `onboardingStates` table for tracking per-tenant setup progress (used by `004-multi-tenant-onboarding`).

---

## Table: `channels` (Extended from `001-multi-agent-inbox`)

The `channels` table from `001` is extended with token storage and connection status fields.

### New / Modified Fields

| Field | Type | Notes |
|-------|------|-------|
| `accessToken` | `string` | AES-256 encrypted Meta system user token — never returned to client |
| `tokenEncryptedAt` | `number` | Unix timestamp of last token encryption |
| `status` | `"connecting" \| "active" \| "disconnected" \| "reconnect_required"` | Replaces the boolean `isActive` from `001` schema |
| `connectedAt` | `number \| null` | Unix timestamp when channel first became active |
| `disconnectedAt` | `number \| null` | Unix timestamp when channel was disconnected |

### Updated Full Schema for `channels`

| Field | Type | Notes |
|-------|------|-------|
| `tenantId` | `string` | Clerk `orgId` |
| `phoneNumberId` | `string` | Meta phone number ID (stable identifier — not the display number) |
| `displayPhone` | `string` | E.164 display number e.g. `+201012345678` |
| `displayName` | `string` | Admin-set label e.g. "Support Line" |
| `wabaId` | `string` | WhatsApp Business Account ID |
| `accessToken` | `string` | AES-256 encrypted system user token |
| `tokenEncryptedAt` | `number` | Unix ms timestamp |
| `assignmentMode` | `"first_reply" \| "manual" \| "round_robin"` | Default: `"manual"` |
| `roundRobinIndex` | `number` | Last assigned agent index |
| `status` | `"connecting" \| "active" \| "disconnected" \| "reconnect_required"` | Channel health |
| `connectedAt` | `number \| null` | First activation timestamp |
| `disconnectedAt` | `number \| null` | Last disconnect timestamp |
| `createdAt` | `number` | Unix timestamp |

**Indexes**:
- `by_tenant`: `[tenantId]`
- `by_tenant_phone`: `[tenantId, phoneNumberId]` — unique; used for reconnection matching and dedup
- `by_tenant_status`: `[tenantId, status]` — for listing active channels

**State transitions**:
```
(new) → connecting → active ⇄ reconnect_required
                  ↘ disconnected
```
- `connecting`: Token exchanged, webhook subscription in progress
- `active`: Webhook confirmed, messages flowing
- `disconnected`: Admin manually disconnected
- `reconnect_required`: Token revoked (Meta error code 190 detected)

---

## Table: `onboardingStates` (New)

Tracks per-tenant onboarding step completion. Used by `004-multi-tenant-onboarding` but introduced here since channel connection is the critical step that triggers it.

| Field | Type | Notes |
|-------|------|-------|
| `tenantId` | `string` | Clerk `orgId` — one document per tenant |
| `workspaceNamed` | `boolean` | Step 2 complete |
| `whatsappConnected` | `boolean` | Step 3 complete — set to true when first channel reaches `"active"` |
| `teamInvited` | `boolean` | Step 4 complete (optional step) |
| `inboxVisited` | `boolean` | Step 5 complete |
| `completedAt` | `number \| null` | Unix timestamp when all required steps done |
| `createdAt` | `number` | Unix timestamp |

**Indexes**:
- `by_tenant`: `[tenantId]` — unique; one doc per tenant

---

## Convex Schema Additions (`convex/schema.ts`)

Replace the `channels` table definition from `001` with:

```typescript
channels: defineTable({
  tenantId: v.string(),
  phoneNumberId: v.string(),
  displayPhone: v.string(),
  displayName: v.string(),
  wabaId: v.string(),
  accessToken: v.string(),          // AES-256 encrypted
  tokenEncryptedAt: v.number(),
  assignmentMode: v.union(
    v.literal("first_reply"),
    v.literal("manual"),
    v.literal("round_robin")
  ),
  roundRobinIndex: v.number(),
  status: v.union(
    v.literal("connecting"),
    v.literal("active"),
    v.literal("disconnected"),
    v.literal("reconnect_required")
  ),
  connectedAt: v.optional(v.number()),
  disconnectedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_tenant", ["tenantId"])
  .index("by_tenant_phone", ["tenantId", "phoneNumberId"])
  .index("by_tenant_status", ["tenantId", "status"]),

onboardingStates: defineTable({
  tenantId: v.string(),
  workspaceNamed: v.boolean(),
  whatsappConnected: v.boolean(),
  teamInvited: v.boolean(),
  inboxVisited: v.boolean(),
  completedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_tenant", ["tenantId"]),
```

---

## Entity Relationships

```
Clerk Organization (tenantId)
  └── channels[] (one per connected WhatsApp number)
        └── status: connecting | active | disconnected | reconnect_required

onboardingStates (one per tenant)
  └── whatsappConnected: boolean (set true when first channel → "active")
```
