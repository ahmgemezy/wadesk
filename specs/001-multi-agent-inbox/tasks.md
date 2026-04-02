# Tasks: Multi-Agent Shared Inbox

**Input**: Design documents from `/specs/001-multi-agent-inbox/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Organization**: Tasks grouped by user story (spec.md US1–US5) for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5)

---

## Phase 1: Setup (Project Scaffold)

**Purpose**: Create the Next.js + Convex project and connect all services before any feature work begins.

- [ ] T001 Scaffold Next.js 15 project: `npx create-next-app@latest wadesk --typescript --tailwind --app` at repo root
- [ ] T002 Install core dependencies: `npm install convex @clerk/nextjs` then `npx shadcn@latest init` and add components: `button input textarea scroll-area resizable sheet dialog dropdown-menu badge`
- [ ] T003 Initialize Convex project: `npx convex dev` — follow prompts, copy `CONVEX_DEPLOYMENT` to `.env.local`
- [ ] T004 [P] Configure `.env.local` with all environment variables: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CONVEX_URL`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`
- [ ] T005 [P] Configure `next.config.ts` — no special settings needed beyond defaults for App Router
- [ ] T006 Create `app/layout.tsx` — root layout: wrap with `<ClerkProvider>` and `<ConvexProvider>`, set `<html lang="ar" dir="rtl">`, load Cairo font via `next/font/google` with `subsets: ["arabic", "latin"]`, apply font className to `<body>`

**Checkpoint**: Project scaffolded, services connected, RTL root layout live at `http://localhost:3000`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Convex schema, auth route guards, and Convex auth helper — must complete before any user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T007 Create `convex/schema.ts` — define all 5 tables (`channels`, `contacts`, `conversations`, `messages`, `quickReplies`) with all fields and indexes exactly as specified in `specs/001-multi-agent-inbox/data-model.md`
- [ ] T008 Run `npx convex dev` to push schema and verify TypeScript types generated in `convex/_generated/`
- [ ] T009 Create `convex/lib/auth.ts` — export `getCallerIdentity(ctx)` helper: calls `ctx.auth.getUserIdentity()`, throws `ConvexError("UNAUTHORIZED")` if null, returns `{ tenantId: identity.orgId, callerId: identity.subject, orgRole: identity.orgRole }`
- [ ] T010 Create `app/(auth)/sign-in/page.tsx` — Clerk `<SignIn>` component, centered layout, Cairo font
- [ ] T011 [P] Create `app/(auth)/sign-up/page.tsx` — Clerk `<SignUp>` component, centered layout, Cairo font
- [ ] T012 Create `app/(dashboard)/layout.tsx` — protected layout: use Clerk `auth()` to redirect unauthenticated users to `/sign-in`; wrap children in `<ConvexClientProvider>` if not already at root level

**Checkpoint**: Schema live, auth routes working, route guard protecting `/inbox` — user story work can begin.

---

## Phase 3: User Story 1 — Agent Views and Replies to Conversations (Priority: P1) 🎯 MVP

**Goal**: Agent logs in, sees assigned conversations in real time, opens one, reads messages, sends a WhatsApp reply.

**Independent Test**: Send a WhatsApp message to connected number → message appears in Unassigned queue within 3s → assign to self → reply → customer receives it on WhatsApp.

### Implementation

- [ ] T013 [US1] Create `convex/channels.ts` — implement `listForTenant` live query: requires `tenantId`, returns all channels for tenant
- [ ] T014 [US1] Create `convex/contacts.ts` — implement `upsertByPhone` internal mutation: find-or-create contact by `(tenantId, phone)` in E.164 format
- [ ] T015 [US1] Create `convex/conversations.ts` — implement `listForCaller` live query: extract role via `getCallerIdentity`; Agent role filters `by_tenant_agent` index with `assignedAgentId === callerId`; also returns `assignedAgentId === null` (Unassigned) via `by_tenant_agent` with null; Admin/Supervisor queries all via `by_tenant` index; order by `lastMessageAt` descending
- [ ] T016 [US1] Add `get` live query to `convex/conversations.ts` — returns single conversation by ID with role-check (Agent can only fetch if `assignedAgentId === callerId OR null`)
- [ ] T017 [US1] Create `convex/messages.ts` — implement `listForConversation` live query: requires conversation access check; returns all messages for conversationId ordered by `timestamp` ascending
- [ ] T018 [US1] Add `sendReply` mutation to `convex/messages.ts`: validate caller has access to conversation; create message doc (`direction: "outbound"`, `status: "sent"`, `isInternalNote: false`); update `conversation.lastMessageAt` and `lastMessagePreview`; if channel is `first_reply` and `assignedAgentId === null` → set `assignedAgentId = callerId`; schedule Meta Send Message API action
- [ ] T019 [US1] Create `convex/actions/sendWhatsAppMessage.ts` — Convex action (not mutation): calls Meta Cloud API `POST /messages` with `to: contact.phone`, `type: "text"`, `text.body: content` using channel's `accessToken` and `phoneNumberId`; updates `message.status` to `"delivered"` or `"failed"` based on response
- [ ] T020 [US1] Add `createInbound` internal mutation to `convex/messages.ts`: deduplicates by `metaMessageId`; calls `contacts.upsertByPhone`; finds or creates open conversation for `(tenantId, channelId, contactId)`; if conversation was `resolved` → set to `open`; creates message doc; updates `conversation.lastMessageAt`, `lastMessagePreview`, `unreadCount`
- [ ] T021 [US1] Create `convex/http.ts` — `httpAction` for `POST /meta/webhook`: verify HMAC-SHA256 signature using `META_APP_SECRET`; return 403 if invalid; implement `GET` handler for Meta verification handshake (`hub.challenge`); on valid inbound message: look up channel by `phoneNumberId`, call `ctx.runMutation(api.messages.createInbound, {...})`; on status update (delivered/read): update `message.status`; always return 200
- [ ] T022 [US1] Create `components/inbox/message-bubble.tsx` — client component: renders inbound (align start, grey bg), outbound (align end, green bg), and internal note (amber bg, "ملاحظة داخلية" / "Internal Note" label) variants; shows timestamp, delivery status icon for outbound; handles `dir` per message content (Arabic auto-detect)
- [ ] T023 [US1] Create `components/inbox/conversation-thread.tsx` — client component: `useQuery(api.messages.listForConversation, { conversationId })`; renders list of `<MessageBubble>`; auto-scrolls to bottom on new messages via `useEffect`; shows loading skeleton while query pending
- [ ] T024 [US1] Create `components/inbox/message-input.tsx` — client component: `<Textarea>` for reply; Send button; Cmd+Enter / Ctrl+Enter keyboard shortcut; calls `useMutation(api.messages.sendReply)`; clears input on success; shows error toast on failure; Quick Reply trigger button (wired in US5)
- [ ] T025 [US1] Create `components/inbox/conversation-list-item.tsx` — client component: shows contact name/phone, last message preview (truncated 60 chars), timestamp (relative), status badge, assigned agent chip; unread count badge; RTL layout
- [ ] T026 [US1] Create `components/inbox/conversation-list.tsx` — client component: `useQuery(api.conversations.listForCaller)`; renders list of `<ConversationListItem>`; highlights active conversation; shows "No conversations" empty state in Arabic and English; loading skeleton
- [ ] T027 [US1] Create `app/(dashboard)/inbox/page.tsx` — server component: `ResizablePanelGroup` with `ResizablePanel` (30% conversation list) + `ResizableHandle` + `ResizablePanel` (70% thread placeholder "Select a conversation"); renders `<ConversationList />`
- [ ] T028 [US1] Create `app/(dashboard)/inbox/[id]/page.tsx` — server component: renders `<ConversationThread conversationId={id} />` and `<MessageInput conversationId={id} />` in the right panel

**Checkpoint**: Full send/receive loop working — real WhatsApp message in → inbox shows it → reply sent → customer receives it.

---

## Phase 4: User Story 2 — Admin/Supervisor Assigns Conversations (Priority: P2)

**Goal**: Admin opens inbox, sees all conversations including Unassigned queue, assigns one to an agent, agent sees it immediately.

**Independent Test**: Create unassigned conversation, assign to Agent A via dialog → Agent A sees it in queue in real time. Reassign to Agent B → B sees it, A does not.

### Implementation

- [ ] T029 [US2] Add `assign` mutation to `convex/conversations.ts` — require Admin or Supervisor role via `getCallerIdentity`; throw `ConvexError("FORBIDDEN")` for Agent role; patch `conversation.assignedAgentId`; update `conversation.lastMessageAt` to trigger live query push
- [ ] T030 [US2] Create `components/inbox/assign-agent-dialog.tsx` — client component: Dialog triggered by "Assign" button; lists all org members fetched via Clerk `useOrganization().memberships`; shows current assignee; submit calls `useMutation(api.conversations.assign)`; "Unassign" option sets agentId to null; RTL-compatible layout
- [ ] T031 [US2] Update `components/inbox/conversation-list-item.tsx` — add Assign button visible only for Admin/Supervisor role (check `useOrganization().membership.role`); clicking opens `<AssignAgentDialog>`
- [ ] T032 [US2] Update `app/(dashboard)/inbox/page.tsx` — add channel filter tab bar above conversation list (one tab per channel + "All"); clicking a tab passes `channelId` filter to `listForCaller` query

**Checkpoint**: Admin can assign and reassign conversations; real-time updates propagate to all agents.

---

## Phase 5: User Story 3 — Agent Leaves Internal Note (Priority: P3)

**Goal**: Agent adds internal note; it appears inline in thread with distinct styling; never sent to customer.

**Independent Test**: Add internal note to a conversation → appears in thread for agent with amber background; customer's WhatsApp shows no new message.

### Implementation

- [ ] T033 [US3] Add `addInternalNote` mutation to `convex/messages.ts` — creates message doc with `isInternalNote: true`, `direction: "outbound"`, no Meta API call scheduled; updates `conversation.lastMessageAt`
- [ ] T034 [US3] Update `components/inbox/message-input.tsx` — add "Note" toggle button (pencil icon); when active, textarea background changes to amber tint, placeholder text changes to "اكتب ملاحظة داخلية..." / "Add internal note..."; submit calls `addInternalNote` instead of `sendReply`

**Checkpoint**: Internal notes appear inline with visual distinction; confirmed not sent to customer.

---

## Phase 6: User Story 4 — Agent Changes Conversation Status (Priority: P4)

**Goal**: Agent marks conversation Open / Pending / Resolved. Resolved conversations leave active inbox. Customer reply auto-reopens resolved conversation.

**Independent Test**: Mark conversation Resolved → leaves active inbox view. Customer sends message → conversation reappears as Open.

### Implementation

- [ ] T035 [US4] Add `setStatus` mutation to `convex/conversations.ts` — any authenticated agent with access to the conversation can call; validate status value is one of `"open" | "pending" | "resolved"`; patch `conversation.status`
- [ ] T036 [US4] Create `components/inbox/status-selector.tsx` — client component: dropdown with Open / Pending / Resolved options with Arabic labels (مفتوح / معلق / مغلق) and English; current status shown; calls `useMutation(api.conversations.setStatus)` on change
- [ ] T037 [US4] Update `app/(dashboard)/inbox/[id]/page.tsx` — render `<StatusSelector conversationId={id} />` in conversation header bar
- [ ] T038 [US4] Update `convex/conversations.ts` `listForCaller` query — add optional `status` filter param; default shows only `"open"` and `"pending"` (exclude resolved from active view unless explicitly requested)
- [ ] T039 [US4] Update `components/inbox/conversation-list.tsx` — add status filter tabs: All Active / Open / Pending / Resolved; passes selected status to `listForCaller` query

**Checkpoint**: Status management works end-to-end; resolved conversations leave active inbox; auto-reopen on new inbound message (handled in `createInbound` mutation from T020).

---

## Phase 7: User Story 5 — Agent Uses Quick Reply (Priority: P5)

**Goal**: Agent opens quick reply panel, selects a saved reply, it populates the reply box for optional editing before sending.

**Independent Test**: Create quick reply → open conversation → click quick reply trigger → select reply → reply box populated → send → customer receives as normal message.

### Implementation

- [ ] T040 [US5] Create `convex/quickReplies.ts` — implement `list` live query (filter by `tenantId`, optional `category` param), `create` mutation (Admin/Supervisor only), `update` mutation (Admin/Supervisor only), `remove` mutation (Admin/Supervisor only)
- [ ] T041 [US5] Create `components/inbox/quick-reply-panel.tsx` — client component: Sheet slide-in panel; `useQuery(api.quickReplies.list)`; search input filters by title/body; groups by category; clicking a reply calls `onSelect(body)` callback; supports Arabic text in both title and body; RTL layout
- [ ] T042 [US5] Update `components/inbox/message-input.tsx` — wire quick reply trigger button to open `<QuickReplyPanel>`; `onSelect` handler sets textarea value to selected reply body (editable before send)
- [ ] T043 [US5] Create `app/(dashboard)/settings/quick-replies/page.tsx` — server component (Admin/Supervisor guard); renders table of all quick replies with edit/delete actions; "Add Quick Reply" button opens inline form; uses `useMutation` for create/update/remove; supports Arabic titles and bodies

**Checkpoint**: Quick replies fully functional — create, browse, select, edit, send.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T044 [P] Verify RTL layout across all components — open inbox in Arabic (`dir="rtl"`): conversation list on right, thread on left, chevrons flipped, message bubbles aligned correctly, Cairo font rendering; run quickstart.md step 9 verification
- [ ] T045 [P] Add loading skeletons to `components/inbox/conversation-list.tsx` and `components/inbox/conversation-thread.tsx` — display skeleton rows while Convex queries are in `isLoading` state
- [ ] T046 [P] Add error states — `components/inbox/message-input.tsx` shows toast on `sendReply` failure; `components/inbox/conversation-thread.tsx` shows retry UI if `listForConversation` errors
- [ ] T047 [P] Add unsupported message type display in `components/inbox/message-bubble.tsx` — when `message.type === "unsupported"` render "[رسالة غير مدعومة]" / "[Unsupported message type]" placeholder with an icon
- [ ] T048 [P] Add unread count badge to `components/inbox/conversation-list-item.tsx` — show count when `unreadCount > 0`; clear `unreadCount` via Convex mutation when conversation is opened
- [ ] T049 Run full quickstart.md E2E test checklist (10 items): inbound message → queue; assign; reply; internal note; resolve; re-open; quick reply; RTL Arabic; LTR English

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 complete (project exists)
- **Phase 3–7 (User Stories)**: ALL depend on Phase 2 complete
  - US1 must complete before US2, US3, US4 (they extend US1 components)
  - US5 (quick replies) fully independent after Phase 2 — can run parallel with US1
- **Phase 8 (Polish)**: After all desired stories complete

### User Story Dependencies

| Story | Depends On | Can Parallelize With |
|-------|-----------|---------------------|
| US1 (view + reply) | Phase 2 | US5 (quick replies) |
| US2 (assign) | US1 (extends conversation-list-item, conversations.ts) | US5 |
| US3 (internal notes) | US1 (extends message-input.tsx, messages.ts) | US2, US5 |
| US4 (status) | US1 (extends conversations.ts, inbox layout) | US2, US3, US5 |
| US5 (quick replies) | Phase 2 only | US1, US2, US3, US4 |

### Within Each Story

- Convex backend functions before UI components
- `messages.ts` functions before message-bubble / thread components
- `conversations.ts` functions before conversation-list components
- Components before page files that compose them

---

## Parallel Opportunities

```text
# Phase 2: run in parallel after T007/T008 (schema deployed):
T009 convex/lib/auth.ts
T010/T011 sign-in and sign-up pages

# Phase 3 (US1): run in parallel after T009 (auth helper ready):
T013 convex/channels.ts      ← independent
T014 convex/contacts.ts      ← independent
T019 convex/actions/sendWhatsAppMessage.ts  ← independent

# Phase 3 (US1): run in parallel after T017/T018 (messages queries ready):
T022 message-bubble.tsx
T025 conversation-list-item.tsx

# After Phase 2 (independently of US1):
T040 convex/quickReplies.ts  ← US5 backend
T041 quick-reply-panel.tsx   ← US5 UI (after T040)
```

---

## Implementation Strategy

### MVP (User Story 1 Only — T001–T028)
1. Complete Phase 1: Setup (T001–T006)
2. Complete Phase 2: Foundational (T007–T012)
3. Complete Phase 3: US1 (T013–T028)
4. **STOP AND VALIDATE**: Send real WhatsApp message → appears in inbox → reply sent → customer receives it
5. Ship — product is usable for a single-agent workflow

### Incremental Delivery
1. US1 → working inbox with real WhatsApp (MVP)
2. US2 → multi-agent assignment (team workflow)
3. US3 + US4 → notes + status (inbox hygiene)
4. US5 → quick replies (efficiency)
5. Polish → RTL verification + error states

### Parallel Team Strategy (if two developers)
- Dev A: US1 Convex backend (T013–T021) + webhook (T021)
- Dev B: US1 UI components (T022–T028) + US5 backend (T040)
- Merge when US1 backend complete

---

## Notes

- All Convex mutations that call external APIs (Meta) must be **actions**, not mutations — actions can perform async I/O
- `messages.createInbound` is internal-only — never register it as callable from client
- `convex/http.ts` must always return `200 OK` to Meta even on processing errors (Meta retries on non-200)
- `dir` on message bubbles: use CSS `text-align: start` and let browser auto-detect bidi — don't hardcode per message
- Phase 2 T007 is the highest-risk task — schema mistakes require a migration or table drop; review data-model.md carefully before running `npx convex dev`
