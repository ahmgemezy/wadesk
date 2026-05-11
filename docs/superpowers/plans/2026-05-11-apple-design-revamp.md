# Apple Design Revamp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply a consistent Apple-inspired visual language (tokens, dark mode, RTL-safe) to all WABDesk components and pages, using a single shared `lib/design-tokens.ts` as the source of truth.

**Architecture:** Agent 0 creates the token module first; Agents 1–10 run in parallel each owning a bounded file domain; Agent 11 (Coordinator) validates the full output. Every agent imports from `DT` and replaces shadcn `Button`/`Input`/`Label`/`Separator` with native HTML elements while keeping shadcn `Dialog`/`Sheet`/`AlertDialog`/`Select`/`Switch`/`Popover` as structural wrappers.

**Tech Stack:** Next.js 15 App Router, Convex, shadcn/ui, Tailwind CSS v4, TypeScript strict

---

## Pre-flight: Already Complete — Do Not Touch

- `app/(auth)/sign-in/page.tsx` ✅
- `app/(auth)/sign-up/page.tsx` ✅
- `components/settings/catalog-settings.tsx` ✅

---

## Task 0 — Foundation: Create `lib/design-tokens.ts`

**Files:**
- Create: `lib/design-tokens.ts`

**This task must complete before Tasks 1–10 begin.**

- [ ] **Step 1: Create `lib/design-tokens.ts` with the full DT object**

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
  DIVIDER:   "border-t border-black/[0.08] dark:border-white/[0.06]",
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
  DOT_GREEN: "size-2 rounded-full bg-[#34C759] dark:bg-[#30D158]",
  DOT_GRAY:  "size-2 rounded-full bg-[#8E8E93] dark:bg-[#636366]",
  DOT_AMBER: "size-2 rounded-full bg-[#FF9500] dark:bg-[#FF9F0A]",
  DOT_RED:   "size-2 rounded-full bg-[#FF3B30] dark:bg-[#FF453A]",

  // ── Info box ──────────────────────────────────────────────────────────────
  INFO_BOX: "rounded-xl bg-black/[0.03] dark:bg-white/[0.04] px-3.5 py-2.5 text-[12px] text-[#6E6E73] dark:text-white/50",
} as const;

export type DTKey = keyof typeof DT;
```

- [ ] **Step 2: Verify TypeScript is clean**

```bash
cd /Users/ahmedgemmezy/Documents/WABDesk && npx tsc --noEmit
```
Expected: empty output (no errors)

- [ ] **Step 3: Commit**

```bash
git add lib/design-tokens.ts
git commit -m "feat(design): add Apple design token module (DT)"
```

---

## Task 1 — Shell

**Files:**
- Modify: `components/shell/app-sidebar.tsx`
- Modify: `components/shell/bottom-nav.tsx`
- Modify: `components/shell/breadcrumb.tsx`
- Modify: `components/shell/channel-switcher.tsx`
- Modify: `components/shell/client-notification-bell.tsx`
- Modify: `components/shell/locale-switcher.tsx`
- Modify: `components/shell/my-profile-modal.tsx`
- Modify: `components/shell/past-due-banner.tsx`
- Modify: `components/shell/role-badge.tsx`
- Modify: `components/shell/user-menu.tsx`
- Modify: `lib/shell/nav-config.ts` (only if it has inline style strings)
- Modify: `lib/shell/types.ts` (only if it has inline style strings)

**Rules for this task:**
- Do NOT touch `components/ui/*`
- Do NOT touch any `app/` layout files
- Import: `import { DT } from "@/lib/design-tokens";`
- Replace all inline hardcoded colors with DT tokens
- Use `DT.SIDEBAR_BG` for the sidebar container background
- Use `DT.SIDEBAR_ITEM` / `DT.SIDEBAR_ITEM_ACTIVE` for nav items
- Use `DT.BTN_ICON` for theme toggle and bell button
- Use `DT.BADGE_RED` for notification count badge
- Use `DT.DOT_GREEN` / `DT.DOT_GRAY` for presence indicators
- Use `DT.BTN_SM` for channel switcher trigger
- Use `DT.CARD` for any dropdown/popover containers
- Use `DT.LIST_ITEM` for dropdown rows

**Changes per component:**

| Component | Key changes |
|-----------|------------|
| `app-sidebar.tsx` | Sidebar container → `DT.SIDEBAR_BG`; nav items → `DT.SIDEBAR_ITEM` / `DT.SIDEBAR_ITEM_ACTIVE`; remove any `ml-`/`mr-` → `ms-`/`me-` |
| `user-menu.tsx` | Avatar button → `rounded-full`; menu popover → `DT.CARD`; menu items → `DT.LIST_ITEM`; destructive item → `text-[#FF3B30] dark:text-[#FF453A]` |
| `client-notification-bell.tsx` | Bell button → `DT.BTN_ICON`; count badge → `DT.BADGE_RED`; notification drawer → `DT.CARD` panel; notification rows → `DT.LIST_ITEM` |
| `channel-switcher.tsx` | Trigger button → `DT.BTN_SM`; dropdown → `DT.CARD`; channel rows → `DT.LIST_ITEM` |
| `locale-switcher.tsx` | Button → `DT.BTN_ICON` or `DT.BTN_SM`; dropdown → `DT.CARD`; rows → `DT.LIST_ITEM` |
| `role-badge.tsx` | Admin → `DT.BADGE_BLUE`; supervisor → `DT.BADGE_AMBER`; agent → `DT.BADGE_NEUTRAL` |
| `past-due-banner.tsx` | Banner → `bg-[#FF3B30] dark:bg-[#FF453A] text-white`; dismiss → `DT.BTN_ICON` |
| `my-profile-modal.tsx` | Dialog → `DT.DIALOG` on DialogContent className; inputs → `DT.INPUT`; save → `DT.BTN_PRIMARY`; cancel → `DT.BTN_OUTLINE` |
| `breadcrumb.tsx` | Separator → `DT.MICRO`; active crumb → `DT.BODY`; parent crumbs → `DT.MUTED` |
| `bottom-nav.tsx` | Container → `bg-white/90 backdrop-blur-xl border-t border-black/[0.06] dark:bg-[#111111]/90 dark:border-white/[0.05]`; active item → `text-[#0071E3] dark:text-[#0A84FF]` |

- [ ] **Step 1: Add DT import and apply tokens to `app-sidebar.tsx`**

  Open `components/shell/app-sidebar.tsx`. Add `import { DT } from "@/lib/design-tokens";` at the top. Replace all inline style strings with DT tokens per the table above.

- [ ] **Step 2: Apply tokens to `user-menu.tsx`, `client-notification-bell.tsx`**

  Same approach: add DT import, replace inline class strings.

- [ ] **Step 3: Apply tokens to remaining shell files**

  `channel-switcher.tsx`, `locale-switcher.tsx`, `role-badge.tsx`, `past-due-banner.tsx`, `my-profile-modal.tsx`, `breadcrumb.tsx`, `bottom-nav.tsx`

- [ ] **Step 4: Verify TypeScript is clean**

```bash
cd /Users/ahmedgemmezy/Documents/WABDesk && npx tsc --noEmit
```
Expected: empty output

- [ ] **Step 5: Commit**

```bash
git add components/shell/ lib/shell/
git commit -m "feat(shell): Apple design tokens — sidebar, nav, user menu, bell"
```

---

## Task 2 — Inbox

**Files:**
- Modify: `components/inbox/conversation-list-item.tsx`
- Modify: `components/inbox/conversation-list.tsx`
- Modify: `components/inbox/conversation-thread.tsx`
- Modify: `components/inbox/forward-to-branch-dialog.tsx`
- Modify: `components/inbox/inbox-queue-tree.tsx`
- Modify: `components/inbox/label-picker.tsx`
- Modify: `components/inbox/message-action-menu.tsx`
- Modify: `components/inbox/message-bubble.tsx`
- Modify: `components/inbox/message-input.tsx`
- Modify: `components/inbox/quick-reply-panel.tsx`
- Modify: `components/inbox/reply-context-banner.tsx`
- Modify: `components/inbox/status-selector.tsx`
- Modify: `components/inbox/transfer-picker.tsx`
- Modify: `app/(dashboard)/inbox/page.tsx`
- Modify: `app/(dashboard)/inbox/[id]/page.tsx`

**Rules for this task:**
- Do NOT touch message delivery logic, Convex subscriptions, or wamid handling
- Import: `import { DT } from "@/lib/design-tokens";`
- Message bubble visual appearance is preserved (WhatsApp-native green/white) — only structural wrapper and non-bubble UI gets Apple tokens

**Changes per component:**

| Component | Key changes |
|-----------|------------|
| `conversation-list.tsx` | Panel background → `DT.SIDEBAR_BG`; search input → `DT.INPUT_SM`; filter chips → `DT.BADGE_NEUTRAL` (inactive), `DT.BADGE_BLUE` (active) |
| `conversation-list-item.tsx` | Item container → `DT.LIST_ITEM` (inactive), `DT.LIST_ITEM_ACTIVE` (selected); unread name → `font-semibold`; timestamp → `DT.MICRO`; status badge → `DT.BADGE_*` |
| `inbox-queue-tree.tsx` | Queue section header → `DT.SEC`; items → `DT.LIST_ITEM` / `DT.LIST_ITEM_ACTIVE` |
| `conversation-thread.tsx` | Thread outer container → `bg-white dark:bg-black`; header bar → `bg-white dark:bg-[#1C1C1E] border-b border-black/[0.06] dark:border-white/[0.05]`; assign button → `DT.BTN_SM`; resolve button → `DT.BTN_SM_PRIMARY`; reopen button → `DT.BTN_SM`; contact name → `DT.H3` |
| `message-bubble.tsx` | Customer bubble: keep `bg-white dark:bg-[#1C1C1E] rounded-[18px] rounded-tl-[4px] shadow-[0_1px_2px_rgba(0,0,0,0.08)]`; agent bubble: keep `bg-[#DCF8C6] dark:bg-[#1A3A2A] rounded-[18px] rounded-tr-[4px]`; internal note: keep `bg-[#FFFBEF] dark:bg-[#2A2200] rounded-[18px] border border-amber-200/60`; timestamp → `DT.MICRO`; source badge (📱) → `DT.BADGE_NEUTRAL` |
| `message-input.tsx` | Input bar container → `DT.CARD_SM` flush to bottom; textarea → `border-0 bg-transparent` (no DT.TEXTAREA border since it's inside a card); send button → `DT.BTN_SM_PRIMARY`; attachment/emoji buttons → `DT.BTN_ICON` |
| `quick-reply-panel.tsx` | Popover content → `DT.CARD`; rows → `DT.LIST_ITEM_SM`; search → `DT.INPUT_SM` |
| `label-picker.tsx` | Popover content → `DT.CARD`; label chips → appropriate `DT.BADGE_*` |
| `status-selector.tsx` | Dropdown → `DT.CARD`; rows → `DT.LIST_ITEM`; open → `DT.BADGE_GREEN`; pending → `DT.BADGE_AMBER`; resolved → `DT.BADGE_NEUTRAL` |
| `transfer-picker.tsx` | Dialog → `DT.DIALOG` on DialogContent className; agent rows → `DT.LIST_ITEM`; search → `DT.INPUT_SM`; confirm → `DT.BTN_SM_PRIMARY` |
| `forward-to-branch-dialog.tsx` | Dialog → `DT.DIALOG`; department rows → `DT.LIST_ITEM`; confirm → `DT.BTN_SM_PRIMARY` |
| `message-action-menu.tsx` | Menu container → `DT.CARD`; menu items → `DT.LIST_ITEM_SM` |
| `reply-context-banner.tsx` | Banner → `DT.CARD_FLAT rounded-xl`; close → `DT.BTN_ICON_SM` |

- [ ] **Step 1: Apply tokens to conversation list components**

  `conversation-list.tsx`, `conversation-list-item.tsx`, `inbox-queue-tree.tsx`

- [ ] **Step 2: Apply tokens to thread and message components**

  `conversation-thread.tsx`, `message-bubble.tsx`, `message-input.tsx`, `reply-context-banner.tsx`

- [ ] **Step 3: Apply tokens to action panels and dialogs**

  `quick-reply-panel.tsx`, `label-picker.tsx`, `status-selector.tsx`, `transfer-picker.tsx`, `forward-to-branch-dialog.tsx`, `message-action-menu.tsx`

- [ ] **Step 4: Apply tokens to inbox pages**

  `app/(dashboard)/inbox/page.tsx`, `app/(dashboard)/inbox/[id]/page.tsx` — page-level containers, headings

- [ ] **Step 5: Verify TypeScript is clean**

```bash
cd /Users/ahmedgemmezy/Documents/WABDesk && npx tsc --noEmit
```
Expected: empty output

- [ ] **Step 6: Commit**

```bash
git add components/inbox/ app/\(dashboard\)/inbox/
git commit -m "feat(inbox): Apple design tokens — conversation list, thread, message UI"
```

---

## Task 3 — Contacts

**Files:**
- Modify: `components/contacts/add-contact-dialog.tsx`
- Modify: `components/contacts/bulk-tag-dialog.tsx`
- Modify: `components/contacts/contact-card-grid.tsx`
- Modify: `components/contacts/contact-compact-list.tsx`
- Modify: `components/contacts/contact-detail-sheet.tsx`
- Modify: `components/contacts/contact-list.tsx`
- Modify: `components/contacts/contact-panel.tsx`
- Modify: `components/contacts/contact-side-panel.tsx`
- Modify: `components/contacts/contact-table.tsx`
- Modify: `components/contacts/contact-timeline.tsx`
- Modify: `components/contacts/csv-import-dialog.tsx`
- Modify: `components/contacts/follow-up-modal.tsx`
- Modify: `app/(dashboard)/contacts/page.tsx`
- Modify: `app/(dashboard)/contacts/[id]/page.tsx`

**Rules for this task:**
- Do NOT touch CSV parsing logic (`papaparse`) or phone normalization (`libphonenumber-js`)
- Import: `import { DT } from "@/lib/design-tokens";`

**Changes per component:**

| Component | Key changes |
|-----------|------------|
| `app/(dashboard)/contacts/page.tsx` | Page header → `DT.H1`; Add Contact button → `DT.BTN_PRIMARY` |
| `contact-list.tsx` | Page search → `DT.INPUT_SM`; filter buttons → `DT.BTN_SM`; view toggle → `DT.BTN_ICON` |
| `contact-card-grid.tsx` | Card → `DT.CARD_SM`; name → `DT.H3`; phone → `DT.MUTED`; presence dot → `DT.DOT_GREEN` / `DT.DOT_GRAY`; tags → `DT.BADGE_NEUTRAL` |
| `contact-compact-list.tsx` | Rows → `DT.LIST_ITEM`; tags → `DT.BADGE_NEUTRAL` |
| `contact-table.tsx` | Table container → `rounded-2xl border border-black/[0.08] dark:border-white/[0.06]`; rows → hover `bg-black/[0.02] dark:bg-white/[0.02]`; header → `DT.SEC` |
| `contact-detail-sheet.tsx` | Sheet → `DT.SHEET` on SheetContent className; name → `DT.H3`; phone → `DT.MUTED`; field labels → `DT.LBL`; inputs → `DT.INPUT`; tags → `DT.BADGE_NEUTRAL` chips with × |
| `contact-side-panel.tsx` | Same as detail-sheet pattern |
| `contact-panel.tsx` | Panel wrapper → `DT.CARD` sidebar panel; section headers → `DT.SEC` |
| `contact-timeline.tsx` | Timeline dot → `DT.DOT_GREEN` / `DT.DOT_GRAY`; timestamp → `DT.MICRO`; event text → `DT.MUTED` |
| `add-contact-dialog.tsx` | Dialog → `DT.DIALOG` on DialogContent className; field labels → `DT.LBL`; inputs → `DT.INPUT`; save → `DT.BTN_PRIMARY`; cancel → `DT.BTN_OUTLINE` |
| `csv-import-dialog.tsx` | Dialog → `DT.DIALOG`; drop zone → `rounded-2xl border-2 border-dashed border-black/[0.12] dark:border-white/[0.10]`; progress → `bg-[#0071E3] dark:bg-[#0A84FF]`; confirm → `DT.BTN_PRIMARY` |
| `bulk-tag-dialog.tsx` | Dialog → `DT.DIALOG`; tag chips → `DT.BADGE_NEUTRAL`; add tag input → `DT.INPUT_SM`; confirm → `DT.BTN_SM_PRIMARY` |
| `follow-up-modal.tsx` | Dialog → `DT.DIALOG`; inputs → `DT.INPUT`; datetime input → `DT.INPUT`; save → `DT.BTN_PRIMARY` |

- [ ] **Step 1: Apply tokens to list and grid components**

  `contact-list.tsx`, `contact-card-grid.tsx`, `contact-compact-list.tsx`, `contact-table.tsx`

- [ ] **Step 2: Apply tokens to detail sheet and panel**

  `contact-detail-sheet.tsx`, `contact-side-panel.tsx`, `contact-panel.tsx`, `contact-timeline.tsx`

- [ ] **Step 3: Apply tokens to dialogs**

  `add-contact-dialog.tsx`, `csv-import-dialog.tsx`, `bulk-tag-dialog.tsx`, `follow-up-modal.tsx`

- [ ] **Step 4: Apply tokens to page files**

  `app/(dashboard)/contacts/page.tsx`, `app/(dashboard)/contacts/[id]/page.tsx`

- [ ] **Step 5: Verify TypeScript is clean**

```bash
cd /Users/ahmedgemmezy/Documents/WABDesk && npx tsc --noEmit
```
Expected: empty output

- [ ] **Step 6: Commit**

```bash
git add components/contacts/ app/\(dashboard\)/contacts/
git commit -m "feat(contacts): Apple design tokens — list, cards, sheet, dialogs"
```

---

## Task 4 — Settings

**Files:**
- Modify: `components/settings/add-department-dialog.tsx`
- Modify: `components/settings/assignment-mode-select.tsx`
- Modify: `components/settings/csat-settings.tsx`
- Modify: `components/settings/data-export.tsx`
- Modify: `components/settings/department-assignment-mode.tsx`
- Modify: `components/settings/department-list.tsx`
- Modify: `components/settings/department-members.tsx`
- Modify: `components/settings/forward-template-card.tsx`
- Modify: `components/settings/general-settings.tsx`
- Modify: `components/settings/invite-links.tsx`
- Modify: `components/settings/invite-modal.tsx`
- Modify: `components/settings/labels-settings.tsx`
- Modify: `components/settings/notifications-error-boundary.tsx`
- Modify: `components/settings/notifications-preferences-row.tsx`
- Modify: `components/settings/notifications-preferences.tsx`
- Modify: `components/settings/notifications-settings.tsx`
- Modify: `components/settings/notifications-tab-shell.tsx`
- Modify: `components/settings/plan-selector.tsx`
- Modify: `components/settings/role-select.tsx`
- Modify: `components/settings/settings-page-layout.tsx`
- Modify: `components/settings/settings-sub-nav.tsx`
- Modify: `components/settings/team-member-list.tsx`
- Modify: `components/settings/templates-settings.tsx`
- Modify: `components/settings/wa-business-profile.tsx`
- Modify: `app/(dashboard)/settings/page.tsx`
- Modify: `app/(dashboard)/settings/general/page.tsx`
- Modify: `app/(dashboard)/settings/team/page.tsx`
- Modify: `app/(dashboard)/settings/billing/page.tsx`
- Modify: `app/(dashboard)/settings/channels/page.tsx`
- Modify: `app/(dashboard)/settings/channels/[channelId]/page.tsx`
- Modify: `app/(dashboard)/settings/channels/[channelId]/profile/page.tsx`
- Modify: `app/(dashboard)/settings/channels/[channelId]/departments/[departmentId]/page.tsx`
- Modify: `app/(dashboard)/settings/csat/page.tsx`
- Modify: `app/(dashboard)/settings/export/page.tsx`
- Modify: `app/(dashboard)/settings/labels/page.tsx`
- Modify: `app/(dashboard)/settings/notifications/page.tsx`
- Modify: `app/(dashboard)/settings/quick-replies/page.tsx`
- Modify: `app/(dashboard)/settings/templates/page.tsx`

**Rules for this task:**
- Do NOT touch `catalog-settings.tsx` (already done)
- Do NOT touch Convex mutations or queries
- Import: `import { DT } from "@/lib/design-tokens";`

**Changes per component:**

| Component | Key changes |
|-----------|------------|
| `settings-page-layout.tsx` | Page wrapper → `DT.H1` title, `DT.MUTED` subtitle |
| `settings-sub-nav.tsx` | Sub-nav container → `bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl p-1`; active tab → `DT.SIDEBAR_ITEM_ACTIVE`; inactive → `DT.SIDEBAR_ITEM` |
| `general-settings.tsx` | Section cards → `DT.CARD`; section header → `DT.H3 + DT.DIVIDER`; field labels → `DT.LBL`; inputs → `DT.INPUT`; save → `DT.BTN_PRIMARY` |
| `plan-selector.tsx` | Plan card → `DT.CARD`; recommended plan → `DT.CARD + ring-2 ring-[#0071E3] dark:ring-[#0A84FF]`; price → `text-[32px] font-semibold tracking-[-0.5px]`; upgrade → `DT.BTN_SM_PRIMARY`; current → `DT.BTN_SM` |
| `team-member-list.tsx` | Member rows → `DT.LIST_ITEM`; role badge → `DT.BADGE_BLUE` (admin) / `DT.BADGE_AMBER` (supervisor) / `DT.BADGE_NEUTRAL` (agent); remove button → `DT.BTN_ICON` |
| `invite-modal.tsx` | Dialog → `DT.DIALOG`; email input → `DT.INPUT`; role select → `DT.SELECT`; send → `DT.BTN_PRIMARY` |
| `invite-links.tsx` | Card → `DT.CARD`; link display → `DT.CARD_FLAT font-mono text-[13px]`; copy button → `DT.BTN_ICON_SM`; generate → `DT.BTN_SM_PRIMARY` |
| `labels-settings.tsx` | Label rows → `DT.LIST_ITEM`; color dot → `size-3 rounded-full`; edit/delete → `DT.BTN_ICON`; add dialog → `DT.DIALOG`; label input → `DT.INPUT`; save → `DT.BTN_SM_PRIMARY` |
| `csat-settings.tsx` | Card → `DT.CARD`; toggle rows → `DT.LIST_ITEM`; inputs → `DT.INPUT`; section header → `DT.H3` |
| `data-export.tsx` | Card → `DT.CARD`; export buttons → `DT.BTN_SM_PRIMARY`; progress bar → `bg-[#0071E3] dark:bg-[#0A84FF]`; download link → `DT.BTN_SM` |
| `wa-business-profile.tsx` | Card → `DT.CARD`; field labels → `DT.LBL`; inputs → `DT.INPUT`; textarea → `DT.TEXTAREA`; pending badge → `DT.BADGE_AMBER`; save → `DT.BTN_PRIMARY` |
| `notifications-settings.tsx` | Section card → `DT.CARD`; toggle rows → `DT.LIST_ITEM` |
| `notifications-preferences-row.tsx` | Row container → `DT.LIST_ITEM`; label → `DT.BODY`; description → `DT.MUTED` |
| `role-select.tsx` | Trigger → `DT.SELECT`; keep shadcn Select wrapper |
| `assignment-mode-select.tsx` | Trigger → `DT.SELECT`; keep shadcn Select wrapper |
| `department-list.tsx` | Department rows → `DT.LIST_ITEM`; add → `DT.BTN_SM_PRIMARY`; delete → `DT.BTN_ICON` |
| `add-department-dialog.tsx` | Dialog → `DT.DIALOG`; input → `DT.INPUT`; save → `DT.BTN_PRIMARY` |
| `department-members.tsx` | Member rows → `DT.LIST_ITEM`; add member → `DT.BTN_SM_PRIMARY` |
| `forward-template-card.tsx` | Card → `DT.CARD_SM`; template name → `DT.H3`; body → `DT.MUTED`; select → `DT.BTN_SM_PRIMARY` |
| `templates-settings.tsx` | Template rows → `DT.LIST_ITEM`; add → `DT.BTN_SM_PRIMARY`; edit/delete → `DT.BTN_ICON`; form dialog → `DT.DIALOG`; inputs → `DT.INPUT`; textarea → `DT.TEXTAREA` |

- [ ] **Step 1: Apply tokens to layout and nav components**

  `settings-page-layout.tsx`, `settings-sub-nav.tsx`

- [ ] **Step 2: Apply tokens to general and profile settings**

  `general-settings.tsx`, `wa-business-profile.tsx`

- [ ] **Step 3: Apply tokens to billing/plan components**

  `plan-selector.tsx`

- [ ] **Step 4: Apply tokens to team management components**

  `team-member-list.tsx`, `invite-modal.tsx`, `invite-links.tsx`, `role-select.tsx`

- [ ] **Step 5: Apply tokens to label, CSAT, export, notifications, and department components**

  `labels-settings.tsx`, `csat-settings.tsx`, `data-export.tsx`, `notifications-settings.tsx`, `notifications-preferences.tsx`, `notifications-preferences-row.tsx`, `notifications-tab-shell.tsx`, `notifications-error-boundary.tsx`, `assignment-mode-select.tsx`, `department-list.tsx`, `add-department-dialog.tsx`, `department-members.tsx`, `department-assignment-mode.tsx`, `forward-template-card.tsx`, `templates-settings.tsx`

- [ ] **Step 6: Apply tokens to settings pages**

  All `app/(dashboard)/settings/**/page.tsx` pages

- [ ] **Step 7: Verify TypeScript is clean**

```bash
cd /Users/ahmedgemmezy/Documents/WABDesk && npx tsc --noEmit
```
Expected: empty output

- [ ] **Step 8: Commit**

```bash
git add components/settings/ app/\(dashboard\)/settings/
git commit -m "feat(settings): Apple design tokens — all settings pages and components"
```

---

## Task 5 — Broadcasts + Templates

**Files:**
- Modify: `components/broadcasts/broadcast-template-builder.tsx`
- Modify: `components/broadcasts/broadcast-template-card.tsx`
- Modify: `components/broadcasts/broadcast-templates-tab.tsx`
- Modify: `components/broadcasts/broadcasts-page.tsx`
- Modify: `components/broadcasts/create-broadcast-modal.tsx`
- Modify: `components/broadcasts/create-broadcast-wizard.tsx`
- Modify: `components/broadcasts/whatsapp-template-preview.tsx`
- Modify: `components/templates/library-template-card.tsx`
- Modify: `components/templates/library-template-preview.tsx`
- Modify: `components/templates/meta-submit-form.tsx`
- Modify: `components/templates/template-library-tab.tsx`
- Modify: `components/templates/template-picker.tsx`
- Modify: `app/(dashboard)/broadcasts/page.tsx`
- Modify: `app/(dashboard)/broadcasts/new/page.tsx`

**Rules for this task:**
- Do NOT touch Meta template API call logic
- Do NOT touch broadcast send logic or message status tracking
- Import: `import { DT } from "@/lib/design-tokens";`

**Changes per component:**

| Component | Key changes |
|-----------|------------|
| `broadcasts-page.tsx` | Page header → `DT.H1`; New Broadcast → `DT.BTN_PRIMARY`; list container → spacing + background |
| `broadcast-template-card.tsx` | Card → `DT.CARD_SM`; status badge → `DT.BADGE_*`; actions → `DT.BTN_ICON` |
| `broadcast-templates-tab.tsx` | Tab container → standard layout; search → `DT.INPUT_SM`; filter → `DT.BTN_SM` |
| `create-broadcast-wizard.tsx` | Wizard outer → `DT.CARD` centered `max-w-2xl`; step circles: complete → `bg-[#0071E3] text-white dark:bg-[#0A84FF]`; current → `ring-2 ring-[#0071E3] dark:ring-[#0A84FF]`; upcoming → `bg-black/[0.06] dark:bg-white/[0.08]`; step connectors → `DT.DIVIDER` horizontal line; primary action → `DT.BTN_PRIMARY`; back → `DT.BTN_OUTLINE` |
| `create-broadcast-modal.tsx` | Dialog → `DT.DIALOG`; confirm → `DT.BTN_PRIMARY`; cancel → `DT.BTN_OUTLINE` |
| `broadcast-template-builder.tsx` | Outer card → `DT.CARD`; textarea → `DT.TEXTAREA`; variable chips → `DT.BADGE_BLUE` with `{{var}}` format; add variable button → `DT.BTN_SM_PRIMARY` |
| `whatsapp-template-preview.tsx` | iPhone frame → `rounded-[44px] border-[8px] border-[#1D1D1F] dark:border-[#2C2C2E] bg-white dark:bg-black`; message bubble inside → keep WhatsApp green `#DCF8C6 dark:#1A3A2A` |
| `template-library-tab.tsx` | Search → `DT.INPUT_SM`; filter chips → `DT.BADGE_NEUTRAL` (all) / `DT.BADGE_BLUE` (active) |
| `library-template-card.tsx` | Card → `DT.CARD_SM`; language badge → `DT.BADGE_NEUTRAL`; category badge → `DT.BADGE_AMBER`; select/use → `DT.BTN_SM_PRIMARY` |
| `library-template-preview.tsx` | Preview container → `DT.CARD`; close → `DT.BTN_ICON` |
| `meta-submit-form.tsx` | Dialog → `DT.DIALOG`; inputs → `DT.INPUT`; pending status → `DT.BADGE_AMBER`; submit → `DT.BTN_PRIMARY` |
| `template-picker.tsx` | Popover content → `DT.CARD max-w-sm`; search → `DT.INPUT_SM`; category section headers → `DT.SEC`; template rows → `DT.LIST_ITEM_SM` |

- [ ] **Step 1: Apply tokens to broadcast list and wizard components**

  `broadcasts-page.tsx`, `broadcast-template-card.tsx`, `broadcast-templates-tab.tsx`, `create-broadcast-wizard.tsx`, `create-broadcast-modal.tsx`

- [ ] **Step 2: Apply tokens to template builder and preview**

  `broadcast-template-builder.tsx`, `whatsapp-template-preview.tsx`

- [ ] **Step 3: Apply tokens to template library components**

  `template-library-tab.tsx`, `library-template-card.tsx`, `library-template-preview.tsx`, `meta-submit-form.tsx`, `template-picker.tsx`

- [ ] **Step 4: Apply tokens to broadcast pages**

  `app/(dashboard)/broadcasts/page.tsx`, `app/(dashboard)/broadcasts/new/page.tsx`

- [ ] **Step 5: Verify TypeScript is clean**

```bash
cd /Users/ahmedgemmezy/Documents/WABDesk && npx tsc --noEmit
```
Expected: empty output

- [ ] **Step 6: Commit**

```bash
git add components/broadcasts/ components/templates/ app/\(dashboard\)/broadcasts/
git commit -m "feat(broadcasts): Apple design tokens — wizard, template builder, picker"
```

---

## Task 6 — Automations

**Files:**
- Modify: `components/automations/AutomationRuleCard.tsx`
- Modify: `components/automations/AutomationRuleForm.tsx`
- Modify: `components/automations/AutomationRulesClient.tsx`
- Modify: `components/automations/BusinessHoursForm.tsx`
- Modify: `app/(dashboard)/automations/page.tsx`

**Rules for this task:**
- Do NOT touch Convex automation rule engine (`convex/automations.ts`)
- Import: `import { DT } from "@/lib/design-tokens";`

**Changes per component:**

| Component | Key changes |
|-----------|------------|
| `AutomationRulesClient.tsx` | Page header → `DT.H1`; add rule button → `DT.BTN_SM_PRIMARY`; section tabs → `DT.BTN_SM` segmented; empty state → `DT.MUTED` + `DT.BTN_SM_PRIMARY` |
| `AutomationRuleCard.tsx` | Card → `DT.CARD_SM`; disabled state → `opacity-60`; toggle row → `DT.LIST_ITEM` layout; trigger chip → `DT.BADGE_BLUE`; action chip → `DT.BADGE_GREEN`; edit/delete → `DT.BTN_ICON` |
| `AutomationRuleForm.tsx` | Dialog → `DT.DIALOG`; select fields → `DT.SELECT` (keep shadcn Select wrapper); text inputs → `DT.INPUT`; section labels → `DT.LBL`; save → `DT.BTN_PRIMARY`; cancel → `DT.BTN_OUTLINE` |
| `BusinessHoursForm.tsx` | Card → `DT.CARD`; day rows → `DT.LIST_ITEM` layout; checkbox → keep shadcn; time inputs → `DT.INPUT_SM`; save → `DT.BTN_PRIMARY` |

- [ ] **Step 1: Apply tokens to rule list and card**

  `AutomationRulesClient.tsx`, `AutomationRuleCard.tsx`

- [ ] **Step 2: Apply tokens to form and business hours**

  `AutomationRuleForm.tsx`, `BusinessHoursForm.tsx`

- [ ] **Step 3: Apply tokens to automations page**

  `app/(dashboard)/automations/page.tsx`

- [ ] **Step 4: Verify TypeScript is clean**

```bash
cd /Users/ahmedgemmezy/Documents/WABDesk && npx tsc --noEmit
```
Expected: empty output

- [ ] **Step 5: Commit**

```bash
git add components/automations/ app/\(dashboard\)/automations/
git commit -m "feat(automations): Apple design tokens — rule cards, form, business hours"
```

---

## Task 7 — Analytics

**Files:**
- Modify: `components/analytics/agent-my-stats.tsx`
- Modify: `components/analytics/agent-performance-table.tsx`
- Modify: `components/analytics/analytics-dashboard.tsx`
- Modify: `components/analytics/analytics-upsell-teaser.tsx`
- Modify: `components/analytics/contact-activity-timeline.tsx`
- Modify: `components/analytics/customer-lifecycle-chart.tsx`
- Modify: `components/analytics/date-range-picker.tsx`
- Modify: `components/analytics/label-distribution-chart.tsx`
- Modify: `components/analytics/revenue-widget.tsx`
- Modify: `components/analytics/stage-funnel-chart.tsx`
- Modify: `components/analytics/team-summary-cards.tsx`
- Modify: `components/analytics/volume-chart.tsx`
- Modify: `app/(dashboard)/analytics/page.tsx`
- Modify: `app/(dashboard)/my-stats/page.tsx`

**Rules for this task:**
- Do NOT touch Recharts/chart library internals, data structures, or Convex queries
- Import: `import { DT } from "@/lib/design-tokens";`

**Changes per component:**

| Component | Key changes |
|-----------|------------|
| `analytics-dashboard.tsx` | Page header → `DT.H1`; section headers → `DT.H2`; export → `DT.BTN_OUTLINE` |
| `team-summary-cards.tsx` | Stat card → `DT.CARD_SM`; value → `text-[32px] font-semibold tracking-[-0.5px] text-[#1D1D1F] dark:text-white`; label → `DT.MICRO`; trend up → `text-[#34C759] dark:text-[#30D158]`; trend down → `text-[#FF3B30] dark:text-[#FF453A]` |
| `volume-chart.tsx` | Chart wrapper → `DT.CARD`; chart colors → `["#0071E3","#34C759","#FF9500","#FF3B30","#AF52DE","#5AC8FA"]` |
| `label-distribution-chart.tsx` | Same chart wrapper and color scheme |
| `customer-lifecycle-chart.tsx` | Same chart wrapper and color scheme |
| `stage-funnel-chart.tsx` | Same chart wrapper and color scheme |
| `date-range-picker.tsx` | Button group container → `bg-black/[0.04] dark:bg-white/[0.06] rounded-xl p-1`; active segment → `bg-white shadow-sm text-[#0071E3] dark:bg-white/[0.10] dark:text-[#0A84FF]`; inactive → `DT.MUTED` |
| `agent-performance-table.tsx` | Table container → `rounded-2xl border border-black/[0.08] dark:border-white/[0.06]`; header → `DT.SEC`; rows → `DT.LIST_ITEM`; agent avatar → `rounded-full`; CSAT stars → filled `text-[#FF9500]` / empty `text-black/[0.15] dark:text-white/[0.15]` |
| `agent-my-stats.tsx` | Widget cards → `DT.CARD_SM`; values → `text-[32px] font-semibold tracking-[-0.5px]` |
| `analytics-upsell-teaser.tsx` | Container → `DT.CARD`; upgrade CTA → `DT.BTN_SM_PRIMARY` |
| `revenue-widget.tsx` | Widget → `DT.CARD_SM`; value → `text-[32px] font-semibold tracking-[-0.5px]` |
| `contact-activity-timeline.tsx` | Timeline dot → `DT.DOT_GREEN` / `DT.DOT_GRAY`; timestamp → `DT.MICRO` |

- [ ] **Step 1: Apply tokens to dashboard and stat card components**

  `analytics-dashboard.tsx`, `team-summary-cards.tsx`, `agent-my-stats.tsx`, `revenue-widget.tsx`, `analytics-upsell-teaser.tsx`

- [ ] **Step 2: Apply tokens to chart wrappers**

  `volume-chart.tsx`, `label-distribution-chart.tsx`, `customer-lifecycle-chart.tsx`, `stage-funnel-chart.tsx`

- [ ] **Step 3: Apply tokens to date range picker and performance table**

  `date-range-picker.tsx`, `agent-performance-table.tsx`, `contact-activity-timeline.tsx`

- [ ] **Step 4: Apply tokens to analytics pages**

  `app/(dashboard)/analytics/page.tsx`, `app/(dashboard)/my-stats/page.tsx`

- [ ] **Step 5: Verify TypeScript is clean**

```bash
cd /Users/ahmedgemmezy/Documents/WABDesk && npx tsc --noEmit
```
Expected: empty output

- [ ] **Step 6: Commit**

```bash
git add components/analytics/ app/\(dashboard\)/analytics/ app/\(dashboard\)/my-stats/
git commit -m "feat(analytics): Apple design tokens — stat cards, charts, performance table"
```

---

## Task 8 — Onboarding

**Files:**
- Modify: `components/onboarding/channel-status-badge.tsx`
- Modify: `components/onboarding/embedded-signup-button.tsx`
- Modify: `components/onboarding/onboarding-wizard.tsx`
- Modify: `components/onboarding/step-complete.tsx`
- Modify: `components/onboarding/step-connect-whatsapp.tsx`
- Modify: `components/onboarding/step-invite-team.tsx`
- Modify: `components/onboarding/step-progress.tsx`
- Modify: `components/onboarding/step-workspace-name.tsx`
- Modify: `app/(dashboard)/onboarding/page.tsx` (if it exists)
- Modify: `app/onboarding/page.tsx`

**Rules for this task:**
- Do NOT touch the onboarding state machine (step progression logic)
- Do NOT touch Convex mutations called during onboarding
- Import: `import { DT } from "@/lib/design-tokens";`

**Changes per component:**

| Component | Key changes |
|-----------|------------|
| `onboarding-wizard.tsx` | Outer container → `DT.CARD max-w-lg mx-auto`; section wrapper → `p-8` |
| `step-progress.tsx` | Track → `rounded-full bg-black/[0.08] dark:bg-white/[0.10] h-1`; fill → `bg-[#0071E3] dark:bg-[#0A84FF] rounded-full h-1`; step circles: done → `bg-[#0071E3] dark:bg-[#0A84FF] text-white`; current → `ring-2 ring-[#0071E3] dark:ring-[#0A84FF] bg-white dark:bg-[#1C1C1E]`; future → `bg-black/[0.06] dark:bg-white/[0.08] text-[#6E6E73]` |
| `step-workspace-name.tsx` | Label → `DT.LBL`; input → `DT.INPUT`; next → `DT.BTN_PRIMARY w-full` |
| `step-connect-whatsapp.tsx` | Info box → `DT.INFO_BOX`; next/skip layout → `DT.BTN_PRIMARY` + `DT.MUTED underline` skip link |
| `embedded-signup-button.tsx` | Button → `DT.BTN_PRIMARY w-full` |
| `channel-status-badge.tsx` | Connected → `DT.DOT_GREEN + DT.MUTED`; pending → `DT.DOT_AMBER + DT.MUTED` |
| `step-invite-team.tsx` | Input → `DT.INPUT`; invite → `DT.BTN_SM_PRIMARY`; skip → `DT.MUTED underline`; added member rows → `DT.LIST_ITEM` |
| `step-complete.tsx` | Success icon → `rounded-full size-16 bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] dark:text-[#30D158] flex items-center justify-center`; title → `DT.H2`; body → `DT.MUTED`; CTA → `DT.BTN_PRIMARY w-full` |

- [ ] **Step 1: Apply tokens to wizard container and progress indicator**

  `onboarding-wizard.tsx`, `step-progress.tsx`

- [ ] **Step 2: Apply tokens to each wizard step**

  `step-workspace-name.tsx`, `step-connect-whatsapp.tsx`, `embedded-signup-button.tsx`, `channel-status-badge.tsx`, `step-invite-team.tsx`, `step-complete.tsx`

- [ ] **Step 3: Apply tokens to onboarding pages**

  `app/onboarding/page.tsx` (and `app/(dashboard)/onboarding/page.tsx` if present)

- [ ] **Step 4: Verify TypeScript is clean**

```bash
cd /Users/ahmedgemmezy/Documents/WABDesk && npx tsc --noEmit
```
Expected: empty output

- [ ] **Step 5: Commit**

```bash
git add components/onboarding/ app/onboarding/ app/\(dashboard\)/onboarding/
git commit -m "feat(onboarding): Apple design tokens — wizard, steps, progress bar"
```

---

## Task 9 — Marketing + Remaining Auth Pages

**Files:**
- Modify: `components/marketing/cookies-content.tsx`
- Modify: `components/marketing/differentiators-section.tsx`
- Modify: `components/marketing/dpa-content.tsx`
- Modify: `components/marketing/features-section.tsx`
- Modify: `components/marketing/hero-section.tsx`
- Modify: `components/marketing/legal-page-wrapper.tsx`
- Modify: `components/marketing/marketing-footer.tsx`
- Modify: `components/marketing/marketing-nav.tsx`
- Modify: `components/marketing/marketing-page.tsx`
- Modify: `components/marketing/mobile-nav-sheet.tsx`
- Modify: `components/marketing/pricing-section.tsx`
- Modify: `components/marketing/privacy-content.tsx`
- Modify: `components/marketing/terms-content.tsx`
- Modify: `app/page.tsx`
- Modify: `app/cookies/page.tsx`
- Modify: `app/dpa/page.tsx`
- Modify: `app/privacy/page.tsx`
- Modify: `app/terms/page.tsx`
- Modify: `app/(auth)/forgot-password/page.tsx`
- Modify: `app/(auth)/reset-password/page.tsx`

**Rules for this task:**
- Do NOT touch i18n string content (text inside `t("...")` calls)
- Do NOT touch legal copy text
- Do NOT touch `app/(auth)/sign-in/page.tsx` or `app/(auth)/sign-up/page.tsx`
- Import: `import { DT } from "@/lib/design-tokens";`

**Changes per component:**

| Component | Key changes |
|-----------|------------|
| `marketing-nav.tsx` | Container → `bg-white/80 backdrop-blur-xl border-b border-black/[0.06] dark:bg-[#111111]/80 dark:border-white/[0.05] sticky top-0 z-50`; logo text → `DT.H3`; links → `DT.MUTED hover:text-[#1D1D1F] dark:hover:text-white transition-colors`; CTA → `DT.BTN_SM_PRIMARY` |
| `mobile-nav-sheet.tsx` | SheetContent → `DT.SHEET`; nav items → `DT.LIST_ITEM`; CTA → `DT.BTN_PRIMARY w-full` |
| `hero-section.tsx` | Section background → `bg-[#F5F5F7] dark:bg-[#111111]`; headline → `text-[48px] font-semibold tracking-[-1px] text-[#1D1D1F] dark:text-white`; subheadline → `DT.MUTED text-[18px]`; CTA → `DT.BTN_PRIMARY px-8 py-3 text-[16px]`; secondary CTA → `DT.BTN_OUTLINE px-8 py-3 text-[16px]` |
| `features-section.tsx` | Section background → `bg-white dark:bg-[#000000]`; feature card → `DT.CARD_SM`; icon container → `rounded-2xl bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 p-3 text-[#0071E3] dark:text-[#0A84FF]`; feature title → `DT.H3`; feature body → `DT.MUTED` |
| `differentiators-section.tsx` | Same approach as features-section |
| `pricing-section.tsx` | Section background → `bg-[#F5F5F7] dark:bg-[#111111]`; plan card → `DT.CARD`; recommended card → `DT.CARD + ring-2 ring-[#0071E3] dark:ring-[#0A84FF]`; plan badge → `DT.BADGE_BLUE`; price → `text-[40px] font-semibold tracking-[-0.5px]`; upgrade CTA → `DT.BTN_SM_PRIMARY w-full`; feature list checkmarks → `text-[#34C759] dark:text-[#30D158]` |
| `marketing-footer.tsx` | Container → `bg-[#F5F5F7] dark:bg-[#111111] border-t border-black/[0.06] dark:border-white/[0.05]`; links → `DT.MUTED hover:text-[#1D1D1F] dark:hover:text-white transition-colors`; section headers → `DT.SEC` |
| `legal-page-wrapper.tsx` | Container → `DT.CARD max-w-3xl mx-auto`; title → `DT.H1`; back link → `DT.MUTED` |
| `app/(auth)/forgot-password/page.tsx` | Apply same Apple auth card pattern as sign-in: centered `DT.CARD max-w-sm`; title → `DT.H2`; email input → `DT.INPUT`; submit → `DT.BTN_PRIMARY w-full`; back link → `DT.MUTED` |
| `app/(auth)/reset-password/page.tsx` | Same Apple auth card pattern: centered `DT.CARD max-w-sm`; title → `DT.H2`; password inputs → `DT.INPUT`; submit → `DT.BTN_PRIMARY w-full` |

- [ ] **Step 1: Apply tokens to marketing nav and hero**

  `marketing-nav.tsx`, `mobile-nav-sheet.tsx`, `hero-section.tsx`, `marketing-page.tsx`

- [ ] **Step 2: Apply tokens to features, differentiators, and pricing**

  `features-section.tsx`, `differentiators-section.tsx`, `pricing-section.tsx`

- [ ] **Step 3: Apply tokens to footer and legal pages**

  `marketing-footer.tsx`, `legal-page-wrapper.tsx`, `privacy-content.tsx`, `terms-content.tsx`, `cookies-content.tsx`, `dpa-content.tsx`

- [ ] **Step 4: Apply tokens to remaining app pages**

  `app/page.tsx`, `app/cookies/page.tsx`, `app/dpa/page.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx`

- [ ] **Step 5: Apply Apple auth card pattern to forgot/reset password pages**

  `app/(auth)/forgot-password/page.tsx`, `app/(auth)/reset-password/page.tsx`

  Pattern to apply (match sign-in style):
  ```tsx
  <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#111111] flex items-center justify-center p-4">
    <div className={`${DT.CARD} w-full max-w-sm p-8`}>
      <h1 className={DT.H2}>...</h1>
      {/* form fields */}
      <label className={DT.LBL}>...</label>
      <input className={DT.INPUT} />
      <button className={`${DT.BTN_PRIMARY} w-full mt-4`}>...</button>
    </div>
  </div>
  ```

- [ ] **Step 6: Verify TypeScript is clean**

```bash
cd /Users/ahmedgemmezy/Documents/WABDesk && npx tsc --noEmit
```
Expected: empty output

- [ ] **Step 7: Commit**

```bash
git add components/marketing/ app/page.tsx app/cookies/ app/dpa/ app/privacy/ app/terms/ app/\(auth\)/forgot-password/ app/\(auth\)/reset-password/
git commit -m "feat(marketing): Apple design tokens — nav, hero, pricing, auth pages"
```

---

## Task 10 — Catalog Browser, AI Assistant, Lists, Team

**Files:**
- Modify: `components/catalog/catalog-browser.tsx`
- Modify: `components/ai-assistant/ai-assistant-settings.tsx`
- Modify: `components/lists/create-list-dialog.tsx`
- Modify: `components/lists/list-card.tsx`
- Modify: `components/lists/list-detail.tsx`
- Modify: `components/lists/lists-page.tsx`
- Modify: `components/team/member-profile-modal.tsx`
- Modify: `components/team/member-profile/analytics-tab.tsx`
- Modify: `components/team/member-profile/history-tab.tsx`
- Modify: `components/team/member-profile/manage-tab.tsx`
- Modify: `components/team/member-profile/overview-tab.tsx`
- Modify: `app/(dashboard)/ai-assistant/page.tsx`
- Modify: `app/(dashboard)/lists/page.tsx`
- Modify: `app/(dashboard)/lists/[id]/page.tsx`

**Rules for this task:**
- Do NOT touch `catalog-settings.tsx` (already done)
- Do NOT touch Convex queries, mutation logic, or AI assistant inference calls
- Import: `import { DT } from "@/lib/design-tokens";`

**Changes per component:**

| Component | Key changes |
|-----------|------------|
| `catalog-browser.tsx` | Page header → `DT.H1`; search → `DT.INPUT_SM`; product tile → `DT.CARD_SM`; product image → `rounded-xl`; product name → `DT.H3`; price → `DT.BODY font-medium`; add to msg → `DT.BTN_SM_PRIMARY` |
| `ai-assistant-settings.tsx` | Card → `DT.CARD`; inputs → `DT.INPUT`; textarea → `DT.TEXTAREA`; save → `DT.BTN_PRIMARY`; labels → `DT.LBL` |
| `lists-page.tsx` | Header → `DT.H1`; create list → `DT.BTN_PRIMARY`; empty state → `DT.MUTED + DT.BTN_SM_PRIMARY` |
| `list-card.tsx` | Card → `DT.CARD_SM`; title → `DT.H3`; count badge → `DT.BADGE_NEUTRAL`; actions → `DT.BTN_ICON` |
| `list-detail.tsx` | Header → `DT.H2`; container → `DT.CARD`; contact rows → `DT.LIST_ITEM`; remove → `DT.BTN_ICON` |
| `create-list-dialog.tsx` | Dialog → `DT.DIALOG`; input → `DT.INPUT`; label → `DT.LBL`; save → `DT.BTN_PRIMARY`; cancel → `DT.BTN_OUTLINE` |
| `member-profile-modal.tsx` | Dialog → `DT.DIALOG` on DialogContent className; header → `DT.H3` name; role badge → `DT.BADGE_BLUE` / `DT.BADGE_NEUTRAL`; tab nav → `DT.BTN_SM` segmented, active `bg-white shadow-sm dark:bg-white/[0.10]` |
| `overview-tab.tsx` | Stat widgets → `DT.CARD_SM` (same as analytics widgets) |
| `analytics-tab.tsx` | Chart containers → `DT.CARD`; stat widgets → `DT.CARD_SM` |
| `history-tab.tsx` | Conversation rows → `DT.LIST_ITEM`; timestamp → `DT.MICRO` |
| `manage-tab.tsx` | Toggle rows → `DT.LIST_ITEM`; inputs → `DT.INPUT`; danger actions → `DT.BTN_DESTRUCTIVE`; save → `DT.BTN_PRIMARY` |

- [ ] **Step 1: Apply tokens to catalog browser**

  `catalog-browser.tsx`

- [ ] **Step 2: Apply tokens to AI assistant**

  `ai-assistant-settings.tsx`, `app/(dashboard)/ai-assistant/page.tsx`

- [ ] **Step 3: Apply tokens to lists components and pages**

  `lists-page.tsx`, `list-card.tsx`, `list-detail.tsx`, `create-list-dialog.tsx`, `app/(dashboard)/lists/page.tsx`, `app/(dashboard)/lists/[id]/page.tsx`

- [ ] **Step 4: Apply tokens to team member profile**

  `member-profile-modal.tsx`, `overview-tab.tsx`, `analytics-tab.tsx`, `history-tab.tsx`, `manage-tab.tsx`

- [ ] **Step 5: Verify TypeScript is clean**

```bash
cd /Users/ahmedgemmezy/Documents/WABDesk && npx tsc --noEmit
```
Expected: empty output

- [ ] **Step 6: Commit**

```bash
git add components/catalog/ components/ai-assistant/ components/lists/ components/team/ app/\(dashboard\)/ai-assistant/ app/\(dashboard\)/lists/
git commit -m "feat(misc): Apple design tokens — catalog browser, lists, team profile, AI assistant"
```

---

## Task 11 — Coordinator: Validation + PROGRESS.md

**This task runs after Tasks 1–10 are all complete.**

**Files:**
- Read-only: all changed files
- Modify: `PROGRESS.md`

- [ ] **Step 1: Run full TypeScript check**

```bash
cd /Users/ahmedgemmezy/Documents/WABDesk && npx tsc --noEmit
```
Expected: empty output (zero errors). If errors exist, fix them before proceeding.

- [ ] **Step 2: Verify no inline Apple color strings outside design-tokens.ts**

```bash
grep -r "#0071E3" /Users/ahmedgemmezy/Documents/WABDesk/components/ --include="*.tsx" --include="*.ts" -l
grep -r "#1D1D1F" /Users/ahmedgemmezy/Documents/WABDesk/components/ --include="*.tsx" --include="*.ts" -l
grep -r "rounded-\[22px\]" /Users/ahmedgemmezy/Documents/WABDesk/components/ --include="*.tsx" --include="*.ts" -l
```
Expected: each grep returns either no output OR only `lib/design-tokens.ts`. Any component file appearing means that component still has inline Apple strings — fix them.

- [ ] **Step 3: Verify protected files were not touched**

```bash
git diff HEAD -- app/\(auth\)/sign-in/page.tsx app/\(auth\)/sign-up/page.tsx components/settings/catalog-settings.tsx
```
Expected: empty diff (no changes to these three files)

- [ ] **Step 4: Verify dark mode coverage**

```bash
grep -r "bg-white\"" /Users/ahmedgemmezy/Documents/WABDesk/components/ --include="*.tsx" -l
```
For each file returned: confirm that either it's inside a dark-mode conditional or the component has a corresponding `dark:bg-` class nearby. Fix any bare `bg-white` without a dark variant.

- [ ] **Step 5: Write PROGRESS.md entry**

Add the following entry to `PROGRESS.md` under the most recent entry:

```markdown
## 032-apple-design-revamp

Full-app Apple design token revamp applied to all WABDesk UI surfaces.

**Scope:** 12 tasks across 10 domain agents + foundation + coordinator
**Files changed:** ~120 component and page files

**What was done:**
- Created `lib/design-tokens.ts` — single DT token source for all Apple class constants
- Agent 1 (Shell): app-sidebar, user-menu, notification bell, channel switcher, locale switcher, role badge, past-due banner, profile modal, breadcrumb, bottom-nav
- Agent 2 (Inbox): conversation list, message bubbles, message input, quick reply, label picker, transfer picker, status selector, action menu, reply context banner
- Agent 3 (Contacts): contact cards/table/sheet, timeline, add dialog, CSV import, bulk tag, follow-up modal
- Agent 4 (Settings): all settings pages — general, billing, team, channels, CSAT, export, labels, notifications, templates, departments, WA profile
- Agent 5 (Broadcasts + Templates): broadcast wizard, template builder, iPhone preview, template picker, meta submit form
- Agent 6 (Automations): rule cards, rule form, business hours form
- Agent 7 (Analytics): stat widgets, chart containers, performance table, date range picker, CSAT stars
- Agent 8 (Onboarding): wizard container, step progress bar, all wizard steps, success screen
- Agent 9 (Marketing + Auth): marketing nav, hero, features, pricing, footer, legal pages, forgot/reset password auth pages
- Agent 10 (Misc): catalog browser, AI assistant, lists, team member profile tabs

**Design tokens applied:**
- DT.INPUT / INPUT_SM / INPUT_XS — all form inputs
- DT.BTN_PRIMARY / BTN_OUTLINE / BTN_SM / BTN_SM_PRIMARY / BTN_ICON / BTN_ICON_SM / BTN_DESTRUCTIVE — all buttons
- DT.CARD / CARD_SM / CARD_FLAT — all containers
- DT.DIALOG / SHEET / DIALOG_FOOTER — all overlays
- DT.BADGE_* — all status and category badges
- DT.SIDEBAR_BG / SIDEBAR_ITEM / SIDEBAR_ITEM_ACTIVE — sidebar navigation
- Full dark mode on all tokens

**Did NOT modify:**
- `app/(auth)/sign-in/page.tsx` (already Apple-styled)
- `app/(auth)/sign-up/page.tsx` (already Apple-styled)
- `components/settings/catalog-settings.tsx` (already Apple-styled)
- Any Convex files
- Any `components/ui/*` files
```

- [ ] **Step 6: Commit PROGRESS.md**

```bash
git add PROGRESS.md
git commit -m "docs: PROGRESS.md entry for apple-design-revamp (032)"
```

---

## Coding Rules Reminder (All Tasks)

1. **Import DT** — `import { DT } from "@/lib/design-tokens";` at top of every edited file
2. **No inline Apple strings** — no `#0071E3`, `#1D1D1F`, `rounded-[22px]` outside `design-tokens.ts`
3. **Keep shadcn structural components** — `Dialog`, `Sheet`, `AlertDialog`, `Select`, `Switch`, `Popover` stay as shadcn; only their `className` prop is overridden
4. **Replace with native HTML** — `Button`, `Input`, `Label`, `Separator` from shadcn get replaced with `<button>`, `<input>`, `<label>`, `<div>` using DT classes
5. **Full dark mode** — every `bg-white` needs `dark:bg-[#1C1C1E]`, every `text-[#1D1D1F]` needs `dark:text-white`
6. **RTL-safe** — use `ps-`/`pe-`/`ms-`/`me-` not `pl-`/`pr-`/`ml-`/`mr-`; `rounded-s-*`/`rounded-e-*` not `rounded-l-*`/`rounded-r-*`
7. **No logic changes** — state, hooks, Convex calls, event handlers: untouched
8. **TypeScript strict** — no `any` types; `npx tsc --noEmit` must be clean per task
