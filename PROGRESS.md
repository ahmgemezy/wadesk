# WABDesk — Build Progress

> Single source of truth for project progress. Read by Claude Chat (project manager) to stay updated.
> **Last audited:** 2026-04-28 — Member profile modal, team presence, channel retention, React Email system, conversation search, batch actions, rate limiting, message scheduling, template library, legal pages, CSAT v2, departments.
> Never modify CLAUDE.md unless explicitly asked.

---

## Project Summary

**WABDesk** is an Arabic-first WhatsApp Business multi-agent customer support SaaS for SMBs in Egypt and the Gulf.  
**Stack:** Next.js 15 (App Router) · Convex (backend + real-time DB) · Clerk (auth + multi-tenant orgs) · shadcn/ui · Tailwind CSS v4 · Meta WhatsApp Cloud API · Paddle (billing integrated)  
**Current branch:** `feat/013-departments`  
**Build status:** ✅ No TypeScript errors · ✅ Convex schema deployed (32 tables) · ✅ Dev server runs · ✅ Outbound messages wired to Meta API · ✅ Broadcasts batched sending · ✅ React Email transactional system · ✅ Member profile modal complete

---

## ✅ Completed Tasks

### Core Infrastructure

**Multi-Tenant Auth (Clerk + Convex)**

- Clerk Organizations = tenants; `orgId` = `tenantId` everywhere
- Roles: `org:admin`, `org:supervisor`, `org:agent` — enforced server-side in every Convex query/mutation
- JWT validated in Convex via `auth.getUserIdentity()`
- Middleware: all dashboard routes protected; public: `/`, `/sign-in`, `/sign-up`, `/select-org`
- Files: `middleware.ts`, `convex/lib/auth.ts` (auth helpers), `lib/shell/role-utils.ts`

**Convex Schema (27 tables, all real)**
All tables are real, indexed, and used by live queries:
`tenants`, `channels`, `contacts`, `contactLists`, `broadcasts`, `conversations`, `messages`, `quickReplies`, `inviteLinks`, `customFields`, `followUps`, `contactEvents`, `notifications`, `onboardingState`, `conversationMetrics`, `automationRules`, `businessHours`, `ruleFireLog`, `conversationLabels`, `channelMembers`, `csatSettings`, `messageTemplates`

**Plan Limits (server-side enforced)**

- `convex/lib/planLimits.ts` — every plan-gated mutation checks tenant plan
- Limits: agents (3/5/15/∞), channels (1/2/5/∞), automation rules (2/10/30/∞), contact lists (3/10/∞/∞), message templates (0/10/50/∞)
- Round-robin, CSAT, SLA: Growth+ only
- Broadcasts: Starter+ only; supervisor role: Starter+ only

**Access Token Encryption**

- AES-256-GCM encryption for WhatsApp access tokens at rest
- `convex/lib/encryption.ts` — encrypt/decrypt helpers; token decrypted only in Convex actions, never returned to client

---

### Onboarding Flow

- Multi-step wizard: create org → connect WhatsApp → invite team → complete
- Progress tracked in `onboardingState` table
- `convex/onboarding.ts`: `getState`, `ensureCreated`, `markStep`, `markComplete`
- Steps: `StepWorkspaceName`, `StepConnectWhatsApp`, `StepInviteTeam`, `StepComplete`
- WhatsApp Embedded Signup (Meta FB SDK popup → token exchange → `channels.create`)
- Pages: `/onboarding`, `/accept-invite`, `/join/[token]`, `/select-org`

---

### WhatsApp Channel Management

- **Schema fields:** `phoneNumberId`, `displayPhone`, `displayName`, `wabaId`, `accessToken` (encrypted), `assignmentMode`, `roundRobinIndex`, `status`, `slaThresholdMinutes`, `slaEnabled`
- `convex/channels.ts`: full CRUD + `setAssignmentMode`, `setSlaThreshold`, `incrementRoundRobinIndex`, `setAccessToken` (encrypts), `disconnectChannel` (revokes Meta webhook subscription)
- Reconnecting a number reuses existing `channelId` — preserves conversation history
- Pages: `/settings/channels`, `/settings/channels/[channelId]`

---

### Inbox (Multi-Agent Shared Inbox)

- **Real-time** via Convex `useQuery` subscriptions — no polling
- `convex/inbox.ts`: `listConversations` (filter: all/mine/unassigned/unread, contactStage), `getMessages`, `markAsRead`, `markAsUnread`, `updateStatus`, `getInternalNotesByContact`
- `convex/conversations.ts`: `listForCaller`, `get`, `assign`, `assignInternal`, `createIfNeeded`
- `convex/messages.ts`: `listForConversation`, `sendReply`, `updateStatus`, `addReaction`, `removeReaction`, `markDeletedInDb`, `setMetaMessageId`, `generateUploadUrl`, `sendMediaReply`, `sendLocationReply`
- **Role-gated:** Agents see only assigned conversations + unassigned queue; Admin/Supervisor see all
- **Components:** `ConversationList`, `ConversationListItem`, `ConversationThread`, `MessageBubble`, `MessageInput`, `QuickReplyPanel`, `AssignAgentDialog`, `StatusSelector`, `LabelPicker`, `MessageActionMenu`, `ReplyContextBanner`
- Pages: `/inbox`, `/inbox/[id]`

**Message Types (inbound + outbound):**

- ✅ Text, Image, Video, Audio, Document, Sticker, Location
- ✅ Reactions (emoji picker, send/remove via Meta API)
- ✅ Quoted/reply-to messages
- ✅ Message deletion (30-min window, calls Meta delete API)
- ✅ Internal notes (amber, invisible to customer)
- ✅ Optimistic UI: message shows "sending" state, updates to "sent" → "delivered" → "read"

**Outbound Actions (`convex/actions/sendWhatsAppMessage.ts`):**

- `sendMessage` (text) → Meta Graph API
- `sendMediaMessage` → uploads to Meta media, gets `media_id`, sends
- `sendLocation` → WhatsApp location message type
- `sendQuotedMessage` → with context
- `deleteWhatsAppMessage` → Meta delete API
- `sendReaction` → Meta reaction API

---

### Webhook Receiver

- `app/api/webhook/whatsapp/route.ts` — GET (hub verification) + POST (HMAC-SHA256 verify → forward to Convex, return 200 immediately)
- `convex/http.ts` `metaWebhook` action:
  - Parses message / status / reaction events
  - Auto-creates conversation + contact on first inbound
  - Deduplicates by `metaMessageId`
  - Fires automation rules on every inbound message
  - Captures CSAT rating if conversation is in CSAT flow
  - Updates `lastInboundAt` for SLA tracking
  - Auto-reopens resolved conversation when customer messages again

---

### Contact Management (CRM-Lite)

- **Schema:** `contacts` (phone, displayName, customName, tags, notes, stage, firstSeenAt, lastSeenAt, country, city, spent, totalConversations), `customFields`, `contactEvents`, `followUps`
- `convex/contacts.ts`: paginated list, search (phone/name), create, update, archive, addTag, removeTag, updateStage, updateNote
- `convex/customFields.ts`: setField, listForContact, removeField
- `convex/contactEvents.ts`: timeline with 10+ event types (stage_changed, assigned, note_updated, tags_changed, followup_scheduled, followup_sent, etc.)
- `convex/contactsImport.ts`: `importBatch` action — batches 100 rows, 500ms delay between chunks, skip/overwrite duplicates
- Country auto-detected from phone prefix (`libphonenumber-js`)
- CSV parsing via `papaparse` (client-side)
- **Components:** `ContactList`, `ContactDetailSheet`, `ContactPanel` (inbox sidebar), `ContactTimeline`, `AddContactDialog`, `CSVImportDialog`, `BulkTagDialog`, `FollowUpModal`
- Pages: `/contacts`, `/contacts/[id]`
- **Stage pipeline:** lead → prospect → customer → retained → churned (each change logged to `contactEvents`)

---

### Follow-ups

- `convex/followUps.ts`: create, cancel, `listByContact`, `listPending` (role-scoped), `processDue` (internalMutation)
- Cron: every 30 minutes → `followUps.processDue` → sends pending follow-ups via Meta API → max 2 attempts before auto-fail
- Revenue tracking per follow-up (`expectedRevenue`, `currency`) — schema only, no analytics UI yet
- Visible in contact panel; pending and completed shown separately

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

- **Status:** Done + Extended (2026-04-25)
- **What was built:** Full Meta WhatsApp Cloud API webhook receiver — inbound messages appear in Inbox in real-time
- **New files:**
  - `app/api/webhook/whatsapp/route.ts` — HMAC verification, fires to Convex
  - `convex/http.ts` — shared-secret + HMAC dual auth, all content types (`/meta-webhook`)
- **Supported inbound types:** text · image · audio · document · video · sticker · location
- **Key decisions:**
  - Dedup by `metaMessageId` — Meta sends duplicates, skipped silently
  - Resolved conversations auto-reopen to `"open"` when customer messages again
- **Extension (2026-04-25) — structured `/webhooks/meta` endpoint:**
  - `convex/webhooks/verify.ts` — timing-safe HMAC-SHA256 using Web Crypto API
  - `convex/webhooks/processors/messages.ts` — modular inbound message processor
  - `convex/webhooks/processors/statuses.ts` — outbound status update processor
  - `convex/webhooks/processors/templates.ts` — template status stub (logs to webhook_events)
  - `convex/webhooks/meta.ts` — new HTTP action at `/webhooks/meta`, routes by wabaId
  - `convex/webhookEvents.ts` — `insert` internalMutation for debug logging
  - Schema additions: `webhook_events` table, `channels.by_waba_id` index, `channels.getByWabaId` query
  - `/meta-webhook` legacy endpoint preserved for backward compat
- **Env vars required:**
  ```
  CONVEX_SITE_URL=
  WHATSAPP_WEBHOOK_VERIFY_TOKEN=
  META_WEBHOOK_VERIFY_TOKEN=
  WHATSAPP_WEBHOOK_SECRET=
  WHATSAPP_APP_SECRET=
  META_APP_SECRET=
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

- `convex/labels.ts`: list, create, remove (cascades to all conversations), addToConversation, removeFromConversation
- `conversationLabels` table: name, color, emoji, tenantId
- Inline label chips in conversation list + label filter bar in inbox
- Pages: `/settings/labels`

---

### Quick Replies

- `convex/quickReplies.ts`: list (by category), create, update, remove
- Insert via slash-command in `MessageInput` or `QuickReplyPanel` popover
- Pages: `/settings/quick-replies`

---

### Message Templates (with Variables)

- `convex/messageTemplates.ts`: list (by category), create (plan-gated, extracts `{{variable}}` placeholders), update, remove
- Schema: `messageTemplates` — title, body, category, language (ar/en), variables (extracted), tenantId
- Variable extraction: regex `/\{\{(\w+)\}\}/g` on save; dynamic fill-in form per variable
- Plan limits: Free=0, Starter=10, Growth=50, Business=∞
- **Components:** `TemplatesSettings` (CRUD), `TemplatePicker` (used in broadcast wizard)
- Pages: `/settings/templates`

---

### CSAT (Customer Satisfaction)

- `convex/csat.ts`: `sendCsatMessage` (internalAction), `captureRating` (internalMutation), `getSettingsInternal`, `markCsatSent`
- `csatSettings` table: enabled toggle, delayMinutes
- `conversationMetrics`: csatSentAt, csatScore (1–5), csatRespondedAt
- Trigger: conversation resolved → `ctx.scheduler.runAfter(delayMs)` → Arabic CSAT message sent
- Capture: webhook intercepts single-digit (1–5) replies → `captureRating` → score stored in `conversationMetrics`
- Growth+ only
- Pages: `/settings/csat`

---

### SLA Alerts

- `convex/sla.ts`: `checkBreaches` (internalMutation)
- Cron: every 5 minutes → `sla.checkBreaches` → marks `slaBreachedAt` on conversations that exceeded threshold
- Notifications sent to channel supervisors (via `channelMembers`)
- Inbox: ⚠️ amber badge on conversation row when `slaBreachedAt` set
- SLA cleared on agent reply (`sendReply` patches `slaBreachedAt: undefined`)
- Pages: channel settings (SLA threshold config per channel)

---

### Department / Channel Members

- `channelMembers` table: maps (channelId, userId, role) with indexes
- `convex/channelMembers.ts`: listForChannel, addMember, removeMember
- Used by: SLA notification (find channel supervisors), round-robin (rotation pool)
- **Component:** `DepartmentMembers` (member list with add/remove UI in channel settings)

---

### Round-Robin Assignment

- `convex/actions/roundRobin.ts`: `assignRoundRobin` internalAction
  - Fetches live Clerk org memberships (no stale cache)
  - Picks member at `roundRobinIndex % memberCount`
  - Calls `conversations.assignInternal(assignmentType: "round_robin")`
  - Increments `roundRobinIndex` atomically
- Schema: `channels.assignmentMode` (first_reply / manual / round_robin), `channels.roundRobinIndex`, `conversations.assignmentType`, `conversations.assignedAt`
- Plan-gated: Growth+ for round_robin mode
- Manual reassignment by Admin/Supervisor does not reset index
- No online/offline awareness in v1
- **Component:** `AssignmentModeSelect` (radio buttons in channel settings), `AssignAgentDialog`

---

### Automations Engine

- `convex/automations.ts`: listRules, getBusinessHours, createRule, updateRule, deleteRule, reorderRules, setBusinessHours, `checkNoReplyTimeouts` (internalMutation), `fireRuleForConversation` (internalMutation)
- `businessHours` table: timezone + schedule grid; `automationRules` table; `ruleFireLog` table
- **4 trigger types:** keyword match · outside business hours · first message · no-reply timeout
- Template interpolation: `{{business_name}}`, `{{customer_name}}`, `{{current_time}}` in auto-reply body
- Cron: every 1 min → `checkNoReplyTimeouts`; every inbound message → `fireRuleForConversation`
- Plan limits: Free=2, Starter=10, Growth=30, Business=∞
- `lib/automationHelpers.ts`: rule evaluation, timezone-aware hours check
- Pages: `/automations`

---

### Shareable Invite Link UI

- Multi-link per tenant: each link has a label, role (`org:agent` or `org:supervisor`), expiry (7d / 30d / never), and createdBy
- `convex/inviteLinks.ts`: `list` (all non-revoked links, newest first), `create`, `revoke` (by linkId), `regenerate` (new token, same record)
- Role gating: Admin can create agent + supervisor links; Supervisor can only create agent links (enforced server-side)
- `convex/schema.ts`: `inviteLinks` table updated with `label` field and expanded `defaultRole` to support `org:supervisor`
- `convex/actions/validateInvite.ts`: uses `link.defaultRole` for org membership role instead of hardcoded `org:agent`
- `components/settings/invite-links.tsx`: loading skeleton, empty state, link cards with copy/regenerate/revoke actions, create dialog
- `/settings/team` page: Invite Links section added below Team Members list
- Bilingual AR/EN via `useT()`, RTL-correct layout

---

### Data Export

- CSV + JSON export for contacts (with all custom fields flattened) and conversations (with optional messages)
- `convex/export.ts`: `generateContactsExport` (format: csv/json), `generateConversationsExport` (format: json/csv/html, `includeMessages` toggle), `getExportStats` (contact + conversation counts for UI)
- Files stored in Convex File Storage; action returns `{ url, filename }` for browser download
- Available to Admin + Supervisor; scoped strictly to caller's `tenantId`
- UI: format selector (CSV/JSON) for contacts, format selector (JSON/CSV/HTML) + include-messages toggle + large-dataset warning for conversations, stats counts under each card title
- Pages: `/settings/export`

---

### WhatsApp Business Profile Editing

- `convex/waBusinessProfile.ts`: `getProfile` (fetches from Meta API), `updateProfile` (patches fields), `uploadProfilePhoto` (uploads to Meta, updates profile)
- Editable fields: about/description, email, websites, vertical (category), profile photo
- All calls go through Convex actions (token decrypted server-side, never client)
- ⚠️ Display name change (requires Meta review) — schema noted in CLAUDE.md but "pending review" UI badge not confirmed in component scan
- Pages: `/settings/channels/[channelId]/profile`

---

### Contact Lists (Smart Segmentation)

- `convex/contactLists.ts`: listForTenant, create, update, delete, getById, `getCountForFilters`
- `contactLists` table: name, description, filters (countries/cities/stages/tags)
- Filter evaluation: in-memory on fetched contacts (no full-text index needed for current scale)
- Plan limits: Free=3, Starter=10, Growth/Business=∞
- Pages: `/lists`, `/lists/[id]`

---

### Broadcasts

- `convex/broadcasts.ts`: listForTenant, create (draft), `send` (action)
- `broadcasts` table: name, listId, channelId, templateName, templateLanguage, status (draft/sending/sent/failed), recipientSnapshot, recipientCount, sentCount, failedCount
- **Wizard:** name → pick list → pick channel → pick template → review → send (5-step, fully wired to create mutation)
- Plan: Starter+ only
- Pages: `/broadcasts`, `/broadcasts/new`

---

### Team Management

- `convex/orgMembers.ts`: inviteByEmail (Clerk API), list (Clerk API), setRole (Clerk API), remove (Clerk API)
- `inviteLinks` table: token-based invite links (expiry, revoked flag)
- `convex/actions/validateInvite.ts`: validate token before join
- Pages: `/join/[token]`, `/settings/team`
- Supervisor constraints: can only invite/remove `org:agent` — cannot touch other admins/supervisors

---

### In-App Notifications

- `notifications` table: type (followup_due / sla_breach), referenceId, message, read
- `convex/notifications.ts`: list (user-scoped), markAsRead
- Triggered by: SLA breach (to supervisors), follow-up due (to assigned agent)
- **Component:** `NotificationBell` (unread count badge, dropdown list, mark-as-read)

---

### Marketing Site + Legal Pages

- Full landing page: hero, features, pricing, differentiators, CTA, footer
- Pricing table with 4 tiers (Free / Starter / Growth / Business)
- Arabic/English locale switching
- Mobile nav drawer
- Animated inbox mockup component
- Route: `/`
- **Legal pages added (2026-04-26):** `/privacy`, `/terms`, `/dpa` — full Arabic+English content
- **New components:** `privacy-content.tsx`, `terms-content.tsx`, `dpa-content.tsx`, `legal-page-wrapper.tsx`
- Marketing footer updated with legal page links

---

### Template Library

- Pre-built library of 66 curated templates accessible from Settings → Templates → "Template Library" tab
- Industry tabs (e-commerce, healthcare, real estate, etc.) + purpose chips for combined filtering
- Arabic + English templates across 14 categories (8 Meta + 6 Quick-Reply)
- Preview sheet with WhatsApp bubble + variable highlighting
- Quick-reply templates pre-fill the create dialog; Meta templates submit via Convex action to Meta Graph API
- Variable auto-conversion: `{{named}}` → `{{1}}` in `submitToMeta` Convex action
- **Files:** `lib/templateLibrary.ts`, `components/templates/library-template-card.tsx`, `components/templates/library-template-preview.tsx`, `components/templates/meta-submit-form.tsx`, `components/templates/template-library-tab.tsx`

---

### Broadcast Templates Builder

- Dedicated broadcast template management: `components/broadcasts/broadcast-templates-tab.tsx`, `components/broadcasts/broadcast-template-builder.tsx`
- `convex/broadcastTemplates.ts`: CRUD for tenant-specific broadcast templates synced with Meta
- `convex/metaTemplates.ts`: Meta template sync (fetch/cache from Meta Graph API)
- `broadcastTemplates` table: name, category, language, header (type + text/mediaUrl), body, footer, buttons, status (`draft|submitted|approved|rejected`), `metaStatus`
- Create wizard integration: source picker ("Meta Templates" vs "Broadcast Templates"), media URL override, dynamic URL suffix per button, variable fill-in
- Plan-gated: Starter+

---

### Quick Reply Variables

- Quick replies now support `{{variable}}` placeholders (same syntax as message templates)
- Selecting a quick reply with variables opens an inline fill-in form before inserting into composer
- **Modified:** `components/inbox/quick-reply-panel.tsx` — variable detection + fill-in UX
- **App route:** `/inbox/[id]` — variable fill-in state threaded from page level

---

### Settings Sub-Nav

- Settings section now has a persistent sub-navigation component for all settings pages
- **New file:** `components/settings/settings-sub-nav.tsx`
- **New file:** `app/(dashboard)/settings/layout.tsx` — wraps all settings routes with sub-nav
- **New file:** `app/(dashboard)/settings/page.tsx` — settings landing page redirect

---

### Departments Feature

- Channels are organized into departments (groups of channels) for better multi-channel management
- `convex/departments.ts`: listForTenant, create, update, remove, listForTransfer
- `convex/departmentMembers.ts`: addMember, removeMember, listForDepartment
- `departments` table: tenantId, name, description, channelIds
- `departmentMembers` table: tenantId, departmentId, userId, role
- Used for: conversation transfer between departments, channel grouping in UI
- **Defensive fix:** `listForTransfer` returns empty array (not NOT_FOUND) when channels are orphaned

---

### Member Profile Modal

- Rich tabbed modal for viewing/managing team members — opens from team member list
- **Tabs:** Overview (stats, bio, contact details) | Analytics (performance charts) | History (action log) | Manage (role, status, remove)
- **New files:**
  - `components/team/member-profile-modal.tsx` — modal shell with tab routing
  - `components/team/member-profile/overview-tab.tsx` — bio, contact info, recent activity
  - `components/team/member-profile/analytics-tab.tsx` — Recharts performance charts
  - `components/team/member-profile/history-tab.tsx` — action log timeline
  - `components/team/member-profile/manage-tab.tsx` — role change, status, remove member
  - `hooks/use-member-profile.ts` — data fetching hook
- **Convex:** `convex/members.ts` (mutations), `convex/memberQueries.ts` (queries + analytics)
- **New tables:** `memberProfiles` (bio, jobTitle, phone, avatar), `memberActionLog` (audit trail)
- `notificationPreferences` table: per-member email/in-app notification toggles
- Contact details stored: phone, job title, bio — Admin/Supervisor can edit via Manage tab

---

### Team Presence System

- Real-time online/offline/away/busy presence indicators for team members
- **New files:** `convex/presence.ts`, `convex/teamPresence.ts`, `convex/teamPresenceQueries.ts`
- **New table:** `presence` — userId, tenantId, status, lastSeen
- **New UI:** `components/ui/presence-indicator.tsx` (colored dot), `components/ui/team-presence-dropdown.tsx` (team status overview)
- **Hooks:** `hooks/use-presence.ts`
- Shell integration: `components/shell/presence-initializer.tsx` sets presence on load/unload
- Presence auto-expires (heartbeat pattern via scheduled functions)

---

### Channel Retention (30-day Auto-Delete)

- Disconnected channels are retained for 30 days then auto-deleted (with all associated data)
- **New files:** `convex/channelRetention.ts`, `convex/actions/channelRetentionAction.ts`
- **Schema:** `channels.deletedAt`, `channels.retentionExpiresAt` added
- **Cron:** `check-channel-retention` runs daily → finds expired channels → purges conversations, messages, channelMembers, and channel record
- UI: Channels page shows retention countdown badge for disconnected channels
- Notification sent to admin 7 days before deletion (email + in-app)
- **Fix (1d77419):** Channels with only resolved conversations can be deleted immediately

---

### Transactional Email System

- All transactional emails use branded React Email HTML templates (Arabic + English variants)
- **New directory:** `emails/` — 9 template pairs (AR + EN):
  - `agent-welcome`, `new-assignment`, `sla-breach`, `followup-due`, `followup-due-failed`
  - `channel-deleted`, `channel-expiring-soon`, `billing-payment-failed`, `billing-subscription-expired`
- `convex/emails/` — base layout (`base.tsx`), reusable components, template wrappers
- `convex/actions/notifyEmail.ts` — single dispatch action (picks AR or EN based on locale)
- `convex/actions/sendEmail.ts` — updated to use React Email + Resend API
- Email triggers: channel deletion warning, SLA breach, new assignment, follow-up failure, billing events
- **Env var:** `RESEND_API_KEY` required

---

### Message Scheduling

- Agents can schedule outbound messages for future delivery
- **New file:** `convex/messageScheduling.ts` — `scheduleMessage` mutation + `sendScheduled` internalAction
- Scheduled messages stored in `messages` table with `scheduledAt` field and `status: "scheduled"`
- Convex scheduler dispatches at the correct time; failed sends are marked and retried once
- UI integration: date-time picker in `MessageInput` toolbar (clock icon)

---

### Conversation & Message Search

- Full-text search across conversation content and message body
- **New file:** `convex/search.ts` — `searchConversations` and `searchMessages` queries
- Uses Convex search index on `messages.content` and `contacts.displayName`
- Scoped to caller's `tenantId`; role-gated (agents see only their assigned conversations)
- UI: search bar in inbox header with result list dropdown

---

### Conversation Merge

- Admin can merge duplicate conversations (same contact, different channels or sessions)
- **New file:** `convex/conversationMerge.ts` — `mergeConversations` mutation
- Merges messages from source → target conversation; marks source as resolved with merge note
- Admin-only; available from conversation header action menu

---

### Batch Actions

- Admin/Supervisor can perform bulk operations on conversations
- **New file:** `convex/batchActions.ts` — `batchClose`, `batchAssign`, `batchLabel`, `batchDelete`
- All batch mutations validate `tenantId` and role before operating
- UI: checkbox selection in conversation list + bulk action toolbar

---

### Rate Limiting

- Per-user mutation rate limiting to prevent abuse
- **New file:** `convex/lib/rateLimit.ts` — token-bucket rate limiter using `rateLimits` table
- **New table:** `rateLimits` — userId, action, tokens, lastRefill
- Applied to: `sendMessage`, `sendMediaReply`, `importBatch`

---

### Klaro Consent Manager + Google Consent Mode v2

- **Status:** Done
- **What was built:** Open-source consent banner (Klaro! v0.7.21) integrated with Google Consent Mode v2 default-denied state — ready for GA4/GTM/Facebook Pixel/Google Ads addition.
- **New files:**
  - `lib/klaro/config.ts` — Klaro config + AR/EN translations + 5 services (essential, GA4, GTM, FB Pixel, Google Ads)
  - `lib/klaro/consent-mode.ts` — Consent Mode v2 default state script (all denied except security_storage + functionality_storage)
  - `components/consent/klaro-provider.tsx` — Client Component with `usePathname` re-init (fixes Klaro issue #552 for Next.js App Router)
  - `components/consent/cookie-settings-button.tsx` — Footer button to re-open settings modal
  - `styles/klaro.css` — Custom CSS with RTL overrides + WABDesk indigo branding
  - `app/cookies/page.tsx` — Cookie Policy legal page (legal page #4)
  - `components/marketing/cookies-content.tsx` — AR/EN Cookie Policy content with detailed cookie table (10 cookies)
  - `types/klaro.d.ts` — TypeScript declaration for `klaro/dist/klaro-no-css`
- **Modified files:**
  - `app/layout.tsx` — Injected Consent Mode default in `<head>` with `strategy="beforeInteractive"`; mounted `<KlaroProvider />` inside `LocaleProvider`
  - `components/marketing/marketing-footer.tsx` — Added Cookie Policy link + Cookie Settings button
  - `components/marketing/legal-page-wrapper.tsx` — Added `"cookies"` to `LegalPage` type, labels, siblingPages, and footer nav
  - `components/marketing/privacy-content.tsx` — Added analytics + advertising disclosure section (10a AR + 10a EN)
  - `lib/marketing/i18n.ts` — Added `footer.cookies` and `footer.cookieSettings` keys
- **Key decisions:**
  - Notice mode (non-blocking banner) over modal — chosen for conversion
  - Cookie storage with 365-day expiry over localStorage — better for compliance audits
  - Default state: all denied except `essential` and `security_storage` / `functionality_storage` — opt-in (GDPR-compliant)
  - Decline-all button visible (GDPR requirement)
  - 5 services pre-configured: essential, GA4, GTM, Facebook Pixel, Google Ads
  - CSS static-imported in `klaro-provider.tsx` (not dynamic) — standard Next.js pattern
- **Env vars required:** None (Klaro is fully client-side)
- **TypeScript:** 0 errors
- **Next step when adding GTM/GA:** Use `type="text/plain"` + `data-name="google-tag-manager"` on the script tag so Klaro controls loading
- **Post-merge fixes (2026-05-02):**
  - `privacy-content.tsx` — merged section 10a (analytics disclosure) into section 10 as leading paragraphs in both AR and EN; deleted standalone 10a section
  - `legal-page-wrapper.tsx` — added `<CookieSettingsButton />` to footer so /privacy, /terms, /dpa, /cookies pages all expose the Klaro modal trigger
  - Base CSS import confirmed: `klaro/dist/klaro.css` imported exactly once in `klaro-provider.tsx`; no duplicate in `styles/klaro.css`

---

### Klaro Consent Manager — Post-merge bug fixes (2026-05-02)

**Summary:** Four bugs were discovered and fixed after the Klaro integration was merged into the main branch. None of the bugs were regressions in the integration logic itself — they were surface-level issues that only became visible during browser testing across both EN and AR modes. The root causes split into three categories: a locale-system mismatch (Klaro was reading from the wrong locale store), missing translation keys that Klaro expected but the config didn't provide, and CSS selector specificity gaps that caused RTL layout to apply incorrectly.

**Bug 1 — Locale system mismatch**
`KlaroProvider` was using `LocaleContext` (cookie-driven, sets `<html dir>`) to determine the current locale. The marketing pages use a separate `useMarketingLocale()` hook (localStorage-driven). The two systems are not synchronized — the cookie value can lag behind the localStorage toggle, causing Klaro to render in the wrong language. Fixed by switching `KlaroProvider` to read locale from `useMarketingLocale()`, aligning it with the rest of the marketing site.
- **File modified:** `components/consent/klaro-provider.tsx`

**Bug 2 — Missing `purposeItem` translation keys + `poweredBy` footer link**
Klaro rendered `[missing translation]` placeholders for service-count labels (e.g. "1 service", "2 services") because the `purposeItem.service` and `purposeItem.services` keys were absent from both the AR and EN translation objects. Separately, the "Powered by Klaro" footer link was still visible despite the intent to hide it — `poweredBy: ""` (empty string) in per-locale `consentNotice` does not suppress the link; the correct fix is `disablePoweredBy: true` at the top level of the Klaro config object.
- **File modified:** `lib/klaro/config.ts`

**Bug 3 — RTL CSS applied to `<html>` instead of `#klaro` wrapper**
`styles/klaro.css` used `[dir="rtl"]` as the ancestor selector for all RTL overrides. Because `<html dir="rtl">` is set permanently by the cookie-driven locale system (even in EN mode — see architectural note below), this selector matched in all page states, applying RTL layout universally. The fix was to change the selector root from `[dir="rtl"]` to `#klaro[dir="rtl"]`, which matches only the Klaro wrapper element (Klaro sets `dir` on `#klaro` independently from the locale toggle). Additionally, four CSS rules were missing from the original RTL overrides: close button physical position, toggle switch anchor, service row padding, and footer button alignment. All four were added under the corrected selector.
- **File modified:** `styles/klaro.css`

**Bug 4 — Modal background color override not applying**
Klaro's own stylesheet uses `.cm-klaro` as part of its base selector, giving it higher specificity than WABDesk's overrides which targeted only `#klaro`. Fixed by prepending `.cm-klaro` to the override selector chain to match Klaro's base specificity.
- **File modified:** `styles/klaro.css`

**Files modified (complete list):**
- `components/consent/klaro-provider.tsx` — Stages A + B (locale fix + re-init on nav)
- `components/consent/cookie-settings-button.tsx` — Stage B (locale-aware re-open)
- `lib/klaro/config.ts` — Stage B (missing translation keys + `disablePoweredBy: true`)
- `styles/klaro.css` — Stage C (RTL selector specificity + 4 missing RTL rules + modal bg override)

**Architectural note — dual locale system (known limitation, not fixed here):**
The codebase has two separate locale systems that are not synchronized: (1) a cookie-driven system that sets `<html dir="rtl">` and is used by the dashboard and app shell; (2) a `localStorage`-based toggle used by the marketing pages via `useMarketingLocale()`. The result is that `<html dir="rtl">` is effectively permanent — it does not reflect the marketing site's current language toggle. Klaro is now isolated from this conflict via the `#klaro[dir]` selector, but any future CSS that uses `html[dir="rtl"]` or `[dir="rtl"]` at page root will face the same trap. This should be investigated and resolved before production — ideally by unifying both systems onto a single locale source of truth. Flagged as a pre-launch TODO.

---

### 013 — WhatsApp Coexistence (Stage 5 — UI Badge + Embedded Signup Config)

- **Status:** Stage 5 Complete — Feature fully shipped
- **Branch:** `feat/013-departments`
- **What was built in Stage 5:**
  - **`components/onboarding/embedded-signup-button.tsx`** (MODIFIED): Added `featureType: "whatsapp_business_app_onboarding"` and `sessionInfoVersion: "3"` to the `extras` object in `FB.login()`. `featureType` activates WhatsApp Business App Onboarding (coexistence) at Meta's side for all new WABA connections. `sessionInfoVersion: "3"` is the current Meta-recommended companion parameter. Verified via Meta developer docs (context7). The `waba_id` / `phone_number_id` postMessage callback is unaffected.
  - **`components/inbox/message-bubble.tsx`** (MODIFIED): Two changes:
    - Added `source?: "customer" | "api" | "mobile"` to the local `Message` type
    - Added `mobileBadge` element (📱 + "From mobile" / "من الموبايل") rendered only when `!isInbound && message.source === "mobile"`; badge sits in `timeRow` after the StatusTick; Tailwind-only, uses `ms-2` (logical margin, RTL-correct), green-50/green-700 colours, tooltip text; uses existing `useT()` hook with inline strings (no separate locale files — this codebase uses inline `t(en, ar)` at call sites)
  - **No schema changes** — Stage 5 is entirely UI + signup config
- **i18n strings added (inline, not in locale files):**
  - `t("From mobile", "من الموبايل")` — badge label
  - `t("Sent from the WhatsApp mobile app", "هذه الرسالة أُرسلت من تطبيق الواتساب على الهاتف")` — badge tooltip
- **Notes:**
  - `setup: ""` in extras is a pre-existing string (docs show `setup: {}` object form) — not changed in Stage 5; no functional impact
  - `sessionInfoVersion: "3"` tells Meta to include richer session info in the postMessage; the code only reads `waba_id`/`phone_number_id` from postMessage so this is a no-op for current behavior but future-proofs the signup flow
  - Badge is RTL-correct: `ms-2` = `margin-inline-start`, `justify-end` on timeRow aligns group to logical end; in RTL the badge renders at the physical right of the time row (logical start), which is expected
- **Carry-forward TODOs (not in Stage 5):**
  - `authorId: echo.from` in processEcho stores a phone number, not a Clerk ID — fix with `mobileSenderPhone` field when addressing analytics
  - Mobile-sent messages do not auto-reopen resolved conversations — revisit if reported as UX issue

---

### CSAT v2 — Major Update

- CSAT system overhauled (2026-04-27): now uses structured button template instead of free-form text
- Resolves the Meta 24-hour window violation (previous free-form Arabic text was non-compliant)
- Rating now captured via interactive button response (1–5 stars as button payload)
- `convex/csat.ts` substantially rewritten (+383 lines): better error handling, template-based send, rating capture via webhook
- Settings page enhanced: preview of CSAT message, toggle, delay config, test send button

---

### WA Business Profile + System User Fix (2026-04-27)

- **Resumable upload API** now used for profile photo uploads (large file support)
- **Permanent System User Token:** `WHATSAPP_API_TOKEN` env var used for all Meta API calls (not per-channel token)
- **System user assignment:** on Embedded Signup completion, WABDesk system user is auto-assigned to the WABA (`convex/channels.ts` — `assignSystemUser`)
- `convex/waBusinessProfile.ts` updated: uses `META_SYSTEM_USER_TOKEN` for profile API calls, resumable upload flow for photo

---

### Crons (Convex scheduled jobs)

| Job                          | Interval     | Handler                            |
| ---------------------------- | ------------ | ---------------------------------- |
| `process-due-followups`      | Every 30 min | `followUps.processDue`             |
| `check-automation-timeouts`  | Every 1 min  | `automations.checkNoReplyTimeouts` |
| `check-sla-breaches`         | Every 5 min  | `sla.checkBreaches`                |
| `check-channel-retention`    | Daily        | `channelRetention.checkExpired`    |
| `process-scheduled-messages` | Every 1 min  | `messageScheduling.sendScheduled`  |
| `refresh-team-presence`      | Every 2 min  | `teamPresence.refreshAll`          |

---

### 013 — WhatsApp Coexistence (Stage 4 — Echo Processing + Source Tagging + Automation Guard)

- **Status:** Stage 4 Finalized — Awaiting Stage 5 (UI badge + Embedded Signup featureType)
- **Branch:** `feat/013-departments`
- **What was built in Stage 4:**
  - **`convex/lib/echoDeduplication.ts`** (NEW): `computeContentHash` (Web Crypto SHA-256 of contentType:content) + `findDuplicateOutbound` — secondary dedup, signature `(ctx, { conversationId, content, contentType, echoTimestamp })`, window anchored on echo's own timestamp (not Date.now()), default 5000ms via `ECHO_DEDUP_WINDOW_MS` env var; queries `by_conversation` on `createdAt` (≡ timestamp for api-sent messages)
  - **`convex/webhooks/processors/echoes.ts`** (REPLACED stub): Full 3-level dedup — Level 1 primary by wamid → Level 2 secondary content hash + time window → Level 3 tertiary insert as source="mobile"; kill switch (`coexistenceEnabled === false`); conversation SLA clear on mobile reply; does NOT reopen resolved conversations; does NOT increment unreadCount; does NOT call evaluateAndFireAutomations
  - **`convex/webhooks/processors/history.ts`** (REPLACED stub): Historical message backfill — iterates changes, extracts message-like objects from new_value, deduplicates by wamid; source tagged by direction: outbound → "mobile", inbound → "customer" (source = message origin, not delivery mechanism); only attaches to existing conversations (does not create new ones)
  - **`convex/webhooks/processors/appStateSync.ts`** (validator tightened): appState arg changed from v.string() to v.union(v.literal("business_app"), v.literal("cloud_api")); returns reason: "v1_stub_no_logic"; still log-only in v1
  - **`convex/webhooks/meta.ts`** (minor): Removed ! non-null assertions on history and smb_app_state_sync using local const narrowing; narrowed payload type for smb_app_state_sync to literal union
  - **`convex/webhooks/processors/messages.ts`** (source tagging): Added source: "customer" to createInbound call; added messageSource: "customer" to evaluateAndFireAutomations call
  - **`convex/messages.ts`** — two changes:
    - `createInbound`: added optional source arg (v.optional(v.union(...))), persisted on insert
    - `setMetaMessageId`: idempotent (no-op if already set); if a different row already owns the wamid, logs `[SET_WAMID] wamid_already_owned_by_other_row` and returns — no data deleted
  - **`convex/inbox.ts`** sendMessage: added source: "api" on outbound message insert (notes get undefined)
  - **`convex/automations.ts`** evaluateAndFireAutomations: added optional messageSource arg; early-return guard if messageSource is present and !== "customer" (skips automation eval for echoes and API replies)
- **Stage 4 invariants verified:**
  - Echo for existing wamid → primary dedup no-op; api source stays api ✅
  - Echo arrives before wamid patch → secondary hash dedup patches wamid on api row, source stays api ✅
  - Echo with no outbound match → tertiary insert, source=mobile, no unread, no automation ✅
  - Two echoes for same wamid → second hits primary dedup, no-op ✅
  - Customer message → messageSource="customer" passes the guard, automations still fire ✅
  - setMetaMessageId: wamid already owned by other row → logs anomaly, returns, no delete ✅
  - History inbound messages → source="customer"; history outbound → source="mobile" ✅
- **Deferred to Stage 5:**
  - MessageBubble UI badge (📱 icon for source="mobile" messages)
  - Embedded Signup featureType parameter (whatsapp_business_app_onboarding)
- **Notes:**
  - Media for echoes: metaMediaId stored, mediaUrl left undefined (download deferred to future task)
  - ECHO_DEDUP_WINDOW_MS is configurable via env var (default 5000ms)
- **Deferred (carry-forward TODOs for future task):**
  - `authorId: echo.from` in processEcho stores a business phone number, not a Clerk user ID — violates type contract of the field. Future fix: add separate `mobileSenderPhone` field on messages, set `authorId: undefined` for mobile sends, use new field for mobile-sender lookups
  - Mobile-sent messages (source="mobile") do not auto-reopen resolved conversations. If the business owner replies from mobile to a resolved thread, the message is stored but the conversation status stays resolved. The resolved conversation may surface high in the inbox via `lastMessageAt` sort. Revisit if reported as UX issue

---

### 013 — WhatsApp Coexistence (Stage 3 — Schema & Webhook Routing)

- **Status:** Stage 3 Complete (Schema + Webhook Router) — Awaiting Stage 4 (Deduplication Logic)
- **Branch:** `feat/013-departments`
- **What was built in Stage 3:**
  - **Schema changes:** Added 3 optional fields to support coexistence (all backward-compatible):
    - `channels.coexistenceEnabled: v.optional(v.boolean())` — kill switch to disable echo processing (defaults true)
    - `messages.source: v.optional(v.union(v.literal("customer"), v.literal("api"), v.literal("mobile")))` — tracks message origin
    - `messages.metaMediaId: v.optional(v.string())` — stores raw Meta media ID for echoes (media download deferred to future task)
  - **Webhook routing:** Updated `convex/webhooks/meta.ts` to dispatch three coexistence webhook fields:
    - `smb_message_echoes` → `processEcho` stub (logs only in v1; full dedup logic in Stage 4)
    - `history` → `processHistory` stub (logs only in v1; state sync in Stage 4)
    - `smb_app_state_sync` → `processAppStateSync` stub (logs only in v1; state tracking in Stage 4)
  - **New processor files (stubs for Stage 4):**
    - `convex/webhooks/processors/echoes.ts` — echo processing entry point
    - `convex/webhooks/processors/history.ts` — conversation state sync entry point
    - `convex/webhooks/processors/appStateSync.ts` — app state sync entry point
  - **TypeScript compilation:** ✅ Passes cleanly (npx tsc --noEmit)
  - **Convex schema:** ✅ Codegen successful (npx convex codegen); zero compilation errors
- **Deferred to Stage 4:**
  - 3-level deduplication strategy (primary by wamid, secondary by content_hash + time window, tertiary insert as mobile message)
  - Automation guard (skip automation evaluation for mobile-source messages)
  - Conversation metadata update (lastMessageAt, unreadCount for echoes)
  - UI source badge display (📱 icon for mobile messages)
- **Deferred to Stage 5:**
  - Embedded Signup featureType parameter (`whatsapp_business_app_onboarding`)
  - Conversation thread message source badge rendering with RTL support
- **Notes:**
  - Phase 2 rollout strategy updated: coexistence auto-enabled for all tenants once Meta enables per WABA; `coexistenceEnabled` is kill switch only
  - Media download for echoes deferred beyond Stage 5; `metaMediaId` stored but `mediaUrl` remains undefined for echoes
  - Message routing stubs log to `console.log` with JSON tag for debugging; no real processing in v1

---

## 🔄 Partially Completed

### Revenue Analytics — Schema Exists, No UI

- **What's done:** `contacts.spent`, `contacts.spentCurrency` fields in schema; `followUps.expectedRevenue`, `followUps.currency` fields; `RevenueWidget` component exists
- **What's missing:** No UI to input actual revenue per conversation or per contact. No analytics query for revenue over time. `RevenueWidget` displays the field but there's no editor.

### WhatsApp Business Profile — Display Name "Pending Review" State

- **What's done:** `updateProfile` action in `convex/waBusinessProfile.ts`, full edit form at `/settings/channels/[channelId]/profile`
- **What's missing:** Display name changes require Meta review (not instant). Per CLAUDE.md §28, the UI should show an amber "Pending Meta Review" badge and poll for approval. This state tracking is not confirmed in the component scan.

---

## ❌ Not Started / Deferred

| Feature                                  | Notes                                                                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| ~~**Paddle Billing Integration**~~       | ✅ Completed                                                                                                                |
| ~~**Broadcasts Sending Loop**~~          | ✅ Completed                                                                                                                |
| ~~**Shareable Invite Link UI**~~         | ✅ Completed                                                                                                                |
| ~~**Conversation / Message Search**~~    | ✅ Completed — `convex/search.ts`                                                                                           |
| ~~**Batch Actions on Inbox**~~           | ✅ Completed — `convex/batchActions.ts`                                                                                     |
| ~~**Agent Online/Offline Status**~~      | ✅ Completed — presence system via `convex/presence.ts`                                                                     |
| ~~**Conversation Merging**~~             | ✅ Completed — `convex/conversationMerge.ts`                                                                                |
| ~~**Rate Limiting**~~                    | ✅ Completed — `convex/lib/rateLimit.ts`                                                                                    |
| ~~**Email Notifications**~~              | ✅ Completed — React Email + Resend, 9 template pairs                                                                       |
| ~~**Message Scheduling**~~               | ✅ Completed — `convex/messageScheduling.ts`                                                                                |
| **Invite by WhatsApp**                   | CLAUDE.md §19: Admin enters agent phone → send invite via WhatsApp. Low priority — email + shareable link cover most cases. |
| **WA Display Name Pending Review Badge** | Profile edit form exists; amber "Pending Meta Review" badge not confirmed in UI component scan                              |
| **Revenue Analytics UI**                 | `contact.spent` schema exists, no input UI or revenue-over-time query                                                       |
| **AI / Chatbot Integration**             | Rules-based automation only. No LLM-powered auto-replies. Phase 2.                                                          |
| **WhatsApp Catalog**                     | CLAUDE.md §6 explicitly deferred to Phase 2.                                                                                |
| **WooCommerce / Shopify Integration**    | Phase 2.                                                                                                                    |
| **WhatsApp OTP**                         | Phase 2.                                                                                                                    |

---

## 🗂️ Current File Structure

```
/
├── app/
│   ├── (dashboard)/              # Protected routes (Clerk-gated)
│   │   ├── inbox/                # Shared inbox (main feature)
│   │   ├── contacts/             # CRM-lite contact management
│   │   ├── lists/                # Contact list segmentation
│   │   ├── broadcasts/           # Broadcast campaigns + broadcast templates
│   │   ├── automations/          # Automation rules builder
│   │   ├── analytics/            # Team analytics (Admin/Supervisor)
│   │   ├── my-stats/             # Personal stats (all roles)
│   │   └── settings/
│   │       ├── layout.tsx         # Settings sub-nav wrapper
│   │       ├── channels/         # Channel list + per-channel settings + WA profile
│   │       ├── team/             # Team members, invite, roles, member profile modal
│   │       ├── labels/           # Conversation label library
│   │       ├── quick-replies/    # Quick reply CRUD (with variable fill-in)
│   │       ├── templates/        # Message templates + Template Library tab
│   │       ├── csat/             # CSAT v2 settings (button template, preview, test send)
│   │       ├── export/           # Data export
│   │       └── billing/          # Paddle billing
│   ├── api/webhook/whatsapp/     # Meta webhook endpoint (GET verify + POST handler)
│   ├── onboarding/               # Onboarding wizard
│   ├── sign-in/, sign-up/        # Clerk auth pages
│   ├── join/[token]/             # Invite link join page
│   ├── privacy/, terms/, dpa/    # Legal pages
│   └── page.tsx                  # Marketing landing page
├── components/
│   ├── inbox/                    # Conversation list, thread, message bubble, input, search
│   ├── contacts/                 # Contact list, panel, timeline, CSV import
│   ├── analytics/                # Dashboard charts (Recharts)
│   ├── automations/              # Rule cards, form, business hours
│   ├── broadcasts/               # Campaign list, creation wizard, broadcast template builder
│   ├── lists/                    # Contact list pages
│   ├── onboarding/               # Wizard steps
│   ├── settings/                 # All settings page components + settings-sub-nav.tsx
│   ├── shell/                    # Sidebar, user menu, notification bell, presence-initializer
│   ├── team/                     # member-profile-modal.tsx + member-profile/ tabs
│   ├── templates/                # Template picker, fill form, library tab, meta submit form
│   ├── marketing/                # Landing page sections + legal page content components
│   └── ui/                       # shadcn/ui primitives + presence-indicator, team-presence-dropdown
├── convex/
│   ├── schema.ts                 # 32-table schema (all real)
│   ├── http.ts                   # metaWebhook HTTP action
│   ├── crons.ts                  # 6 scheduled jobs
│   ├── actions/
│   │   ├── sendWhatsAppMessage.ts  # All outbound Meta API calls
│   │   ├── roundRobin.ts           # Round-robin assignment logic
│   │   ├── validateInvite.ts       # Invite token validation
│   │   ├── channelRetentionAction.ts # Channel purge action
│   │   ├── notifyEmail.ts          # Email dispatch (AR/EN routing)
│   │   ├── sendEmail.ts            # React Email + Resend send action
│   │   ├── sendInviteWhatsApp.ts   # WhatsApp invite sending
│   │   └── processBroadcastBatch.ts # Batched broadcast sending
│   ├── lib/
│   │   ├── auth.ts                # getCallerIdentity, assertAdmin, assertAdminOrSupervisor
│   │   ├── encryption.ts          # AES-256-GCM for access tokens
│   │   ├── planLimits.ts          # Plan quota checks
│   │   └── rateLimit.ts           # Token-bucket rate limiter
│   ├── emails/                    # React Email base layout + template components
│   ├── inbox.ts, conversations.ts, messages.ts, messageScheduling.ts
│   ├── contacts.ts, customFields.ts, contactEvents.ts, contactsImport.ts, contactsImportHelpers.ts
│   ├── contactLists.ts, broadcasts.ts, broadcastTemplates.ts, metaTemplates.ts
│   ├── channels.ts, channelMembers.ts, channelRetention.ts
│   ├── departments.ts, departmentMembers.ts
│   ├── analytics.ts, conversationMetrics.ts, search.ts
│   ├── labels.ts, quickReplies.ts, messageTemplates.ts
│   ├── csat.ts, sla.ts, notifications.ts
│   ├── automations.ts, followUps.ts, batchActions.ts, conversationMerge.ts
│   ├── members.ts, memberQueries.ts
│   ├── presence.ts, teamPresence.ts, teamPresenceQueries.ts
│   ├── onboarding.ts, orgMembers.ts
│   ├── waBusinessProfile.ts, export.ts
│   ├── webhookEvents.ts, migrations.ts
│   └── seed.ts                    # Dev-only seed data
├── emails/                        # React Email template files (9 types × AR+EN = 18 files)
├── lib/
│   ├── utils.ts, phoneGeo.ts, automationHelpers.ts, templateHelpers.ts, cityData.ts
│   ├── templateLibrary.ts         # 66 pre-built templates with industry tags
│   ├── shell/                     # nav-config, role-utils, locale-action, types
│   ├── i18n/                      # AR/EN translation context (useT, useLocale)
│   └── marketing/                 # Pricing data, marketing i18n
├── hooks/
│   ├── use-mobile.ts, use-member-profile.ts, use-presence.ts
├── types/
│   └── meta.ts                    # TypeScript types for Meta API payloads
├── middleware.ts                   # Clerk auth middleware
└── CLAUDE.md                       # Project spec (do not modify unless asked)
```

---

## 📋 Recommended Next Steps (Priority Order)

| #   | Task                                     | What's needed                                                                                                                                      | Blocker?                                     |
| --- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1   | **WA Display Name Pending Review Badge** | `wa-business-profile.tsx`: show amber "Pending Meta Review" badge for display name changes; poll Meta API for approval — CLAUDE.md §28 requirement | Low — polish                                 |
| 2   | **Revenue Analytics UI**                 | Input field for `contact.spent` in contact panel; revenue-over-time chart in analytics dashboard                                                   | Nice-to-have                                 |
| 3   | **Invite by WhatsApp**                   | CLAUDE.md §19: send invite link via WhatsApp when admin enters agent phone number                                                                  | Low priority — email + link cover most cases |
| 4   | **CSAT Meta Template Approval**          | Submit CSAT button template to Meta for pre-approval; currently unverified                                                                         | Required before production CSAT use          |
| 5   | **Production Hardening**                 | Webhook signature verification, SLA breach clearing audit, CSAT template approval                                                                  | Required before launch                       |
