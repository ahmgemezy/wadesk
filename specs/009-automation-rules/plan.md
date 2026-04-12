# Implementation Plan: Automation Rules

**Branch**: `009-automation-rules` | **Date**: 2026-04-12 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/009-automation-rules/spec.md`

## Summary

Build a tenant-isolated "if this → send that" automation rules engine that fires automated WhatsApp text replies based on four trigger types (Keyword, Outside Business Hours, First Message, No-Reply Timeout). Rules are evaluated in priority order, first match wins, and never fire when a human agent is active on the conversation. Admins manage rules via a drag-and-drop dashboard with live toggle and preview. Rule counts are enforced per subscription plan (Free: 2, Starter: 10, Growth: 30, Business: unlimited).

## Technical Context

**Language/Version**: TypeScript (strict, no `any`) — enforced project-wide  
**Primary Dependencies**: Next.js 15 (App Router), Convex (backend + realtime), Clerk (auth + multi-tenancy), shadcn/ui, Tailwind CSS v4  
**Storage**: Convex (new `automationRules` table + `businessHours` table)  
**Testing**: Manual end-to-end with real WhatsApp message flow (project standard)  
**Target Platform**: Web — Vercel-hosted Next.js 15 + Convex cloud  
**Project Type**: SaaS web application (multi-tenant)  
**Performance Goals**: Automated replies sent within 30 seconds of trigger event; no-reply timeout fires within 60 seconds of expiry  
**Constraints**: Every Convex query/mutation scoped to `tenantId`; no client-side Meta API calls; no new dependencies unless approved  
**Scale/Scope**: Per-tenant rule counts bounded by plan; cron-based timeout checking runs every minute across all tenants

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| **RTL Gate** | ✅ PASS | Automation dashboard UI must be RTL-first. Cairo/Tajawal font, `dir="rtl"`, `ms-`/`me-` Tailwind classes. All UI components tested in Arabic. |
| **Tenant Scope Gate** | ✅ PASS | Every query/mutation in `convex/automations.ts` includes `tenantId` filter derived from Clerk `orgId`. `automationRules` table has `tenantId` index. |
| **Real-Time Gate** | ✅ PASS | Rules list displayed via Convex live query subscription. Toggle and reorder changes are immediately reflected. |
| **Security Gate** | ✅ PASS | Automation engine hooks into existing `http.ts` webhook flow post-message-insert. No new webhook surface. Automated reply sent via existing `internal.actions.sendWhatsAppMessage.sendMessage` action (server-side only). |
| **Schema Gate** | ✅ PASS | `automationRules` table includes `tenantId` from first schema definition. `businessHours` table includes `tenantId`. No `channelId` needed (Phase 1: rules apply to all tenant channels). |
| **Simplicity Gate** | ✅ PASS | No new onboarding steps added. Rules dashboard is a new settings-adjacent page accessible after onboarding is complete. |

**Role Access**: Only `org:admin` can create/edit/delete/reorder rules. `assertAdmin()` used in all write mutations in `convex/automations.ts`.

> Note on spec vs. user input: Spec says "Admin and Supervisor can manage rules." User input says "Admin and Supervisor." CLAUDE.md permissions table says Admins manage inbox settings / templates; Supervisors manage quick replies/templates but NOT WABA settings. Automation rules are functionally similar to templates — rule-of-thumb is Supervisor access is appropriate. **Decision: `assertAdminOrSupervisor()` for rule management.** (No contradiction with constitution — constitution gates pass either way.)

## Project Structure

### Documentation (this feature)

```text
specs/009-automation-rules/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks — not created here)
```

### Source Code (new files for this feature)

```text
convex/
├── schema.ts                          # ADD: automationRules + businessHours tables
├── automations.ts                     # NEW: CRUD mutations/queries for rules
├── http.ts                            # MODIFY: call evaluateAutomations after createInbound
└── crons.ts                           # MODIFY: add 1-minute interval for no-reply timeout

lib/
└── automationHelpers.ts               # NEW: variable interpolation + "agent active?" check

app/dashboard/automations/
└── page.tsx                           # NEW: rules list page (Server Component shell)

components/automations/
├── AutomationRuleForm.tsx             # NEW: create/edit rule form (Client Component)
└── AutomationRuleCard.tsx             # NEW: single rule card with toggle + drag handle
```

## Complexity Tracking

No constitution violations. No complexity justification required.

---
