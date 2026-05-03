# WaDesk — Full Codebase Audit Report

**Date:** 2026-04-28  
**Branch:** `feat/013-departments`  
**Main Branch:** `002-agent-roles`  
**Purpose:** Comprehensive project state snapshot for AI-assisted review and guidance

---

## 1. Project Overview

**WaDesk** is an Arabic-first multi-agent WhatsApp Business platform built for SMBs in Arabic-speaking markets. Multiple agents handle WhatsApp conversations from a shared team inbox; no customer knows they're talking to a team.

**Primary Markets:** Egypt 🇪🇬, Saudi Arabia 🇸🇦, UAE 🇦🇪  
**Language:** Arabic-first UI (RTL), English supported  
**Status:** Advanced development — all Phase 1 core features complete; pre-launch polish remaining

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | Next.js (App Router) | ^15.2.2 |
| React | React | ^19.2.4 |
| Backend / DB | Convex | ^1.34.1 |
| Auth | Clerk (@clerk/nextjs) | ^7.0.8 |
| UI Components | shadcn/ui | ^4.1.2 |
| Styling | Tailwind CSS | ^4.2.2 |
| Animations | Framer Motion | ^12.38.0 |
| Charts | Recharts | ^3.8.1 |
| Icons | Lucide React | ^0.468.0 |
| Email Templates | React Email | latest |
| Email Delivery | Resend | latest |
| Phone Validation | libphonenumber-js | ^1.12.41 |
| CSV Parsing | papaparse | ^5.5.3 |
| Date Utilities | date-fns | ^4.1.0 |
| Emoji Picker | emoji-picker-react | latest |
| Language | TypeScript | ^5.6.2 |
| Hosting | Vercel | configured |
| WhatsApp API | Meta Graph API | v25.0 |
| Payments | Paddle (MoR) | account pending approval |

**No test framework installed** (no Jest, Vitest, Playwright, or Cypress).

---

## 3. Project Structure

```
wadesk/
├── app/
│   ├── layout.tsx                              # Root: ClerkProvider > html(lang="ar" dir="rtl") > ConvexClientProvider
│   ├── page.tsx                                # Marketing landing page
│   ├── privacy/, terms/, dpa/                 # Legal pages (AR+EN)
│   ├── onboarding/page.tsx                     # Multi-step onboarding wizard
│   ├── accept-invite/page.tsx                  # Post email-invite redirect
│   ├── join/[token]/page.tsx                   # Invite link join flow
│   ├── select-org/page.tsx                     # Org selector after sign-up
│   ├── (auth)/sign-in/, sign-up/               # Clerk auth pages
│   └── (dashboard)/
│       ├── layout.tsx                          # Auth guard + presence initializer
│       ├── inbox/page.tsx                      # Main inbox (conversation list)
│       ├── inbox/[id]/page.tsx                 # Single conversation view
│       ├── contacts/page.tsx                   # Contact list
│       ├── contacts/[id]/page.tsx              # Contact profile
│       ├── lists/page.tsx, lists/[id]/page.tsx # Contact lists / smart segments
│       ├── broadcasts/page.tsx                 # Broadcast campaigns
│       ├── broadcasts/new/page.tsx             # Create broadcast wizard
│       ├── automations/page.tsx                # Automation rules builder
│       ├── analytics/page.tsx                  # Team analytics (Admin/Supervisor)
│       ├── my-stats/page.tsx                   # Personal stats (all roles)
│       └── settings/
│           ├── layout.tsx                      # Settings sub-nav wrapper
│           ├── channels/page.tsx               # Channel list
│           ├── channels/[channelId]/page.tsx   # Channel details + assignment mode
│           ├── channels/[channelId]/profile/   # WA Business Profile editing
│           ├── team/page.tsx                   # Team members + invite links
│           ├── labels/page.tsx                 # Conversation labels
│           ├── quick-replies/page.tsx          # Quick replies (with variables)
│           ├── templates/page.tsx              # Message templates + Template Library
│           ├── csat/page.tsx                   # CSAT v2 settings
│           ├── export/page.tsx                 # Data export
│           └── billing/page.tsx                # Paddle billing
├── components/
│   ├── inbox/                    # ConversationList, Thread, MessageBubble, MessageInput, QuickReplyPanel
│   ├── contacts/                 # ContactList, ContactDetailSheet, ContactTimeline, CSVImport
│   ├── analytics/                # Charts (VolumeChart, LabelDistribution, StageFunnel, etc.)
│   ├── automations/              # Rule cards, form, business hours
│   ├── broadcasts/               # Campaign list, wizard, template builder
│   ├── lists/                    # ListPage, ListCard, CreateListDialog
│   ├── onboarding/               # Wizard steps (Connect WA, Invite Team, etc.)
│   ├── settings/                 # All settings components + settings-sub-nav.tsx
│   ├── shell/                    # AppSidebar, UserMenu, NotificationBell, PresenceInitializer
│   ├── team/                     # MemberProfileModal + 4 tab components
│   ├── templates/                # TemplatePicker, FillForm, LibraryTab, MetaSubmitForm
│   ├── marketing/                # Landing page sections + legal content components
│   └── ui/                       # shadcn/ui + PresenceIndicator, TeamPresenceDropdown, AlertDialog
├── convex/
│   ├── schema.ts                 # 32-table schema
│   ├── http.ts                   # Meta webhook HTTP action
│   ├── crons.ts                  # 6 scheduled jobs
│   ├── actions/
│   │   ├── sendWhatsAppMessage.ts
│   │   ├── roundRobin.ts
│   │   ├── validateInvite.ts
│   │   ├── channelRetentionAction.ts
│   │   ├── notifyEmail.ts
│   │   ├── sendEmail.ts
│   │   ├── sendInviteWhatsApp.ts
│   │   └── processBroadcastBatch.ts
│   ├── lib/
│   │   ├── auth.ts, encryption.ts, planLimits.ts, rateLimit.ts, lastAdmin.ts
│   ├── emails/                   # React Email base layout + components
│   └── [40+ feature files]       # One file per feature domain
├── emails/                       # React Email templates (18 files: 9 types × AR+EN)
├── lib/
│   ├── utils.ts, phoneGeo.ts, automationHelpers.ts, templateHelpers.ts
│   ├── templateLibrary.ts        # 66 pre-built templates with industry tags
│   ├── shell/                    # nav-config, role-utils, locale-action, types
│   ├── i18n/                     # AR/EN translation context
│   └── marketing/                # Pricing data, marketing i18n
├── hooks/
│   └── use-mobile.ts, use-member-profile.ts, use-presence.ts
├── types/meta.ts                  # TypeScript types for Meta API payloads
├── middleware.ts                   # Clerk auth middleware
└── CLAUDE.md                       # Project spec (source of truth)
```

---

## 4. Environment Variables

### Required (must be set in Vercel + Convex dashboard)

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Convex
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOY_KEY=
CONVEX_SITE_URL=          # e.g. https://happy-animal-123.convex.site

# Meta WhatsApp
META_APP_ID=
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=
META_SYSTEM_USER_TOKEN=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=   # Same as META_WEBHOOK_VERIFY_TOKEN
WHATSAPP_WEBHOOK_SECRET=         # Shared secret between Next.js and Convex
WHATSAPP_APP_SECRET=             # For HMAC-SHA256 signature verification
WHATSAPP_API_TOKEN=              # Permanent system user token
WHATSAPP_API_VERSION=v25.0

# Paddle
PADDLE_API_KEY=
PADDLE_WEBHOOK_SECRET=
PADDLE_SELLER_ID=

# Email (Resend)
RESEND_API_KEY=

# Encryption
CONVEX_ENCRYPTION_KEY=           # 32-byte hex string for AES-256-GCM
```

---

## 5. Database Schema (32 Tables)

All tables are scoped to `tenantId` (Clerk `orgId`). Every query must filter by `tenantId`.

| Table | Purpose |
|---|---|
| `tenants` | Tenant records, plan, Paddle customer ID |
| `channels` | WABA connections (encrypted access token, retention fields) |
| `contacts` | Customer profiles (phone, stage, tags, custom fields) |
| `contactLists` | Smart/static contact segments for broadcasts |
| `broadcasts` | Broadcast campaigns with batched send + retry map |
| `broadcastTemplates` | Tenant-defined broadcast templates (Meta submission flow) |
| `metaTemplates` | Meta-approved templates cached per channel |
| `conversations` | Conversation threads (status, assignment, labels, SLA) |
| `messages` | Individual messages (all types, reactions, quotes, scheduling) |
| `quickReplies` | Quick replies with `{{variable}}` support |
| `messageTemplates` | Templates with named variables; plan-gated |
| `automationRules` | If-this-send-that rules (4 trigger types) |
| `businessHours` | Timezone-aware business hours schedule |
| `ruleFireLog` | Deduplication log for automation rule execution |
| `followUps` | Scheduled follow-up messages with revenue tracking |
| `contactEvents` | Append-only activity timeline per contact |
| `customFields` | Key-value custom fields per contact |
| `conversationLabels` | Label definitions (name, color, emoji) |
| `channelMembers` | Channel-agent assignments (for round-robin + SLA) |
| `departments` | Channel groups for multi-channel management |
| `departmentMembers` | Department member assignments |
| `csatSettings` | CSAT toggle, delay, template config |
| `conversationMetrics` | Denormalized analytics (response time, CSAT score) |
| `notifications` | In-app notifications (SLA breach, follow-up due) |
| `inviteLinks` | Time-limited invite links (label, role, expiry) |
| `onboardingState` | Onboarding step completion tracking |
| `memberProfiles` | Rich member profiles (bio, jobTitle, phone, avatar) |
| `memberActionLog` | Audit trail for admin actions on members |
| `presence` | Real-time user presence (online/offline/away/busy) |
| `rateLimits` | Token-bucket rate limiting per user+action |
| `webhook_events` | Webhook event debug log |

---

## 6. Authentication & Authorization

### Auth Stack
- **Clerk** — user auth, org management, role assignment, invite emails
- **Convex** — verifies Clerk JWT on every query/mutation via `ctx.auth.getUserIdentity()`
- `orgId` from Clerk = `tenantId` throughout the system

### Role System
```typescript
type OrgRole = "org:admin" | "org:supervisor" | "org:agent";
```

### Role Enforcement
- All Convex queries/mutations validate `tenantId` and `orgRole` server-side
- Client-side checks exist but are never the sole enforcement layer
- `convex/lib/auth.ts`: `getCallerIdentity`, `getCallerRole`, `assertAdmin`, `assertAdminOrSupervisor`

### Permission Matrix (as implemented)

| Action | Admin | Supervisor | Agent |
|---|---|---|---|
| View all conversations | ✅ | ✅ | ❌ own + unassigned only |
| Assign conversations | ✅ | ✅ | ❌ |
| Reply to conversations | ✅ | ✅ | ✅ own only |
| Manage quick replies / templates | ✅ | ✅ | ❌ |
| Invite agents | ✅ | ✅ | ❌ |
| Invite supervisors/admins | ✅ | ❌ | ❌ |
| Remove members (agents only) | ✅ | ✅ | ❌ |
| Change roles | ✅ | ❌ | ❌ |
| Connect/disconnect WABA | ✅ | ❌ | ❌ |
| View team-wide analytics | ✅ | ✅ | ❌ |
| Manage billing | ✅ | ❌ | ❌ |
| Trigger data export | ✅ | ✅ | ❌ |

---

## 7. Features Inventory

### ✅ Complete — Core Inbox & Messaging
- Real-time conversation list (Convex subscriptions, no polling)
- Assignment modes: first-reply-wins, manual, round-robin (Growth+)
- Role-based visibility: agents see own + unassigned; Admin/Supervisor see all
- All inbound message types: text, image, video, audio, document, sticker, location, reactions, quotes
- Outbound: text, media (Convex Storage → Meta Media API), location, quoted, reactions
- Internal notes (amber, invisible to customer)
- Message status ticks: sending → sent → delivered → read → failed (with retry)
- Conversation soft-delete (Admin only, cascades to messages + metrics)
- Batch actions: batchClose, batchAssign, batchLabel, batchDelete
- Conversation merge (Admin, source marked resolved with merge note)
- Message scheduling (future delivery with 1-min cron dispatch)
- Full-text search: message content + contact names (Convex search index, role-gated)
- SLA breach indicator in inbox (⚠️ badge when threshold exceeded)
- Unread count badge on sidebar Inbox nav item

### ✅ Complete — Contact Management
- Auto-capture on first inbound message
- Contact lifecycle stages: lead → prospect → customer → retained → churned
- Manual creation + CSV import (deduplication, preview, max 10k rows)
- Custom fields (key-value, unlimited)
- Contact events timeline (10+ event types)
- Tag management
- Search by name or phone number
- Follow-up scheduling (cron, max 2 attempts, revenue tracking)
- Contact lists (smart filters: country, stage, tags; static lists)

### ✅ Complete — WhatsApp Integration
- Meta Embedded Signup (tenant connects own WABA in < 5 min)
- WABDesk system user auto-assigned to WABA on signup
- AES-256-GCM encrypted access token at rest
- Webhook: HMAC-SHA256 signature verification, all message types, deduplication
- Channel status: connecting / active / disconnected / reconnect_required
- Business Profile editing: photo (resumable upload), description, address, category, website (Growth+)
- Permanent system user token (`WHATSAPP_API_TOKEN`) used for Meta API calls
- 30-day channel retention on disconnect → daily cron auto-purge

### ✅ Complete — Team Management
- Invite by email (Clerk native), by WhatsApp (custom link), shareable link (7d/30d/never expiry)
- Multiple concurrent invite links per tenant (label, role-gated creation)
- Role: Admin, Supervisor (Starter+), Agent
- Last-admin protection
- Member profile modal: overview, analytics, history, manage tabs
- Real-time team presence (online/offline/away/busy)
- Per-member notification preferences
- Audit log of all admin actions on members

### ✅ Complete — Broadcasts
- Contact list segmentation (smart + static)
- Batched send: 50 contacts/batch, 2s between batches, MAX_RETRIES=3 per contact
- Real-time progress tracking (sent/failed counts live)
- Broadcast templates: tenant-defined with Meta submission workflow
- Meta template cache (`metaTemplates` table)
- Plan-gated: Starter+ create drafts, Growth+ send

### ✅ Complete — Automations
- 4 trigger types: keyword match, outside business hours, first message, no-reply timeout
- Template interpolation: `{{customer_name}}`, `{{business_name}}`, `{{agent_name}}`, `{{current_time}}`
- Priority-ordered execution, fire-log deduplication
- Business hours (timezone-aware, grid schedule)
- Plan limits: Free (2), Starter (10), Growth (30), Business (∞)

### ✅ Complete — Templates
- Quick replies with `{{variable}}` placeholders (fill-in form before insert)
- Message templates with named variables (plan-gated: 0/10/50/∞)
- Template Library: 66 pre-built templates, industry tabs + purpose chips
- Bold variable values in WhatsApp messages (`*{{N}}*` wrapping)

### ✅ Complete — Analytics
- Denormalized read-model (`conversationMetrics`) updated non-blocking via scheduler
- Team-wide: total conversations, avg response time, resolution time, CSAT, SLA breaches
- Agent performance: first response time, resolution time, conversation count
- Conversation volume trends (time-series)
- Label and stage distribution charts
- Role gating: Admin/Supervisor = team-wide; Agent = own stats only

### ✅ Complete — CSAT (v2)
- Post-resolution survey (configurable delay 0–60 min)
- Sends interactive button template (1–5 stars) — Meta-compliant approach
- Rating captured via webhook button-reply interception
- Score recorded in `conversationMetrics` (not messages)
- Settings page: live preview, test send, toggle (Growth+)
- ⚠️ Meta template pre-approval still required before production use

### ✅ Complete — SLA Monitoring
- Per-channel SLA threshold (minutes)
- 5-min cron marks breached conversations
- Supervisor in-app notification on breach
- SLA cleared on agent reply
- Breach indicator (⚠️) in inbox conversation list

### ✅ Complete — Data Export
- Contacts CSV (all fields including custom fields flattened)
- Conversations JSON (full conversation + messages, format options)
- Async generation (Convex Storage URLs), available on all plans
- Admin/Supervisor only; strictly `tenantId`-scoped

### ✅ Complete — Billing
- Paddle Checkout integration (Paddle.js v2)
- Plan switching (upgrade/downgrade)
- Webhook processing: subscription.created / updated / canceled
- 4 plans: Free, Starter ($9.99), Growth ($22.99), Business ($44.99)
- Multi-currency: EGP, SAR, AED, USD

### ✅ Complete — Notifications & Email
- In-app notification bell (SLA breach, follow-up due)
- Transactional email: 9 event types × AR+EN templates via Resend
- Per-member email notification preferences

### ✅ Complete — Infrastructure
- Rate limiting (token-bucket, `rateLimits` table)
- Departments (channel grouping, conversation transfer)
- Settings sub-nav (persistent across all settings pages)
- Legal pages: Privacy Policy, Terms of Service, DPA (AR+EN)

---

## 8. Convex Functions (60+)

### Cron Jobs (6)
| Job | Interval | Handler |
|---|---|---|
| `process-due-followups` | Every 30 min | `followUps.processDue` |
| `check-automation-timeouts` | Every 1 min | `automations.checkNoReplyTimeouts` |
| `check-sla-breaches` | Every 5 min | `sla.checkBreaches` |
| `check-channel-retention` | Daily | `channelRetention.checkExpired` |
| `process-scheduled-messages` | Every 1 min | `messageScheduling.sendScheduled` |
| `refresh-team-presence` | Every 2 min | `teamPresence.refreshAll` |

### HTTP Endpoints (`convex/http.ts`)
| Method | Path | Purpose |
|---|---|---|
| GET | `/meta-webhook` | Meta webhook hub verification |
| POST | `/meta-webhook` | Inbound messages + status updates |
| POST | `/webhooks/meta` | Structured webhook (wabaId-routed) |

---

## 9. Known Issues & Remaining Work

### 🔴 Critical (Must Fix Before Production)

**CSAT Template Requires Meta Pre-Approval**
- `convex/csat.ts` now sends interactive button template (correct approach)
- The template itself must be submitted to and approved by Meta
- Until approved, CSAT cannot be sent outside the 24-hour conversation window
- Action: Submit template, store approved template ID in `csatSettings`

### ⚠️ Medium Priority

**SLA Breach Clearing Audit**
- `convex/sla.ts` marks `slaBreachedAt`; `convex/messages.ts` clears it on agent reply
- Behavior is implemented but should be explicitly tested end-to-end
- Edge case: agent reply from a different device/session

**Follow-up MAX_ATTEMPTS Hardcoded**
- `convex/followUps.ts`: `MAX_ATTEMPTS=2` is not configurable per tenant
- May be too aggressive for some use cases; consider making it a tenant setting

**Business Hours Timezone Validation**
- `lib/automationHelpers.ts` uses `Intl.DateTimeFormat` for timezone validation
- Not robust for all edge cases; consider `date-fns-tz` for production

**Token Encryption Consistency**
- All places storing/retrieving `accessToken` should use `convex/lib/encryption.ts` helpers
- Spot-check shows correct usage; full audit recommended before launch

### ❌ Not Started / Deferred

| Feature | Priority |
|---|---|
| WA Display Name Pending Review Badge | Low (polish) |
| Revenue Analytics UI (`contact.spent` input + chart) | Nice-to-have |
| Invite by WhatsApp (agent phone → link via WA) | Low — email + link cover most cases |
| Advanced SLA rules per label/channel | Business plan feature |
| WhatsApp Catalog | Phase 2 |
| Chatbot / LLM-powered auto-replies | Phase 2 |
| WooCommerce / Shopify integration | Phase 2 |
| WhatsApp OTP | Phase 2 |

---

## 10. Security Assessment

### Strong Points
- All Convex queries/mutations validate `tenantId` from auth context (no cross-tenant leakage)
- HMAC-SHA256 webhook signature verification (Meta + internal webhook secret)
- AES-256-GCM encryption for WABA access tokens at rest
- Clerk JWT validated in every Convex function
- Rate limiting on high-frequency mutations (`sendMessage`, `importBatch`)
- Last-admin protection prevents org lockout
- Role checks enforced server-side; client-side checks are display-only
- `WHATSAPP_API_TOKEN` is a permanent system user token (not per-channel token leaked to clients)
- Phone numbers stored in E.164 format
- Cryptographically random invite link tokens (32 bytes)

### Remaining Concerns
- No input sanitization on message content (not an XSS risk since content is not rendered as HTML, but worth auditing React rendering)
- Large export actions have no size-cap protection (10k contacts CSV could be very large)
- `webhook_events` debug log stores raw payloads — should be purged on a schedule to avoid PII retention issues
- `rateLimits` table tokens need periodic cleanup (stale entries for inactive users)

---

## 11. Architecture Patterns

### Multi-Tenancy
- Every table has `tenantId: v.string()` — Clerk `orgId`
- Every query must call `getCallerIdentity()` first and filter by `tenantId`
- No cross-tenant data access is possible through the API layer

### Real-time
- All inbox data via `useQuery` subscriptions (no polling, no REST)
- Optimistic updates on message send: `"sending"` state → server patches to `"sent"`
- Presence system uses Convex scheduler heartbeat (no WebSocket overhead)

### External API Calls
- All Meta API calls are Convex actions (never client-side)
- Channel access token decrypted only inside actions, never returned to client
- Resend email calls via `convex/actions/sendEmail.ts`

### Plan Gating
- `convex/lib/planLimits.ts` — all plan-gated mutations check `tenant.plan` before proceeding
- Plan stored in `tenants` table; updated by Paddle webhook

---

*End of audit report. Last updated: 2026-04-28.*
