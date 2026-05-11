# Mobile Responsiveness Specification

## Breakpoints

| Size | Breakpoint | Sidebar | Cards | Touch Targets |
|------|------------|---------|-------|----------------|
| Mobile | <640px | Hidden (hamburger) | 1-column | 44×44px min |
| Tablet | 640–1024px | Hidden or bottom nav | 2-column | 44×44px min |
| Desktop | >1024px | 320px fixed | 4-column | Standard |

## Sidebar Mobile Behavior

**Desktop (>md):**
- Fixed left sidebar, 320px width, always visible
- Navigation items, secondary text, user profile footer

**Tablet/Mobile (< md):**
- Hidden by default
- Hamburger menu button in header (top-left in LTR, top-right in RTL)
- Opens as overlay/drawer from left side (LTR) or right side (RTL)
- Must support swipe-to-close gesture (mobile UX)

## Analytics Grid

**Mobile (<640px):**
```html
<div class="grid grid-cols-1 gap-4">
  <!-- 1 stat card per row -->
</div>
```

**Tablet (640–1024px):**
```html
<div class="grid grid-cols-2 gap-4">
  <!-- 2 stat cards per row -->
</div>
```

**Desktop (>1024px):**
```html
<div class="grid grid-cols-4 gap-4">
  <!-- 4 stat cards per row -->
</div>
```

## Touch Target Sizes

All interactive elements (<md screens) MUST be:
- Minimum 44×44px (WCAG mobile standard)
- Padding: py-3 on buttons (from py-2.5 on desktop)
- Icon size: 24px minimum (not 20px)

Examples:
```html
<!-- Desktop button: py-2.5 -->
<button class="py-2.5 px-4 sm:py-3">Button</button>

<!-- Mobile automatically gets py-3 via Tailwind sm: breakpoint -->
```

## Chart Container Height

Prevent vertical scroll on mobile:
```html
<div class="h-[300px] sm:h-[400px] lg:h-[500px]">
  <Chart />
</div>
```

## Validation Checklist

- [ ] iPhone 12 (375px): sidebar hidden, cards 1-column, hamburger visible
- [ ] iPad (768px): cards 2-column, sidebar option to show
- [ ] Desktop (1440px): sidebar visible 320px, cards 4-column
- [ ] No horizontal scroll on any viewport
- [ ] All buttons/inputs ≥44×44 on mobile
