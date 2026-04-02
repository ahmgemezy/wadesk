# Data Model: Agent Roles & Permissions

**Feature**: `002-agent-roles` | **Date**: 2026-04-02

All tables defined in `convex/schema.ts`. Every table is tenant-scoped.

---

## Convex Tables Added by This Feature

### Table: `inviteLinks`

A time-limited, revocable shareable invite token for a tenant. Only one active link per tenant at a time.

| Field | Type | Notes |
|-------|------|-------|
| `tenantId` | `string` | Clerk `orgId` |
| `token` | `string` | 64-char hex random token — URL-safe |
| `createdBy` | `string` | Clerk `userId` of admin who generated it |
| `expiresAt` | `number` | Unix timestamp; default: `now + 7 days` |
| `revoked` | `boolean` | True if manually revoked or superseded by a new link |
| `defaultRole` | `"org:agent"` | Always Agent for shareable links (FR-007) |
| `createdAt` | `number` | Unix timestamp |

**Indexes**:
- `by_tenant`: `[tenantId]` — list all links for a tenant
- `by_token`: `[token]` — fast lookup when validating join request (unique)

**Constraint**: Before inserting a new `inviteLink`, the mutation MUST set `revoked: true` on all existing non-revoked links for the same `tenantId` (FR-005: one active link at a time).

**Active link definition**: `revoked === false AND expiresAt > Date.now()`

---

## Clerk-Managed Entities (Not Convex Tables)

These entities live in Clerk and are accessed via the Clerk Backend SDK from Convex actions.

### OrgMember (Clerk Organization Membership)

| Attribute | Source | Notes |
|-----------|--------|-------|
| `userId` | Clerk | Unique user identifier |
| `orgId` | Clerk | = `tenantId` throughout WaDesk |
| `role` | Clerk | `"org:admin"` \| `"org:supervisor"` \| `"org:agent"` |
| `status` | Clerk | `"active"` \| `"pending"` (invited, not yet joined) |
| `createdAt` | Clerk | When membership was created |

**Role mapping**:
| WaDesk Role | Clerk Role |
|------------|-----------|
| Admin | `org:admin` |
| Supervisor | `org:supervisor` |
| Agent | `org:agent` |

**Custom roles required in Clerk Dashboard**: Create `supervisor` and `agent` roles in the Clerk Organization settings. Default member role = `org:agent`.

### OrgInvitation (Clerk Organization Invitation)

Used for email invitations (FR-003). Clerk manages token, delivery, and expiry natively.

| Attribute | Source | Notes |
|-----------|--------|-------|
| `emailAddress` | Clerk | Invitee's email |
| `role` | Clerk | Role assigned on acceptance |
| `status` | Clerk | `"pending"` \| `"accepted"` \| `"revoked"` |
| `publicMetadata` | Clerk | Optional `{ source: "email" }` for analytics |

---

## Existing Tables Modified by This Feature

### Table: `channels` (from `001-multi-agent-inbox`)

The `assignmentMode` field already exists in the schema. No schema migration needed — the field was defined in `001`. This feature adds the **settings UI** and **enforcement logic** for this field.

No new fields added to `channels`.

---

## Entity Relationships

```
Clerk Organization (tenantId)
  ├── OrgMember[] (role: admin/supervisor/agent) — Clerk-authoritative
  ├── OrgInvitation[] (pending email invites) — Clerk-authoritative
  └── inviteLinks[] (shareable tokens) — Convex table

channels (tenantId)
  └── assignmentMode: first_reply | manual | round_robin
      └── roundRobinIndex: number (used for Round Robin distribution)
```

---

## Convex Schema Addition (`convex/schema.ts`)

Add to the existing schema from `001-multi-agent-inbox`:

```typescript
inviteLinks: defineTable({
  tenantId: v.string(),
  token: v.string(),
  createdBy: v.string(),
  expiresAt: v.number(),
  revoked: v.boolean(),
  defaultRole: v.literal("org:agent"),
  createdAt: v.number(),
})
  .index("by_tenant", ["tenantId"])
  .index("by_token", ["token"]),
```
