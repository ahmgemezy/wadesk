# CLAUDE.md — WABDesk

> This file is the single source of truth for Claude Code when working on the WABDesk codebase.
> Read this file fully before writing any code, making any architectural decision, or answering any question.

---

## 1. Project Overview

**WABDesk** is an Arabic-first multi-agent WhatsApp Business platform built for SMBs in Arabic-speaking markets.

**Core Value Proposition:**
A team inbox built on WhatsApp Business — multiple agents handle customer conversations from one shared dashboard, with no customer knowing they're talking to a team.

**Primary Markets:** Egypt 🇪🇬, Saudi Arabia 🇸🇦, UAE 🇦🇪, broader Arabic-speaking markets  
**Language:** Arabic-first UI (RTL), English supported  
**Founder:** Solo founder (Ahmed), non-technical, uses AI-assisted (vibe coding) workflows

---

## 2. Tech Stack

| Layer         | Technology                                         |
| ------------- | -------------------------------------------------- |
| Frontend      | Next.js 15 (App Router)                            |
| Backend / DB  | Convex (real-time database + serverless functions) |
| Auth          | Better Auth                                        |
| UI Components | shadcn/ui                                          |
| Styling       | Tailwind CSS                                       |
| WhatsApp API  | Meta WhatsApp Business Cloud API                   |
| Payments      | Paddle                                             |
| Hosting       | Vercel                                             |
| Language      | TypeScript                                         |

---

## 3. Architecture

### Multi-Tenancy Model

- **Shared Account Model** — each client gets their own WhatsApp Business Account (WABA) via Meta Embedded Signup
- Each tenant is fully isolated — conversations, agents, settings
- No shared WhatsApp numbers between tenants

### Key Architectural Rules

- All Convex mutations must be tenant-scoped (never query without `tenantId`)
- Better Auth `orgId` = `tenantId` throughout the system
- Real-time updates via Convex subscriptions (not polling)
- All API calls to Meta go through server-side Convex actions (never client-side)
- Webhook verification for all incoming Meta webhooks

---

## 🔧 Convex Performance Optimization (Phase 1 deployed 2026-05-11)

> Architectural decisions and principles from the Convex perf work. Future sessions must respect these or they will undo the savings. The full changelog lives in `PROGRESS.md`; this section is the durable contract.

### Baseline (dev `determined-loris-556`, Apr 30 – May 30, 2026)

Pre-Phase-1 monthly telemetry from a nearly-empty deployment:

| Metric         | Value         | Top offender                                                            |
| -------------- | ------------- | ----------------------------------------------------------------------- |
| Function calls | 924K / month  | Better Auth — 471K                                                      |
| DB I/O         | 1.83 GB       | `messageScheduling.processScheduledMessages` — 1.46 GB                  |
| Compute        | 1.6 GB-hours  | `orgMembers.list` / `orgMembersQueries.listActive` — 1.3 GB-hours       |
| Data egress    | 553 MB        | `orgMembers.list` / `listActive` — 434 MB                               |

### Phase 1 — landed 2026-05-11 (cron + index + reaper)

#### Decision 1: two distinct state machines for `messages`. Do NOT collapse them.

- **Cron-driven path** (scheduled outbound): `scheduled → processing → sent | failed`. Cross-transaction; needs an explicit checkpoint state because the cron picks up rows written in a previous transaction. The reaper bounces stuck `"processing"` rows back to `"scheduled"` after `PROCESSING_TIMEOUT_MS`, up to `MAX_RETRY_ATTEMPTS`.
- **Instant-send path** (agent click, automation, broadcast): `(insert) → sending → sent | failed`. Atomic — the mutation that writes `"sending"` also schedules the send action in the same Convex transaction (commit-or-nothing). Reaper not needed.

`"processing"` and `"sending"` are **not redundant**. They mark different ownership windows: cron-owned vs. mutation-owned. Collapsing them would either (a) lose reaper protection on the cron path or (b) force the instant path through a checkpoint it does not need.

#### Decision 2: `INTERNAL_` prefix convention for failure codes written by the cron / reaper

- `INTERNAL_*` — WABDesk bug or cron issue. Examples: `INTERNAL_MAX_RETRIES_EXCEEDED`, `INTERNAL_STUCK_PROCESSING_TIMEOUT`.
- `META_*` — Meta API error. Introduced in Phase 1.5 (see plan below); not yet present.
- **Unprefixed** strings — `CONVERSATION_NOT_FOUND`, `CHANNEL_OR_CONTACT_NOT_FOUND`. Dual-use: cron failure reasons AND client-facing `ConvexError` codes thrown from user mutations in `convex/messages.ts`. Intentionally NOT prefixed in Phase 1 — a unified taxonomy refactor is a separate piece of work tracked in `PROGRESS.md` backlog item #2.

When you introduce new failure codes, **pick a prefix** before writing the literal.

#### Decision 3: named constants at the top of `convex/messageScheduling.ts`

```ts
const MAX_RETRY_ATTEMPTS = 5;
const PROCESSING_TIMEOUT_MS = 10 * 60 * 1000;  // 10 min
const BATCH_SIZE = 100;                         // 6,000/hour ceiling
const FAILURE_INTERNAL_MAX_RETRIES = "INTERNAL_MAX_RETRIES_EXCEEDED";
const FAILURE_INTERNAL_STUCK_PROCESSING = "INTERNAL_STUCK_PROCESSING_TIMEOUT";
```

- Do NOT inline these as magic numbers / string literals.
- Do NOT change values without first checking `PROGRESS.md` backlog item #3 (BATCH_SIZE tuning triggers) — the constants encode soak-test conclusions.

#### Decision 4: indexed query on `(status, scheduledAt)` — tenant-agnostic by design

- Schema index `messages.by_status_and_scheduledAt = ["status", "scheduledAt"]`. Global, not tenant-prefixed.
- Adding `tenantId` as the leading field would force the cron to enumerate tenants — the anti-pattern we just eliminated. Tenant isolation is preserved per-row (`messages.tenantId` on each row; the send action takes `tenantId` and resolves the Meta token per-channel).
- Do NOT add a `by_tenant_status_scheduledAt` compound index "for safety" — it would silently bring the regression back.

### Phase 2 — pending, awaiting 24h Phase 1 telemetry

**Target:** `orgMembers.list` action + `orgMembersQueries.listActive` query — together responsible for ~81% of compute and ~80% of egress.

**Confirmed root causes** (from Phase 0 audit, not the original guess):

- `useOrganization()` in `lib/auth-hooks.ts` always subscribes to `listActive` regardless of which field the caller reads. 36 frontend call sites, most only consuming `membership.role` or `organization.id` (both already in the session JWT).
- N+1 inside `listActive` itself: `listOrgMembers` + one `findUserById` per member.

**Strategy:**

- Make the `useOrganization()` shim **opt-in** to the heavy `memberships` payload. Verified safe: callers that read `.memberships` already pass `{ memberships: true }` — the shim just ignores the option today.
- Split `orgMembers.list` action into lightweight `list` + on-demand `getMemberDetails`, OR consider denormalizing hot fields (`userName`, `userEmail`, `userImage`) onto `member` to eliminate the per-row `findUserById`.

**Do NOT start Phase 2 without explicit go-ahead from Ahmed.** Phase 2 has frontend blast radius; it deserves its own review cycle.

### Phase 3 — pending, after Phase 2

**Target:** Better Auth — 471K function calls/month (`HTTP /api/auth/*` 245K, `betterAuth/adapter.findMany` 232K, `betterAuth/orgQueries.*` ~190K).

**Confirmed config gap** (from Phase 0 audit): `convex/auth.ts` has no `cookieCache`, no `session.updateAge`, no `expiresIn` override — all Better Auth defaults. Every request validates the session against the DB.

**Strategy:**

- Enable `cookieCache: { enabled: true, maxAge: 5 * 60 }` and set `session.updateAge` (e.g., 24h) so most requests skip DB validation entirely.
- Better Auth tables are already well-indexed (see `convex/betterAuth/schema.ts`) — the 232K `findMany` are not from missing indexes.
- A meaningful portion of `orgQueries.*` traffic is downstream of Phase 2's over-subscription. Re-measure after Phase 2 lands before tuning Phase 3 further.

**Highest-risk phase — extreme caution.** Better Auth misconfiguration can lock out every active session. Each option goes in alone with explicit rollback. Verification checklist (existing session stays valid, fresh signup works, OAuth works, logout works, org switch works) must pass on dev before prod.

### Verification queries (keep handy for ongoing monitoring)

Paste into the Convex dashboard against the deployed deployment.

**1. Messages stuck in `"processing"` > 10 min** (expected: empty in a healthy deployment)

```ts
const PROCESSING_TIMEOUT_MS = 10 * 60 * 1000;
const now = Date.now();
const stuck = await ctx.db
  .query("messages")
  .withIndex("by_status_and_scheduledAt", (q) => q.eq("status", "processing"))
  .collect();
return stuck.filter(
  (m) => now - (m.processingStartedAt ?? m._creationTime) > PROCESSING_TIMEOUT_MS,
);
```

**2. Recent failures grouped by `failureReason`** (last 24h; spot trends)

```ts
const since = Date.now() - 24 * 60 * 60 * 1000;
const failed = await ctx.db
  .query("messages")
  .withIndex("by_status_and_scheduledAt", (q) => q.eq("status", "failed"))
  .collect();
const recent = failed.filter(
  (m) => (m.lastFailureAt ?? m._creationTime) >= since,
);
const grouped: Record<string, number> = {};
for (const m of recent) {
  const k = m.failureReason ?? "(none)";
  grouped[k] = (grouped[k] ?? 0) + 1;
}
return grouped;
```

**3. Confirm new index is hot** (run before/after deploy to compare bytes-read)

```ts
return await ctx.db
  .query("messages")
  .withIndex("by_status_and_scheduledAt", (q) =>
    q.eq("status", "scheduled").lte("scheduledAt", Date.now()),
  )
  .take(10);
```

### Reference pointers

- Full Phase 1 changelog → `PROGRESS.md` entry dated **2026-05-11: Convex Perf Phase 1 — Indexed Scheduled-Message Cron + Stuck-Row Reaper**.
- Deferred / production-readiness backlog → `PROGRESS.md:2029` (three items: unreaped `"sending"`, error-code taxonomy refactor, BATCH_SIZE tuning triggers).
- Pre-Phase-1 baseline backup → `./backups/wabdesk-backup-phase1-2026-05-11.zip`.
- Git tag → `phase1-deployed`.

---

## 4. RTL & Arabic Rules (CRITICAL)

These rules apply to EVERY UI component, no exceptions:

- Default text direction: `dir="rtl"`
- All layouts must work in RTL — no hardcoded `left`/`right` CSS values, use `start`/`end`
- Tailwind: use `ms-` / `me-` (margin-start/end) instead of `ml-` / `mr-`
- Arabic font: **Cairo** or **Tajawal** (Google Fonts) — never use default system fonts for Arabic text
- Numbers in Arabic UI: use Eastern Arabic numerals (٠١٢٣) OR Western (0123) — be consistent per context
- Date formats: use Hijri where culturally appropriate (Saudi), Gregorian elsewhere
- Right-to-left icons: flip directional icons (arrows, chevrons) for RTL context
- Input fields: phone numbers always use `dir="ltr"` inside RTL layout
- Test every component in Arabic before considering it done

---

## 5. Business Model

### Pricing Strategy

- **Freemium entry point** — free tier with limits, no credit card required
- Paid tiers scale with number of agents and features
- Pricing in local currencies: **EGP** (Egypt), **SAR** (Saudi), **AED** (UAE), **USD** (international)
- 14-day free trial on paid plans

### Meta Business Verification

- Free tier: limited to Meta's unverified limits (~1000 conversations/month)
- Paid tiers: encourage/require Meta Business Verification for higher limits
- Freemium scales with Meta verification status

### Payments

- Paddle as Merchant of Record (handles VAT/tax globally, supports international payouts)

---

## 6. Core Features (Phase 1)

### Must-Have for Launch

- [ ] Multi-agent shared inbox (multiple agents, one WhatsApp number)
- [ ] Real-time conversation assignment (assign to agent / unassign)
- [ ] Conversation status: Open / Pending / Resolved
- [ ] Quick replies / saved responses
- [ ] Internal notes (agents can leave notes invisible to customer)
- [ ] Contact management (customer profiles)
- [ ] Basic analytics (conversations handled, response time, agent performance)
- [ ] WhatsApp Embedded Signup (client connects their own WABA in <5 min)
- [ ] Webhook receiver for incoming messages
- [ ] Multi-tenant onboarding flow

### Deferred to Phase 2

- WhatsApp Catalog integration
- Broadcast / bulk campaigns
- Chatbot / automation flows
- WooCommerce / e-commerce integrations
- WhatsApp OTP as a service
- Multilingual notifications
- Abandoned cart recovery
- Shopify integration

---

## 7. Multi-Number Support (CRITICAL — Must be in Schema from Day One)

Each tenant can connect **multiple WhatsApp numbers** (channels). This is a real use case: a business may have one number for Sales and another for Support.

### Schema Design

- Each "number" = a **WhatsApp Channel** document, linked to `tenantId`
- Conversations are always scoped to a specific `channelId`
- Agents can be assigned to one or more channels via permissions
- Inbox UI shows all channels with a filter/tab per channel

### Why This Must Be Done Early

Retrofitting multi-number support after launch requires painful schema migrations. Design for it from day one even if Free plan only allows 1 number.

### Plan Limits

| Plan     | Max Numbers |
| -------- | ----------- |
| Free     | 1           |
| Starter  | 1           |
| Growth   | 5           |
| Business | Unlimited   |

---

## 8. WhatsApp Business Profile Editing

Clients can edit their WhatsApp Business profile from within WABDesk dashboard via the Meta Business API.

### Editable Fields

- ✅ Display name (requires Meta review — show "pending" status in UI)
- ✅ Profile photo
- ✅ Business description
- ✅ Business address
- ✅ Business category
- ✅ Business hours
- ⏳ WhatsApp Catalog — deferred to Phase 2

### Important UX Note

Display name changes go through Meta review — **not instant**. The UI must clearly show a "pending review" state and notify the user when approved. Never imply it's instant.

### Plan Availability

- Profile editing available on **Growth and above**
- Free and Starter can view profile but not edit

---

## 9. Onboarding Flow (Core KPI)

**Target: Sub-5-minute onboarding** — from signup to first WhatsApp message received in inbox.

Steps:

1. Sign up (Better Auth) → create org
2. Connect WhatsApp via Meta Embedded Signup
3. Send test message to verify connection
4. Invite first agent (optional)
5. Done — inbox is live

Every extra step = friction = churn. Keep it ruthlessly simple.

---

## 10. Pricing Plans

### Early Adopter Pricing (Anchored)

Crossed-out prices are shown on the pricing page to anchor perceived value.

#### 🆓 Free — مجاني | $0/month

|                     |                  |
| ------------------- | ---------------- |
| WhatsApp numbers    | 1                |
| Agents              | 3                |
| Conversations/month | 300              |
| Features            | Basic inbox only |

#### 🥈 Starter — ~~$19.99~~ → $9.99/month

| Market           | Price         |
| ---------------- | ------------- |
| 🇪🇬 Egypt         | 499 EGP/month |
| 🇸🇦 Saudi         | 37 SAR/month  |
| 🇦🇪 UAE           | 37 AED/month  |
| 🌍 International | $9.99/month   |

|                  |                                                                         |
| ---------------- | ----------------------------------------------------------------------- |
| WhatsApp numbers | 1                                                                       |
| Agents           | 6                                                                       |
| Conversations    | Unlimited                                                               |
| Features         | Quick replies, Internal notes, Basic analytics, Broadcasts, SLA alerts, CSAT |

#### 🥇 Growth _(Sweet spot)_ — ~~$49.99~~ → $22.99/month

| Market           | Price           |
| ---------------- | --------------- |
| 🇪🇬 Egypt         | 1,149 EGP/month |
| 🇸🇦 Saudi         | 86 SAR/month    |
| 🇦🇪 UAE           | 85 AED/month    |
| 🌍 International | $22.99/month    |

|                  |                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------- |
| WhatsApp numbers | 5                                                                                             |
| Agents           | 15                                                                                            |
| Conversations    | Unlimited                                                                                     |
| Features         | Everything in Starter + Up to 15 agents + 5 numbers + Automation rules + Business profile editing + Round-robin assignment |

#### 💎 Business — ~~$99.99~~ → $44.99/month

| Market           | Price           |
| ---------------- | --------------- |
| 🇪🇬 Egypt         | 2,249 EGP/month |
| 🇸🇦 Saudi         | 169 SAR/month   |
| 🇦🇪 UAE           | 165 AED/month   |
| 🌍 International | $44.99/month    |

|                  |                                                                               |
| ---------------- | ----------------------------------------------------------------------------- |
| WhatsApp numbers | Unlimited                                                                     |
| Agents           | Unlimited                                                                     |
| Conversations    | Unlimited                                                                     |
| Features         | Everything in Growth + API access + Dedicated onboarding + Advanced SLA rules |

#### Annual billing

Additional 20% off all paid plans when billed annually.

#### Pricing Notes for Developers

- Paddle handles automatic geo-based currency display and localization
- Plan limits enforced in Convex — check `tenant.plan` before allowing feature access
- Annual billing implemented as ~20% discount via Paddle price variants
- Paddle webhooks update `tenant.plan` in Convex on payment/subscription events

---

## 11. Competitive Landscape

| Competitor | Type             | Weakness vs WABDesk                                         |
| ---------- | ---------------- | ----------------------------------------------------------- |
| ElMujib    | Arab SaaS        | Limited features, poor UX                                   |
| Tactful.ai | Enterprise       | Too expensive for SMBs                                      |
| Zaher.ai   | Arab SaaS        | Limited market presence                                     |
| Wawp.net   | WordPress Plugin | Not a SaaS, no multi-agent inbox                            |
| Respond.io | Global SaaS      | English-first, expensive, complex                           |
| WATI       | Global SaaS      | 20% markup on Meta messages, $39/extra agent, English-first |
| SleekFlow  | Global SaaS      | $15/month per WhatsApp number, expensive for MENA           |

**WABDesk's moat:**

- Arabic-first UX — no global competitor does this
- Zero markup on Meta messages — clients pay Meta directly
- Local currency billing (EGP / SAR / AED)
- SMB pricing — 5 agents for ~$14 vs WATI's ~$137

**Core sales message:** _"Pay Meta for your messages. Pay WABDesk for your team inbox. Nothing more."_

---

## 12. Security Rules

- Never expose Meta API tokens client-side
- All webhook payloads must be signature-verified before processing
- Convex queries must always include `tenantId` filter — no cross-tenant data leakage
- Better Auth JWT used for all authenticated requests
- Rate limiting on all public-facing webhook endpoints
- Never log full message content in production (privacy)
- Phone numbers stored in E.164 format always

---

## 13. Code Style & Conventions

### General

- Language: TypeScript everywhere, no `any` types
- Components: functional components only, no class components
- File naming: `kebab-case` for files, `PascalCase` for components
- Imports: absolute imports via `@/` alias

### Convex

- Mutations: always validate `tenantId` from auth context first
- Queries: always filter by `tenantId`
- Actions: use for external API calls (Meta, etc.) — not mutations
- Schema: define all tables in `convex/schema.ts`

### Next.js

- App Router only — no Pages Router
- Server Components by default, Client Components only when needed (`"use client"`)
- API routes only for webhooks — all other data via Convex

### UI

- shadcn/ui components as base — customize, don't reinvent
- All new components go in `components/` with RTL support built-in
- Dark mode support required from day one

---

## 14. Environment Variables

```env
# Better Auth
NEXT_PUBLIC_Better Auth_PUBLISHABLE_KEY=
Better Auth_SECRET_KEY=

# Convex
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOY_KEY=
CONVEX_SITE_URL=          # e.g. https://happy-animal-123.convex.site (Convex dashboard → Settings)

# Meta WhatsApp Business API
META_APP_ID=
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=
META_SYSTEM_USER_TOKEN=

# WhatsApp Webhook (011)
WHATSAPP_WEBHOOK_VERIFY_TOKEN=   # Same as META_WEBHOOK_VERIFY_TOKEN — set in Meta App Dashboard
WHATSAPP_WEBHOOK_SECRET=         # Random secret shared between Next.js route and Convex action
WHATSAPP_APP_SECRET=             # Meta App Secret (Meta App Dashboard → Settings → Basic)
WHATSAPP_API_TOKEN=              # Permanent System User token for sending messages (task 013)
WHATSAPP_API_VERSION=v25.0       # Meta API version — always use v25.0 (latest)

# WhatsApp Coexistence (013)
ECHO_DEDUP_WINDOW_MS=5000        # Secondary dedup window (ms) for mobile echoes — increase if SET_WAMID wamid_already_owned_by_other_row appears frequently in logs

# Paddle
PADDLE_API_KEY=
PADDLE_WEBHOOK_SECRET=
PADDLE_SELLER_ID=
```

---

## 15. Key Product Decisions (Do Not Revisit Without Good Reason)

| Decision                            | Rationale                                                                   |
| ----------------------------------- | --------------------------------------------------------------------------- |
| Convex over Supabase                | Real-time first, no SQL complexity, faster to build                         |
| Better Auth over NextAuth           | Multi-tenant orgs built-in, saves weeks of work                             |
| Paddle over Stripe                  | MoR = handles MENA VAT + global tax automatically; account approval pending |
| Shared WABA model (Embedded Signup) | Client owns their number, WABDesk can't be shut down                        |
| Freemium over free trial only       | Lower barrier for Arab SMB market                                           |
| Arabic-first over bilingual         | Differentiation from all global competitors                                 |

---

## 16. Contact Management (Lightweight CRM)

WABDesk is NOT a full CRM — but it must have enough contact management to make agents effective. Think of it as "CRM-lite" built around WhatsApp conversations.

### What's Included (Phase 1)

Every customer who messages a tenant gets a **Contact profile** automatically:

| Field                  | Details                                                 |
| ---------------------- | ------------------------------------------------------- |
| Phone number           | Auto-captured from WhatsApp (E.164 format)              |
| Display name           | From WhatsApp profile                                   |
| Custom name            | Agent can override/set manually                         |
| Tags                   | e.g. "VIP", "مشكلة متكررة", "عميل جديد"                 |
| Notes                  | Free-text notes about this contact                      |
| Conversation history   | All past conversations with this contact                |
| First seen / Last seen | Auto-tracked                                            |
| Assigned agent         | Who usually handles this contact                        |
| Custom fields          | Agent-defined key/value pairs (e.g. "Order ID", "City") |

### What's NOT Included (Phase 1)

- ❌ Sales pipeline / deals
- ❌ Email tracking
- ❌ Lead scoring
- ❌ Integration with external CRMs (Phase 2)

### Adding Contacts — 3 Ways

1. **Auto-capture** — contact created automatically when they message the business
2. **Manual input** — agent adds contact manually (name + phone number + optional fields)
3. **CSV/Excel Import** — bulk upload from spreadsheet

### CSV Import Rules

- Required columns: `phone` (E.164 or local format — auto-convert)
- Optional columns: `name`, `tags`, `notes`, any custom fields
- Show preview before confirming import
- Duplicate detection: if phone already exists → skip or merge (user chooses)
- Max import size: 10,000 contacts per upload
- Show import summary: "X added, Y skipped (duplicates), Z failed (invalid numbers)"

### Schema Notes

- `contacts` table scoped to `tenantId`
- One contact per phone number per tenant
- Contact auto-created on first incoming message if not exists
- Tags stored as array of strings for fast filtering
- `source` field: `"auto"` | `"manual"` | `"import"` — track how contact was added

---

## 17. Data Portability & Export

Clients must be able to export ALL their data at any time — canceling, migrating, or backup. This is a trust signal and in some regions a legal requirement.

### What Must Be Exportable

| Data                 | Format      |
| -------------------- | ----------- |
| Contacts             | CSV / Excel |
| Conversation history | CSV / JSON  |
| Analytics reports    | CSV / PDF   |
| Agent list           | CSV         |

### UX Requirements

- Export button in **Settings → Data & Privacy**
- Large exports are async — notify when ready (email or in-app)
- File named clearly: `WABDesk-export-[tenant]-[date].zip`
- On cancellation: keep data accessible for **30 days** then purge — never delete immediately

### Plan Availability

- ✅ Available on ALL plans including Free
- Exporting data is a right, not a premium feature

### Marketing Angle

> _"بياناتك ملكك دايماً — صدّرها في أي وقت"_
> This reduces churn fear and builds trust, especially with Gulf enterprise clients.

---

## 18. Conversation Templates (Advanced Quick Replies)

Beyond simple quick replies — full templates with dynamic variables that agents can fill before sending.

### How It Works

- Template: `"أهلاً {{name}}، طلبك رقم {{order_id}} اتشحن النهارده وهيوصلك خلال {{days}} أيام"`
- Agent picks template → fills variables in a form → sends in one click
- Templates organized by category: Greetings / Orders / Complaints / Follow-up

### Rules

- Templates scoped to `tenantId` — each business has their own library
- Admins manage templates, agents use them
- Support Arabic and English templates
- Available on all paid plans (Starter and above)

---

## 19. Agent Roles & Permissions

### Adding Agents — 3 Ways

Admin can add agents via:

**A. Invite by Email**
Admin enters email → agent receives invite link → creates account → auto-joined to tenant.
Handled natively by Better Auth Organizations.

**B. Invite by WhatsApp**
Admin enters agent's phone number → WABDesk sends them an invite link via WhatsApp → they click and create account.
Preferred for Arab markets — agents don't always check email.

**C. Shareable Invite Link**
Admin generates a time-limited link (e.g. valid 7 days) → shares it anywhere (WhatsApp group, etc.) → anyone who opens it joins as Agent role by default.

---

### Roles & Permission Matrix

| Permission                     | Admin | Supervisor | Agent          |
| ------------------------------ | ----- | ---------- | -------------- |
| View all conversations         | ✅    | ✅         | ❌ own only    |
| Assign conversation to agent   | ✅    | ✅         | ❌             |
| Take over another agent's chat | ✅    | ✅         | ❌             |
| View full analytics            | ✅    | ✅         | own stats only |
| Export data                    | ✅    | ✅         | ❌             |
| Add / remove agents            | ✅    | ❌         | ❌             |
| Change billing / plan          | ✅    | ❌         | ❌             |
| Edit settings                  | ✅    | ❌         | ❌             |
| Create labels / templates      | ✅    | ✅         | ❌             |
| View CSAT scores               | ✅    | ✅         | own only       |
| View SLA breaches              | ✅    | ✅         | ❌             |

---

### Conversation Assignment Modes

Admin chooses one mode per channel in settings:

**A. First Reply Wins** _(default for small teams)_
First agent to reply → conversation auto-assigned to them.
Simple, no overhead, works well for teams of 2–5.

**B. Manual Assignment**
New conversations stay Unassigned until Admin/Supervisor assigns them.
Best when agents have specializations (e.g. one agent for complaints, one for sales).

**C. Round Robin** _(Growth and above)_
Conversations distributed equally across available agents automatically.
Best for medium teams where all agents handle the same type of requests.

### Assignment Rules (all modes)

- Agent can only see their assigned conversations (unless Supervisor/Admin)
- Unassigned conversations visible to all agents in a shared "Unassigned" queue
- Supervisor/Admin can reassign any conversation at any time
- If assigned agent is offline for >X hours (configurable), conversation returns to Unassigned queue

---

## 20. Conversation Labels

Agents tag conversations with labels for categorization and smarter analytics.

### Default Labels (customizable per tenant)

`شكوى` / `استفسار` / `طلب إلغاء` / `مبيعات` / `دعم فني` / `VIP`

### Rules

- Multiple labels per conversation allowed
- Labels are tenant-defined — Admin creates/edits/deletes labels
- Labels appear in analytics breakdowns (e.g. "40% of conversations this month were complaints")
- Labels filterable in inbox view
- Stored as array on conversation document

---

## 21. SLA & Response Time Alerts

If a conversation stays open without a reply for too long, alert the supervisor automatically.

### How It Works

- Admin sets SLA threshold per channel (e.g. "reply within 10 minutes")
- If no agent reply within threshold → conversation flagged as ⚠️ in inbox
- Supervisor gets in-app notification (and optionally WhatsApp notification)
- SLA breach tracked in analytics: "X% of conversations breached SLA this week"

### Plan Availability

- Basic SLA alerts: **Starter and above**
- Advanced SLA rules (per label/channel): **Business**

### Implementation Note

Use Convex scheduled functions to check open conversations periodically — not real-time polling.

---

## 22. CSAT — Customer Satisfaction Rating

After a conversation is closed, automatically send the customer a satisfaction rating request.

### Flow

1. Agent closes conversation
2. After X minutes (configurable, default: 5 min), send automated message:
   > _"شكراً على تواصلك مع [Business Name] 😊 كيف كانت تجربتك معنا؟"_
   > With reply options: ⭐ / ⭐⭐ / ⭐⭐⭐ / ⭐⭐⭐⭐ / ⭐⭐⭐⭐⭐
3. Response captured and linked to conversation + agent
4. CSAT score visible in agent profile and analytics dashboard

### Rules

- CSAT message sent as WhatsApp template (pre-approved by Meta)
- Customer can ignore — no follow-up if no response
- CSAT score per agent shown to Supervisor/Admin only
- Aggregate CSAT shown in analytics (e.g. "Average score this month: 4.3 ⭐")
- Toggle on/off per tenant in settings
- Available on **Starter and above**

---

## 23. Definition of Done

A feature is "done" when:

- [ ] Works correctly in Arabic (RTL) UI
- [ ] Works correctly in English (LTR) UI
- [ ] Handles loading states
- [ ] Handles error states
- [ ] Multi-tenant safe (no cross-tenant data access possible)
- [ ] Tested with a real WhatsApp message flow (not just mocked)

---

## 24. What WABDesk is NOT

- ❌ Not a chatbot builder
- ❌ Not a broadcast/spam tool
- ❌ Not a CRM
- ❌ Not a WordPress plugin
- ❌ Not targeting enterprise (focus: SMBs 2–20 agents)
- ❌ Not English-first

---

## 25. Roles & Permissions

### Tenant Member Roles

Each Better Auth Organization (tenant) has 3 roles: **Admin**, **Supervisor**, **Agent**

### Permissions Table

| Permission                       | Admin | Supervisor | Agent |
| -------------------------------- | :---: | :--------: | :---: |
| **Conversations**                |       |            |       |
| View all conversations           |  ✅   |     ✅     |  ❌   |
| View assigned conversations      |  ✅   |     ✅     |  ✅   |
| Reply to conversations           |  ✅   |     ✅     |  ✅   |
| Assign conversation to agent     |  ✅   |     ✅     |  ❌   |
| Reassign conversation            |  ✅   |     ✅     |  ❌   |
| Close / reopen conversation      |  ✅   |     ✅     |  ✅   |
| **Contacts**                     |       |            |       |
| View contacts                    |  ✅   |     ✅     |  ✅   |
| Create / edit contacts           |  ✅   |     ✅     |  ✅   |
| Delete contacts                  |  ✅   |     ✅     |  ❌   |
| **Team Management**              |       |            |       |
| Invite members (Admin only)      |  ✅   |     ❌     |  ❌   |
| Invite members (Agent only)      |  ✅   |     ✅     |  ❌   |
| Remove members (Admin only)      |  ✅   |     ❌     |  ❌   |
| Remove members (Agent only)      |  ✅   |     ✅     |  ❌   |
| Change member roles              |  ✅   |     ❌     |  ❌   |
| View team members list           |  ✅   |     ✅     |  ❌   |
| **WABA & Inbox Settings**        |       |            |       |
| Connect / disconnect WABA number |  ✅   |     ❌     |  ❌   |
| Edit inbox settings              |  ✅   |     ❌     |  ❌   |
| Manage quick replies / templates |  ✅   |     ✅     |  ❌   |
| **Reports & Analytics**          |       |            |       |
| View team-wide reports           |  ✅   |     ✅     |  ❌   |
| View own performance stats       |  ✅   |     ✅     |  ✅   |
| **Billing**                      |       |            |       |
| Manage subscription / billing    |  ✅   |     ❌     |  ❌   |

### Role Rules

Enforce these rules throughout the entire codebase:

- **Admin** — Full control over everything in the tenant.
- **Supervisor** — Can manage Agents only (invite & remove). Cannot invite, remove, or modify Admin accounts. Cannot access billing or WABA settings.
- **Agent** — Works only on conversations assigned to them. Cannot see other agents' conversations or the team members list.

### Implementation Notes

- Role checks **must be enforced server-side** in Convex functions — never trust client-side checks alone.
- Use Better Auth `organizationMembership.role` to gate all role-sensitive actions.
- When a Supervisor attempts to invite or remove a member, validate that the target member's role is `agent` before proceeding — reject with a clear error if the target is `admin` or `supervisor`.

---

## 26. Round-Robin Assignment (Task 014)

Conversations are distributed automatically and equally across available agents in a channel.

### How It Works

- Admin enables Round Robin mode per channel (replaces "First Reply Wins" or "Manual Assignment")
- When a new conversation comes in, it is assigned to the agent whose turn is next in the rotation
- Rotation is tracked via `channels.roundRobinIndex` (already in schema) — increments on each assignment, wraps around
- Only agents who are members of the channel (`channelMembers` table) are included in the rotation
- If a channel has 0 members → conversation stays Unassigned

### Rules

- Round Robin mode is Growth and above
- If an agent is removed from a channel mid-rotation, skip their slot (recalculate index from remaining members)
- Assignment shown in conversation header just like manual assignment
- Admin/Supervisor can still manually reassign even in round-robin mode
- No "online/offline" awareness in v1 — assign regardless of online status

### Schema

- `channels.assignmentMode`: `"first_reply" | "manual" | "round_robin"` (already exists or add if missing)
- `channels.roundRobinIndex`: `v.optional(v.number())` (already in schema)

### Plan Gating

- Available on Growth and above
- Free and Starter show the option as disabled with upgrade prompt

---

## 27. Data Export (Task 015)

Clients must be able to export all their data at any time. This is a trust signal and a legal right.

### What Is Exported

| Data              | Format | Scope                        |
| ----------------- | ------ | ---------------------------- |
| Contacts          | CSV    | All contacts for the tenant  |
| Conversations     | JSON   | All conversations + messages |
| Analytics summary | CSV    | Aggregated metrics           |

### UX Flow

- Settings → Data & Privacy → "Export My Data" button
- Immediately triggers async Convex action that builds the export
- Shows progress indicator; when done, provides download link (Convex Storage URL)
- File naming: `wabdesk-export-[tenantId]-[YYYY-MM-DD].zip` (or individual files if zip is complex)
- In v1: export contacts CSV and conversations JSON as separate downloads (no zip required)

### Rules

- Available on ALL plans including Free — data portability is a right
- Export scoped strictly to caller's `tenantId` — never cross-tenant
- Only Admin and Supervisor can trigger export
- Large exports are async — do NOT block the HTTP response
- No email notification in v1 — just show a "Download ready" state on the same page

### Contacts CSV Columns

`phone, name, tags, stage, notes, customFields (JSON string), firstSeen, lastSeen, source`

### Conversations JSON Schema

```json
[
  {
    "id": "...",
    "contact": { "phone": "...", "name": "..." },
    "channel": "...",
    "status": "open|resolved|pending",
    "assignedAgent": "...",
    "labels": [],
    "messages": [
      {
        "from": "customer|agent",
        "type": "text|image|...",
        "content": "...",
        "sentAt": "ISO8601",
        "isInternal": false
      }
    ],
    "createdAt": "...",
    "resolvedAt": "..."
  }
]
```

---

## 28. WhatsApp Business Profile Editing (Task: WA Profile)

Agents can edit their WhatsApp Business profile from within WABDesk via the Meta Business Management API.

### Editable Fields

| Field                | API Endpoint                                        | Notes                                    |
| -------------------- | --------------------------------------------------- | ---------------------------------------- |
| Profile photo        | `POST /{phone-number-id}/whatsapp_business_profile` | Upload image to Meta first               |
| Business description | Same endpoint                                       | Max 256 chars                            |
| Business address     | Same endpoint                                       |                                          |
| Business category    | Same endpoint                                       | Predefined category list from Meta       |
| Business website     | Same endpoint                                       |                                          |
| Display name         | Separate Meta review process                        | Show "pending review" state; NOT instant |

### UX Rules

- Available in Settings → Channels → [Channel] → "Business Profile" tab
- Display name changes: show amber "Pending Meta Review" badge; poll Meta API every 24h for approval status
- Profile photo: show current photo with upload button; preview before saving
- Form auto-saves field-by-field (not one big Save button) — matches WhatsApp Business App UX
- Show character counters on description field

### Plan Gating

- Available on Growth and above
- Free and Starter: show read-only view of current profile with upgrade prompt

### Meta API Details

- Endpoint: `GET/POST https://graph.facebook.com/v25.0/{phone-number-id}/whatsapp_business_profile`
- Fields to request: `about, address, description, email, profile_picture_url, websites, vertical`
- All API calls go through Convex actions (never client-side) using stored encrypted access token
- Use `getChannelInternal` helper to retrieve decrypted token

---

## 29. Advanced Message Templates with Variables (Task: Templates)

Beyond quick replies — full templates with dynamic placeholders that agents fill in before sending.

### How It Works

- Template: `"أهلاً {{name}}، طلبك رقم {{order_id}} اتشحن وهيوصلك خلال {{days}} أيام"`
- Agent selects template → a mini form appears with one input per `{{variable}}` → agent fills fields → sends in one click
- Templates organized by category: Greetings / Orders / Complaints / Follow-up / General

### Schema — new `messageTemplates` table

```
messageTemplates: defineTable({
  tenantId: v.string(),
  name: v.string(),               // template display name
  category: v.string(),           // "greeting" | "order" | "complaint" | "followup" | "general"
  body: v.string(),               // raw body with {{variable}} placeholders
  variables: v.array(v.string()), // extracted variable names e.g. ["name", "order_id", "days"]
  language: v.string(),           // "ar" | "en"
  createdBy: v.string(),
  createdAt: v.number(),
}).index("by_tenant", ["tenantId"])
  .index("by_tenant_category", ["tenantId", "category"])
```

### Variable Extraction Rule

On save, parse `body` with regex `/\{\{(\w+)\}\}/g` and store extracted variable names in `variables[]`. Used to render the fill-in form dynamically.

### UI Components Needed

- `components/templates/template-picker.tsx` — Popover in MessageInput toolbar (new icon button); shows templates list grouped by category; search box at top
- `components/templates/template-fill-form.tsx` — Sheet/dialog that opens after picking a template; one labeled input per variable; Preview section shows the rendered message as variables are filled; Confirm button inserts into MessageInput
- `components/settings/templates-settings.tsx` — Full CRUD for template library (create, edit, delete, preview); category filter tabs
- `app/(dashboard)/settings/templates/page.tsx`

### Convex Functions Needed

- `convex/messageTemplates.ts`: `list`, `create`, `update`, `remove` (Admin/Supervisor only for manage; all roles can read)

### Rules

- Templates scoped to `tenantId`
- Arabic and English templates supported — language tag shown as badge
- Admin and Supervisor manage templates; Agents can use them (read-only)
- Available on Starter and above (Free has 0 custom templates)
- Variables are case-insensitive when extracted but stored lowercase
- Empty variable field = block send; show validation error

### Plan Limits

| Plan     | Max Templates                       |
| -------- | ----------------------------------- |
| Free     | 0 (read-only seed templates if any) |
| Starter  | 10                                  |
| Growth   | 50                                  |
| Business | Unlimited                           |

---

## 30. AI Agent Behavior Rules

> These rules apply to **Claude Code** (and any future AI coding agent) when working on this codebase. They are not optional — they exist to prevent the most common failure modes observed during vibe coding sessions on WabDesk.
>
> Read this section before reading any task prompt. If a task prompt conflicts with these rules, these rules win.

---

### 30.1 Think Before Coding

**State assumptions explicitly. Don’t hide confusion. Push back when warranted.**

Before writing any code:

- State your interpretation of the task in your own words. If you’re guessing, say _“I’m guessing that…”_ — don’t proceed silently.
- If the request has multiple valid interpretations, list them and ask which one. Never pick one silently.
- If you see a simpler approach than what was requested, propose it before implementing the requested one.
- If something is unclear about the schema, a business rule in `CLAUDE.md`, or a product decision, **STOP and ask**. Do not invent.

**Example:**

> Task: _“Add a way to disable channels.”_
> ❌ Wrong: silently add a `disabled: boolean` field and a toggle button.
> ✅ Right: _“Two interpretations: (a) soft-disable that pauses webhook processing but keeps the row, (b) hard-disable that triggers the existing 30-day retention path (`channels.deletedAt`). Which one?”_

---

### 30.2 Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked. If asked for a button, don’t add a settings panel.
- No abstractions for single-use code. Don’t extract helpers that are called once.
- No “flexibility” knobs that weren’t requested (no extra config options, no `options: { strict?: boolean }` parameters that aren’t used).
- No error handling for impossible scenarios.
- If you wrote 200 lines and 50 would do, rewrite.

**The senior-engineer test:** Would a senior engineer reading this PR say _“this is overcomplicated”_? If yes, simplify.

**WabDesk-specific overcomplication patterns to avoid:**

- Building a generic “rule engine” when the task was _“add one specific automation trigger”_
- Wrapping a single Convex mutation in a class or factory
- Adding feature flags for a feature with one call site
- Adding `try/catch` around code that cannot throw (Convex mutations already roll back on throw)
- Creating new shared helpers in `lib/` when the logic is used in one file

---

### 30.3 Surgical Changes

**Touch only what you must. Clean up only your own mess.**

This is the single biggest source of friction in vibe coding on this repo. Claude Code’s default behavior is to “improve” things while it’s there. **Don’t.**

When editing existing files:

- Don’t reformat code you didn’t change.
- Don’t rename variables in unchanged blocks.
- Don’t reorder imports unless your change required it.
- Don’t “improve” adjacent comments.
- Don’t refactor working code, even if you think your way is cleaner.
- Match the existing style of the file, even if you’d write it differently in a fresh file.

When your changes create orphans:

- Remove imports / variables / functions that **your changes** made unused.
- Do **not** remove pre-existing dead code. If you spot some, mention it in the response — let Ahmed decide.

**The diff test:** Every changed line in the final diff must trace directly to the user’s stated request. If a line changed and you can’t justify it from the request, revert it.

**Operations that require explicit prior discussion (never do these without asking first):**

- `ctx.db.delete(...)` calls
- Schema field removals or renames (these are migrations, not edits)
- Index removals
- Removing or changing the signature of any existing Convex action / mutation / query
- Touching `convex/lib/auth.ts`, `convex/lib/encryption.ts`, `convex/lib/planLimits.ts`, or `convex/lib/rateLimit.ts`
- Bumping `WHATSAPP_API_VERSION` or any other environment variable
- Adding new dependencies to `package.json`

If your task seems to require any of these, **stop and ask first**.

---

### 30.4 Goal-Driven Execution

**Define verifiable success criteria. Loop until they all pass.**

Transform vague tasks into checks you can run:

| Vague task           | Verifiable goal                                                                   |
| -------------------- | --------------------------------------------------------------------------------- |
| “Add validation”     | Call the mutation with invalid input, assert it throws the expected `ConvexError` |
| “Fix the bug”        | Write a repro path first, then make it pass                                       |
| “Refactor X”         | `npx tsc --noEmit` clean before AND after; no behavior change                     |
| “Implement task 017” | All Stage 0 reading-list files cited; `PROGRESS.md` entry written; `tsc` clean    |

For every multi-step task, state the plan upfront:

```
1. Add `coexistenceEnabled` field to schema    → verify: `npx tsc --noEmit` clean
2. Wire processEcho to read the flag            → verify: kill-switch (flag=false, send echo, assert no insert)
3. Add UI badge for source="mobile"             → verify: bubble renders with badge for the three source values
```

Strong success criteria let you loop independently. Weak criteria (_“make it work”_) guarantee back-and-forth.

---

### 30.5 Stage Output Requirements

Every stage of a multi-stage task must end with all four of the following. Skipping any one is a rejection trigger:

1. **The actual code, not a summary.** BEFORE/AFTER diffs with line numbers for edits; full file contents for new files. A checklist of _what you did_ is not acceptable.
1. **Literal terminal output of `npx tsc --noEmit`.** Paste it exactly. Do not paraphrase. Do not say _“no errors”_ — paste the actual (possibly empty) output.
1. **A `PROGRESS.md` entry**, pasted in the response in full (not summarized), following the format used by existing entries.
1. **A push-back invitation.** Every stage ends with: _“If you disagree with any decision above, explain before complying with the next stage.”_

---

### 30.6 Rejection Triggers

Ahmed will reject and re-prompt without merging if any of these appear:

- A summary instead of actual code at a stage boundary
- An out-of-scope file change (file not listed in the stage’s scope was modified)
- Placeholder code (_“will fix in production”_, _“TODO: real implementation”_, fake hashes, mock returns)
- Schema changes that weren’t in the approved Stage 2 plan
- `any` types
- New `console.log` calls that aren’t tagged with a bracketed prefix (`[ECHO_DEDUP]`, `[SET_WAMID]`, etc.) matching the existing debug pattern
- _“I also improved…”_ / _“I noticed and fixed…”_ language about anything that wasn’t asked
- Default values flipped from the product spec (e.g., spec says _“default true”_ but the field is `v.optional(...)` with no explicit default and is read as falsy)

---

### 30.7 What Counts as Trivial (Skip the Stage Gates)

These rules and the stage-gated workflow apply to **non-trivial** tasks. A task is trivial — and may be done in one shot — only if **all** of the following are true:

- One file, fewer than ~30 lines of change
- No schema change
- No new external API call
- No new Convex action / mutation / query
- No new env var
- No security-sensitive area (`auth.ts`, `encryption.ts`, `planLimits.ts`, webhook verification)

When in doubt, treat it as non-trivial.

---

_Last updated: manually — update this file whenever a major architectural or product decision is made._

## Recent Changes

- 031-positioning-update: Updated WABDesk positioning across docs, marketing site, and legal copy. Drops "API" and "SaaS" from customer-facing surfaces; replaces "Egypt and the Gulf" with "Arabic-speaking markets" — broader positioning aligned with future expansion. "Arabic-first" preserved as the moat. Files touched: CLAUDE.md §1, PROJECT_STATE.md §1, PROGRESS.md, AUDIT_REPORT.md, app/page.tsx (AR meta description), lib/marketing/i18n.ts (hero.subtitle AR+EN), components/marketing/privacy-content.tsx (EN intro). No schema, runtime, or pricing-currency changes.
- 030-ai-agent-behavior-rules: Added §30 covering AI agent behavioral rules — think before coding, simplicity, surgical changes, goal-driven execution, stage output requirements, rejection triggers, and definition of trivial tasks. Applies to Claude Code on all future task work.
- 013-whatsapp-coexistence: WhatsApp Coexistence — phone numbers connected via Embedded Signup support sending from both WABDesk (Cloud API) and the WhatsApp Business mobile app simultaneously; mobile-sent messages mirrored into inbox with 📱 badge (`source: "mobile"`); 3-level echo dedup (wamid → content hash → tertiary insert); history backfill on WABA connection; automation guard skips non-customer sources; `featureType: "whatsapp_business_app_onboarding"` added to Embedded Signup `extras`; kill switch: `channels.coexistenceEnabled = false`; see PROGRESS.md for full implementation details
- 009-automation-rules: Automation rules engine (if-this-send-that) — new tables: `automationRules`, `businessHours`, `ruleFireLog`; new files: `convex/automations.ts`, `lib/automationHelpers.ts`, `components/automations/` (4 components), `app/(dashboard)/automations/page.tsx`, `components/ui/switch.tsx`; modified: `convex/schema.ts`, `convex/http.ts`, `convex/crons.ts`, `convex/lib/planLimits.ts`, `convex/messages.ts` (fixed totalConversations increment), `lib/shell/nav-config.ts` (sidebar link), `lib/shell/types.ts`, `components/shell/resolve-icon.tsx`; 4 trigger types: keyword, outside_hours, first_message, no_reply_timeout; plan limits: Free 2, Starter 10, Growth 30, Business unlimited; admin+supervisor manage rules, admin-only for business hours
- 004-multi-tenant-onboarding: Added `onboardingState` table (Convex); `fetchQuery` from `convex/nextjs` (server-side Convex reads in RSC)
- 005-contact-management: Added `customFields` table (Convex); `libphonenumber-js` (phone normalization); `papaparse` (CSV parsing client-side)

## Active Technologies

- TypeScript (strict, no `any`) — enforced project-wide + Next.js 15 (App Router), Convex (backend + realtime), Better Auth (auth + multi-tenancy), shadcn/ui, Tailwind CSS v4

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.

<!-- convex-ai-end -->

# Project Rules & Work Protocol

## Core Protocol

- **PRE-TASK:** Before writing any code, you MUST read `PROJECT_STATE.md` to synchronize with the current progress and avoid logic duplication.
- **POST-TASK:** After finishing any session or feature, you MUST update `PROJECT_STATE.md` with what was implemented and any new conflicts found.
