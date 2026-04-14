# Contacts View Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Table and Compact List view modes to the contacts page, with a view switcher persisted to localStorage, alongside the existing Cards grid.

**Architecture:** Extract the existing card grid into its own component, then add two new view components (table with sorting, compact list). `ContactList` becomes a pure orchestrator — it holds all data/query/selection state and renders whichever view component is active. A 3-button icon toggle in the filter row switches views.

**Tech Stack:** Next.js 15 App Router, React, Convex, shadcn/ui, Tailwind CSS v4, Framer Motion, Lucide React, TypeScript (strict).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `components/contacts/contact-stage-config.ts` | **Create** | Shared `Stage` type + `STAGE_CONFIG` + `STAGE_TABS` |
| `components/contacts/contact-view-props.ts` | **Create** | Shared `ContactViewProps` interface |
| `components/contacts/contact-card-grid.tsx` | **Create** | Cards grid + skeleton — extracted from `contact-list.tsx` |
| `components/contacts/contact-compact-list.tsx` | **Create** | Compact single-row list view |
| `components/contacts/contact-table.tsx` | **Create** | Dense table view with client-side column sorting |
| `components/contacts/contact-list.tsx` | **Modify** | Add `viewMode` state + switcher; import + render the 3 view components; remove inlined card code |

---

## Task 1: Extract shared stage config

**Files:**
- Create: `components/contacts/contact-stage-config.ts`

- [ ] **Step 1: Create `contact-stage-config.ts`**

```ts
// components/contacts/contact-stage-config.ts

export type Stage = "lead" | "prospect" | "customer" | "retained" | "churned";

export const STAGE_CONFIG: Record<Stage, { en: string; ar: string; color: string }> = {
  lead:     { en: "Lead",     ar: "عميل محتمل", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  prospect: { en: "Prospect", ar: "مرشح",       color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  customer: { en: "Customer", ar: "عميل",        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  retained: { en: "Retained", ar: "عميل دائم",  color: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300" },
  churned:  { en: "Churned",  ar: "مفقود",       color: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300" },
};

export const STAGE_TABS: (Stage | "all")[] = ["all", "lead", "prospect", "customer", "retained", "churned"];
```

- [ ] **Step 2: Create `contact-view-props.ts`**

```ts
// components/contacts/contact-view-props.ts
import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { Stage } from "./contact-stage-config";

export interface ContactViewProps {
  contacts: Doc<"contacts">[];
  selected: Set<Id<"contacts">>;
  locale: "ar" | "en";
  isLoading: boolean;
  onToggle: (id: Id<"contacts">) => void;
  onClick: (id: Id<"contacts">) => void;       // opens detail sheet
  onViewProfile: (id: Id<"contacts">) => void; // navigates to /contacts/[id]
  onUpdateStage: (id: Id<"contacts">, stage: Stage) => void;
}
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/ahmedgemmezy/Documents/wadesk && npx tsc --noEmit
```

Expected: no errors related to the new files (they may not be imported yet — that's fine).

- [ ] **Step 4: Commit**

```bash
git add components/contacts/contact-stage-config.ts components/contacts/contact-view-props.ts
git commit -m "feat(contacts): extract shared stage config and view props interface"
```

---

## Task 2: Extract ContactCardGrid from contact-list.tsx

**Files:**
- Create: `components/contacts/contact-card-grid.tsx`
- Modify: `components/contacts/contact-list.tsx` (lines 41–55 Stage defs + lines 457–666 ContactCard)

The goal of this task is purely a refactor — no behaviour change. The contacts page must look and work identically after this task.

- [ ] **Step 1: Create `contact-card-grid.tsx`**

Copy the entire `ContactCard` component and create a new `ContactCardGrid` wrapper. The grid rendering logic that currently lives inline in `ContactList`'s return statement moves here.

```tsx
// components/contacts/contact-card-grid.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MapPinIcon, ExternalLinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCountryFromPhone } from "@/lib/phoneGeo";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { ContactViewProps } from "./contact-view-props";
import { STAGE_CONFIG, STAGE_TABS, type Stage } from "./contact-stage-config";

// ─── ContactCardGrid ──────────────────────────────────────────────────────────

export function ContactCardGrid({
  contacts,
  selected,
  locale,
  isLoading,
  onToggle,
  onClick,
  onViewProfile,
  onUpdateStage,
}: ContactViewProps) {
  const labels = {
    ar: { archivedBadge: "مؤرشف", noTags: "بدون وسوم", viewProfile: "عرض الملف" },
    en: { archivedBadge: "Archived", noTags: "No tags", viewProfile: "View Profile" },
  }[locale];

  if (isLoading) {
    return (
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div key={i} variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } }}>
            <Skeleton className="h-48 rounded-xl" />
          </motion.div>
        ))}
      </motion.div>
    );
  }

  return (
    <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <AnimatePresence mode="popLayout">
        {contacts.map((contact) => (
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            key={contact._id}
          >
            <ContactCard
              contact={contact}
              isSelected={selected.has(contact._id)}
              archivedLabel={labels.archivedBadge}
              noTagsLabel={labels.noTags}
              viewProfileLabel={labels.viewProfile}
              locale={locale}
              onToggle={() => onToggle(contact._id)}
              onClick={onClick}
              onViewProfile={onViewProfile}
              onUpdateStage={onUpdateStage}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── ContactCard ──────────────────────────────────────────────────────────────

interface ContactCardProps {
  contact: Doc<"contacts">;
  isSelected: boolean;
  archivedLabel: string;
  noTagsLabel: string;
  viewProfileLabel: string;
  locale: "ar" | "en";
  onToggle: () => void;
  onClick: (id: Id<"contacts">) => void;
  onViewProfile: (id: Id<"contacts">) => void;
  onUpdateStage?: (id: Id<"contacts">, stage: Stage) => void;
}

function ContactCard({
  contact,
  isSelected,
  archivedLabel,
  noTagsLabel,
  viewProfileLabel,
  locale,
  onToggle,
  onClick,
  onViewProfile,
  onUpdateStage,
}: ContactCardProps) {
  const stage = (contact.stage ?? "lead") as Stage;
  const stageCfg = STAGE_CONFIG[stage];
  const initials = (contact.customName ?? contact.displayName ?? contact.phone)
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const avatarColors = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-amber-600",
    "from-rose-500 to-pink-600",
    "from-indigo-500 to-blue-600",
  ];
  const colorIndex = contact.phone.charCodeAt(contact.phone.length - 1) % avatarColors.length;

  return (
    <div
      onClick={() => onClick(contact._id)}
      className={cn(
        "group relative rounded-xl border bg-card p-4 cursor-pointer",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-primary/30",
        "dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)]",
        "transform-3d",
        isSelected && "border-primary ring-1 ring-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]",
        contact.isArchived && "opacity-60",
      )}
      style={{ perspective: "1000px" }}
    >
      {/* Checkbox */}
      <div className="absolute top-3 inset-s-3 z-10" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          className={cn("transition-opacity", isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
        />
      </div>

      {/* Stage badge + archived badge */}
      <div className="absolute top-3 inset-e-3 flex flex-col items-end gap-1">
        {contact.isArchived && (
          <Badge variant="outline" className="text-xs">{archivedLabel}</Badge>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium transition-all hover:ring-2 hover:ring-primary/20",
                  stageCfg.color,
                )}
              />
            }
          >
            {locale === "ar" ? stageCfg.ar : stageCfg.en}
          </DropdownMenuTrigger>
          <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
            {STAGE_TABS.filter((t) => t !== "all").map((tab) => {
              const cfg = STAGE_CONFIG[tab as Stage];
              return (
                <DropdownMenuItem
                  key={tab}
                  className="text-xs focus:bg-primary/5 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); onUpdateStage?.(contact._id, tab as Stage); }}
                >
                  <div className={cn("size-2 rounded-full me-2", cfg.color.replace(/bg-([a-z]+)-100.*/, "bg-$1-500"))} />
                  {locale === "ar" ? cfg.ar : cfg.en}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <div className={cn("size-14 rounded-full bg-linear-to-br flex items-center justify-center text-white font-semibold text-lg shadow-inner", avatarColors[colorIndex])}>
          {initials || "?"}
        </div>
        <div className="text-center min-w-0 w-full">
          <p className="font-medium text-sm truncate">{contact.customName ?? contact.displayName}</p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5" dir="ltr">{contact.phone}</p>
        </div>
      </div>

      {/* Meta row */}
      {(() => {
        const geo = getCountryFromPhone(contact.phone);
        const countryIso = geo?.countryIso ?? null;
        const hasLocation = contact.city || countryIso;
        return (
          <div className="mt-3 flex items-center justify-center gap-3 text-xs text-muted-foreground">
            {hasLocation && (
              <span className="flex items-center gap-1 truncate">
                <MapPinIcon className="size-3 shrink-0" />
                {[contact.city, countryIso].filter(Boolean).join(", ")}
              </span>
            )}
            {contact.category && (
              <Badge variant="secondary" className="text-xs font-normal">{contact.category}</Badge>
            )}
          </div>
        );
      })()}

      {/* Tags */}
      <div className="mt-2 flex flex-wrap gap-1 justify-center min-h-5.5">
        {contact.tags.length > 0 ? (
          <>
            {contact.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs font-normal">{tag}</Badge>
            ))}
            {contact.tags.length > 2 && (
              <Badge variant="outline" className="text-xs">+{contact.tags.length - 2}</Badge>
            )}
          </>
        ) : (
          <span className="text-xs text-muted-foreground/50">{noTagsLabel}</span>
        )}
      </div>

      {/* Spend */}
      {contact.spent != null && (
        <div className="mt-2 text-center">
          <span className="text-xs font-medium text-emerald-500">${contact.spent.toLocaleString()}</span>
        </div>
      )}

      {/* View Profile link */}
      <div className="mt-3 flex justify-center" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onViewProfile(contact._id)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <ExternalLinkIcon className="size-3" />
          {viewProfileLabel}
        </button>
      </div>

      {/* Hover glow */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-linear-to-br from-primary/5 to-transparent" />
    </div>
  );
}
```

- [ ] **Step 2: Update `contact-list.tsx` — swap inlined code for the new component**

At the top of the file, replace the local Stage/STAGE_CONFIG/STAGE_TABS definitions and add the new import:

```ts
// REMOVE these lines from contact-list.tsx (approximately lines 43–53):
// type Stage = "lead" | ...
// const STAGE_CONFIG: Record<Stage, ...> = { ... }
// const STAGE_TABS: (Stage | "all")[] = [...]

// ADD this import at the top with the other imports:
import { STAGE_CONFIG, STAGE_TABS, type Stage } from "./contact-stage-config";
import { ContactCardGrid } from "./contact-card-grid";
```

In the `ContactList` return, find the card grid section (inside `<div className="flex-1 overflow-y-auto p-4">`) and replace the entire loading/empty/grid block with:

```tsx
{/* View */}
<div className="flex-1 overflow-y-auto p-4">
  <ContactCardGrid
    contacts={contacts}
    selected={selected}
    locale={locale}
    isLoading={isLoading}
    onToggle={toggleSelect}
    onClick={handleRowClick}
    onViewProfile={(id) => router.push(`/contacts/${id}`)}
    onUpdateStage={(id, stage) => updateStage({ contactId: id, stage }).catch(() => {})}
  />
  {results?.status === "CanLoadMore" && (
    <div className="pt-4 text-center">
      <Button variant="outline" size="sm" onClick={() => results.loadMore(PAGE_SIZE)}>
        {labels.loadMore}
      </Button>
    </div>
  )}
</div>
```

Also remove the `ContactCard` component definition from `contact-list.tsx` (lines ~457–666) since it now lives in `contact-card-grid.tsx`.

Update `isLoading` definition — currently it's `const isLoading = results === undefined`. Make sure that value is still derived the same way and is visible where the `ContactCardGrid` is rendered.

- [ ] **Step 3: Type-check**

```bash
cd /Users/ahmedgemmezy/Documents/wadesk && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Verify in browser**

Start dev server if not running:
```bash
npm run dev
```
Navigate to `/contacts`. The page must look and behave identically to before — cards grid, stage tabs, bulk select, search all working.

- [ ] **Step 5: Commit**

```bash
git add components/contacts/contact-card-grid.tsx components/contacts/contact-list.tsx
git commit -m "refactor(contacts): extract ContactCardGrid into its own component"
```

---

## Task 3: Add view mode switcher to ContactList

**Files:**
- Modify: `components/contacts/contact-list.tsx`

- [ ] **Step 1: Add ViewMode type and state with localStorage persistence**

At the top of `contact-list.tsx`, after the existing imports, add:

```ts
import { LayoutGridIcon, TableIcon, ListIcon } from "lucide-react";

type ViewMode = "cards" | "table" | "compact";
```

Inside the `ContactList` component, add the state directly after the existing `useState` declarations:

```ts
const [viewMode, setViewMode] = useState<ViewMode>(() => {
  if (typeof window === "undefined") return "cards";
  return (localStorage.getItem("contacts-view") as ViewMode) ?? "cards";
});

function handleViewMode(mode: ViewMode) {
  setViewMode(mode);
  localStorage.setItem("contacts-view", mode);
}
```

- [ ] **Step 2: Add switcher UI to the filter row**

Find the filter row `<div className="flex items-center justify-between gap-2">` in the toolbar (the row that contains the Archive button and Select All button). Replace just the outer div's closing to add the switcher at the end:

The row currently ends after the bulk action bar. Add the following segmented icon group as the very last child inside the `justify-between` wrapper, after the bulk action bar:

```tsx
{/* View mode switcher */}
{selected.size === 0 && (
  <div className="flex items-center border rounded-md overflow-hidden">
    {(["cards", "table", "compact"] as ViewMode[]).map((mode) => {
      const Icon = mode === "cards" ? LayoutGridIcon : mode === "table" ? TableIcon : ListIcon;
      return (
        <button
          key={mode}
          onClick={() => handleViewMode(mode)}
          className={cn(
            "p-1.5 transition-colors",
            viewMode === mode
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          <Icon className="size-3.5" />
        </button>
      );
    })}
  </div>
)}
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/ahmedgemmezy/Documents/wadesk && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Verify in browser**

The switcher appears in the filter row, right side. Clicking the icons changes the active icon's background to primary. The view doesn't change yet (still Cards always) — that's fine; wiring happens in Tasks 4 and 5.

Refresh the page — the active icon should match `"cards"` (the default).

- [ ] **Step 5: Commit**

```bash
git add components/contacts/contact-list.tsx
git commit -m "feat(contacts): add view mode switcher with localStorage persistence"
```

---

## Task 4: Build ContactCompactList

**Files:**
- Create: `components/contacts/contact-compact-list.tsx`
- Modify: `components/contacts/contact-list.tsx` (wire it in)

- [ ] **Step 1: Create `contact-compact-list.tsx`**

```tsx
// components/contacts/contact-compact-list.tsx
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExternalLinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { ContactViewProps } from "./contact-view-props";
import { STAGE_CONFIG, STAGE_TABS, type Stage } from "./contact-stage-config";

const avatarColors = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-rose-500 to-pink-600",
  "from-indigo-500 to-blue-600",
];

function getInitials(contact: Doc<"contacts">) {
  return (contact.customName ?? contact.displayName ?? contact.phone)
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function getColorIndex(phone: string) {
  return phone.charCodeAt(phone.length - 1) % avatarColors.length;
}

export function ContactCompactList({
  contacts,
  selected,
  locale,
  isLoading,
  onToggle,
  onClick,
  onViewProfile,
  onUpdateStage,
}: ContactViewProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-[52px] rounded-lg" />
        ))}
      </div>
    );
  }

  if (contacts.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      {contacts.map((contact) => {
        const stage = (contact.stage ?? "lead") as Stage;
        const stageCfg = STAGE_CONFIG[stage];
        const isSelected = selected.has(contact._id);
        const initials = getInitials(contact);
        const colorIndex = getColorIndex(contact.phone);

        return (
          <div
            key={contact._id}
            onClick={() => onClick(contact._id)}
            className={cn(
              "group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors",
              "hover:bg-muted/50",
              isSelected && "bg-primary/5 border-s-2 border-primary",
              contact.isArchived && "opacity-60",
            )}
          >
            {/* Checkbox */}
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggle(contact._id)}
                className={cn(
                  "transition-opacity",
                  isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                )}
              />
            </div>

            {/* Avatar */}
            <div
              className={cn(
                "size-7 rounded-full bg-linear-to-br flex items-center justify-center text-white font-semibold text-xs shrink-0",
                avatarColors[colorIndex],
              )}
            >
              {initials || "?"}
            </div>

            {/* Name + phone */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate leading-tight">
                {contact.customName ?? contact.displayName}
              </p>
              <p className="text-xs text-muted-foreground font-mono" dir="ltr">
                {contact.phone}
              </p>
            </div>

            {/* Stage pill */}
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium transition-all hover:ring-2 hover:ring-primary/20 shrink-0",
                        stageCfg.color,
                      )}
                    />
                  }
                >
                  {locale === "ar" ? stageCfg.ar : stageCfg.en}
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {STAGE_TABS.filter((t) => t !== "all").map((tab) => {
                    const cfg = STAGE_CONFIG[tab as Stage];
                    return (
                      <DropdownMenuItem
                        key={tab}
                        className="text-xs focus:bg-primary/5 cursor-pointer"
                        onClick={() => onUpdateStage(contact._id, tab as Stage)}
                      >
                        <div className={cn("size-2 rounded-full me-2", cfg.color.replace(/bg-([a-z]+)-100.*/, "bg-$1-500"))} />
                        {locale === "ar" ? cfg.ar : cfg.en}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Tags */}
            <div className="hidden sm:flex items-center gap-1 shrink-0">
              {contact.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs font-normal">{tag}</Badge>
              ))}
              {contact.tags.length > 2 && (
                <Badge variant="outline" className="text-xs">+{contact.tags.length - 2}</Badge>
              )}
            </div>

            {/* View profile */}
            <div onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onViewProfile(contact._id)}
                className="p-1 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
              >
                <ExternalLinkIcon className="size-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Wire ContactCompactList into ContactList**

In `contact-list.tsx`, add the import:

```ts
import { ContactCompactList } from "./contact-compact-list";
```

In the view section (inside `flex-1 overflow-y-auto p-4`), replace the current `<ContactCardGrid ... />` with a conditional render:

```tsx
{viewMode === "cards" && (
  <ContactCardGrid
    contacts={contacts}
    selected={selected}
    locale={locale}
    isLoading={isLoading}
    onToggle={toggleSelect}
    onClick={handleRowClick}
    onViewProfile={(id) => router.push(`/contacts/${id}`)}
    onUpdateStage={(id, stage) => updateStage({ contactId: id, stage }).catch(() => {})}
  />
)}
{viewMode === "compact" && (
  <ContactCompactList
    contacts={contacts}
    selected={selected}
    locale={locale}
    isLoading={isLoading}
    onToggle={toggleSelect}
    onClick={handleRowClick}
    onViewProfile={(id) => router.push(`/contacts/${id}`)}
    onUpdateStage={(id, stage) => updateStage({ contactId: id, stage }).catch(() => {})}
  />
)}
{viewMode === "table" && (
  // Task 5 will add ContactTable here
  <ContactCardGrid
    contacts={contacts}
    selected={selected}
    locale={locale}
    isLoading={isLoading}
    onToggle={toggleSelect}
    onClick={handleRowClick}
    onViewProfile={(id) => router.push(`/contacts/${id}`)}
    onUpdateStage={(id, stage) => updateStage({ contactId: id, stage }).catch(() => {})}
  />
)}
```

(The `table` mode temporarily falls back to cards until Task 5 is done.)

Also handle the empty state — currently in the original code an empty state renders when `contacts.length === 0`. Move that empty state outside the view switch, rendered before the view switch when contacts is empty and not loading:

```tsx
{!isLoading && contacts.length === 0 && (
  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
    <div className="size-16 rounded-full bg-muted flex items-center justify-center">
      <PhoneIcon className="size-7 opacity-40" />
    </div>
    <p>{labels.noContacts}</p>
    {isAdminOrSupervisor && !isSearching && (
      <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
        <PlusIcon className="size-4 me-1" />
        {labels.addContact}
      </Button>
    )}
  </div>
)}
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/ahmedgemmezy/Documents/wadesk && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Verify in browser**

Switch to Compact view. Each contact should render as a slim row (~52px):
- Avatar (28px) → name + phone stacked → stage pill (clickable) → tags → hover shows view-profile icon
- Checkbox fades in on hover; selected row gets left accent
- Clicking a row opens the detail sheet
- Stage dropdown changes stage inline
- RTL layout (if locale is `ar`) should mirror correctly

- [ ] **Step 5: Commit**

```bash
git add components/contacts/contact-compact-list.tsx components/contacts/contact-list.tsx
git commit -m "feat(contacts): add compact list view"
```

---

## Task 5: Build ContactTable with column sorting

**Files:**
- Create: `components/contacts/contact-table.tsx`
- Modify: `components/contacts/contact-list.tsx` (swap fallback for real component)

- [ ] **Step 1: Create `contact-table.tsx`**

```tsx
// components/contacts/contact-table.tsx
"use client";

import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExternalLinkIcon, ChevronUpIcon, ChevronDownIcon, ChevronsUpDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCountryFromPhone } from "@/lib/phoneGeo";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { ContactViewProps } from "./contact-view-props";
import { STAGE_CONFIG, STAGE_TABS, type Stage } from "./contact-stage-config";

type SortCol = "name" | "stage" | "location" | "conversations" | "spent" | "lastSeen";
type SortDir = "asc" | "desc";

function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatRelativeTimeAr(ms: number): string {
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} ي`;
}

export function ContactTable({
  contacts,
  selected,
  locale,
  isLoading,
  onToggle,
  onClick,
  onViewProfile,
  onUpdateStage,
}: ContactViewProps) {
  const [sortCol, setSortCol] = useState<SortCol | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const labels = {
    ar: {
      name: "الاسم",
      stage: "المرحلة",
      location: "الموقع",
      conversations: "محادثات",
      spent: "الإنفاق",
      lastSeen: "آخر ظهور",
      actions: "",
    },
    en: {
      name: "Name",
      stage: "Stage",
      location: "Location",
      conversations: "Conv.",
      spent: "Spent",
      lastSeen: "Last seen",
      actions: "",
    },
  }[locale];

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  const sortedContacts = useMemo(() => {
    if (!sortCol) return contacts;
    return [...contacts].sort((a, b) => {
      let aVal: string | number = 0;
      let bVal: string | number = 0;

      switch (sortCol) {
        case "name":
          aVal = (a.customName ?? a.displayName ?? a.phone).toLowerCase();
          bVal = (b.customName ?? b.displayName ?? b.phone).toLowerCase();
          break;
        case "stage":
          aVal = a.stage ?? "lead";
          bVal = b.stage ?? "lead";
          break;
        case "location": {
          const aGeo = getCountryFromPhone(a.phone);
          const bGeo = getCountryFromPhone(b.phone);
          aVal = [a.city, aGeo?.countryIso].filter(Boolean).join(", ");
          bVal = [b.city, bGeo?.countryIso].filter(Boolean).join(", ");
          break;
        }
        case "conversations":
          aVal = a.totalConversations ?? 0;
          bVal = b.totalConversations ?? 0;
          break;
        case "spent":
          aVal = a.spent ?? 0;
          bVal = b.spent ?? 0;
          break;
        case "lastSeen":
          aVal = a.lastSeenAt ?? 0;
          bVal = b.lastSeenAt ?? 0;
          break;
      }

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [contacts, sortCol, sortDir]);

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col) return <ChevronsUpDownIcon className="size-3 opacity-40" />;
    return sortDir === "asc"
      ? <ChevronUpIcon className="size-3" />
      : <ChevronDownIcon className="size-3" />;
  }

  function ColHeader({ col, label, className }: { col: SortCol; label: string; className?: string }) {
    return (
      <th
        className={cn("px-3 py-2 text-xs font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap", className)}
        onClick={() => handleSort(col)}
      >
        <span className="flex items-center gap-1">
          {label}
          <SortIcon col={col} />
        </span>
      </th>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="w-10 px-3 py-2" />
              <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-start">{labels.name}</th>
              <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-start">{labels.stage}</th>
              <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-start">{labels.location}</th>
              <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-start">{labels.conversations}</th>
              <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-start">{labels.spent}</th>
              <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-start">{labels.lastSeen}</th>
              <th className="w-10 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="px-3 py-2"><Skeleton className="size-4 rounded" /></td>
                <td className="px-3 py-2"><Skeleton className="h-4 w-32 rounded" /></td>
                <td className="px-3 py-2"><Skeleton className="h-5 w-16 rounded-full" /></td>
                <td className="px-3 py-2"><Skeleton className="h-4 w-20 rounded" /></td>
                <td className="px-3 py-2"><Skeleton className="h-4 w-8 rounded" /></td>
                <td className="px-3 py-2"><Skeleton className="h-4 w-12 rounded" /></td>
                <td className="px-3 py-2"><Skeleton className="h-4 w-14 rounded" /></td>
                <td className="px-3 py-2"><Skeleton className="size-4 rounded" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (contacts.length === 0) return null;

  const formatTime = locale === "ar" ? formatRelativeTimeAr : formatRelativeTime;

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className="w-10 px-3 py-2" />
            <ColHeader col="name" label={labels.name} className="text-start" />
            <ColHeader col="stage" label={labels.stage} className="text-start" />
            <ColHeader col="location" label={labels.location} className="text-start hidden md:table-cell" />
            <ColHeader col="conversations" label={labels.conversations} className="text-start hidden lg:table-cell" />
            <ColHeader col="spent" label={labels.spent} className="text-start hidden lg:table-cell" />
            <ColHeader col="lastSeen" label={labels.lastSeen} className="text-start hidden sm:table-cell" />
            <th className="w-10 px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {sortedContacts.map((contact) => {
            const stage = (contact.stage ?? "lead") as Stage;
            const stageCfg = STAGE_CONFIG[stage];
            const isSelected = selected.has(contact._id);
            const geo = getCountryFromPhone(contact.phone);
            const location = [contact.city, geo?.countryIso].filter(Boolean).join(", ");

            return (
              <tr
                key={contact._id}
                onClick={() => onClick(contact._id)}
                className={cn(
                  "group border-b last:border-0 cursor-pointer transition-colors",
                  "hover:bg-muted/40",
                  isSelected && "bg-primary/5",
                  contact.isArchived && "opacity-60",
                )}
              >
                {/* Checkbox */}
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggle(contact._id)}
                    className={cn(
                      "transition-opacity",
                      isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                    )}
                  />
                </td>

                {/* Name + phone */}
                <td className="px-3 py-2">
                  <div className="font-medium truncate max-w-[180px]">
                    {contact.customName ?? contact.displayName}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono" dir="ltr">
                    {contact.phone}
                  </div>
                </td>

                {/* Stage */}
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium transition-all hover:ring-2 hover:ring-primary/20 whitespace-nowrap",
                            stageCfg.color,
                          )}
                        />
                      }
                    >
                      {locale === "ar" ? stageCfg.ar : stageCfg.en}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {STAGE_TABS.filter((t) => t !== "all").map((tab) => {
                        const cfg = STAGE_CONFIG[tab as Stage];
                        return (
                          <DropdownMenuItem
                            key={tab}
                            className="text-xs focus:bg-primary/5 cursor-pointer"
                            onClick={() => onUpdateStage(contact._id, tab as Stage)}
                          >
                            <div className={cn("size-2 rounded-full me-2", cfg.color.replace(/bg-([a-z]+)-100.*/, "bg-$1-500"))} />
                            {locale === "ar" ? cfg.ar : cfg.en}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>

                {/* Location */}
                <td className="px-3 py-2 text-xs text-muted-foreground hidden md:table-cell">
                  {location || "—"}
                </td>

                {/* Conversations */}
                <td className="px-3 py-2 text-xs hidden lg:table-cell">
                  {contact.totalConversations ?? 0}
                </td>

                {/* Spent */}
                <td className="px-3 py-2 text-xs hidden lg:table-cell">
                  {contact.spent != null ? (
                    <span className="text-emerald-500 font-medium">${contact.spent.toLocaleString()}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>

                {/* Last seen */}
                <td className="px-3 py-2 text-xs text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                  {contact.lastSeenAt ? formatTime(contact.lastSeenAt) : "—"}
                </td>

                {/* Actions */}
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onViewProfile(contact._id)}
                    className="p-1 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <ExternalLinkIcon className="size-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Wire ContactTable into ContactList**

In `contact-list.tsx`, add the import:

```ts
import { ContactTable } from "./contact-table";
```

Replace the temporary `table` fallback from Task 4:

```tsx
{viewMode === "table" && (
  <ContactTable
    contacts={contacts}
    selected={selected}
    locale={locale}
    isLoading={isLoading}
    onToggle={toggleSelect}
    onClick={handleRowClick}
    onViewProfile={(id) => router.push(`/contacts/${id}`)}
    onUpdateStage={(id, stage) => updateStage({ contactId: id, stage }).catch(() => {})}
  />
)}
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/ahmedgemmezy/Documents/wadesk && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Verify in browser**

Switch to Table view:
- All 8 columns visible (some hidden at smaller breakpoints — location hidden below `md`, conv/spent hidden below `lg`)
- Click a column header → rows re-sort; sort indicator arrow appears; clicking same header again reverses direction
- Stage dropdown in each row changes stage inline
- Click a row → opens detail sheet
- Hover-only visibility for view-profile icon and checkbox
- Selected rows have `bg-primary/5` background
- Spent shows green, `—` when null
- Last seen shows relative time in English or Arabic per locale

Switch between all 3 view modes rapidly — confirm localStorage persists the selected mode on page refresh.

- [ ] **Step 5: Commit**

```bash
git add components/contacts/contact-table.tsx components/contacts/contact-list.tsx
git commit -m "feat(contacts): add table view with sortable columns"
```

---

## Self-Review

**Spec coverage:**
- ✅ 3 views: Cards, Table, Compact List
- ✅ View switcher in filter row, right side
- ✅ localStorage persistence, defaults to "cards"
- ✅ Orchestrator + 3 extracted view components
- ✅ Shared `ContactViewProps` interface
- ✅ Table: detailed columns (name+phone, stage, location, conv, spent, last seen, actions)
- ✅ Table: sortable columns, client-side on loaded page
- ✅ Compact: checkbox, avatar 28px, name/phone, stage pill, tags (max 2 + overflow), view-profile icon
- ✅ Compact: no sorting
- ✅ Loading skeletons per view (grid, row, table-row shapes)
- ✅ Empty state handled outside view switch
- ✅ RTL: logical properties throughout, phone `dir="ltr"`
- ✅ `lastSeenAt` (correct field name from schema, not `lastSeen`)
- ✅ `totalConversations` used as optional (`?? 0`)

**Placeholder scan:** No TBDs. All code blocks are complete. ✅

**Type consistency:** `ContactViewProps` defined in Task 1, used identically in Tasks 2–5. `Stage` type from `contact-stage-config.ts` used consistently. `sortCol` typed as `SortCol | null` throughout. ✅
