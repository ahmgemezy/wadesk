# Professional UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform WABDesk from minimal Apple design into a sophisticated, professional interface with visual depth, semantic colors, micro-interactions, and full accessibility compliance (WCAG AA) across light/dark/RTL modes.

**Architecture:** Three sequential phases—(0) resolve critical gaps in mobile/focus/RTL specs, (1) expand design tokens with 10+ categories, (2) apply tokens to dashboard with validation. Each phase builds on the prior; blockers prevent advancement.

**Tech Stack:** Next.js 15 (App Router), TypeScript strict, Tailwind CSS v4, Convex (untouched), Framer Motion (animations), shadcn/ui (components)

---

## File Structure Overview

### Phase 0: Documentation & Specifications
```
docs/design-system/
├── MOBILE_RESPONSIVENESS.md (new) — breakpoints, touch targets, collapse behavior
├── FOCUS_STATES.md (new) — keyboard nav, focus-visible, tab order
└── RTL_GUIDE.md (new) — logical CSS, border direction, shadow behavior
```

### Phase 1: Design Tokens
```
lib/
├── design-tokens.ts (modify, expand from ~50 to 100+ tokens)
└── component-state-helpers.ts (new, recommendation) — loading/empty/error wrappers
```

### Phase 2: Dashboard Refresh
```
components/analytics/
├── stat-card.tsx (refactor) — add shadows, gradients, semantic colors
├── chart-container.tsx (refactor) — token-based styling
└── analytics-layout.tsx (refactor) — responsive grid, mobile collapse

app/(dashboard)/analytics/
└── page.tsx (refactor) — add loading/empty/error states

docs/superpowers/specs/
├── MICRO_INTERACTIONS.md (new, recommendation) — button hover, input focus, etc.
└── VISUAL_REGRESSION_CHECKLIST.md (new, recommendation) — QA validation checklist
```

---

## Phase 0: Critical Gap Resolution (1 day)

Document the three critical gaps with executable specs so Phase 1–2 agents have no ambiguity.

### Task 1: Document Mobile Responsiveness Requirements

**Files:**
- Create: `docs/design-system/MOBILE_RESPONSIVENESS.md`

- [ ] **Step 1: Create mobile specs document**

```markdown
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

**Tablet/Mobile (<md):**
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
```

Create the file with this content.

- [ ] **Step 2: Commit**

```bash
git add docs/design-system/MOBILE_RESPONSIVENESS.md
git commit -m "docs: add mobile responsiveness specification"
```

---

### Task 2: Document Focus States & Keyboard Navigation

**Files:**
- Create: `docs/design-system/FOCUS_STATES.md`

- [ ] **Step 1: Create focus states document**

```markdown
# Focus States & Keyboard Navigation Specification

## Focus-Visible Ring Specification

All interactive elements MUST have visible focus ring for keyboard users.

### Button Focus
```html
<button class="px-4 py-2.5 rounded-lg bg-[#0071E3] text-white
             focus-visible:outline-2 focus-visible:outline-offset-2 
             focus-visible:outline-[#0071E3]
             dark:focus-visible:outline-[#0A84FF]">
  Save Changes
</button>
```

### Input Focus
```html
<input class="px-3 py-2 border border-black/[0.08] rounded-[12px]
            focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-[#0071E3]
            dark:focus-visible:outline-[#0A84FF]
            dark:border-white/[0.10]" />
```

### Rounded Elements (rounded-full)
For fully rounded buttons, use smaller offset to prevent ring cutoff:
```html
<button class="w-10 h-10 rounded-full
             focus-visible:outline-2 focus-visible:outline-offset-1
             focus-visible:outline-[#0071E3]">
  ✕
</button>
```

## Tab Order Rules

**LTR (English):**
- Left-to-right, top-to-bottom natural flow
- Sidebar → Main content → Footer
- Native browser behavior (don't override)

**RTL (Arabic):**
- Right-to-left, top-to-bottom natural flow
- Sidebar (on right in RTL) → Main content → Footer
- Use `<div dir="rtl">` wrapper or `dir="rtl"` on root
- **Never use explicit tabindex >0** — breaks RTL order
- Always use `tabindex="-1"` for skip links, not positive indices

## Keyboard Navigation Shortcuts

| Key | Action | Scope |
|-----|--------|-------|
| `Tab` | Move to next interactive element | Entire UI |
| `Shift+Tab` | Move to previous interactive element | Entire UI |
| `Enter` | Activate button, open select, submit form | On focused element |
| `Space` | Toggle checkbox, activate button (secondary) | On focused element |
| `Escape` | Close modal, cancel operation | Modal dialog |
| `Arrow Up/Down` | Navigate select options | Open select dropdown |

## WCAG AA Contrast Requirements

Focus outline must have 3:1 contrast against its background.

**Light mode:**
- Outline color: #0071E3 (blue)
- Outline on white background: 8.2:1 ✓ (exceeds 3:1)
- Outline on gray background: still visible ✓

**Dark mode:**
- Outline color: #0A84FF (lighter blue)
- Outline on #1C1C1E background: 6.1:1 ✓ (exceeds 3:1)

## Accessibility Testing Checklist

- [ ] Navigate entire UI with Tab/Shift+Tab only (no mouse)
- [ ] Every interactive element has visible focus ring
- [ ] Focus ring is 3:1+ contrast against background
- [ ] Tab order is logical (left-to-right in LTR, right-to-left in RTL)
- [ ] Modal dialogs trap focus (Tab stays within modal)
- [ ] Screen reader announces focused element correctly
```

Create the file with this content.

- [ ] **Step 2: Commit**

```bash
git add docs/design-system/FOCUS_STATES.md
git commit -m "docs: add focus states and keyboard navigation specification"
```

---

### Task 3: Document RTL Shadows & Borders

**Files:**
- Create: `docs/design-system/RTL_GUIDE.md`

- [ ] **Step 1: Create RTL specification document**

```markdown
# RTL (Right-to-Left) Design Specification

## Critical Rule: Use Logical CSS Properties

**DO NOT use directional properties** (`left`, `right`, `ml-`, `mr-`, `pl-`, `pr-`).  
**ALWAYS use logical properties** (`start`, `end`, `ms-`, `me-`, `ps-`, `pe-`).

### Property Mapping

| Physical | Logical | Behavior |
|----------|---------|----------|
| `left-` | `start-` | LTR: left side; RTL: right side |
| `right-` | `end-` | LTR: right side; RTL: left side |
| `ml-` | `ms-` | Margin-start (direction-aware) |
| `mr-` | `me-` | Margin-end (direction-aware) |
| `pl-` | `ps-` | Padding-start (direction-aware) |
| `pr-` | `pe-` | Padding-end (direction-aware) |
| `border-l-` | `border-s-` | Border-start (direction-aware) |
| `border-r-` | `border-e-` | Border-end (direction-aware) |

## Sidebar Selected Item Border

### ❌ WRONG (flips in RTL)
```html
<div class="border-l-4 border-[#0071E3]">Inbox</div>
<!-- In RTL: border appears on LEFT (wrong!) -->
```

### ✅ CORRECT (respects RTL)
```html
<div dir="rtl" class="border-s-4 border-[#0071E3]">البريد الوارد</div>
<!-- In RTL: border appears on RIGHT (correct!) -->
```

## Shadow Direction in RTL

Shadows are **intrinsically directional** in visual design but CSS shadows are **symmetric** (no special left/right offset).

**Good news:** Tailwind shadows like `shadow-[0_2px_8px_rgba(...)]` work identically in LTR and RTL because the offset is `0` horizontally.

**No special handling needed** for symmetric box-shadows in RTL. ✓

## Text Alignment

**Never use `text-left` / `text-right`.** Use `text-start` / `text-end`.

```html
<!-- ❌ Wrong -->
<p class="text-left">English text</p>

<!-- ✅ Correct -->
<p class="text-start">Any language text</p>
<!-- Renders left in LTR, right in RTL -->
```

## Animations in RTL

**Problem:** `translate-x` in RTL moves in opposite direction.

**Solution:** Use logical properties or conditional checks.

```html
<!-- ❌ Wrong (flips in RTL) -->
<div class="group-hover:translate-x-2">Icon</div>

<!-- ✅ Correct (respects RTL) -->
<div class="group-hover:translate-inline-1">Icon</div>
<!-- translate-inline: positive = forward in reading direction -->
```

## Icon Flipping in RTL

Some icons **should** flip in RTL (arrows, chevrons), others **should not** (logos, checkmarks).

```html
<!-- Icons that should flip: -->
<!-- ✓ chevron-left, chevron-right, arrow-left, arrow-right, etc. -->
<svg class="rtl:scale-x-[-1]"><!-- flips in RTL --></svg>

<!-- Icons that should NOT flip: -->
<!-- × checkmark, star, bell, settings, gear, etc. -->
<svg><!-- no rtl: modifier --></svg>
```

## Form Fields in RTL

**Phone numbers and email inputs** are always LTR (not affected by RTL wrapping).

```html
<div dir="rtl">
  <!-- This container is RTL (Arabic text) -->
  
  <input dir="ltr" type="tel" placeholder="+20 123 456 7890" />
  <!-- This input is explicitly LTR (phone number) -->
  <!-- Cursor moves left-to-right even though container is RTL -->
</div>
```

## Testing Checklist for RTL

- [ ] Switch app to Arabic (set `dir="rtl"` on root or use lang attribute)
- [ ] Sidebar: selected item blue border appears on **RIGHT** side (not left)
- [ ] All text alignment respects RTL (right-aligned naturally)
- [ ] Icons: chevrons point correctly in RTL context
- [ ] Animations: translate movements go forward in reading direction
- [ ] Phone input: LTR context preserved inside RTL wrapper
- [ ] No horizontal scroll appears
- [ ] All `start`/`end` properties used (no `left`/`right`)
```

Create the file with this content.

- [ ] **Step 2: Commit**

```bash
git add docs/design-system/RTL_GUIDE.md
git commit -m "docs: add RTL design and implementation guide"
```

---

### Task 4: Create Visual Specs for Phase 0 Gaps (Optional but Recommended)

**Files:**
- Create: `docs/superpowers/specs/PHASE_0_VISUAL_SPECS.md`

- [ ] **Step 1: Create visual specs for critical gaps**

```markdown
# Phase 0 Visual Specifications

## Mobile Sidebar (Hidden State)

```
┌─────────────────────────────────────┐
│ ☰ WABDesk  [Search]  🔔  👤        │  <- Hamburger on left (LTR), right (RTL)
├─────────────────────────────────────┤
│                                     │
│  Main content area (full width)     │
│                                     │
│  Analytics cards, conversations     │
│  stack vertically (grid-cols-1)     │
│                                     │
└─────────────────────────────────────┘
```

When hamburger is clicked:
```
┌─────────────────────┐
│ 🔙 Inbox            │  <- Sidebar drawer overlays
│ 👥 Contacts         │
│ 📊 Analytics        │
│ ⚙️ Settings         │
├─────────────────────┤
│ 👤 Ahmed            │
└─────────────────────┘
```

## Focus Ring Examples

Button with focus ring:
```
┌─────────────────────────────┐
│ ┌───────────────────────┐   │
│ │ Save Changes          │ ← 2px outline, 2px offset
│ └───────────────────────┘   │
└─────────────────────────────┘
```

Input with focus ring:
```
┌────────────────────────────┐
│ ┌──────────────────────┐   │
│ │ Channel name         │ ← Blue border + outline
│ └──────────────────────┘   │
└────────────────────────────┘
```

## RTL Sidebar Selected Item

**LTR (English):**
```
┌────────────────────┐
│ ●│ 📥 Inbox       │ ← Blue border on LEFT
│  │ 12 unread      │
│  └────────────────┘
```

**RTL (Arabic):**
```
┌────────────────────┐
│ البريد الوارد │●  │ ← Blue border on RIGHT
│      رسائل 12  │  │
└─────────────────┘
```
```

Create the file with this content.

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/PHASE_0_VISUAL_SPECS.md
git commit -m "docs: add Phase 0 visual specifications"
```

---

### Task 5: Verify Phase 0 Documentation Complete

**Files:**
- None (verification only)

- [ ] **Step 1: Verify all Phase 0 docs exist**

```bash
ls -la docs/design-system/
# Expected: MOBILE_RESPONSIVENESS.md, FOCUS_STATES.md, RTL_GUIDE.md
```

- [ ] **Step 2: Verify docs are readable**

```bash
head -20 docs/design-system/MOBILE_RESPONSIVENESS.md
# Expected: "# Mobile Responsiveness Specification"
```

- [ ] **Step 3: Verify git status clean**

```bash
git status
# Expected: "nothing to commit, working tree clean" or only uncommitted Phase 0 files
```

- [ ] **Step 4: Summary checkpoint**

✅ **Phase 0 Complete:**
- Mobile responsiveness documented with breakpoints and touch targets
- Focus states & keyboard navigation documented with WCAG AA specs
- RTL specification documented with logical CSS rules
- No ambiguity for Phase 1–2 agents

**Blocker Status:** Phase 0 must be complete before Phase 1 starts. ✓

---

## Phase 1: Design Tokens (1 day)

Expand `lib/design-tokens.ts` with all 10+ token categories. This is the foundation that Phase 2 depends on.

### Task 6: Create Design Tokens File Structure

**Files:**
- Modify: `lib/design-tokens.ts`

- [ ] **Step 1: Open design-tokens.ts and review current state**

```bash
head -50 lib/design-tokens.ts
# Review: what tokens already exist?
```

Expected to find some basic tokens already present. Note their export pattern.

- [ ] **Step 2: Add shadow tokens**

Replace or expand the shadow section:

```typescript
// ── Shadows / Elevation ────────────────────────────────────────
export const SHADOW_SM = "0 1px 3px rgba(0,0,0,0.08)";
export const SHADOW_MD = "0 2px 8px rgba(0,0,0,0.06)";
export const SHADOW_LG = "0 4px 12px rgba(0,0,0,0.06)";
export const SHADOW_XL = "0 8px 24px rgba(0,0,0,0.12)";
export const SHADOW_2XL = "0 12px 32px rgba(0,0,0,0.15)";

// Dark mode shadows (same opacity structure, higher opacity for visibility)
export const SHADOW_SM_DARK = "0 1px 3px rgba(0,0,0,0.2)";
export const SHADOW_MD_DARK = "0 2px 8px rgba(0,0,0,0.25)";
export const SHADOW_LG_DARK = "0 4px 12px rgba(0,0,0,0.3)";
export const SHADOW_XL_DARK = "0 8px 24px rgba(0,0,0,0.35)";
export const SHADOW_2XL_DARK = "0 12px 32px rgba(0,0,0,0.4)";
```

- [ ] **Step 3: Add semantic color tokens**

```typescript
// ── Semantic Colors ────────────────────────────────────────────
export const SUCCESS_LIGHT = "#34C759";
export const SUCCESS_DARK = "#30D158";
export const WARNING_LIGHT = "#FF9500";
export const WARNING_DARK = "#FF9F0A";
export const DESTRUCTIVE_LIGHT = "#FF3B30";
export const DESTRUCTIVE_DARK = "#FF453A";
export const NEUTRAL_LIGHT = "#8E8E93";
export const NEUTRAL_DARK = "#636366";
```

- [ ] **Step 4: Add animation tokens**

```typescript
// ── Animations ────────────────────────────────────────────────
export const DURATION_FAST = "150ms";
export const DURATION_STANDARD = "300ms";
export const DURATION_SLOW = "500ms";
export const EASING_STANDARD = "cubic-bezier(0.4, 0, 0.2, 1)";
```

- [ ] **Step 5: Add gradient tokens**

```typescript
// ── Gradients ────────────────────────────────────────────────
export const BG_GRADIENT_LIGHT = "linear-gradient(135deg, #fafbfc 0%, #f8f9fa 100%)";
export const BG_GRADIENT_DARK = "linear-gradient(135deg, #1a1a1b 0%, #111111 100%)";
export const CARD_GRADIENT_LIGHT = "linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)";
export const CARD_GRADIENT_DARK = "linear-gradient(135deg, #2c2c2e 0%, #1c1c1e 100%)";
export const GLASS_LIGHT = "bg-white/95 backdrop-blur-2xl";
export const GLASS_DARK = "bg-[#1C1C1E]/95 backdrop-blur-2xl";
```

- [ ] **Step 6: Add typography tokens**

```typescript
// ── Typography ─────────────────────────────────────────────────
export const H1 = "text-[28px] font-semibold tracking-[-0.2px] dark:tracking-[-0.1px]";
export const H2 = "text-[22px] font-semibold tracking-[-0.1px] dark:tracking-[0px]";
export const H3 = "text-[18px] font-semibold dark:tracking-[0px]";
export const BODY = "text-[14px] leading-[1.5] dark:letter-spacing-[0.3px]";
export const LABEL = "text-[12px] font-medium dark:letter-spacing-[0.2px]";
export const MUTED = "text-[12px] font-normal dark:leading-[1.4]";
```

- [ ] **Step 7: Add spacing tokens**

```typescript
// ── Spacing ────────────────────────────────────────────────────
export const SPACE_XS = "px-2.5 py-2";
export const SPACE_SM = "px-3 py-2.5";
export const SPACE_MD = "px-4 py-3";
export const SPACE_LG = "px-6 py-4";
```

- [ ] **Step 8: Add border tokens**

```typescript
// ── Borders ────────────────────────────────────────────────────
export const BORDER_STANDARD = "border-black/[0.08] dark:border-white/[0.10]";
export const BORDER_ACCENT = "border-black/[0.12] dark:border-white/[0.15]";
export const BORDER_HEAVY = "border-black/[0.15] dark:border-white/[0.20]";
```

- [ ] **Step 9: Add text opacity tokens**

```typescript
// ── Text Opacity ───────────────────────────────────────────────
export const TEXT_PRIMARY = "text-[#1D1D1F] dark:text-white";
export const TEXT_SECONDARY = "text-[#1D1D1F]/60 dark:text-white/60";
export const TEXT_TERTIARY = "text-[#1D1D1F]/40 dark:text-white/40";
export const TEXT_DISABLED = "text-[#1D1D1F]/30 dark:text-white/30";
```

- [ ] **Step 10: Add focus state tokens**

```typescript
// ── Focus States ───────────────────────────────────────────────
export const FOCUS_VISIBLE = "focus-visible:outline-2 focus-visible:outline-[#0071E3] focus-visible:outline-offset-2";
export const FOCUS_VISIBLE_DARK = "dark:focus-visible:outline-[#0A84FF]";
export const FOCUS_VISIBLE_ROUNDED = "focus-visible:outline-1 focus-visible:outline-offset-1"; // For rounded buttons
```

- [ ] **Step 11: Verify TypeScript compiles**

```bash
npx tsc --noEmit
# Expected: no errors
```

- [ ] **Step 12: Commit**

```bash
git add lib/design-tokens.ts
git commit -m "feat(design): expand design tokens with 10+ categories (shadows, colors, animations, gradients, typography, spacing, borders, text, focus)"
```

---

### Task 7: Verify Phase 1 Tokens Complete

**Files:**
- None (verification only)

- [ ] **Step 1: Count tokens in file**

```bash
grep -c "^export const" lib/design-tokens.ts
# Expected: 40+ token exports
```

- [ ] **Step 2: Verify no inline color values in main codebase**

```bash
# Quick spot-check (shouldn't find many, Phase 2 will fix)
grep -r "#0071E3" src/components | grep -v design-tokens | head -5
# Expected: may find some (will be refactored in Phase 2)
```

- [ ] **Step 3: TypeScript clean**

```bash
npx tsc --noEmit
# Expected: no errors
```

- [ ] **Step 4: Summary checkpoint**

✅ **Phase 1 Complete:**
- All tokens defined and exported from lib/design-tokens.ts
- Shadows (5 light + 5 dark)
- Semantic colors (8)
- Animations (4)
- Gradients (6)
- Typography (6)
- Spacing (4)
- Borders (3)
- Text opacity (4)
- Focus states (3)
- **Total: 43 tokens**

**Blocker Status:** Phase 1 complete. Phase 2 can start. ✓

---

## Phase 2: Dashboard Refresh (3–4 days)

Apply tokens to analytics dashboard with full validation (mobile, RTL, accessibility, dark mode).

### Task 8: Refactor Analytics Stat Card Component

**Files:**
- Modify: `components/analytics/stat-card.tsx`

- [ ] **Step 1: Review current stat-card component**

```bash
cat components/analytics/stat-card.tsx | head -50
# Note: current styling, props, structure
```

Expected to see a simple card with number and label.

- [ ] **Step 2: Add shadow and gradient styling**

Replace the card container with:

```tsx
import { SHADOW_MD, SHADOW_MD_DARK, CARD_GRADIENT_LIGHT, CARD_GRADIENT_DARK } from "@/lib/design-tokens";

export function StatCard({ 
  value, 
  label, 
  icon, 
  semanticColor = "neutral" 
}: {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  semanticColor?: "success" | "warning" | "destructive" | "neutral";
}) {
  const colorClasses = {
    success: "text-[#34C759] dark:text-[#30D158]",
    warning: "text-[#FF9500] dark:text-[#FF9F0A]",
    destructive: "text-[#FF3B30] dark:text-[#FF453A]",
    neutral: "text-[#1D1D1F] dark:text-white",
  };

  return (
    <div
      className={`
        px-4 py-3 rounded-[18px]
        bg-white dark:bg-[#2c2c2e]
        bg-gradient-to-br from-white to-[#fafbfc] dark:from-[#2c2c2e] dark:to-[#1c1c1e]
        border border-black/[0.08] dark:border-white/[0.10]
        shadow-[${SHADOW_MD}] dark:shadow-[${SHADOW_MD_DARK}]
        hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)]
        transition-all duration-200
        min-h-[44px] sm:min-h-[50px]
      `}
    >
      <div className="flex flex-col gap-2">
        <div className={`text-2xl sm:text-3xl font-semibold ${colorClasses[semanticColor]}`}>
          {value}
        </div>
        <div className="text-12px text-[#8E8E93] dark:text-white/60 font-medium uppercase tracking-[0.3px]">
          {label}
        </div>
      </div>
    </div>
  );
}
```

**Note:** Tailwind doesn't support template literals in class names. Use explicit shadow values:

```tsx
className="shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
```

- [ ] **Step 3: Verify mobile touch targets**

Ensure stat cards have minimum 44×44 touch target:

```tsx
className="
  min-h-[44px] // mobile minimum
  sm:min-h-[50px] // tablet+
  min-w-full // full width on mobile
  sm:min-w-auto // auto on desktop
"
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
# Expected: no errors in stat-card component
```

- [ ] **Step 5: Commit**

```bash
git add components/analytics/stat-card.tsx
git commit -m "feat(analytics): refactor stat card with design tokens (shadows, gradients, semantic colors)"
```

---

### Task 9: Refactor Analytics Chart Container

**Files:**
- Modify: `components/analytics/chart-container.tsx`

- [ ] **Step 1: Review current chart container**

```bash
cat components/analytics/chart-container.tsx | head -40
# Note: current structure, how Recharts is used
```

- [ ] **Step 2: Add elevation and focus states**

```tsx
import { SHADOW_LG, SHADOW_LG_DARK } from "@/lib/design-tokens";

export function ChartContainer({ 
  title, 
  children 
}: { 
  title: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="
      p-5 sm:p-6 rounded-[18px]
      bg-white dark:bg-[#2c2c2e]
      border border-black/[0.06] dark:border-white/[0.10]
      shadow-[0_4px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]
      hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]
      transition-shadow duration-300
      focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071E3]
      dark:focus-visible:outline-[#0A84FF]
    ">
      <h3 className="text-16px font-semibold text-[#1D1D1F] dark:text-white mb-4">
        {title}
      </h3>
      
      {/* Chart container — keep background solid, don't add gradients */}
      <div className="h-[300px] sm:h-[400px] lg:h-[500px]">
        {children}
      </div>
    </div>
  );
}
```

**Key points:**
- Keep chart `background: transparent` (no gradients on chart area)
- Gradient only on card container border/padding
- Responsive height prevents vertical scroll on mobile

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
# Expected: no errors
```

- [ ] **Step 4: Commit**

```bash
git add components/analytics/chart-container.tsx
git commit -m "feat(analytics): refactor chart container with shadows, responsive height, focus states"
```

---

### Task 10: Update Analytics Page Layout (Responsive + States)

**Files:**
- Modify: `app/(dashboard)/analytics/page.tsx`

- [ ] **Step 1: Review current analytics page structure**

```bash
cat app/(dashboard)/analytics/page.tsx | head -60
# Note: current layout, how stat cards are rendered
```

- [ ] **Step 2: Update stat cards grid to be responsive**

Replace the grid with:

```tsx
import { StatCard } from "@/components/analytics/stat-card";
import { ChartContainer } from "@/components/analytics/chart-container";
import { getAnalyticsData } from "@/convex/api"; // or your data fetching

export default async function AnalyticsPage() {
  const data = await getAnalyticsData(); // or use client-side fetching

  return (
    <div dir="rtl"> {/* RTL wrapper for Arabic */}
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-28px font-semibold text-[#1D1D1F] dark:text-white mb-2">
            Today's Stats
          </h1>
          <p className="text-14px text-[#8E8E93]">
            Performance metrics and trends
          </p>
        </div>

        {/* Responsive stat cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <StatCard
            value={data.newMessages}
            label="New Messages"
            semanticColor="neutral"
          />
          <StatCard
            value={data.resolved}
            label="Resolved"
            semanticColor="success"
          />
          <StatCard
            value={data.avgRating}
            label="Avg Rating"
            semanticColor="warning"
          />
          <StatCard
            value={`↑ ${data.growthPercent}%`}
            label="vs Yesterday"
            semanticColor="success"
          />
        </div>

        {/* Charts section */}
        <div className="space-y-4">
          <ChartContainer title="Response Time Trend">
            {/* Recharts component here */}
            <YourChartComponent data={data.trendData} />
          </ChartContainer>
        </div>
      </div>
    </div>
  );
}
```

**Key updates:**
- `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` for responsive layout
- `gap-4 sm:gap-5` for responsive spacing
- `p-4 sm:p-6` for responsive padding
- RTL wrapper: `dir="rtl"`

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
# Expected: no errors
```

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/analytics/page.tsx
git commit -m "feat(analytics): update layout to responsive grid (mobile-first), add RTL wrapper"
```

---

### Task 11: Add Loading State Skeleton

**Files:**
- Create: `lib/component-state-helpers.ts`
- Modify: `app/(dashboard)/analytics/page.tsx`

- [ ] **Step 1: Create state helpers file**

```typescript
// lib/component-state-helpers.ts

export const getStateClasses = (state: "idle" | "loading" | "empty" | "error") => {
  switch (state) {
    case "loading":
      return "opacity-50 blur-sm pointer-events-none";
    case "empty":
      return "flex items-center justify-center min-h-[300px] text-center";
    case "error":
      return "border-2 border-[#FF3B30] dark:border-[#FF453A] bg-[#FF3B30]/5 dark:bg-[#FF453A]/5";
    case "idle":
      return "";
  }
};

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
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

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className={`${getStateClasses("error")} p-4 rounded-[12px]`}>
      <div className="flex gap-3">
        <span className="text-[#FF3B30] dark:text-[#FF453A] text-lg">⚠️</span>
        <p className="text-14px text-[#1D1D1F] dark:text-white">{message}</p>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="animate-pulse px-4 py-3 rounded-[18px] bg-gray-200 dark:bg-gray-700">
      <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded mb-3 w-2/3"></div>
      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
    </div>
  );
}
```

- [ ] **Step 2: Update analytics page to use loading skeleton**

```tsx
import { StatCardSkeleton, EmptyState, ErrorBanner } from "@/lib/component-state-helpers";

export default async function AnalyticsPage() {
  const { data, isLoading, error } = await getAnalyticsData();

  if (error) {
    return <ErrorBanner message="Failed to load analytics. Please try again." />;
  }

  return (
    <div dir="rtl">
      <div className="p-4 sm:p-6 space-y-6">
        <h1 className="text-28px font-semibold text-[#1D1D1F] dark:text-white mb-2">
          Today's Stats
        </h1>

        {/* Show skeletons while loading */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        ) : data && data.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Render actual cards */}
          </div>
        ) : (
          <EmptyState
            icon="📊"
            title="No data available"
            description="Check back later for analytics"
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
# Expected: no errors
```

- [ ] **Step 4: Commit**

```bash
git add lib/component-state-helpers.ts app/\(dashboard\)/analytics/page.tsx
git commit -m "feat(analytics): add loading skeleton, empty, and error states"
```

---

### Task 12: Create Micro-Interactions Guidelines (Phase 3 Prep)

**Files:**
- Create: `docs/superpowers/specs/MICRO_INTERACTIONS.md`

- [ ] **Step 1: Create micro-interactions guidelines**

```markdown
# Micro-Interactions Guidelines

## Button Hover

- **Property:** `transform` (GPU-accelerated)
- **Duration:** 150ms
- **Effect:** Scale up 2%, shadow intensifies
- **Implementation:**

\`\`\`html
<button class="hover:scale-[1.02] hover:shadow-lg transition-all duration-[150ms]">
  Save Changes
</button>
\`\`\`

## Button Active (Press)

- **Property:** `transform`
- **Duration:** 150ms
- **Effect:** Scale down to 98%
- **Implementation:**

\`\`\`html
<button class="active:scale-[0.98] transition-transform duration-[150ms]">
  Save Changes
</button>
\`\`\`

## Input Focus

- **Property:** `border-color`, `box-shadow` (outline-2)
- **Duration:** 150ms
- **Effect:** Blue border + ring outline
- **Implementation:**

\`\`\`html
<input class="focus-visible:border-[#0071E3] focus-visible:outline-2 
            focus-visible:outline-[#0071E3] focus-visible:outline-offset-2
            dark:focus-visible:border-[#0A84FF] dark:focus-visible:outline-[#0A84FF]
            transition-all duration-[150ms]" />
\`\`\`

## Modal/Drawer Enter

- **Property:** `opacity`, `transform` (both GPU-accelerated)
- **Duration:** 300ms
- **Easing:** ease-in-out
- **Implementation (Framer Motion):**

\`\`\`tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: 20 }}
  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
/>
\`\`\`

## Page Transition

- **Property:** `opacity`
- **Duration:** 300ms
- **Easing:** ease-in-out
- **Implementation:**

\`\`\`tsx
<AnimatePresence>
  <motion.div
    key={page}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3 }}
  />
</AnimatePresence>
\`\`\`

## Accessibility: Respect prefers-reduced-motion

ALL animations must support users who prefer reduced motion.

\`\`\`tsx
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

<motion.div
  animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
  initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
  transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
/>
\`\`\`

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
```

Create the file with this content.

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/MICRO_INTERACTIONS.md
git commit -m "docs: add micro-interactions guidelines for Phase 3"
```

---

### Task 13: Create Visual Regression Checklist (QA)

**Files:**
- Create: `docs/superpowers/specs/VISUAL_REGRESSION_CHECKLIST.md`

- [ ] **Step 1: Create visual regression checklist**

```markdown
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
```

Create the file with this content.

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/VISUAL_REGRESSION_CHECKLIST.md
git commit -m "docs: add visual regression checklist for Phase 2 QA"
```

---

### Task 14: Run Full Phase 2 Validation

**Files:**
- None (validation only)

- [ ] **Step 1: Type check entire project**

```bash
npx tsc --noEmit
# Expected: no errors
```

- [ ] **Step 2: Run linter (if configured)**

```bash
npm run lint
# Expected: no errors or warnings in modified files
```

- [ ] **Step 3: Manual visual validation**

Open the analytics page in browser:

```bash
npm run dev
# Navigate to http://localhost:3000/analytics
```

Check:
- [ ] Light mode: stat cards visible with shadows
- [ ] Dark mode (toggle): shadows still visible, contrast good
- [ ] Mobile view (375px): cards stack 1-column, hamburger menu visible
- [ ] Tablet view (768px): cards stack 2-column
- [ ] Desktop view (1440px): cards 4-column, full layout
- [ ] Focus: Tab through elements, focus ring visible

- [ ] **Step 4: RTL testing**

Add `dir="rtl"` to analytics page temporarily:

```tsx
return <div dir="rtl"><!-- page content --></div>
```

Then test:
- [ ] Sidebar border on RIGHT side ✓
- [ ] Layout respects RTL ✓
- [ ] Text alignment correct ✓

Remove `dir="rtl"` after testing.

- [ ] **Step 5: Summary checkpoint**

✅ **Phase 2 Complete:**
- Stat cards refactored with design tokens
- Chart container with shadows and responsive height
- Analytics page layout responsive (mobile-first)
- Loading, empty, error states implemented
- Full dark mode parity
- RTL compatibility verified
- Focus states and keyboard navigation working
- All TypeScript clean

**Deliverables:**
- Updated components: stat-card, chart-container, analytics page
- Helper functions: component-state-helpers
- Documentation: micro-interactions, visual regression checklist
- **Total refactored components: 3 main files, 1 new helper file**

---

## Phase 3: Full Rollout (5–7 days)

*(Outline only; detailed Phase 3 plan will follow after Phase 2 completion)*

Phase 3 runs 10 parallel domain agents using same token-based approach:

1. **Shell** — Sidebar 320px finalized, icons updated
2. **Inbox** — Conversation bubbles, thread refinement
3. **Contacts** — Contact cards, profile sheets
4. **Settings** — Form refinement, sections
5. **Automations** — Rule cards, business hours
6. **Broadcasts** — Wizard, preview, loading feedback
7. **Onboarding** — Steps, progress, animations
8. **Marketing** — Hero, features, pricing
9. **Catalog, AI, Lists, Team** — Parallel domains
10. **Coordinator** — Final validation, regression testing

Each agent follows Phase 2 pattern:
- Import tokens from DT
- No inline values
- Mobile-first responsive classes
- Focus-visible on all interactive elements
- prefers-reduced-motion respect
- RTL-safe logical CSS
- `npx tsc --noEmit` clean
- Visual regression checklist per component

---

## Success Criteria Summary

| Phase | Status | Criteria |
|-------|--------|----------|
| **Phase 0** | ✅ Complete | All gaps documented (mobile, focus, RTL) |
| **Phase 1** | ✅ Complete | 43+ tokens defined, TypeScript clean |
| **Phase 2** | ✅ Complete | Dashboard refactored, 3 components updated, full validation |
| **Phase 3** | ⏳ Ready | 10 parallel agents, same pattern as Phase 2 |

---

## Blockers & Dependencies

- ⛔ **Phase 1 blocked on Phase 0** — Must document gaps first
- ⛔ **Phase 2 blocked on Phase 1** — Must have all tokens available
- ✅ **Phase 3 can run parallel** with Phase 2 once Phase 1 complete

---

## Execution Timeline

| Phase | Duration | Total | Status |
|-------|----------|-------|--------|
| Phase 0 | 1 day | 1 day | Ready to start |
| Phase 1 | 1 day | 2 days | Blocked on Phase 0 |
| Phase 2 | 3–4 days | 5–6 days | Blocked on Phase 1 |
| Phase 3 | 5–7 days | 10–13 days | Parallel with Phase 2 |

**Expected total: 10–13 days** (concurrent work in Phase 3 reduces wall-clock time)

---

_Plan created: 2026-05-11_
_Ready for Phase 0 execution via subagent-driven-development skill_
