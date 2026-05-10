# UI Contracts: WABDesk Marketing Site

**Feature**: 007-marketing-site  
**Date**: 2026-04-04

These contracts define the props and rendering contract for each marketing section component. They are the interface between the page and its parts.

---

## MarketingNav

**File**: `components/marketing/marketing-nav.tsx`  
**Type**: Server Component

```typescript
interface MarketingNavProps {
  isAuthenticated: boolean;  // true if user is signed in with an org
}
```

**Rendering contract**:
- `isAuthenticated: false` → renders "تسجيل الدخول" (href="/sign-in") + "ابدأ مجاناً" (href="/sign-up")
- `isAuthenticated: true` → renders "الذهاب إلى لوحة التحكم" (href="/inbox")
- All screen sizes: buttons must be visible (responsive nav with mobile sheet)
- RTL: logo on the right, nav links on the left (start/end reversed)

---

## HeroSection

**File**: `components/marketing/hero-section.tsx`  
**Type**: Server Component

```typescript
interface HeroSectionProps {
  isAuthenticated: boolean;
}
```

**Rendering contract**:
- Displays product name "WABDesk"
- Displays value proposition: "صندوق بريد WhatsApp للفرق"
- Primary CTA: `isAuthenticated: false` → "ابدأ مجاناً" (href="/sign-up") | `true` → "الذهاب إلى لوحة التحكم" (href="/inbox")
- Secondary CTA: optional "تعرف أكثر" anchor to #features

---

## FeaturesSection

**File**: `components/marketing/features-section.tsx`  
**Type**: Server Component

```typescript
interface FeaturesSectionProps {
  features: FeatureHighlight[];
}
```

**Rendering contract**:
- Renders a grid of feature cards, minimum 4
- Each card: icon + Arabic title + Arabic description
- Section id: `id="features"` for anchor navigation
- RTL grid layout

---

## PricingSection

**File**: `components/marketing/pricing-section.tsx`  
**Type**: Server Component

```typescript
interface PricingSectionProps {
  plans: Plan[];
}
```

**Rendering contract**:
- Section id: `id="pricing"`
- Renders 4 plan cards: Free, Starter, Growth (highlighted), Business
- Each card shows: plan name (AR + EN), prices in EGP / SAR / AED / USD
- Each card shows: agent limit, channel limit, feature list
- Free plan card shows: "لا يلزم بطاقة ائتمانية" badge
- Growth plan card: visually highlighted (recommended)
- CTA button on each card: href="/sign-up"

---

## DifferentiatorsSection

**File**: `components/marketing/differentiators-section.tsx`  
**Type**: Server Component

```typescript
interface DifferentiatorsSectionProps {
  differentiators: Differentiator[];
}
```

**Rendering contract**:
- Section id: `id="why-wabdesk"`
- Renders each differentiator with icon + title + statement
- Must include zero markup, Arabic-first, local currency items

---

## MarketingFooter

**File**: `components/marketing/marketing-footer.tsx`  
**Type**: Server Component  
**Props**: None

**Rendering contract**:
- Links: Sign Up (href="/sign-up"), Sign In (href="/sign-in"), Pricing (href="#pricing")
- Displays product name and copyright
- RTL layout
