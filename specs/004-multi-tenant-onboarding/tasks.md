# Tasks: Multi-Tenant Onboarding Flow

**Input**: Design documents from `/specs/004-multi-tenant-onboarding/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/convex-api.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create file structure and shared types used by all onboarding components.

- [x] T001 Create `components/onboarding/` directory structure (empty — populated in later phases) per implementation plan
- [x] T002 Read `convex/_generated/ai/guidelines.md` to confirm correct Convex patterns before writing any Convex code

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Convex schema + backend functions that all user story phases depend on. MUST be complete before any user story work.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Add `onboardingState` table to `convex/schema.ts` — fields: `tenantId: v.string()`, `completedSteps: v.array(v.string())`, `createdBy: v.string()`, `createdAt: v.number()`, `completedAt: v.optional(v.number())` with `.index("by_tenant", ["tenantId"])`
- [x] T004 Create `convex/onboarding.ts` — implement `getState` query: calls `getCallerIdentity(ctx)`, queries `onboardingState` by `tenantId`, returns `Doc<"onboardingState"> | null`
- [x] T005 Add `ensureCreated` mutation to `convex/onboarding.ts` — idempotent: if state for `tenantId` exists return its `_id`; else insert with `completedSteps: ["workspace_named"]`, `createdBy: callerId`, `createdAt: Date.now()`; enforce `assertAdmin(role)` via `convex/lib/auth.ts`
- [x] T006 Add `markStep` mutation to `convex/onboarding.ts` — args: `step: v.union(v.literal("workspace_named"), v.literal("whatsapp_connected"), v.literal("team_invited_or_skipped"), v.literal("onboarding_complete"))`; appends step to `completedSteps` if not present; if step is `"onboarding_complete"` also sets `completedAt: Date.now()`; enforce `assertAdmin(role)`

**Checkpoint**: `convex/onboarding.ts` has 3 exported functions. Schema deploys cleanly. Foundation ready.

---

## Phase 3: User Story 1 — Business Owner Signs Up & Reaches Inbox in < 5 min (Priority: P1) 🎯 MVP

**Goal**: Full 5-step guided wizard from account creation to live inbox. Progress indicator. Arabic RTL as default. Each step completion persisted. Test WhatsApp message lands in inbox.

**Independent Test**: Open `/sign-up` as new user → complete all steps without help → send WhatsApp message to connected number → see it in inbox → measure elapsed time < 5 minutes.

### Implementation for User Story 1

- [x] T007 [US1] Create server wrapper `app/onboarding/layout.tsx` — reads `headers()` to detect locale via `detectLocale()` (reuse from `app/(dashboard)/layout.tsx` pattern); passes `locale` as a prop or search param to the page; guards: if no `userId` redirect `/sign-in`; if `orgId` AND onboarding complete (`fetchQuery(api.onboarding.getState)` has `"onboarding_complete"` in steps) redirect `/inbox`
- [x] T008 [US1] Implement `StepProgress` client component in `components/onboarding/step-progress.tsx` — props: `completedSteps: string[]`, `currentStep: string`, `locale: "ar" | "en"`; renders 4-step progress bar (workspace_named, whatsapp_connected, team_invited_or_skipped, onboarding_complete) with Arabic labels (اسم العمل / ربط واتساب / دعوة الفريق / جاهز!) in RTL order when `locale === "ar"`; active step highlighted; completed steps show checkmark
- [x] T009 [US1] Implement `StepWorkspaceName` client component in `components/onboarding/step-workspace-name.tsx` — renders Clerk `<CreateOrganization afterCreateOrganizationUrl="/onboarding" />`; on mount if `orgId` is present (org already created, user returned from Clerk flow) call `api.onboarding.ensureCreated` mutation to initialize onboarding state
- [x] T010 [US1] Implement `StepConnectWhatsApp` client component in `components/onboarding/step-connect-whatsapp.tsx` — props: `onComplete: () => void`; wraps the existing Embedded Signup component (from feature 003); on successful channel connection calls `useMutation(api.onboarding.markStep)` with `"whatsapp_connected"` then calls `onComplete()`; error state shows retry button with Arabic error message "فشل ربط الواتساب — حاول مرة تانية"
- [x] T011 [US1] Implement `StepComplete` client component in `components/onboarding/step-complete.tsx` — shows Arabic success copy: "🎉 مبروك! صندوق الرسائل جاهز. ابعت رسالة واتساب على [رقمك] وشوفها هنا!"; displays the connected WhatsApp number (query `api.channels.listForTenant` to get it); button "افتح صندوق الرسائل" / "Open Inbox" — on click calls `markStep("onboarding_complete")` then `router.replace("/inbox")`
- [x] T012 [US1] Implement `OnboardingWizard` client component in `components/onboarding/onboarding-wizard.tsx` — props: `locale: "ar" | "en"`; reads state via `useQuery(api.onboarding.getState)`; derives `currentStep` from `completedSteps` array (first step not in array); renders `<StepProgress>` at top; conditionally renders active step component below; wraps in `dir={locale === "ar" ? "rtl" : "ltr"}` container with Cairo font class; handles loading state with skeleton
- [x] T013 [US1] Replace stub `app/onboarding/page.tsx` — convert to server component that reads `locale` from parent layout and renders `<OnboardingWizard locale={locale} />`; remove the current `<CreateOrganization afterCreateOrganizationUrl="/inbox" />` stub

**Checkpoint**: Full wizard functional end-to-end. New user can sign up, name workspace, connect WhatsApp, and land in inbox. Arabic RTL layout correct. Step state persists across page refreshes.

---

## Phase 4: User Story 2 — User Resumes Interrupted Onboarding (Priority: P2)

**Goal**: User who abandons mid-flow returns to the exact step they left. Completed steps never re-shown. Completed onboarding never shows wizard again.

**Independent Test**: Complete workspace name step → close browser → log back in → lands on Connect WhatsApp step (not workspace step). Complete all steps → log out → log in → lands directly in inbox (no wizard).

### Implementation for User Story 2

- [x] T014 [US2] Update `app/onboarding/layout.tsx` (from T007) to add the resume redirect logic: after `auth()` resolves with a valid `orgId`, call `fetchQuery(api.onboarding.getState, { tenantId: orgId })` server-side; if state exists AND `"onboarding_complete"` is in `completedSteps` → redirect to `/inbox` immediately; agents (role `org:agent`) → also redirect to `/inbox`
- [x] T015 [US2] Update `app/(dashboard)/layout.tsx` to add onboarding gate: after resolving `orgId`, call `fetchQuery(api.onboarding.getState)` server-side; if state is null OR `"onboarding_complete"` NOT in `completedSteps`, AND role is admin or supervisor → redirect to `/onboarding`; agents are never redirected to onboarding

**Checkpoint**: Resume works correctly. Interrupted sessions land on correct step. Completed onboarding users never see wizard again.

---

## Phase 5: User Story 3 — Admin Invites First Agent During Onboarding (Priority: P3)

**Goal**: Optional "Invite Team" step with skip capability. Invite sent via email using existing inviteLinks Convex functions. Either completing invite OR skipping advances to Step 5.

**Independent Test**: Reach invite step → enter email → click Send Invite → confirmation shown → OR click "Skip for now" → land on Step 5 (Complete). Invited agent receives email and can join workspace.

### Implementation for User Story 3

- [x] T016 [US3] Implement `StepInviteTeam` client component in `components/onboarding/step-invite-team.tsx` — props: `onComplete: () => void`, `onSkip: () => void`; renders email input field (`dir="ltr"`) + "Send Invite" button; on success shows "تم إرسال الدعوة ✓" then calls `markStep("team_invited_or_skipped")` and `onComplete()`; "تخطي الآن" / "Skip for now" button calls `markStep("team_invited_or_skipped")` then `onSkip()`; uses existing `useMutation(api.inviteLinks.create)` from feature 002 for the actual invite creation
- [x] T017 [US3] Wire `StepInviteTeam` into `OnboardingWizard` in `components/onboarding/onboarding-wizard.tsx` — add case for `currentStep === "team_invited_or_skipped"` (i.e., `whatsapp_connected` done but `team_invited_or_skipped` not yet): render `<StepInviteTeam onComplete={advance} onSkip={advance} />`

**Checkpoint**: Invite step renders in wizard flow. Skip works. Invite sends via Convex. Both paths advance to StepComplete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: RTL quality, mobile responsiveness, dark mode, loading/error states.

- [x] T018 [P] Verify all onboarding components use Tailwind logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) — no `ml-`, `mr-`, `left-`, `right-` values in any `components/onboarding/*.tsx` file
- [x] T019 [P] Add responsive layout to `OnboardingWizard` in `components/onboarding/onboarding-wizard.tsx` — wizard card should be centered on desktop (max-w-lg mx-auto), full-width on mobile; `StepProgress` stacks vertically on mobile (`flex-col`) and horizontally on desktop (`flex-row`)
- [x] T020 [P] Verify dark mode — all onboarding components use semantic color tokens (bg-background, text-foreground, border-border) not hardcoded colors; test wizard renders correctly in dark mode
- [x] T021 [P] Add loading skeleton to `OnboardingWizard` in `components/onboarding/onboarding-wizard.tsx` for the `useQuery` loading state — show a 3-line skeleton card while `getState` resolves to prevent layout shift
- [ ] T022 Manually test all 3 user stories end-to-end per acceptance scenarios in `spec.md` — verify elapsed time for US1 < 5 minutes, resume works for US2, skip works for US3; fix any failing scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T001–T002 done)
- **US1 (Phase 3)**: Depends on Phase 2 — BLOCKS US2 and US3 (wizard shell must exist first)
- **US2 (Phase 4)**: Depends on US1 being complete (modifies layout.tsx files created in US1)
- **US3 (Phase 5)**: Depends on US1 being complete (wires into OnboardingWizard)
- **US2 and US3**: CAN run in parallel with each other after US1
- **Polish (Phase 6)**: Depends on all user stories being complete

### Parallel Opportunities Within US1

```bash
# After T006 (Convex backend complete), these can run in parallel:
Task T008: StepProgress component          # no component deps
Task T009: StepWorkspaceName component     # no component deps  
Task T010: StepConnectWhatsApp component   # no component deps
Task T011: StepComplete component          # no component deps

# T012 (OnboardingWizard) depends on T008–T011 all being complete
# T013 (page.tsx) depends on T012
```

### Parallel Opportunities After US1

```bash
# US2 and US3 can start in parallel:
Developer A: T014–T015 (US2 — resume + dashboard gate)
Developer B: T016–T017 (US3 — invite team step)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T006)
3. Complete Phase 3: User Story 1 (T007–T013)
4. **STOP and VALIDATE**: Time the full flow end-to-end — must be < 5 minutes
5. Wizard is functional for the happy path — deploy if timing passes

### Incremental Delivery

1. Setup + Foundational → Convex schema deployed, `onboarding.ts` functions ready
2. US1 complete → Full wizard works; new users guided from signup to inbox
3. US2 complete → Returning users resume correctly; dashboard gate prevents bypassing wizard
4. US3 complete → Invite step available; skip path confirmed
5. Polish → RTL quality pass, dark mode, mobile layout, final QA

---

## Notes

- No tests generated (not requested in spec)
- All components must use `dir="rtl"` container in Arabic locale — never apply RTL only to individual elements
- `OnboardingWizard` is a Client Component (`"use client"`) — uses `useQuery`, `useMutation`, `router`
- `app/onboarding/layout.tsx` and `app/(dashboard)/layout.tsx` are Server Components — use `fetchQuery` from `convex/nextjs` for server-side Convex reads
- `StepConnectWhatsApp` depends on the Embedded Signup component from feature 003 being merged first
- `StepInviteTeam` depends on `api.inviteLinks.create` from feature 002 being available
- Total tasks: 22 (T001–T022)
