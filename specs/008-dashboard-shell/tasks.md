# Tasks: Dashboard Shell & Role-Aware Navigation

**Input**: Design documents from `/specs/008-dashboard-shell/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ui-contracts.md ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the shell file structure and shared type definitions used by all stories.

- [x] T001 Create `lib/shell/` directory structure and TypeScript types (`NavItem`, `ResolvedUser`) in `lib/shell/types.ts`
- [x] T002 Create `components/shell/` directory structure per implementation plan

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities that all shell components depend on. MUST be complete before any user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Implement `ROLE_ORDER` map and `resolveRole()` helper in `lib/shell/role-utils.ts` — maps `'org:admin' | 'org:supervisor' | 'org:agent'` → `'admin' | 'supervisor' | 'agent'` with numeric ordering for comparison
- [x] T004 Implement `NAV_ITEMS` canonical registry and `filterNavItems(role)` function in `lib/shell/nav-config.ts` — 7 routes per Contract 4 (inbox/contacts/analytics/settings sub-pages), each with `href`, `labelAr`, `labelEn`, `icon`, `minRole`, optional `children`
- [x] T005 Install shadcn/ui Sidebar component by running `npx shadcn@latest add sidebar` and verify it appears in `components/ui/sidebar.tsx`

**Checkpoint**: Foundation ready — all shell components can now be built.

---

## Phase 3: User Story 1 — Agent Navigates the Inbox (Priority: P1) 🎯 MVP

**Goal**: Agent sees a shell with Inbox-only navigation. Desktop sidebar + mobile bottom nav. RTL support. Role badge shows "Agent / وكيل". Forbidden routes redirect server-side.

**Independent Test**: Log in as Agent → sidebar shows only "Inbox" → no Settings/Billing/Analytics links → direct URL to `/settings/billing` redirects to `/inbox` → Arabic locale shows RTL layout with Cairo font.

### Implementation for User Story 1

- [x] T006 [US1] Implement `RoleBadge` client component in `components/shell/role-badge.tsx` — displays role name in locale-aware label (Admin/مدير, Supervisor/مشرف, Agent/وكيل) using `locale` prop
- [x] T007 [US1] Implement `UserMenu` client component in `components/shell/user-menu.tsx` — renders user avatar, name, `RoleBadge`, org name, org switcher (Clerk `<OrganizationSwitcher />`), and Sign Out button (`<SignOutButton />`)
- [x] T008 [US1] Implement `AppSidebar` client component in `components/shell/app-sidebar.tsx` — wraps shadcn `<Sidebar>` with `collapsible="icon"` and `side={locale === 'ar' ? 'right' : 'left'}`; renders filtered `navItems` list with active state using `border-s-2`; embeds `UserMenu` at bottom; uses Tailwind logical properties throughout
- [x] T009 [US1] Implement `BottomNav` client component in `components/shell/bottom-nav.tsx` — renders on `< 768px` only (`md:hidden`); shows max 5 nav items as icons + short labels; active item uses `border-t-2 border-t-primary`; container has `pb-[env(safe-area-inset-bottom)]`; uses `locale` prop for RTL ordering
- [x] T010 [US1] Update `app/(dashboard)/layout.tsx` to resolve `ResolvedUser` server-side via `auth()` from `@clerk/nextjs/server`; filter `NAV_ITEMS` by role using `filterNavItems()`; detect locale from `headers()`; render `<SidebarProvider>`, `<AppSidebar>`, and `<BottomNav>` wrapping `{children}`
- [x] T011 [US1] Add server-side route guard in `app/(dashboard)/settings/billing/layout.tsx` (or `page.tsx`) — call `auth()`, compare `orgRole` against `admin` minimum, redirect to `/inbox` if insufficient
- [x] T012 [US1] Add server-side route guards for all forbidden routes per Contract 5 — create guards in `app/(dashboard)/contacts/layout.tsx`, `app/(dashboard)/analytics/layout.tsx`, `app/(dashboard)/settings/team/layout.tsx`, `app/(dashboard)/settings/channels/layout.tsx`, `app/(dashboard)/settings/quick-replies/layout.tsx` with appropriate `minRole` checks

**Checkpoint**: Agent shell is fully functional. Sidebar shows Inbox only. Mobile bottom nav visible. RTL layout works. Forbidden redirects enforced.

---

## Phase 4: User Story 2 — Admin Navigates the Full Dashboard (Priority: P2)

**Goal**: Admin sees full nav (Inbox, Contacts, Analytics, Settings with all sub-pages including Billing). Org switcher and sign-out functional.

**Independent Test**: Log in as Admin → all 4 top-level nav items visible → expand Settings → all 4 sub-pages visible including Billing → org switcher dropdown lists all orgs → sign-out redirects to `/`.

### Implementation for User Story 2

- [x] T013 [P] [US2] Verify `filterNavItems('admin')` returns all 7 nav items from `lib/shell/nav-config.ts` — no additional code needed if T004 was implemented correctly; if Settings items need grouping as `children`, update `NAV_ITEMS` to nest them under a Settings parent item
- [x] T014 [US2] Update `AppSidebar` in `components/shell/app-sidebar.tsx` to render collapsible Settings group with sub-items — use shadcn `<SidebarGroup>`, `<SidebarMenuSub>` components to render `children` of nav items; Settings group expands/collapses and preserves open state during session
- [x] T015 [US2] Verify `UserMenu` org switcher in `components/shell/user-menu.tsx` uses Clerk's `<OrganizationSwitcher />` which handles multi-org dropdown and switching automatically; ensure `afterSelectOrganizationUrl="/inbox"` is set
- [x] T016 [US2] Verify sign-out in `UserMenu` uses Clerk's `<SignOutButton redirectUrl="/" />` to redirect to marketing homepage after sign-out

**Checkpoint**: Admin can access and navigate all sections including full Settings sub-nav, org switcher, and sign-out.

---

## Phase 5: User Story 3 — Supervisor Navigates Without Billing (Priority: P3)

**Goal**: Supervisor sees all nav except Billing sub-page. Direct URL to `/settings/billing` redirects to `/inbox`. Role badge shows "Supervisor / مشرف".

**Independent Test**: Log in as Supervisor → Settings expandable → Team/Channels/Quick Replies visible → Billing absent → direct URL `/settings/billing` → redirect to `/inbox`.

### Implementation for User Story 3

- [x] T017 [US3] Verify `filterNavItems('supervisor')` excludes the Billing nav item (`/settings/billing` has `minRole: 'admin'`) — confirm the `ROLE_ORDER` comparison in `lib/shell/nav-config.ts` correctly filters it
- [x] T018 [US3] Verify role badge in `components/shell/role-badge.tsx` renders "Supervisor" / "مشرف" for `org:supervisor` role — covered by T006 if implemented correctly; add supervisor label if missing
- [x] T019 [US3] Verify billing route guard in `app/(dashboard)/settings/billing/layout.tsx` correctly redirects `org:supervisor` to `/inbox` — covered by T011; smoke test with supervisor account per quickstart scenario 3.2

**Checkpoint**: Supervisor role fully gated. Billing inaccessible via nav and direct URL.

---

## Phase 6: User Story 4 — Active Navigation State & Wayfinding (Priority: P4)

**Goal**: Active page highlighted in sidebar/bottom nav. Breadcrumbs on nested settings pages. RTL active indicator on correct side.

**Independent Test**: Navigate to Analytics → Analytics highlighted → navigate to Settings → Team → breadcrumb shows "Settings › Team" → Team sub-item highlighted → switch to Arabic → active indicator on right side.

### Implementation for User Story 4

- [x] T020 [US4] Update `AppSidebar` in `components/shell/app-sidebar.tsx` to detect active route using `usePathname()` from `next/navigation` — compare current pathname against each nav item's `href`; apply `data-active` or `aria-current="page"` to the active item; use `border-s-2 border-s-primary` for the active indicator (auto-flips RTL via logical property)
- [x] T021 [US4] Update Settings group in `AppSidebar` to auto-expand when any sub-page is active (`usePathname().startsWith('/settings')`) — Settings parent stays expanded without user interaction on settings pages
- [x] T022 [US4] Update `BottomNav` in `components/shell/bottom-nav.tsx` to detect active route using `usePathname()` — apply `border-t-2 border-t-primary` to the active bottom nav item
- [x] T023 [US4] Implement `Breadcrumb` client component in `components/shell/breadcrumb.tsx` — renders "Settings › [Sub-page]" on settings sub-pages using `usePathname()` to determine current section; uses `>` separator for LTR and `<` for RTL (or `›` which is direction-neutral)
- [x] T024 [US4] Integrate `Breadcrumb` into the dashboard layout or individual settings pages — render above `{children}` on routes matching `/settings/*` in `app/(dashboard)/settings/layout.tsx`

**Checkpoint**: All navigation states correctly highlighted. Breadcrumbs visible on nested pages. RTL indicator flips correctly.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final quality pass across all stories.

- [x] T025 [P] Add dark mode CSS variable overrides for sidebar, bottom nav, and role badge in `app/globals.css` or Tailwind config — verify all shell elements use semantic color tokens (not hardcoded hex) so dark mode applies automatically
- [x] T026 [P] Add `viewport-fit=cover` to the viewport meta tag in `app/layout.tsx` to enable `env(safe-area-inset-bottom)` on iOS Safari
- [x] T027 [P] Apply `rtl:scale-x-[-1]` class to directional icons (ChevronLeft, ChevronRight) in `AppSidebar` and `BottomNav` components for correct RTL icon mirroring
- [x] T028 Verify tablet breakpoint (768–1024px) — `AppSidebar` with `collapsible="icon"` should show icon-only at this size; test that shadcn Sidebar tooltip labels appear on hover; adjust breakpoint triggers if needed
- [x] T029 Run all 25 quickstart.md test scenarios manually — log results; fix any failing scenarios before marking feature complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1
- **US1 (Phase 3)**: Depends on Phase 2 — BLOCKS all other stories (shell must exist before role variants)
- **US2 (Phase 4)**: Depends on US1 being complete (extends AppSidebar with sub-nav)
- **US3 (Phase 5)**: Depends on US1 being complete (verifies filtering logic)
- **US4 (Phase 6)**: Depends on US1 being complete (adds active state to existing components)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US2, US3, US4** all extend components created in US1 — they are NOT independently parallelizable with US1
- **US2, US3, US4** CAN run in parallel with each other after US1 is complete (they touch different concerns)

### Parallel Opportunities Within US1

```bash
# After T005 (Sidebar installed), these can run in parallel:
Task T006: RoleBadge component
Task T007: UserMenu component  # depends on T006
Task T008: AppSidebar component
Task T009: BottomNav component

# T010 (layout.tsx) depends on T003, T004, T008, T009 all being complete
```

### Parallel Opportunities After US1

```bash
# US2, US3, US4 can start in parallel:
Developer A: T013–T016 (US2 — Admin full nav)
Developer B: T017–T019 (US3 — Supervisor billing gate)  
Developer C: T020–T024 (US4 — Active states + breadcrumbs)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T005)
3. Complete Phase 3: User Story 1 (T006–T012)
4. **STOP and VALIDATE**: Run quickstart.md US1 scenarios (1.1–1.5)
5. Shell is functional for Agents — deploy if ready

### Incremental Delivery

1. Setup + Foundational → Types and nav registry ready
2. US1 complete → All roles see basic shell; Agents fully covered
3. US2 complete → Admins have full nav with org switcher
4. US3 complete → Supervisor billing gate enforced
5. US4 complete → Wayfinding polished for all roles
6. Polish → Dark mode, safe area, icon mirroring, final QA

---

## Notes

- No tests generated (not requested in spec)
- All components must use Tailwind logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `border-s`, `border-e`) — never `ml-`, `mr-`, `left-`, `right-` in shell components
- `AppSidebar` and `BottomNav` are Client Components (`"use client"`) — they use `usePathname()`
- `app/(dashboard)/layout.tsx` is a Server Component — resolves role via `auth()` with no client-side flash
- Shadcn Sidebar requires `<SidebarProvider>` wrapper in the layout — include this in T010
- Total tasks: 29 (T001–T029)
