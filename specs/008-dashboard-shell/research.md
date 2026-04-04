# Research: Dashboard Shell & Role-Aware Navigation

## Decision 1: Where to Read Clerk Role

**Decision**: Read `orgRole` in the server component layout via `auth()` from `@clerk/nextjs/server`. Pass resolved role as a prop to sidebar Client Component.

**Rationale**: `auth()` returns `orgRole` synchronously without a network round-trip. Client-side `useOrganization()` requires a hydration cycle and can flash unauthorized UI before roles load — unacceptable for a security-sensitive nav.

**Alternatives considered**: `useOrganization()` hook client-side — rejected due to flash-of-unauthorized-UI risk and unnecessary client round-trip.

---

## Decision 2: Role-Based Nav Config Pattern

**Decision**: Single canonical `NAV_ITEMS` array where each item has a `minRole: 'agent' | 'supervisor' | 'admin'` field. Filter server-side before passing to sidebar.

```ts
const ROLE_ORDER = { agent: 0, supervisor: 1, admin: 2 }
const filtered = NAV_ITEMS.filter(i => ROLE_ORDER[i.minRole] <= ROLE_ORDER[resolvedRole])
```

**Rationale**: Single source of truth. Adding a new nav item requires touching one place. Trivially extensible.

**Alternatives considered**: Separate nav config per role — rejected because it causes drift when items change and requires updating 3 arrays instead of 1.

---

## Decision 3: Route Protection Strategy

**Decision**: Split concern — `middleware.ts` handles unauthenticated redirects (to sign-in). Role-based forbidden redirects are enforced in `layout.tsx` / `page.tsx` server components.

**Rationale**: Clerk's `orgRole` is not reliably available in middleware without an extra API call. Route-to-role mapping is cleaner in layout/page where the full Clerk session is resolved.

**Alternatives considered**: All role logic in middleware — rejected because `orgRole` resolution is unreliable there and the route mapping would be fragile.

---

## Decision 4: Sidebar Component

**Decision**: Use shadcn/ui `Sidebar` component with `collapsible="icon"` and `side={locale === 'ar' ? 'right' : 'left'}` prop.

**Rationale**: shadcn Sidebar handles collapsible state, keyboard navigation, and dark mode via CSS variables out of the box. `side` prop handles RTL positioning directly. Saves ~200 lines of boilerplate.

**Alternatives considered**: Custom sidebar — rejected; too much boilerplate for no benefit given shadcn/ui is already the UI library.

---

## Decision 5: RTL Layout Strategy

**Decision**: Set `dir` attribute on `<html>` element (already done in marketing page pattern). Use Tailwind CSS logical properties everywhere: `ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`, `border-s`/`border-e`.

**Rationale**: Setting `dir` on `<html>` makes 90% of RTL layout work automatically with logical properties. No per-component RTL logic needed.

**Alternatives considered**: `rtl:` Tailwind variant — works but is verbose (`rtl:mr-4 ltr:ml-4`). Logical properties are cleaner and more maintainable.

---

## Decision 6: Active State Indicator

**Decision**: Use `border-s-2` (border-inline-start) for sidebar active indicator — auto-flips to outer edge in both LTR and RTL. Use `border-t-2` for bottom nav (direction-agnostic).

**Rationale**: Logical properties ensure the indicator always appears on the correct side without any conditional logic.

---

## Decision 7: Mobile Bottom Nav Safe Area

**Decision**: Use `pb-[env(safe-area-inset-bottom)]` on the bottom nav container. Requires `viewport-fit=cover` in the viewport meta tag.

**Rationale**: iOS Safari requires `env(safe-area-inset-bottom)` to avoid content being hidden behind the home indicator. The viewport meta tag enables this.

---

## Decision 8: Icon Flipping for RTL

**Decision**: Apply `rtl:scale-x-[-1]` class to directional icons (ChevronLeft/Right, ArrowLeft/Right, Send, Reply). Non-directional icons (X, Check, Settings, Bell) do not need flipping.

**Rationale**: CSS transform is the lightest approach — no wrapper component needed for simple cases.
