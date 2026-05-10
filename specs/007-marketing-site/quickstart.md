# Quickstart: WABDesk Marketing Site

**Feature**: 007-marketing-site  
**Date**: 2026-04-04

---

## How to Verify the Marketing Site Works

### Scenario 1: Unauthenticated visitor sees homepage

1. Open a private/incognito browser window
2. Navigate to `http://localhost:3000`
3. **Expected**: Marketing homepage renders with hero, features, pricing, differentiators, footer
4. **Expected**: Navigation shows "تسجيل الدخول" and "ابدأ مجاناً" buttons
5. **Expected**: Page is RTL (Arabic text right-to-left, layout mirrored)

### Scenario 2: Unauthenticated visitor clicks Sign Up CTA

1. From the homepage (unauthenticated), click "ابدأ مجاناً"
2. **Expected**: Browser navigates to `/sign-up`

### Scenario 3: Authenticated user sees Dashboard CTA

1. Sign in and create an org at `/sign-in`
2. Navigate to `http://localhost:3000`
3. **Expected**: Navigation shows "الذهاب إلى لوحة التحكم" instead of Sign In / Sign Up
4. **Expected**: Clicking it navigates to `/inbox`

### Scenario 4: All 4 pricing plans visible

1. Open homepage (unauthenticated)
2. Scroll to pricing section
3. **Expected**: Free, Starter, Growth, Business plans all visible
4. **Expected**: Each plan shows prices in EGP, SAR, AED, USD
5. **Expected**: Free plan shows "لا يلزم بطاقة ائتمانية"
6. **Expected**: Growth plan is visually highlighted

### Scenario 5: Mobile layout

1. Open browser DevTools → set viewport to 375px width
2. Navigate to `http://localhost:3000`
3. **Expected**: All sections readable without horizontal scroll
4. **Expected**: CTA buttons tappable (minimum 44px touch target)
5. **Expected**: Navigation collapses to a hamburger/sheet on mobile

---

## Key Files to Check After Implementation

| File | What to verify |
|------|---------------|
| `app/page.tsx` | Auth check + metadata + section composition |
| `components/marketing/marketing-nav.tsx` | RTL nav, auth-aware CTAs |
| `components/marketing/hero-section.tsx` | Value prop, CTA |
| `components/marketing/features-section.tsx` | 4+ features with icons |
| `components/marketing/pricing-section.tsx` | 4 plans, all 4 currencies, free badge |
| `components/marketing/differentiators-section.tsx` | 3 differentiators |
| `components/marketing/marketing-footer.tsx` | Footer links |
| `lib/marketing/pricing-data.ts` | Static data constants |
