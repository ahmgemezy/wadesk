# Tasks: Contact Management

**Input**: Design documents from `/specs/005-contact-management/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/convex-api.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Read Convex guidelines and create component directory before writing any code.

- [x] T001 Read `convex/_generated/ai/guidelines.md` to confirm correct Convex patterns before writing any Convex code
- [x] T002 Create `components/contacts/` directory structure (empty — populated in later phases) per implementation plan

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema additions and role fix that all user story phases depend on. MUST be complete before any user story work.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Add `isArchived: v.boolean()` field to `contacts` table in `convex/schema.ts` — also add `.index("by_tenant_archived", ["tenantId", "isArchived"])` and `.searchIndex("search_by_name", { searchField: "displayName", filterFields: ["tenantId"] })`
- [x] T004 Add `customFields` table to `convex/schema.ts` — fields: `tenantId: v.string()`, `contactId: v.id("contacts")`, `key: v.string()`, `value: v.string()`, `createdAt: v.number()` with `.index("by_contact", ["contactId"])` and `.index("by_tenant", ["tenantId"])`
- [x] T005 Update `app/(dashboard)/contacts/layout.tsx` — change minimum role check from `"supervisor"` to `"agent"` so agents can access the contacts section per FR-005

**Checkpoint**: Schema deploys cleanly with new fields/indexes. `/contacts` is accessible to agents. Foundation ready.

---

## Phase 3: User Story 1 — Agent Views Contact Profile in Inbox (Priority: P1) 🎯 MVP

**Goal**: Agent opens a conversation and sees the customer's contact panel (name, phone, tags, notes, custom fields, conversation count). Can edit name, tags, notes, and custom fields inline. Changes persist in real-time and are visible to all agents.

**Independent Test**: Open any conversation → verify contact panel renders on the side with customer name, phone, tags, and notes → edit display name → open same conversation as another agent → confirm updated name is visible.

### Implementation for User Story 1

- [x] T006 [US1] Add `getById` query to `convex/contacts.ts` — args: `{ contactId: v.id("contacts") }`; validates `contact.tenantId === callerTenantId` via `getCallerIdentity(ctx)`; returns `{ contact: Doc<"contacts"> | null, conversationCount: number }`; conversationCount = count of conversations matching this contact's phone
- [x] T007 [US1] Add `update` mutation to `convex/contacts.ts` — args: `{ contactId, customName?, tags?, notes?, assignedAgentId? }`; validates tenantId match; patches only provided fields; roles: all authenticated
- [x] T008 [P] [US1] Create `convex/customFields.ts` — implement three exports: `list` query (args: `{ contactId }`; validates contact belongs to caller's tenant; returns `Doc<"customFields">[]`), `upsert` mutation (args: `{ contactId, key, value }`; if same contactId+key exists update value else insert; roles: all authenticated), `delete` mutation (args: `{ customFieldId }`; validates tenantId via parent contact; roles: all authenticated)
- [x] T009 [US1] Create `components/contacts/contact-panel.tsx` — client component (`"use client"`); props: `{ contactId: Id<"contacts"> }`; reads data via `useQuery(api.contacts.getById)` and `useQuery(api.customFields.list)`; displays: `customName ?? displayName`, phone (`dir="ltr"`), tags (as chips), notes (textarea), conversation count, custom fields (key-value pairs); inline edit mode for customName/tags/notes via `useMutation(api.contacts.update)`; custom fields add/edit/delete via `api.customFields.upsert` and `api.customFields.delete`; loading skeleton; error state "لم يتم العثور على جهة الاتصال"; full RTL support with Cairo font
- [x] T010 [US1] Add `<ContactPanel>` to conversation thread in `app/(dashboard)/inbox/page.tsx` (or the conversation detail component) — renders on the right side of the conversation view; passes the `contactId` from the active conversation's contact

**Checkpoint**: Contact panel visible in inbox. Agents can view and edit contact fields. Changes appear in real-time across sessions.

---

## Phase 4: User Story 2 — Agent Searches for a Contact (Priority: P2)

**Goal**: Dedicated `/contacts` page with a searchable, paginated contact list. Clicking a contact opens a full-profile sheet with conversation history, all fields, and custom fields. Empty search state shows "Add Contact" option.

**Independent Test**: Navigate to `/contacts` → search by phone number → click result → verify full profile sheet opens with conversation history and notes visible.

### Implementation for User Story 2

- [x] T011 [US2] Add `search` query to `convex/contacts.ts` — args: `{ query: v.string(), includeArchived?: v.boolean(), paginationOpts: paginationOptsValidator }`; if query starts with `+` or digit use `by_tenant_phone` index with prefix filter; otherwise use `.withSearchIndex("search_by_name", q => q.search("displayName", query).eq("tenantId", tenantId))`; returns `PaginationResult<Doc<"contacts">>`; roles: all authenticated
- [x] T012 [US2] Update `listForTenant` query in `convex/contacts.ts` — add `includeArchived?: v.optional(v.boolean())` arg (default false) filtering on `by_tenant_archived` index; add `paginationOpts: paginationOptsValidator`; returns `PaginationResult<Doc<"contacts">>`
- [x] T013 [P] [US2] Create `components/contacts/contact-detail-sheet.tsx` — client component; props: `{ contactId: Id<"contacts">, open: boolean, onOpenChange: (open: boolean) => void }`; uses `useQuery(api.contacts.getById)` and `useQuery(api.customFields.list)`; renders full contact profile: all fields editable inline (same as ContactPanel) plus conversation history list in reverse chronological order; archive/unarchive button visible to supervisor/admin only
- [x] T014 [P] [US2] Create `components/contacts/contact-list.tsx` — client component; uses `usePaginatedQuery(api.contacts.listForTenant)` and `usePaginatedQuery(api.contacts.search)` when search is active; renders searchable table with columns: name, phone, tags, last seen; "Add Contact" button (hidden for agents); "Import CSV" button (hidden for agents); archived toggle; row click opens `<ContactDetailSheet>`; empty state: "لا توجد جهات اتصال" with Add Contact CTA; full RTL
- [x] T015 [US2] Implement `app/(dashboard)/contacts/page.tsx` — server component that renders `<ContactList />`; page title: "جهات الاتصال" / "Contacts"

**Checkpoint**: `/contacts` page functional. Search by name and phone works. Contact detail sheet shows full profile and history. Pagination works.

---

## Phase 5: User Story 3 — Admin Adds a Contact Manually (Priority: P3)

**Goal**: Admin/supervisor can add a new contact manually via a dialog. Duplicate phone detection with link to existing contact. Manual contacts appear in search immediately.

**Independent Test**: Click "Add Contact" → enter phone + name → save → search for the new contact → verify they appear → attempt to add the same phone again → verify duplicate warning shown.

### Implementation for User Story 3

- [ ] T016 [US3] Add `create` mutation to `convex/contacts.ts` — args: `{ phone: v.string(), customName?: v.string(), tags?: v.array(v.string()), notes?: v.string() }`; validates phone is E.164 format; checks `by_tenant_phone` index for duplicate — if exists return `{ error: "duplicate", existingId: Id<"contacts"> }`; else insert with `source: "manual"`, `isArchived: false`, `createdAt: Date.now()`; roles: supervisor, admin (enforce via `assertAdminOrSupervisor`)
- [ ] T017 [US3] Create `components/contacts/add-contact-dialog.tsx` — client component; props: `{ open: boolean, onOpenChange: (open: boolean) => void, onSuccess?: (contactId: Id<"contacts">) => void }`; phone field with `dir="ltr"` and client-side E.164 normalization via `libphonenumber-js` before calling mutation; duplicate warning shows link to existing contact; name, tags (comma-separated input), notes fields; submit calls `useMutation(api.contacts.create)`; Arabic labels: "رقم الهاتف", "الاسم", "الوسوم", "ملاحظات", "إضافة جهة اتصال"
- [ ] T018 [US3] Wire `<AddContactDialog>` into `<ContactList>` in `components/contacts/contact-list.tsx` — "Add Contact" button opens dialog; on success refresh list and open `<ContactDetailSheet>` for the new contact

**Checkpoint**: Manual add flow works end-to-end. Duplicate detection works. New contacts searchable immediately.

---

## Phase 6: User Story 4 — Admin Imports Contacts from CSV (Priority: P4)

**Goal**: Admin uploads CSV, sees preview with duplicate count, chooses skip/overwrite, imports up to 10,000 contacts, sees summary. Invalid phone rows skipped and listed.

**Independent Test**: Upload CSV with 10 valid + 2 invalid phone numbers → review preview (shows duplicate count) → confirm → verify summary shows correct counts → re-upload same file → duplicate handling works correctly.

### Implementation for User Story 4

- [x] T019 [US4] Add `importBatch` action to `convex/contacts.ts`
 — args: `{ contactId } v.id("contacts") }
      return null;
    }

    return contactId;
 — args: `{ rows: v.array(v.object({ phone: v.string(), name?: v.string(), tags?: v.array(v.string()), notes?: v.string() })), onDuplicate: v.union(v.literal("skip"), v.literal("overwrite")) }`; validates max 10,000 rows; calls `getCallerIdentity(ctx)` to enforce supervisor/admin role; for each row: check `by_tenant_phone` index for duplicate → if skip mode skip it → if overwrite mode patch existing; insert new with `source: "import"`, `isArchived: false`; returns `{ added: number, skipped: number, failed: number, failedRows: Array<{ row: number, reason: string }> }`
- [ ] T020 [US4] Create `components/contacts/csv-import-dialog.tsx` — client component; multi-step: (1) Upload — drag-and-drop or file picker, parse with `papaparse`, enforce 10,000 row limit client-side before calling action; (2) Preview — table of first 10 rows + stats: total rows, duplicate count (pre-check via `api.contacts.search` for phones); (3) Options — "Skip duplicates" / "Overwrite duplicates" radio; (4) Import — calls `api.contacts.importBatch` action with spinner; (5) Summary — "X مضاف، Y مكرر تم تخطيه، Z فاشل" with failed rows list; all Arabic labels; full RTL
- [ ] T021 [US4] Wire `<CsvImportDialog>` into `<ContactList>` in `components/contacts/contact-list.tsx` — "Import CSV" button opens dialog; on summary step completion refresh contact list

**Checkpoint**: CSV import flow works end-to-end. Duplicates handled. Import summary accurate. Invalid rows listed.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Archive feature, RTL quality, dark mode, loading/error states.

- [ ] T022 Add `archive` mutation to `convex/contacts.ts` — args: `{ contactId: v.id("contacts"), archive: v.boolean() }`; sets `isArchived` to arg value; roles: supervisor, admin (assertAdminOrSupervisor)
- [ ] T023 [P] Add archive/unarchive button to `components/contacts/contact-detail-sheet.tsx` and `components/contacts/contact-panel.tsx` — visible only to supervisor/admin role; calls `useMutation(api.contacts.archive)`; Arabic labels: "أرشفة" / "إلغاء الأرشفة"
- [ ] T024 [P] Verify all contacts components use Tailwind logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) — no `ml-`, `mr-`, `left-`, `right-` values in any `components/contacts/*.tsx` file; check phone fields have `dir="ltr"` inside RTL container
- [ ] T025 [P] Verify dark mode — all contacts components use semantic color tokens (`bg-background`, `text-foreground`, `border-border`) not hardcoded colors; test list, panel, dialogs in dark mode
- [ ] T026 Manually test all 4 user stories end-to-end per acceptance scenarios in `spec.md` — verify contact panel shows in inbox (US1), search returns correct results (US2), manual add detects duplicates (US3), CSV import summary is accurate (US4); fix any failing scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T001–T002 done)
- **US1 (Phase 3)**: Depends on Phase 2 — blocking for US2, US3, US4
- **US2 (Phase 4)**: Depends on US1 complete (ContactPanel pattern established; search/list infrastructure needed)
- **US3 (Phase 5)**: Depends on US2 complete (wires into ContactList)
- **US4 (Phase 6)**: Depends on US2 complete (wires into ContactList); US3 and US4 can run in parallel
- **Polish (Phase 7)**: Depends on all user stories being complete

### Parallel Opportunities Within US1

```bash
# After T005 (schema + role fix complete), these can run in parallel:
Task T006: getById query          # convex/contacts.ts
Task T007: update mutation        # convex/contacts.ts (can be in same file sequentially)
Task T008: convex/customFields.ts # independent file

# T009 (ContactPanel) depends on T006, T007, T008 all being complete
# T010 (inbox integration) depends on T009
```

### Parallel Opportunities After US2

```bash
# US3 and US4 can start in parallel after US2:
Developer A: T016–T018 (US3 — manual add)
Developer B: T019–T021 (US4 — CSV import)

# Both wire into ContactList (T014), which must be complete first
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T005)
3. Complete Phase 3: User Story 1 (T006–T010)
4. **STOP and VALIDATE**: Agents can see and edit contact profiles in the inbox — core value delivered
5. Deploy if working — US2–US4 are additive, not blocking

### Incremental Delivery

1. Setup + Foundational → Schema deployed, role fix applied
2. US1 complete → Contact panel in inbox; agents see customer context during conversations
3. US2 complete → Dedicated contacts page; agents can search by name/phone; detail sheet with full history
4. US3 complete → Admins can add contacts manually before first message
5. US4 complete → Bulk CSV import for migrating existing customer lists
6. Polish → Archive, RTL quality pass, dark mode, final QA

---

## Notes

- No tests generated (not requested in spec)
- All components must use `dir="rtl"` container — never apply RTL only to individual elements; phone fields use `dir="ltr"` inside RTL containers
- `libphonenumber-js` phone normalization happens client-side before calling any Convex mutation
- `papaparse` CSV parsing happens client-side; action receives pre-parsed rows array (never raw file)
- Custom field uniqueness (`contactId + key`) enforced in `customFields.upsert` — check before insert
- Archive blocks deletion but archive itself requires no conversation count check — archiving is always allowed
- `components/contacts/*.tsx` are Client Components (`"use client"`) — use `useQuery`, `useMutation`, `usePaginatedQuery`
- `app/(dashboard)/contacts/page.tsx` is a Server Component — renders client components
- Total tasks: 26 (T001–T026)
