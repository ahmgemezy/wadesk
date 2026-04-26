# PROJECT_STATE.md — WaDesk

> **AI INSTRUCTION (CRITICAL):**  
> Any AI agent or assistant working on this repository **MUST** read this file before writing or modifying any code.  
> Upon completing any task, the AI **MUST** automatically update this file to reflect the new state of the project.  
> **DO NOT BREAK THIS LOOP.**

---

**Last Updated:** 2026-04-26 UTC  
**Current Branch:** feat/013-departments  
**Main Branch:** 002-agent-roles  
**Build Status:** ✅ TypeScript: Template Library feature complete | ✅ All 66 templates verified | ✅ Filtering logic validated

---

## 1. Project Architecture Overview

**WaDesk** is an Arabic-first WhatsApp Business API multi-agent SaaS for SMBs in Egypt and the Gulf region.

### Core Architecture Patterns

- **Multi-Tenant Model:** Each tenant (Clerk `orgId`) has complete data isolation
- **Real-time First:** Convex subscriptions for live updates (no polling)
- **Server-Side Security:** All WhatsApp API calls via Convex actions (never client-side)
- **Role-Based Access Control:** Admin, Supervisor, Agent roles enforced at database query level
- **Plan-Based Feature Gating:** Free, Starter, Growth, Business plans with enforced limits
- **Token Encryption:** All WABA access tokens encrypted at rest (AES-256-GCM)

### Directory Structure

```
wadesk/
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

| Layer              | Technology                          | Version  | Purpose                                    |
| ------------------ | ----------------------------------- | -------- | ------------------------------------------ |
| Framework          | Next.js (App Router)                | 15.2.2   | React framework + SSR                      |
| Backend/Database   | Convex                              | 1.34.1   | Real-time database + serverless functions  |
| Authentication     | Clerk                               | 7.0.8    | Multi-tenant auth + org management         |
| Payments           | Paddle.js                           | 1.6.2    | Subscription billing (MoR)                 |
| UI Components      | shadcn/ui                           | Latest   | Component library (Base UI + Radix)        |
| Styling            | Tailwind CSS                        | 4.2.2    | Utility-first CSS                          |
| Animations         | Framer Motion                       | 12.38.0  | UI animations                              |
| Charts             | Recharts                            | 3.8.1    | Analytics visualizations                   |
| Icons              | Lucide React                        | 0.468.0  | Icon library                               |
| Phone Validation   | libphonenumber-js                   | 1.12.41  | E.164 phone number normalization           |
| CSV Parsing        | papaparse                           | 5.5.3    | Client-side CSV import                     |
| Date Utilities     | date-fns                            | 4.1.0    | Date formatting                            |
| Language           | TypeScript                          | 5.6.2    | Type-safe JavaScript                       |
| WhatsApp API       | Meta WhatsApp Business Cloud API    | v19.0+   | WhatsApp messaging                         |
| Hosting            | Vercel                              | —        | Next.js hosting                            |
| Package Manager    | npm                                 | —        | Dependency management                      |
| Build Tool         | Turbopack                           | —        | Fast bundler (Next.js 15 default)          |

---

## 3. Database Schema (22 Tables)

All tables are tenant-scoped via `tenantId` (Clerk `orgId`). Convex indexes enforce multi-tenant isolation.

### Core Data Model

| Table                  | Purpose                                           | Key Fields                                                                 | Indexes                                                    |
| ---------------------- | ------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `tenants`              | Tenant/organization records                       | `tenantId`, `plan`, `orgName`, `paddle_customer_id`                        | `by_tenantId`                                              |
| `channels`             | WhatsApp Business numbers (WABA connections)      | `tenantId`, `phoneNumberId`, `wabaId`, `accessToken` (encrypted), `status` | `by_tenant`, `by_phone_number_id`, `by_tenant_status`      |
| `contacts`             | Customer/contact profiles                         | `tenantId`, `phone`, `displayName`, `stage`, `tags`, `totalConversations`  | `by_tenant`, `by_tenant_phone`, `search_by_name`           |
| `contactLists`         | Filtered contact lists for broadcasts             | `tenantId`, `name`, `filters` (countries, stages, tags)                    | `by_tenant`                                                |
| `conversations`        | Conversation threads                              | `tenantId`, `channelId`, `contactId`, `status`, `assignedAgentId`, `labels` | `by_tenant`, `by_tenant_status`, `by_tenant_agent`         |
| `messages`             | Individual messages                               | `conversationId`, `direction`, `content`, `contentType`, `metaMessageId`   | `by_conversation`, `by_meta_message_id`                    |
| `quickReplies`         | Saved quick response templates                    | `tenantId`, `title`, `content`, `category`                                 | `by_tenant`, `by_tenant_category`                          |
| `messageTemplates`     | Message templates with variables                  | `tenantId`, `title`, `body`, `variables[]`, `language`                     | `by_tenant`, `by_tenant_category`                          |
| `automationRules`      | Automation rules (if-this-send-that)              | `tenantId`, `triggerType`, `keywordList`, `responseTemplate`, `priority`   | `by_tenant`, `by_tenant_enabled`, `by_tenant_priority`     |
| `businessHours`        | Business hours schedule                           | `tenantId`, `timezone`, `schedule`                                         | `by_tenant`                                                |
| `ruleFireLog`          | Automation execution log (deduplication)          | `tenantId`, `ruleId`, `conversationId`, `firedAt`                          | `by_rule_conversation`, `by_conversation`                  |
| `followUps`            | Scheduled follow-up messages                      | `tenantId`, `contactId`, `scheduledAt`, `status`, `expectedRevenue`        | `by_tenant_status`, `by_scheduled`                         |
| `broadcasts`           | Broadcast campaigns                               | `tenantId`, `name`, `listId`, `status`, `recipientSnapshot`                | `by_tenant`, `by_tenant_status`                            |
| `csatSettings`         | CSAT survey configuration                         | `tenantId`, `enabled`, `delayMinutes`                                      | `by_tenant`                                                |
| `conversationMetrics`  | Denormalized analytics data                       | `tenantId`, `conversationId`, `firstResponseTimeSeconds`, `csatScore`      | `by_tenant_created`, `by_tenant_agent`                     |
| `conversationLabels`   | Label definitions                                 | `tenantId`, `name`, `color`, `emoji`                                       | `by_tenant`                                                |
| `channelMembers`       | Channel-agent assignments                         | `tenantId`, `channelId`, `userId`, `role`                                  | `by_channel`, `by_channel_user`                            |
| `customFields`         | Custom contact fields (key-value pairs)           | `tenantId`, `contactId`, `key`, `value`                                    | `by_contact`, `by_tenant`                                  |
| `contactEvents`        | Contact activity timeline                         | `tenantId`, `contactId`, `type`, `metadata`                                | `by_contact`, `by_tenant`                                  |
| `notifications`        | In-app notifications (followups, SLA breaches)    | `tenantId`, `userId`, `type`, `message`, `read`                            | `by_user`                                                  |
| `inviteLinks`          | Time-limited team invite links                    | `tenantId`, `token`, `expiresAt`, `revoked`, `defaultRole`                 | `by_tenant`, `by_token`                                    |
| `onboardingState`      | Onboarding progress tracking                      | `tenantId`, `completedSteps[]`, `completedAt`                              | `by_tenant`                                                |

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
- **Status:** ✅ Complete
- **Features:**
  - Edit profile photo, description, address, category, website
  - Display name changes (requires Meta review — shows pending status)
  - Growth+ plan gating
  - Field-by-field auto-save

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

### ✅ CSAT Surveys
- **File:** `app/(dashboard)/settings/csat/page.tsx`
- **Backend:** `convex/csat.ts`
- **Status:** ⚠️ Complete but needs Meta template approval
- **Features:**
  - Post-resolution surveys (configurable delay 0-60 minutes)
  - Growth+ plan gating
  - Webhook hijacking: intercepts 1-5 rating responses before message creation
  - Score recording in `conversationMetrics` (not `messages` table)
  - **Known Issue:** Free-form Arabic text violates Meta 24-hour window — needs pre-approved template

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

1. **CSAT Arabic Text Violates Meta 24-Hour Window**
   - **File:** `convex/csat.ts`
   - **Issue:** Free-form Arabic text sent outside 24-hour window will be rejected by Meta
   - **Fix Required:** Replace with pre-approved WhatsApp template
   - **Plan:** Submit template to Meta, update `sendCSATRequest` to use template API

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

| Feature                       | Free | Starter | Growth | Business |
| ----------------------------- | ---- | ------- | ------ | -------- |
| **Agents**                    | 3    | 5       | 15     | Unlimited |
| **Channels**                  | 1    | 2       | 5      | Unlimited |
| **Conversations/month**       | 300  | Unltd   | Unltd  | Unltd    |
| **Supervisor Role**           | ❌   | ✅      | ✅     | ✅       |
| **Quick Replies**             | ✅   | ✅      | ✅     | ✅       |
| **Internal Notes**            | ✅   | ✅      | ✅     | ✅       |
| **Contact Management**        | ✅   | ✅      | ✅     | ✅       |
| **Custom Fields**             | ✅   | ✅      | ✅     | ✅       |
| **Contact Lists**             | 3    | 10      | Unltd  | Unltd    |
| **Broadcasts**                | ❌   | ✅      | ✅     | ✅       |
| **Message Templates**         | 0    | 10      | 50     | Unlimited |
| **Automation Rules**          | 2    | 10      | 30     | Unlimited |
| **Round-Robin Assignment**    | ❌   | ❌      | ✅     | ✅       |
| **CSAT Surveys**              | ❌   | ❌      | ✅     | ✅       |
| **SLA Monitoring**            | ❌   | ❌      | ✅     | ✅       |
| **Business Profile Editing**  | ❌   | ❌      | ✅     | ✅       |
| **Data Export**               | ✅   | ✅      | ✅     | ✅       |
| **Basic Analytics**           | ✅   | ✅      | ✅     | ✅       |
| **Advanced Analytics**        | ❌   | ❌      | ✅     | ✅       |
| **API Access**                | ❌   | ❌      | ❌     | ✅       |

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

# Polar.sh
POLAR_ACCESS_TOKEN=
POLAR_WEBHOOK_SECRET=
POLAR_ORGANIZATION_ID=

# Encryption (auto-generated if not provided)
CONVEX_ENCRYPTION_KEY=           # 32-byte hex string for AES-256-GCM
```

---

## 8. Recent Changes (Last 5 Sessions)

### 2026-04-26: Template Library Industry Filter (Task 5 - Final Integration Check)
- ✅ Verified all 66 templates present in lib/templateLibrary.ts
- ✅ Confirmed 40 general/universal templates appear in all industry tabs
- ✅ Validated filtering logic: industry + purpose + category + search intersection
- ✅ Verified RTL/i18n support with Arabic labels
- ✅ TypeScript compilation: 0 errors in template library files
- ✅ No duplicate template IDs found
- ✅ All required components integrated and functional
- Status: READY FOR PRODUCTION

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

| Metric                         | Current State                          | Target           |
| ------------------------------ | -------------------------------------- | ---------------- |
| Total Convex Functions         | 40+ (queries, mutations, actions)      | Stable           |
| Total Database Tables          | 22                                     | Stable           |
| Total App Routes               | 30+                                    | Growing          |
| TypeScript Strict Mode         | ✅ Enabled                             | Always enabled   |
| Test Coverage                  | ❌ Not implemented                     | 80%+ (Phase 2)   |
| Documentation Coverage         | ✅ CLAUDE.md + PROJECT_STATE.md        | Maintain         |
| Known Security Issues          | 0 (pending webhook sig verification)   | 0                |
| Known Critical Bugs            | 2 (CSAT template, SLA clearing)        | 0 before launch  |
| Production Readiness           | 🟡 60% (core features done, polish needed) | 100%         |

---

**END OF PROJECT_STATE.md**

> Remember: This file is the single source of truth. Always read before writing. Always update after completing. Do not break this loop.
