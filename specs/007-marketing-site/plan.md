# Implementation Plan: WaDesk Marketing Site

**Branch**: `007-marketing-site` | **Date**: 2026-04-04 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/007-marketing-site/spec.md`

## Summary

Build the public-facing Arabic-first marketing homepage at the root `/` of the existing Next.js 15 app. The page is fully static (no Convex queries), server-rendered, and RTL-native. It replaces the current auth-redirect `app/page.tsx` with a homepage that shows the hero, features, pricing (4 plans × 4 currencies), and differentiators sections — then redirects authenticated users to `/inbox`. All content is defined in static TypeScript constants.

## Technical Context

**Language/Version**: TypeScript (strict, no `any`) + Next.js 15 (App Router)  
**Primary Dependencies**: shadcn/ui, Tailwind CSS, Lucide React (icons), Clerk (auth check only)  
**Storage**: N/A — all content is static TypeScript constants  
**Testing**: Manual visual verification per quickstart.md  
**Target Platform**: Web (Vercel), mobile-first responsive down to 375px  
**Project Type**: Static marketing page within existing Next.js app  
**Performance Goals**: Above-the-fold in under 2 seconds on mobile (SC-003); no client-side JS bundle for marketing sections  
**Constraints**: RTL layout mandatory; Cairo font (already loaded); no new Convex tables; homepage only (Phase 1)  
**Scale/Scope**: Single page, ~6 section components, 1 static data file

## Constitution Check

| Gate | Applies? | Status |
|------|----------|--------|
| RTL Gate | YES — this is a UI feature | PASS — all components use `dir="rtl"`, `ms-`/`me-` Tailwind classes, Cairo font |
| Tenant Scope Gate | NO — no Convex data reads or writes | N/A |
| Real-Time Gate | NO — static page, no live data | N/A |
| Security Gate | NO — no Meta API interaction | N/A |
| Schema Gate | NO — no new Convex tables | N/A |
| Simplicity Gate | NO — adds no onboarding steps; reduces friction by making product visible before signup | PASS |

**All applicable gates pass. Phase 0 and Phase 1 may proceed.**

## Project Structure

### Documentation (this feature)

```text
specs/007-marketing-site/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── ui-contracts.md  ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code

```text
app/
└── page.tsx                          # Replace current redirect with marketing homepage (Server Component)

components/
└── marketing/
    ├── marketing-nav.tsx             # Auth-aware navigation bar
    ├── hero-section.tsx              # Hero with value proposition + CTA
    ├── features-section.tsx          # Feature highlight grid (4+ features)
    ├── pricing-section.tsx           # 4 plan cards × 4 currencies
    ├── differentiators-section.tsx   # "Why WaDesk" competitive claims
    └── marketing-footer.tsx          # Footer with Sign Up / Sign In / Pricing links

lib/
└── marketing/
    └── pricing-data.ts               # Static Plan[], FeatureHighlight[], Differentiator[] data
```

**Structure Decision**: Single-page structure within existing Next.js app. Route group `(marketing)` is not needed for Phase 1 (homepage only). All components are Server Components except `marketing-nav.tsx` mobile toggle (if using Sheet, that's a Client Component — can be isolated as `mobile-nav-sheet.tsx`).

## Key Implementation Notes

### Replacing app/page.tsx

The current `app/page.tsx` is a server redirect. It must be replaced with a marketing page that:
1. Calls `auth()` from Clerk
2. If authenticated + has org → `redirect("/inbox")`
3. If authenticated + no org → `redirect("/onboarding")`
4. Otherwise → render the marketing homepage

This preserves all existing redirect behaviour while serving the marketing page to new visitors.

### Pricing Data Structure

All 4 plans are defined in `lib/marketing/pricing-data.ts`:

| Plan | EGP | SAR | AED | USD | Agents | Channels |
|------|-----|-----|-----|-----|--------|----------|
| Free (مجاني) | — | — | — | — | 2 | 1 |
| Starter | 199 | 49 | 49 | 15 | 5 | 1 |
| Growth | 399 | 99 | 99 | 29 | 15 | 3 |
| Business | 799 | 199 | 199 | 59 | ∞ | ∞ |

### RTL Rules for This Feature

- Use `dir="rtl"` on section wrappers (root `<html>` already set)
- Icon flip for directional icons (arrows pointing left in LTR → point right in RTL)
- Pricing card layout: flex/grid with `start`/`end` alignment
- Mobile nav Sheet: `side="right"` in LTR = `side="start"` in RTL context — verify with `dir`

### SEO Metadata

Add to `app/page.tsx`:
```typescript
export const metadata: Metadata = {
  title: "وا ديسك — صندوق بريد واتساب للفرق",
  description: "منصة دعم عملاء على واتساب للشركات الصغيرة والمتوسطة في مصر والخليج. إدارة محادثات واتساب بفريق متعدد الوكلاء.",
  openGraph: {
    title: "وا ديسك — صندوق بريد واتساب للفرق",
    description: "ادر محادثات واتساب بفريق كامل من لوحة تحكم واحدة",
    locale: "ar_EG",
    type: "website",
  },
};
```

## Complexity Tracking

No constitution violations. No complexity justification required.
