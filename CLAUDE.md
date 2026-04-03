# CLAUDE.md — WaDesk

> This file is the single source of truth for Claude Code when working on the WaDesk codebase.
> Read this file fully before writing any code, making any architectural decision, or answering any question.

---

## 1. Project Overview

**WaDesk** is an Arabic-first, WhatsApp Business API multi-agent customer support SaaS targeting SMBs in Egypt and the Gulf region.

**Core Value Proposition:**
A team inbox built on WhatsApp — multiple agents handle customer conversations from one shared dashboard, with no customer knowing they're talking to a team.

**Primary Markets:** Egypt 🇪🇬, Saudi Arabia 🇸🇦, UAE 🇦🇪, Gulf region  
**Language:** Arabic-first UI (RTL), English supported  
**Founder:** Solo founder (Ahmed), non-technical, uses AI-assisted (vibe coding) workflows

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) |
| Backend / DB | Convex (real-time database + serverless functions) |
| Auth | Clerk |
| UI Components | shadcn/ui |
| Styling | Tailwind CSS |
| WhatsApp API | Meta WhatsApp Business Cloud API |
| Payments | Lemon Squeezy |
| Hosting | Vercel |
| Language | TypeScript |

---

## 3. Architecture

### Multi-Tenancy Model
- **Shared Account Model** — each client gets their own WhatsApp Business Account (WABA) via Meta Embedded Signup
- Each tenant is fully isolated — conversations, agents, settings
- No shared WhatsApp numbers between tenants

### Key Architectural Rules
- All Convex mutations must be tenant-scoped (never query without `tenantId`)
- Clerk `orgId` = `tenantId` throughout the system
- Real-time updates via Convex subscriptions (not polling)
- All API calls to Meta go through server-side Convex actions (never client-side)
- Webhook verification for all incoming Meta webhooks

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
- Lemon Squeezy as Merchant of Record (handles VAT/tax for MENA)

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
| Plan | Max Numbers |
|---|---|
| Free | 1 |
| Starter | 1 |
| Growth | 3 |
| Business | Unlimited |

---

## 8. WhatsApp Business Profile Editing

Clients can edit their WhatsApp Business profile from within WaDesk dashboard via the Meta Business API.

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
1. Sign up (Clerk) → create org
2. Connect WhatsApp via Meta Embedded Signup
3. Send test message to verify connection
4. Invite first agent (optional)
5. Done — inbox is live

Every extra step = friction = churn. Keep it ruthlessly simple.

---

## 10. Pricing Plans

### Philosophy
- **Zero markup on Meta messages** — clients pay Meta directly for their messages, WaDesk charges for the inbox software only. This is a core differentiator vs WATI (20% markup) and SleekFlow ($15/number/month).
- Pricing in local currencies — never show USD to Arab users by default.
- Freemium entry, no credit card required.

---

### 🆓 Free — مجاني
| | |
|---|---|
| WhatsApp numbers | 1 |
| Agents | 2 |
| Conversations/month | 500 |
| Features | Basic inbox only |

**Goal:** Zero friction entry. Let them feel the product before asking for money.

---

### 🥈 Starter
| Market | Price |
|---|---|
| 🇪🇬 Egypt | 199 EGP/month |
| 🇸🇦 Saudi | 49 SAR/month |
| 🇦🇪 UAE | 49 AED/month |
| 🌍 International | $15/month |

| | |
|---|---|
| WhatsApp numbers | 1 |
| Agents | 5 |
| Conversations | Unlimited |
| Features | Quick replies, Internal notes, Basic analytics |

**Target:** Small businesses 2–5 people.

---

### 🥇 Growth *(Sweet spot — most clients land here)*
| Market | Price |
|---|---|
| 🇪🇬 Egypt | 399 EGP/month |
| 🇸🇦 Saudi | 99 SAR/month |
| 🇦🇪 UAE | 99 AED/month |
| 🌍 International | $29/month |

| | |
|---|---|
| WhatsApp numbers | 3 |
| Agents | 15 |
| Conversations | Unlimited |
| Features | Everything in Starter + Business profile editing + Advanced analytics + Priority support |

**Target:** Growing SMBs with multiple agents or multiple numbers.

---

### 💎 Business
| Market | Price |
|---|---|
| 🇪🇬 Egypt | 799 EGP/month |
| 🇸🇦 Saudi | 199 SAR/month |
| 🇦🇪 UAE | 199 AED/month |
| 🌍 International | $59/month |

| | |
|---|---|
| WhatsApp numbers | Unlimited |
| Agents | Unlimited |
| Conversations | Unlimited |
| Features | Everything in Growth + API access + Dedicated onboarding + Custom integrations |

**Target:** Mid-size companies, multiple branches/teams.

---

### Pricing Notes for Developers
- Plan limits enforced in Convex — check `tenant.plan` before allowing feature access
- WhatsApp number count = count of active channels per tenant
- Agent count = count of active Clerk org members
- Lemon Squeezy handles billing, webhooks update `tenant.plan` in Convex on payment events
- Annual billing = 2 months free (implement as ~17% discount)

---

## 11. Competitive Landscape

| Competitor | Type | Weakness vs WaDesk |
|---|---|---|
| ElMujib | Arab SaaS | Limited features, poor UX |
| Tactful.ai | Enterprise | Too expensive for SMBs |
| Zaher.ai | Arab SaaS | Limited market presence |
| Wawp.net | WordPress Plugin | Not a SaaS, no multi-agent inbox |
| Respond.io | Global SaaS | English-first, expensive, complex |
| WATI | Global SaaS | 20% markup on Meta messages, $39/extra agent, English-first |
| SleekFlow | Global SaaS | $15/month per WhatsApp number, expensive for MENA |

**WaDesk's moat:**
- Arabic-first UX — no global competitor does this
- Zero markup on Meta messages — clients pay Meta directly
- Local currency billing (EGP / SAR / AED)
- SMB pricing — 5 agents for ~$14 vs WATI's ~$137

**Core sales message:** *"Pay Meta for your messages. Pay WaDesk for your team inbox. Nothing more."*

---

## 12. Security Rules

- Never expose Meta API tokens client-side
- All webhook payloads must be signature-verified before processing
- Convex queries must always include `tenantId` filter — no cross-tenant data leakage
- Clerk JWT used for all authenticated requests
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
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Convex
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOY_KEY=

# Meta WhatsApp Business API
META_APP_ID=
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=
META_SYSTEM_USER_TOKEN=

# Lemon Squeezy
LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_WEBHOOK_SECRET=
```

---

## 15. Key Product Decisions (Do Not Revisit Without Good Reason)

| Decision | Rationale |
|---|---|
| Convex over Supabase | Real-time first, no SQL complexity, faster to build |
| Clerk over NextAuth | Multi-tenant orgs built-in, saves weeks of work |
| Lemon Squeezy over Stripe | MoR = handles MENA VAT automatically |
| Shared WABA model (Embedded Signup) | Client owns their number, WaDesk can't be shut down |
| Freemium over free trial only | Lower barrier for Arab SMB market |
| Arabic-first over bilingual | Differentiation from all global competitors |

---

## 16. Contact Management (Lightweight CRM)

WaDesk is NOT a full CRM — but it must have enough contact management to make agents effective. Think of it as "CRM-lite" built around WhatsApp conversations.

### What's Included (Phase 1)
Every customer who messages a tenant gets a **Contact profile** automatically:

| Field | Details |
|---|---|
| Phone number | Auto-captured from WhatsApp (E.164 format) |
| Display name | From WhatsApp profile |
| Custom name | Agent can override/set manually |
| Tags | e.g. "VIP", "مشكلة متكررة", "عميل جديد" |
| Notes | Free-text notes about this contact |
| Conversation history | All past conversations with this contact |
| First seen / Last seen | Auto-tracked |
| Assigned agent | Who usually handles this contact |
| Custom fields | Agent-defined key/value pairs (e.g. "Order ID", "City") |

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
| Data | Format |
|---|---|
| Contacts | CSV / Excel |
| Conversation history | CSV / JSON |
| Analytics reports | CSV / PDF |
| Agent list | CSV |

### UX Requirements
- Export button in **Settings → Data & Privacy**
- Large exports are async — notify when ready (email or in-app)
- File named clearly: `wadesk-export-[tenant]-[date].zip`
- On cancellation: keep data accessible for **30 days** then purge — never delete immediately

### Plan Availability
- ✅ Available on ALL plans including Free
- Exporting data is a right, not a premium feature

### Marketing Angle
> *"بياناتك ملكك دايماً — صدّرها في أي وقت"*
This reduces churn fear and builds trust, especially with Gulf enterprise clients.

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
Handled natively by Clerk Organizations.

**B. Invite by WhatsApp**
Admin enters agent's phone number → WaDesk sends them an invite link via WhatsApp → they click and create account.
Preferred for Arab markets — agents don't always check email.

**C. Shareable Invite Link**
Admin generates a time-limited link (e.g. valid 7 days) → shares it anywhere (WhatsApp group, etc.) → anyone who opens it joins as Agent role by default.

---

### Roles & Permission Matrix

| Permission | Admin | Supervisor | Agent |
|---|---|---|---|
| View all conversations | ✅ | ✅ | ❌ own only |
| Assign conversation to agent | ✅ | ✅ | ❌ |
| Take over another agent's chat | ✅ | ✅ | ❌ |
| View full analytics | ✅ | ✅ | own stats only |
| Export data | ✅ | ✅ | ❌ |
| Add / remove agents | ✅ | ❌ | ❌ |
| Change billing / plan | ✅ | ❌ | ❌ |
| Edit settings | ✅ | ❌ | ❌ |
| Create labels / templates | ✅ | ✅ | ❌ |
| View CSAT scores | ✅ | ✅ | own only |
| View SLA breaches | ✅ | ✅ | ❌ |

---

### Conversation Assignment Modes

Admin chooses one mode per channel in settings:

**A. First Reply Wins** *(default for small teams)*
First agent to reply → conversation auto-assigned to them.
Simple, no overhead, works well for teams of 2–5.

**B. Manual Assignment**
New conversations stay Unassigned until Admin/Supervisor assigns them.
Best when agents have specializations (e.g. one agent for complaints, one for sales).

**C. Round Robin** *(Growth and above)*
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
- Basic SLA alerts: **Growth and above**
- Advanced SLA rules (per label/channel): **Business**

### Implementation Note
Use Convex scheduled functions to check open conversations periodically — not real-time polling.

---

## 22. CSAT — Customer Satisfaction Rating

After a conversation is closed, automatically send the customer a satisfaction rating request.

### Flow
1. Agent closes conversation
2. After X minutes (configurable, default: 5 min), send automated message:
   > *"شكراً على تواصلك مع [Business Name] 😊 كيف كانت تجربتك معنا؟"*
   With reply options: ⭐ / ⭐⭐ / ⭐⭐⭐ / ⭐⭐⭐⭐ / ⭐⭐⭐⭐⭐
3. Response captured and linked to conversation + agent
4. CSAT score visible in agent profile and analytics dashboard

### Rules
- CSAT message sent as WhatsApp template (pre-approved by Meta)
- Customer can ignore — no follow-up if no response
- CSAT score per agent shown to Supervisor/Admin only
- Aggregate CSAT shown in analytics (e.g. "Average score this month: 4.3 ⭐")
- Toggle on/off per tenant in settings
- Available on **Growth and above**

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

## 24. What WaDesk is NOT

- ❌ Not a chatbot builder
- ❌ Not a broadcast/spam tool
- ❌ Not a CRM
- ❌ Not a WordPress plugin
- ❌ Not targeting enterprise (focus: SMBs 2–20 agents)
- ❌ Not English-first

---

*Last updated: manually — update this file whenever a major architectural or product decision is made.*

## Recent Changes
- 007-marketing-site: Added TypeScript (strict, no `any`) + Next.js 15 (App Router) + shadcn/ui, Tailwind CSS, Lucide React (icons), Clerk (auth check only)
- 003-whatsapp-embedded-signup: Added TypeScript (strict, no `any`) + Next.js 15 (App Router), Convex, Clerk, Meta Graph API v21.0, Facebook JS SDK v21.0, Node.js `crypto` (AES-256 encryption)
- 002-agent-roles: Added TypeScript (strict, no `any`) + Convex, Clerk (Organizations + Backend SDK), Next.js 15 (App Router), shadcn/ui, Meta WhatsApp Cloud API

## Active Technologies
- TypeScript (strict, no `any`) + Next.js 15 (App Router) + shadcn/ui, Tailwind CSS, Lucide React (icons), Clerk (auth check only) (007-marketing-site)
- N/A — all content is static TypeScript constants (007-marketing-site)

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
