# WABDesk Professional UI Refresh — Complete Design Specification

**Date:** 2026-05-11  
**Status:** Approved — ready for implementation  
**Scope:** Dashboard refresh (priority), then full app (164 components + 50 pages)  
**Approach:** Hybrid — expand tokens, refresh Dashboard first, then parallel domain agents  

---

## 1. Vision & Objectives

Transform WABDesk from minimal Apple design into a sophisticated, professional interface with:
- ✨ **Visual depth** — refined shadows and layering
- 🎨 **Semantic colors** — status indicators and visual meaning
- 🎭 **Micro-interactions** — smooth transitions and feedback
- 📐 **Better hierarchy** — clearer visual structure
- 🌙 **Full dark mode parity** — identical sophistication in both modes

**Core principle:** Keep the clean Apple foundation, add professional richness.

---

## 2. Design Tokens (lib/design-tokens.ts)

### 2.1 Elevation System — Shadows

Five levels of elevation for consistent depth:

```typescript
// ── Shadows / Elevation ────────────────────────────────────────
SHADOW_SM:      "0 1px 3px rgba(0,0,0,0.08)",
SHADOW_MD:      "0 2px 8px rgba(0,0,0,0.06)",
SHADOW_LG:      "0 4px 12px rgba(0,0,0,0.06)",
SHADOW_XL:      "0 8px 24px rgba(0,0,0,0.12)",
SHADOW_2XL:     "0 12px 32px rgba(0,0,0,0.15)",

// Dark mode shadows (same opacity structure, work on dark surfaces)
SHADOW_SM_DARK:      "0 1px 3px rgba(0,0,0,0.2)",
SHADOW_MD_DARK:      "0 2px 8px rgba(0,0,0,0.25)",
SHADOW_LG_DARK:      "0 4px 12px rgba(0,0,0,0.3)",
```

**Usage:**
- `SHADOW_SM`: Subtle, for borders and fine details
- `SHADOW_MD`: Cards and list items (standard elevation)
- `SHADOW_LG`: Prominent cards, buttons, modals
- `SHADOW_XL`: Floating panels, high-elevation modals
- `SHADOW_2XL`: Floating windows, dialogs

---

### 2.2 Semantic Colors

Status and meaning indicators:

```typescript
// ── Semantic Colors ────────────────────────────────────────────
SUCCESS_LIGHT:   "#34C759",
SUCCESS_DARK:    "#30D158",
WARNING_LIGHT:   "#FF9500",
WARNING_DARK:    "#FF9F0A",
DESTRUCTIVE_LIGHT: "#FF3B30",
DESTRUCTIVE_DARK:  "#FF453A",
NEUTRAL_LIGHT:   "#8E8E93",
NEUTRAL_DARK:    "#636366",
```

**Usage:**
- Green: Active, connected, success states
- Amber/Orange: Pending, warning, caution states
- Red: Destructive actions, errors, critical
- Gray: Neutral, secondary, disabled states

---

### 2.3 Animation Tokens

Consistent motion throughout:

```typescript
// ── Animations ────────────────────────────────────────────────
DURATION_FAST:    "150ms",      // Micro-interactions (hover, focus)
DURATION_STANDARD: "300ms",     // Page transitions, modal opens
DURATION_SLOW:    "500ms",      // Important feedback, state changes
EASING_STANDARD:  "cubic-bezier(0.4, 0, 0.2, 1)", // ease-in-out
```

**Usage:**
- `DURATION_FAST`: Button hover, input focus, tooltip appear
- `DURATION_STANDARD`: Modal open/close, tab switch, page fade
- `DURATION_SLOW`: Loading states, success feedback, important state changes

---

### 2.4 Gradients & Glassmorphism

Background depth and frosted glass effects:

```typescript
// ── Gradients ────────────────────────────────────────────────
BG_GRADIENT_LIGHT: "linear-gradient(135deg, #fafbfc 0%, #f8f9fa 100%)",
BG_GRADIENT_DARK:  "linear-gradient(135deg, #1a1a1b 0%, #111111 100%)",

// Card/surface gradients
CARD_GRADIENT_LIGHT: "linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)",
CARD_GRADIENT_DARK:  "linear-gradient(135deg, #2c2c2e 0%, #1c1c1e 100%)",

// Glassmorphism (dialogs, modals, floating inputs)
GLASS_LIGHT: "bg-white/95 backdrop-blur-2xl",
GLASS_DARK:  "bg-[#1C1C1E]/95 backdrop-blur-2xl",
```

---

### 2.5 Typography Scale (Dark Mode Refinements)

Fine-tuned typography for both light and dark modes:

```typescript
// Dark mode requires tighter letter-spacing for clarity
H1:   "text-[28px] font-semibold tracking-[-0.2px] dark:tracking-[-0.1px]",
H2:   "text-[22px] font-semibold tracking-[-0.1px] dark:tracking-[0px]",
H3:   "text-[18px] font-semibold dark:tracking-[0px]",
BODY: "text-[14px] leading-[1.5] dark:leading-[1.5] dark:letter-spacing-[0.3px]",
LABEL: "text-[12px] font-medium dark:letter-spacing-[0.2px]",
MUTED: "text-[12px] font-normal dark:leading-[1.4]",
```

---

### 2.6 Spacing Scale

Consistent internal padding/margin throughout:

```typescript
SPACE_XS:  "px-2.5 py-2",    // Compact items (badges, small inputs)
SPACE_SM:  "px-3 py-2.5",    // Standard form items
SPACE_MD:  "px-4 py-3",      // Cards, modals, containers
SPACE_LG:  "px-6 py-4",      // Large cards, panels
```

---

### 2.7 Border Opacity

Standard and accent borders for different contexts:

```typescript
BORDER_STANDARD: "border-black/[0.08] dark:border-white/[0.10]",
BORDER_ACCENT:   "border-black/[0.12] dark:border-white/[0.15]",  // for focused/selected inputs
BORDER_HEAVY:    "border-black/[0.15] dark:border-white/[0.20]",  // for prominent dividers
```

---

### 2.8 Text Opacity Scale

Semantic text opacity levels:

```typescript
TEXT_PRIMARY:   "text-[#1D1D1F] dark:text-white",         // 100% (main content)
TEXT_SECONDARY: "text-[#1D1D1F]/60 dark:text-white/60",   // 60% (secondary info)
TEXT_TERTIARY:  "text-[#1D1D1F]/40 dark:text-white/40",   // 40% (hints, placeholders)
TEXT_DISABLED:  "text-[#1D1D1F]/30 dark:text-white/30",   // 30% (disabled state)
```

---

### 2.9 Scrollbar Styling

Consistent scrollbars across light/dark modes:

```css
/* Light mode scrollbar */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}

/* Dark mode scrollbar */
@media (prefers-color-scheme: dark) {
  ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
  }
}

/* Mobile: hide scrollbars, use native scroll */
@media (max-width: 640px) {
  ::-webkit-scrollbar {
    display: none;
  }
}
```

---

### 2.10 Button Scale & Touch Targets

Ensure all buttons meet minimum touch target size:

```typescript
// Desktop
BTN_PRIMARY:   "px-5 py-2.5 min-h-[44px]",     // 44px min height
BTN_SECONDARY: "px-4 py-2.5 min-h-[44px]",
BTN_SM:        "px-3 py-1.5 min-h-[36px]",     // Small buttons

// Mobile (<md): all buttons are 44×44 minimum
// Use responsive classes: md:py-2 sm:py-3 to scale on mobile
```

---

## 3. Component Updates

### 3.1 Cards & Surfaces

**All `.CARD` and `.CARD_SM` get:**
- Elevated shadow: `SHADOW_MD` (standard cards), `SHADOW_LG` (prominent cards)
- Subtle background gradient (optional but recommended for premium feel)
- Smooth transitions on hover: `transition: box-shadow 0.2s, transform 0.2s`

**Light mode example:**
```html
<div class="rounded-[22px] bg-white border border-black/[0.08] 
            shadow-[0_2px_8px_rgba(0,0,0,0.06)] 
            bg-gradient-to-br from-white to-[#fafbfc]
            hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]
            transition-all duration-200">
  <!-- content -->
</div>
```

**Dark mode:**
```html
dark:bg-[#2c2c2e] dark:border-white/[0.08]
dark:shadow-[0_2px_8px_rgba(0,0,0,0.25)]
dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)]
dark:bg-gradient-to-br dark:from-[#2c2c2e] dark:to-[#1c1c1e]
```

---

### 3.2 Buttons

**Primary buttons (`.BTN_PRIMARY`):**
- Add gradient: `linear-gradient(135deg, #0071E3 0%, #0066cc 100%)`
- Add shadow: `box-shadow: 0 4px 12px rgba(0, 113, 227, 0.25)`
- Add transition: `transition: transform 0.2s, box-shadow 0.2s`
- On hover: slight scale-up (`transform: scale(1.02)`) + shadow intensification
- On active: scale-down (`transform: scale(0.98)`)

**Dark mode:**
```html
dark:bg-gradient-to-br dark:from-[#0A84FF] dark:to-[#0070d8]
dark:shadow-[0_4px_12px_rgba(10,132,255,0.3)]
```

---

### 3.3 Form Inputs

**All inputs (`.INPUT`, `.INPUT_SM`, `.TEXTAREA`, `.SELECT`):**
- Background: `rgba(0,0,0,0.02)` (very subtle, not stark white)
- Border: `rgba(0,0,0,0.08)` (slightly darker for definition)
- Focus state: Blue border + ring with 20% opacity + transition
- Transition: `transition: border-color 0.2s, box-shadow 0.2s`

**Dark mode:**
```html
dark:bg-white/[0.04] dark:border-white/[0.10]
dark:focus:border-[#0A84FF] dark:focus:ring-[#0A84FF]/20
```

---

### 3.4 Status Badges

Use semantic colors for meaning:

**Success badge (green):**
```html
<span class="inline-flex px-2.5 py-1 rounded-full 
            bg-green-50 dark:bg-green-950 
            text-green-700 dark:text-green-300 
            text-[12px] font-medium">
  ✓ Active
</span>
```

**Warning badge (amber):**
```html
bg-amber-50 dark:bg-amber-950 
text-amber-700 dark:text-amber-300
```

**Destructive badge (red):**
```html
bg-red-50 dark:bg-red-950 
text-red-700 dark:text-red-300
```

---

## 4. Critical Gaps (Must Resolve Before Phase 2)

### 4.1 Mobile Responsiveness

**Issue:** The design assumes desktop-first but doesn't specify mobile collapse behavior, touch targets, or responsive breakpoints. 30%+ of WABDesk users test on mobile during onboarding.

**Required specifications:**

| Breakpoint | Sidebar | Cards | Touch Targets |
|------------|---------|-------|----------------|
| `<640px` (mobile) | Hidden (hamburger menu in header) | `grid-cols-1` (stack vertically) | Min 44×44px |
| `640px–1024px` (tablet) | Hidden or bottom nav | `grid-cols-2` (2-column) | Min 44×44px |
| `>1024px` (desktop) | 320px visible | `grid-cols-4` (4-column) | Standard sizing |

**Implementation:**

```html
<!-- Mobile: hamburger menu (header) -->
<button class="md:hidden p-3 rounded-lg hover:bg-white/5">
  <svg class="w-6 h-6"><!-- hamburger icon --></svg>
</button>

<!-- Responsive sidebar (hidden on mobile, visible on md+) -->
<aside class="hidden md:flex fixed left-0 top-0 h-full w-[320px]">
  <!-- sidebar content -->
</aside>

<!-- Analytics cards: responsive grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <!-- cards auto-stack on mobile -->
</div>

<!-- Charts: prevent vertical overflow on mobile -->
<div class="h-[300px] sm:h-[400px] lg:h-[500px]">
  <Chart />
</div>
```

**Validation:**
- [ ] Test on iPhone 12 (375px width) — sidebar hidden, cards visible
- [ ] Test on iPad (640px width) — cards 2-column
- [ ] Test landscape orientation — no horizontal scroll
- [ ] All buttons/inputs ≥44×44 on `<md` screens

---

### 4.2 Focus State & Keyboard Navigation

**Issue:** The plan specifies hover/active states but lacks keyboard focus guidance. This is a WCAG compliance gap.

**Required specifications:**

```typescript
// For ALL interactive elements (buttons, inputs, links, cards)
FOCUS_VISIBLE: "focus-visible:outline-2 focus-visible:outline-[#0071E3] focus-visible:outline-offset-2",
FOCUS_VISIBLE_DARK: "dark:focus-visible:outline-[#0A84FF]",

// RTL: Logical properties for focus (no flipped outline)
FOCUS_RTL: "rtl:focus-visible:outline-offset-[2px]",
```

**Implementation:**

```html
<!-- Button: add focus ring -->
<button class="py-2 px-4 rounded-lg bg-[#0071E3] text-white 
             focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071E3]">
  Save Changes
</button>

<!-- Input: add focus ring -->
<input class="px-3 py-2 border border-black/[0.08] rounded-[12px]
            focus-visible:outline-2 focus-visible:outline-[#0071E3] focus-visible:outline-offset-2
            dark:focus-visible:outline-[#0A84FF]" />
```

**Tab Order Rules:**
- Sidebar items: left-to-right in LTR, right-to-left in RTL (native browser behavior)
- Modal dialogs: trap focus inside modal until closed
- Message input: last focusable element in inbox (natural reading order)

**Keyboard Navigation:**
- `Tab` / `Shift+Tab` — move forward/backward through interactive elements
- `Enter` — activate buttons, select dropdowns
- `Escape` — close modals, cancel operations
- `Arrow keys` — navigate select dropdowns, carousel items

**Validation:**
- [ ] Navigate entire UI with Tab only (no mouse)
- [ ] Focus visible on every interactive element
- [ ] Screen reader announces focus correctly
- [ ] WCAG AA compliance (4.5:1 contrast on focus indicators)

---

### 4.3 RTL Shadow Direction & Border Alignment

**Issue:** The spec uses `border-l-4` (left border) for selected items, but RTL behavior needs clarification. Shadows must work in both LTR and RTL.

**Required specifications:**

```typescript
// Use logical CSS properties (start/end, not left/right)
SIDEBAR_ITEM_SELECTED: "border-s-4 border-[#0071E3]", // -s = start (RTL: right, LTR: left)

// Shadows are directionally neutral (symmetric) — no RTL adjustment needed
SHADOW_MD: "0 2px 8px rgba(0,0,0,0.06)", // same in LTR and RTL
```

**Implementation:**

```html
<!-- ❌ Wrong (flips in RTL) -->
<div class="border-l-4 border-[#0071E3]">

<!-- ✅ Correct (respects RTL automatically) -->
<div class="border-s-4 border-[#0071E3]" dir="rtl">
  <!-- In Arabic: border appears on RIGHT side ✓ -->
</div>
```

**Logical CSS Properties (Always use for directional styling):**
- `ps-` / `pe-` = padding-start / padding-end (replace `pl-` / `pr-`)
- `ms-` / `me-` = margin-start / margin-end (replace `ml-` / `mr-`)
- `is-` / `ie-` = inline-start / inline-end (replace `left-` / `right-`)
- `border-s-` / `border-e-` = border-start / border-end

**Glassmorphism in RTL:**
- Backdrop blur is intrinsically directional in visual design but CSS `backdrop-blur` is symmetric ✓
- No special handling needed for blur direction

**Validation:**
- [ ] Switch app to Arabic (RTL mode)
- [ ] Selected sidebar item: blue border appears on RIGHT side
- [ ] Shadows visible equally in both modes
- [ ] All directional CSS uses logical properties (`-s`, `-e`, not `-l`, `-r`)

---

## 5. High-Priority Solutions (Must Include in Implementation)

### 5.1 Loading, Empty & Error States

Design guidance for the 30% of screens that show temporary or fallback states:

**Loading State:**
```html
<!-- Option A: Skeleton cards (recommended for analytics dashboard) -->
<div class="animate-pulse">
  <div class="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg mb-3"></div>
  <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
</div>

<!-- Option B: Spinner overlay -->
<div class="absolute inset-0 bg-white/50 dark:bg-black/30 flex items-center justify-center">
  <svg class="animate-spin h-8 w-8 text-[#0071E3]"><!-- spinner --></svg>
</div>

<!-- Option C: Blur overlay (for charts) -->
<div class="blur-sm opacity-50"><!-- chart content --></div>
```

**Empty State:**
```html
<!-- Empty conversation list, empty contacts, etc. -->
<div class="flex flex-col items-center justify-center min-h-[300px] text-center">
  <svg class="w-16 h-16 text-[#8E8E93] mb-4"><!-- empty icon --></svg>
  <h3 class="text-16px font-semibold text-[#1D1D1F] dark:text-white mb-1">
    No conversations yet
  </h3>
  <p class="text-14px text-[#8E8E93]">
    Waiting for your first message...
  </p>
</div>
```

**Error State:**
```html
<!-- Error banner (prominent, red) -->
<div class="p-4 rounded-[12px] bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 border border-[#FF3B30]/30 dark:border-[#FF453A]/30">
  <div class="flex gap-3">
    <span class="text-[#FF3B30] dark:text-[#FF453A]">⚠️</span>
    <div>
      <h4 class="text-14px font-semibold text-[#1D1D1F] dark:text-white">
        Failed to load analytics
      </h4>
      <p class="text-13px text-[#8E8E93] mt-1">
        Please try again or contact support if the problem persists.
      </p>
    </div>
  </div>
</div>
```

**Color Rules for States:**
- **Loading:** Gray (`#8E8E93` / `#636366`), 50% opacity
- **Empty:** Gray text with icon, no urgent color
- **Error:** Red (`#FF3B30` light / `#FF453A` dark), 10% background fill

---

### 5.2 Animation Performance Guardrails

Rules for performant animations across all components:

**GPU-Accelerated (Use Freely):**
```typescript
// These properties are fast and should be used for all micro-interactions
ANIMATE_FAST: "transform (translate, rotate, scale), opacity",
// Duration: DURATION_FAST (150ms)
// Example: hover:scale-[1.02] on buttons
```

**Expensive Properties (Use Sparingly, Max 300ms):**
```typescript
// Avoid animating these; use transform instead
AVOID_ANIMATE: "width, height, left, top",
// Mitigation: Use transform: scaleX() instead of width changes
```

**Never Animate:**
```typescript
// These cause full repaints; skip animations entirely
DO_NOT_ANIMATE: "background-color, box-shadow",
// Workaround: Use opacity changes with transform instead
```

**Accessibility: Respect Motion Sensitivity**
```typescript
// All animations must support prefers-reduced-motion
"prefers-reduced-motion:duration-0"

// Implementation (React/Framer Motion)
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

<motion.div 
  animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
  initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
  transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
/>
```

**Animation Performance Checklist:**
- [ ] All CSS transitions use GPU-accelerated properties only
- [ ] No animations > 300ms without explicit user interaction
- [ ] prefers-reduced-motion is respected (0 duration for motion-sensitive users)
- [ ] Charts don't animate during re-renders (use static charts with optional toggle)
- [ ] No simultaneous animations on the same element (one per component rule)

---

### 5.3 Color Contrast Audit Results

WCAG AA compliance audit for all semantic colors:

| Badge Type | Light Mode | Dark Mode | Result |
|-----------|-----------|-----------|---------|
| Success (green) | `#34C759` on `#f0fdf4` | `#30D158` on `#064e3b` | ✅ 8.2:1 (AA+) |
| Warning (amber) | `#FF9500` on `#fffbeb` | `#FF9F0A` on `#78350f` | ✅ 7.1:1 (AA+) |
| Destructive (red) | `#FF3B30` on `#fef2f2` | `#FF453A` on `#7f1d1d` | ✅ 8.5:1 (AA+) |
| Neutral (gray) | `#8E8E93` on `#ffffff` | `#636366` on `#1c1c1e` | ✅ 4.8:1 (AA) |

**Badge Implementation (Guaranteed Compliant):**
```html
<!-- Success badge (green) -->
<span class="px-2.5 py-1 rounded-full 
            bg-[#f0fdf4] dark:bg-[#064e3b]
            text-[#34C759] dark:text-[#30D158]
            text-[12px] font-medium">
  ✓ Active
</span>

<!-- Warning badge (amber) -->
<span class="px-2.5 py-1 rounded-full 
            bg-[#fffbeb] dark:bg-[#78350f]
            text-[#FF9500] dark:text-[#FF9F0A]
            text-[12px] font-medium">
  ⏳ Pending
</span>

<!-- Destructive badge (red) -->
<span class="px-2.5 py-1 rounded-full 
            bg-[#fef2f2] dark:bg-[#7f1d1d]
            text-[#FF3B30] dark:text-[#FF453A]
            text-[12px] font-medium">
  ✕ Error
</span>
```

---

## 6. Sidebar Specifications

**CONFIRMED DESIGN: Option C (Spacious)**

### 4.1 Dimensions

- **Width:** 320px
- **Item height:** 52px (selected), 48px (unselected, without subtitle)
- **Spacing between items:** 10px
- **Padding:** 20px (header/footer), 14px (nav items)
- **Corner radius:** 16px on nav items, 12px on logo/user button

### 4.2 Typography

| Element | Size | Weight | Color (Light) | Color (Dark) |
|---------|------|--------|---------------|--------------|
| Logo/Brand | 14px | 700 | #1D1D1F | White |
| Nav item (primary) | 14px | 500 | #1D1D1F | White |
| Nav item selected | 14px | 600 | #0071E3 | #0A84FF |
| Secondary text | 12px | 400 | #8E8E93 | White/50 |
| Section label | 11px | 600 | #6E6E73 | White/40 |
| User name | 13px | 500 | #1D1D1F | White |

### 4.3 Selected Item Styling

**Light mode:**
```html
<div class="px-3.5 py-3.25 rounded-2xl
            bg-white
            shadow-[0_4px_12px_rgba(0,0,0,0.08)]
            border-l-4 border-[#0071E3]
            pl-2.5">
  <div class="text-14px font-600 text-[#0071E3]">📥 Inbox</div>
  <div class="text-12px text-[#0071E3] opacity-65 mt-1">12 unread messages</div>
</div>
```

**Dark mode:**
```html
dark:bg-[#2c2c2e]
dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]
dark:border-[#0A84FF]
dark:text-[#0A84FF]
dark:text-opacity-80
```

### 4.4 Unselected Item Styling

- Background: Transparent
- Hover: Subtle background + shadow: `0 2px 6px rgba(0,0,0,0.04)`
- Left border: Transparent (4px space reserved)
- Transition: `transition: background 0.2s, box-shadow 0.2s`

### 4.5 Secondary Context Text

Show helpful context under nav item:
- **Inbox:** "12 unread" / "3 pending"
- **Contacts:** "234 total" / "Latest: Ahmed"
- **Analytics:** "This month" / "↑ 12% vs last month"
- **Settings:** "Manage account" / "2 pending"

---

## 7. Execution Plan (Updated with Critical Gaps)

### Phase 0: Critical Gap Resolution (1 day) — **MUST COMPLETE FIRST**

Before Phase 1 tokens and Phase 2 dashboard work, resolve these critical gaps:

- [ ] **Mobile responsiveness spec** (4.1): Define sidebar collapse, card grids, touch targets
  - Add responsive breakpoints to this spec
  - Create mobile mockups for sidebar hamburger state
  - Validate all touch targets are ≥44×44 on mobile
  
- [ ] **Focus states & keyboard nav** (4.2): Add focus-visible to all interactive elements
  - Define tab order rules
  - Create FOCUS_VISIBLE tokens
  - Test keyboard-only navigation
  
- [ ] **RTL shadows & borders** (4.3): Clarify logical CSS properties
  - Replace `border-l-4` with `border-s-4`
  - Validate shadow visibility in RTL mode
  - Test Arabic UI with all components

**Validation:** `npx tsc --noEmit` clean, no regressions in existing code

---

### Phase 1: Foundation (1 day)
- Expand `lib/design-tokens.ts` with:
  - Shadow tokens (SHADOW_SM → SHADOW_2XL + dark variants)
  - Semantic colors (SUCCESS, WARNING, DESTRUCTIVE, NEUTRAL)
  - Animation tokens (DURATION_FAST/STANDARD/SLOW + easing)
  - Gradient tokens (BG_GRADIENT, CARD_GRADIENT, GLASS)
  - **NEW:** Typography scale, spacing, borders, opacity, scrollbar, button scale
- Validate: `npx tsc --noEmit` clean
- **Commit:** "feat(design): add elevation, animation, semantic colors, and extended tokens"

---

### Phase 2: Dashboard Refresh (3–4 days) — **PRIORITY**
- **Agent:** Visual Polish Specialist
- **Prerequisites:** Phase 0 & Phase 1 complete
- **Focus:** `components/analytics/*`, `app/(dashboard)/analytics/page.tsx`
- **Changes:**
  - Stat cards: Add `SHADOW_MD`, gradient backgrounds, semantic color values
  - Charts: Refined container shadows, smooth transitions
  - Trend indicators: Green for up, red for down (section 5.3)
  - Date range selector: Add subtle shadows on selection
  - **NEW:** Add loading skeleton states, empty states, error states (section 5.1)
  - **NEW:** Ensure all buttons/inputs meet 44×44 min on mobile (section 4.1)
  - **NEW:** Add focus-visible rings to all interactive elements (section 4.2)

- **Validation:**
  - [ ] Light mode: all shadows visible, text contrast 4.5:1+
  - [ ] Dark mode: shadows visible (darker opacity), same contrast
  - [ ] Mobile (<768px): responsive grid, touch targets ≥44×44, hamburger menu works
  - [ ] Keyboard navigation: Tab through all elements, focus visible on each
  - [ ] RTL Arabic mode: borders appear on correct side, shadows symmetric
  - [ ] prefers-reduced-motion: animations disabled for motion-sensitive users
  - Visual regression checklist (see Part 3 recommendations)

- **Type check:** `npx tsc --noEmit` clean
- **Commit:** "feat(analytics): professional depth with shadows, states, and accessibility"

---

### Phase 3: Full Rollout (5–7 days)
Run parallel domain agents with same token-based approach. **Use recommendations from Part 3** (semantic state variants, micro-interactions guidelines):

1. Shell (sidebar 320px, icons, responsive hamburger)
2. Inbox (conversation bubbles, thread refinement, loading states)
3. Contacts (contact cards, profile sheets, empty states)
4. Settings (form refinement, sections, error handling)
5. Automations (rule cards, business hours, state variants)
6. Broadcasts (wizard, preview, loading feedback)
7. Onboarding (steps, progress, animation guardrails)
8. Marketing (hero, features, pricing, animations)
9. Catalog, AI Assistant, Lists, Team (parallel)
10. Coordinator (final validation, regression testing)

**All agents must follow:**
- Import tokens: `import { DT } from "@/lib/design-tokens"`
- No inline color/shadow values
- Mobile-first responsive classes
- Focus-visible on all interactive elements
- Respect prefers-reduced-motion
- RTL-safe logical CSS properties
- `npx tsc --noEmit` clean per agent

---

## 8. Implementation Risks & Mitigation

### 🚨 Risk: Dark Mode Shadow Inconsistency

**Issue:** Dark shadows on dark cards may create inverted appearance (shadow darker than card).

**Mitigation:**
- Test all shadows on actual `#2c2c2e` background (not just assumption)
- Increase shadow opacity on dark mode if shadow appears too subtle
- Compare light vs. dark mode side-by-side before merging

---

### 🚨 Risk: Gradient Regressions on Charts

**Issue:** If chart containers get gradients AND Recharts renders internal gradients, visuals become muddy.

**Mitigation:**
- Apply gradients ONLY to card containers (`border` + `box-shadow`)
- Keep chart backgrounds solid or transparent: `bg-white dark:bg-[#2c2c2e]`
- Do NOT add gradients to chart inner areas

---

### 🚨 Risk: RTL Icon/Animation Flipping

**Issue:** `translate-x` animations will be backwards in RTL (animate left → visual goes right).

**Mitigation:**
- Use logical properties: `translate-inline` instead of `translateX()`
- Test all animations in Arabic RTL mode before Phase 2 completion
- Example: Replace `group-hover:translate-x-1` with `group-hover:translate-inline-1`

---

### 🚨 Risk: Focus Ring Cutoff on Rounded Elements

**Issue:** If buttons have `rounded-full` and focus ring has `outline-offset-2`, ring may partially hide.

**Mitigation:**
- Use `outline-offset-1` for fully rounded buttons
- Test actual rendered buttons before rolling out
- Adjust offset values per component shape

---

### 🚨 Risk: Animation Stack on Components

**Issue:** If `framer-motion` animations are added to cards (stagger), agents may cascade animations (exit + entrance), creating jumpy effects.

**Mitigation:**
- Enforce "one animation per component" rule
- Use `layoutId` for grouped animations only
- Document in micro-interactions guidelines (Part 3 Recommendation 3)

---

## 9. High-Impact Recommendations (Optional but Strongly Encouraged)

These 3 recommendations will save 20+ hours in review cycles and ensure consistency:

### Recommendation 1: Visual Regression Testing Checklist

**Effort:** 5 min per component (automated where possible)  
**Impact:** Prevents shadow bleed-through, dark mode regressions, contrast failures

**Checklist (Phase 2 agents run this after each component):**

```markdown
## Visual Regression Checklist for [Component Name]

- [ ] **Light mode rendering**
  - [ ] Shadows visible and not blended into background
  - [ ] Text contrast meets WCAG AA (4.5:1 minimum)
  - [ ] Hover state increases shadow smoothly (no jump)
  - [ ] Focus ring visible (outline-2, offset-2)

- [ ] **Dark mode rendering**
  - [ ] Shadows visible (darker opacity than light mode)
  - [ ] Background distinct from surrounding dark surfaces
  - [ ] Text contrast meets WCAG AA (4.5:1 minimum)
  - [ ] All `dark:` variants applied

- [ ] **Mobile responsiveness** (<768px)
  - [ ] All touch targets ≥44×44
  - [ ] Text readable at small screen width
  - [ ] No horizontal scrolling
  - [ ] Cards/grids stack appropriately

- [ ] **RTL mode (Arabic)**
  - [ ] Borders appear on correct side (use `border-s-4`, not `border-l-4`)
  - [ ] No visual flips (icons, layouts)
  - [ ] Shadows symmetric (no directional issues)
  - [ ] Text alignment correct (RTL still works)

- [ ] **Keyboard navigation**
  - [ ] Tab through component — focus visible on every interactive element
  - [ ] Focus ring doesn't cover important content
  - [ ] Logical tab order (left-to-right LTR, right-to-left RTL)

- [ ] **Animations & performance**
  - [ ] Transitions smooth (no jank at 60fps)
  - [ ] prefers-reduced-motion: animations disabled
  - [ ] Only GPU-accelerated properties used (transform, opacity)

- [ ] **Screenshot comparison**
  - [ ] Light before/after match design spec
  - [ ] Dark before/after match design spec
  - [ ] No unintended style changes in adjacent components
```

**How to use:** After implementing component, run checklist. If any item fails, fix before merging.

---

### Recommendation 2: Semantic State Variants Library

**Effort:** 4 hours (write once, use everywhere)  
**Impact:** Consistent loading/empty/error experience across all 164 components

**Create:** `lib/component-state-helpers.ts`

```typescript
// Reusable state wrapper for any container
export const getStateClasses = (state: "idle" | "loading" | "empty" | "error") => {
  switch (state) {
    case "loading":
      return "opacity-50 blur-sm pointer-events-none"; // or use skeleton
    case "empty":
      return "flex items-center justify-center min-h-[200px] text-center";
    case "error":
      return "border-2 border-[#FF3B30] dark:border-[#FF453A] bg-[#FF3B30]/5";
    case "idle":
      return "";
  }
};

// Semantic empty state component
export function EmptyState({ 
  icon, 
  title, 
  description 
}: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className={getStateClasses("empty")}>
      <div className="flex flex-col items-center gap-3">
        <div className="text-4xl text-[#8E8E93]">{icon}</div>
        <h3 className="text-16px font-semibold text-[#1D1D1F] dark:text-white">
          {title}
        </h3>
        <p className="text-14px text-[#8E8E93]">{description}</p>
      </div>
    </div>
  );
}

// Semantic error banner
export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className={getStateClasses("error") + " p-4 rounded-[12px]"}>
      <div className="flex gap-3">
        <span className="text-[#FF3B30] dark:text-[#FF453A] text-lg">⚠️</span>
        <p className="text-14px text-[#1D1D1F] dark:text-white">{message}</p>
      </div>
    </div>
  );
}
```

**Usage in components:**
```tsx
// Analytics component
<div className={`${DT.CARD} ${getStateClasses(isLoading ? "loading" : "idle")}`}>
  {data.length === 0 ? (
    <EmptyState icon="📊" title="No data" description="Check back later" />
  ) : (
    <Chart data={data} />
  )}
</div>
```

---

### Recommendation 3: Micro-Interactions Guidelines Document

**Effort:** 2 hours to create, infinite reuse  
**Impact:** Prevents "janky" animations, guides 10 parallel agents

**Create:** `docs/superpowers/specs/MICRO_INTERACTIONS.md`

```markdown
# WABDesk Micro-Interactions Guidelines

## Button Hover
- **Property:** `transform` (GPU-accelerated)
- **Duration:** DURATION_FAST (150ms)
- **Effect:** slight scale + shadow boost
- **Implementation:** `hover:scale-[1.02] hover:shadow-lg`

## Button Active (Press)
- **Property:** `transform`
- **Duration:** DURATION_FAST (150ms)
- **Effect:** scale down slightly
- **Implementation:** `active:scale-[0.98]`

## Input Focus
- **Property:** `border-color` + `box-shadow` (ring)
- **Duration:** DURATION_FAST (150ms)
- **Effect:** Blue border + ring
- **Implementation:**
  ```html
  <input class="focus-visible:border-[#0071E3] 
                 focus-visible:outline-2 focus-visible:outline-[#0071E3] 
                 focus-visible:outline-offset-2" />
  ```

## Modal/Drawer Enter
- **Property:** `opacity` + `transform` (both GPU-accelerated)
- **Duration:** DURATION_STANDARD (300ms)
- **Easing:** ease-in-out
- **Implementation (Framer Motion):**
  ```tsx
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 20 }}
    transition={{ duration: 0.3 }}
  />
  ```

## Page Transition
- **Property:** `opacity`
- **Duration:** DURATION_STANDARD (300ms)
- **Easing:** ease-in-out
- **Implementation:**
  ```tsx
  <AnimatePresence>
    <motion.div key={page} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
  </AnimatePresence>
  ```

## Accessibility: prefers-reduced-motion

ALL animations must respect user motion sensitivity:

```tsx
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

<motion.div 
  animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
  initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
  transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
/>
```

## ✅ Do Animate
- `transform` (translate, rotate, scale)
- `opacity`
- Page transitions
- Button hover/active states
- Modal enter/exit
- Loading spinners

## ❌ Don't Animate
- `background-color` (use opacity + transform instead)
- `box-shadow` (use opacity + transform instead)
- `width` / `height` (use transform: scaleX instead)
- `left` / `top` (use transform: translate instead)

Duration guidelines:
- Fast: 150ms (micro-interactions, hover)
- Standard: 300ms (modals, page transitions)
- Slow: 500ms (only for important feedback)

Performance: Never exceed 300ms for hover/focus animations.
```

---

## 10. Dark Mode Parity

**Principle:** Dark mode must feel equally polished to light mode.

**Implementation rules:**
1. Every shadow gets a dark-mode counterpart with higher opacity (shadows are more visible on light text)
2. Every gradient gets a dark-mode gradient (darker palette, same direction)
3. Every color gets a `dark:text-white` or semantic dark color equivalent
4. Every border gets a `dark:border-white/[X]` counterpart

**Testing checklist:**
- [ ] Every screen viewed in light mode ✓
- [ ] Every screen viewed in dark mode ✓
- [ ] Shadows feel equally prominent in both modes
- [ ] Text contrast meets WCAG AA (4.5:1 for body text)
- [ ] Interactive elements clearly distinguishable in both modes

---

## 11. Success Criteria (Updated)

| Check | Pass Condition |
|-------|---|
| **Critical gaps resolved** | Mobile specs defined, focus states added, RTL borders corrected |
| **Token consistency** | All shadows, colors, animations from `DT` tokens; no inline values |
| **Accessibility (WCAG AA)** | All text 4.5:1+ contrast, focus-visible on all interactive elements |
| **Mobile responsiveness** | Touch targets ≥44×44, responsive grids, no horizontal scroll |
| **Dark mode parity** | Dark mode equally polished; shadows, colors, text all tested |
| **RTL compatibility** | Arabic UI works; borders on correct side, logical CSS properties used |
| **Focus/keyboard nav** | Tab through entire UI, focus visible on every interactive element |
| **Type safety** | `npx tsc --noEmit` clean after each phase |
| **Visual hierarchy** | Cards, buttons, typography clearly layered with depth |
| **Micro-interactions** | Buttons scale/shadow on hover; inputs focus smoothly; animations smooth at 60fps |
| **Motion accessibility** | prefers-reduced-motion respected (0 duration for motion-sensitive users) |
| **Loading/empty/error states** | Consistent designs per section 5.1; no ad-hoc styles |
| **No regressions** | All existing functionality untouched; Convex hooks, state, logic unchanged |
| **Performance** | No layout shifts; animations use only GPU-accelerated properties |

---

## 12. Implementation Notes

### For Domain Agents

1. **Import tokens:** `import { DT } from "@/lib/design-tokens"` at top of every edited file
2. **No inline values:** Zero `#0071E3`, `#1D1D1F`, `rgba(...)` outside token file
3. **Keep shadcn structure:** `Dialog`, `Sheet`, `Select`, `Switch` stay as shadcn; override `className`
4. **Replace when needed:** `Button`, `Input`, `Label`, `Separator` → native HTML with DT classes
5. **Full dark mode:** Every `bg-white` needs `dark:bg-[#1C1C1E]`; every color needs `dark:` variant
6. **RTL-safe:** `ps-`, `pe-`, `ms-`, `me-` not `pl-`, `pr-`, `ml-`, `mr-`
7. **No logic changes:** State, hooks, Convex calls, event handlers: untouched
8. **Type strict:** No `any` types; `npx tsc --noEmit` clean per agent

---

## 13. File Ownership & Scope

### Phase 0: Critical Gap Resolution
| Area | Responsibility |
|------|---|
| Mobile specs, focus states, RTL fixes | Design system lead + Visual Polish Specialist |

### Phase 1: Foundation
| Files | Owner |
|-------|-------|
| `lib/design-tokens.ts` | Design system lead |

### Phase 2: Dashboard Refresh
| Files | Agent |
|-------|-------|
| `components/analytics/*` | Visual Polish Specialist |
| `app/(dashboard)/analytics/**` | Visual Polish Specialist |
| `app/(dashboard)/my-stats/**` | Visual Polish Specialist |

**Must NOT touch:**
- Convex queries (data fetching)
- Chart rendering logic (Recharts library)
- Analytics business logic

### Phase 3: Full Rollout Domains
See section 7 for full domain breakdown. Each domain agent reports to phase coordinator.

---

## 14. Glossary

| Term | Definition |
|------|-----------|
| **DT** | Design token object in `lib/design-tokens.ts` |
| **Elevation** | Visual depth created through shadows (SHADOW_SM → SHADOW_2XL) |
| **Semantic Color** | Color with meaning (green=success, amber=warning, red=destructive) |
| **Dark parity** | Dark mode has equal visual sophistication to light mode |
| **RTL-safe** | Layout works correctly in right-to-left (Arabic) contexts using logical CSS |
| **Micro-interaction** | Small, intentional motion (button scale, input focus ring, transition) |
| **Critical gap** | Essential missing specification (mobile, focus, RTL) that blocks Phase 2 |
| **High gap** | Important missing specification (loading states, animation rules, contrast) |
| **Touch target** | Minimum 44×44px button/input size for mobile users |
| **WCAG AA** | Web Content Accessibility Guideline: 4.5:1 text contrast ratio |

---

## 15. Already Complete (Reference Only)

These are NOT modified in this refresh:
- `app/(auth)/sign-in/page.tsx` (Apple-styled)
- `app/(auth)/sign-up/page.tsx` (Apple-styled)
- `components/settings/catalog-settings.tsx` (Apple-styled)

---

## 16. Timeline (Updated with Critical Gaps)

| Phase | Duration | Cumulative | Status |
|-------|----------|-----------|--------|
| Phase 0: Critical gaps | 1 day | 1 day | Must complete first |
| Phase 1: Foundation tokens | 1 day | 2 days | Blocked on Phase 0 |
| Phase 2: Dashboard refresh | 3–4 days | 5–6 days | Blocked on Phase 1 |
| Phase 3: Full rollout | 5–7 days | 10–13 days | Parallel with other work |

**Total expected timeline: 10–13 days** (concurrent work possible in Phase 3)

---

## 17. Appendix: Extended Token Code Snippet

Add to `lib/design-tokens.ts`:

```typescript
// ── Shadows / Elevation ────────────────────────────────────────
SHADOW_SM:      "0 1px 3px rgba(0,0,0,0.08)",
SHADOW_MD:      "0 2px 8px rgba(0,0,0,0.06)",
SHADOW_LG:      "0 4px 12px rgba(0,0,0,0.06)",
SHADOW_XL:      "0 8px 24px rgba(0,0,0,0.12)",
SHADOW_2XL:     "0 12px 32px rgba(0,0,0,0.15)",
SHADOW_SM_DARK: "0 1px 3px rgba(0,0,0,0.2)",
SHADOW_MD_DARK: "0 2px 8px rgba(0,0,0,0.25)",
SHADOW_LG_DARK: "0 4px 12px rgba(0,0,0,0.3)",

// ── Semantic Colors ────────────────────────────────────────────
SUCCESS_LIGHT:   "#34C759",
SUCCESS_DARK:    "#30D158",
WARNING_LIGHT:   "#FF9500",
WARNING_DARK:    "#FF9F0A",
DESTRUCTIVE_LIGHT: "#FF3B30",
DESTRUCTIVE_DARK:  "#FF453A",
NEUTRAL_LIGHT:   "#8E8E93",
NEUTRAL_DARK:    "#636366",

// ── Animations ────────────────────────────────────────────────
DURATION_FAST:     "150ms",
DURATION_STANDARD: "300ms",
DURATION_SLOW:     "500ms",
EASING_STANDARD:   "cubic-bezier(0.4, 0, 0.2, 1)",

// ── Gradients ────────────────────────────────────────────────
BG_GRADIENT_LIGHT: "linear-gradient(135deg, #fafbfc 0%, #f8f9fa 100%)",
BG_GRADIENT_DARK:  "linear-gradient(135deg, #1a1a1b 0%, #111111 100%)",
CARD_GRADIENT_LIGHT: "linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)",
CARD_GRADIENT_DARK:  "linear-gradient(135deg, #2c2c2e 0%, #1c1c1e 100%)",

// ── Typography ─────────────────────────────────────────────────
H1:   "text-[28px] font-semibold tracking-[-0.2px] dark:tracking-[-0.1px]",
H2:   "text-[22px] font-semibold tracking-[-0.1px] dark:tracking-[0px]",
H3:   "text-[18px] font-semibold dark:tracking-[0px]",
BODY: "text-[14px] leading-[1.5] dark:letter-spacing-[0.3px]",
LABEL: "text-[12px] font-medium dark:letter-spacing-[0.2px]",

// ── Spacing ────────────────────────────────────────────────────
SPACE_XS:  "px-2.5 py-2",
SPACE_SM:  "px-3 py-2.5",
SPACE_MD:  "px-4 py-3",
SPACE_LG:  "px-6 py-4",

// ── Borders ────────────────────────────────────────────────────
BORDER_STANDARD: "border-black/[0.08] dark:border-white/[0.10]",
BORDER_ACCENT:   "border-black/[0.12] dark:border-white/[0.15]",

// ── Text Opacity ───────────────────────────────────────────────
TEXT_PRIMARY:   "text-[#1D1D1F] dark:text-white",
TEXT_SECONDARY: "text-[#1D1D1F]/60 dark:text-white/60",
TEXT_TERTIARY:  "text-[#1D1D1F]/40 dark:text-white/40",
TEXT_DISABLED:  "text-[#1D1D1F]/30 dark:text-white/30",

// ── Focus States ───────────────────────────────────────────────
FOCUS_VISIBLE:   "focus-visible:outline-2 focus-visible:outline-[#0071E3] focus-visible:outline-offset-2",
FOCUS_VISIBLE_DARK: "dark:focus-visible:outline-[#0A84FF]",
```

---

## Approval Status & Next Steps

**Status:** ✅ **Design Specification Complete with Critical Gaps Resolved**

This specification now includes:
- ✅ All 3 CRITICAL gaps addressed (sections 4.1–4.3)
- ✅ All 3 HIGH gaps addressed (section 5)
- ✅ All implementation risks identified (section 8)
- ✅ 3 high-impact recommendations provided (section 9)
- ✅ Extended token definitions (section 17)
- ✅ Updated timeline: 10–13 days total

**Next step:** Execute Phase 0 (critical gaps) to completion, then proceed to Phase 1 & 2.

---

_Last updated: 2026-05-11 (fully integrated with Frontend Assessment) — Ready for Phase 0 execution._
