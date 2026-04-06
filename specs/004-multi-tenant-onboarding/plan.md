# Implementation Plan: Multi-Tenant Onboarding Flow

**Branch**: `004-multi-tenant-onboarding` | **Date**: 2026-04-06 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/004-multi-tenant-onboarding/spec.md`

## Summary

Replace the current stub `/onboarding` page (which just renders Clerk's `CreateOrganization` and redirects to `/inbox`) with a full 5-step guided wizard. Steps: (1) Create account — done by Clerk auth, (2) Name workspace — Clerk CreateOrganization, (3) Connect WhatsApp — embed the existing Embedded Signup component (feature 003), (4) Invite team — optional, reuse inviteLinks from feature 002, (5) Go to inbox. Onboarding progress is persisted in a new `onboardingState` Convex table. The dashboard layout gate-checks completion and redirects incomplete users back to `/onboarding`. Arabic RTL is the default for Arabic browser users.

## Technical Context

**Language/Version**: TypeScript (strict, no `any`) — Next.js 15 App Router  
**Primary Dependencies**: Convex (state persistence), Clerk (auth + org creation), shadcn/ui, Tailwind CSS v4, Lucide React  
**Storage**: Convex — new `onboardingState` table  
**Testing**: End-to-end WhatsApp flow test (per Definition of Done); elapsed-time benchmark  
**Target Platform**: Web (Vercel), responsive (mobile + desktop)  
**Project Type**: Web application feature (onboarding wizard)  
**Performance Goals**: SC-002 — median time from "Get Started" to first WhatsApp message < 5 minutes  
**Constraints**: No credit card required; onboarding never re-appears after completion; step 4 (invite) is optional; step 3 depends on feature 003 (Embedded Signup)  
**Scale/Scope**: Per-tenant onboarding state; first-admin-only flow (subsequent admins via invite go directly to inbox)

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| **RTL Gate** | ✅ PASS | All wizard UI components must be RTL-first. Progress steps, button labels, input fields in Arabic. Locale detected from browser `accept-language` header (reuse existing `detectLocale` from dashboard layout). |
| **Tenant Scope Gate** | ✅ PASS | `onboardingState` table scoped by `tenantId` from Clerk `orgId`. All Convex queries/mutations include `tenantId`. |
| **Real-Time Gate** | ✅ PASS | Onboarding state read via `useQuery` (Convex subscription). Step transitions update state via `useMutation`. |
| **Security Gate** | ✅ PASS | Step 3 embeds the Embedded Signup component (feature 003) — all Meta API calls remain server-side via Convex actions as implemented there. |
| **Schema Gate** | ✅ PASS | New `onboardingState` table includes `tenantId` from the first schema definition. |
| **Simplicity Gate** | ✅ PASS | 5 steps total, step 4 is skippable. No extra steps. Consistent with sub-5-minute KPI. |

## Project Structure

### Documentation (this feature)

```text
specs/004-multi-tenant-onboarding/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/
│   └── convex-api.md    ← Convex function contracts
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code (affected paths)

```text
convex/
├── schema.ts                         ← add onboardingState table
└── onboarding.ts                     ← new: getState, markStep, ensureCreated

app/
├── onboarding/
│   └── page.tsx                      ← replace stub with multi-step wizard
├── (dashboard)/
│   └── layout.tsx                    ← add onboarding gate check (fetchQuery)
└── page.tsx                          ← verify "Get Started" links to /sign-up

components/onboarding/
├── onboarding-wizard.tsx             ← orchestrator component (reads step, renders active step)
├── step-progress.tsx                 ← progress indicator (RTL-aware)
├── step-workspace-name.tsx           ← step 2: Clerk CreateOrganization wrapper
├── step-connect-whatsapp.tsx         ← step 3: wraps existing EmbeddedSignup component
├── step-invite-team.tsx              ← step 4: optional agent invite (reuse invite flow)
└── step-complete.tsx                 ← step 5: success state → go to inbox
```

## Key Design Decisions

### Gate check in dashboard layout
The existing `app/(dashboard)/layout.tsx` already redirects `!orgId → /onboarding`. Add a second check: if org exists but onboarding is not complete (no channel connected), also redirect to `/onboarding`. Use `fetchQuery` from `convex/nextjs` to read `onboardingState` server-side.

### Step determination logic
The `/onboarding` page reads `onboardingState` via `useQuery`. If no state exists yet (first visit with valid orgId), the `onboarding.ensureCreated` mutation creates it. Current step is derived from the `completedSteps` array — first step not in the array = current step.

### Organization creation (step 2)
Keep Clerk's `CreateOrganization` component but set `afterCreateOrganizationUrl="/onboarding"` (not `/inbox`). After org creation, the user returns to `/onboarding` with an orgId, triggering step 3.

### Step 3 dependency on feature 003
The `step-connect-whatsapp.tsx` component wraps the existing Embedded Signup component. On successful channel connection, it calls `onboarding.markStep("whatsapp_connected")` and advances to step 4.

### Skippable step 4
The "Invite team" step shows "Skip for now" button. Either completing an invite OR clicking skip advances to step 5.

## Complexity Tracking

No constitution violations requiring justification.
