# PROJECT_STATE.md — WABDesk

> **AI INSTRUCTION (CRITICAL):**  
> Any AI agent or assistant working on this repository **MUST** read this file before writing or modifying any code.  
> Upon completing any task, the AI **MUST** automatically update this file to reflect the new state of the project.  
> **DO NOT BREAK THIS LOOP.**

---

**Last Updated:** 2026-05-03 UTC  
**Current Branch:** feat/013-departments  
**Main Branch:** 002-agent-roles  
**Build Status:** ✅ TypeScript: 0 errors | ✅ 40-table schema deployed | ✅ React Email system live | ✅ Member profile modal complete | ✅ Channel retention system active | ✅ Tabbed transfer + cross-branch forward | ✅ CSAT end-to-end working | ✅ 24h conversation reopen window | ✅ Conversation activity pills + claim

---

## 1. Project Architecture Overview

**WABDesk** is an Arabic-first multi-agent WhatsApp Business platform built for SMBs in Arabic-speaking markets.

### Core Architecture Patterns

- **Multi-Tenant Model:** Each tenant (Clerk `orgId`) has complete data isolation
- **Real-time First:** Convex subscriptions for live updates (no polling)
- **Server-Side Security:** All WhatsApp API calls via Convex actions (never client-side)
- **Role-Based Access Control:** Admin, Supervisor, Agent roles enforced at database query level
- **Plan-Based Feature Gating:** Free, Starter, Growth, Business plans with enforced limits
- **Token Encryption:** All WABA access tokens encrypted at rest (AES-256-GCM)

### Directory Structure

```
WABDesk/
├── app/
│   ├── (auth)/              # Sign-in/sign-up pages (Clerk)
│   ├── (dashboard)/         # Main app routes (inbox, contacts, analytics, etc.)
│   ├── api/                 # Webhook endpoints (WhatsApp, Paddle)
│   ├── onboarding/          # Multi-step onboarding flow
│   ├── select-org/          # Org selection after sign-up
│   ├── accept-invite/       # Accept org invite
│   └── join/[token]/        # Join via invite link
├── components/
│   ├── analytics/           # Analytics dashboard components
│   ├── automations/         # Automation rule UI
│   ├── broadcasts/          # Broadcast campaign UI
│   ├── contacts/            # Contact management UI
│   ├── inbox/               # Conversation inbox UI
│   ├── lists/               # Contact list UI
│   ├── marketing/           # Marketing/landing page components
│   ├── onboarding/          # Onboarding step components
│   ├── settings/            # Settings page components
│   ├── shell/               # App shell (nav, header, sidebar)
│   ├── templates/           # Message template UI
│   └── ui/                  # shadcn/ui components
├── convex/
│   ├── _generated/          # Convex auto-generated types
│   ├── actions/             # Convex actions (external API calls)
│   ├── lib/                 # Shared Convex utilities
│   ├── schema.ts            # Database schema (22 tables)
│   ├── http.ts              # HTTP webhook router
│   ├── crons.ts             # Scheduled jobs
│   └── [feature].ts         # Feature-specific queries/mutations
└── lib/
    ├── shell/               # Shell configuration (nav, types)
    ├── i18n/                # Internationalization
    ├── hooks/               # React hooks
    ├── marketing/           # Marketing page utilities
    └── [utils].ts           # Utility functions
```

---

## 2. Tech Stack

| Layer            | Technology                       | Version | Purpose                                   |
| ---------------- | -------------------------------- | ------- | ----------------------------------------- |
| Framework        | Next.js (App Router)             | 15.2.2  | React framework + SSR                     |
| Backend/Database | Convex                           | 1.34.1  | Real-time database + serverless functions |
| Authentication   | Clerk                            | 7.0.8   | Multi-tenant auth + org management        |
| Payments         | Paddle.js                        | 1.6.2   | Subscription billing (MoR)                |
| UI Components    | shadcn/ui                        | Latest  | Component library (Base UI + Radix)       |
| Styling          | Tailwind CSS                     | 4.2.2   | Utility-first CSS                         |
| Animations       | Framer Motion                    | 12.38.0 | UI animations                             |
| Charts           | Recharts                         | 3.8.1   | Analytics visualizations                  |
| Icons            | Lucide React                     | 0.468.0 | Icon library                              |
| Phone Validation | libphonenumber-js                | 1.12.41 | E.164 phone number normalization          |
| CSV Parsing      | papaparse                        | 5.5.3   | Client-side CSV import                    |
| Date Utilities   | date-fns                         | 4.1.0   | Date formatting                           |
| Language         | TypeScript                       | 5.6.2   | Type-safe JavaScript                      |
| WhatsApp API     | Meta WhatsApp Business Cloud API | v19.0+  | WhatsApp messaging                        |
| Hosting          | Vercel                           | —       | Next.js hosting                           |
| Package Manager  | npm                              | —       | Dependency management                     |
| Build Tool       | Turbopack                        | —       | Fast bundler (Next.js 15 default)         |

---

## 3. Database Schema (32 Tables)

All tables are tenant-scoped via `tenantId` (Clerk `orgId`). Convex indexes enforce multi-tenant isolation.

### Core Data Model

| Table                     | Purpose                                            | Key Fields                                                                                                    |
| ------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `tenants`                 | Tenant/organization records                        | `tenantId`, `plan`, `orgName`, `paddle_customer_id`                                                           |
| `channels`                | WhatsApp Business numbers (WABA connections)       | `tenantId`, `phoneNumberId`, `wabaId`, `accessToken` (encrypted), `status`, `deletedAt`, `retentionExpiresAt` |
| `contacts`                | Customer/contact profiles                          | `tenantId`, `phone`, `displayName`, `stage`, `tags`, `totalConversations`                                     |
| `contactLists`            | Filtered contact lists for broadcasts              | `tenantId`, `name`, `filters` (countries, stages, tags)                                                       |
| `conversations`           | Conversation threads                               | `tenantId`, `channelId`, `contactId`, `status`, `assignedAgentId`, `labels`                                   |
| `messages`                | Individual messages                                | `conversationId`, `direction`, `content`, `contentType`, `metaMessageId`, `scheduledAt`                       |
| `quickReplies`            | Saved quick response templates (with variables)    | `tenantId`, `title`, `content`, `category`, `variables[]`                                                     |
| `messageTemplates`        | Message templates with `{{variable}}` placeholders | `tenantId`, `title`, `body`, `variables[]`, `language`                                                        |
| `metaTemplates`           | Meta-approved broadcast templates (cached)         | `tenantId`, `channelId`, `name`, `status`, `components`                                                       |
| `broadcastTemplates`      | Tenant-defined broadcast templates                 | `tenantId`, `name`, `category`, `language`, `header`, `body`, `buttons`, `metaStatus`                         |
| `automationRules`         | Automation rules (if-this-send-that)               | `tenantId`, `triggerType`, `keywordList`, `responseTemplate`, `priority`                                      |
| `businessHours`           | Business hours schedule                            | `tenantId`, `timezone`, `schedule`                                                                            |
| `ruleFireLog`             | Automation execution log (deduplication)           | `tenantId`, `ruleId`, `conversationId`, `firedAt`                                                             |
| `followUps`               | Scheduled follow-up messages                       | `tenantId`, `contactId`, `scheduledAt`, `status`, `expectedRevenue`                                           |
| `broadcasts`              | Broadcast campaigns                                | `tenantId`, `name`, `listId`, `status`, `recipientSnapshot`, `retryMap`                                       |
| `csatSettings`            | CSAT survey configuration                          | `tenantId`, `enabled`, `delayMinutes`                                                                         |
| `conversationMetrics`     | Denormalized analytics data                        | `tenantId`, `conversationId`, `firstResponseTimeSeconds`, `csatScore`                                         |
| `conversationLabels`      | Label definitions                                  | `tenantId`, `name`, `color`, `emoji`                                                                          |
| `channelMembers`          | Channel-agent assignments                          | `tenantId`, `channelId`, `userId`, `role`                                                                     |
| `departments`             | Channel groups (departments)                       | `tenantId`, `name`, `description`, `channelIds`                                                               |
| `departmentMembers`       | Department member assignments                      | `tenantId`, `departmentId`, `userId`, `role`                                                                  |
| `customFields`            | Custom contact fields (key-value pairs)            | `tenantId`, `contactId`, `key`, `value`                                                                       |
| `contactEvents`           | Contact activity timeline                          | `tenantId`, `contactId`, `type`, `metadata`                                                                   |
| `notifications`           | In-app notifications (followups, SLA breaches)     | `tenantId`, `userId`, `type`, `message`, `read`                                                               |
| `notificationPreferences` | Per-member email/in-app notification toggles       | `tenantId`, `userId`, `emailEnabled`, `inAppEnabled`, `eventTypes[]`                                          |
| `inviteLinks`             | Time-limited team invite links                     | `tenantId`, `token`, `expiresAt`, `revoked`, `defaultRole`                                                    |
| `onboardingState`         | Onboarding progress tracking                       | `tenantId`, `completedSteps[]`, `completedAt`                                                                 |
| `memberProfiles`          | Rich member profiles (bio, contact info)           | `tenantId`, `userId`, `bio`, `jobTitle`, `phone`, `avatar`                                                    |
| `memberActionLog`         | Audit trail for member management actions          | `tenantId`, `actorId`, `targetId`, `action`, `changedFields`                                                  |
| `presence`                | Real-time user presence status                     | `tenantId`, `userId`, `status`, `lastSeen`                                                                    |
| `rateLimits`              | Token-bucket rate limiting per user+action         | `userId`, `action`, `tokens`, `lastRefill`                                                                    |
| `webhook_events`          | Webhook event debug log                            | `tenantId`, `eventType`, `payload`, `processedAt`                                                             |

---

## 4. Implemented Features (Complete Inventory)

### ✅ Authentication & Multi-Tenancy

- **File:** `app/(auth)/sign-in/[[...sign-in]]/page.tsx`, `app/(auth)/sign-up/[[...sign-up]]/page.tsx`
- **Backend:** `convex/lib/auth.ts` — `getCallerIdentity`, `getCallerRole`, `assertAdmin`, `assertAdminOrSupervisor`
- **Status:** ✅ Complete
- **Features:**
  - Clerk-based sign-in/sign-up
  - Automatic org creation on first sign-up
  - Multi-tenant isolation (Clerk `orgId` = `tenantId`)
  - Role-based access control (Admin, Supervisor, Agent)

### ✅ Onboarding Flow

- **File:** `app/onboarding/page.tsx`, `components/onboarding/*`
- **Backend:** `convex/onboarding.ts`
- **Status:** ✅ Complete
- **Features:**
  - Multi-step onboarding wizard
  - WhatsApp channel connection
  - Test message verification
  - Progress tracking via `onboardingState` table

### ✅ Conversation Management

- **File:** `app/(dashboard)/inbox/[id]/page.tsx`, `components/inbox/*`
- **Backend:** `convex/conversations.ts`, `convex/inbox.ts`
- **Status:** ✅ Complete
- **Features:**
  - Multi-status conversations: `open`, `pending`, `resolved`
  - Assignment modes: `first_reply`, `manual`, `round_robin`
  - Role-based visibility (Admin/Supervisor see all, Agents see assigned + unassigned)
  - Conversation labels
  - SLA breach tracking
  - Unread count tracking

### ✅ Contact Management

- **File:** `app/(dashboard)/contacts/[id]/page.tsx`, `components/contacts/*`
- **Backend:** `convex/contacts.ts`, `convex/customFields.ts`, `convex/contactEvents.ts`
- **Status:** ✅ Complete
- **Features:**
  - Contact lifecycle stages: `lead`, `prospect`, `customer`, `retained`, `churned`
  - Auto-capture from WhatsApp messages
  - Manual contact creation
  - CSV import (with deduplication) — `convex/contactsImport.ts`, `convex/contactsImportHelpers.ts`
  - Custom fields (key-value pairs)
  - Contact events timeline (stage changes, assignments, notes, tags, followups, conversations)
  - Tag management
  - Search by name (Convex search index) or phone number
  - Pagination support

### ✅ Messaging

- **File:** `app/(dashboard)/inbox/[id]/page.tsx`, `components/inbox/message-input.tsx`
- **Backend:** `convex/messages.ts`, `convex/actions/sendWhatsAppMessage.ts`
- **Status:** ✅ Complete
- **Features:**
  - Multi-type messages: `text`, `image`, `audio`, `video`, `document`, `sticker`, `location`, `template`, `unsupported`
  - Internal notes (visible only to agents)
  - Quick replies — `convex/quickReplies.ts`
  - Message templates with variable interpolation — `convex/messageTemplates.ts`
  - Quote replies (threaded messages)
  - Reactions (emoji reactions)
  - Soft deletion (via `deletedAt` timestamp)
  - Deduplication via `metaMessageId`
  - Async WhatsApp send via Convex scheduler

### ✅ WhatsApp Webhook Integration

- **File:** `app/api/webhook/whatsapp/route.ts` (Next.js route for initial verification only)
- **Backend:** `convex/http.ts` — `metaWebhook` HTTP action
- **Status:** ✅ Complete
- **Features:**
  - GET: Hub verification (verifies `META_WEBHOOK_VERIFY_TOKEN`)
  - POST: Incoming message processing (signature verification, message parsing, contact auto-creation, conversation creation/update)
  - Status updates: `sent`, `delivered`, `read`, `failed`
  - Multi-type content parsing (text, image, audio, video, document, sticker, location, interactive, system)
  - Deduplication via `metaMessageId`
  - Webhook signature verification (optional, via `WHATSAPP_APP_SECRET`)

### ✅ WhatsApp Channel Management

- **File:** `app/(dashboard)/settings/channels/page.tsx`, `components/settings/channels-list.tsx`
- **Backend:** `convex/channels.ts`
- **Status:** ✅ Complete
- **Features:**
  - Connect/disconnect WABA numbers (Meta Embedded Signup)
  - Token encryption at rest (AES-256-GCM) — `convex/lib/encryption.ts`
  - Channel status tracking: `connecting`, `active`, `disconnected`, `reconnect_required`
  - Plan-based channel limits (Free: 1, Starter: 2, Growth: 5, Business: Unlimited)
  - Per-channel assignment mode configuration
  - SLA threshold configuration (per channel)

### ✅ WhatsApp Business Profile Editing

- **File:** `app/(dashboard)/settings/channels/[channelId]/profile/page.tsx`
- **Backend:** `convex/waBusinessProfile.ts`
- **Status:** ✅ Complete (2026-04-27 major update)
- **Features:**
  - Edit profile photo, description, address, category, website
  - Display name changes (requires Meta review — shows pending status)
  - Growth+ plan gating
  - Field-by-field auto-save
  - **Resumable upload API** for profile photos (large file support)
  - **Permanent System User Token** (`WHATSAPP_API_TOKEN` env var) used for all Meta profile API calls
  - **System user auto-assigned** to WABA on Embedded Signup completion (`assignSystemUser` in `channels.ts`)

### ✅ Automation Rules Engine

- **File:** `app/(dashboard)/automations/page.tsx`, `components/automations/*`
- **Backend:** `convex/automations.ts`, `lib/automationHelpers.ts`
- **Status:** ✅ Complete
- **Features:**
  - 4 trigger types: `keyword`, `outside_hours`, `first_message`, `no_reply_timeout`
  - Template interpolation: `{{customer_name}}`, `{{business_name}}`, `{{agent_name}}`, `{{current_time}}`
  - Priority-ordered rule execution (renumbering on deletion)
  - Fire log to prevent duplicate execution
  - Business hours configuration (timezone-aware) — `convex/businessHours.ts`
  - Cron job for timeout checking (`convex/crons.ts` — `checkNoReplyTimeouts`)
  - Plan limits: Free (2), Starter (10), Growth (30), Business (Unlimited)
  - Admin + Supervisor can manage rules

### ✅ Broadcast Campaigns

- **File:** `app/(dashboard)/broadcasts/page.tsx`, `app/(dashboard)/broadcasts/new/page.tsx`
- **Backend:** `convex/broadcasts.ts`, `convex/actions/processBroadcastBatch.ts`
- **Status:** ✅ Complete (including batched sending loop)
- **Features:**
  - Campaign lifecycle: `draft`, `sending`, `sent`, `failed`
  - Contact list targeting (filters: countries, cities, stages, tags) — `convex/contactLists.ts`
  - Meta template message integration (pre-approved templates)
  - Recipient snapshot at send time (immutable record)
  - **Batched sending:** 50 messages per action to prevent timeout
  - **Retry logic:** MAX_RETRIES=3 with retry map tracking
  - Real-time progress tracking (sent/failed counts updated live)
  - Plan gating (Growth+ for sending, Starter+ for draft creation)

### ✅ Follow-up Scheduling

- **File:** `components/contacts/follow-up-dialog.tsx`
- **Backend:** `convex/followUps.ts`
- **Status:** ✅ Complete
- **Features:**
  - Scheduled delivery (cron job checks every minute)
  - Auto-retry on failure (MAX_ATTEMPTS=2)
  - Revenue tracking per follow-up (EGP/SAR/AED/USD)
  - Contact event firing (scheduled/sent/failed)
  - User notifications on failure
  - Auto-churn on max retry failure

### ✅ CSAT Surveys (v2)

- **File:** `app/(dashboard)/settings/csat/page.tsx`
- **Backend:** `convex/csat.ts`
- **Status:** ⚠️ Complete — button-based template; Meta template approval still required
- **Features:**
  - Post-resolution surveys (configurable delay 0-60 minutes)
  - Growth+ plan gating
  - **v2 (2026-04-27):** Now sends interactive button template (1–5 star options) instead of free-form text — resolves Meta 24-hour window compliance issue
  - Webhook hijacking: intercepts button reply responses; score recorded in `conversationMetrics`
  - Settings page enhanced: live preview of CSAT message, test send button
  - **Remaining:** Meta template must be pre-approved before production use

### ✅ SLA Monitoring

- **File:** `components/inbox/conversation-header.tsx` (displays breach indicator)
- **Backend:** `convex/sla.ts`
- **Status:** ⚠️ Complete but breach clearing logic unclear
- **Features:**
  - Per-channel SLA threshold configuration (minutes)
  - 5-minute cron job checking for breaches
  - Breach marked on open conversations where `lastInboundAt` exceeded threshold
  - Supervisor notifications (in-app) — `convex/notifications.ts`
  - **Known Issue:** Breach is set but unclear where/when it's cleared (possibly on agent reply in `messages.ts:89`)

### ✅ Analytics Dashboard

- **File:** `app/(dashboard)/analytics/page.tsx`, `components/analytics/*`
- **Backend:** `convex/analytics.ts`, `convex/conversationMetrics.ts`
- **Status:** ✅ Complete
- **Features:**
  - Team-wide summaries (total conversations, avg response time, resolution time)
  - Agent performance metrics (first response time, resolution time, conversation count)
  - Conversation volume trends (time-series data)
  - CSAT score aggregation
  - SLA breach tracking
  - Denormalized `conversationMetrics` for fast queries

### ✅ Team Management

- **File:** `app/(dashboard)/settings/team/page.tsx`, `components/settings/team-members-list.tsx`
- **Backend:** `convex/orgMembers.ts`, `convex/inviteLinks.ts`
- **Status:** ✅ Complete
- **Features:**
  - Invite by email (Clerk native)
  - Invite by WhatsApp (custom invite link)
  - Shareable time-limited invite links (7 days default)
  - Role assignment: Admin, Supervisor (Starter+), Agent
  - Agent limits by plan (Free: 3, Starter: 5, Growth: 15, Business: Unlimited)
  - Remove members (Admin only; Supervisor can remove Agents only)
  - Last admin protection — `convex/lib/lastAdmin.ts`

### ✅ Channel Member Assignments

- **File:** `app/(dashboard)/settings/channels/[channelId]/page.tsx`
- **Backend:** `convex/channelMembers.ts`
- **Status:** ✅ Complete
- **Features:**
  - Assign agents to specific channels
  - Round-robin rotation scoped to channel members
  - Admin/Supervisor can manage assignments

### ✅ Round-Robin Assignment

- **File:** N/A (backend logic only)
- **Backend:** `convex/actions/roundRobin.ts`, `convex/channels.ts` — `incrementRoundRobinIndex`
- **Status:** ✅ Complete
- **Features:**
  - Automatic equal distribution across channel members
  - Per-channel `roundRobinIndex` tracking (wraps around)
  - Growth+ plan gating
  - Manual reassignment still allowed by Admin/Supervisor

### ✅ Data Export

- **File:** `app/(dashboard)/settings/export/page.tsx`
- **Backend:** `convex/export.ts`
- **Status:** ✅ Complete
- **Features:**
  - Contacts CSV export (phone, name, tags, stage, notes, customFields, firstSeen, lastSeen, source)
  - Conversations JSON export (full conversation + messages)
  - Available on all plans (including Free) — data portability is a right
  - Admin/Supervisor only
  - Async export generation (Convex Storage URLs)

### ✅ Template Library

- **File:** `components/templates/template-library-tab.tsx`, `lib/templateLibrary.ts`
- **Backend:** `convex/metaTemplates.ts` — Meta template sync + `submitToMeta` action
- **Status:** ✅ Complete
- **Features:**
  - 66 pre-built curated templates with industry tags and purpose chips
  - Industry tabs + purpose filter with combined filtering logic
  - Arabic + English templates, 14 categories (8 Meta + 6 Quick-Reply)
  - Preview sheet with WhatsApp bubble + variable highlighting
  - Quick-reply templates pre-fill create dialog; Meta templates submit via Convex action
  - Variable auto-conversion: `{{named}}` → `{{1}}` before Meta submission

### ✅ Broadcast Templates

- **File:** `components/broadcasts/broadcast-templates-tab.tsx`, `components/broadcasts/broadcast-template-builder.tsx`
- **Backend:** `convex/broadcastTemplates.ts`, `convex/metaTemplates.ts`
- **Status:** ✅ Complete
- **Features:**
  - Tenant-defined broadcast templates with Meta submission workflow
  - Status lifecycle: `draft → submitted → approved/rejected`
  - Broadcast wizard integration: source picker (Meta Templates vs Broadcast Templates)
  - Media URL override, dynamic URL suffixes per button, variable fill-in inputs

### ✅ Departments Feature

- **File:** `app/(dashboard)/settings/channels/[channelId]/page.tsx`
- **Backend:** `convex/departments.ts`, `convex/departmentMembers.ts`
- **Status:** ✅ Complete
- **Features:**
  - Channels grouped into departments for multi-channel management
  - Conversation transfer between departments
  - Defensive fix: `listForTransfer` returns `[]` instead of NOT_FOUND on orphaned channelIds

### ✅ Quick Reply Variables

- **File:** `components/inbox/quick-reply-panel.tsx`
- **Status:** ✅ Complete
- **Features:**
  - Quick replies support `{{variable}}` placeholders
  - Selecting a variable quick reply opens inline fill-in form before inserting

### ✅ Settings Sub-Navigation

- **File:** `components/settings/settings-sub-nav.tsx`, `app/(dashboard)/settings/layout.tsx`
- **Status:** ✅ Complete
- **Features:**
  - Persistent sub-nav on all settings pages
  - Settings landing page at `/settings`

### ✅ Member Profile Modal

- **File:** `components/team/member-profile-modal.tsx`, `components/team/member-profile/`
- **Backend:** `convex/members.ts`, `convex/memberQueries.ts`
- **Status:** ✅ Complete
- **Features:**
  - Tabbed modal: Overview (bio, contact details, recent activity) | Analytics (performance charts) | History (audit log) | Manage (role, status, remove)
  - `memberProfiles` table: bio, jobTitle, phone, avatar
  - `memberActionLog` table: full audit trail of admin actions
  - `notificationPreferences` table: per-member email/in-app toggles
  - Admin/Supervisor can edit member contact details via Manage tab

### ✅ Team Presence System

- **File:** `components/ui/presence-indicator.tsx`, `components/ui/team-presence-dropdown.tsx`
- **Backend:** `convex/presence.ts`, `convex/teamPresence.ts`, `convex/teamPresenceQueries.ts`
- **Status:** ✅ Complete
- **Features:**
  - Real-time online/offline/away/busy status per team member
  - `presence` table with heartbeat pattern (auto-expires)
  - `hooks/use-presence.ts` — presence hook for components
  - `components/shell/presence-initializer.tsx` — sets presence on app load/unload

### ✅ Channel Retention (30-Day Auto-Delete)

- **File:** `app/(dashboard)/settings/channels/page.tsx`
- **Backend:** `convex/channelRetention.ts`, `convex/actions/channelRetentionAction.ts`
- **Status:** ✅ Complete
- **Features:**
  - Disconnected channels retained 30 days then auto-purged (conversations, messages, channelMembers)
  - `channels.deletedAt` + `channels.retentionExpiresAt` schema fields
  - Daily cron job (`check-channel-retention`)
  - Admin notified 7 days before deletion (email + in-app)
  - Channels with only resolved conversations can be force-deleted immediately

### ✅ Transactional Email System

- **File:** `emails/` (18 template files: 9 types × AR+EN), `convex/emails/`
- **Backend:** `convex/actions/notifyEmail.ts`, `convex/actions/sendEmail.ts`
- **Status:** ✅ Complete
- **Features:**
  - Branded React Email HTML templates (Arabic + English variants for each type)
  - 9 email types: agent-welcome, new-assignment, sla-breach, followup-due, followup-due-failed, channel-deleted, channel-expiring-soon, billing-payment-failed, billing-subscription-expired
  - `notifyEmail` action routes AR/EN based on member locale
  - Sent via Resend API (`RESEND_API_KEY` env var)
  - `convex/emails/base.tsx` — shared branded layout with Cairo font and WABDesk colors

### ✅ Message Scheduling

- **Backend:** `convex/messageScheduling.ts`
- **Status:** ✅ Complete
- **Features:**
  - Agents schedule outbound messages for future delivery
  - `messages.scheduledAt` field; `status: "scheduled"` until dispatched
  - 1-minute cron job dispatches due messages via Meta API
  - Failed scheduled sends auto-retry once

### ✅ Conversation & Message Search

- **Backend:** `convex/search.ts`
- **Status:** ✅ Complete
- **Features:**
  - Full-text search across message content and contact names
  - Convex search index on `messages.content` and `contacts.displayName`
  - Role-gated: agents search only their assigned conversations
  - UI: search bar in inbox header with result dropdown

### ✅ Conversation Merge

- **Backend:** `convex/conversationMerge.ts`
- **Status:** ✅ Complete
- **Features:**
  - Admin merges duplicate conversations (messages moved from source → target)
  - Source conversation marked resolved with merge note
  - Admin-only; available from conversation header action menu

### ✅ Batch Actions

- **Backend:** `convex/batchActions.ts`
- **Status:** ✅ Complete
- **Features:**
  - Bulk operations: `batchClose`, `batchAssign`, `batchLabel`, `batchDelete`
  - Checkbox selection in conversation list + bulk action toolbar
  - All mutations validate `tenantId` and role before operating

### ✅ Rate Limiting

- **Backend:** `convex/lib/rateLimit.ts`
- **Status:** ✅ Complete
- **Features:**
  - Token-bucket rate limiter using `rateLimits` table
  - Applied to: `sendMessage`, `sendMediaReply`, `importBatch`

### ✅ Legal Pages

- **File:** `app/privacy/page.tsx`, `app/terms/page.tsx`, `app/dpa/page.tsx`, `app/cookies/page.tsx`
- **Status:** ✅ Complete
- **Features:**
  - Full Arabic + English content for Privacy Policy, Terms of Service, Data Processing Agreement, Cookie Policy
  - `components/marketing/legal-page-wrapper.tsx` — shared layout (supports 4 pages)
  - Marketing footer updated with links to all four pages

### ✅ Cookie Consent Manager (Klaro + Google Consent Mode v2)

- **File:** `app/layout.tsx`, `components/consent/klaro-provider.tsx`
- **Backend:** N/A (fully client-side)
- **Status:** ✅ Complete
- **Features:**
  - Open-source Klaro! v0.7.21 consent banner (BSD-3, ~30KB)
  - Notice mode (non-blocking) at bottom of screen
  - Three categories: essential, analytics, marketing
  - Five services: essential, Google Analytics 4, Google Tag Manager, Facebook Pixel, Google Ads
  - Google Consent Mode v2 default-denied state set in `<head>` before any tracking script
  - 365-day cookie storage (`klaro` cookie)
  - Arabic (default) + English translations with full RTL support
  - `Cookie Settings` footer button re-opens preferences modal
  - Re-initialization on Next.js App Router route change (fix for Klaro issue #552)
  - WABDesk indigo brand styling
  - Linked to `/cookies` Cookie Policy page
  - Ready for GA4/GTM/FB Pixel addition — use `type="text/plain"` + `data-name`

### ✅ Billing & Subscription Management

- **File:** `app/(dashboard)/settings/billing/page.tsx`
- **Backend:** `convex/billing.ts`, `app/api/paddle/webhook/route.ts`
- **Status:** ✅ Complete
- **Features:**
  - Paddle Checkout integration (Paddle.js v2)
  - Plan switching (upgrade/downgrade)
  - Webhook processing (subscription.created, subscription.updated, subscription.canceled)
  - Plan activation tracking (`plan_activated_at`)
  - 4 plans: Free, Starter ($9.99), Growth ($22.99), Business ($44.99)
  - Multi-currency support (EGP, SAR, AED, USD)

### ✅ Settings Pages (Complete)

- **File:** `app/(dashboard)/settings/*`
- **Backend:** Multiple Convex files
- **Status:** ✅ Complete
- **Implemented Pages:**
  - `/settings/channels` — Channel list + connection
  - `/settings/channels/[channelId]` — Channel details + assignment mode
  - `/settings/channels/[channelId]/profile` — Business profile editing
  - `/settings/team` — Team member management
  - `/settings/quick-replies` — Quick reply templates
  - `/settings/labels` — Conversation label management
  - `/settings/templates` — Message templates with variables
  - `/settings/csat` — CSAT survey configuration
  - `/settings/export` — Data export
  - `/settings/billing` — Subscription management

---

## 5. Known Issues & Technical Debt

### 🔴 Critical Issues (Must Fix Before Production)

1. **CSAT Template Needs Meta Pre-Approval**
   - **File:** `convex/csat.ts`
   - **Issue:** CSAT now uses button template (Meta compliant) but the template itself must be pre-approved by Meta before it can be sent outside the 24-hour window
   - **Fix Required:** Submit the CSAT button template to Meta for approval; update `sendCSATRequest` to use the approved template ID once approved
   - **Status:** ⚠️ v2 sends button template (correct approach), but Meta approval pending

2. **SLA Breach Clearing Logic Unclear**
   - **File:** `convex/sla.ts`, `convex/messages.ts:89`
   - **Issue:** Breach is marked but unclear when/where it's cleared (possibly on agent reply)
   - **Fix Required:** Explicitly clear `slaBreachedAt` on agent reply + document behavior

### ⚠️ Medium Priority Issues

3. **Follow-up Auto-Churn Too Aggressive**
   - **File:** `convex/followUps.ts`
   - **Issue:** `MAX_ATTEMPTS=2` is hardcoded — auto-churn may be too aggressive for some use cases
   - **Fix Required:** Make retry count configurable per tenant or per follow-up

4. **Business Hours Timezone Validation**
   - **File:** `lib/automationHelpers.ts`
   - **Issue:** Uses `Intl.DateTimeFormat` for timezone validation — non-standard for schedule validation
   - **Fix Required:** Consider using a dedicated timezone library (e.g., `date-fns-tz`) for robustness

5. **Round-Robin Empty Members Handling**
   - **File:** `convex/actions/roundRobin.ts`
   - **Issue:** If a channel has 0 members, round-robin may fail or leave conversation unassigned
   - **Status:** Needs verification — may already handle gracefully by leaving unassigned

6. **Token Encryption Consistency**
   - **File:** `convex/lib/encryption.ts`, `convex/channels.ts`
   - **Issue:** Need to verify all places that store/retrieve `accessToken` use encryption helpers consistently
   - **Status:** Spot-check completed (looks good), but full audit recommended before production

7. **Orphaned Channel References in Conversations**
   - **File:** `convex/conversations.ts`, `convex/departments.ts`
   - **Issue:** Some conversations may reference channelIds that no longer exist (orphaned data)
   - **Fix Applied:** `departments.listForTransfer` now returns empty array instead of throwing NOT_FOUND
   - **Recommended:** Add data validation on conversation creation to ensure channelId exists; add admin tool to clean up orphaned conversations
   - **Status:** ⚠️ Symptom fixed with defensive programming, but root cause (orphaned data) should be addressed

### 💡 Future Enhancements (Deferred to Phase 2)

- WhatsApp Catalog integration
- WhatsApp OTP as a service
- Chatbot / automation flows (more advanced than current rules)
- E-commerce integrations (WooCommerce, Shopify)
- Abandoned cart recovery
- Multilingual notifications (currently Arabic-first, English supported)
- Advanced SLA rules (per label/channel) — currently only per-channel threshold

---

## 6. Feature Gating by Plan

| Feature                      | Free | Starter | Growth | Business  |
| ---------------------------- | ---- | ------- | ------ | --------- |
| **Agents**                   | 3    | 5       | 15     | Unlimited |
| **Channels**                 | 1    | 2       | 5      | Unlimited |
| **Conversations/month**      | 300  | Unltd   | Unltd  | Unltd     |
| **Supervisor Role**          | ❌   | ✅      | ✅     | ✅        |
| **Quick Replies**            | ✅   | ✅      | ✅     | ✅        |
| **Internal Notes**           | ✅   | ✅      | ✅     | ✅        |
| **Contact Management**       | ✅   | ✅      | ✅     | ✅        |
| **Custom Fields**            | ✅   | ✅      | ✅     | ✅        |
| **Contact Lists**            | 3    | 10      | Unltd  | Unltd     |
| **Broadcasts**               | ❌   | ✅      | ✅     | ✅        |
| **Message Templates**        | 0    | 10      | 50     | Unlimited |
| **Automation Rules**         | 2    | 10      | 30     | Unlimited |
| **Round-Robin Assignment**   | ❌   | ❌      | ✅     | ✅        |
| **CSAT Surveys**             | ❌   | ❌      | ✅     | ✅        |
| **SLA Monitoring**           | ❌   | ❌      | ✅     | ✅        |
| **Business Profile Editing** | ❌   | ❌      | ✅     | ✅        |
| **Data Export**              | ✅   | ✅      | ✅     | ✅        |
| **Basic Analytics**          | ✅   | ✅      | ✅     | ✅        |
| **Advanced Analytics**       | ❌   | ❌      | ✅     | ✅        |
| **API Access**               | ❌   | ❌      | ❌     | ✅        |

**Plan Limits Enforcement:** `convex/lib/planLimits.ts`

---

## 7. Environment Variables Required

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Convex
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOY_KEY=
CONVEX_SITE_URL=          # e.g. https://happy-animal-123.convex.site

# Meta WhatsApp Business API
META_APP_ID=
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=
META_SYSTEM_USER_TOKEN=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=   # Same as META_WEBHOOK_VERIFY_TOKEN
WHATSAPP_WEBHOOK_SECRET=         # Random secret shared between Next.js route and Convex action
WHATSAPP_APP_SECRET=             # Meta App Secret (for signature verification)
WHATSAPP_API_TOKEN=              # Permanent System User token for sending messages
WHATSAPP_API_VERSION=v19.0       # Meta API version

# Paddle
PADDLE_API_KEY=
PADDLE_WEBHOOK_SECRET=
PADDLE_SELLER_ID=

# Encryption (auto-generated if not provided)
CONVEX_ENCRYPTION_KEY=           # 32-byte hex string for AES-256-GCM
```

---

## 8. Recent Changes (Last 10 Sessions)

### 2026-05-03: Positioning Statement Update Across Codebase

- ✅ Replaced old positioning ("Arabic-first WhatsApp Business API multi-agent customer support SaaS for SMBs in Egypt and the Gulf") with new canonical: "Arabic-first multi-agent WhatsApp Business platform built for SMBs in Arabic-speaking markets"
- ✅ Drops "API" and "SaaS" (developer-speak) from customer-facing surfaces; broadens region from "Egypt and the Gulf" → "Arabic-speaking markets"
- ✅ "Arabic-first" preserved as the differentiator
- ✅ Files updated: `CLAUDE.md` §1, `PROJECT_STATE.md` §1, `PROGRESS.md`, `AUDIT_REPORT.md`, `app/page.tsx` (AR root meta description), `lib/marketing/i18n.ts` (hero.subtitle AR+EN), `components/marketing/privacy-content.tsx` (EN intro — drops "API")
- ✅ Out-of-scope and deliberately untouched: pricing currency strings (EGP/SAR/AED stay), legal-jurisdiction citations (Law 151/2020, PDPL, CRCICA arbitration), historical specs/docs/`.specify/`, schema, Convex functions, plan-limit logic
- TypeScript: 0 errors

### 2026-05-02: Klaro Consent Manager + Google Consent Mode v2

- ✅ Klaro v0.7.21 integrated with custom config (5 services: essential, GA4, GTM, FB Pixel, Google Ads)
- ✅ Google Consent Mode v2 default-denied state in `<head>` (`strategy="beforeInteractive"`)
- ✅ Next.js App Router route-change re-init via `usePathname` in `KlaroProvider`
- ✅ AR/EN translations + RTL-aware CSS overrides (WABDesk indigo branding)
- ✅ Cookie Policy page `/cookies` (legal page #4) + footer integration
- ✅ Privacy Policy updated with analytics disclosure sections (10a AR + 10a EN)
- ✅ `CookieSettingsButton` in marketing footer re-opens Klaro modal
- ✅ `LegalPageWrapper` updated to support `"cookies"` page type
- ✅ `types/klaro.d.ts` module declaration for TypeScript
- **New files:** `lib/klaro/config.ts`, `lib/klaro/consent-mode.ts`, `components/consent/klaro-provider.tsx`, `components/consent/cookie-settings-button.tsx`, `styles/klaro.css`, `app/cookies/page.tsx`, `components/marketing/cookies-content.tsx`, `types/klaro.d.ts`
- **Modified files:** `app/layout.tsx`, `components/marketing/marketing-footer.tsx`, `components/marketing/legal-page-wrapper.tsx`, `components/marketing/privacy-content.tsx`, `lib/marketing/i18n.ts`
- **TypeScript:** 0 errors

### 2026-04-28: System User Assignment + WA Business Profile Fixes

- ✅ `convex/channels.ts` — `assignSystemUser` action: auto-assigns WABDesk system user to WABA on Embedded Signup completion
- ✅ `convex/waBusinessProfile.ts` — switched to permanent `WHATSAPP_API_TOKEN`; resumable upload API for profile photos
- ✅ Removed `.opencode.json` config file (cleanup)
- **Files:** `convex/channels.ts`, `convex/waBusinessProfile.ts`

### 2026-04-27: Legal Pages + CSAT v2 + Invite Links UX

- ✅ Legal pages: `/privacy`, `/terms`, `/dpa` — full AR+EN content with branded layout
- ✅ CSAT v2: switched from free-form text to interactive button template (Meta compliance)
- ✅ CSAT settings page: live preview, test send button, enhanced config
- ✅ Marketing footer and nav updated with legal page links
- ✅ Invite links UX polish (copy, regenerate, revoke improvements)
- ✅ Convex tsc path alias error resolved (`@/` alias in tsconfig)
- **New files:** `app/privacy/page.tsx`, `app/terms/page.tsx`, `app/dpa/page.tsx`, `components/marketing/legal-page-wrapper.tsx`, `components/marketing/privacy-content.tsx`, `components/marketing/terms-content.tsx`, `components/marketing/dpa-content.tsx`

### 2026-04-27: Transactional Email System (React Email + Resend)

- ✅ 18 React Email template files in `emails/` (9 types × AR+EN)
- ✅ Shared branded base layout: `convex/emails/base.tsx`
- ✅ `convex/actions/notifyEmail.ts` — AR/EN routing dispatch action
- ✅ `convex/actions/sendEmail.ts` — updated to use Resend API + React Email render
- ✅ Email triggers wired: channel deletion warning, SLA breach, new assignment, follow-up failure, billing events
- **New env var:** `RESEND_API_KEY`

### 2026-04-27: Channel Retention (30-Day Auto-Delete)

- ✅ `convex/channelRetention.ts` — retention logic (find expired, purge cascade)
- ✅ `convex/actions/channelRetentionAction.ts` — purge action (conversations, messages, channelMembers, channel)
- ✅ Schema: `channels.deletedAt`, `channels.retentionExpiresAt`
- ✅ Daily cron job `check-channel-retention`
- ✅ UI: countdown badge on channels page for disconnected channels
- ✅ Fix: channels with only resolved conversations can be force-deleted immediately

### 2026-04-27: Member Profile Modal (Full Implementation)

- ✅ `components/team/member-profile-modal.tsx` — tabbed modal shell
- ✅ 4 tab components: overview-tab, analytics-tab, history-tab, manage-tab
- ✅ `convex/members.ts` + `convex/memberQueries.ts` — mutations + analytics queries
- ✅ New tables: `memberProfiles`, `memberActionLog`, `notificationPreferences`
- ✅ Contact details: phone, jobTitle, bio stored per member
- ✅ `hooks/use-member-profile.ts`, `hooks/use-presence.ts`
- ✅ Team presence system: `convex/presence.ts`, `convex/teamPresence.ts`, `convex/teamPresenceQueries.ts`
- ✅ Presence UI: `components/ui/presence-indicator.tsx`, `components/ui/team-presence-dropdown.tsx`
- ✅ Shell: `components/shell/presence-initializer.tsx`
- ✅ New Convex files: `conversationMerge.ts`, `messageScheduling.ts`, `batchActions.ts`, `search.ts`, `convex/lib/rateLimit.ts`
- ✅ New tables: `presence`, `rateLimits` (rate limiting)

### 2026-04-26: Template Library Industry Filter (Task 5 - Final Integration Check)

- ✅ Verified all 66 templates present in lib/templateLibrary.ts
- ✅ Confirmed 40 general/universal templates appear in all industry tabs
- ✅ Validated filtering logic: industry + purpose + category + search intersection
- ✅ Verified RTL/i18n support with Arabic labels
- ✅ TypeScript compilation: 0 errors in template library files
- ✅ No duplicate template IDs found
- ✅ All required components integrated and functional
- Status: READY FOR PRODUCTION

### 2026-05-03: Tabbed Transfer Dialog + Cross-Branch Forward + Inbox Queue Tree

- ✅ Replaced department-only transfer dialog with tabbed flow: within-branch routing (department + optional agent + internal note) and cross-branch forward
- ✅ Forward sends a tenant-editable templated message to the customer through the source channel's number, then closes the conversation as `status: "forwarded"`
- ✅ Schema additions: `conversations.status` += `"forwarded"`, audit fields `forwardedToChannelId/forwardedToDepartmentId/forwardedAt/forwardedBy`, `messages.eventType` += `transfer_within_channel` / `forward_to_branch`, `tenants.forwardMessageTemplates`
- ✅ New server APIs: `conversations.{transferWithinChannel,forwardToBranch,previewForwardMessage}`, `inbox.queueCounts`, `channels.listOtherChannelsForForward`, `departmentMembers.listForDepartment`, `messages.{createOutboundForward,markFailed,getStatusInternal}`
- ✅ `forwardToBranch` reads message status after Meta send and bails before finalizing if Meta rejected the send
- ✅ Inbound 24h-reopen rule skips `status: "forwarded"` so forwarded conversations always start fresh
- ✅ New UI: `transfer-dialog.tsx` (355 lines), `inbox-queue-tree.tsx` (175 lines, role-scoped), `forward-template-card.tsx` in `/settings/general`
- ✅ Deleted: `transfer-department-dialog.tsx`

### 2026-05-03: CLAUDE.md §30 — AI Agent Behavior Rules

- ✅ Added §30 codifying think-before-coding, simplicity-first, surgical changes, goal-driven execution, stage output requirements, rejection triggers, and definition of "trivial"
- ✅ Mandatory stage-gated workflow for non-trivial tasks: BEFORE/AFTER diffs, literal `npx tsc --noEmit` output, `PROGRESS.md` entry per stage, push-back invitation
- ✅ Explicit rejection triggers documented (summary instead of code, out-of-scope edits, `any` types, unrequested "improvements", placeholder code)
- Doc-only; no code or schema impact

### 2026-05-02: CSAT End-to-End Fix + Score Surfacing

- ✅ `conversations.setStatus` now schedules `sendCsatMessage` (only `inbox.updateStatus` did before — the UI never called it, so CSAT was silently broken)
- ✅ `markCsatSent` upserts `conversationMetrics` instead of failing on missing rows; inserts the rendered CSAT body as an outbound text message in the thread
- ✅ Cycle-matching fix: `checkAndRecordResponse` now scans all of the contact's conversations for an open CSAT cycle (`csatSentAt` set, no later customer response) and picks the most recently-sent — previously it took the latest conversation regardless of which one held the open cycle
- ✅ New `csat_received` system event with `eventData.csatScore`; amber thread pill `⭐⭐⭐⭐⭐ Customer rated N/5`
- ✅ Inbox conversation cards show `⭐ N/5` badge (`inbox.listForUser` joins `conversationMetrics`)
- ✅ Contact panel "Satisfaction" section: average, count, last score (new `csat.getContactCsat` query)
- ✅ `.gitignore`: added `playwright-report/`, `test-results/`, `brainstorm content/`

### 2026-05-02: 24-Hour Conversation Reopen Window + Real-Name Resolve Attribution

- ✅ Resolved/reopened activity pills now show actual member name (Clerk `useUser` → mutation arg) instead of literal "Agent"; `inbox.updateStatus` emits the same system event for consistency
- ✅ New windowed-reopen rule: customer reply within `channels.reopenWindowHours` (default 24h) of resolution reopens the same conversation with a "↩ {customer} reopened" pill and notifies the previously-assigned agent. Reply after the window creates a brand-new conversation (fresh SLA, fresh assignment).
- ✅ Schema additions: `conversations.resolvedAt`, `channels.reopenWindowHours`; new `conversation_reopened` notification type
- ✅ Per-channel admin UI to configure 1–720h reopen window at `/settings/channels/[channelId]`
- ✅ Bundled in same commit: follow-ups precise scheduling (exact `runAt`, sent follow-ups recorded in thread, +341/-87 lines), notifications settings page (240 lines), email template polish across 8 templates + base layout

### 2026-05-02: Conversation Activity Pills + Transfer Notifications + Conversation Claim

- ✅ New `system_event` message type with `eventType` + `eventData` on `messages` table
- ✅ Centered color-coded event pills (`transfer_department`, `agent_assigned`, `agent_unassigned`, `resolved`, `reopened`) replace internal-note transfer logs; bilingual via `useT()`
- ✅ New `conversation_transferred` notification fans out to all department members + supervisors on transfer (actor skipped)
- ✅ New `conversations.claim` mutation with server-side membership check; non-privileged agents see locked MessageInput until they claim
- ✅ New `components/inbox/claim-button.tsx` wired into both inbox pages
- ✅ Bug fixes folded in: React Rules-of-Hooks violation in MessageInput (early return moved after hooks), double `getUserIdentity` removed in `setStatus`, `any` casts removed in `conversation-thread`, `Message` type exported from `message-bubble`

### 2026-05-01: General Settings Page + Resend Template Sync Tooling

- ✅ New `/settings/general` page (`general-settings.tsx`, 90 lines) — workspace-wide settings landing
- ✅ `scripts/sync-resend-templates.ts` (256 lines) syncs React Email templates → Resend; produces `scripts/resend-template-ids.json`
- ✅ `scripts/test-email.ts` (65 lines) for one-off template render verification
- No schema or runtime impact — tooling-only

### 2026-04-26: Broadcast Templates Wizard Integration (Task 9 Continuation)

- ✅ Added template source picker to broadcast wizard: "Meta Templates" vs "Broadcast Templates"
- ✅ Broadcast templates filtered to approved status only (`metaStatus === "approved"`)
- ✅ Media URL override field (conditional on IMAGE/VIDEO/DOCUMENT header types)
- ✅ Dynamic URL suffix fields for buttons with `isDynamic=true`
- ✅ Variable fill-in inputs for each template variable
- ✅ State management for overrides: `overrideMediaUrl`, `dynamicSuffixes`, `variables`
- ✅ RTL/i18n support: Arabic + English labels, `dir="ltr"` for URLs, `dir="auto"` for text
- ✅ TypeScript strict types: `BroadcastTemplate = Doc<"broadcastTemplates">`
- ✅ No TypeScript errors introduced
- **File Modified:** `components/broadcasts/create-broadcast-wizard.tsx`

### 2026-04-25: Template Library Feature

- ✅ Pre-built template library in Settings → Templates; two tabs (My Templates / Template Library)
- ✅ ~50 curated templates across 14 categories (8 Meta + 6 Quick-Reply); Arabic + English
- ✅ Preview sheet with WhatsApp bubble + variable highlighting
- ✅ Quick-reply templates pre-fill create dialog; Meta templates submit via Convex action to Meta Graph API
- ✅ Variable auto-conversion {{named}} → {{1}} in `submitToMeta` Convex action
- ✅ New files: `lib/templateLibrary.ts`, `components/templates/library-template-card.tsx`, `components/templates/library-template-preview.tsx`, `components/templates/meta-submit-form.tsx`, `components/templates/template-library-tab.tsx`, `components/ui/tabs.tsx`
- ✅ Modified: `components/settings/templates-settings.tsx`, `convex/metaTemplates.ts`

### 2026-04-25: Delete Conversation (Admin Only)

- ✅ Added `conversations.remove` mutation — admin-only (uses `assertAdmin`), cascades to `messages` and `conversationMetrics`
- ✅ Added delete button (trash icon) in conversation header — visible to `org:admin` only
- ✅ Confirmation AlertDialog before deletion (Arabic + English copy)
- ✅ Redirects to `/inbox` after successful deletion
- ✅ Added `components/ui/alert-dialog.tsx` (Base UI backed shadcn component)

### 2026-04-24 (17:30): Department Transfer Orphaned Channel Fix

- ✅ Fixed `ConvexError: NOT_FOUND` in `departments:listForTransfer` query
- ✅ Root cause: Conversations with channelIds referencing non-existent channels (orphaned data)
- ✅ Applied defensive programming: Query now returns empty array instead of throwing error
- ✅ UI already handles empty array gracefully with "No other departments available" message
- ✅ Confirmed `by_tenant_channel` index exists in schema (investigation revealed index was already present)
- ✅ No new TypeScript errors introduced

### 2026-04-24 (16:45): Broadcasts Batched Sending Loop Integration

- ✅ Merged `task/015-broadcasts-sending-loop` into `feat/013-departments`
- ✅ Added `convex/actions/processBroadcastBatch.ts` — production-ready batched sending
- ✅ Updated `convex/broadcasts.ts` — replaced naive loop with scheduler-based batching
- ✅ Added retry logic (MAX_RETRIES=3) and retry map tracking
- ✅ Added real-time progress tracking (sentCount/failedCount)
- ✅ Updated plan gating: broadcasts sending requires Growth+ (draft creation: Starter+)
- ✅ Resolved merge conflicts in PROGRESS.md
- ✅ Verified TypeScript: 0 errors after merge

### 2026-04-24 (15:30): Deep Architecture Audit + TypeScript Error Fixes

- ✅ Created `PROJECT_STATE.md` (this file)
- ✅ Performed comprehensive codebase scan
- ✅ Identified 6 potential issues (documented in "Known Issues" section)
- ✅ Mapped all 22 tables, 40+ Convex files, 30+ app routes, complete component tree
- ✅ Fixed 8 TypeScript errors:
  - Created missing `components/settings/settings-page-layout.tsx` component
  - Fixed `api.validateInvite` → `api.actions.validateInvite` import path
  - Fixed null handling in `contact-side-panel.tsx` (stage Select)
  - Fixed PapaParse type assertion in `csv-import-dialog.tsx`
  - Removed invalid `messageId` prop from MessageActionMenu call
  - Fixed QuickReply interface (category optional)
  - Fixed tenantId type assertion in `contactsImport.ts`
  - Fixed orgRole type assertion in `lib/tenants.ts`
- ✅ Verified build: 0 TypeScript errors (down from 8)

### 2026-04-13: Message Templates (Task 013)

- ✅ Added `messageTemplates` table to schema
- ✅ Implemented variable extraction (`{{variable}}` → array)
- ✅ Created template picker + fill-in form UI
- ✅ Added `/settings/templates` page
- ✅ Plan gating: Free (0), Starter (10), Growth (50), Business (Unlimited)

### 2026-04-12: Automation Rules Engine (Task 009)

- ✅ Added `automationRules`, `businessHours`, `ruleFireLog` tables
- ✅ Implemented 4 trigger types (keyword, outside_hours, first_message, no_reply_timeout)
- ✅ Template interpolation with customer_name, business_name, agent_name, current_time
- ✅ Priority-ordered execution + deduplication
- ✅ Cron job for timeout checking
- ✅ Created `/automations` page + 4 UI components

### 2026-04-10: Round-Robin Assignment (Task 014)

- ✅ Added `roundRobinIndex` to `channels` table
- ✅ Implemented `convex/actions/roundRobin.ts`
- ✅ Growth+ plan gating
- ✅ Channel member filtering for rotation

### 2026-04-09: Contact Lifecycle Management (Task 005)

- ✅ Added contact stages (lead/prospect/customer/retained/churned)
- ✅ Implemented `customFields` table
- ✅ CSV import with deduplication
- ✅ Contact events timeline
- ✅ Stage transition tracking

---

## 9. Testing Checklist (Before Production)

### Core Flows

- [ ] End-to-end onboarding (sign-up → connect WABA → send test message)
- [ ] Incoming WhatsApp message → conversation creation → agent reply → WhatsApp send
- [ ] Role-based access control (Agent cannot see other agents' conversations)
- [ ] Plan limits enforcement (channel limit, agent limit, feature gating)
- [ ] Webhook signature verification (reject unsigned requests)
- [ ] Token encryption/decryption (no plain-text tokens in database)

### Arabic/RTL

- [ ] All UI components render correctly in RTL mode
- [ ] Arabic text displays correctly (Cairo/Tajawal font loaded)
- [ ] Phone number inputs remain LTR inside RTL layout
- [ ] Directional icons (arrows, chevrons) flip correctly

### Automation

- [ ] Keyword trigger fires correctly (case-insensitive matching)
- [ ] Outside-hours trigger respects business hours + timezone
- [ ] First-message trigger fires only once per conversation
- [ ] No-reply timeout trigger fires after threshold + clears on agent reply
- [ ] Template interpolation works (customer_name, business_name, agent_name, current_time)
- [ ] Deduplication prevents duplicate rule firing

### CSAT

- [ ] CSAT message sent after conversation resolution + delay
- [ ] Rating (1-5) captured correctly via webhook hijacking
- [ ] Score recorded in `conversationMetrics` (not `messages`)
- [ ] **TODO:** Replace free-form text with Meta-approved template

### SLA

- [ ] Breach marked when threshold exceeded
- [ ] Supervisor notification sent on breach
- [ ] Breach cleared on agent reply (verify this works)
- [ ] Breach indicator shows in inbox UI

### Data Export

- [ ] Contacts CSV export includes all fields
- [ ] Conversations JSON export includes all messages
- [ ] Large exports handled asynchronously
- [ ] Export scoped to caller's `tenantId` (no cross-tenant leakage)

### Billing

- [ ] Paddle checkout flow completes successfully
- [ ] Plan upgrade/downgrade works
- [ ] Webhook updates `tenant.plan` correctly
- [ ] Feature gating enforced immediately after plan change

---

## 10. Deployment Checklist

### Pre-Deployment

- [ ] All environment variables set in Vercel
- [ ] Convex schema pushed (`npx convex deploy`)
- [ ] Meta webhook URL configured (points to Convex HTTP endpoint)
- [ ] Paddle webhook URL configured (points to Next.js API route)
- [ ] SSL certificate valid (required for Meta webhooks)
- [ ] CORS configured (if using external APIs)

### Post-Deployment

- [ ] Test webhook verification (GET request to Meta webhook)
- [ ] Send test WhatsApp message → verify received in inbox
- [ ] Send reply from inbox → verify customer receives WhatsApp message
- [ ] Monitor Convex logs for errors
- [ ] Monitor Vercel logs for Next.js errors
- [ ] Test Paddle checkout flow in production
- [ ] Verify CSAT template approval from Meta

---

## 11. Conflict Detection Protocol

When a conflict is detected:

1. **Minor/Obvious Conflicts** (auto-fix):
   - Duplicated imports → remove duplicates
   - Unused variables → remove
   - Syntax errors → fix
   - Mismatched types → align with schema

2. **Major Logical Conflicts** (flag for review):
   - Duplicated business logic across files → requires refactor decision
   - Inconsistent data models → requires schema migration decision
   - Feature conflicts (two implementations of same feature) → requires merge decision
   - Security issues → flag immediately, do not auto-fix

3. **Update This File:**
   - After fixing any conflict, add entry to "Known Issues & Technical Debt" section
   - After completing any feature, add entry to "Implemented Features" section
   - After deploying, update "Recent Changes" section

---

## 12. AI Work Protocol (CRITICAL)

### Before Writing Any Code:

1. ✅ Read this file (`PROJECT_STATE.md`) fully
2. ✅ Check if feature already exists in "Implemented Features" section
3. ✅ Check "Known Issues" for related conflicts
4. ✅ Verify plan limits in `convex/lib/planLimits.ts` if feature is plan-gated
5. ✅ Read CLAUDE.md for project-specific rules

### After Completing Any Task:

1. ✅ Update "Implemented Features" section (add new feature or update status)
2. ✅ Update "Recent Changes" section (add entry with date + brief summary)
3. ✅ Update "Known Issues" if new conflict detected
4. ✅ Update "Last Updated" timestamp at top of file
5. ✅ Run `git status` to verify no unintended changes

### On Conflict Detection:

1. ✅ Auto-fix if minor (duplicated imports, syntax errors, etc.)
2. ✅ Flag for review if major (business logic duplication, security issues, etc.)
3. ✅ Document in "Known Issues" section with priority (🔴 Critical, ⚠️ Medium, 💡 Future)
4. ✅ Notify user clearly with file path + line number

---

## 13. Codebase Health Metrics

| Metric                 | Current State                                                        | Target          |
| ---------------------- | -------------------------------------------------------------------- | --------------- |
| Total Convex Functions | 60+ (queries, mutations, actions)                                    | Stable          |
| Total Database Tables  | 32                                                                   | Stable          |
| Total App Routes       | 40+                                                                  | Growing         |
| TypeScript Strict Mode | ✅ Enabled                                                           | Always enabled  |
| Test Coverage          | ❌ Not implemented                                                   | 80%+ (Phase 2)  |
| Documentation Coverage | ✅ CLAUDE.md + PROJECT_STATE.md + PROGRESS.md                        | Maintain        |
| Known Security Issues  | 0 (webhook sig verification in place)                                | 0               |
| Known Critical Bugs    | 1 (CSAT template pending Meta approval)                              | 0 before launch |
| Production Readiness   | 🟡 75% (all core + advanced features done, pre-launch polish needed) | 100%            |

---

**END OF PROJECT_STATE.md**

> Remember: This file is the single source of truth. Always read before writing. Always update after completing. Do not break this loop.
