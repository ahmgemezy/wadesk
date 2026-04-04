# WaDesk — Full Codebase Audit Report

**Date:** 2026-04-04  
**Branch:** `008-dashboard-shell`  
**Purpose:** Comprehensive project report for AI-assisted review and guidance

---

## 1. Project Overview

**WaDesk** is an Arabic-first, WhatsApp Business API multi-agent customer support SaaS targeting SMBs in Egypt and the Gulf region. It provides a shared team inbox where multiple agents handle WhatsApp conversations from a single dashboard.

**Primary Markets:** Egypt, Saudi Arabia, UAE  
**Language:** Arabic-first UI (RTL), English supported  
**Status:** Early development — core inbox and team management built, many features still missing

---

## 2. Tech Stack (with exact versions from package.json)

| Layer | Technology | Version |
|---|---|---|
| Frontend | Next.js (App Router) | ^15.2.2 |
| React | React | ^19.2.4 |
| Backend / DB | Convex | ^1.34.1 |
| Auth | Clerk (@clerk/nextjs) | ^7.0.8 |
| UI Components | shadcn/ui (shadcn package) | ^4.1.2 |
| Styling | Tailwind CSS | ^4.2.2 |
| Icons | Lucide React | ^0.468.0 |
| Theme | next-themes | ^0.4.6 |
| Resizable Panels | react-resizable-panels | ^4.9.0 |
| Toast | Sonner | ^2.0.7 |
| Language | TypeScript | ^5.6.2 |
| Hosting | Vercel | (configured) |
| WhatsApp API | Meta Graph API | v21.0 |
| Payments | Lemon Squeezy | NOT YET INTEGRATED |

**No test framework is installed** (no Jest, Vitest, Playwright, or Cypress).

---

## 3. Project Structure

```
wadesk/
├── app/
│   ├── layout.tsx                              # Root: ClerkProvider > html(lang="ar" dir="rtl") > ConvexClientProvider > ThemeProvider
│   ├── page.tsx                                # Marketing page with auth redirect logic
│   ├── globals.css
│   ├── onboarding/page.tsx                     # Clerk CreateOrganization
│   ├── accept-invite/page.tsx                  # Post email-invite redirect
│   ├── join/[token]/page.tsx                   # Invite link join flow
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   └── sign-up/[[...sign-up]]/page.tsx
│   └── (dashboard)/
│       ├── layout.tsx                          # Auth guard (redirect if no userId/orgId)
│       ├── inbox/
│       │   ├── page.tsx                        # Main inbox: conversation list + thread + message input
│       │   └── [id]/page.tsx                   # Single conversation view
│       └── settings/
│           ├── layout.tsx                      # Admin/Supervisor guard
│           ├── team/page.tsx                   # Team management
│           ├── quick-replies/page.tsx          # Quick replies CRUD
│           └── channels/[channelId]/page.tsx   # Channel assignment mode settings
├── components/
│   ├── convex-client-provider.tsx
│   ├── theme-provider.tsx
│   ├── inbox/
│   │   ├── assign-agent-dialog.tsx
│   │   ├── conversation-list.tsx
│   │   ├── conversation-list-item.tsx
│   │   ├── conversation-thread.tsx
│   │   ├── message-bubble.tsx
│   │   ├── message-input.tsx
│   │   ├── quick-reply-panel.tsx
│   │   └── status-selector.tsx
│   ├── marketing/
│   │   ├── marketing-page.tsx
│   │   ├── hero-section.tsx
│   │   ├── features-section.tsx
│   │   ├── differentiators-section.tsx
│   │   ├── pricing-section.tsx
│   │   ├── marketing-nav.tsx
│   │   ├── marketing-footer.tsx
│   │   └── mobile-nav-sheet.tsx
│   ├── settings/
│   │   ├── assignment-mode-select.tsx
│   │   ├── invite-modal.tsx
│   │   ├── role-select.tsx
│   │   └── team-member-list.tsx
│   └── ui/                                     # shadcn/ui components
│       ├── badge.tsx, button.tsx, dialog.tsx
│       ├── dropdown-menu.tsx, input.tsx
│       ├── resizable.tsx, scroll-area.tsx
│       ├── sheet.tsx, textarea.tsx
├── convex/
│   ├── schema.ts                               # 6 tables: channels, contacts, conversations, messages, quickReplies, inviteLinks
│   ├── auth.config.ts                          # Clerk provider config
│   ├── http.ts                                 # Meta webhook handler
│   ├── channels.ts                             # Channel queries/mutations
│   ├── contacts.ts                             # Contact queries/mutations
│   ├── conversations.ts                        # Conversation queries/mutations
│   ├── messages.ts                             # Message queries/mutations
│   ├── quickReplies.ts                         # Quick reply CRUD
│   ├── inviteLinks.ts                          # Invite link management
│   ├── orgMembers.ts                           # Clerk org member management (actions)
│   ├── actions/
│   │   ├── sendWhatsAppMessage.ts              # Send outbound WhatsApp message
│   │   ├── roundRobin.ts                       # Round-robin assignment logic
│   │   └── validateInvite.ts                   # Invite token validation + Clerk membership creation
│   └── lib/
│       ├── auth.ts                             # getCallerIdentity, getCallerRole, assertAdmin, assertAdminOrSupervisor
│       ├── planLimits.ts                       # Plan agent limits (free=2, starter=5, growth=15, business=Infinity)
│       └── lastAdmin.ts                        # Prevent removing last admin
├── lib/
│   ├── utils.ts                                # cn() utility
│   └── marketing/
│       ├── i18n.ts                             # Marketing page translations
│       └── pricing-data.ts                     # Pricing plan data
├── middleware.ts                                # Clerk auth middleware
├── global.d.ts
├── package.json
├── CLAUDE.md                                   # Project spec / instructions
└── tsconfig.json
```

---

## 4. Environment Variables

### Present in .env.local:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CONVEX_URL`
- `META_APP_SECRET`
- `META_WEBHOOK_VERIFY_TOKEN`
- `CONVEX_DEPLOYMENT`
- `NEXT_PUBLIC_CONVEX_SITE_URL`

### Missing (required but not set):
- `META_SYSTEM_USER_TOKEN` — **CRITICAL**: outbound WhatsApp messages will fail without this
- `NEXT_PUBLIC_APP_URL` — invite links will default to `http://localhost:3000`
- `META_APP_ID` — needed for Embedded Signup (not yet implemented)
- `CONVEX_DEPLOY_KEY` — needed for production deployment
- `LEMONSQUEEZY_API_KEY` — payments not yet integrated
- `LEMONSQUEEZY_WEBHOOK_SECRET` — payments not yet integrated

---

## 5. Database Schema (Convex)

### 6 Tables defined in `convex/schema.ts`:

#### `channels`
```typescript
{
  tenantId: string,
  phoneNumberId: string,          // Meta phone number ID
  displayName: string,
  wabaId: string,                 // WhatsApp Business Account ID
  assignmentMode: "first_reply" | "manual" | "round_robin",
  roundRobinIndex: number,
  isActive: boolean,
  createdAt: number,
}
// Indexes: by_tenant, by_tenant_phone, by_phone_number_id
```

#### `contacts`
```typescript
{
  tenantId: string,
  phone: string,                  // E.164 format
  displayName: string,
  customName?: string,
  tags: string[],
  notes?: string,
  source: "auto" | "manual" | "import",
  firstSeenAt: number,
  lastSeenAt: number,
  assignedAgentId?: string,
  createdAt: number,
}
// Indexes: by_tenant, by_tenant_phone
```

#### `conversations`
```typescript
{
  tenantId: string,
  channelId: Id<"channels">,
  contactId: Id<"contacts">,
  assignedAgentId?: string,       // Clerk userId
  status: "open" | "pending" | "resolved",
  labels: string[],
  lastMessageAt: number,
  lastMessagePreview: string,
  unreadCount: number,
  createdAt: number,
}
// Indexes: by_tenant, by_tenant_status, by_tenant_agent, by_tenant_channel, by_last_message
```

#### `messages`
```typescript
{
  conversationId: Id<"conversations">,
  tenantId: string,
  direction: "inbound" | "outbound",
  content: string,
  contentType: "text" | "image" | "document" | "unsupported" | "audio" | "video" | "sticker" | "location" | "template",
  isInternalNote: boolean,
  authorId?: string,
  mediaUrl?: string,
  metaMessageId?: string,
  status: "sent" | "delivered" | "read" | "failed",
  timestamp: number,
  createdAt: number,
}
// Indexes: by_conversation, by_tenant, by_meta_message_id
```

#### `quickReplies`
```typescript
{
  tenantId: string,
  title: string,
  content: string,
  usageCount: number,
  category?: string,
  createdBy: string,
  createdAt: number,
}
// Indexes: by_tenant, by_tenant_category
```

#### `inviteLinks`
```typescript
{
  tenantId: string,
  token: string,                  // 32 random bytes hex-encoded
  createdBy: string,
  expiresAt: number,              // 7-day expiry
  revoked: boolean,
  defaultRole: "org:agent",       // Always agent
  createdAt: number,
}
// Indexes: by_tenant, by_token
```

### Notable: No `tenants` table exists
There is no table to store tenant-level settings like `plan`, billing info, or feature flags. Plan is always hardcoded to `"free"`.

---

## 6. Authentication & Authorization

### Auth Stack
- **Clerk** handles user auth, org management, and role assignment
- **Convex** verifies Clerk JWT on every query/mutation via `ctx.auth.getUserIdentity()`
- `orgId` from Clerk = `tenantId` throughout the system

### Auth Flow
1. User signs up via Clerk (`/sign-up`)
2. Creates or joins an organization (`/onboarding` or `/join/[token]`)
3. All dashboard routes require both `userId` AND `orgId`
4. Middleware protects all routes except `/`, `/sign-in`, `/sign-up`

### Role System (3 roles)
```typescript
type OrgRole = "org:admin" | "org:supervisor" | "org:agent";
```

### Core Auth Functions (`convex/lib/auth.ts`)
```typescript
// Returns { tenantId, callerId, orgRole } — throws if not authenticated
export async function getCallerIdentity(ctx: Ctx)

// Returns normalized OrgRole — maps "admin" to "org:admin"
export async function getCallerRole(ctx: Ctx): Promise<OrgRole>

// Throws FORBIDDEN if not admin
export function assertAdmin(role: OrgRole): void

// Throws FORBIDDEN if not admin or supervisor
export function assertAdminOrSupervisor(role: OrgRole): void
```

### Auth Config (`convex/auth.config.ts`)
```typescript
export default {
  providers: [{
    domain: "https://communal-octopus-5.clerk.accounts.dev", // DEV domain hardcoded
    applicationID: "convex",
  }],
};
```

### Permission Matrix (as implemented)

| Action | Admin | Supervisor | Agent |
|---|---|---|---|
| View all conversations | Yes | Yes | Own + unassigned only |
| Assign conversations | Yes | Yes | No |
| Set conversation status | Yes | Yes | Own + unassigned only |
| Send reply | Yes | Yes | Own + unassigned only |
| Add internal note | Yes | Yes | Own + unassigned only |
| Manage quick replies | Yes | **BUG: No** | No |
| Manage team | Yes | View only | No |
| Change roles | Yes | No | No |
| Remove members | Yes | No | No |
| Generate invite links | Yes | No | No |
| Channel settings | Yes | No | No |
| Settings page access | Yes | Yes | Blocked at layout |

---

## 7. Features Inventory

### [DONE] Core Inbox
- Real-time conversation list with Convex subscriptions
- Conversation thread view with message bubbles
- Message input with send functionality
- Conversation status management (open/pending/resolved)
- Channel filter in inbox
- Status filter in inbox
- Unread count tracking
- Resizable panel layout (conversation list / thread)

### [DONE] Message Handling
- Inbound message reception via Meta webhook
- Outbound message sending via Meta Graph API v21.0
- Message status tracking (sent/delivered/read/failed)
- Internal notes (invisible to customer)
- Message deduplication by `metaMessageId`
- Auto-reopen resolved conversations on new inbound message

### [DONE] Team Management
- Invite by email (Clerk native)
- Invite by WhatsApp (sends template message with invite link)
- Shareable invite links (7-day expiry, auto-revoke old)
- Role management (change role with last-admin protection)
- Remove member (with conversation unassignment)
- Team member list view

### [DONE] Assignment System
- First-reply-wins auto-assignment
- Manual assignment by admin/supervisor
- Agent reassignment
- Conversation unassignment on member removal

### [PARTIAL] Round Robin Assignment
- Round-robin action exists (`convex/actions/roundRobin.ts`)
- Channel stores `roundRobinIndex`
- Assignment mode selectable in channel settings
- **BUG: Round-robin action is NEVER CALLED** — not triggered from inbound message handler

### [DONE] Contact Management (Basic)
- Auto-create contact on first inbound message
- Contact list query
- Upsert by phone (update lastSeenAt if exists)

### [DONE] Quick Replies
- CRUD operations (create/update/delete)
- Category filtering
- Usage count tracking
- Quick reply panel in inbox

### [DONE] Invite Links
- Generate with 32-byte random token
- 7-day expiry
- Auto-revoke previous active link on generate
- Validate and join flow
- Plan limit checking on join

### [DONE] Marketing Site
- Hero section, features, differentiators, pricing
- Arabic/English content
- Mobile responsive navigation

### [DONE] Webhook Integration
- Meta webhook verification (GET)
- Inbound message processing (POST)
- HMAC-SHA256 signature verification
- Message status update processing

### [PARTIAL] Multi-Channel Support
- Schema supports multiple channels per tenant
- Channel filter in inbox UI
- Channel-specific assignment mode
- **Missing:** No UI to add/connect new channels (Embedded Signup not implemented)

### [PARTIAL] Plan Limits
- Plan limits defined: free=2 agents, starter=5, growth=15, business=unlimited
- Agent limit checked on invite
- **Missing:** No `tenants` table, plan always defaults to "free"
- **Missing:** No billing integration (Lemon Squeezy not set up)

### [MISSING] WhatsApp Embedded Signup
- Not implemented — no way for tenants to connect their own WhatsApp number

### [MISSING] Dashboard Navigation/Sidebar
- No sidebar or navigation exists in the dashboard layout
- Users have no way to navigate between inbox, settings, contacts, etc. without URL

### [MISSING] Analytics
- No analytics dashboard
- No response time tracking
- No agent performance metrics
- No conversation volume tracking

### [MISSING] Contact Management (Full)
- No contact detail/edit page
- No manual contact creation UI
- No CSV/Excel import
- No tag management UI
- No custom fields
- No contact search/filter

### [MISSING] Conversation Labels
- `labels` field exists on conversations schema (empty array)
- No UI for label management
- No label creation/editing
- No label filtering

### [MISSING] SLA & Response Time Alerts
- Not implemented at all

### [MISSING] CSAT (Customer Satisfaction)
- Not implemented at all

### [MISSING] Data Export
- Not implemented at all

### [MISSING] Conversation Templates (with variables)
- Quick replies exist but no variable/template support

### [MISSING] WhatsApp Business Profile Editing
- Not implemented

### [MISSING] Dark Mode
- ThemeProvider is set up but no theme toggle exists in the UI

### [MISSING] Media Message Support
- Schema supports image/document/audio/video/sticker/location content types
- Webhook handler marks all non-text messages as "unsupported"
- No media download, display, or sending

---

## 8. API Routes & Endpoints

### HTTP Routes (`convex/http.ts`)
| Method | Path | Purpose |
|---|---|---|
| GET | `/meta-webhook` | Meta webhook verification (hub.mode, hub.verify_token, hub.challenge) |
| POST | `/meta-webhook` | Inbound messages + status updates (HMAC-SHA256 verified) |

### Convex Queries (client-callable)
| Function | Auth | Description |
|---|---|---|
| `channels.listForTenant` | Any authenticated | List all channels for tenant |
| `channels.get` | Any authenticated | Get single channel (tenant-scoped) |
| `conversations.listForCaller` | Role-based | Admin/Supervisor see all; Agent sees own + unassigned |
| `conversations.get` | Role-based | Same visibility rules |
| `messages.listForConversation` | Role-based | Messages for a conversation (with access check) |
| `contacts.listForTenant` | Any authenticated | List all contacts for tenant |
| `quickReplies.list` | Any authenticated | List quick replies, optional category filter |
| `inviteLinks.getActive` | Admin only | Get current active invite link |

### Convex Mutations (client-callable)
| Function | Auth | Description |
|---|---|---|
| `conversations.assign` | Admin/Supervisor | Assign conversation to agent |
| `conversations.setStatus` | Role-based | Change conversation status |
| `messages.sendReply` | Role-based | Send outbound message + schedule WhatsApp delivery |
| `messages.addInternalNote` | Role-based | Add internal note to conversation |
| `messages.clearUnread` | Any authenticated | Reset unread count |
| `channels.setAssignmentMode` | Admin only | Change channel assignment mode |
| `quickReplies.create` | Admin only (BUG) | Create quick reply |
| `quickReplies.update` | Admin only (BUG) | Update quick reply |
| `quickReplies.remove` | Admin only (BUG) | Delete quick reply |
| `inviteLinks.generate` | Admin only | Generate new invite link |
| `inviteLinks.revokeLink` | Admin only | Revoke active invite link |

### Convex Actions (client-callable)
| Function | Auth | Description |
|---|---|---|
| `orgMembers.inviteByEmail` | Admin only | Send Clerk email invitation |
| `orgMembers.inviteByWhatsApp` | Admin only | Send WhatsApp invite with link |
| `orgMembers.list` | Admin/Supervisor | List org members + pending invites |
| `orgMembers.changeRole` | Admin only | Change member role |
| `orgMembers.removeMember` | Admin only | Remove member + unassign conversations |
| `actions.validateInvite.validateAndJoin` | Any authenticated | Validate invite token and join org |

### Convex Internal Functions (server-only)
| Function | Type | Description |
|---|---|---|
| `messages.createInbound` | Mutation | Process inbound WhatsApp message |
| `messages.updateStatus` | Mutation | Update message status by ID |
| `messages.updateStatusByMetaId` | Mutation | Update message status by Meta ID |
| `conversations.unassignAll` | Mutation | Unassign all conversations from agent |
| `conversations.assignInternal` | Mutation | Assign conversation (no auth check) |
| `channels.listByPhoneId` | Query | Find channel by phone number ID |
| `channels.listByTenantId` | Query | Find channels by tenant |
| `channels.getById` | Query | Get channel by ID |
| `channels.incrementRoundRobinIndex` | Mutation | Increment round-robin counter |
| `contacts.upsertByPhone` | Mutation | Create or update contact |
| `inviteLinks.getByToken` | Query | Find invite link by token |
| `inviteLinks.getActiveForTenant` | Query | Find active link for tenant |
| `inviteLinks.ensureActive` | Mutation | Get or create active invite link |
| `actions.sendWhatsAppMessage.sendMessage` | Action | Send WhatsApp text via Meta API |
| `actions.roundRobin.assignRoundRobin` | Action | Round-robin assignment logic |

---

## 9. Components Inventory

### Inbox Components (`components/inbox/`)

| Component | Purpose |
|---|---|
| `conversation-list.tsx` | Filterable list of conversations with real-time updates |
| `conversation-list-item.tsx` | Single conversation row (contact name, preview, unread badge, status) |
| `conversation-thread.tsx` | Message thread display with auto-scroll |
| `message-bubble.tsx` | Individual message bubble (inbound/outbound/internal note styling) |
| `message-input.tsx` | Text input with send button |
| `quick-reply-panel.tsx` | Quick reply selector panel |
| `status-selector.tsx` | Conversation status dropdown (open/pending/resolved) |
| `assign-agent-dialog.tsx` | Dialog to assign conversation to an agent |

### Settings Components (`components/settings/`)

| Component | Purpose |
|---|---|
| `team-member-list.tsx` | Team member list with role badges, invite modal trigger |
| `invite-modal.tsx` | Modal for inviting by email, WhatsApp, or shareable link |
| `role-select.tsx` | Role dropdown selector |
| `assignment-mode-select.tsx` | Channel assignment mode selector (first_reply/manual/round_robin) |

### Marketing Components (`components/marketing/`)

| Component | Purpose |
|---|---|
| `marketing-page.tsx` | Full marketing page composition |
| `hero-section.tsx` | Hero banner with CTA |
| `features-section.tsx` | Feature cards grid |
| `differentiators-section.tsx` | Competitive advantages section |
| `pricing-section.tsx` | Pricing plans with currency switching |
| `marketing-nav.tsx` | Top navigation bar |
| `marketing-footer.tsx` | Footer |
| `mobile-nav-sheet.tsx` | Mobile navigation sheet |

### UI Components (`components/ui/`) — shadcn/ui
`badge`, `button`, `dialog`, `dropdown-menu`, `input`, `resizable`, `scroll-area`, `sheet`, `textarea`

### Provider Components
| Component | Purpose |
|---|---|
| `convex-client-provider.tsx` | Wraps ConvexReactClient + ClerkProvider for Convex |
| `theme-provider.tsx` | next-themes ThemeProvider wrapper |

---

## 10. Known Bugs & Issues

### BUG 1: Supervisor excluded from quick reply management
**Files:** `convex/quickReplies.ts` (lines 35-36, 62-63, 89-90)
```typescript
// Current (broken):
const isAdminOrSupervisor = orgRole === "org:admin" || orgRole === "admin";
// Should be:
const isAdminOrSupervisor = orgRole === "org:admin" || orgRole === "admin" || orgRole === "org:supervisor";
```
The CLAUDE.md spec says Supervisors should be able to create labels/templates. Quick replies use the same pattern.

### BUG 2: Supervisor excluded from message access checks
**File:** `convex/messages.ts` (lines 14-15, 47-48)
```typescript
// Current (broken):
const isAdminOrSupervisor = orgRole === "org:admin" || orgRole === "admin";
// Missing: || orgRole === "org:supervisor"
```
Supervisors should be able to view all conversations per the spec, but the messages query will return empty for conversations assigned to other agents.

### BUG 3: Round-robin assignment never triggered
**File:** `convex/actions/roundRobin.ts` exists and works, but `convex/http.ts` (inbound message handler) and `convex/messages.ts` (`createInbound`) never call it. New conversations on round-robin channels remain unassigned.

### BUG 4: Plan always defaults to "free"
**File:** `convex/lib/planLimits.ts` — `assertAgentLimitNotReached` has `plan: Plan = "free"` default. No caller ever passes a plan value because there's no `tenants` table storing plan info.

### BUG 5: Missing `META_SYSTEM_USER_TOKEN`
Outbound WhatsApp messages (`convex/actions/sendWhatsAppMessage.ts`) use `process.env.META_SYSTEM_USER_TOKEN` which is not in `.env.local`. All outbound messages will fail.

### BUG 6: Missing `NEXT_PUBLIC_APP_URL`
Invite links (`convex/inviteLinks.ts`, `convex/orgMembers.ts`) fall back to `http://localhost:3000`. In production, invite links will point to localhost.

### BUG 7: Clerk auth.config.ts hardcodes dev domain
**File:** `convex/auth.config.ts` — Domain is hardcoded to `communal-octopus-5.clerk.accounts.dev`. Must be environment-variable-driven for production.

### BUG 8: No dashboard navigation
No sidebar, navbar, or any navigation UI in the dashboard layout. Users cannot navigate between pages without manually typing URLs.

### BUG 9: Webhook swallows all errors silently
**File:** `convex/http.ts` (line 110) — `catch {}` swallows all errors in webhook POST handler. Malformed payloads, failed mutations, etc. are invisible.

---

## 11. TODOs in Code

```
convex/channels.ts:78: // TODO: check tenant plan when plan field exists
```

---

## 12. What's Missing (Prioritized)

### Tier 1 — Blocking Launch
1. **WhatsApp Embedded Signup** — No way for tenants to connect their WhatsApp number. This is the core onboarding step.
2. **Dashboard sidebar/navigation** — Users literally cannot navigate the app.
3. **Fix `META_SYSTEM_USER_TOKEN`** — Outbound messages won't work.
4. **Fix `NEXT_PUBLIC_APP_URL`** — Invite links broken in production.
5. **Fix supervisor role bugs** — Supervisors locked out of features they should access.
6. **Wire up round-robin assignment** — Feature exists but isn't connected.
7. **Tenants table + plan management** — No way to manage billing/plans per tenant.

### Tier 2 — Required for Viable Product
8. **Contact management UI** — View, edit, search, filter contacts.
9. **Conversation labels** — Schema field exists, no UI.
10. **Analytics dashboard** — No metrics at all.
11. **Media message support** — Images, documents, audio all show as "unsupported".
12. **Data export** — Required by spec for all plans.
13. **Dark mode toggle** — ThemeProvider exists, no UI toggle.
14. **Lemon Squeezy billing integration** — No payment system.

### Tier 3 — Growth Features
15. **SLA & response time alerts**
16. **CSAT (customer satisfaction ratings)**
17. **Conversation templates with variables**
18. **WhatsApp Business Profile editing**
19. **CSV/Excel contact import**
20. **Agent offline auto-unassign**
21. **Broadcast/bulk campaigns**
22. **Chatbot/automation flows**

---

## 13. Security Assessment

### Good
- All Convex queries/mutations validate `tenantId` from auth context
- Webhook signature verification using HMAC-SHA256
- Phone number validation (E.164) on WhatsApp invite
- Invite link tokens are cryptographically random (32 bytes)
- Last-admin protection prevents org lockout
- Middleware protects all dashboard routes

### Concerns
- `convex/auth.config.ts` hardcodes Clerk dev domain — prod will break
- No rate limiting on webhook endpoint
- Error swallowing in webhook handler hides potential issues
- `META_SYSTEM_USER_TOKEN` not set — if set incorrectly, could expose token in error logs
- No input sanitization on message content (potential XSS if content rendered as HTML)
- `.env.local` is gitignored but `CLAUDE.md` lists all expected env var names

---

## 14. Key Code Snippets

### Auth Identity Extraction (used in every query/mutation)
```typescript
// convex/lib/auth.ts
export async function getCallerIdentity(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("UNAUTHORIZED");
  if (!identity.orgId) throw new ConvexError("NO_ORG");
  return {
    tenantId: identity.orgId,
    callerId: identity.subject,
    orgRole: identity.orgRole ?? "org:agent",
  };
}
```

### Role-Based Conversation Visibility
```typescript
// convex/conversations.ts — listForCaller handler
if (isAdminOrSupervisor(orgRole)) {
  // See ALL conversations for tenant (with optional status filter)
  conversations = await ctx.db.query("conversations")
    .withIndex("by_tenant_status", ...)
    .collect();
} else {
  // Agents see only: assigned to them + unassigned
  const assigned = await ctx.db.query("conversations")
    .withIndex("by_tenant_agent", q => q.eq("tenantId", tenantId).eq("assignedAgentId", callerId))
    .collect();
  const unassigned = await ctx.db.query("conversations")
    .withIndex("by_tenant_agent", q => q.eq("tenantId", tenantId).eq("assignedAgentId", undefined))
    .collect();
  conversations = [...assigned, ...unassigned];
}
```

### First-Reply-Wins Assignment
```typescript
// convex/messages.ts — sendReply handler
let assignedAgentId = conversation.assignedAgentId;
if (!assignedAgentId && channel.assignmentMode === "first_reply") {
  assignedAgentId = callerId;
}
await ctx.db.patch(args.conversationId, {
  lastMessageAt: Date.now(),
  lastMessagePreview: args.content.slice(0, 100),
  assignedAgentId,
});
```

### Inbound Message Processing
```typescript
// convex/messages.ts — createInbound handler (internal)
// 1. Dedup by metaMessageId
const existing = await ctx.db.query("messages")
  .withIndex("by_meta_message_id", q => q.eq("metaMessageId", args.metaMessageId))
  .first();
if (existing) return existing._id;

// 2. Upsert contact
const contactId = await ctx.runMutation(internal.contacts.upsertByPhone, { ... });

// 3. Find or create conversation
let conversation = await ctx.db.query("conversations")
  .withIndex("by_tenant_channel", ...)
  .filter(q => q.eq(q.field("contactId"), contactId))
  .first();

if (!conversation) {
  // Create new conversation
  await ctx.db.insert("conversations", { status: "open", ... });
} else {
  // Update existing: bump unread, reopen if resolved
  if (conversation.status === "resolved") patch.status = "open";
}

// 4. Insert message
return ctx.db.insert("messages", { direction: "inbound", ... });
```

### Webhook Signature Verification
```typescript
// convex/http.ts
async function verifySignature(body: string, signature: string, appSecret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hexMac = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, "0")).join("");
  return signature === `sha256=${hexMac}`;
}
```

### Plan Limits
```typescript
// convex/lib/planLimits.ts
const PLAN_LIMITS: Record<string, number> = {
  free: 2, starter: 5, growth: 15, business: Infinity,
};
// NOTE: plan parameter always defaults to "free" — no tenant plan storage exists
```

---

*End of audit report.*
