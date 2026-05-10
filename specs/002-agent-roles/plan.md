# Implementation Plan: Agent Roles & Permissions

**Branch**: `002-agent-roles` | **Date**: 2026-04-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-agent-roles/spec.md`

---

## Summary

Add three-role team management (Admin / Supervisor / Agent) to WABDesk with enforced permission matrix, three invitation methods (email, WhatsApp, shareable link), and configurable conversation assignment modes per channel (First Reply Wins, Manual, Round Robin). Roles are managed via Clerk Organizations. One new Convex table (`inviteLinks`) stores shareable invite tokens. The `channels.assignmentMode` field from `001-multi-agent-inbox` gets its settings UI and enforcement logic here.

---

## Technical Context

**Language/Version**: TypeScript (strict, no `any`)
**Primary Dependencies**: Convex, Clerk (Organizations + Backend SDK), Next.js 15 (App Router), shadcn/ui, Meta WhatsApp Cloud API
**Storage**: Convex (`inviteLinks` table added); Clerk Organizations (authoritative for membership + roles)
**Testing**: E2E — real Clerk org, real role switching, real Meta WhatsApp invite
**Target Platform**: Web (Vercel + Convex cloud)
**Project Type**: Web application feature (extends `001-multi-agent-inbox`)
**Performance Goals**: Role change takes effect within 1 request cycle (SC-003); agent removal returns conversations to Unassigned within 5 seconds (SC-005)
**Constraints**: One active invite link per tenant at a time; Round Robin requires Growth plan+; last Admin cannot be removed/demoted
**Scale/Scope**: Up to 15 agents (Growth plan), up to unlimited (Business plan)

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked post-design below.*

| Gate | Applies? | Status | Notes |
|------|----------|--------|-------|
| **1. RTL Gate** | ✅ Yes | ✅ PASS | Team settings page and invite modal will use RTL-first layout with Cairo font, `ms-`/`me-` Tailwind classes |
| **2. Tenant Scope Gate** | ✅ Yes | ✅ PASS | `inviteLinks` table has `tenantId`; all Convex functions extract `tenantId` from Clerk JWT `orgId`; Clerk Backend SDK calls scoped to `organizationId = tenantId` |
| **3. Real-Time Gate** | ✅ Yes | ✅ PASS | Team member list uses `useQuery(api.orgMembers.list)` live subscription; invite link status (`getActive`) is live query |
| **4. Security Gate** | ✅ Yes | ✅ PASS | WhatsApp invite sends via Convex action (server-side); Clerk Backend SDK calls are server-side only; token is 64-char cryptographic random; no tokens exposed client-side |
| **5. Schema Gate** | ✅ Yes | ✅ PASS | New `inviteLinks` table includes `tenantId`; no `channelId` needed on this table (invite links are tenant-level) |
| **6. Simplicity Gate** | ❌ No | ✅ N/A | This feature does not add onboarding steps; it adds to team settings (post-onboarding) |

**Post-Design Re-check**: All gates still pass. Clerk is used as authoritative membership store (no Convex mirror table), keeping the design simple.

---

## Project Structure

### Documentation (this feature)

```text
specs/002-agent-roles/
├── plan.md              ← this file
├── spec.md              ← feature specification
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── convex-api.md    ← Phase 1 output
└── tasks.md             ← Phase 2 output (not yet created)
```

### Source Code (additions to repository root)

```text
convex/
├── schema.ts                     # Add inviteLinks table
├── orgMembers.ts                 # NEW: inviteByEmail, inviteByWhatsApp, changeRole, removeMember, list
├── inviteLinks.ts                # NEW: generate, revoke, getActive, validateAndJoin
├── channels.ts                   # ADD: setAssignmentMode mutation
└── conversations.ts              # ADD: unassignAll internal mutation

app/
├── (dashboard)/
│   └── settings/
│       └── team/
│           └── page.tsx          # NEW: Team settings page (Admin only)
└── join/
    └── [token]/
        └── page.tsx              # NEW: Public invite join page

components/
└── settings/
    ├── team-member-list.tsx      # NEW: Live list with role badges
    ├── invite-modal.tsx          # NEW: Tab-based invite dialog (email / WhatsApp / link)
    ├── role-select.tsx           # NEW: Role dropdown
    └── assignment-mode-select.tsx # NEW: Per-channel assignment mode selector
```

---

## Phase 0: Research Summary

See [research.md](research.md) for full decision log. Key decisions:

| Topic | Decision |
|-------|----------|
| Email invitations | Clerk `createOrganizationInvitation()` Backend SDK |
| Roles | Clerk custom roles: `org:admin`, `org:supervisor`, `org:agent` |
| Shareable links | Convex `inviteLinks` table + `/join/[token]` Next.js page |
| WhatsApp invite | Meta template message via tenant's connected channel (Convex action) |
| Last Admin protection | Check admin count via Clerk SDK before demotion/removal |
| Round Robin | Fetch Clerk members in action, sort by userId, use `channel.roundRobinIndex` mod count |
| Plan limits | Check in Convex action before any join — `ConvexError("PLAN_LIMIT_REACHED")` |

---

## Phase 1: Design Summary

### Data Model

One new Convex table: `inviteLinks`

```typescript
inviteLinks: defineTable({
  tenantId: v.string(),
  token: v.string(),           // 64-char hex
  createdBy: v.string(),       // Clerk userId
  expiresAt: v.number(),       // Unix ms, default: +7 days
  revoked: v.boolean(),
  defaultRole: v.literal("org:agent"),
  createdAt: v.number(),
})
  .index("by_tenant", ["tenantId"])
  .index("by_token", ["token"]),
```

No other schema changes — `channels.assignmentMode` and `channels.roundRobinIndex` already exist from `001-multi-agent-inbox`.

See [data-model.md](data-model.md) for full details.

### API Contracts

New Convex functions:

| Function | Type | Auth |
|----------|------|------|
| `orgMembers.list` | query (live) | Admin/Supervisor |
| `orgMembers.inviteByEmail` | action | Admin only |
| `orgMembers.inviteByWhatsApp` | action | Admin only |
| `orgMembers.changeRole` | action | Admin only |
| `orgMembers.removeMember` | action | Admin only |
| `inviteLinks.generate` | mutation | Admin only |
| `inviteLinks.revoke` | mutation | Admin only |
| `inviteLinks.getActive` | query (live) | Admin only |
| `inviteLinks.validateAndJoin` | action | Authenticated user |
| `channels.setAssignmentMode` | mutation | Admin only |
| `conversations.unassignAll` | internal mutation | Internal only |

See [contracts/convex-api.md](contracts/convex-api.md) for full signatures.

### UI Pages

| Route | Auth | Description |
|-------|------|-------------|
| `/settings/team` | Admin/Supervisor | Team member list + invite actions |
| `/join/[token]` | Public | Shareable link landing page |
| `/accept-invite` | Post-auth | Email invite acceptance redirect |
