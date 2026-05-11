# Apple Design Revamp — WABDesk Full-App Specification

**Date:** 2026-05-11  
**Status:** Approved — ready for implementation  
**Scope:** All 164 component files + 50 pages  
**Approach:** Component-level Apple class constants, full dark mode, parallel domain agents

---

## 1. Background & Goals

WABDesk's auth pages (sign-in, sign-up) and catalog settings already use an Apple-inspired visual language. This revamp extends that language consistently across the entire application — every component, every page, every state.

**Reference implementations (do not modify):**
- `app/(auth)/sign-in/page.tsx` — Apple auth card, inputs, buttons
- `app/(auth)/sign-up/page.tsx` — same
- `components/settings/catalog-settings.tsx` — Apple cards, dialogs, inline tokens

**Goals:**
1. Visual consistency — every UI surface uses the same token system
2. Full dark mode — every element has a dark variant, not just containers
3. No regressions — all existing functionality, Convex hooks, and business logic unchanged
4. Type safety — `npx tsc --noEmit` clean after every agent completes

---

## 2. Design Tokens — `lib/design-tokens.ts`

A single source of truth. **All agents import from this file. No inline Apple color strings anywhere else.**

```typescript
// lib/design-tokens.ts
export const DT = {
  // ── Inputs ──────────────────────────────────────────────────────────────
  INPUT: [
    "w-full rounded-xl border border-black/[0.12] bg-black/[0.04]",
    "px-3.5 py-2 text-[14px] text-[#1D1D1F] outline-none",
    "focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all",
    "placeholder:text-[#6E6E73]",
    "dark:bg-white/[0.06] dark:border-white/[0.10] dark:text-white",
    "dark:placeholder:text-white/40 dark:focus:border-[#0A84FF]",
  ].join(" "),

  INPUT_SM: [
    "w-full rounded-lg border border-black/[0.12] bg-black/[0.04]",
    "px-2.5 py-1.5 text-[13px] text-[#1D1D1F] outline-none",
    "focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]/20 transition-all",
    "placeholder:text-[#6E6E73]",
    "dark:bg-white/[0.06] dark:border-white/[0.10] dark:text-white",
    "dark:placeholder:text-white/40",
  ].join(" "),

  INPUT_XS: [
    "w-full rounded-md border border-black/[0.12] bg-black/[0.04]",
    "px-2 py-1 text-[12px] text-[#1D1D1F] outline-none",
    "focus:border-[#0071E3] transition-all",
    "placeholder:text-[#6E6E73]",
    "dark:bg-white/[0.06] dark:border-white/[0.10] dark:text-white",
    "dark:placeholder:text-white/40",
  ].join(" "),

  // ── Buttons ─────────────────────────────────────────────────────────────
  BTN_PRIMARY: [
    "inline-flex items-center justify-center",
    "rounded-full bg-[#0071E3] hover:bg-[#0077ED] active:bg-[#006CD1]",
    "text-white font-normal px-5 py-2 text-[14px]",
    "transition-colors disabled:opacity-50 gap-1.5 shrink-0",
    "dark:bg-[#0A84FF] dark:hover:bg-[#1A91FF] dark:active:bg-[#0070D8]",
  ].join(" "),

  BTN_OUTLINE: [
    "inline-flex items-center justify-center",
    "rounded-full border border-black/[0.12] bg-transparent",
    "hover:bg-black/[0.04] active:bg-black/[0.06]",
    "text-[#1D1D1F] font-normal px-5 py-2 text-[14px]",
    "transition-colors disabled:opacity-50 gap-1.5 shrink-0",
    "dark:border-white/[0.12] dark:text-white dark:hover:bg-white/[0.06]",
  ].join(" "),

  BTN_SM: [
    "inline-flex items-center justify-center",
    "rounded-full border border-black/[0.12] bg-transparent",
    "hover:bg-black/[0.04] active:bg-black/[0.06]",
    "text-[#1D1D1F] font-normal px-3 py-1.5 text-[13px]",
    "transition-colors disabled:opacity-50 gap-1 shrink-0",
    "dark:border-white/[0.12] dark:text-white dark:hover:bg-white/[0.06]",
  ].join(" "),

  BTN_SM_PRIMARY: [
    "inline-flex items-center justify-center",
    "rounded-full bg-[#0071E3] hover:bg-[#0077ED]",
    "text-white font-normal px-3 py-1.5 text-[13px]",
    "transition-colors disabled:opacity-50 gap-1 shrink-0",
    "dark:bg-[#0A84FF] dark:hover:bg-[#1A91FF]",
  ].join(" "),

  BTN_ICON: [
    "inline-flex items-center justify-center",
    "size-8 rounded-xl",
    "text-[#6E6E73] hover:bg-black/[0.06] hover:text-[#1D1D1F]",
    "transition-colors",
    "dark:text-white/50 dark:hover:bg-white/[0.08] dark:hover:text-white",
  ].join(" "),

  BTN_ICON_SM: [
    "inline-flex items-center justify-center",
    "size-6 rounded-lg",
    "text-[#6E6E73] hover:bg-black/[0.06] hover:text-[#1D1D1F]",
    "transition-colors",
    "dark:text-white/50 dark:hover:bg-white/[0.08] dark:hover:text-white",
  ].join(" "),

  BTN_DESTRUCTIVE: [
    "inline-flex items-center justify-center",
    "rounded-full bg-[#FF3B30] hover:bg-[#FF453A] active:bg-[#D70015]",
    "text-white font-normal px-5 py-2 text-[14px]",
    "transition-colors disabled:opacity-50 gap-1.5 shrink-0",
    "dark:bg-[#FF453A] dark:hover:bg-[#FF6961]",
  ].join(" "),

  // ── Cards ────────────────────────────────────────────────────────────────
  CARD: [
    "rounded-[22px] bg-white border border-black/[0.08]",
    "shadow-[0_2px_6px_rgba(0,0,0,0.04),0_10px_30px_rgba(0,0,0,0.08)]",
    "dark:bg-[#1C1C1E] dark:border-white/[0.08]",
  ].join(" "),

  CARD_SM: [
    "rounded-2xl bg-white border border-black/[0.08]",
    "shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)]",
    "dark:bg-[#2C2C2E] dark:border-white/[0.06]",
  ].join(" "),

  CARD_FLAT: [
    "rounded-2xl bg-black/[0.03]",
    "border border-black/[0.06]",
    "dark:bg-white/[0.04] dark:border-white/[0.06]",
  ].join(" "),

  // ── Dialogs / Sheets ─────────────────────────────────────────────────────
  DIALOG: [
    "rounded-[28px] border-0",
    "bg-white/95 backdrop-blur-2xl",
    "shadow-[0_25px_80px_rgba(0,0,0,0.18)]",
    "dark:bg-[#1C1C1E]/95",
  ].join(" "),

  SHEET: [
    "border-0",
    "bg-white/95 backdrop-blur-2xl",
    "shadow-[-20px_0_60px_rgba(0,0,0,0.12)]",
    "dark:bg-[#1C1C1E]/95",
  ].join(" "),

  DIALOG_FOOTER: [
    "border-t border-black/[0.06] px-6 py-4",
    "flex items-center justify-end gap-2",
    "bg-white/80 backdrop-blur-sm",
    "dark:bg-[#1C1C1E]/80 dark:border-white/[0.06]",
  ].join(" "),

  // ── Typography ───────────────────────────────────────────────────────────
  H1:   "text-[28px] font-semibold tracking-[-0.5px] text-[#1D1D1F] dark:text-white",
  H2:   "text-[22px] font-semibold tracking-[-0.3px] text-[#1D1D1F] dark:text-white",
  H3:   "text-[17px] font-semibold tracking-[-0.2px] text-[#1D1D1F] dark:text-white",
  BODY: "text-[14px] text-[#1D1D1F] dark:text-white",
  MUTED: "text-[13px] text-[#6E6E73] dark:text-white/50",
  MICRO: "text-[11px] text-[#6E6E73] dark:text-white/40",
  LBL:  "block text-[13px] font-medium text-[#1D1D1F] mb-1 dark:text-white/90",
  SEC:  "text-[11px] font-semibold text-[#6E6E73] uppercase tracking-[0.06em] dark:text-white/40",

  // ── Dividers ─────────────────────────────────────────────────────────────
  DIVIDER:  "border-t border-black/[0.08] dark:border-white/[0.06]",
  DIVIDER_V: "border-s border-black/[0.08] dark:border-white/[0.06]",

  // ── Badges ───────────────────────────────────────────────────────────────
  BADGE_BLUE:    "inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-950 px-2.5 py-0.5 text-[12px] font-medium text-blue-700 dark:text-blue-300",
  BADGE_GREEN:   "inline-flex items-center rounded-full bg-green-50 dark:bg-green-950 px-2.5 py-0.5 text-[12px] font-medium text-green-700 dark:text-green-300",
  BADGE_AMBER:   "inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950 px-2.5 py-0.5 text-[12px] font-medium text-amber-700 dark:text-amber-300",
  BADGE_RED:     "inline-flex items-center rounded-full bg-red-50 dark:bg-red-950 px-2.5 py-0.5 text-[12px] font-medium text-red-700 dark:text-red-300",
  BADGE_PURPLE:  "inline-flex items-center rounded-full bg-purple-50 dark:bg-purple-950 px-2.5 py-0.5 text-[12px] font-medium text-purple-700 dark:text-purple-300",
  BADGE_NEUTRAL: "inline-flex items-center rounded-full bg-black/[0.06] dark:bg-white/[0.10] px-2.5 py-0.5 text-[12px] font-medium text-[#1D1D1F] dark:text-white",

  // ── List items ────────────────────────────────────────────────────────────
  LIST_ITEM:        "flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors cursor-pointer",
  LIST_ITEM_ACTIVE: "flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#0071E3]/10 text-[#0071E3] dark:bg-[#0A84FF]/15 dark:text-[#0A84FF]",
  LIST_ITEM_SM:     "flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors cursor-pointer",

  // ── Select ───────────────────────────────────────────────────────────────
  SELECT: [
    "w-full h-10 rounded-xl border border-black/[0.12] bg-black/[0.04]",
    "px-3.5 text-[14px] text-[#1D1D1F]",
    "focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-all",
    "dark:bg-white/[0.06] dark:border-white/[0.10] dark:text-white",
  ].join(" "),

  // ── Textarea ─────────────────────────────────────────────────────────────
  TEXTAREA: [
    "w-full rounded-xl border border-black/[0.12] bg-black/[0.04]",
    "px-3.5 py-2.5 text-[14px] text-[#1D1D1F] outline-none",
    "focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all",
    "resize-none placeholder:text-[#6E6E73]",
    "dark:bg-white/[0.06] dark:border-white/[0.10] dark:text-white",
    "dark:placeholder:text-white/40",
  ].join(" "),

  // ── Sidebar ──────────────────────────────────────────────────────────────
  SIDEBAR_BG:          "bg-[#F5F5F7] dark:bg-[#111111]",
  SIDEBAR_ITEM:        "flex items-center gap-2.5 px-3 py-2 rounded-xl text-[14px] font-medium text-[#1D1D1F] hover:bg-black/[0.06] dark:text-white/80 dark:hover:bg-white/[0.07] transition-colors",
  SIDEBAR_ITEM_ACTIVE: "flex items-center gap-2.5 px-3 py-2 rounded-xl text-[14px] font-medium bg-white shadow-sm text-[#0071E3] dark:bg-white/[0.10] dark:text-[#0A84FF]",

  // ── Status dots ───────────────────────────────────────────────────────────
  DOT_GREEN:  "size-2 rounded-full bg-[#34C759] dark:bg-[#30D158]",
  DOT_GRAY:   "size-2 rounded-full bg-[#8E8E93] dark:bg-[#636366]",
  DOT_AMBER:  "size-2 rounded-full bg-[#FF9500] dark:bg-[#FF9F0A]",
  DOT_RED:    "size-2 rounded-full bg-[#FF3B30] dark:bg-[#FF453A]",

  // ── Info box ──────────────────────────────────────────────────────────────
  INFO_BOX: "rounded-xl bg-black/[0.03] dark:bg-white/[0.04] px-3.5 py-2.5 text-[12px] text-[#6E6E73] dark:text-white/50",
} as const;

export type DTKey = keyof typeof DT;
```

---

## 3. Domain Agent Map

### Execution Order
```
Step 1 (serial):  Agent 0 — Foundation (creates lib/design-tokens.ts)
Step 2 (parallel): Agents 1–10 — all domains simultaneously
Step 3 (serial):  Agent 11 — Coordinator (tsc + consistency check + PROGRESS.md)
```

---

### Agent 0 — Foundation
| | |
|---|---|
| **Files** | `lib/design-tokens.ts` (new) |
| **Task** | Write the full `DT` object from Section 2 above |
| **Verify** | `npx tsc --noEmit` clean |
| **Unblocks** | All other agents |

---

### Agent 1 — Shell
| | |
|---|---|
| **Files** | `components/shell/` (all ~14 files), `lib/shell/nav-config.ts`, `lib/shell/types.ts` |
| **Must NOT touch** | `components/ui/*`, `app/` layouts |

**Changes per element:**

| Element | Change |
|---------|--------|
| Sidebar container | `DT.SIDEBAR_BG` + `rounded-e-[22px]` (RTL-safe) |
| Nav items | `DT.SIDEBAR_ITEM` / `DT.SIDEBAR_ITEM_ACTIVE` |
| Active indicator | `DT.SIDEBAR_ITEM_ACTIVE` (no separate dot) |
| User avatar button | `rounded-full` with Apple ring on hover |
| User menu popover | `DT.CARD` container, items use `DT.LIST_ITEM` |
| Notification bell | `DT.BTN_ICON`, badge uses `DT.BADGE_RED` |
| Notification drawer | `DT.CARD` panel, `DT.LIST_ITEM` rows |
| Presence dot | `DT.DOT_GREEN` / `DT.DOT_GRAY` |
| Theme toggle | `DT.BTN_ICON` |
| Channel switcher | `DT.SELECT` or `DT.BTN_SM` dropdown |

---

### Agent 2 — Inbox
| | |
|---|---|
| **Files** | `components/inbox/` (all ~12 files), `app/(dashboard)/inbox/**/page.tsx` |
| **Must NOT touch** | Message delivery logic, Convex subscriptions |

**Changes per element:**

| Element | Change |
|---------|--------|
| Conversation list panel | `DT.SIDEBAR_BG` background |
| Conversation list item (unread) | `DT.LIST_ITEM` + `font-semibold` name |
| Conversation list item (active) | `DT.LIST_ITEM_ACTIVE` |
| Search input | `DT.INPUT_SM` |
| Filter chips | `DT.BADGE_NEUTRAL` (inactive), `DT.BADGE_BLUE` (active) |
| Thread container | `bg-white dark:bg-[#000000]` |
| Message bubble (customer) | Keep `#ffffff` / `#1C1C1E`, `rounded-[18px] rounded-tl-[4px]`, `shadow-[0_1px_2px_rgba(0,0,0,0.08)]` |
| Message bubble (agent) | Keep `#DCF8C6` / `#1A3A2A`, `rounded-[18px] rounded-tr-[4px]` |
| Message bubble (internal note) | Keep `#FFFBEF` / `#2A2200`, `rounded-[18px]`, `border border-amber-200/60` |
| Message timestamp | `DT.MICRO` |
| Message input bar | `DT.CARD_SM` container flush to bottom |
| Message textarea | `DT.TEXTAREA` (no border in input bar context — use `border-0 bg-transparent`) |
| Send button | `DT.BTN_SM_PRIMARY` |
| Attachment button | `DT.BTN_ICON` |
| Quick reply button | `DT.BTN_ICON` |
| Quick reply picker | `DT.CARD` popover, `DT.LIST_ITEM_SM` rows |
| Label picker | `DT.CARD` popover, `DT.BADGE_*` chips |
| Transfer dialog | `DT.DIALOG`, agent rows use `DT.LIST_ITEM` |
| Resolve/reopen button | `DT.BTN_SM_PRIMARY` (resolve) / `DT.BTN_SM` (reopen) |
| Assign dropdown | `DT.BTN_SM` trigger, `DT.CARD` dropdown |
| Status badge (open/pending/resolved) | `DT.BADGE_GREEN` / `DT.BADGE_AMBER` / `DT.BADGE_NEUTRAL` |

---

### Agent 3 — Contacts
| | |
|---|---|
| **Files** | `components/contacts/` (all ~11 files), `app/(dashboard)/contacts/page.tsx` |
| **Must NOT touch** | CSV parsing logic, phone normalization |

**Changes per element:**

| Element | Change |
|---------|--------|
| Page header | `DT.H1` + `DT.BTN_PRIMARY` (Add Contact) |
| Search + filter bar | `DT.INPUT_SM`, `DT.BTN_SM` filters |
| Contact card (grid) | `DT.CARD_SM` with `DT.DOT_GREEN` presence, `DT.BADGE_NEUTRAL` tags |
| Contact table row | `DT.LIST_ITEM` hover, `rounded-xl` selection ring |
| Contact sheet | `DT.SHEET` on shadcn Sheet className |
| Sheet header | `DT.H3` name, `DT.MUTED` phone |
| Contact fields in sheet | `DT.LBL` + `DT.INPUT` |
| Tags in sheet | `DT.BADGE_NEUTRAL` chips with `×` remove button |
| Timeline item | Left dot `DT.DOT_GREEN` / `DT.DOT_GRAY`, `DT.MICRO` timestamp |
| Add contact dialog | `DT.DIALOG`, `DT.INPUT` fields, `DT.BTN_PRIMARY` save |
| CSV import dialog | `DT.DIALOG`, dashed drop zone `rounded-2xl border-dashed border-black/[0.12]` |
| Bulk tag popover | `DT.CARD`, `DT.BADGE_NEUTRAL` chips |
| Empty state | Centered `DT.MUTED` + `DT.BTN_SM_PRIMARY` |

---

### Agent 4 — Settings
| | |
|---|---|
| **Files** | `components/settings/` (all except `catalog-settings.tsx`), `app/(dashboard)/settings/**/page.tsx` |
| **Must NOT touch** | `catalog-settings.tsx` (done), Convex mutations |

**Changes per element:**

| Element | Change |
|---------|--------|
| Settings page wrapper | `DT.H1` page title, `DT.MUTED` subtitle |
| Settings section card | `DT.CARD` container |
| Section header inside card | `DT.H3` + `DT.DIVIDER` |
| Form fields | `DT.LBL` + `DT.INPUT` |
| Toggle rows | `DT.LIST_ITEM` layout with trailing `Switch` |
| Save / Update button | `DT.BTN_PRIMARY` |
| Cancel button | `DT.BTN_OUTLINE` |
| Plan selector card | `DT.CARD` per plan; recommended plan: `ring-2 ring-[#0071E3] dark:ring-[#0A84FF]` |
| Plan price | `text-[32px] font-semibold tracking-[-0.5px] text-[#1D1D1F] dark:text-white` |
| Plan CTA | `DT.BTN_SM_PRIMARY` (upgrade) / `DT.BTN_SM` (current) |
| Channel card | `DT.CARD_SM`, status `DT.DOT_GREEN` / `DT.DOT_GRAY` |
| Invite form | `DT.INPUT` + `DT.BTN_SM_PRIMARY` |
| Team member row | `DT.LIST_ITEM`, role badge `DT.BADGE_BLUE` / `DT.BADGE_NEUTRAL` |
| Danger zone | `DT.CARD` with `border-[#FF3B30]/20 dark:border-[#FF453A]/20` accent, `DT.BTN_DESTRUCTIVE` |
| API key display | `DT.CARD_FLAT` + `font-mono text-[13px]` + copy `DT.BTN_ICON_SM` |

---

### Agent 5 — Broadcasts + Templates
| | |
|---|---|
| **Files** | `components/broadcasts/` (6 files), `components/templates/` (5 files), `app/(dashboard)/broadcasts/page.tsx`, `app/(dashboard)/settings/templates/page.tsx` |
| **Must NOT touch** | Meta template API calls, broadcast send logic |

**Changes per element:**

| Element | Change |
|---------|--------|
| Broadcast list item | `DT.CARD_SM` hover, status `DT.BADGE_*` |
| Broadcast wizard | `DT.CARD` centered panel, step indicator (numbered `rounded-full` circles) |
| Wizard step circle (complete) | `bg-[#0071E3] text-white dark:bg-[#0A84FF]` |
| Wizard step circle (current) | `ring-2 ring-[#0071E3] dark:ring-[#0A84FF]` |
| Wizard step circle (upcoming) | `bg-black/[0.06] dark:bg-white/[0.08]` |
| Template builder textarea | `DT.TEXTAREA` |
| Variable chip | `DT.BADGE_BLUE` with `{{var}}` format |
| Template card | `DT.CARD_SM`, language badge `DT.BADGE_NEUTRAL`, category badge `DT.BADGE_AMBER` |
| Template picker popover | `DT.CARD`, `DT.INPUT_SM` search, `DT.LIST_ITEM_SM` rows |
| iPhone preview frame | `rounded-[44px] border-[8px] border-[#1D1D1F] dark:border-[#2C2C2E] bg-white dark:bg-black` |
| Meta submit form | `DT.DIALOG`, `DT.INPUT` fields, status `DT.BADGE_AMBER` (pending) |
| Broadcast modal | `DT.DIALOG` |

---

### Agent 6 — Automations
| | |
|---|---|
| **Files** | `components/automations/` (4 files), `app/(dashboard)/automations/page.tsx` |
| **Must NOT touch** | Convex automation rule engine |

**Changes per element:**

| Element | Change |
|---------|--------|
| Rule card | `DT.CARD_SM`, enabled/disabled state via `opacity-60` when disabled |
| Rule toggle | Apple `Switch` (keep as-is) with `DT.LIST_ITEM` row |
| Trigger chip | `DT.BADGE_BLUE` |
| Action chip | `DT.BADGE_GREEN` |
| Rule form | `DT.DIALOG`, `DT.SELECT` + `DT.INPUT` fields |
| Business hours grid | `DT.CARD` with day-row `DT.LIST_ITEM`, time `DT.INPUT_SM` pickers |
| Empty state | Centered `DT.MUTED` message + `DT.BTN_SM_PRIMARY` |
| Add rule button | `DT.BTN_SM_PRIMARY` |

---

### Agent 7 — Analytics
| | |
|---|---|
| **Files** | `components/analytics/` (12 files), `app/(dashboard)/analytics/page.tsx`, `app/(dashboard)/my-stats/page.tsx` |
| **Must NOT touch** | Chart data/queries, Recharts/chart library internals |

**Changes per element:**

| Element | Change |
|---------|--------|
| Stat widget | `DT.CARD_SM`, value `text-[32px] font-semibold tracking-[-0.5px]`, label `DT.MICRO` |
| Trend indicator (up) | `text-[#34C759] dark:text-[#30D158]` + ↑ |
| Trend indicator (down) | `text-[#FF3B30] dark:text-[#FF453A]` + ↓ |
| Chart container | `DT.CARD` wrapper |
| Chart colors | `["#0071E3","#34C759","#FF9500","#FF3B30","#AF52DE","#5AC8FA"]` |
| Chart tooltip | `DT.CARD_SM` styled tooltip |
| Date range selector | `DT.BTN_SM` segmented group (selected: `bg-white shadow-sm dark:bg-white/[0.10]`) |
| Performance table | `rounded-2xl border border-black/[0.08] dark:border-white/[0.06]` container, `DT.LIST_ITEM` rows |
| Agent avatar | `rounded-full` with initials fallback |
| Export button | `DT.BTN_OUTLINE` |
| CSAT star | filled `text-[#FF9500]` / empty `text-black/[0.15] dark:text-white/[0.15]` |

---

### Agent 8 — Onboarding
| | |
|---|---|
| **Files** | `components/onboarding/` (8 files), `app/(dashboard)/onboarding/page.tsx`, `app/onboarding/page.tsx` |
| **Must NOT touch** | Onboarding state machine, Convex mutations |

**Changes per element:**

| Element | Change |
|---------|--------|
| Wizard outer container | Centered `DT.CARD` `max-w-lg mx-auto` |
| Step indicator bar | `rounded-full` track `bg-black/[0.08] dark:bg-white/[0.10]`, fill `bg-[#0071E3] dark:bg-[#0A84FF]` |
| Step number circle (done) | `bg-[#0071E3] dark:bg-[#0A84FF]` + white checkmark |
| Step number circle (current) | `ring-2 ring-[#0071E3] dark:ring-[#0A84FF] bg-white dark:bg-[#1C1C1E]` |
| Step number circle (future) | `bg-black/[0.06] dark:bg-white/[0.08] text-[#6E6E73]` |
| Form inputs | `DT.INPUT` |
| Next / Connect button | `DT.BTN_PRIMARY` full width |
| Skip link | `DT.MUTED` underline |
| Channel status indicator | `DT.DOT_GREEN` connected / `DT.DOT_GRAY` pending + `DT.MUTED` label |
| Success panel | `DT.CARD` centered, `#34C759` checkmark `rounded-full size-16` |

---

### Agent 9 — Marketing + Remaining Auth Pages
| | |
|---|---|
| **Files** | `components/marketing/` (12 files), `app/page.tsx`, `app/(marketing)/**/page.tsx`, `app/(auth)/forgot-password/page.tsx`, `app/(auth)/reset-password/page.tsx` |
| **Must NOT touch** | i18n string content, legal copy text, `app/(auth)/sign-in/page.tsx`, `app/(auth)/sign-up/page.tsx` |

**Changes per element:**

| Element | Change |
|---------|--------|
| Top nav | `bg-white/80 backdrop-blur-xl border-b border-black/[0.06] dark:bg-[#111111]/80 dark:border-white/[0.05]` sticky |
| Nav links | `DT.MUTED` default, `DT.BODY` hover |
| Nav CTA | `DT.BTN_SM_PRIMARY` |
| Mobile nav sheet | `DT.SHEET` |
| Hero section | `bg-[#F5F5F7] dark:bg-[#111111]` background |
| Hero headline | `text-[48px] font-semibold tracking-[-1px] text-[#1D1D1F] dark:text-white` |
| Hero subheadline | `DT.MUTED text-[18px]` |
| Hero CTA | `DT.BTN_PRIMARY` large (`px-8 py-3 text-[16px]`) |
| Feature card | `DT.CARD_SM` |
| Feature icon | `rounded-2xl bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 p-3 text-[#0071E3] dark:text-[#0A84FF]` |
| Pricing card | `DT.CARD` |
| Recommended pricing card | `DT.CARD` + `ring-2 ring-[#0071E3] dark:ring-[#0A84FF]` |
| Pricing plan badge | `DT.BADGE_BLUE` |
| Pricing price | `text-[40px] font-semibold tracking-[-0.5px]` |
| Footer | `bg-[#F5F5F7] dark:bg-[#111111] border-t border-black/[0.06] dark:border-white/[0.05]` |
| Footer links | `DT.MUTED hover:text-[#1D1D1F] dark:hover:text-white transition-colors` |

---

### Agent 10 — Catalog Browser, AI Assistant, Lists, Team
| | |
|---|---|
| **Files** | `components/catalog/catalog-browser.tsx`, `components/ai-assistant/`, `components/lists/` (4 files), `components/team/` (5 files), related `app/(dashboard)/*/page.tsx` |
| **Must NOT touch** | `catalog-settings.tsx` (done), Convex queries |

**Changes per element:**

| Element | Change |
|---------|--------|
| Catalog browser product tile | `DT.CARD_SM` hover, image `rounded-xl`, price `DT.BODY font-medium` |
| Catalog browser search | `DT.INPUT_SM` |
| AI assistant chat input | `DT.TEXTAREA` |
| AI assistant send button | `DT.BTN_SM_PRIMARY` |
| AI message bubble | `DT.CARD_FLAT` `rounded-[18px]` |
| List card | `DT.CARD_SM` |
| Create list dialog | `DT.DIALOG`, `DT.INPUT` |
| List detail | `DT.CARD` container, `DT.LIST_ITEM` contact rows |
| Member profile sheet | `DT.SHEET` |
| Member stat widgets | `DT.CARD_SM` (same as analytics widgets) |
| Member role badge | `DT.BADGE_BLUE` (admin) / `DT.BADGE_NEUTRAL` (agent) |
| Tab nav (profile tabs) | `DT.BTN_SM` segmented, active `bg-white shadow-sm dark:bg-white/[0.10]` |

---

### Agent 11 — Coordinator (runs last)
| | |
|---|---|
| **Files** | `PROGRESS.md`, read-only review of all changed files |
| **Tasks** | 1. Run `npx tsc --noEmit` — fix any type errors <br> 2. Grep for any inline `#0071E3`, `#1D1D1F`, `rounded-\[22px\]` outside `design-tokens.ts` — report discrepancies <br> 3. Verify `catalog-settings.tsx` was not modified <br> 4. Verify auth pages were not modified <br> 5. Write `PROGRESS.md` entry <br> 6. Confirm all 10 domain agents ran to completion |

---

## 4. Coding Rules (All Agents Must Follow)

1. **Import DT** — `import { DT } from "@/lib/design-tokens"` at top of every edited file
2. **No inline Apple strings** — no `#0071E3`, `#1D1D1F`, `rounded-[22px]` outside `design-tokens.ts`
3. **Keep shadcn structural components** — `Dialog`, `Sheet`, `AlertDialog`, `Select`, `Switch`, `Popover` stay as shadcn; only their `className` prop is overridden
4. **Replace with native HTML** — `Button`, `Input`, `Label`, `Separator` from shadcn get replaced with `<button>`, `<input>`, `<label>`, `<div>` using DT classes
5. **Full dark mode** — every `bg-white` needs `dark:bg-[#1C1C1E]`, every `text-[#1D1D1F]` needs `dark:text-white`, every `border-black/[...]` needs `dark:border-white/[...]`
6. **RTL-safe** — use `ps-`/`pe-`/`ms-`/`me-` not `pl-`/`pr-`/`ml-`/`mr-`; use `rounded-s-*`/`rounded-e-*` not `rounded-l-*`/`rounded-r-*`
7. **No logic changes** — state, hooks, Convex calls, event handlers: untouched
8. **No new files** — only modify existing files (except `lib/design-tokens.ts` which is new)
9. **TypeScript strict** — no `any` types; `npx tsc --noEmit` must be clean per agent

---

## 5. File Ownership Boundaries

| Agent | Owns | Forbidden |
|-------|------|-----------|
| Shell | `components/shell/*`, `lib/shell/*` | `app/*`, `components/ui/*` |
| Inbox | `components/inbox/*`, `app/(dashboard)/inbox/**` | Shell files, Convex files |
| Contacts | `components/contacts/*`, `app/(dashboard)/contacts/**` | Shell, Inbox |
| Settings | `components/settings/*` (not catalog), `app/(dashboard)/settings/**` | `catalog-settings.tsx`, Convex |
| Broadcasts | `components/broadcasts/*`, `components/templates/*` | Settings, Shell |
| Automations | `components/automations/*`, `app/(dashboard)/automations/**` | All other domains |
| Analytics | `components/analytics/*`, `app/(dashboard)/analytics/**`, `app/(dashboard)/my-stats/**` | All other domains |
| Onboarding | `components/onboarding/*`, `app/(dashboard)/onboarding/**`, `app/onboarding/**` | All other domains |
| Marketing | `components/marketing/*`, `app/page.tsx`, `app/(marketing)/**` | Dashboard files |
| Agent 10 | `components/catalog/`, `components/ai-assistant/`, `components/lists/`, `components/team/` | All other domains |

---

## 6. Success Criteria

| Check | Pass Condition |
|-------|---------------|
| TypeScript | `npx tsc --noEmit` exits 0, zero errors |
| Token consistency | `grep -r "#0071E3" components/` returns only `design-tokens.ts` |
| Dark mode coverage | `grep -r "bg-white" components/` — every match has a nearby `dark:bg-` |
| Shadcn structure | All Dialog/Sheet/AlertDialog open/close behavior unchanged |
| No scope bleed | `git diff --name-only` per agent matches ownership table |
| Auth pages clean | `git diff app/(auth)/` shows no changes |
| Catalog clean | `git diff components/settings/catalog-settings.tsx` shows no changes |
| PROGRESS.md | Entry written with all 11 agents listed |

---

## 7. Already Complete (Do Not Modify)

- `app/(auth)/sign-in/page.tsx` ✅
- `app/(auth)/sign-up/page.tsx` ✅
- `components/settings/catalog-settings.tsx` ✅

> Note: `forgot-password` and `reset-password` pages are **not** yet Apple-styled — they are in scope under Agent 9.

---

## 8. Glossary

| Term | Definition |
|------|-----------|
| DT | The `design-tokens.ts` export object; single source of Apple CSS constants |
| Apple light | `#F5F5F7` background, `#1D1D1F` text, `#6E6E73` secondary, `#0071E3` accent |
| Apple dark | `#111111` / `#1C1C1E` / `#2C2C2E` surfaces, `#0A84FF` accent |
| Domain agent | One of the 10 parallel subagents, each owning a bounded set of files |
| Coordinator | Agent 11; validates the full output after all domain agents complete |
