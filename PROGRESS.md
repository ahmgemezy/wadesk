# WaDesk — Build Progress

> This file is the single source of truth for project progress. It is read by Claude Chat (project manager) to stay updated on what has been built, what decisions were made, and what is coming next.
> Updated after each major task. Never modify CLAUDE.md unless explicitly asked.

---

## Project Summary

**WaDesk** is an Arabic-first WhatsApp Business multi-agent customer support SaaS targeting SMBs in Egypt and the Gulf.  
**Stack:** Next.js 15 (App Router) · Convex (backend + real-time DB) · Clerk (auth + multi-tenant orgs) · shadcn/ui · Tailwind CSS v4 · Meta WhatsApp Cloud API · Polar.sh (payments)  
**Current branch:** `task/015-broadcasts-sending-loop`  
**Build status:** ✅ No TypeScript errors · ✅ Convex schema deployed · ✅ Dev server running · ✅ Outbound text replies wired to Meta API

---

## Completed Features

---

### Task 014 — Round-Robin Conversation Assignment
- **Status:** Done
- **Branch:** `task/014-round-robin`
- **What was built:** Automatic round-robin assignment of incoming conversations + manual reassignment UI + Mine/Unassigned/Unread filter tabs in inbox
- **Schema changes on `conversations`:**
  - `assignedAt: v.optional(v.number())` — timestamp of last assignment
  - `assignmentType: v.optional(v.union("round_robin", "manual", "unassigned"))` — how the conversation was assigned
- **Files created:**
  - `convex/actions/roundRobin.ts` — `assignRoundRobin` internalAction; fetches Clerk org memberships, picks next agent in rotation, calls `assignInternal`, increments `roundRobinIndex`
  - `components/settings/assignment-mode-select.tsx` — Radio-button UI for Admin to set First Reply / Manual / Round Robin per channel
- **Files modified:**
  - `convex/schema.ts` — added `assignedAt`, `assignmentType` to conversations table
  - `convex/conversations.ts` — `assign` sets `assignedAt` + `assignmentType: "manual"` or `"unassigned"`; `assignInternal` accepts optional `assignmentType` arg
  - `convex/http.ts` — webhook handler fires `assignRoundRobin` action for new conversations when channel is in round_robin mode
  - `convex/channels.ts` — `incrementRoundRobinIndex` internalMutation; `setAssignmentMode` mutation (Admin-only, plan-gated to Growth+ for round_robin)
  - `components/inbox/conversation-list.tsx` — resolves assigned agent display names via `useOrganization({ memberships: true })` and passes `assignedAgentName` to each list item
  - `components/inbox/conversation-list-item.tsx` — shows assigned agent name and "Unassigned" label in row 4
  - `components/inbox/assign-agent-dialog.tsx` — Dropdown popover for Admin/Supervisor to reassign any conversation
  - `app/(dashboard)/settings/channels/[channelId]/page.tsx` — includes `<AssignmentModeSelect>` in channel settings
- **Key decisions:**
  - Round-robin uses `clerkClient()` (Clerk SDK) in a Convex Node.js action (`"use node"`) to fetch live org memberships — avoids storing stale agent lists
  - `roundRobinIndex` on `channels` increments atomically per assignment; wraps automatically via modulo in the action
  - No online/offline awareness in v1 — assigns to next member regardless of status
  - Manual reassignment by Admin/Supervisor does NOT reset the round-robin index
  - Round Robin mode is plan-gated to Growth and above
- **Role permissions:**
  - All roles can be assigned conversations
  - Only Admin + Supervisor can manually reassign
  - Only Admin can change assignment mode

---

### CLAUDE.md — Roles & Permissions Section
- **Status:** Done
- **What was built:** Added `## 25. Roles & Permissions` to CLAUDE.md — full permissions matrix (Admin / Supervisor / Agent), role rules, and server-side enforcement notes
- **Files modified:** `CLAUDE.md`

---

### 002 — Agent Roles
- **Status:** Done
- **Branch:** `002-agent-roles`
- **What was built:** Agent roles and permissions system (Admin / Supervisor / Agent) — Clerk org roles wired to Convex auth, server-side enforcement, client-side gating

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
- **What was built:** Contacts CRM-lite (auto-capture, manual input, CSV import, tags, custom fields, stage pipeline)
- **Key additions:**
  - `customFields` table in Convex
  - `libphonenumber-js` for phone normalization
  - `papaparse` for client-side CSV parsing

---

### 006 — Basic Analytics
- **Status:** Done
- **What was built:** Analytics dashboard (conversation volume, response time, agent performance, CSAT placeholder)
- **Key additions:**
  - `conversationMetrics` denormalized read-model table in Convex
  - Recharts via shadcn/ui chart component
  - `ctx.scheduler.runAfter` pattern for async internalMutation triggers
- **Routes:** `/analytics` (team-wide, Admin/Supervisor) · `/my-stats` (own stats, all roles)

---

### 007 — Marketing Site
- **Status:** Done
- **Branch:** `007-marketing-site` (merged into `002-agent-roles`)
- **What was built:** Public marketing site (landing page, pricing, features, Arabic-first copy)
- **Key additions:** Next.js 15 App Router public routes · Clerk auth check (redirect if signed in)

---

### 008 — Dashboard Shell
- **Status:** Done (core shell complete; features added incrementally on this branch)
- **Branch:** `008-dashboard-shell`
- **What was built:** Main app shell — sidebar navigation, layout, protected route structure
- **Key additions:**
  - shadcn/ui Sidebar component with collapsible rail mode
  - Lucide React icons
  - Clerk `auth()` server-side route protection
  - TypeScript strict mode (no `any`)

---

### 009 — Inbox UI (Mock Data Phase)
- **Status:** Done
- **What was built:** Full 3-column inbox UI wired to mock data
- **New files:**
  - `lib/mock/inbox-data.ts` — 10 mock conversations, 40+ messages
  - `components/inbox/conversation-list-item.tsx`
  - `components/inbox/conversation-thread.tsx`
  - `components/inbox/message-input.tsx`
  - `components/inbox/message-bubble.tsx`
- **Key decisions:**
  - All UI uses `useQuery`/`useMutation` from day one — task 012 just swapped handlers
  - Mobile-responsive: single column toggle (list ↔ chat)
  - Contact side panel hidden on `< lg` breakpoint

---

### 010 — WhatsApp Embedded Signup
- **Status:** Done ✅ (spec compliance pass complete)
- **What was built:** Full Meta WhatsApp Embedded Signup — Admin connects WABA; tokens stored AES-256-GCM encrypted; webhook auto-subscribed; channels page with status badges, disconnect (with Meta webhook revocation), reconnect
- **Note:** Spec specified a `wabaPhoneNumbers` table — implemented as `channels` instead (better design: multi-number ready from day one). The `by_phone_number_id` index exists on `channels` — Task 011 webhook router is fully unblocked.
- **New files:**
  - `convex/lib/encryption.ts` — AES-256-GCM encrypt/decrypt
  - `components/onboarding/embedded-signup-button.tsx` — FB JS SDK popup with postMessage WABA data capture
  - `components/onboarding/channel-status-badge.tsx`
  - `components/onboarding/step-connect-whatsapp.tsx` — onboarding wizard step (with skip option)
  - `types/meta.ts` — `WABAPhoneNumber`, `WABADetails`, `FBLoginResponse`, `TokenExchangeResponse`
- **Modified files (spec compliance pass):**
  - `convex/channels.ts` — added `disconnectChannel` action (decrypts token → calls `DELETE /subscribed_apps` on Meta → patches DB); updated import to include `decrypt`
  - `app/(dashboard)/settings/channels/page.tsx` — calls `disconnectChannel` action instead of `disconnect` mutation
  - `components/onboarding/step-connect-whatsapp.tsx` — added `onSkip` prop + `handleSkip` (calls `markStep` then `onSkip?.()`)
  - `components/onboarding/onboarding-wizard.tsx` — passes `onSkip={() => {}}` to `StepConnectWhatsApp`
  - `lib/shell/nav-config.ts` — changed `/settings/channels` from `minRole: "admin"` to `minRole: "supervisor"` (spec: all roles can view connection status)
- **Key decisions:**
  - `accessToken` encrypted at rest (AES-256-GCM); never returned to client
  - Reconnection reuses existing `channelId` — preserves conversation history
  - Webhook subscription failure → 5-retry scheduled job (60s intervals)
  - Disconnect is best-effort: Meta webhook revocation attempted but DB disconnect proceeds regardless (network failure shouldn't block admin from disconnecting)
- **Env vars required:**
  ```
  NEXT_PUBLIC_META_APP_ID=
  NEXT_PUBLIC_META_CONFIG_ID=
  ENCRYPTION_SECRET=
  ```

---

### 011 — Webhook Receiver
- **Status:** Done
- **What was built:** Full Meta WhatsApp Cloud API webhook receiver — inbound messages appear in Inbox in real-time
- **New files:**
  - `app/api/webhook/whatsapp/route.ts` — HMAC verification, fires to Convex
  - `convex/http.ts` — shared-secret + HMAC dual auth, all content types
- **Supported inbound types:** text · image · audio · document · video · sticker · location
- **Key decisions:**
  - Dedup by `metaMessageId` — Meta sends duplicates, skipped silently
  - Resolved conversations auto-reopen to `"open"` when customer messages again
- **Env vars required:**
  ```
  CONVEX_SITE_URL=
  WHATSAPP_WEBHOOK_VERIFY_TOKEN=
  WHATSAPP_WEBHOOK_SECRET=
  WHATSAPP_APP_SECRET=
  WHATSAPP_API_TOKEN=
  WHATSAPP_API_VERSION=v19.0
  ```

---

### 012 — Real-time Message Delivery (Inbox Live)
- **Status:** Done
- **What was built:** Replaced all mock stubs with real Convex queries/mutations; inbox is fully live
- **Schema changes:**
  - `messages.status` — added `"sending"` literal for optimistic UI state
- **Key additions:**
  - `components/dev/seed-button.tsx` — dev-only seed button (renders only in `NODE_ENV=development`)
  - `inbox.seed` mutation — idempotent seed: contacts + channel + conversations + messages
  - Optimistic update on `sendMessage` — message appears instantly in thread before server confirms
- **Key decisions:**
  - `"sending"` status written on insert; task 013 patches to `"sent"` after Meta delivery
  - Agents in "all" filter see only their own conversations + unassigned queue (per CLAUDE.md §25)

---

### Permissions Audit & Fix
- **Status:** Done
- **What was done:** Full audit of role-based permissions across the codebase aligned to CLAUDE.md §25
- **Bugs fixed:**
  - `convex/messages.ts` — Supervisor excluded from viewing messages, sending replies, adding internal notes. Added `org:supervisor` to all role checks.
  - `convex/quickReplies.ts` — Supervisor excluded from managing quick replies. Replaced inline checks with `assertAdminOrSupervisor`.
  - `components/inbox/conversation-list-item.tsx` — Supervisor excluded from Assign button. Fixed.
  - `convex/orgMembers.ts` — Supervisor couldn't invite/remove agents. Added validation that target must be `org:agent`.
  - `lib/shell/nav-config.ts` — Contacts had `minRole: "supervisor"` incorrectly. Changed to `minRole: "agent"`.
- **Client-side updates:** `invite-modal.tsx`, `team-member-list.tsx`, `role-select.tsx`

---

### Customer Journey
- **Status:** Done
- **Branch:** `008-dashboard-shell`
- **What was built:** Full customer stage pipeline + follow-up scheduling system
- **Stages:** lead → prospect → customer → retained → churned
- **New tables in Convex:**
  - `followUps` — scheduled follow-ups (attemptCount, expectedRevenue, channelId, status)
  - `contactEvents` — append-only timeline log per contact
  - `notifications` — in-app bell notifications
- **New files:**
  - `convex/crons.ts` — 30-min cronJob runs `processDue`
  - `convex/followUps.ts` — `processDue` internalAction + `recordFollowUpResult` internalMutation
  - `components/ui/notification-bell.tsx`
  - `components/contacts/contact-side-panel.tsx`
  - `components/contacts/follow-up-modal.tsx`
  - `components/contacts/contact-timeline.tsx`
  - `app/(dashboard)/contacts/[id]/page.tsx` — full contact profile page
- **Business logic:** Max 2 follow-up attempts before auto-churn; sends via Meta API; revenue tracking per follow-up
- **Inbox integration:** Stage filter tabs in conversation list (filter by lead/prospect/customer/etc.)

---

### Inbox — Rich Media, Emoji, Attachments & Contact Panel Upgrades
- **Status:** Done
- **Branch:** `008-dashboard-shell`
- **Commit:** `e100803`
- **What was built:** Comprehensive inbox UX improvements across message rendering, composer, conversation list, and contact side panel

#### Message Rendering (MessageBubble)
- Inbound rich media now fully rendered:
  - **Image/Sticker** — `<img>` with lazy loading, rounded, max 256px height
  - **Video** — `<video controls>` with max height
  - **Audio** — `<audio controls>` with waveform icon
  - **Document** — FileIcon + filename + download link
  - **Location** — MapPin icon + Google Maps link (parses `"lat,lng|name"` content format)
- Status ticks: `·` sending · `✓` sent · `✓✓` delivered · `✓✓` (green) read · `✗` failed

#### Outbound Attachments (MessageInput)
- **Image, Video, Document, Audio** — file picker per type → Convex Storage upload → `sendMediaReply` action → Meta Media API
- **Location** — browser `navigator.geolocation` → `sendLocationReply` mutation → `sendLocation` WhatsApp action
- **Emoji picker** — `emoji-picker-react` lazy-loaded via `next/dynamic`; positioned `absolute bottom-full` above toolbar; closes on outside click
- Attachment preview card shown before send (image thumbnail for images, icons for others)
- Location preview card shows lat/lng coordinates

#### Convex Backend (messages.ts, actions/sendWhatsAppMessage.ts)
- `generateUploadUrl` mutation — wraps `ctx.storage.generateUploadUrl()`
- `sendMediaReply` action — uploads to Meta Media API via FormData → gets `media_id` → sends WhatsApp media message
- `sendLocationReply` mutation — inserts location message, schedules `sendLocation` action
- `sendMediaMessage` internalAction — uploads file to Meta, sends WhatsApp media message
- `sendLocation` internalAction — sends WhatsApp location message type
- `getConversationInternal`, `getChannelInternal`, `getContactInternal` — internalQuery helpers

#### Conversation List Improvements
- **Scroll fix** — replaced `ScrollArea` with plain `div overflow-y-auto` (ScrollArea breaks flex height chain)
- **Stage filter tags** — now `flex-wrap` instead of horizontal scroll; all stages visible
- **Unread filter tab** — new "Unread" tab in assignment filter; counts and filters conversations with `unreadCount > 0`
- **Read/Unread toggle** — hover-reveal button per conversation row (MailOpen/MailCheck icons); calls `markAsRead` / `markAsUnread`

#### Sidebar Badge
- `app-sidebar.tsx` — queries live unread count; shows green badge on Inbox nav item (capped at 99+); tooltip says "X unread messages"

#### Contact Panel (ContactPanel)
- **Customer Journey** — clickable stage pills directly in panel (no need to open contact profile page)
- **Internal Notes section** — pulls recent internal notes from all conversations with this contact via `getInternalNotesByContact`; shown as amber cards with timestamp
- **Follow-ups section** — pending follow-ups (blue cards with cancel button) + completed follow-ups (grayed, strikethrough); + button opens `FollowUpModal`
- `channelId` and `conversationId` now threaded down from inbox page → ContactPanel

#### Convex Backend (inbox.ts)
- `markAsUnread` mutation — patches conversation `unreadCount: 1`
- `getInternalNotesByContact` query — queries all conversations for contact, collects internal notes, returns top 10 sorted desc

#### Bug Fixes
- `ScrollArea` replaced everywhere it broke flex scroll chains (thread + list)
- Emoji picker fixed: added `relative` to outer wrapper so `absolute bottom-full` positions correctly
- Tailwind canonical classes fixed: `max-w-[160px]` → `max-w-40`, `after:start-1/2` → `after:inset-s-1/2`, `after:w-[2px]` → `after:w-0.5`, `min-w-[80px]` → `min-w-20`
- Auth in Convex actions: switched from `getCallerIdentity` (uses `ctx.db`, not available in actions) to `ctx.auth.getUserIdentity()` directly

---

### Smart Contact Lists
- **Status:** Done
- **Branch:** `009-automation-rules`
- **Commits:** `eca897a` → `2fbc031`
- **What was built:** Dynamic/static contact lists for segmentation and broadcast targeting
- **New Convex tables:**
  - `contactLists` — stores list metadata, filter criteria, type (`smart` | `static`), cached contact count
- **New files:**
  - `convex/contactLists.ts` — full CRUD + `getMatchingContacts`, `getAvailableCountries`, `backfillCountries`
  - `components/lists/lists-page.tsx` — card grid layout showing all lists with stats
  - `components/lists/list-card.tsx` — individual list card with type badge and count
  - `components/lists/list-detail.tsx` — list detail page showing matching contacts (avatar, name, phone, stage)
  - `components/lists/create-list-dialog.tsx` — two-column sheet: filter builder (left) + live preview panel (right)
  - `app/(dashboard)/lists/page.tsx` and `app/(dashboard)/lists/[id]/page.tsx`
- **Key features:**
  - Smart lists: filter by tags, stage, country (derived from phone prefix), custom fields — count updates live
  - Static lists: manually curated contact sets
  - Country detection from phone number prefix via `lib/cityData.ts` (no stored `country` field dependency)
  - `backfillCountries` mutation for existing contacts that predate the auto-detect feature
  - Plan limits enforced via `convex/lib/planLimits.ts`
- **Plan limits:** Free 3 lists · Starter 10 · Growth 50 · Business unlimited

---

### Broadcast Campaigns — Sending Loop (Task 015-A)
- **Status:** Done
- **Branch:** `task/015-broadcasts-sending-loop`
- **What was built:** Batched broadcast sending loop with real-time progress UI and per-contact retry logic
- **Schema changes on `broadcasts`:**
  - `recipientSnapshot` changed from `v.array(v.id("contacts"))` to `v.array(v.object({ contactId, phone, name }))` — snapshot now stores phone/name at send time
  - `retryMap: v.optional(v.record(v.string(), v.number()))` — tracks per-contact attempt count (up to 3)
- **New files:**
  - `convex/actions/processBroadcastBatch.ts` — `internalAction` that processes 50 contacts per invocation, calls Meta API, retries failed contacts up to 3×, schedules next batch with 2s delay, schedules retry batches with 60s delay
- **Modified files:**
  - `convex/broadcasts.ts` — rewrote `send` action (role check, plan check, snapshot build, schedules batch 0); added `getInternal`, `incrementSent`, `markFailed`, `incrementRetry`, `markComplete` (idempotent), `getTenantInternal` internalMutations/Queries; updated `updateStatus` to accept `retryMap`
  - `convex/lib/planLimits.ts` — `assertBroadcastsAllowed` now blocks both `free` and `starter` (Growth+ only, matching CLAUDE.md §10)
  - `components/broadcasts/broadcasts-page.tsx` — real-time progress bar + animated spinner badge for `status === "sending"`; bilingual sent/failed counter line
- **Key decisions:**
  - Batch size: 50 contacts/batch, 2s between batches, 60s before retry batches
  - Max 3 attempts per contact; exhausted contacts counted in `failedCount`
  - `markComplete` is idempotent — guards against double-call on terminal status
  - Channel `accessToken` (AES-256-GCM encrypted) used for Meta API token; falls back to `META_SYSTEM_USER_TOKEN` env var
  - Empty contact list throws immediately in `send` action (no silent fail)
  - Real-time UI updates via Convex subscription — no polling

### Broadcast Campaigns — Creation Wizard
- **Status:** Done (UI complete; sending loop implemented above)
- **Branch:** `009-automation-rules`
- **Commits:** `5eaffa3`, `dc00b7c`
- **What was built:** Broadcast campaign creation wizard and campaign list page
- **New Convex tables:**
  - `broadcasts` — campaign record (name, status, listId, templateId, scheduledAt, sentCount, failedCount)
- **New files:**
  - `convex/broadcasts.ts` — queries, mutations, `sendBroadcast` action (sends via Meta template API)
  - `components/broadcasts/broadcasts-page.tsx` — campaign list with status badges (draft/scheduled/sending/sent/failed)
  - `components/broadcasts/create-broadcast-wizard.tsx` — 3-step wizard: pick list → compose message → schedule/send
  - `app/(dashboard)/broadcasts/page.tsx` and `app/(dashboard)/broadcasts/new/page.tsx`
- **Key decisions:**
  - Broadcasts only available on Growth and above (plan-gated)
  - Sends use pre-approved WhatsApp template messages (Meta requirement for outbound to non-24h window contacts)
  - Scheduled broadcasts use Convex scheduled functions

---

### Task 013 — Full WhatsApp Message Send Pipeline
- **Status:** Done (completed and hardened)
- **Branch:** `009-automation-rules`
- **What was built / fixed:**
  - `convex/schema.ts` — added `failureReason: v.optional(v.string())` to messages table
  - `convex/inbox.ts` `sendMessage` mutation — now schedules `sendWhatsAppMessage.sendMessage` action after inserting; also handles first-reply assignment, SLA breach clear, metrics recording; added permission check for agents
  - `convex/actions/sendWhatsAppMessage.ts` — `sendMessage`, `sendLocation`, `sendQuotedMessage`, `sendMediaMessage` actions all now (1) extract and store wamid via `setMetaMessageId`, (2) update status to `"sent"` (not `"delivered"`) on success — `"delivered"` and `"read"` come from the webhook; `markFailed` accepts and stores `failureReason`
  - `convex/messages.ts` `updateStatus` — accepts optional `failureReason` and patches it to DB
  - `components/inbox/message-input.tsx` — Enter sends (Shift+Enter adds newline); character count warning at 3500+ chars (red at 4096+); send disabled when > 4096 chars
  - `components/inbox/message-bubble.tsx` — `StatusTick` shows animated `·` for "sending"; shows `✗ Retry` button for "failed" messages; `onRetry` prop added to `MessageBubble`
  - `components/inbox/conversation-thread.tsx` — passes real `status` (no longer maps "sending" → "sent"); wires `onRetry` to call `sendMessage` mutation with original content
- **Status flow:** `"sending"` (optimistic) → `"sent"` (Meta accepted) → `"delivered"` (webhook) → `"read"` (webhook)
- **Architecture:** mutation writes DB + schedules action; action calls Meta API + patches status — never throw, always handle errors gracefully

---

### Conversation Labels
- **Status:** Done
- **Branch:** `009-automation-rules`
- **Commit:** `68542d8`
- **What was built:** Full conversation tagging system for categorization and inbox filtering
- **New Convex tables:**
  - `conversationLabels` — label metadata (name, color, emoji) scoped to `tenantId`
- **New files:**
  - `convex/labels.ts` — full CRUD (list, create, update, remove); Admin-only delete; Admin+Supervisor create/update
  - `components/inbox/label-picker.tsx` — Popover with checkbox list for adding/removing labels from a conversation
  - `components/settings/labels-settings.tsx` — manage tenant label library (create with color picker, delete)
  - `app/(dashboard)/settings/labels/page.tsx`
- **Inbox integration:**
  - `convex/inbox.ts` — `listConversations` returns `labels` per conversation; `getConversation` query added
  - `components/inbox/conversation-thread.tsx` — label chips bar above messages + LabelPicker trigger
  - `components/inbox/conversation-list-item.tsx` — label name chips shown below message preview
  - `components/inbox/conversation-list.tsx` — label filter row (tap a label chip to filter conversations)
- **Schema changes:** `conversations.labels: v.array(v.string())` was already present; added `conversationLabels` table
- **Nav:** `/settings/labels` added with `minRole: "supervisor"`

---

### CSAT Flow
- **Status:** Done
- **Branch:** `009-automation-rules`
- **Commit:** `68542d8`
- **What was built:** Automated customer satisfaction survey sent after conversation is resolved
- **New Convex tables:**
  - `csatSettings` — per-tenant settings (enabled toggle, delayMinutes)
- **Schema changes on `conversationMetrics`:**
  - `csatSentAt` — timestamp when CSAT was sent
  - `csatScore` — 1–5, captured when customer replies
  - `csatRespondedAt` — timestamp of response
- **New files:**
  - `convex/csat.ts` — `sendCsatMessage` (internalAction, sends Arabic 1–5 text via Meta API), `checkAndRecordResponse` (internalMutation, intercepts single-digit replies from customer), `getSettings`/`updateSettings` (admin CRUD), `getAverageScore` (for analytics)
  - `components/settings/csat-settings.tsx` — enable/disable toggle + delay config
  - `app/(dashboard)/settings/csat/page.tsx`
- **Trigger:** `inbox.updateStatus` schedules `csat.sendCsatMessage` (with configurable delay) when conversation → `"resolved"`
- **Webhook interception:** `convex/http.ts` checks if inbound message matches `/^[1-5]$/` and calls `internal.csat.checkAndRecordResponse` before `createInbound` — if it's a CSAT reply, the message is captured as a score and NOT added to the conversation thread
- **Plan gating:** Growth and above only
- **Nav:** `/settings/csat` added with `minRole: "admin"`

---

### SLA Alerts
- **Status:** Done
- **Branch:** `009-automation-rules`
- **Commit:** `68542d8`
- **What was built:** Automatic SLA breach detection with in-app alerts when conversations go unanswered too long
- **Schema changes on `conversations`:**
  - `lastInboundAt` — timestamp of last inbound message (tracked in `createInbound`)
  - `slaBreachedAt` — timestamp when SLA was breached (set by cron, cleared on agent reply)
- **Schema changes on `channels`:**
  - `slaThresholdMinutes` — configurable per channel (optional, 0 = disabled)
- **Schema changes on `notifications`:**
  - `type` extended: `v.union(v.literal("followup_due"), v.literal("sla_breach"))`
  - `referenceId` field added (conversationId for SLA breach notifications)
- **New files:**
  - `convex/sla.ts` — `checkBreaches` (internalMutation, scans open conversations every 5 min), `updateChannelSlaThreshold` (public mutation, admin-only)
- **Cron:** `convex/crons.ts` — `check-sla-breaches` runs every 5 minutes → `internal.sla.checkBreaches`
- **Tracking:** `convex/messages.ts` `createInbound` → patches `lastInboundAt`; `sendReply` clears `slaBreachedAt` on agent reply
- **Inbox UI:**
  - `conversation-list-item.tsx` — amber ⚠️ badge when `slaBreachedAt` is set
  - `conversation-list.tsx` — `slaBreachedAt` passed through from `listConversations`
- **Channel settings:** SLA threshold number input added to `app/(dashboard)/settings/channels/[channelId]/page.tsx`
- **Notification bell:** `components/ui/notification-bell.tsx` routes `sla_breach` notifications to `/inbox/{conversationId}` instead of `/contacts`
- **Notifications sent to:** Channel supervisors (queried from `channelMembers` table)

---

### Department / Channel Member Assignment
- **Status:** Done
- **Branch:** `009-automation-rules`
- **Commit:** `68542d8`
- **What was built:** Assign specific team members to channels; track per-channel roles for SLA notifications
- **New Convex tables:**
  - `channelMembers` — maps `(channelId, userId, role)` with `by_channel` and `by_user` indexes
- **New files:**
  - `convex/channelMembers.ts` — `listForChannel`, `isCallerMember`, `addMember`, `removeMember`
  - `components/settings/department-members.tsx` — member list with add/remove UI inside channel settings
- **Integration:** `app/(dashboard)/settings/channels/[channelId]/page.tsx` renders `<DepartmentMembers channelId={channelId} />`
- **Used by SLA:** `sla.checkBreaches` queries `channelMembers` to find supervisors to notify

---

### Automation Rules Engine
- **Status:** Done
- **Branch:** `009-automation-rules`
- **Commit:** `9375d11`
- **What was built:** If-this-then-that automation engine for auto-responding to conversations
- **New Convex tables:**
  - `automationRules` — rule config (tenantId, channelId, trigger type, conditions, actions, enabled flag)
  - `businessHours` — per-tenant business hours config (days, open/close times, timezone)
  - `ruleFireLog` — append-only log of every rule execution (ruleId, conversationId, firedAt, result)
- **New files:**
  - `convex/automations.ts` — full CRUD for rules + business hours config
  - `lib/automationHelpers.ts` — rule evaluation helpers (keyword matching, hours check, etc.)
  - `components/automations/AutomationRulesClient.tsx` — main automations dashboard (rule list + enable/disable toggle)
  - `components/automations/AutomationRuleCard.tsx` — individual rule card with trigger type badge
  - `components/automations/AutomationRuleForm.tsx` — create/edit rule form (trigger + action config)
  - `components/automations/BusinessHoursForm.tsx` — per-tenant business hours configuration UI
  - `app/(dashboard)/automations/page.tsx`
  - `components/ui/switch.tsx` — shadcn Switch component (added for toggle controls)
- **4 trigger types:**
  1. `keyword` — fires when inbound message contains a specific keyword/phrase
  2. `outside_hours` — fires when message received outside configured business hours
  3. `first_message` — fires on first-ever message from a contact
  4. `no_reply_timeout` — fires when no agent reply within N minutes (checked via Convex cron)
- **Actions supported:** send auto-reply message (WhatsApp text via Meta API)
- **Integrations:** webhook handler in `convex/http.ts` evaluates rules on every inbound message; cron in `convex/crons.ts` handles `no_reply_timeout`
- **Plan limits:** Free 2 rules · Starter 10 · Growth 30 · Business unlimited
- **Role gating:** Admin + Supervisor can manage rules; Business Hours config is Admin-only

---

## What's Done vs. What's Pending — Feature Checklist

| Feature | Status |
|---|---|
| Multi-agent shared inbox | ✅ Done |
| Real-time conversation list | ✅ Done |
| Conversation assignment (manual) | ✅ Done |
| Conversation status: Open / Pending / Resolved | ✅ Done |
| Quick replies / saved responses | ✅ Done |
| Internal notes (invisible to customer) | ✅ Done |
| Contact management (CRM-lite) | ✅ Done |
| Customer journey stages | ✅ Done |
| Follow-up scheduling | ✅ Done |
| Contact timeline | ✅ Done |
| In-app notifications | ✅ Done |
| Basic analytics (volume, response time, agent perf) | ✅ Done |
| WhatsApp Embedded Signup | ✅ Done |
| Webhook receiver (inbound messages) | ✅ Done |
| Inbound rich media rendering (image/video/audio/doc/location) | ✅ Done |
| Outbound attachments (image/video/audio/doc) | ✅ Done |
| Outbound location | ✅ Done |
| Emoji picker | ✅ Done |
| Read/Unread toggle per conversation | ✅ Done |
| Unread badge on sidebar | ✅ Done |
| Stage filter in inbox | ✅ Done |
| WhatsApp API send (outbound text via Meta) | ✅ Done |
| WhatsApp API send (outbound media via Meta) | ✅ Done |
| Smart contact lists (dynamic segmentation) | ✅ Done |
| Static contact lists | ✅ Done |
| Broadcast campaigns (wizard + send) | ✅ Done |
| Automation rules engine (if-this-send-that) | ✅ Done |
| Business hours configuration | ✅ Done |
| Conversation labels (tag + filter) | ✅ Done |
| CSAT flow (auto-send + capture rating) | ✅ Done |
| SLA alerts (breach detection + ⚠️ badge) | ✅ Done |
| Department / channel member assignment | ✅ Done |
| Round-robin assignment | ✅ Done |
| Data export (contacts + conversations) | ❌ Not started |
| WhatsApp Business profile editing | ❌ Not started |
| Advanced message templates (with variables) | ❌ Not started |
| Billing / Polar.sh | ❌ Not started |
| WhatsApp Catalog | ❌ Deferred Phase 2 |

---

## Up Next (Priority Order)

| # | Feature | Priority | Notes |
|---|---|---|---|
| 013 | Send WhatsApp Messages via Cloud API | High | ✅ Done |
| 014 | Round-robin assignment mode | Medium | ✅ Done |
| 015 | Data export (Contacts CSV, Conversations JSON) | Low | Settings → Data & Privacy |
| 016 | Billing / Polar.sh integration | Low | Plan limits partially enforced in Convex already |
| 017 | Supervisor department/scoping plan | Low | Plan documented in `docs/superpowers/plans/2026-04-09-supervisor-department-scoping.md` |
| WA-Profile | WhatsApp Business profile editing | Medium | Growth+; Meta Business Management API; read/write profile fields |
| Templates | Advanced message templates with variables | Medium | Starter+; {{variable}} placeholders; dynamic fill form in inbox |

---

## Architecture Decisions Log

| Decision | Rationale |
|---|---|
| Convex over Supabase | Real-time first, no SQL complexity |
| Clerk over NextAuth | Multi-tenant orgs built-in |
| Polar.sh over Stripe | MoR = handles MENA VAT + global tax automatically |
| `ScrollArea` avoided in flex scroll contexts | shadcn ScrollArea's internal wrapper breaks `min-h-0` flex constraints — use plain `div overflow-y-auto` |
| Convex actions use `ctx.auth.getUserIdentity()` directly | `getCallerIdentity()` calls `ctx.db` which doesn't exist in action context |
| Outbound media: Convex Storage → Meta Media API | Files uploaded to Convex first, then re-uploaded to Meta to get `media_id` |
| `"sending"` status on message insert | Allows optimistic UI; task 013 patches to `"sent"` after Meta confirms delivery |
| Seed mutation is idempotent | Skips existing contacts/conversations — safe to run multiple times in dev |
| `metaMessageId` dedup on inbound | Meta sends webhook duplicates; silently skipped |
| Reconnecting WABA reuses existing `channelId` | Preserves all conversation history |
