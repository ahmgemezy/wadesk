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

| Layer         | Technology                                         |
| ------------- | -------------------------------------------------- |
| Frontend      | Next.js 15 (App Router)                            |
| Backend / DB  | Convex (real-time database + serverless functions) |
| Auth          | Clerk                                              |
| UI Components | shadcn/ui                                          |
| Styling       | Tailwind CSS                                       |
| WhatsApp API  | Meta WhatsApp Business Cloud API                   |
| Payments      | Polar.sh                                           |
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

- Polar.sh as Merchant of Record (handles VAT/tax globally, supports Egypt USD payouts via Stripe Connect Express)

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
| Starter  | 2           |
| Growth   | 5           |
| Business | Unlimited   |

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

|                  |                                                |
| ---------------- | ---------------------------------------------- |
| WhatsApp numbers | 2                                              |
| Agents           | 5                                              |
| Conversations    | Unlimited                                      |
| Features         | Quick replies, Internal notes, Basic analytics |

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
| Features         | Everything in Starter + Broadcasts + CSAT + SLA + Automation rules + Business profile editing |

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

- Polar.js `PricePreview()` handles automatic geo-based currency display
- Plan limits enforced in Convex — check `tenant.plan` before allowing feature access
- Annual billing implemented as ~20% discount via Polar price variants
- Polar webhooks update `tenant.plan` in Convex on payment/subscription events

---

## 11. Competitive Landscape

| Competitor | Type             | Weakness vs WaDesk                                          |
| ---------- | ---------------- | ----------------------------------------------------------- |
| ElMujib    | Arab SaaS        | Limited features, poor UX                                   |
| Tactful.ai | Enterprise       | Too expensive for SMBs                                      |
| Zaher.ai   | Arab SaaS        | Limited market presence                                     |
| Wawp.net   | WordPress Plugin | Not a SaaS, no multi-agent inbox                            |
| Respond.io | Global SaaS      | English-first, expensive, complex                           |
| WATI       | Global SaaS      | 20% markup on Meta messages, $39/extra agent, English-first |
| SleekFlow  | Global SaaS      | $15/month per WhatsApp number, expensive for MENA           |

**WaDesk's moat:**

- Arabic-first UX — no global competitor does this
- Zero markup on Meta messages — clients pay Meta directly
- Local currency billing (EGP / SAR / AED)
- SMB pricing — 5 agents for ~$14 vs WATI's ~$137

**Core sales message:** _"Pay Meta for your messages. Pay WaDesk for your team inbox. Nothing more."_

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
WHATSAPP_API_VERSION=v19.0       # Meta API version

# Polar.sh
POLAR_ACCESS_TOKEN=
POLAR_WEBHOOK_SECRET=
POLAR_ORGANIZATION_ID=
```

---

## 15. Key Product Decisions (Do Not Revisit Without Good Reason)

| Decision                            | Rationale                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------- |
| Convex over Supabase                | Real-time first, no SQL complexity, faster to build                       |
| Clerk over NextAuth                 | Multi-tenant orgs built-in, saves weeks of work                           |
| Polar.sh over Stripe                | MoR = handles MENA VAT + global tax automatically; 4% + $0.40/transaction |
| Shared WABA model (Embedded Signup) | Client owns their number, WaDesk can't be shut down                       |
| Freemium over free trial only       | Lower barrier for Arab SMB market                                         |
| Arabic-first over bilingual         | Differentiation from all global competitors                               |

---

## 16. Contact Management (Lightweight CRM)

WaDesk is NOT a full CRM — but it must have enough contact management to make agents effective. Think of it as "CRM-lite" built around WhatsApp conversations.

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
- File named clearly: `wadesk-export-[tenant]-[date].zip`
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
Handled natively by Clerk Organizations.

**B. Invite by WhatsApp**
Admin enters agent's phone number → WaDesk sends them an invite link via WhatsApp → they click and create account.
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

## 25. Roles & Permissions

### Tenant Member Roles

Each Clerk Organization (tenant) has 3 roles: **Admin**, **Supervisor**, **Agent**

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
- Use Clerk `organizationMembership.role` to gate all role-sensitive actions.
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

Agents can edit their WhatsApp Business profile from within WaDesk via the Meta Business Management API.

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

- Endpoint: `GET/POST https://graph.facebook.com/v19.0/{phone-number-id}/whatsapp_business_profile`
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

_Last updated: manually — update this file whenever a major architectural or product decision is made._

## Recent Changes

- 009-automation-rules: Automation rules engine (if-this-send-that) — new tables: `automationRules`, `businessHours`, `ruleFireLog`; new files: `convex/automations.ts`, `lib/automationHelpers.ts`, `components/automations/` (4 components), `app/(dashboard)/automations/page.tsx`, `components/ui/switch.tsx`; modified: `convex/schema.ts`, `convex/http.ts`, `convex/crons.ts`, `convex/lib/planLimits.ts`, `convex/messages.ts` (fixed totalConversations increment), `lib/shell/nav-config.ts` (sidebar link), `lib/shell/types.ts`, `components/shell/resolve-icon.tsx`; 4 trigger types: keyword, outside_hours, first_message, no_reply_timeout; plan limits: Free 2, Starter 10, Growth 30, Business unlimited; admin+supervisor manage rules, admin-only for business hours
- 004-multi-tenant-onboarding: Added `onboardingState` table (Convex); `fetchQuery` from `convex/nextjs` (server-side Convex reads in RSC)
- 005-contact-management: Added `customFields` table (Convex); `libphonenumber-js` (phone normalization); `papaparse` (CSV parsing client-side)

## Active Technologies

- TypeScript (strict, no `any`) — enforced project-wide + Next.js 15 (App Router), Convex (backend + realtime), Clerk (auth + multi-tenancy), shadcn/ui, Tailwind CSS v4

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.

<!-- convex-ai-end -->

# Project Rules & Work Protocol

## Core Protocol

- **PRE-TASK:** Before writing any code, you MUST read `PROJECT_STATE.md` to synchronize with the current progress and avoid logic duplication.
- **POST-TASK:** After finishing any session or feature, you MUST update `PROJECT_STATE.md` with what was implemented and any new conflicts found.
