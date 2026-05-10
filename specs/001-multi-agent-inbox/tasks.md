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

- [x] T001 Scaffold Next.js 15 project: `npx create-next-app@latest wabdesk --typescript --tailwind --app` at repo root
- [x] T002 Install core dependencies: `npm install convex @clerk/nextjs` then `npx shadcn@latest init` and add components: `button input textarea scroll-area resizable sheet dialog dropdown-menu badge`
- [x] T003 Initialize Convex project: `npx convex dev` — follow prompts, copy `CONVEX_DEPLOYMENT` to `.env.local`
- [x] T004 [P] Configure `.env.local` with all environment variables: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CONVEX_URL`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`
- [x] T005 [P] Configure `next.config.ts` — no special settings needed beyond defaults for App Router
- [x] T006 Create `app/layout.tsx` — root layout: wrap with `<ClerkProvider>` and `<ConvexProvider>`, set `<html lang="ar" dir="rtl">`, load Cairo font via `next/font/google` with `subsets: ["arabic", "latin"]`, apply font className to `<body>`

**Checkpoint**: Project scaffolded, services connected, RTL root layout live at `http://localhost:3000`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Convex schema, auth route guards, and Convex auth helper — must complete before any user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T007 Create `convex/schema.ts` — define all 5 tables (`channels`, `contacts`, `conversations`, `messages`, `quickReplies`) with all fields and indexes exactly as specified in `specs/001-multi-agent-inbox/data-model.md`
- [x] T008 Run `npx convex dev` to push schema and verify TypeScript types generated in `convex/_generated/`
- [x] T009 Create `convex/lib/auth.ts` — export `getCallerIdentity(ctx)` helper: calls `ctx.auth.getUserIdentity()`, throws `ConvexError("UNAUTHORIZED")` if null, returns `{ tenantId: identity.orgId, callerId: identity.subject, orgRole: identity.orgRole }`
- [x] T010 Create `app/(auth)/sign-in/page.tsx` — Clerk `<SignIn>` component, centered layout, Cairo font
- [x] T011 [P] Create `app/(auth)/sign-up/page.tsx` — Clerk `<SignUp>` component, centered layout, Cairo font
- [x] T012 Create `app/(dashboard)/layout.tsx` — protected layout: use Clerk `auth()` to redirect unauthenticated users to `/sign-in`; wrap children in `<ConvexClientProvider>` if not already at root level

**Checkpoint**: Schema live, auth routes working, route guard protecting `/inbox` — user story work can begin.

---

## Phase 3: User Story 1 — Agent Views and Replies to Conversations (Priority: P1) 🎯 MVP

**Goal**: Agent logs in, sees assigned conversations in real time, opens one, reads messages, sends a WhatsApp reply.

**Independent Test**: Send a WhatsApp message to connected number → message appears in Unassigned queue within 3s → assign to self → reply → customer receives it on WhatsApp.

### Implementation

- [x] T013 [US1] Create `convex/channels.ts` — implement `listForTenant` live query: requires `tenantId`, returns all channels for tenant
- [x] T014 [US1] Create `convex/contacts.ts` — implement `upsertByPhone` internal mutation: find-or-create contact by `(tenantId, phone)` in E.164 format
- [x] T015 [US1] Create `convex/conversations.ts` — implement `listForCaller` live query: extract role via `getCallerIdentity`; Agent role filters `by_tenant_agent` index with `assignedAgentId === callerId`; also returns `assignedAgentId === null` (Unassigned) via `by_tenant_agent` with null; Admin/Supervisor queries all via `by_tenant` index; order by `lastMessageAt` descending
- [x] T016 [US1] Add `get` live query to `convex/conversations.ts` — returns single conversation by ID with role-check (Agent can only fetch if `assignedAgentId === callerId OR null`)
- [x] T017 [US1] Create `convex/messages.ts` — implement `listForConversation` live query: requires conversation access check; returns all messages for conversationId ordered by `timestamp` ascending
- [x] T018 [US1] Add `sendReply` mutation to `convex/messages.ts`: validate caller has access to conversation; create message doc (`direction: "outbound"`, `status: "sent"`, `isInternalNote: false`); update `conversation.lastMessageAt` and `lastMessagePreview`; if channel is `first_reply` and `assignedAgentId === null` → set `assignedAgentId = callerId`; schedule Meta Send Message API action
- [x] T019 [US1] Create `convex/actions/sendWhatsAppMessage.ts` — Convex action (not mutation): calls Meta Cloud API `POST /messages` with `to: contact.phone`, `type: "text"`, `text.body: content` using channel's `accessToken` and `phoneNumberId`; updates `message.status` to `"delivered"` or `"failed"` based on response
- [x] T020 [US1] Add `createInbound` internal mutation to `convex/messages.ts`: deduplicates by `metaMessageId`; calls `contacts.upsertByPhone`; finds or creates open conversation for `(tenantId, channelId, contactId)`; if conversation was `resolved` → set to `open`; creates message doc; updates `conversation.lastMessageAt`, `lastMessagePreview`, `unreadCount`
- [x] T021 [US1] Create `convex/http.ts` — `httpAction` for `POST /meta/webhook`: verify HMAC-SHA256 signature using `META_APP_SECRET`; return 403 if invalid; implement `GET` handler for Meta verification handshake (`hub.challenge`); on valid inbound message: look up channel by `phoneNumberId`, call `ctx.runMutation(api.messages.createInbound, {...})`; on status update (delivered/read): update `message.status`; always return 200
- [x] T022 [US1] Create `components/inbox/message-bubble.tsx` — client component: renders inbound (align start, grey bg), outbound (align end, green bg), and internal note (amber bg, "ملاحظة داخلية" / "Internal Note" label) variants; shows timestamp, delivery status icon for outbound; handles `dir` per message content (Arabic auto-detect)
- [x] T023 [US1] Create `components/inbox/conversation-thread.tsx` — client component: `useQuery(api.messages.listForConversation, { conversationId })`; renders list of `<MessageBubble>`; auto-scrolls to bottom on new messages via `useEffect`; shows loading skeleton while query pending
- [x] T024 [US1] Create `components/inbox/message-input.tsx` — client component: `<Textarea>` for reply; Send button; Cmd+Enter / Ctrl+Enter keyboard shortcut; calls `useMutation(api.messages.sendReply)`; clears input on success; shows error toast on failure; Quick Reply trigger button (wired in US5)
- [x] T025 [US1] Create `components/inbox/conversation-list-item.tsx` — client component: shows contact name/phone, last message preview (truncated 60 chars), timestamp (relative), status badge, assigned agent chip; unread count badge; RTL layout
- [x] T026 [US1] Create `components/inbox/conversation-list.tsx` — client component: `useQuery(api.conversations.listForCaller)`; renders list of `<ConversationListItem>`; highlights active conversation; shows "No conversations" empty state in Arabic and English; loading skeleton
- [x] T027 [US1] Create `app/(dashboard)/inbox/page.tsx` — server component: `ResizablePanelGroup` with `ResizablePanel` (30% conversation list) + `ResizableHandle` + `ResizablePanel` (70% thread placeholder "Select a conversation"); renders `<ConversationList />`
- [x] T028 [US1] Create `app/(dashboard)/inbox/[id]/page.tsx` — server component: renders `<ConversationThread conversationId={id} />` and `<MessageInput conversationId={id} />` in the right panel

**Checkpoint**: Full send/receive loop working — real WhatsApp message in → inbox shows it → reply sent → customer receives it.

---

## Phase 4: User Story 2 — Admin/Supervisor Assigns Conversations (Priority: P2)

**Goal**: Admin opens inbox, sees all conversations including Unassigned queue, assigns one to an agent, agent sees it immediately.

**Independent Test**: Create unassigned conversation, assign to Agent A via dialog → Agent A sees it in queue in real time. Reassign to Agent B → B sees it, A does not.

### Implementation

- [x] T029 [US2] Add `assign` mutation to `convex/conversations.ts` — require Admin or Supervisor role via `getCallerIdentity`; throw `ConvexError("FORBIDDEN")` for Agent role; patch `conversation.assignedAgentId`; update `conversation.lastMessageAt` to trigger live query push
- [x] T030 [US2] Create `components/inbox/assign-agent-dialog.tsx` — client component: Dialog triggered by "Assign" button; lists all org members fetched via Clerk `useOrganization().memberships`; shows current assignee; submit calls `useMutation(api.conversations.assign)`; "Unassign" option sets agentId to null; RTL-compatible layout
- [x] T031 [US2] Update `components/inbox/conversation-list-item.tsx` -- show assign button visible only for admin/supervisor role (check `useOrganization().membership.role`)
- [x] T032 [US2] Update `app/(dashboard)/inbox/page.tsx` — pass `onAssignClick` from ConversationList and use it `onAssignClick` prop to + assign `conversationId` to `AssignAgentDialog`
- [x] T038 [US2] Update `convex/conversations.ts` `listForCaller` query — add optional `status` filter param (already exists)
- [x] T039 [US2] Update `components/inbox/conversation-list.tsx` — add status filter tabs: All Active / Open / Pending / Resolved; passes selected status to `listForCaller` query (already exists)
- [x] T045 [P] Add loading skeletons — already exist in both `conversation-list.tsx` and `conversation-thread.tsx` — display skeleton rows while Convex queries are in `isLoading` state (already exist)
- [x] T046 [P] add error states — `message-input` toast + conversation-thread retry UI (already exist)
- [x] T047 [P] add unsupported message type display — already exists in `message-bubble.tsx` (already handled)
- [x] T048 [P] add unread count badge + `clearUnread` mutation when conversation is opened

- [x] T044: RTL layout verification — audit at build time

- [x] T049: E2E test checklist

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
