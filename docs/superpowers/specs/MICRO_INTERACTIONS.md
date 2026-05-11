# Micro-Interactions Guidelines

## Button Hover

- **Property:** `transform` (GPU-accelerated)
- **Duration:** 150ms
- **Effect:** Scale up 2%, shadow intensifies
- **Implementation:**

```html
<button class="hover:scale-[1.02] hover:shadow-lg transition-all duration-[150ms]">
  Save Changes
</button>
```

## Button Active (Press)

- **Property:** `transform`
- **Duration:** 150ms
- **Effect:** Scale down to 98%
- **Implementation:**

```html
<button class="active:scale-[0.98] transition-transform duration-[150ms]">
  Save Changes
</button>
```

## Input Focus

- **Property:** `border-color`, `box-shadow` (outline-2)
- **Duration:** 150ms
- **Effect:** Blue border + ring outline
- **Implementation:**

```html
<input class="focus-visible:border-[#0071E3] focus-visible:outline-2 
            focus-visible:outline-[#0071E3] focus-visible:outline-offset-2
            dark:focus-visible:border-[#0A84FF] dark:focus-visible:outline-[#0A84FF]
            transition-all duration-[150ms]" />
```

## Modal/Drawer Enter

- **Property:** `opacity`, `transform` (both GPU-accelerated)
- **Duration:** 300ms
- **Easing:** ease-in-out
- **Implementation (Framer Motion):**

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: 20 }}
  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
/>
```

## Page Transition

- **Property:** `opacity`
- **Duration:** 300ms
- **Easing:** ease-in-out
- **Implementation:**

```tsx
<AnimatePresence>
  <motion.div
    key={page}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3 }}
  />
</AnimatePresence>
```

## Accessibility: Respect prefers-reduced-motion

ALL animations must support users who prefer reduced motion.

```tsx
import { useReducedMotion } from "framer-motion";

const prefersReducedMotion = useReducedMotion();

<motion.div
  animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
  initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
  transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
/>
```

## ✅ Do Animate

- `transform` (translate, rotate, scale)
- `opacity`
- Page transitions
- Button hover/active
- Modal enter/exit
- Loading spinners

## ❌ Never Animate

- `background-color` (use opacity + transform instead)
- `box-shadow` (use opacity + transform instead)
- `width`/`height` (use transform: scale instead)
- `left`/`top` (use transform: translate instead)

## Performance Rules

- Fast: 150ms (micro-interactions)
- Standard: 300ms (modals, page transitions)
- Slow: 500ms (only for important feedback)
- Never exceed 300ms for hover/focus animations

## Design Token References

Use these DT tokens for consistent animations:
- `DT.TRANSITION_FAST` — 150ms
- `DT.TRANSITION_STANDARD` — 200ms
- `DT.TRANSITION_SLOW` — 300ms
- `DT.SHADOW_HOVER` — hover shadow lift
- `DT.SHADOW_HOVER_LG` — large hover shadow lift
