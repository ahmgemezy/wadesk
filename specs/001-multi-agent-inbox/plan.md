# Implementation Plan: Multi-Agent Shared Inbox

**Branch**: `001-multi-agent-inbox` | **Date**: 2026-04-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-multi-agent-inbox/spec.md`

## Summary

Build a real-time WhatsApp shared inbox where multiple agents (per tenant) can view, reply to, and manage customer conversations from a single dashboard. Agents see only their assigned conversations; admins and supervisors see everything. The inbox renders RTL (Arabic-first) by default with Convex live-query subscriptions delivering messages within 3 seconds.

## Technical Context

**Language/Version**: TypeScript (strict mode, no `any`)
**Primary Dependencies**: Next.js 15 (App Router), Convex, Clerk, shadcn/ui, Tailwind CSS, Meta WhatsApp Business Cloud API
**Storage**: Convex (real-time document database)
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Web (Vercel-hosted, serverless)
**Project Type**: SaaS web application (multi-tenant)
**Performance Goals**: Incoming messages visible within 3s (SC-002); agent reply in <60s cold start (SC-001); 20 simultaneous conversations without UI degradation (SC-004)
**Constraints**: All Convex queries include `tenantId`; no client-side Meta API calls; Convex subscriptions only (no polling); RTL layout mandatory
**Scale/Scope**: SMB teams of 2–20 agents per tenant; multi-tenant shared infrastructure

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Gate | Applies? | Status | Notes |
|------|----------|--------|-------|
| RTL Gate | ✅ Yes | ✅ PASS | All inbox components built RTL-first; Cairo/Tajawal font; `dir="rtl"` at root layout |
| Tenant Scope Gate | ✅ Yes | ✅ PASS | Every Convex query includes `tenantId` derived from Clerk `orgId` |
| Real-Time Gate | ✅ Yes | ✅ PASS | Conversation list and thread use `useQuery` live subscriptions |
| Security Gate | ✅ Yes | ✅ PASS | Meta API calls in Convex actions only; webhooks HMAC-SHA256 verified |
| Schema Gate | ✅ Yes | ✅ PASS | All new tables include `tenantId`; conversations also carry `channelId` |
| Simplicity Gate | ❌ No | ✅ N/A | No new onboarding steps introduced |

## Project Structure

### Documentation (this feature)

```text
specs/001-multi-agent-inbox/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── convex-api.md   ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
convex/
├── schema.ts            ← ALL table definitions (tenantId + channelId scoped)
├── conversations.ts     ← queries + mutations for conversations
├── messages.ts          ← queries + mutations for messages + internal notes
├── contacts.ts          ← auto-create contact on first inbound message
├── quickReplies.ts      ← CRUD for tenant quick replies
├── channels.ts          ← channel queries + assignment mode logic
└── http.ts              ← Meta webhook HTTP action (signature-verified)

app/
├── layout.tsx           ← Root layout: ConvexProvider + ClerkProvider, dir="rtl"
├── (auth)/
│   ├── sign-in/page.tsx
│   └── sign-up/page.tsx
└── (dashboard)/
    ├── layout.tsx       ← Protected route guard (redirects if unauthenticated)
    ├── inbox/
    │   ├── page.tsx           ← Conversation list (left panel)
    │   └── [id]/page.tsx      ← Conversation thread (right panel)
    └── settings/
        └── quick-replies/
            └── page.tsx       ← Quick reply management (admin only)

components/
├── inbox/
│   ├── conversation-list.tsx       ← Real-time list, role-filtered
│   ├── conversation-list-item.tsx  ← Status badge, assignee chip, last message preview
│   ├── conversation-thread.tsx     ← Message stream + internal notes inline
│   ├── message-bubble.tsx          ← Inbound / outbound / note visual variants
│   ├── message-input.tsx           ← Reply box + quick reply trigger button
│   ├── quick-reply-panel.tsx       ← Slide-in panel with search
│   ├── assign-agent-dialog.tsx     ← Reassignment modal (admin/supervisor only)
│   └── status-selector.tsx         ← Open / Pending / Resolved dropdown
└── ui/                             ← shadcn/ui base components
```

**Structure Decision**: Next.js App Router with route groups `(auth)` and `(dashboard)`. Convex is the sole data layer — no REST API routes except the Meta webhook HTTP action in `convex/http.ts`. All client data access via `useQuery` and `useMutation` hooks.

## Complexity Tracking

No constitution violations — no justification required.

---

## Phase 0: Research

See [research.md](research.md) for full findings.

**Key decisions:**

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Convex `useQuery` live subscriptions | Zero-config real-time; meets SC-002 (3s) | Polling — forbidden by constitution |
| Clerk `auth().orgId` as `tenantId` | Built-in multi-tenant org model; no custom auth tables needed | Custom user-tenant table — adds complexity |
| Convex `httpAction` for Meta webhook | Server-side only; supports HMAC verification; no API route needed | Next.js API route — exposes less control, harder to secure |
| shadcn/ui `ResizablePanelGroup` | Two-panel inbox layout, works RTL | Custom grid — reinventing existing solution |
| `dir="rtl"` at root layout | Arabic-first per constitution; all panels inherit RTL | Per-component dir — risky, easy to miss |
| `message.isInternalNote: boolean` | Simple flag on message doc; no separate table | Separate `notes` table — unnecessary complexity for MVP |

---

## Phase 1: Design & Contracts

See [data-model.md](data-model.md) for full entity definitions.
See [contracts/convex-api.md](contracts/convex-api.md) for Convex function contracts.

**Core tables:** `channels`, `conversations`, `messages`, `contacts`, `quickReplies`

**Critical design rules:**
- `conversations` always carries both `tenantId` and `channelId` — never one without the other
- `messages.isInternalNote: boolean` distinguishes notes from customer-visible messages
- `contacts` unique per `(tenantId, phone)` — auto-created on first inbound message
- `channels.assignmentMode` is `"first_reply" | "manual" | "round_robin"` — drives routing logic
- Agent visibility enforced in Convex query layer: agents query filtered by `assignedAgentId === callerId`; admins/supervisors get unfiltered results
