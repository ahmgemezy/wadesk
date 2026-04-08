# Tasks: WhatsApp Embedded Signup

**Input**: Design documents from `/specs/003-whatsapp-embedded-signup/`
**Branch**: `003-whatsapp-embedded-signup` | **Date**: 2026-04-02
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Organization**: Tasks grouped by user story — each story is independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 / US2 / US3

---

## Phase 1: Setup

**Purpose**: Environment and env var configuration. Project scaffold already exists from `001-multi-agent-inbox`.

- [X] T001 Add `NEXT_PUBLIC_META_APP_ID`, `NEXT_PUBLIC_META_CONFIG_ID`, `ENCRYPTION_SECRET` to `.env.local` per `quickstart.md` section 2
- [X] T002 Set `ENCRYPTION_SECRET` in Convex environment: `npx convex env set ENCRYPTION_SECRET <value>` and verify in Convex dashboard

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Create `convex/lib/encryption.ts` — export `encrypt(plaintext: string): string` and `decrypt(ciphertext: string): string` using Node.js `crypto` AES-256-GCM with `ENCRYPTION_SECRET` env var; strict TypeScript, no `any`
- [X] T004 Update `convex/schema.ts` — replace `channels` table definition with full extended schema from `data-model.md` (add `accessToken`, `tokenEncryptedAt`, `status` enum, `displayPhone`, `connectedAt`, `disconnectedAt`; add indexes `by_tenant_phone`, `by_tenant_status`); add `onboardingStates` table with `by_tenant` index
- [X] T005 [P] Create `convex/lib/auth.ts` (or update existing) — export `requireAdmin(ctx)` helper that reads Clerk JWT, extracts `tenantId` from `orgId`, throws `ConvexError("FORBIDDEN")` if caller is not `org:admin`; export `getTenantId(ctx)` for authenticated member queries
- [X] T006 [P] Create `convex/lib/planLimits.ts` — export `getChannelLimit(plan: string): number` returning `{ free: 1, starter: 1, growth: 3, business: Infinity }` per CLAUDE.md §7; export `assertChannelLimit(ctx, tenantId)` that counts active channels and throws `ConvexError("PLAN_LIMIT_REACHED")` if at limit

**Checkpoint**: Run `npx convex dev` — schema deploys cleanly, new indexes appear in Convex dashboard.

---

## Phase 3: User Story 1 — First-Time Channel Connection (Priority: P1) 🎯 MVP

**Goal**: Admin clicks "Connect WhatsApp", completes Meta popup, channel appears active in inbox within 10 seconds.

**Independent Test**: Complete Facebook OAuth + WABA selection, verify channel appears in Settings → Channels with status "Active". Send a WhatsApp message to the connected number, confirm it appears in the Unassigned queue within 3 seconds.

### Implementation

- [X] T007 [US1] Add `setStatus` internal mutation to `convex/channels.ts` — input: `{ channelId: Id<"channels">; status: "connecting" | "active" | "disconnected" | "reconnect_required" }`, patches `status` field; `internalMutation` only (not callable from client)
- [X] T008 [US1] Update `listForTenant` query in `convex/channels.ts` — live query filtered by `tenantId` from auth context; return array with `_id`, `phoneNumberId`, `displayPhone`, `displayName`, `wabaId`, `assignmentMode`, `status`, `connectedAt`; NEVER include `accessToken` in output
- [X] T009 [US1] Create `convex/onboardingStates.ts` — export `getForTenant` live query (returns `{ workspaceNamed, whatsappConnected, teamInvited, inboxVisited, completedAt } | null`); export `markStep` mutation accepting `{ step: "workspace_named" | "team_invited" | "inbox_visited" }` (Admin only); upsert pattern — create doc if not exists for tenant
- [X] T010 [US1] Implement `completeEmbeddedSignup` action in `convex/channels.ts` per `contracts/convex-api.md`:
  1. Call `requireAdmin(ctx)` → get `tenantId`
  2. Call `assertChannelLimit(ctx, tenantId)` → throw `ConvexError("PLAN_LIMIT_REACHED")` if at limit
  3. `GET https://graph.facebook.com/v21.0/oauth/access_token?client_id=...&client_secret=...&code=...` → extract `access_token`; throw `ConvexError("TOKEN_EXCHANGE_FAILED")` on failure
  4. Call `encrypt(access_token)` from `convex/lib/encryption.ts`
  5. Check `by_tenant_phone` index for duplicate across tenants → throw `ConvexError("DUPLICATE_NUMBER")` if found on a different tenant
  6. `POST https://graph.facebook.com/v21.0/{wabaId}/subscribed_apps` with Bearer token; on failure schedule retry (see T022), do not throw
  7. Upsert by `(tenantId, phoneNumberId)`: if exists → update `accessToken`, `tokenEncryptedAt`, `status: "active"`, `connectedAt`; if new → insert with `status: "connecting"`, then patch to `"active"` after webhook success
  8. Set `onboardingStates.whatsappConnected = true` via `ctx.runMutation`
  9. Return `{ channelId, displayPhone }`
- [X] T011 [P] [US1] Create `components/onboarding/channel-status-badge.tsx` — client component; accepts `status: "connecting" | "active" | "disconnected" | "reconnect_required"`; renders colored badge: active=green "نشط", connecting=yellow "جارٍ الاتصال", disconnected=gray "غير متصل", reconnect_required=red "يتطلب إعادة الاتصال"; RTL layout, Cairo font
- [X] T012 [US1] Create `components/onboarding/embedded-signup-button.tsx` — `"use client"` component; loads Facebook JS SDK via `next/script`; calls `FB.init({ appId: NEXT_PUBLIC_META_APP_ID, version: "v21.0" })`; attaches `window.postMessage` listener for `WA_EMBEDDED_SIGNUP` / `FINISH` event to capture `waba_id` and `phone_number_id`; on button click calls `FB.login` with `config_id: NEXT_PUBLIC_META_CONFIG_ID, response_type: "code", override_default_response_type: true`; on both callbacks resolved calls `useMutation(api.channels.completeEmbeddedSignup)`; shows "جارٍ الاتصال..." loading state; on success fires `onSuccess` callback; on error shows inline Arabic error message per error code
- [X] T013 [US1] Create `app/(dashboard)/settings/channels/page.tsx` — Admin-only server component (redirect non-admins); renders channel list via `useQuery(api.channels.listForTenant)`; each row shows `displayName`, `displayPhone`, `<ChannelStatusBadge status={...} />`, and "Add Channel" button; "Add Channel" opens `<EmbeddedSignupButton>`; RTL layout, `dir="rtl"`, Cairo font

**Checkpoint**: End-to-end test — Admin completes Meta popup, channel appears in settings with status "Active" within 10 seconds. Inbound WhatsApp message appears in Unassigned queue.

---

## Phase 4: User Story 2 — Additional Channel & Plan Limits (Priority: P2)

**Goal**: Admin on Growth plan adds a second number; Free/Starter admin sees upgrade prompt instead of the Meta popup.

**Independent Test**: With one channel active on Free plan, clicking "Add Channel" shows upgrade prompt (no popup). On Growth plan, connect a second number — both channels appear independently in inbox tabs.

### Implementation

- [X] T014 [P] [US2] Update `app/(dashboard)/settings/channels/page.tsx` — read tenant plan from Clerk org metadata; compare active channel count from `listForTenant` against `getChannelLimit(plan)`; if at limit, replace "Add Channel" button with an upgrade CTA ("ترقية الباقة لإضافة رقم جديد") that links to `/settings/billing`; plan limit check is client-side UX only (server-side enforcement already in T010)
- [X] T015 [US2] Handle `ConvexError("PLAN_LIMIT_REACHED")` in `components/onboarding/embedded-signup-button.tsx` — show inline Arabic message: "وصلت للحد الأقصى من الأرقام في باقتك الحالية"
- [X] T016 [US2] Handle `ConvexError("DUPLICATE_NUMBER")` in `components/onboarding/embedded-signup-button.tsx` — show inline Arabic message: "هذا الرقم مسجّل بالفعل في حساب آخر"

**Checkpoint**: Free plan: "Add Channel" replaced by upgrade CTA after 1 channel. Growth plan: second channel connects without affecting first. Both channels listed independently.

---

## Phase 5: User Story 3 — Disconnect & Reconnect (Priority: P3)

**Goal**: Admin can disconnect a channel (preserving history) and reconnect it later by completing the Embedded Signup flow again.

**Independent Test**: Disconnect a channel → status changes to "Disconnected" → new messages stop → old conversations still accessible. Reconnect → status "Active" → messages resume → same `channelId` (no orphaned conversations).

### Implementation

- [X] T017 [US3] Implement `channels.disconnect` mutation in `convex/channels.ts` — input: `{ channelId: Id<"channels"> }`; call `requireAdmin(ctx)`; verify `channel.tenantId === tenantId`; patch `status: "disconnected"`, `disconnectedAt: Date.now()`; DO NOT delete channel or conversations; return `void`
- [X] T018 [US3] Implement `channels.rename` mutation in `convex/channels.ts` — input: `{ channelId: Id<"channels">; displayName: string }`; call `requireAdmin(ctx)`; verify tenant ownership; patch `displayName`; return `void`
- [X] T019 [US3] Add Disconnect and Rename actions to channel rows in `app/(dashboard)/settings/channels/page.tsx` — "Disconnect" button calls `useMutation(api.channels.disconnect)` with confirmation dialog ("هل تريد قطع الاتصال؟ لن تصل رسائل جديدة لهذا الرقم"); inline rename via editable display name field calling `api.channels.rename`
- [X] T020 [US3] Add "Reconnect required" banner in `app/(dashboard)/settings/channels/page.tsx` — when any channel has `status === "reconnect_required"`, show a yellow banner above the channel list: "انتهت صلاحية اتصال أحد أرقامك — أعد الاتصال لاستئناف الرسائل"; each such channel shows a "إعادة الاتصال" button that launches `<EmbeddedSignupButton>` (reconnection flow reuses T010's upsert path)
- [X] T021 [US3] Implement webhook retry scheduled function in `convex/channels.ts` — `internalAction` called when webhook registration fails in T010; retries `POST /{wabaId}/subscribed_apps` up to 5 times with 60-second delay via `ctx.scheduler.runAfter`; on success calls `setStatus(channelId, "active")`; after 5 failures leaves status as `"connecting"` (manual admin intervention required)
- [X] T022 [P] [US3] Add token revocation detection in `completeEmbeddedSignup` in `convex/channels.ts` — after calling Meta API check `data.error?.code === 190`; if detected call `ctx.runMutation(internal.channels.setStatus, { channelId, status: "reconnect_required" })` and throw `ConvexError("TOKEN_REVOKED")`; handle `TOKEN_REVOKED` in `embedded-signup-button.tsx` with message: "انتهت صلاحية الرمز — أعد ربط حسابك"

**Checkpoint**: Disconnect flow preserves conversations. Reconnect reuses same channelId. Reconnect required banner appears when error.code 190 detected.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: RTL validation, error states, onboarding integration, and edge case hardening.

- [X] T023 Create `app/onboarding/page.tsx` — protected route (redirect unauthenticated users); reads `useQuery(api.onboardingStates.getForTenant)`; if all required steps complete redirect to `/inbox`; renders step-by-step guided flow placeholder for `004-multi-tenant-onboarding` (at minimum shows step 3: Connect WhatsApp with `<EmbeddedSignupButton>` embedded)
- [X] T024 RTL validation — audit all new components (`embedded-signup-button.tsx`, `channel-status-badge.tsx`, `settings/channels/page.tsx`) for: `dir="rtl"` on containers, Cairo font applied, `ms-`/`me-` Tailwind spacing (not `ml-`/`mr-`), directional icons flipped, phone numbers rendered with `dir="ltr"` inside RTL layout
- [X] T025 Loading and error states — ensure all Convex mutations show loading spinner during action execution; all ConvexError codes surface user-facing Arabic messages; "Connect WhatsApp" button disabled while SDK is loading or action is in-flight; empty state on channels page when no channels connected yet

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user stories**
- **Phase 3 (US1)**: Depends on Phase 2 — this is the MVP
- **Phase 4 (US2)**: Depends on Phase 3 (needs working channel list and `completeEmbeddedSignup`)
- **Phase 5 (US3)**: Depends on Phase 3 (needs existing connected channels to disconnect/reconnect)
- **Phase 6 (Polish)**: Depends on all story phases complete

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational — no other story dependencies
- **US2 (P2)**: Depends on US1 (plan limit UX builds on the channel list and signup button)
- **US3 (P3)**: Depends on US1 (disconnect/reconnect operates on channels created by US1 flow)

### Critical Path

```
T001→T002 → T003→T004→T005→T006 → T007→T008→T009→T010→T011→T012→T013
(Setup)        (Foundational)                    (US1 MVP)
```

T010 (`completeEmbeddedSignup`) is the most complex single task — it chains: auth → plan check → Meta token exchange → AES-256 encrypt → webhook registration → DB upsert → onboarding state update.

### Parallel Opportunities

- T001 and T002 can run in parallel (different systems)
- T005 and T006 can run in parallel (different files)
- T011 and T012 (badge + button) can run in parallel (different components, no dependency)
- T014, T015, T016 (US2 tasks) can run in parallel
- T017, T018 (disconnect + rename mutations) can run in parallel
- T021 and T022 can run in parallel (both extend channels.ts but in independent functions)
- T024 and T025 can run in parallel

---

## Parallel Example: US1 Implementation

```text
# After T010 is done, launch in parallel:
Task A: "Create channel-status-badge.tsx" (T011)
Task B: Continue "Create embedded-signup-button.tsx" (T012)

# After T011 and T012 complete:
Task: "Create settings/channels/page.tsx" (T013)
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 (Setup) — T001, T002
2. Complete Phase 2 (Foundational) — T003–T006
3. Complete Phase 3 (US1) — T007–T013
4. **STOP and VALIDATE**: Run quickstart.md E2E checklist (US1 section)
5. Admin can connect WhatsApp in under 5 minutes ✅

### Incremental Delivery

1. Setup + Foundational → schema ready, encryption ready
2. US1 → First channel connection works end-to-end → **DEPLOYABLE MVP**
3. US2 → Plan limits enforced, second channel supported
4. US3 → Disconnect/reconnect/token revocation handling
5. Polish → RTL audit, error states, onboarding page shell

---

## Notes

- The `completeEmbeddedSignup` action (T010) is the critical security boundary — `META_APP_SECRET` and raw `access_token` must never leave this server-side Convex action
- AES-256 encryption (T003) must be tested manually: encrypt → store → decrypt → compare to original before T010 is written
- `by_tenant_phone` index (T004) enforces uniqueness for reconnection matching — upsert in T010 depends on this index existing
- Webhook registration footgun (from research.md): `POST /{wabaId}/subscribed_apps` MUST be called — Meta does NOT do this automatically
- All Arabic text in components must use Cairo font — never system default fonts for Arabic content
