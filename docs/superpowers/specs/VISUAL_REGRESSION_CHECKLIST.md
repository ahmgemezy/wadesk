# Visual Regression Checklist — Phase 2 QA

Run this checklist for EVERY component refactored in Phase 2.

## Light Mode Rendering

- [ ] Stat card shadows visible (not blended into white background)
- [ ] Text contrast minimum 4.5:1 (check with WebAim contrast checker)
- [ ] Hover state: shadow increases smoothly, no jump
- [ ] Focus ring visible (outline-2, color #0071E3)
- [ ] No visual artifacts (blurring, color shifts)

## Dark Mode Rendering

- [ ] Stat card shadows visible (darker than light mode opacity)
- [ ] Background #2c2c2e is distinct from surrounding surfaces
- [ ] Text contrast minimum 4.5:1 (check with WebAim)
- [ ] All `dark:` variants applied (no missing dark mode styles)
- [ ] Focus ring visible (outline-2, color #0A84FF)

## Mobile Responsiveness (<768px)

- [ ] All buttons/inputs ≥44×44 (check with DevTools)
- [ ] Text readable at small screen width (no tiny fonts)
- [ ] Cards stack vertically (grid-cols-1)
- [ ] No horizontal scrolling
- [ ] Touch targets have adequate spacing

## Tablet (768–1024px)

- [ ] Cards arrange in 2-column layout
- [ ] Spacing proportionate to desktop
- [ ] All interactive elements ≥44×44

## RTL Mode (Arabic)

- [ ] Switch app to Arabic (set `dir="rtl"`)
- [ ] Selected item border appears on RIGHT side (border-start)
- [ ] No visual flips (layouts respect RTL)
- [ ] Shadows symmetric (no directional issues)
- [ ] Icons that should flip DO flip (arrows)
- [ ] Icons that shouldn't flip DON'T flip (checkmarks)

## Keyboard Navigation

- [ ] Tab through entire component — focus visible on every interactive element
- [ ] Focus ring doesn't cover important content
- [ ] Logical tab order (LTR: left-to-right, RTL: right-to-left)
- [ ] Focus ring contrast 3:1+ against background

## Animations & Performance

- [ ] Transitions smooth (no jank at 60fps)
- [ ] prefers-reduced-motion: animations disabled for motion-sensitive users
- [ ] Only GPU-accelerated properties used (`transform`, `opacity`)
- [ ] Animations ≤300ms for hover/focus

## Screenshot Comparison

- [ ] Light mode before/after match design spec
- [ ] Dark mode before/after match design spec
- [ ] No unintended changes in adjacent components

## Accessibility Audit (Optional but Recommended)

```bash
# Run Lighthouse accessibility audit on component
npx lighthouse https://localhost:3000/analytics --only-categories=accessibility --output=json
```

Expected: 90+ score, no critical accessibility violations
