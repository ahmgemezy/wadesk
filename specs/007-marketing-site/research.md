# Research: WaDesk Marketing Site

**Feature**: 007-marketing-site  
**Date**: 2026-04-04

---

## Decision 1: Page Route Strategy

**Decision**: Replace the current `app/page.tsx` auth-redirect with a marketing homepage that handles auth state inline (Server Component checks `auth()` and redirects authenticated users to `/inbox`).

**Rationale**: The spec requires that authenticated users clicking any CTA go to `/inbox`. A Server Component at `app/page.tsx` can call `auth()` server-side and redirect before rendering, keeping the marketing page as the default root while still serving the auth redirect behaviour. This avoids middleware complexity for a single page.

**Alternatives considered**:
- Middleware redirect: More powerful but adds latency to every root visit and is harder to test in isolation.
- Separate subdomain (e.g., `wadesk.com` vs `app.wadesk.com`): Ruled out in spec Assumptions — Phase 1 lives at the root of the same Next.js app.

---

## Decision 2: Component Architecture

**Decision**: All marketing UI goes in `components/marketing/` as server components (no `"use client"` unless interactivity is required). The page is composed of named section components.

**Rationale**: Next.js 15 Server Components are the default and reduce JS bundle size. The marketing page has no client-side interactivity (no state, no event handlers). The only exception is a potential mobile navigation toggle, which can be isolated.

**Alternatives considered**:
- Single large `app/page.tsx` file: Rejected — violates separation of concerns and makes the pricing data hard to maintain.
- Separate `app/(marketing)/page.tsx` route group: Unnecessary for Phase 1 (homepage only); `app/page.tsx` is sufficient.

---

## Decision 3: Static Pricing Data

**Decision**: Pricing data (plans, features, currencies) is defined in a static TypeScript constant file at `lib/marketing/pricing-data.ts` — not fetched from Convex or any API.

**Rationale**: Pricing is defined in CLAUDE.md and changes rarely. Fetching it from a database adds unnecessary complexity for a static marketing page. When pricing changes, it is a code change (reviewed, tested, deployed).

**Alternatives considered**:
- Fetch from Convex: Overkill for static content; public page has no authenticated Convex session.
- Headless CMS: Out of scope for Phase 1.

---

## Decision 4: RTL/Cairo Font

**Decision**: Use the Cairo font already loaded in the Next.js app (`app/layout.tsx` global styles). No new font loading is needed. Apply `dir="rtl"` at the section/component level — the root `<html>` already has `dir="rtl"`.

**Rationale**: The spec Assumptions confirm Cairo is already in the app. Adding a second `<link>` for the same font would cause duplicate load.

**Alternatives considered**:
- Load font separately in a marketing layout: Unnecessary — the global layout already covers it.

---

## Decision 5: Auth-Aware Navigation

**Decision**: The navigation bar is a Server Component that calls `auth()` to check if the user is authenticated and has an org. It renders either Sign In + Sign Up CTAs (unauthenticated) or a Dashboard link (authenticated).

**Rationale**: Server-side auth check avoids flash of unauthenticated content. No client-side state or hydration needed.

**Alternatives considered**:
- Client component with `useAuth()`: Would cause a flash of unauthenticated nav before hydration. Worse UX.

---

## Decision 6: Mobile Navigation

**Decision**: Use a simple CSS-driven disclosure (shadcn `Sheet` or a plain `<details>` toggle) for mobile nav. The Sheet component from shadcn/ui is already in the project.

**Rationale**: Keeps the nav accessible and RTL-compatible without a complex state manager. Sheet already handles RTL correctly when `side="right"` (start side in RTL).

---

## Decision 7: No New Convex Tables

**Decision**: The marketing site introduces zero new Convex tables. All content is static.

**Rationale**: The page is entirely public and static. No user data is read or written.

---

## Decision 8: SEO Metadata

**Decision**: Use Next.js 15 `generateMetadata` (or static `metadata` export) in `app/page.tsx` to set Arabic `title`, `description`, and Open Graph tags.

**Rationale**: The spec requires FR-012 (basic SEO metadata in Arabic). Next.js metadata API is the standard approach for App Router.

**Alternatives considered**:
- `<head>` tags in layout: Overridden by page-level metadata, which is cleaner.
