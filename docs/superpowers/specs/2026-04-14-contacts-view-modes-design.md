# Contacts Page — Multi-View Modes Design

**Date:** 2026-04-14
**Branch:** 009-automation-rules (feature branch to be cut from here)
**Status:** Approved

---

## Overview

The contacts page currently has a single card grid layout. This spec adds two additional view modes — Table and Compact List — giving agents the flexibility to browse contacts in the density and format they prefer. The chosen view is remembered across sessions via localStorage.

---

## Views

### 1. Cards Grid *(existing)*
Rich visual cards, 4-column responsive grid. Avatar, name, phone, stage badge (dropdown), location, tags (max 2 + overflow), spend, view-profile link. Best for browsing and exploring contacts visually.

### 2. Table *(new)*
Dense data table. Best for power users and admins managing large contact lists who prefer columnar data.

**Columns:**

| Column | Width | Notes |
|---|---|---|
| Checkbox | 40px | Bulk select |
| Name + Phone | flex-1 | Name bold; phone monospace, `dir="ltr"` |
| Stage | 100px | Colored pill; clickable dropdown to change stage |
| Location | 90px | City + country ISO via `getCountryFromPhone` |
| Conversations | 70px | `contact.totalConversations ?? 0` |
| Spent | 80px | Green if > 0; `—` if null |
| Last seen | 90px | Relative time (e.g. "2h ago") |
| Actions | 40px | `ExternalLinkIcon` → navigate to `/contacts/[id]` |

**Sorting:**
- Client-side only on the currently loaded page (not full dataset).
- Sort state: `sortCol: string | null` + `sortDir: "asc" | "desc"`.
- Active column shows ↑↓ indicator. Clicking same column toggles direction. Clicking different column resets to ascending.
- Default: no sort (server order).
- Sorted contacts computed via `useMemo` before passing to the table component.

**Row interaction:** Click row → opens detail sheet. Checkbox, stage dropdown, and action icon all call `e.stopPropagation()`.

### 3. Compact List *(new)*
Single-row per contact, ~52px tall. Middle ground between cards and table.

**Row anatomy (left to right in LTR; mirrored in RTL):**
```
[ checkbox ] [ avatar 28px ] [ name / phone stacked ] [ stage pill ] [ tags max 2 + overflow ] [ view-profile icon ]
```

- Avatar: 28px gradient initials (same color logic as cards)
- Phone: `dir="ltr"` inline
- Tags: max 2 shown + `+N` overflow badge
- Stage pill: clickable dropdown to change stage
- Hover: `bg-muted/50` background; checkbox fades in
- Selected: `bg-primary/5` + `border-s-2 border-primary` logical start accent
- No sorting (Table view handles data-analysis use cases)

---

## View Switcher

**Placement:** Right end of the filter row (same row as Archive toggle + Select All), using `justify-between`.

**UI:** Segmented group of 3 icon buttons.

| Icon | View |
|---|---|
| `LayoutGrid` | Cards |
| `Table` | Table |
| `List` | Compact |

Active state: `bg-primary text-primary-foreground`. Inactive: ghost style. Matches existing stage pill pattern.

**RTL:** No hardcoded `right`/`left` — switcher sits at logical end via `justify-between`.

---

## Persistence

```ts
type ViewMode = "cards" | "table" | "compact";

const [viewMode, setViewMode] = useState<ViewMode>(() => {
  return (localStorage.getItem("contacts-view") as ViewMode) ?? "cards";
});

// On change:
localStorage.setItem("contacts-view", newMode);
```

No server round-trip. No Convex. Defaults to `"cards"`.

---

## Architecture

### Approach
Orchestrator + extracted view components. `ContactList` remains the single source of truth for data, queries, selection, and bulk actions. Each view is a pure presentational component.

### Shared Props Interface

```ts
interface ContactViewProps {
  contacts: Doc<"contacts">[];
  selected: Set<Id<"contacts">>;
  locale: "ar" | "en";
  onToggle: (id: Id<"contacts">) => void;
  onClick: (id: Id<"contacts">) => void;       // opens detail sheet
  onViewProfile: (id: Id<"contacts">) => void; // navigates to /contacts/[id]
  onUpdateStage: (id: Id<"contacts">, stage: Stage) => void;
}
```

### Files

**New files:**
- `components/contacts/contact-card-grid.tsx` — extracts `ContactCard` + grid wrapper from `contact-list.tsx`
- `components/contacts/contact-table.tsx` — table view with sorting
- `components/contacts/contact-compact-list.tsx` — compact row list

**Modified files:**
- `components/contacts/contact-list.tsx`:
  - Add `viewMode` state + localStorage read/write
  - Add view switcher UI in filter row
  - Remove card rendering code (moved to `contact-card-grid.tsx`)
  - Render `<ContactCardGrid>`, `<ContactTable>`, or `<ContactCompactList>` based on `viewMode`

### Rendering in ContactList

```tsx
{viewMode === "cards" && <ContactCardGrid {...viewProps} />}
{viewMode === "table" && <ContactTable {...viewProps} />}
{viewMode === "compact" && <ContactCompactList {...viewProps} />}
```

---

## Loading & Empty States

All three views must handle:
- **Loading:** Skeleton placeholders matching the view's shape (grid skeletons for cards, row skeletons for table/compact)
- **Empty:** Existing centered empty state with phone icon + optional "Add Contact" button

---

## RTL Requirements

- All layouts use logical properties: `ms-`, `me-`, `ps-`, `pe-`, `inset-s-`, `inset-e-`
- Phone numbers always `dir="ltr"` regardless of page direction
- Stage dropdown and action icons flip correctly in RTL
- Switcher position uses `justify-between` — no hardcoded side

---

## Out of Scope

- Kanban / pipeline view
- Column visibility toggles (show/hide columns)
- Full-dataset server-side sorting (client-side on loaded page only)
- Saving view preference per-user to Convex (localStorage is sufficient)
