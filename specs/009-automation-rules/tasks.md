# Tasks: Automation Rules (009)

**Input**: Design documents from `/specs/009-automation-rules/`  
**Branch**: `009-automation-rules`  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Data Model**: [data-model.md](./data-model.md)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story this task belongs to (US1–US5)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Schema, plan limits, and helper library — required before any story can be built.

- [x] T001 Add `automationRules`, `businessHours`, and `ruleFireLog` tables to `convex/schema.ts` (see data-model.md for exact field definitions and indexes)
- [x] T002 Add `AUTOMATION_RULE_LIMITS` constant and `assertAutomationRuleLimitNotReached()` function to `convex/lib/planLimits.ts` (Free: 2, Starter: 10, Growth: 30, Business: Infinity)
- [x] T003 [P] Create `lib/automationHelpers.ts` with three pure functions: `interpolateTemplate(template, vars)`, `isOutsideBusinessHours(schedule, timezone)`, and `resolveVariables(conversationId, tenantId)` type definitions — no Convex imports, Arabic fallbacks for all variables

**Checkpoint**: Schema deployed (`npx convex dev` runs without errors), plan limits helper exported, helper lib typed

---

## Phase 2: Foundational (Blocking Backend)

**Purpose**: Core Convex backend that all UI stories depend on. Must be complete before Phases 3–7.

**⚠️ CRITICAL**: No user story UI work can begin until this phase is complete.

- [x] T004 Create `convex/automations.ts` — scaffold file with imports (`getCallerIdentity`, `assertAdminOrSupervisor`, `internal`, `v`) and empty exported stubs for all six public functions: `listRules`, `getBusinessHours`, `createRule`, `updateRule`, `deleteRule`, `toggleRule`, `reorderRules`, `saveBusinessHours`
- [x] T005 Implement `listRules` query in `convex/automations.ts` — fetches all rules for `tenantId` using `by_tenant_priority` index, returns ordered array; enforces `assertAdminOrSupervisor`
- [x] T006 [P] Implement `getBusinessHours` query in `convex/automations.ts` — fetches single doc by `tenantId` via `by_tenant` index, returns `null` if not found; enforces `assertAdminOrSupervisor`
- [x] T007 Implement `createRule` mutation in `convex/automations.ts` — validates name/template/trigger-specific fields, calls `assertAutomationRuleLimitNotReached`, sets priority to `(maxExisting + 1)`, inserts doc; enforces `assertAdminOrSupervisor`; throws `BUSINESS_HOURS_REQUIRED` if `outside_hours` trigger selected and no `businessHours` doc exists
- [x] T008 [P] Implement `updateRule` mutation in `convex/automations.ts` — validates ownership (`rule.tenantId === callerTenantId`), patches provided fields, updates `updatedAt`; enforces `assertAdminOrSupervisor`
- [x] T009 [P] Implement `deleteRule` mutation in `convex/automations.ts` — deletes rule doc, then re-sequences priority (0…N-1) for all remaining tenant rules in a single patch loop; enforces `assertAdminOrSupervisor`
- [x] T010 [P] Implement `toggleRule` mutation in `convex/automations.ts` — patches `enabled` field and `updatedAt`; validates ownership; enforces `assertAdminOrSupervisor`
- [x] T011 Implement `reorderRules` mutation in `convex/automations.ts` — validates that `orderedIds` is an exact match (same set, no extras/missing) to all tenant rule IDs, then writes priority 0…N-1 in order; throws `INVALID_ORDER` on mismatch; enforces `assertAdminOrSupervisor`
- [x] T012 [P] Implement `saveBusinessHours` mutation in `convex/automations.ts` — upserts `businessHours` doc for tenant (insert if not exists, patch if exists); validates timezone string is non-empty; enforces `assertAdmin` only (not supervisor)
- [x] T013 Implement `internal.automations.evaluateAndFireAutomations` internalMutation in `convex/automations.ts` — (a) check if agent is already active (outbound message with `authorId != "automation"` exists on conversation → stop); (b) fetch enabled rules ordered by priority; (c) evaluate Keyword, OutsideHours, FirstMessage triggers in order, stop on first match; (d) on match: `ctx.db.insert("messages", {..., authorId: "automation"})`, schedule `internal.actions.sendWhatsAppMessage.sendMessage`, insert `ruleFireLog` record; skip `no_reply_timeout` rules (handled by cron)
- [x] T014 [P] Implement `internal.automations.checkNoReplyTimeouts` internalMutation in `convex/automations.ts` — queries all enabled `no_reply_timeout` rules across all tenants; for each rule queries open conversations with assigned agent where last inbound message timestamp is older than `(now - timeoutMinutes * 60000)`; skips conversations where `ruleFireLog` already has an entry for same `ruleId + conversationId` within current timeout window; fires automated reply for qualifying conversations
- [x] T015 Hook `evaluateAndFireAutomations` into `convex/http.ts` — add `await ctx.runMutation(internal.automations.evaluateAndFireAutomations, {...})` after the existing `log("message_inserted", ...)` block and after the round-robin assignment block (so agent is assigned before the "agent active?" check runs)
- [x] T016 [P] Add `check-automation-timeouts` cron (interval: 1 minute) to `convex/crons.ts` calling `internal.automations.checkNoReplyTimeouts`

**Checkpoint**: Run `npx convex dev` — no TypeScript errors. Manually call `createRule` via Convex dashboard to verify insert. Confirm `listRules` returns sorted results.

---

## Phase 3: User Story 1 — Create and Activate a Keyword Rule (Priority: P1) 🎯 MVP

**Goal**: Admin creates a keyword rule from the dashboard; it fires an automated WhatsApp reply within 30 seconds when a customer message matches.

**Independent Test**: Create keyword rule with trigger "مرحبا" → send "مرحبا" from test WhatsApp number → automated reply received. Disable rule → send "مرحبا" → no reply.

- [x] T017 [US1] Create `app/(dashboard)/automations/page.tsx` as a Client Component — uses Clerk `useAuth()` to check role (`org:admin` or `org:supervisor` only, redirect agents to `/inbox`), renders `<AutomationRulesClient />` client boundary
- [x] T018 [US1] Create `components/automations/AutomationRuleCard.tsx` — Client Component; accepts rule props and `onEdit`/`onDelete` callbacks; renders: drag handle (≡, inline-start side in RTL), rule name, trigger badge (Arabic label per trigger type), response preview truncated to 80 chars, `Switch` wired to `useMutation(api.automations.toggleRule)`, Edit button, Delete button with confirmation `Dialog`; `dir="rtl"` on root, `ms-`/`me-` for spacing
- [x] T019 [US1] Create `components/automations/AutomationRuleForm.tsx` — Client Component rendered inside `Sheet` (side="left" for RTL); fields: name `Input`, trigger type `Select` (keyword / outside_hours / first_message / no_reply_timeout with Arabic labels), keywords tag-input (shown when trigger = keyword), timeout number input (shown when trigger = no_reply_timeout), response `Textarea` with variable chips below ({{customer_name}} etc.), live preview panel using `interpolateTemplate`; submit calls `useMutation(api.automations.createRule)` or `updateRule` based on `mode` prop; handles `PLAN_LIMIT_REACHED` error with upgrade toast; business hours warning when `outside_hours` selected without config; `dir="rtl"` throughout
- [x] T020 [US1] Create `components/automations/AutomationRulesClient.tsx` — Client Component using `useQuery(api.automations.listRules)` and `useQuery(api.lib.tenants.getCurrentPlan)`; renders list of `AutomationRuleCard` components; renders empty state (Zap icon + "إضافة أول قاعدة" CTA) when list is empty; renders "+ إضافة قاعدة" button that opens `AutomationRuleForm` Sheet in create mode; renders plan limit amber banner when at limit; handles drag-and-drop reorder using native HTML5 drag events calling `useMutation(api.automations.reorderRules)` with updated ID order; loading skeletons while data is undefined
- [x] T021 [US1] Verify keyword trigger evaluation inside `evaluateAndFireAutomations` (already implemented in T013) — keyword match uses `lowerContent.includes(kw.toLowerCase())` with `.toLowerCase()` on both sides, safe for Arabic characters

**Checkpoint**: Navigate to `/dashboard/automations`, create a keyword rule, send matching message from WhatsApp test number, verify automated reply arrives. Toggle rule off — verify rule no longer fires.

---

## Phase 4: User Story 2 — Outside Business Hours Auto-Reply (Priority: P2)

**Goal**: Admin configures business hours + creates an outside-hours rule; customers get an automated reply when messaging outside those hours.

**Independent Test**: Set hours to 09:00–17:00 Sat–Thu, create outside-hours rule, send message at 20:00 → automated reply received. Send at 10:00 → no automated reply.

- [x] T022 [US2] Create `components/automations/BusinessHoursForm.tsx` — Client Component; 7-day schedule with per-day enable toggle via Checkbox, open/close time inputs (`dir="ltr"`), IANA timezone selector with common MENA zones pre-listed; submit calls `useMutation(api.automations.saveBusinessHours)`; Arabic labels for all days (السبت، الأحد…); loading skeleton; `dir="rtl"` on container
- [x] T023 [US2] Add "ساعات العمل" (Business Hours) section to `app/(dashboard)/automations/page.tsx` — renders `BusinessHoursForm` below the rules list in a bordered section; shows "لم يتم الضبط بعد" placeholder when not configured; Admin-only (hidden for Supervisors); `isAdmin` prop passed from page via `AutomationRulesClient`
- [x] T024 [US2] Implement `isOutsideBusinessHours(schedule, timezone)` in `lib/automationHelpers.ts` — already implemented in Phase 1 (T003); uses `Intl.DateTimeFormat` with timezone, handles cross-midnight, disabled days
- [x] T025 [US2] Wire outside-hours trigger evaluation in `evaluateAndFireAutomations` (`convex/automations.ts`) — already implemented in Phase 2 (T013); fetches `businessHours` doc, calls `isOutsideBusinessHours`, skips if no doc
- [x] T026 [US2] Add inline warning to `AutomationRuleForm.tsx` when trigger type `outside_hours` is selected and `getBusinessHours` returns `null` — already implemented in Phase 3 (T019); shows amber AlertTriangle callout "يجب ضبط ساعات العمل أولاً"; disables Save button

**Checkpoint**: Configure hours, create outside-hours rule, verify trigger fires only outside configured window. Verify no-hours warning appears in the form when hours not yet configured.

---

## Phase 5: User Story 3 — First-Message Welcome Reply (Priority: P3)

**Goal**: Automated welcome message fires the very first time a new contact messages the business. Never fires again for the same contact.

**Independent Test**: New contact sends first message → welcome reply received. Same contact sends a second message later → no automated reply fires.

- [x] T027 [US3] Implement first-message trigger evaluation in `evaluateAndFireAutomations` (`convex/automations.ts`) — already implemented in Phase 2 (T013) at line 401-408; condition: `args.isNewConversation === true && (contact.totalConversations ?? 0) <= 1`; contact doc fetched via `conversation.contactId`; both conditions ensure rule only fires once per contact lifetime
- [x] T028 [US3] Verify `messages.createInbound` correctly increments `contact.totalConversations` when a new conversation is created — fixed bug: `incrementConversations: true` was passed unconditionally to `upsertByPhone` on every inbound message, causing over-counting. Now `totalConversations` is only incremented inside `createInbound` when `isNewConversation === true`, after the conversation is created

**Checkpoint**: New test contact sends first message → welcome rule fires. Same contact opens new conversation, sends message → rule does NOT fire (totalConversations > 1).

---

## Phase 6: User Story 4 — No-Reply Timeout Message (Priority: P4)

**Goal**: If an assigned agent hasn't replied within a configured number of minutes, an automated message is sent to the customer.

**Independent Test**: Assign conversation to agent, do not reply for X minutes → automated message fires once. Agent replies at minute X-2 → no automated message.

- [x] T029 [US4] Implement the full body of `checkNoReplyTimeouts` internalMutation in `convex/automations.ts` — already implemented in Phase 2 (T014); iterates all tenants, fetches enabled `no_reply_timeout` rules via `by_tenant_enabled` index, checks open conversations with assigned agents, verifies no agent reply since last inbound message, checks `ruleFireLog` for dedup within timeout window, fires automated reply via `fireAutomatedReply` helper
- [x] T030 [US4] Add timeout minutes field display to `AutomationRuleCard.tsx` — already implemented in Phase 3 (T018); shows "بعد X دقيقة بدون رد" badge when `triggerType === "no_reply_timeout"`

**Checkpoint**: Set a 2-minute no-reply timeout rule. Assign a real conversation to an agent. Do not reply for 2 minutes. Verify automated message arrives. Reply at 1 minute in a second test — verify no automated message.

---

## Phase 7: User Story 5 — Rules Management Dashboard (Priority: P2)

**Goal**: Admin can toggle rules on/off instantly, reorder via drag-and-drop, preview rule output, and see plan limits enforced.

**Independent Test**: Toggle rule off → send trigger → no reply. Drag rule to position 1 → verify new order used for next message. Create rule at plan limit → upgrade prompt shown.

*Note: Core management UI was built in T017–T020 (Phase 3). This phase completes the remaining management interactions.*

- [x] T031 [US5] Implement drag-and-drop reorder in `AutomationRulesClient.tsx` — native HTML5 `draggable` + `onDragStart`/`onDragOver`/`onDrop`/`onDragEnd` events; drop indicator line shown via `cn` class toggle; `handleDrop` computes new order and calls `reorderRules`; grip handle icon on inline-start side (RTL natural)
- [x] T032 [US5] Implement live preview in `AutomationRuleForm.tsx` — preview panel below textarea uses `interpolateTemplate` with sample values (`أحمد محمد`, `الشركة`, `فريق الدعم`, current time); updates on every keystroke via `useMemo`; WhatsApp-green bordered container
- [x] T033 [US5] Add plan limit enforcement UI to `AutomationRulesClient.tsx` — fetches plan via `useQuery(api.lib.tenants.getCurrentPlan)`; compares against `PLAN_RULE_LIMITS`; amber banner at limit; disabled "+ إضافة قاعدة" button; `PLAN_LIMIT_REACHED` error handled in form with upgrade toast
- [x] T034 [US5] Add delete confirmation dialog to `AutomationRuleCard.tsx` — Dialog with title "حذف القاعدة؟" and rule name; optimistic UI: `removing` state sets `opacity-0 scale-95` immediately, restores on error

**Checkpoint**: Toggle off → verify stops firing. Drag reorder → verify new priority order is persisted and used. Hit plan limit → verify button disabled and banner shown.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: RTL validation, loading states, error boundaries, and Arabic UI completeness.

- [x] T035 [P] Audit all new components (`AutomationRuleCard`, `AutomationRuleForm`, `AutomationRulesClient`, `BusinessHoursForm`) for RTL compliance — verified: `dir="rtl"` on all root containers, zero `ml-`/`mr-` usage (all `ms-`/`me-`), time inputs use `dir="ltr"`, font-cairo class applied globally, grip handle on inline-start side
- [x] T036 [P] Add loading skeletons to `AutomationRulesClient.tsx` — while `useQuery` returns `undefined`, renders 3 `Skeleton` cards matching card height; prevents layout shift
- [x] T037 [P] Add error boundary / error state to `AutomationRulesClient.tsx` — if rules query fails, shows "حدث خطأ في تحميل القواعد. حاول مرة أخرى." with AlertCircle icon and RefreshCw retry button
- [x] T038 [P] Add route to sidebar nav — added `Zap` icon to `IconName` type, `resolve-icon.tsx`, and `nav-config.ts` with href `/automations`, label "قواعد تلقائية"/"Automations", minRole `supervisor`
- [ ] T039 Run the smoke test sequence from `quickstart.md` end-to-end — verify all 8 test steps pass with a real WhatsApp connection; document any failures
- [x] T040 [P] Update `CLAUDE.md` Recent Changes section — updated with full 009-automation-rules entry: new tables, files, modifications, trigger types, plan limits, role access

**Checkpoint**: Full feature passes quickstart smoke test. All components pass RTL visual review in Arabic locale. Sidebar link accessible for Admin/Supervisor, hidden for Agent.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    └── Phase 2 (Backend) — BLOCKS all UI phases
            ├── Phase 3 (US1 — Keyword) ← MVP
            ├── Phase 4 (US2 — Outside Hours) ← can parallel with Phase 3 after T013 done
            ├── Phase 5 (US3 — First Message) ← can parallel after Phase 2
            ├── Phase 6 (US4 — No-Reply Timeout) ← requires T016 (cron) from Phase 2
            └── Phase 7 (US5 — Management) ← most tasks depend on Phase 3 UI existing
                    └── Phase 8 (Polish)
```

### Within-Phase Task Dependencies

**Phase 2**:
- T005–T012 can run in parallel (different functions, same file — coordinate to avoid merge conflicts)
- T013 depends on T005 (needs `listRules` query pattern established)
- T015 depends on T013 (must exist before hooking into http.ts)
- T016 depends on T014

**Phase 3**:
- T018, T019, T020 can run in parallel (different component files)
- T017 depends on T020 (page imports the client component)
- T021 depends on T013 (evaluation already stubbed)

**Phase 4**:
- T024 (helper) can start immediately (pure function, no Convex)
- T022, T023, T026 can parallel once T024 is done
- T025 depends on T024

**Phase 7**:
- T031 depends on T020 (adds to existing client component)
- T032 depends on T019 (adds to existing form component)
- T033 depends on T020
- T034 depends on T018

---

## Parallel Execution Examples

### Launch Phase 2 backend functions together (same file — coordinate)
```
T005: listRules query
T006: getBusinessHours query      ← parallel with T005
T008: updateRule mutation         ← parallel with T005, T006
T009: deleteRule mutation         ← parallel with T005, T006
T010: toggleRule mutation         ← parallel with T005, T006
T012: saveBusinessHours mutation  ← parallel with T005, T006
```

### Launch Phase 3 UI components together
```
T018: AutomationRuleCard.tsx      ← parallel
T019: AutomationRuleForm.tsx      ← parallel
T020: AutomationRulesClient.tsx   ← parallel
```

### Launch Phase 8 polish together
```
T035: RTL audit      ← parallel
T036: Loading states ← parallel
T037: Error states   ← parallel
T038: Sidebar nav    ← parallel
T040: CLAUDE.md      ← parallel
```

---

## Implementation Strategy

### MVP (User Story 1 Only — ~Phase 1 + 2 + 3)

1. Complete Phase 1: Schema + plan limits + helper lib
2. Complete Phase 2: Full backend (all mutations + internal eval + webhook hook)
3. Complete Phase 3: Keyword rule UI
4. **STOP and VALIDATE**: Send keyword trigger message, verify automated reply
5. Deploy to staging if validated

### Incremental Delivery

| Step | Delivers |
|------|---------|
| Phase 1 + 2 + 3 | MVP: keyword rules work end-to-end |
| + Phase 4 | Outside hours auto-reply |
| + Phase 5 | First-message welcome |
| + Phase 6 | No-reply timeout |
| + Phase 7 | Full management UX (drag, preview, limits) |
| + Phase 8 | Production-ready polish |

---

## Notes

- `[P]` tasks have no shared file dependencies within their phase — safe to parallelize
- All Convex mutations must be called via `useMutation` on client or `ctx.runMutation` on server — never fetch directly
- The `authorId: "automation"` sentinel on auto-sent messages is critical for the agent-active check — never omit it
- Keyword matching must handle Arabic characters: use `.toLowerCase()` which is safe for Latin; for Arabic case-insensitivity, test with both `toLowerCase` and locale-aware comparison
- `totalConversations` increment (T028) must be verified to already exist in `messages.createInbound` before writing a new increment — avoid double-counting
- Business hours form time inputs must use `dir="ltr"` even inside the RTL container (HH:MM format is LTR)
