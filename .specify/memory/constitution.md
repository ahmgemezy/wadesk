<!--
SYNC IMPACT REPORT
==================
Version change: (none) → 1.0.0
Initial ratification: all placeholder tokens replaced with WABDesk-specific content.

Modified principles: N/A (first-time fill)
Added sections: Core Principles (I–VI), Technology Constraints, Development Workflow, Governance
Removed sections: N/A

Templates checked:
  ✅ .specify/templates/plan-template.md — "Constitution Check" gates align with principles below
  ✅ .specify/templates/spec-template.md — no structural changes required
  ✅ .specify/templates/tasks-template.md — no structural changes required

Follow-up TODOs: none — all fields resolved from CLAUDE.md
-->

# WABDesk Constitution

## Core Principles

### I. Arabic-First, RTL-Native (NON-NEGOTIABLE)

Every UI component MUST default to `dir="rtl"`. No hardcoded `left`/`right` CSS values are
permitted — use `start`/`end` logical properties exclusively. Tailwind classes MUST use `ms-`/`me-`
(margin-start/end) instead of `ml-`/`mr-`. Arabic text MUST render with the Cairo or Tajawal
Google Font — never system fonts. Directional icons (arrows, chevrons) MUST be flipped for RTL
context. Phone number inputs MUST use `dir="ltr"` inside an otherwise RTL layout.

Every component MUST be tested in Arabic before it is considered done.

**Rationale**: WABDesk's core market differentiator is being Arabic-first. Every global competitor
is English-first. A single RTL regression destroys trust with Arab SMB customers.

### II. Multi-Tenant Isolation (NON-NEGOTIABLE)

Every Convex query and mutation MUST include a `tenantId` filter derived from the authenticated
Clerk `orgId`. It is never permissible to query a table without a `tenantId` scope. Plan limits
(agent count, channel count, feature gates) MUST be enforced in Convex before granting feature
access — never enforced only on the client.

Cross-tenant data access is a critical security violation and MUST be treated as a P0 bug.

**Rationale**: WABDesk is a shared-infrastructure multi-tenant SaaS. A single missing `tenantId`
filter can expose one business's customer conversations to another business.

### III. Real-Time by Default

All UI data MUST be delivered via Convex subscriptions (live queries). Polling is forbidden. All
calls to the Meta WhatsApp Business Cloud API MUST go through server-side Convex actions — never
from client-side code. API routes in Next.js are reserved exclusively for webhooks.

**Rationale**: Convex's real-time model is a core architectural bet. Polling would degrade the
shared-inbox experience and undermine the product's core promise of instant message delivery.
Client-side Meta calls would expose access tokens.

### IV. Security & Privacy

- Meta API tokens MUST NEVER be exposed client-side or logged.
- All incoming Meta webhook payloads MUST be signature-verified before processing.
- Phone numbers MUST be stored in E.164 format in all database tables.
- Full message content MUST NOT be logged in production environments.
- Rate limiting MUST be applied to all public-facing webhook endpoints.
- Clerk JWT MUST be used for all authenticated requests.

**Rationale**: MENA customers are increasingly privacy-conscious and GDPR-adjacent regulations
apply in UAE/Saudi. A token leak or webhook forgery could compromise all tenant accounts.

### V. Schema-Forward Multi-Number

Conversations MUST always be scoped to a specific `channelId` in addition to `tenantId`. Each
WhatsApp number a tenant connects is a **WhatsApp Channel** document linked to `tenantId`. The
schema MUST support multiple channels per tenant from the first migration — retrofitting
multi-number support after launch requires painful schema migrations and is forbidden.

Agents MAY be scoped to one or more channels via permission records. The inbox UI MUST support
filtering by channel.

**Rationale**: Multi-number is a real Phase 1 use case (Sales number vs. Support number).
The Free plan limits tenants to 1 number, but the schema must accommodate Growth (3) and Business
(unlimited) from day one.

### VI. Simplicity & Onboarding Speed

Sub-5-minute onboarding (signup → first WhatsApp message received) is a core product KPI.
Every extra step is friction and MUST be justified before being added.

Code MUST be TypeScript everywhere — no `any` types. Components MUST be functional (no class
components). Next.js App Router MUST be used — no Pages Router. Server Components are the
default; Client Components (`"use client"`) are used only when interactivity requires it.
YAGNI principles apply: do not build for hypothetical future requirements.

**Rationale**: The target market is non-technical Arab SMB owners. Onboarding complexity directly
causes churn. Code simplicity directly reduces AI-assisted development errors.

## Technology Constraints

The following technology stack is locked. Do NOT substitute components without an explicit
architectural decision recorded in CLAUDE.md.

| Layer | Technology | Locked Reason |
|---|---|---|
| Frontend | Next.js 15 (App Router) | Real-time SSR + RSC support |
| Backend / DB | Convex | Real-time subscriptions, no SQL complexity |
| Auth | Clerk | Multi-tenant orgs built-in |
| UI Components | shadcn/ui + Tailwind CSS | RTL-compatible, customizable |
| WhatsApp API | Meta WhatsApp Business Cloud API | Official, required for WABA |
| Payments | Lemon Squeezy | MoR handles MENA VAT automatically |
| Hosting | Vercel | Next.js-native deployment |
| Language | TypeScript | Type safety, no `any` allowed |

Pricing and plan limits are enforced in Convex. Lemon Squeezy webhooks update `tenant.plan`
on payment events. Annual billing is implemented as ~17% discount (2 months free).

## Development Workflow

### Definition of Done

A feature is NOT done until ALL of the following are true:

- [ ] Works correctly in Arabic (RTL) layout
- [ ] Works correctly in English (LTR) layout
- [ ] Handles loading states
- [ ] Handles error states gracefully
- [ ] Multi-tenant safe — no cross-tenant data access is possible
- [ ] Tested with a real WhatsApp message flow (not only mocked data)

### Constitution Check Gates (for plan-template.md)

Before beginning Phase 0 research on any feature, verify:

1. **RTL Gate** — Does this feature touch UI? If yes, RTL support is mandatory from the first
   commit. No "we'll add RTL later."
2. **Tenant Scope Gate** — Does this feature read or write Convex data? If yes, every query and
   mutation must include `tenantId`.
3. **Real-Time Gate** — Does this feature display live data? If yes, use Convex subscriptions.
4. **Security Gate** — Does this feature interact with Meta APIs or webhooks? If yes, all calls
   are server-side and all webhooks are signature-verified.
5. **Schema Gate** — Does this feature introduce a new Convex table? If yes, include `tenantId`
   and `channelId` (where applicable) from the first schema definition.
6. **Simplicity Gate** — Does this feature add onboarding steps? If yes, justify why and confirm
   it cannot be eliminated or deferred.

## Governance

This constitution supersedes all other development practices when there is a conflict. Amendments
require:

1. A documented rationale explaining why the change is needed.
2. An update to `CLAUDE.md` if the change affects architectural decisions.
3. A version bump following semantic versioning:
   - **MAJOR**: Removal or redefinition of an existing principle.
   - **MINOR**: Addition of a new principle or materially expanded guidance.
   - **PATCH**: Wording clarifications or typo fixes.
4. An updated `Last Amended` date.

All feature plans (plan.md files) MUST include a Constitution Check section that explicitly
verifies each gate above before implementation begins.

Runtime development guidance lives in `CLAUDE.md` at the repository root.

**Version**: 1.0.0 | **Ratified**: 2026-04-02 | **Last Amended**: 2026-04-02
