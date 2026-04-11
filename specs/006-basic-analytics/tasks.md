# Tasks: Basic Analytics

**Input**: Design documents from `/specs/006-basic-analytics/`
**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, contracts/convex-api.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add `conversationMetrics` table to schema and scaffold new Convex modules

- [x] T001 Add `conversationMetrics` table definition with all fields and indexes to `convex/schema.ts`
- [x] T002 [P] Create empty `convex/conversationMetrics.ts` module with file-level JSDoc describing its role as an internal write-only read-model
- [x] T003 [P] Create empty `convex/analytics.ts` module with file-level JSDoc describing its role as the analytics query layer

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Internal mutation triggers and pipeline integration — must be complete before any analytics queries can return real data

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Implement `conversationMetrics.create` (`internalMutation`) in `convex/conversationMetrics.ts` — inserts record with `messageCount: 0`, `firstResponseAt: undefined`, `resolvedAt: undefined`
- [x] T005 Implement `conversationMetrics.recordFirstResponse` (`internalMutation`) in `convex/conversationMetrics.ts` — idempotent; only patches if `firstResponseAt` is not yet set; computes `firstResponseTimeSeconds`
- [x] T006 Implement `conversationMetrics.recordResolution` (`internalMutation`) in `convex/conversationMetrics.ts` — patches `resolvedAt`, `assignedAgentId`, `agentName` snapshot
- [x] T007 Implement `conversationMetrics.incrementMessageCount` (`internalMutation`) in `convex/conversationMetrics.ts` — increments `messageCount` by 1 using `ctx.db.patch`
- [x] T008 Integrate `conversationMetrics.create` trigger into `convex/conversations.ts` — call `ctx.scheduler.runAfter(0, internal.conversationMetrics.create, ...)` inside the new-conversation mutation
- [x] T009 Integrate `conversationMetrics.recordResolution` trigger into `convex/conversations.ts` — call `ctx.scheduler.runAfter(0, internal.conversationMetrics.recordResolution, ...)` when status changes to `"resolved"`
- [x] T010 Integrate `conversationMetrics.recordFirstResponse` and `conversationMetrics.incrementMessageCount` triggers into `convex/messages.ts` — call both via `ctx.scheduler.runAfter(0, ...)` on each new outbound non-internal-note message; call `incrementMessageCount` only for all new messages (inbound or outbound)

**Checkpoint**: Pipeline integration complete — new conversations and messages now write to `conversationMetrics`. Analytics queries can return real data.

---

## Phase 3: User Story 1 — Admin views team performance overview (Priority: P1) 🎯 MVP

**Goal**: Admin/Supervisor opens `/analytics` and sees total conversations, avg first response time, and total messages for the last 30 days, with a working date range filter.

**Independent Test**: Open Analytics → verify 3 summary cards appear with data for last 30 days → change range to last 7 days → verify numbers update → confirm empty state shows "لا توجد بيانات لهذه الفترة" when no data exists.

### Implementation for User Story 1

- [x] T011 [US1] Implement `analytics.getTeamSummary` query in `convex/analytics.ts` — filters `conversationMetrics` by `tenantId` + `createdAt` range using `by_tenant_created` index; enforces `assertAdminOrSupervisor`; returns `{ totalConversations, avgFirstResponseTimeSeconds, totalMessages }`
- [x] T012 [P] [US1] Create `components/analytics/date-range-picker.tsx` — preset buttons (آخر 7 أيام / آخر 30 يومًا / آخر 90 يومًا) + custom date picker (shadcn/ui `<Popover>` + `<Calendar>`); max range 365 days; enforces RTL layout; exposes `value: DateRange` and `onChange` props
- [x] T013 [US1] Create `components/analytics/team-summary-cards.tsx` — client component; uses `useQuery(api.analytics.getTeamSummary, { startTs, endTs })`; renders 3 shadcn/ui `<Card>` components with skeleton loading state and "لا توجد بيانات لهذه الفترة" empty state; labels bilingual (Arabic primary)
- [x] T014 [US1] Create `components/analytics/analytics-dashboard.tsx` — client component orchestrator; holds `DateRange` state (default: last 30 days); renders `<DateRangePicker>`, `<TeamSummaryCards>`, and placeholder slots for US2/US3 components; accepts `locale: "ar" | "en"` prop
- [x] T015 [US1] Create `app/(dashboard)/analytics/layout.tsx` — server component; reads `tenant.plan` via `fetchQuery(api.tenants.getForCaller)`; renders `<AnalyticsUpsellTeaser>` if plan is `free` or `starter`; renders children otherwise; enforces org:admin or org:supervisor access (redirect agents to `/my-stats`)
- [x] T016 [US1] Create `app/(dashboard)/analytics/page.tsx` — server component; renders `<AnalyticsDashboard locale={locale} />`; derives `locale` from Clerk session or tenant settings
- [x] T017 [P] [US1] Create `components/analytics/analytics-upsell-teaser.tsx` — renders blurred analytics preview with shadcn/ui `<Card>` overlay and CTA: "ترقية إلى Growth للوصول إلى التحليلات" / "Upgrade to Growth for Analytics"; links to billing page

**Checkpoint**: US1 complete — Admin/Supervisor can view and filter team summary. Free/Starter see teaser. Agents see redirect.

---

## Phase 4: User Story 2 — Admin reviews individual agent performance (Priority: P2)

**Goal**: Admin/Supervisor sees per-agent breakdown table with conversations handled and avg response time for the selected date range.

**Independent Test**: With multiple agents having conversations → open Analytics → verify agent table shows each agent's row with conversation count and avg response time → change date range → verify table updates → confirm agents with zero conversations still appear.

### Implementation for User Story 2

- [x] T018 [US2] Implement `analytics.getAgentPerformance` query in `convex/analytics.ts` — filters `conversationMetrics` by `tenantId` + `createdAt` range; groups by `assignedAgentId`; returns per-agent `{ agentId, agentName, conversationsHandled, avgFirstResponseTimeSeconds }`; uses `"[Former Agent]"` fallback for agents no longer in org; enforces `assertAdminOrSupervisor`
- [x] T019 [US2] Create `components/analytics/agent-performance-table.tsx` — client component; accepts `dateRange: DateRange` and `orgMembers: OrgMember[]` props; uses `useQuery(api.analytics.getAgentPerformance)`; merges result with `orgMembers` to add zero-count rows for agents not in result; renders shadcn/ui `<Table>` with columns: Agent Name, Conversations Handled, Avg Response Time; skeleton loading state; RTL-compatible
- [x] T020 [US2] Integrate `<AgentPerformanceTable>` into `components/analytics/analytics-dashboard.tsx` — pass `dateRange` state and `orgMembers` (fetched from Clerk `useOrganizationMembersList` hook) as props

**Checkpoint**: US2 complete — Admin/Supervisor sees per-agent performance table alongside team summary.

---

## Phase 5: User Story 3 — Admin views conversation volume over time (Priority: P3)

**Goal**: Admin/Supervisor sees a bar chart of daily (or weekly) conversation counts for the selected date range.

**Independent Test**: Open Analytics → verify volume chart renders bars for each day in the default 30-day range → change to 7-day range → verify daily granularity → change to 90-day range → verify weekly grouping → hover a bar → verify tooltip shows exact count and date label.

### Implementation for User Story 3

- [x] T021 [US3] Implement `analytics.getVolumeOverTime` query in `convex/analytics.ts` — filters `conversationMetrics` by `tenantId` + `createdAt` range; groups by day (≤60 days) or week (>60 days) in UTC; returns `Array<{ bucketLabel, bucketStart, count }>`; enforces `assertAdminOrSupervisor`
- [x] T022 [US3] Create `components/analytics/volume-chart.tsx` — client component; accepts `dateRange: DateRange` prop; uses `useQuery(api.analytics.getVolumeOverTime)`; renders Recharts `<BarChart>` inside a `dir="ltr"` container (SVG not RTL-aware); card title and enclosing `<Card>` use RTL; tooltip shows exact count + date/week label; skeleton loading state; empty state message in Arabic
- [x] T023 [US3] Integrate `<VolumeChart>` into `components/analytics/analytics-dashboard.tsx` — pass `dateRange` state as prop; position below agent performance table

**Checkpoint**: US3 complete — Full analytics dashboard now shows team summary, agent table, and volume chart.

---

## Phase 6: User Story 4 — Agent views their own performance stats (Priority: P4)

**Goal**: Agent opens `/my-stats` and sees only their own conversation count and avg response time for the current month. Full analytics at `/analytics` shows "Permission denied".

**Independent Test**: Log in as Agent → open `/my-stats` → verify only own metrics visible → directly navigate to `/analytics` → verify "Permission denied" or redirect to `/my-stats`.

### Implementation for User Story 4

- [x] T024 [US4] Implement `analytics.getMyStats` query in `convex/analytics.ts` — filters `conversationMetrics` by `tenantId` + `assignedAgentId = callerId` + `createdAt` within current UTC calendar month; accessible to all authenticated roles (each sees only their own data); returns `{ conversationsHandled, avgFirstResponseTimeSeconds }`
- [x] T025 [US4] Create `components/analytics/agent-my-stats.tsx` — client component; uses `useQuery(api.analytics.getMyStats)`; renders 2 shadcn/ui `<Card>` components: own conversation count + own avg response time for current month; skeleton loading state; bilingual labels (Arabic primary); RTL layout
- [x] T026 [US4] Create `app/(dashboard)/my-stats/page.tsx` — server component; accessible to all authenticated roles; renders `<AgentMyStats />`; add sidebar nav link visible to all roles (Agents land here by default)
- [x] T027 [US4] Update `app/(dashboard)/analytics/layout.tsx` to redirect agents (role: `org:agent`) to `/my-stats` instead of showing "Permission denied" — use Clerk `auth()` to check role server-side

**Checkpoint**: US4 complete — Agents have their own stats page; full analytics dashboard remains gated.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: RTL validation, empty states, error boundaries, and sidebar navigation wiring

- [x] T028 [P] Add `Analytics` and `My Stats` links to the dashboard sidebar in `app/(dashboard)/layout.tsx` or the sidebar component — Analytics link visible only to admin/supervisor; My Stats visible to all roles
- [x] T029 [P] Verify all analytics components render correctly in RTL layout (`dir="rtl"`) — check card alignment, table direction, date picker, and that `<VolumeChart>` container uses `dir="ltr"` while enclosing card is RTL
- [x] T030 Add error boundary around `<AnalyticsDashboard>` in `app/(dashboard)/analytics/page.tsx` using a client-side `<ErrorBoundary>` or Next.js `error.tsx` — show friendly Arabic error message on query failure
- [x] T031 [P] Validate max date range enforcement (365 days) in `components/analytics/date-range-picker.tsx` — show clear error message if user selects range > 365 days
- [ ] T032 Run through `specs/006-basic-analytics/quickstart.md` validation scenarios (if available) to confirm all acceptance criteria pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **User Stories (Phases 3–6)**: All depend on Phase 2 completion
  - Can proceed in priority order (US1 → US2 → US3 → US4) since US2 and US3 integrate into the US1 dashboard component
- **Polish (Phase 7)**: Depends on all user story phases being complete

### User Story Dependencies

- **US1 (P1)**: Start after Phase 2 — no dependencies on other stories; builds the dashboard shell
- **US2 (P2)**: Start after Phase 2 — integrates into the US1 dashboard component (`analytics-dashboard.tsx`)
- **US3 (P3)**: Start after Phase 2 — integrates into the US1 dashboard component (`analytics-dashboard.tsx`)
- **US4 (P4)**: Start after Phase 2 — independent page (`/my-stats`), no dependencies on US1/US2/US3

### Parallel Opportunities

- T002 and T003 (Phase 1) can run in parallel
- T004–T007 (Phase 2) can run in parallel (different functions in the same file — coordinate to avoid conflicts)
- T008, T009, T010 (Phase 2) can run in parallel (different existing files)
- T012 and T017 (Phase 3) can run in parallel
- US4 (Phase 6) can run fully in parallel with US2 and US3 since it targets a separate page

---

## Parallel Example: Phase 2

```
# Launch all internal mutations together:
Task T004: conversationMetrics.create in convex/conversationMetrics.ts
Task T005: conversationMetrics.recordFirstResponse in convex/conversationMetrics.ts
Task T006: conversationMetrics.recordResolution in convex/conversationMetrics.ts
Task T007: conversationMetrics.incrementMessageCount in convex/conversationMetrics.ts

# Then launch all pipeline integrations together:
Task T008: Trigger in convex/conversations.ts (create)
Task T009: Trigger in convex/conversations.ts (resolve)
Task T010: Triggers in convex/messages.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (pipeline integration)
3. Complete Phase 3: User Story 1 (team summary + date range picker)
4. **STOP and VALIDATE**: Confirm admin sees team summary with real data, free/starter see teaser, agents are redirected
5. Deploy/demo if ready

### Incremental Delivery

1. Phase 1 + Phase 2 → Write pipeline live
2. Phase 3 → Team summary dashboard (MVP)
3. Phase 4 → Per-agent table added to dashboard
4. Phase 5 → Volume chart added to dashboard
5. Phase 6 → Agent personal stats page
6. Phase 7 → Polish pass

---

## Notes

- `conversationMetrics` mutations are `internalMutation` — never callable from the client
- All analytics queries must filter by `tenantId` from `getCallerIdentity` — no cross-tenant data
- Chart container (`<VolumeChart>`) uses `dir="ltr"` to prevent mirrored SVG axes; all surrounding UI stays RTL
- Agent name is snapshotted at resolution time — historical records are preserved even after agents leave
- Convex queries cannot call Clerk API directly — `getAgentPerformance` returns only agents in `conversationMetrics`; client merges with `useOrganizationMembersList` for zero-count rows
