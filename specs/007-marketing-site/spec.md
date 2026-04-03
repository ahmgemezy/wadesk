# Feature Specification: WaDesk Marketing Site

**Feature Branch**: `007-marketing-site`
**Created**: 2026-04-04
**Status**: Draft
**Input**: Public-facing Arabic-first marketing website for WaDesk targeting SMBs in Egypt and Gulf region

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — First-Time Visitor Understands the Product and Signs Up (Priority: P1)

An SMB owner in Egypt or Saudi Arabia hears about WaDesk, opens the website for the first time, and within 60 seconds understands what it does, why it's different, and how much it costs. They click "ابدأ مجاناً / Start Free" and land on the sign-up page.

**Why this priority**: This is the primary conversion funnel. Every other page section exists to support this moment. Without it, there is no product growth.

**Independent Test**: A first-time visitor with no prior knowledge of WaDesk can visit the homepage, read the hero section, scroll to pricing, and click Sign Up — all without confusion. The signup page loads correctly.

**Acceptance Scenarios**:

1. **Given** a visitor opens the homepage, **When** they read the hero section, **Then** they understand in one sentence what WaDesk does ("صندوق بريد WhatsApp للفرق")
2. **Given** a visitor scrolls past the hero, **When** they reach the features section, **Then** they see at least 4 key features with Arabic names and icons
3. **Given** a visitor reaches the pricing section, **When** they view it, **Then** they see prices displayed for EGP, SAR, AED, and USD
4. **Given** a visitor clicks "ابدأ مجاناً", **When** the page loads, **Then** they are taken to the sign-up page without errors
5. **Given** a visitor is already signed in, **When** they click any CTA, **Then** they are taken directly to their inbox dashboard

---

### User Story 2 — Returning Visitor Signs In (Priority: P2)

An existing WaDesk customer visits the website and needs to log in to their dashboard. They find the sign-in link immediately in the navigation and click through without friction.

**Why this priority**: Retention matters as much as acquisition. A customer who can't find the login is a frustrated customer.

**Independent Test**: A returning user visits the homepage, finds the sign-in button in the navigation bar, clicks it, and reaches the sign-in page within 2 clicks.

**Acceptance Scenarios**:

1. **Given** a returning visitor opens the homepage, **When** they look at the navigation, **Then** they see a clearly labeled "تسجيل الدخول / Sign In" button
2. **Given** a visitor clicks Sign In, **When** the page loads, **Then** they reach the sign-in form
3. **Given** a visitor is already authenticated, **When** they visit the homepage, **Then** they see "الذهاب إلى لوحة التحكم / Go to Dashboard" instead of Sign In / Sign Up

---

### User Story 3 — Visitor Evaluates Pricing and Chooses a Plan (Priority: P3)

A business owner wants to know how much WaDesk costs before committing. They scroll to the pricing section, compare plans, and understand the value of each tier in their local currency.

**Why this priority**: Pricing transparency reduces sales friction and pre-qualifies leads. Arab SMB buyers are price-sensitive and need to see local currency upfront.

**Independent Test**: A visitor can navigate directly to the pricing section, read all 4 plans (Free, Starter, Growth, Business) with their prices and features, and understand what's included without clicking away.

**Acceptance Scenarios**:

1. **Given** a visitor scrolls to pricing, **When** they view the plans, **Then** they see Free, Starter, Growth, and Business tiers with prices in EGP/SAR/AED/USD
2. **Given** a visitor reads a pricing card, **When** they scan the features list, **Then** they see agent count, WhatsApp number limit, and key features per plan
3. **Given** a visitor clicks any plan CTA, **When** redirected, **Then** they land on the sign-up page
4. **Given** a visitor reads the Free plan, **When** they see the pricing, **Then** it clearly states "لا يلزم بطاقة ائتمانية / No credit card required"

---

### User Story 4 — Visitor Reads About the Competitive Advantage (Priority: P4)

A skeptical visitor who has heard of WATI or SleekFlow reads a differentiation section and understands the key advantages: zero markup on Meta messages, Arabic-first UX, and local currency pricing.

**Why this priority**: Differentiation messaging converts fence-sitters, especially in the Arab market where global competitors charge markups and offer English-only interfaces.

**Independent Test**: A visitor who knows about competitors can read the differentiation section and articulate at least 2 reasons WaDesk is different from global alternatives.

**Acceptance Scenarios**:

1. **Given** a visitor reads the "Why WaDesk" section, **When** they finish, **Then** they understand that WaDesk charges zero markup on Meta messages
2. **Given** a visitor reads the page, **When** they experience the RTL Arabic layout, **Then** the site itself demonstrates the Arabic-first claim — not just states it
3. **Given** a visitor reads the comparison, **When** they look at pricing, **Then** a clear statement explains the cost advantage vs. competitors who charge per agent or markup messages

---

### Edge Cases

- What if a visitor is already logged in — clicking Sign Up should redirect to dashboard, not loop
- What if pricing currency cannot be determined — show all 4 currencies simultaneously as default
- What if the page is visited on a mobile screen (375px wide) — all sections must be readable and all CTAs tappable without zooming
- What if a visitor clicks a pricing CTA for a paid plan — they sign up first, billing is handled post-signup (not during)

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The homepage MUST display a hero section with the product name, a one-line Arabic value proposition ("صندوق بريد WhatsApp للفرق"), and a primary CTA button
- **FR-002**: The homepage MUST display a features section highlighting at minimum: multi-agent inbox, real-time assignment, internal notes, quick replies — each with an icon and short Arabic description
- **FR-003**: The homepage MUST display a pricing section with all 4 plans (Free, Starter, Growth, Business) showing prices in EGP, SAR, AED, and USD
- **FR-004**: The Free plan pricing card MUST clearly state no credit card is required
- **FR-005**: The homepage MUST display a differentiation section explaining: zero Meta message markup, Arabic-first UX, local currency billing
- **FR-006**: The navigation bar MUST include "تسجيل الدخول / Sign In" and "ابدأ مجاناً / Sign Up" buttons visible on every screen size
- **FR-007**: If a visitor is already authenticated, navigation CTAs MUST change to "لوحة التحكم / Dashboard" linking to `/inbox`
- **FR-008**: All CTA buttons MUST link correctly to `/sign-up` or `/sign-in`
- **FR-009**: The entire site MUST render in RTL layout with Arabic as the primary language by default
- **FR-010**: The site MUST be fully functional and readable on mobile screens down to 375px wide
- **FR-011**: The homepage MUST include a footer with links to Sign Up, Sign In, and a pricing section anchor
- **FR-012**: The homepage MUST include basic SEO metadata (page title, description, Open Graph tags) in Arabic
- **FR-013**: The navigation bar MUST include a language toggle button that switches the entire page between Arabic (RTL, default) and English (LTR)
- **FR-014**: When the language is switched to English, all section content (hero, features, pricing, differentiators, nav, footer) MUST render in English with LTR layout
- **FR-015**: The selected language MUST be persisted in `localStorage` so returning visitors see their preferred language on next visit

### Key Entities

- **Plan**: A pricing tier (Free / Starter / Growth / Business) with price per currency, agent limit, channel limit, and feature list — defined statically in the page
- **Feature Highlight**: A named product capability (inbox, assignment, notes, quick replies) with icon and Arabic description
- **Differentiator**: A competitive advantage claim with a short supporting statement

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time Arabic-speaking visitor understands the product value proposition within 10 seconds of landing on the page
- **SC-002**: A visitor can find and read all pricing plan details within 30 seconds without scrolling past the pricing section
- **SC-003**: The homepage displays above-the-fold content in under 2 seconds on a standard mobile connection
- **SC-004**: All CTA buttons on the homepage lead to the correct destination with zero broken links
- **SC-005**: The page renders correctly in RTL on Chrome, Safari, and Firefox, and on mobile screens as small as 375px
- **SC-006**: A visitor who clicks "Start Free" can complete sign-up and reach the inbox dashboard in under 5 minutes

---

## Assumptions

- The marketing site lives at the root `/` of the same Next.js app — no separate subdomain needed for Phase 1
- Arabic is the canonical language; the site also supports full English via a language toggle in the navigation
- The language toggle switches the entire page between Arabic (RTL, default) and English (LTR) — including all section content, CTA labels, and layout direction
- Language preference is persisted in `localStorage` so returning visitors see their last-used language
- All 4 currencies (EGP/SAR/AED/USD) are shown simultaneously on pricing cards — no geo-detection in Phase 1
- Phase 1 scope is homepage only — no blog, docs, case studies, or additional pages
- No contact form or live chat widget in Phase 1 — all CTAs go to sign-up or sign-in
- No payment flow on the marketing site — billing is handled inside the app after signup
- SEO metadata is included but no sitemap or structured data required in Phase 1
- The page uses the same Cairo font already loaded in the app
