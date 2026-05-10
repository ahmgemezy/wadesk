# Tasks: WABDesk Marketing Site

**Input**: Design documents from `/specs/007-marketing-site/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ui-contracts.md ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the static data file and component folder that all user stories depend on.

- [x] T001 Create `lib/marketing/` directory and `lib/marketing/pricing-data.ts` with Plan, FeatureHighlight, and Differentiator TypeScript types and all static data constants (4 plans × 4 currencies per plan.md pricing table, 4 feature highlights, 3 differentiators) — include both `titleAr`/`titleEn`, `descriptionAr`/`descriptionEn` fields on all entities
- [x] T002 Create `components/marketing/` directory (empty — components added per story)
- [x] T002b Create `lib/marketing/i18n.ts` defining a `MarketingLocale = "ar" | "en"` type, a `useMarketingLocale()` React hook (Client Component hook) that reads/writes locale to `localStorage` with `"ar"` as default, and a `t(locale, key)` helper that returns the correct string from a flat bilingual dictionary covering all marketing page strings (nav labels, section headings, CTA labels, feature titles/descriptions, differentiator titles/statements, footer links, pricing labels)

**Checkpoint**: Static data file exists and is importable. Folder structure matches plan.md.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The auth-aware homepage shell and shared nav/footer that every user story requires.

**⚠️ CRITICAL**: All user story phases depend on this phase.

- [x] T003 Replace `app/page.tsx` with a Server Component that: (1) calls `auth()` from `@clerk/nextjs/server`, (2) redirects authenticated users with orgId to `/inbox`, (3) redirects authenticated users without orgId to `/onboarding`, (4) exports a `metadata` object with Arabic title, description, and Open Graph tags (see plan.md SEO section), (5) renders `<MarketingPage>` (a new Client Component at `components/marketing/marketing-page.tsx`) passing `isAuthenticated` as a prop
- [x] T003b Create `components/marketing/marketing-page.tsx` as a **Client Component** (`"use client"`) accepting `isAuthenticated: boolean`. This component: uses `useMarketingLocale()` to get `locale`, applies `dir={locale === "ar" ? "rtl" : "ltr"}` and `lang={locale}` on its root wrapper `<div>`, and renders `<MarketingNav>`, `<HeroSection>`, `<FeaturesSection>`, `<PricingSection>`, `<DifferentiatorsSection>`, `<MarketingFooter>` — all receiving `locale` as a prop alongside their data props
- [x] T004 Create `components/marketing/marketing-nav.tsx` as a **Client Component** (`"use client"`) accepting `isAuthenticated: boolean` prop. Use `useMarketingLocale()` from `lib/marketing/i18n.ts` to get `locale` and `setLocale`. Render: WABDesk logo, auth-aware CTAs (Sign In / Sign Up when unauthenticated; Dashboard when authenticated), a language toggle button that calls `setLocale` to switch between `"ar"` and `"en"` and shows current language (e.g. "EN" / "ع"), and a `MobileNavSheet` (extracted to `components/marketing/mobile-nav-sheet.tsx`). When `locale="ar"`: apply `dir="rtl"` on the nav wrapper, render Arabic labels. When `locale="en"`: apply `dir="ltr"`, render English labels. Use `ms-`/`me-` Tailwind classes, no `ml-`/`mr-`.
- [x] T005 Create `components/marketing/marketing-footer.tsx` as a Client Component (`"use client"`) accepting `locale: MarketingLocale`. Render footer links using `t(locale, ...)` for Sign Up, Sign In, Pricing labels. Copyright line in both languages or locale-switched. Layout direction inherited from parent wrapper.
- [x] T006 Create `components/marketing/mobile-nav-sheet.tsx` as a Client Component (`"use client"`) that renders a shadcn `Sheet` triggered by a hamburger button. Sheet content includes the same CTA links as the desktop nav. Uses `isAuthenticated: boolean` prop.

**Checkpoint**: Run `npm run dev`, visit `http://localhost:3000` unauthenticated. Page renders without crashing with nav and footer visible.

---

## Phase 3: User Story 1 — First-Time Visitor Understands and Signs Up (P1) 🎯 MVP

**Goal**: Unauthenticated visitor lands on homepage, reads hero + features, clicks "ابدأ مجاناً", reaches sign-up page.

**Independent Test**: Open `http://localhost:3000` in incognito. Verify hero value proposition "صندوق بريد WhatsApp للفرق" is visible above the fold. Click "ابدأ مجاناً" — verify browser navigates to `/sign-up`.

- [x] T007 [P] [US1] Create `components/marketing/hero-section.tsx` as a Client Component (`"use client"`) accepting `isAuthenticated: boolean` and `locale: MarketingLocale`. Render: large heading using `t(locale, "hero.title")` ("صندوق بريد WhatsApp للفرق" / "WhatsApp Team Inbox"), supporting subtitle, primary CTA button using `t(locale, "cta.signup")` or `t(locale, "cta.dashboard")` based on auth state. Layout direction inherited from parent wrapper. Use Cairo font class, full-width section with responsive padding.
- [x] T008 [P] [US1] Create `components/marketing/features-section.tsx` as a Client Component (`"use client"`) accepting `features: FeatureHighlight[]` and `locale: MarketingLocale`. Render section with `id="features"`, heading via `t(locale, "features.heading")`, and a responsive grid of feature cards — each card shows Lucide icon + `feature.titleAr` or `feature.titleEn` + matching description based on locale. RTL/LTR grid inherits from parent `dir`.
- [x] T009 [US1] Wire T007 and T008 into `app/page.tsx`: import `HeroSection` and `FeaturesSection`, pass `isAuthenticated` to HeroSection, pass `features` array from pricing-data.ts to FeaturesSection.

**Checkpoint**: `http://localhost:3000` shows hero with value proposition and features grid. "ابدأ مجاناً" navigates to `/sign-up`.

---

## Phase 4: User Story 2 — Returning Visitor Signs In (P2)

**Goal**: Returning visitor finds "تسجيل الدخول" in nav and clicks through to sign-in page within 2 clicks.

**Independent Test**: Visit `http://localhost:3000` unauthenticated. Verify "تسجيل الدخول" is visible in navigation. Click it — verify navigation to `/sign-in`. On mobile (375px), verify the button is accessible via mobile sheet.

- [x] T010 [US2] Verify `components/marketing/marketing-nav.tsx` (created in Phase 2) correctly renders "تسجيل الدخول" with `href="/sign-in"` when `isAuthenticated=false`, and "الذهاب إلى لوحة التحكم" with `href="/inbox"` when `isAuthenticated=true`. Verify the same links appear in `mobile-nav-sheet.tsx`. No new files needed — this is a verification and fix task for any issues found in Phase 2 nav implementation.
- [x] T011 [US2] Verify `app/page.tsx` server-side auth check: sign in as a test user with an org, visit `http://localhost:3000`, confirm redirect to `/inbox`. Sign in as a user without org, confirm redirect to `/onboarding`. No new files — fix `app/page.tsx` if auth redirect logic has issues.

**Checkpoint**: Sign-in link in nav works on desktop and mobile. Auth redirect works correctly for both authenticated states.

---

## Phase 5: User Story 3 — Visitor Evaluates Pricing (P3)

**Goal**: Visitor reads all 4 plans with prices in EGP/SAR/AED/USD and clicks a plan CTA to sign up.

**Independent Test**: Visit `http://localhost:3000`, scroll to pricing. Verify 4 plan cards (Free, Starter, Growth, Business) are all visible. Verify each card shows prices in all 4 currencies. Verify Free plan shows "لا يلزم بطاقة ائتمانية". Verify Growth plan is visually highlighted. Click any plan CTA — verify navigation to `/sign-up`.

- [x] T012 [US3] Create `components/marketing/pricing-section.tsx` as a Client Component (`"use client"`) accepting `plans: Plan[]` and `locale: MarketingLocale`. Render section with `id="pricing"`, heading via `t(locale, "pricing.heading")`, and 4 plan cards in a responsive grid. Each card must show: plan name (`plan.nameAr` or `plan.nameEn` based on locale), prices formatted as "199 ج.م / 49 ر.س / 49 د.إ / $15" (all 4 currencies always shown regardless of locale), agent limit, channel limit, feature list with checkmarks using locale-appropriate strings, CTA button (href="/sign-up") with label from `t(locale, "cta.signup")`. Free plan card: add badge using `t(locale, "pricing.noCard")` ("لا يلزم بطاقة ائتمانية" / "No credit card required"). Growth plan: apply `ring-2 ring-primary` highlight.
- [x] T013 [US3] Wire T012 into `app/page.tsx`: import `PricingSection`, pass `plans` array from pricing-data.ts.

**Checkpoint**: Pricing section shows all 4 plans with all 4 currencies. Free plan badge visible. Growth plan highlighted.

---

## Phase 6: User Story 4 — Visitor Reads Competitive Differentiators (P4)

**Goal**: Skeptical visitor reads "Why WABDesk" section and understands zero markup, Arabic-first, and local currency advantages.

**Independent Test**: Visit `http://localhost:3000`, scroll to differentiators section. Verify all 3 differentiators are visible: (1) zero markup on Meta messages, (2) Arabic-first UX, (3) local currency billing. Verify the page itself is in Arabic RTL — demonstrating the Arabic-first claim, not just stating it.

- [x] T014 [US4] Create `components/marketing/differentiators-section.tsx` as a Client Component (`"use client"`) accepting `differentiators: Differentiator[]` and `locale: MarketingLocale`. Render section with `id="why-wabdesk"`, heading via `t(locale, "differentiators.heading")` ("لماذا وا ديسك؟" / "Why WABDesk?"), and 3 differentiator cards — each with Lucide icon + `differentiator.titleAr`/`titleEn` + matching statement based on locale. Differentiators: (1) zero markup on Meta messages, (2) Arabic-first UX (English copy: "Built for Arab markets — designed right-to-left from day one"), (3) local currency billing.
- [x] T015 [US4] Wire T014 into `app/page.tsx`: import `DifferentiatorsSection`, pass `differentiators` array from pricing-data.ts.

**Checkpoint**: Differentiators section renders with all 3 competitive claims in Arabic.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: RTL verification, mobile responsiveness, SEO, GEO, AEO and final integration validation.

- [ ] T016b [P] Verify language switcher: click the language toggle in nav → entire page switches to English with LTR layout (text left-aligned, layout mirrored). Click again → switches back to Arabic RTL. Refresh page → last-used language persists (reads from localStorage). Fix any component that doesn't respond to locale change.
- [ ] T016 [P] Verify full RTL layout on desktop: open `http://localhost:3000`, confirm all text is right-aligned, all icons are RTL-appropriate (no LTR directional arrows), all padding/margins use `start`/`end` logical values. Fix any `ml-`/`mr-` or `left-`/`right-` violations found in any marketing component.
- [ ] T017 [P] Verify mobile layout at 375px viewport width: all sections readable without horizontal scroll, CTA buttons have minimum 44px touch target height, mobile nav sheet opens and closes correctly, pricing cards stack vertically and remain readable.
- [ ] T018 Verify SEO metadata in `app/page.tsx`: run `curl -s http://localhost:3000 | grep -E '<title>|og:'` and confirm Arabic title and Open Graph tags are present in the server-rendered HTML.
- [ ] T019 Run all 5 quickstart.md verification scenarios and confirm each passes: (1) unauthenticated visitor sees homepage, (2) Sign Up CTA navigates to `/sign-up`, (3) authenticated user sees Dashboard CTA, (4) all 4 pricing plans visible with 4 currencies, (5) mobile layout at 375px works.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (needs pricing-data.ts types)
- **User Stories (Phases 3–6)**: All depend on Phase 2 completion
  - US1 (Phase 3) and US3 (Phase 5) and US4 (Phase 6) can run in parallel after Phase 2
  - US2 (Phase 4) depends on Phase 2 nav being complete — can run alongside Phase 3
- **Polish (Phase 7)**: Depends on all user story phases complete

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 only. No other story dependency.
- **US2 (P2)**: Depends on Phase 2 nav component. Can run in parallel with US1.
- **US3 (P3)**: Depends on Phase 2 + T001 (pricing data). Can run in parallel with US1/US2.
- **US4 (P4)**: Depends on Phase 2 + T001 (differentiators data). Can run in parallel with all others.

### Parallel Opportunities

- T007 (HeroSection) and T008 (FeaturesSection) can be built in parallel
- T012 (PricingSection) and T014 (DifferentiatorsSection) can be built in parallel
- T016 (RTL check) and T017 (mobile check) can run in parallel

---

## Parallel Example: User Story 1

```bash
# These two tasks can run simultaneously (different files):
Task T007: "Create components/marketing/hero-section.tsx"
Task T008: "Create components/marketing/features-section.tsx"

# Then sequentially (wires them into the page):
Task T009: "Wire HeroSection and FeaturesSection into app/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T006)
3. Complete Phase 3: User Story 1 (T007–T009)
4. **STOP and VALIDATE**: Open `http://localhost:3000` — hero and features visible, CTA works
5. Page is live and converting visitors to sign-ups

### Incremental Delivery

1. Phase 1 + 2 → Page shell with nav and footer (non-crashing)
2. - Phase 3 (US1) → Hero + features → **MVP: page converts visitors**
3. - Phase 4 (US2) → Nav sign-in verified
4. - Phase 5 (US3) → Pricing section added
5. - Phase 6 (US4) → Differentiators added → **Full homepage complete**
6. Phase 7 → Polish and verify

---

## Notes

- [P] tasks = different files, no dependencies between them
- [Story] label maps each task to its user story for traceability
- No Convex queries anywhere in this feature — all components are static Server Components
- Cairo font is already loaded globally — do not add a new font import
- `dir="rtl"` is already on `<html>` — add it to section wrappers for safety, not required to set again on `<html>`
- All Tailwind spacing must use `ms-`/`me-` not `ml-`/`mr-`
