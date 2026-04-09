# WaDesk — Build Progress

> Updated after each major task. Never modify CLAUDE.md unless explicitly asked.

---

## Completed

### CLAUDE.md — Roles & Permissions Section
- **Status:** Done
- **What was built:** Added `## 25. Roles & Permissions` to CLAUDE.md — full permissions matrix (Admin / Supervisor / Agent), role rules, and server-side enforcement notes
- **Files modified:** `CLAUDE.md`

---

### 002 — Agent Roles
- **Status:** Done
- **What was built:** Agent roles and permissions system (Admin / Supervisor / Agent)
- **Branch:** `002-agent-roles`

---

### 003 — (Completed)
- **Status:** Done
- **Branch:** merged

---

### 004 — Multi-Tenant Onboarding
- **Status:** Done
- **What was built:** Onboarding flow (Clerk org creation → WhatsApp connect → test message → invite agent)
- **Key additions:**
  - `onboardingState` table in Convex schema
  - `fetchQuery` from `convex/nextjs` for server-side RSC reads

---

### 005 — Contact Management
- **Status:** Done
- **What was built:** Contacts CRM-lite (auto-capture, manual input, CSV import, tags, custom fields)
- **Key additions:**
  - `customFields` table in Convex
  - `libphonenumber-js` for phone normalization
  - `papaparse` for client-side CSV parsing
- **Auth fixes included**

---

### 006 — Basic Analytics
- **Status:** Done
- **What was built:** Analytics dashboard (conversation volume, response time, agent performance)
- **Key additions:**
  - `conversationMetrics` denormalized read-model table in Convex
  - Recharts via shadcn/ui chart component
  - `ctx.scheduler.runAfter` pattern for async internalMutation triggers

---

### 007 — Marketing Site
- **Status:** Done
- **What was built:** Public marketing site (landing page, pricing, features)
- **Branch:** `007-marketing-site` (merged into `002-agent-roles`)
- **Key additions:**
  - Next.js 15 App Router public routes
  - shadcn/ui + Tailwind CSS v4
  - Clerk auth check (redirect if signed in)

---

### 008 — Dashboard Shell
- **Status:** In Progress
- **Branch:** `008-dashboard-shell`
- **What was built:** Main app shell — sidebar navigation, layout, route structure
- **Key files:**
  - `app/(dashboard)/` — protected dashboard routes
  - `components/` — Sidebar, nav components
- **Key additions:**
  - shadcn/ui Sidebar component
  - Lucide React icons
  - Clerk `auth()` server-side
  - TypeScript strict mode (no `any`)
- **What's next:**
  - [ ] Inbox view (conversation list + chat panel)
  - [ ] Real-time conversation updates via Convex subscriptions
  - [ ] WhatsApp Embedded Signup flow
  - [ ] Webhook receiver for incoming Meta messages

---

### Permissions Audit & Fix
- **Status:** Done
- **What was done:** Full audit of role-based permissions across the entire codebase and alignment with CLAUDE.md `## 25. Roles & Permissions`
- **Bugs fixed:**
  - `convex/messages.ts` — Supervisor was excluded from viewing messages, sending replies, and adding internal notes (only checked admin). Added `org:supervisor` to all 3 inline role checks.
  - `convex/quickReplies.ts` — Supervisor was excluded from creating, editing, and deleting quick replies (only checked admin). Replaced inline checks with `assertAdminOrSupervisor`.
  - `components/inbox/conversation-list-item.tsx` — Supervisor was excluded from the "Assign" button on conversation list items (only checked admin). Added `org:supervisor`.
  - `convex/orgMembers.ts` — Supervisor could not invite or remove members. Updated `inviteByEmail`, `inviteByWhatsApp`, and `removeMember` to allow Supervisor access, with validation that the target role is `org:agent` only. Added `assertSupervisorCanManageTarget` helper.
  - `lib/shell/nav-config.ts` — Contacts nav item had `minRole: "supervisor"` but CLAUDE.md says all roles can view/edit contacts. Changed to `minRole: "agent"`.
- **Client-side updates:**
  - `components/settings/invite-modal.tsx` — Supervisors now see only Agent role in invite dropdown, Link tab hidden (admin-only feature), new error handling for `SUPERVISOR_CAN_ONLY_INVITE_AGENTS`.
  - `components/settings/team-member-list.tsx` — Supervisors only see remove action for agents; admins see full role-change + remove menu.
  - `components/settings/role-select.tsx` — Added `disabled` prop for supervisor lock.

---

### 009 — Inbox UI (Mock Data)
- **Status:** Done
- **Branch:** `008-dashboard-shell`
- **What was built:** Full 3-column inbox UI wired to mock data, ready for real Convex data in task 011
- **New files:**
  - `lib/mock/inbox-data.ts` — 10 mock conversations, 40+ messages, 3 agents, Egyptian/Gulf phone numbers
  - `convex/inbox.ts` — typed stub queries (`listConversations`, `getMessages`, `sendMessage`, `updateStatus`, `assignConversation`)
  - `components/ui/avatar.tsx` — shadcn Avatar component (installed)
- **Modified files:**
  - `components/inbox/conversation-list-item.tsx` — avatar initials, contact name + phone, status color chips, assigned agent name, RTL-aware layout
  - `components/inbox/conversation-list.tsx` — search bar (by name/phone/preview), All/Mine/Unassigned filter tabs, wired to `api.inbox.listConversations`
  - `components/inbox/conversation-thread.tsx` — date dividers (Today/Yesterday/date), dual-source (real DB or mock fallback)
  - `app/(dashboard)/inbox/page.tsx` — mobile-responsive layout (single column toggle), contact info in top bar, removed legacy channel/status filter bar
- **Decisions:**
  - Mock data imported into Convex stubs so UI uses `useQuery`/`useMutation` wiring from day one — task 011 just swaps the handlers
  - `ConversationThread` prefers real DB messages over mock (non-zero real messages win)
  - Contact side panel hidden on `< lg` to give chat panel more room

---

### 012 — Real-time Message Delivery
- **Status:** Done
- **Branch:** `008-dashboard-shell`
- **What was built:** Replaced all mock data stubs with real Convex queries/mutations; inbox is now fully live
- **Schema changes:**
  - `messages.status`: added `"sending"` literal for optimistic UI state
  - `messages.by_conversation` index extended to `["conversationId", "createdAt"]` for ordered retrieval
- **New files:**
  - `convex/seed.ts` — seed mutation integrated into `convex/inbox.ts` as `inbox.seed`
  - `components/dev/seed-button.tsx` — renders only in `NODE_ENV=development`
- **Modified files:**
  - `convex/inbox.ts` — all stubs replaced with real DB implementations: `listConversations`, `getMessages`, `sendMessage`, `updateStatus`, `assignConversation`, `markAsRead`, `seed`
  - `components/inbox/conversation-thread.tsx` — removed mock fallback; uses only `api.inbox.getMessages`; Skeleton loading state
  - `components/inbox/message-input.tsx` — switched to `api.inbox.sendMessage` with `withOptimisticUpdate` (message appears instantly)
  - `app/(dashboard)/inbox/page.tsx` — calls `markAsRead` on conversation open; `SeedButton` in dev top bar
- **Key decisions:**
  - `"sending"` status written on insert; task 013 (WA API send) will patch it to `"sent"` after delivery
  - Agents in "all" filter see only their own conversations + unassigned queue (CLAUDE.md §25)
  - Seed data creates contacts + channel + conversations + messages in one mutation — idempotent (skips existing)

---

---

### 011 — Webhook Receiver
- **Status:** Done
- **Branch:** `008-dashboard-shell`
- **What was built:** Full Meta WhatsApp Cloud API webhook receiver — inbound messages flow from Meta into the Convex DB and appear in the Inbox UI in real-time
- **New files:**
  - `app/api/webhook/whatsapp/route.ts` — Next.js route: HMAC verification, returns 200 immediately, fire-and-forgets to Convex
  - `scripts/test-webhook.ts` — Local test script (sends fake Meta payload with valid HMAC)
  - `docs/webhook-testing.md` — Setup guide for ngrok + Meta App Dashboard
- **Modified files:**
  - `convex/http.ts` — Full rewrite: shared-secret + HMAC dual auth, all content types (text/image/audio/document/video/sticker/location), structured JSON logging
  - `convex/messages.ts` — `createInbound`: extended contentType union to include `audio | video | sticker | location`, added `mediaUrl` arg, returns `isDuplicate` flag
  - `CLAUDE.md` — Added `CONVEX_SITE_URL`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_WEBHOOK_SECRET`, `WHATSAPP_APP_SECRET`, `WHATSAPP_API_TOKEN`, `WHATSAPP_API_VERSION` to env vars section
- **New env vars:**
  ```
  CONVEX_SITE_URL=
  WHATSAPP_WEBHOOK_VERIFY_TOKEN=
  WHATSAPP_WEBHOOK_SECRET=
  WHATSAPP_APP_SECRET=
  WHATSAPP_API_TOKEN=
  WHATSAPP_API_VERSION=v19.0
  ```
- **Key decisions:**
  - Next.js route is the Meta-facing endpoint (handles HMAC); Convex HTTP action (`/meta-webhook`) validates shared secret — clean separation of concerns
  - Both direct Meta calls (HMAC) and Next.js-forwarded calls (shared secret) supported in Convex action
  - Dedup by `metaMessageId` — Meta sends duplicates, we skip silently and log
  - `isDuplicate` flag returned by `createInbound` so Convex action can log accurately without double-processing
  - Resolved conversations re-opened to `"open"` when customer messages again

---

### 010 — WhatsApp Embedded Signup
- **Status:** Done
- **Branch:** `008-dashboard-shell`
- **What was built:** Full Meta WhatsApp Embedded Signup flow — Admin can connect their WABA directly; tokens stored AES-256 encrypted; webhook auto-subscribed; channels page with status badges, disconnect, and reconnect
- **New files:**
  - `convex/lib/encryption.ts` — AES-256-GCM encrypt/decrypt; key from `ENCRYPTION_SECRET` Convex env
  - `components/onboarding/channel-status-badge.tsx` — colored badge (active/connecting/disconnected/reconnect_required)
  - `components/onboarding/embedded-signup-button.tsx` — FB JS SDK popup (postMessage + FB.login); calls `completeEmbeddedSignup` action
  - `components/ui/alert.tsx` — shadcn alert component (added via `npx shadcn add alert`)
- **Modified files:**
  - `convex/schema.ts` — Extended `channels` table: `accessToken`, `tokenEncryptedAt`, `status` enum, `displayPhone`, `connectedAt`, `disconnectedAt`; added `by_tenant_status` index
  - `convex/channels.ts` — Added `completeEmbeddedSignup` action (token exchange → encrypt → webhook subscribe → upsert → onboarding mark), `disconnect`, `rename`, `setStatus` (internal), `upsertChannel` (internal), `markWhatsappConnected` (internal), `retryWebhookSubscription` (internalAction, 5-attempt retry with 60s delay)
  - `convex/lib/planLimits.ts` — Added `getChannelLimit(plan)` with channel limits (free/starter: 1, growth: 3, business: ∞)
  - `convex/lib/auth.ts` — Fixed `tenantId` cast (`identity.orgId as string`) to resolve pre-existing TypeScript errors
  - `app/(dashboard)/settings/channels/page.tsx` — Full rewrite: Embedded Signup panel, plan limit check, status badges, disconnect button, reconnect-required banner
  - `components/onboarding/step-connect-whatsapp.tsx` — Replaced placeholder button with real `EmbeddedSignupButton`; success state with phone number display
- **New env vars (add to `.env.local`):**
  ```
  NEXT_PUBLIC_META_APP_ID=          # Meta App ID (public — FB JS SDK)
  NEXT_PUBLIC_META_CONFIG_ID=       # Meta Login for Business config ID
  META_APP_ID=                      # Same as above, server-side reference
  ENCRYPTION_SECRET=a056ba5dcf20ca7d0c2d0b07b36152a263430ed9b84d531ce7ec6555f155ef9e
  ```
- **Convex env vars set:**
  - `ENCRYPTION_SECRET` — set via `npx convex env set`
- **Critical for task 011:** `by_phone_number_id` index was already in schema; `by_tenant_status` added in this task
- **Key decisions:**
  - `accessToken` stored AES-256-GCM encrypted; never returned to client (stripped in `listForTenant`/`get`)
  - Reconnection reuses existing `channelId` — preserves all conversation history
  - Webhook subscription failure triggers 5-retry scheduled job (60s intervals), not a hard error

---

### Customer Journey
- **Status:** Done
- **Branch:** 008-dashboard-shell
- **What was built:** Stage pipeline (lead/prospect/customer/retained/churned), follow-up scheduling with 30-min cron + Meta API send, max 2 attempts before auto-churn, contact timeline, notification bell, ContactSidePanel, FollowUpModal, full contact profile page, stage filter in Contacts and Inbox
- **Key additions:**
  - `followUps` table — with attemptCount, expectedRevenue, channelId
  - `contactEvents` table — append-only timeline log
  - `notifications` table — in-app bell notifications
  - `convex/crons.ts` — 30-min cronJob
  - `convex/followUps.ts` — processDue internalAction + recordFollowUpResult internalMutation
  - `components/ui/notification-bell.tsx`
  - `components/contacts/contact-side-panel.tsx`
  - `components/contacts/follow-up-modal.tsx`
  - `components/contacts/contact-timeline.tsx`
  - `app/(dashboard)/contacts/[id]/page.tsx`

---

## Up Next

| # | Feature | Priority |
|---|---|---|
| 013 | WhatsApp API send (wire inbox.sendMessage → Meta API, patch "sending" → "sent") | High |
| 014 | Internal notes UI | Medium |
| 015 | Conversation assignment (manual / round-robin) | Medium |
| 016 | CSAT flow | Low |
| 017 | SLA alerts | Low |
| 018 | Data export | Low |
