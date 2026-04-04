# Tasks: Agent Roles & Permissions

**Input**: Design documents from `/specs/002-agent-roles/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Organization**: Tasks grouped by user story (spec.md US1–US5) for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Clerk custom roles and schema additions needed before any story can be implemented.

- [x] T001 Configure Clerk custom roles `supervisor` and `agent` in Clerk Dashboard; set default member role to `org:agent` (Clerk Dashboard — no code file)
- [x] T002 Add `inviteLinks` table to `convex/schema.ts` with indexes `by_tenant` and `by_token`
- [x] T003 Run `npx convex dev` to push schema and regenerate TypeScript types

**Checkpoint**: Schema deployed, Clerk roles configured — user story work can begin.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core Convex helpers used by every story — role extraction, plan limit guard, last-admin guard.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Create `convex/lib/auth.ts` — export `getCallerRole(ctx): Promise<"org:admin" | "org:supervisor" | "org:agent">` helper that reads `orgRole` from Clerk JWT identity
- [x] T005 [P] Create `convex/lib/planLimits.ts` — export `assertAgentLimitNotReached(ctx, tenantId)` that fetches Clerk org membership count and compares to plan limits (Free: 2, Starter: 5, Growth: 15, Business: unlimited)
- [x] T006 [P] Create `convex/lib/lastAdmin.ts` — export `assertNotLastAdmin(ctx, tenantId, targetUserId)` that checks admin count via Clerk Backend SDK and throws `ConvexError("LAST_ADMIN")` if count would drop to 0

**Checkpoint**: Foundation helpers ready — all user stories can now begin independently.

---

## Phase 3: User Story 1 — Admin Invites Agent & Assigns Role (Priority: P1) 🎯 MVP

**Goal**: Admin can invite a new team member by email, have them accept, and see them appear in the team list with the correct role and permissions immediately active.

**Independent Test**: Admin invites via email → invitee accepts → invitee logs in → can only see own assigned conversations.

### Implementation

- [x] T007 [US1] Create `convex/orgMembers.ts` — implement `inviteByEmail` action: validate Admin role, call `assertAgentLimitNotReached`, call `clerkClient.organizations.createOrganizationInvitation({ emailAddress, role, redirectUrl: "/accept-invite" })`
- [x] T008 [US1] Add `list` query to `convex/orgMembers.ts` — return all org memberships for tenant (active + pending) via Clerk Backend SDK; require Admin or Supervisor role
- [x] T009 [US1] Add `changeRole` action to `convex/orgMembers.ts` — validate Admin, call `assertNotLastAdmin` when demoting admin, call `clerkClient.organizations.updateOrganizationMembership({ userId, role })`
- [x] T010 [US1] Add `removeMember` action to `convex/orgMembers.ts` — validate Admin, call `assertNotLastAdmin`, call Clerk delete membership, then call `conversations.unassignAll`
- [x] T011 [US1] Add `unassignAll` internal mutation to `convex/conversations.ts` — query all non-resolved conversations where `assignedAgentId === agentId`, patch each to `assignedAgentId = null`
- [x] T012 [US1] Create `app/accept-invite/page.tsx` — server component that confirms invite acceptance and redirects to `/inbox`
- [x] T013 [US1] Create `components/settings/team-member-list.tsx` — client component using `useQuery(api.orgMembers.list)`, renders member rows with name, email, role badge, and action menu (change role / remove); RTL-first layout with Cairo font
- [x] T014 [US1] Create `components/settings/role-select.tsx` — dropdown for Admin / Supervisor / Agent roles; labels in Arabic and English; `dir="ltr"` on select trigger value
- [x] T015 [US1] Create `components/settings/invite-modal.tsx` — dialog with three tabs: Email / WhatsApp / Link; Email tab contains email input + role selector + invite button
- [x] T016 [US1] Create `app/(dashboard)/settings/team/page.tsx` — server component; Admin/Supervisor guard; renders `<TeamMemberList />` and invite button that opens `<InviteModal />`

**Checkpoint**: Email invitation fully functional — admin can invite, invitee accepts, role enforced in inbox.

---

## Phase 4: User Story 2 — Admin Invites via WhatsApp (Priority: P2)

**Goal**: Admin enters phone number, invitee receives WhatsApp message with join link, clicks it, and joins as Agent.

**Independent Test**: Enter valid phone number → invite sent via WhatsApp → invitee joins via link → appears in team list as Agent.

### Implementation

- [x] T017 [US2] Add `inviteByWhatsApp` action to `convex/orgMembers.ts` — validate Admin, validate E.164 phone format, call `assertAgentLimitNotReached`, call `inviteLinks.getOrCreateActive` to get/create invite URL, call Meta Cloud API template message via tenant's connected channel; on failure throw `ConvexError("WHATSAPP_SEND_FAILED", { reason })`
- [x] T018 [US2] Add WhatsApp tab to `components/settings/invite-modal.tsx` — phone number input (`dir="ltr"`), role selector, send button; on `WHATSAPP_SEND_FAILED` error show inline error message with "Copy Link" fallback button

**Checkpoint**: WhatsApp invitation works end-to-end with graceful failure fallback.

---

## Phase 5: User Story 3 — Admin Generates Shareable Invite Link (Priority: P3)

**Goal**: Admin generates a 7-day link, shares it, anyone who opens it can join as Agent. Admin can revoke the link.

**Independent Test**: Generate link → open in incognito → create account → joined as Agent. Revoke → link shows "expired" message.

### Implementation

- [x] T019 [US3] Create `convex/inviteLinks.ts` — implement `generate` mutation: validate Admin, revoke all existing active links for tenant, create new doc with 64-char hex token and `expiresAt = now + 7 days`, return `{ token, expiresAt, url }`
- [x] T020 [US3] Add `revoke` mutation to `convex/inviteLinks.ts` — validate Admin, set `revoked: true` on active link
- [x] T021 [US3] Add `getActive` live query to `convex/inviteLinks.ts` — return active link doc (not expired, not revoked) or null
- [x] T022 [US3] Add `validateAndJoin` action to `convex/inviteLinks.ts` — look up token, validate not revoked and not expired (throw `ConvexError("INVITE_INVALID")` if either), call `assertAgentLimitNotReached`, call `clerkClient.organizations.createOrganizationMembership({ role: "org:agent" })`; handle `ALREADY_MEMBER` gracefully
- [x] T023 [US3] Create `app/join/[token]/page.tsx` — public page (no auth required to view); server component reads token param, calls read-only token validation; if invalid shows "Invite expired or invalid" UI; if valid shows org name and Clerk sign-up/sign-in component; post-auth calls `validateAndJoin` server action and redirects to `/inbox`
- [x] T024 [US3] Add Link tab to `components/settings/invite-modal.tsx` — shows active link URL with copy button and expiry date; Revoke button; Generate button when no active link exists; uses `useQuery(api.inviteLinks.getActive)` and `useMutation` for generate/revoke

**Checkpoint**: Shareable invite link fully functional including revocation and expiry.

---

## Phase 6: User Story 4 — Role-Based Access Control Enforced (Priority: P4)

**Goal**: Each role sees only what they're permitted. Enforcement at Convex data layer, not only UI.

**Independent Test**: Log in as Agent → cannot see other agents' conversations; as Supervisor → cannot access billing; as Admin → all actions succeed.

### Implementation

- [x] T025 [US4] Update `convex/conversations.ts` `listForCaller` query — use `getCallerRole` helper; Agent role filters by `assignedAgentId === callerId OR assignedAgentId === null`; Admin/Supervisor return all tenant conversations
- [x] T026 [US4] Update `convex/conversations.ts` `assign` mutation — call `getCallerRole`, throw `ConvexError("FORBIDDEN")` for Agent role (already defined in 001 contract — verify implementation matches)
- [x] T027 [P] [US4] Add role guard middleware to `app/(dashboard)/settings/` routes — redirect non-Admin users away from billing, channels, and team pages; Supervisor can access team page read-only
- [x] T028 [P] [US4] Update `components/inbox/conversation-list.tsx` — hide Assign button for Agent role; use Clerk `useOrganization` hook to get `orgRole` client-side for UI gating (data enforcement is in Convex)

**Checkpoint**: All role-based restrictions enforced at data layer and reflected in UI.

---

## Phase 7: User Story 5 — Assignment Mode Configuration (Priority: P5)

**Goal**: Admin sets assignment mode per channel (First Reply Wins / Manual / Round Robin). Round Robin available on Growth+ only.

**Independent Test**: Set channel to Manual → new conversation lands in Unassigned queue. Set to Round Robin on Free plan → blocked with upgrade prompt.

### Implementation

- [x] T029 [US5] Add `setAssignmentMode` mutation to `convex/channels.ts` — validate Admin role, validate Round Robin requires Growth/Business plan (throw `ConvexError("PLAN_REQUIRED", { requiredPlan: "growth" })` otherwise), patch `channel.assignmentMode`
- [x] T030 [US5] Add Round Robin assignment logic to `convex/http.ts` webhook action — when new conversation created on a `round_robin` channel: fetch active org members via Clerk SDK, sort by userId for determinism, assign to `members[roundRobinIndex % count].userId`, call `ctx.runMutation(api.channels.incrementRoundRobinIndex, { channelId })`
- [x] T031 [US5] Add `incrementRoundRobinIndex` internal mutation to `convex/channels.ts` — atomically increments `channel.roundRobinIndex`
- [x] T032 [US5] Create `components/settings/assignment-mode-select.tsx` — radio group for First Reply Wins / Manual / Round Robin; Round Robin option disabled with upgrade prompt tooltip when plan is Free or Starter; RTL-compatible layout
- [x] T033 [US5] Add assignment mode selector to channel settings page `app/(dashboard)/settings/channels/[channelId]/page.tsx` — renders `<AssignmentModeSelect />` with current mode; on change calls `setAssignmentMode` mutation

**Checkpoint**: All three assignment modes work. Round Robin plan gate enforced in Convex.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T034 [P] Add plan limit enforcement to `inviteLinks.validateAndJoin` — verify `assertAgentLimitNotReached` is called before creating membership (double-check shareable link path)
- [ ] T035 [P] Add RTL validation — open Settings → Team page in Arabic (`dir="rtl"`), verify member list, invite modal tabs, role dropdown, and link copy UI all render correctly; test Cairo font renders
- [ ] T036 [P] Add loading states to `components/settings/team-member-list.tsx` — skeleton rows while `orgMembers.list` query is loading
- [ ] T037 [P] Add error states to `components/settings/invite-modal.tsx` — handle `FORBIDDEN`, `PLAN_LIMIT_REACHED`, `ALREADY_MEMBER`, `WHATSAPP_SEND_FAILED`, `LAST_ADMIN` errors with user-facing Arabic + English messages
- [ ] T038 Run full quickstart.md E2E test checklist (35 scenarios) across all invite methods, role restrictions, assignment modes, and plan limits

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (schema deployed)
- **Phase 3–7 (User Stories)**: ALL depend on Phase 2 completion
  - US1 (email invite) → must complete before US2 (WhatsApp adds to same invite modal)
  - US3 (shareable link) → independent of US1/US2 after Phase 2
  - US4 (RBAC) → partially depends on US1 (role change UI), otherwise independent
  - US5 (assignment modes) → fully independent after Phase 2
- **Phase 8 (Polish)**: After all desired stories complete

### User Story Dependencies

| Story | Depends On | Can Parallelize With |
|-------|-----------|---------------------|
| US1 (email invite) | Phase 2 | US3, US5 |
| US2 (WhatsApp invite) | US1 (shares invite modal) | US3, US4, US5 |
| US3 (shareable link) | Phase 2 | US1, US4, US5 |
| US4 (RBAC) | Phase 2, partial US1 | US3, US5 |
| US5 (assignment modes) | Phase 2 | US1, US3, US4 |

---

## Parallel Opportunities

```text
# After Phase 2 completes, launch in parallel:
Task T007–T016: User Story 1 (email invite + team UI)
Task T019–T024: User Story 3 (shareable link — fully independent)
Task T029–T033: User Story 5 (assignment modes — fully independent)

# After T007–T009 complete (orgMembers actions exist):
Task T017–T018: User Story 2 (adds WhatsApp tab to existing modal)

# After T025–T026 complete (conversation visibility enforced):
Task T027–T028: User Story 4 UI gates (parallel with each other)
```

---

## Implementation Strategy

### MVP (User Story 1 Only)
1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T006)
3. Complete Phase 3: US1 email invite (T007–T016)
4. **STOP AND VALIDATE**: Admin can invite by email, invitee joins with correct role, Agent sees only own conversations
5. Ship — team can now grow beyond the founder

### Full Delivery Order (Priority Sequence)
1. Setup → Foundational → US1 → US2 → US3 → US4 → US5 → Polish
2. Each story adds value without breaking previous stories
3. US3 and US5 can be parallelized with US1/US2 if capacity allows

---

## Notes

- All Convex functions calling Clerk Backend SDK must be **actions** (not mutations) — SDK calls are async I/O
- Role checks use `getCallerRole` helper (T004) — never hardcode role strings in individual functions
- `conversations.unassignAll` (T011) is internal-only — never expose to client
- Round Robin sorts by `userId` for determinism across calls — critical for fair distribution
- Invite link `/join/[token]` page is public (no auth) — validate token server-side before showing any org info
