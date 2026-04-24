# WaDesk — Build Progress

> Single source of truth for project progress. Read by Claude Chat (project manager) to stay updated.
> **Last audited:** 2026-04-17 — Shareable Invite Link UI completed.
> Never modify CLAUDE.md unless explicitly asked.

---

## Project Summary

**WaDesk** is an Arabic-first WhatsApp Business multi-agent customer support SaaS for SMBs in Egypt and the Gulf.  
**Stack:** Next.js 15 (App Router) · Convex (backend + real-time DB) · Clerk (auth + multi-tenant orgs) · shadcn/ui · Tailwind CSS v4 · Meta WhatsApp Cloud API · Paddle (billing integrated)  
**Current branch:** `feat/013-departments` (merged broadcasts sending loop from task/015)  
**Build status:** ✅ No TypeScript errors · ✅ Convex schema deployed · ✅ Dev server runs · ✅ Outbound messages wired to Meta API · ✅ Broadcasts batched sending implemented

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

<<<<<<< HEAD
### Analytics
- **Denormalized read-model:** `conversationMetrics` table updated via `ctx.scheduler.runAfter` (non-blocking)
- `convex/analytics.ts`: `getTeamSummary`, `getAgentPerformance`, `getMyStats`, `getConversationVolume`, `getLabelDistribution`, `getStageDistribution`, `getContactActivityTimeline`
- `convex/conversationMetrics.ts`: internal mutations for create, recordFirstResponse, recordResolution, incrementMessageCount, recordCsatScore
- Charts: Recharts via shadcn/ui chart (VolumeChart, LabelDistributionChart, StageFunnelChart, CustomerLifecycleChart, ContactActivityTimeline)
- Role gating: team-wide analytics = Admin/Supervisor; my-stats = all roles
- Pages: `/analytics`, `/my-stats`
- ⚠️ Revenue widget exists (`contact.spent`) but no UI to input or analyze revenue per conversation
=======
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
>>>>>>> task/015-broadcasts-sending-loop

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

### Marketing Site
- Full landing page: hero, features, pricing, differentiators, CTA, footer
- Pricing table with 4 tiers (Free / Starter / Growth / Business) — no checkout flow yet
- Arabic/English locale switching
- Mobile nav drawer
- Animated inbox mockup component
- Route: `/`

---

### Crons (Convex scheduled jobs)
| Job | Interval | Handler |
|---|---|---|
| `process-due-followups` | Every 30 min | `followUps.processDue` |
| `check-automation-timeouts` | Every 1 min | `automations.checkNoReplyTimeouts` |
| `check-sla-breaches` | Every 5 min | `sla.checkBreaches` |

---

## 🔄 Partially Completed

### Revenue Analytics — Schema Exists, No UI
- **What's done:** `contacts.spent`, `contacts.spentCurrency` fields in schema; `followUps.expectedRevenue`, `followUps.currency` fields; `RevenueWidget` component exists
- **What's missing:** No UI to input actual revenue per conversation or per contact. No analytics query for revenue over time. `RevenueWidget` displays the field but there's no editor.

### WhatsApp Business Profile — Display Name "Pending Review" State
- **What's done:** `updateProfile` action in `convex/waBusinessProfile.ts`, full edit form at `/settings/channels/[channelId]/profile`
- **What's missing:** Display name changes require Meta review (not instant). Per CLAUDE.md §28, the UI should show an amber "Pending Meta Review" badge and poll for approval. This state tracking is not confirmed in the component scan.

---

## ❌ Not Started

| Feature | Notes from CLAUDE.md |
|---|---|
| ~~**Paddle Billing Integration**~~ | ✅ Completed — Paddle.js checkout, plan switching, webhook processing all implemented (Apr 17-24) |
| ~~**Broadcasts Sending Loop**~~ | ✅ Completed — Batched sending with retry logic implemented (merged from task/015) |
| **Invite by WhatsApp** | CLAUDE.md §19: Admin enters agent phone → send invite via WhatsApp. Only email invite implemented. |
| ~~**Shareable Invite Link UI**~~ | ✅ Completed — multi-link per tenant with labels, role-gated creation, copy/regenerate/revoke, expiry support, bilingual |
| **Conversation / Message Search** | No full-text search across conversations or message content. |
| **Batch Actions on Inbox** | No bulk tag/label/reassign/close for multiple conversations. |
| **Agent Online/Offline Status** | Round-robin assigns regardless of status. No presence system. |
| **Conversation Merging** | No duplicate detection or merge flow. |
| **Rate Limiting** | No per-user rate limits on Convex mutations. |
| **Email Notifications** | Only in-app notifications implemented. No email for SLA breach / follow-up due. |
| **Message Scheduling** | No future-scheduled outbound messages (broadcasts are immediate only). |
| **AI / Chatbot Integration** | Rules-based automation only. No LLM-powered auto-replies. |
| **WhatsApp Catalog** | CLAUDE.md §6 explicitly deferred to Phase 2. |
| **WooCommerce / Shopify Integration** | Phase 2. |
| **WhatsApp OTP** | Phase 2. |

---

## 🗂️ Current File Structure

```
/
├── app/
│   ├── (dashboard)/              # Protected routes (Clerk-gated)
│   │   ├── inbox/                # Shared inbox (main feature)
│   │   ├── contacts/             # CRM-lite contact management
│   │   ├── lists/                # Contact list segmentation
│   │   ├── broadcasts/           # Broadcast campaigns
│   │   ├── automations/          # Automation rules builder
│   │   ├── analytics/            # Team analytics (Admin/Supervisor)
│   │   ├── my-stats/             # Personal stats (all roles)
│   │   └── settings/
│   │       ├── channels/         # Channel list + per-channel settings + WA profile
│   │       ├── team/             # Team members, invite, roles
│   │       ├── labels/           # Conversation label library
│   │       ├── quick-replies/    # Quick reply CRUD
│   │       ├── templates/        # Message templates with variables
│   │       ├── csat/             # CSAT enable/delay settings
│   │       ├── export/           # Data export (UI only)
│   │       └── billing/          # Billing (stub)
│   ├── api/webhook/whatsapp/     # Meta webhook endpoint (GET verify + POST handler)
│   ├── onboarding/               # Onboarding wizard
│   ├── sign-in/, sign-up/        # Clerk auth pages
│   ├── join/[token]/             # Invite link join page
│   └── page.tsx                  # Marketing landing page
├── components/
│   ├── inbox/                    # Conversation list, thread, message bubble, input
│   ├── contacts/                 # Contact list, panel, timeline, CSV import
│   ├── analytics/                # Dashboard charts (Recharts)
│   ├── automations/              # Rule cards, form, business hours
│   ├── broadcasts/               # Campaign list, creation wizard
│   ├── lists/                    # Contact list pages
│   ├── onboarding/               # Wizard steps
│   ├── settings/                 # All settings page components
│   ├── shell/                    # Sidebar, user menu, notification bell, breadcrumb
│   ├── marketing/                # Landing page sections
│   └── ui/                       # shadcn/ui primitives
├── convex/
│   ├── schema.ts                 # 27-table schema (all real)
│   ├── http.ts                   # metaWebhook HTTP action (inbound message handler)
│   ├── crons.ts                  # 3 scheduled jobs (follow-ups, automations, SLA)
│   ├── actions/
│   │   ├── sendWhatsAppMessage.ts # All outbound Meta API calls
│   │   ├── roundRobin.ts          # Round-robin assignment logic
│   │   └── validateInvite.ts      # Invite token validation
│   ├── lib/
│   │   ├── auth.ts                # getCallerIdentity, assertAdmin, assertAdminOrSupervisor
│   │   ├── encryption.ts          # AES-256-GCM for access tokens
│   │   └── planLimits.ts          # Plan quota checks
│   ├── inbox.ts, conversations.ts, messages.ts
│   ├── contacts.ts, customFields.ts, contactEvents.ts, contactsImport.ts, contactsImportHelpers.ts
│   ├── contactLists.ts, broadcasts.ts
│   ├── channels.ts, channelMembers.ts
│   ├── analytics.ts, conversationMetrics.ts
│   ├── labels.ts, quickReplies.ts, messageTemplates.ts
│   ├── csat.ts, sla.ts, notifications.ts
│   ├── automations.ts, followUps.ts
│   ├── onboarding.ts, orgMembers.ts
│   ├── waBusinessProfile.ts
│   ├── export.ts                  # Export actions (contacts CSV/JSON, conversations JSON/CSV/HTML) + getExportStats query
│   └── seed.ts                    # Dev-only seed data
├── lib/
│   ├── utils.ts                   # cn(), date helpers
│   ├── phoneGeo.ts                # Country detection from phone number
│   ├── automationHelpers.ts       # Rule evaluation, business hours check
│   ├── templateHelpers.ts         # {{variable}} interpolation
│   ├── cityData.ts                # City data for contact filters
│   ├── shell/                     # nav-config, role-utils, locale-action, types
│   ├── i18n/                      # AR/EN translation context (useT, useLocale)
│   └── marketing/                 # Pricing data, marketing i18n
├── hooks/
│   └── use-mobile.ts              # Media query hook
├── types/
│   └── meta.ts                    # TypeScript types for Meta API payloads
├── middleware.ts                   # Clerk auth middleware
└── CLAUDE.md                       # Project spec (do not modify unless asked)
```

---

## 📋 Recommended Next Steps (Priority Order)

| # | Task | What's needed | Blocker? |
|---|---|---|---|
| 1 | **Broadcasts — Complete Sending Loop** | In `convex/broadcasts.ts` `send` action: loop `recipientSnapshot`, call `sendWhatsAppMessage.sendMessage` per contact, update `sentCount`/`failedCount` incrementally | ⚠️ Broadcasts unusable until done |
| 2 | **Billing / Polar.sh Integration** | Polar.sh webhook to update `tenant.plan` in Convex on payment events; pricing page checkout buttons wired to Polar | Required for monetization |
| 3 | ~~**Shareable Invite Link UI**~~ | ✅ Done — multi-link per tenant, label/role/expiry, copy/regenerate/revoke | ✅ Complete |
| 4 | **WA Profile — Display Name Pending Review Badge** | In `wa-business-profile.tsx`: track display name change state, show amber badge, poll Meta API for approval status | Low — partial polish |
| 5 | **Revenue Analytics UI** | Add input in contact panel / conversation detail for `contact.spent`; add revenue-over-time query to `analytics.ts` | Nice-to-have |
| 6 | **Invite by WhatsApp** | CLAUDE.md §19: send invite link via WhatsApp API when admin enters agent phone number | Low priority vs. email invite |
| 7 | **Conversation Search** | Full-text search across messages (Convex search index or external) | UX improvement |
