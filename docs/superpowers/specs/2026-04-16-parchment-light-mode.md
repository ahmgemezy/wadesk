# WaDesk — Parchment Light Mode

**Date:** 2026-04-16
**Branch:** 009-automation-rules
**Scope:** Add a proper light mode variant (Deep Parchment + Emerald) alongside the existing Navy dark mode, with a manual theme toggle in the sidebar. No UX, routing, or data layer changes.

---

## 1. Goal

Restore the `:root` CSS block to a proper **light mode** token set — a warm Deep Parchment palette that maintains the same Emerald brand accent as dark mode. Users on light OS preference see parchment automatically; users can override with a toggle button in the sidebar footer.

The existing `.dark` block (Navy + Emerald) is **not touched** — it stays exactly as-is.

---

## 2. Design Decisions (Approved)

| Dimension | Choice |
|---|---|
| Background | Deep Parchment `#ebe3d8` |
| Conversation list panel | `#e5ddd0` |
| Sidebar | Light parchment `#ddd5c8` (same warmth, slightly darker) |
| Chat area | `#ebe3d8` |
| Cards / right panel | `#f0ebe3` |
| Inbound (customer) bubble | Warm off-white `#f8f3ec` |
| Outbound (agent) bubble | Emerald gradient — same as dark mode (hardcoded classes) |
| Primary accent | `#00a068` — darker emerald for light bg readability |
| Theme switching | Manual toggle in sidebar footer (bell row) + OS auto |
| Theme persistence | `next-themes` with `attribute="class"` (already wired) |

---

## 3. Surface Layers (Light)

| Layer | Hex | Used For |
|---|---|---|
| Sidebar | `#ddd5c8` | Nav sidebar |
| Conv list panel | `#e5ddd0` | Conversation list background |
| App canvas | `#ebe3d8` | Main background |
| Cards / right panel | `#f0ebe3` | Contact detail panel, card surfaces |
| Elevated surface | `#f5f0e8` | Popovers, dropdowns |
| Inbound bubble | `#f8f3ec` | Customer message bubbles |

---

## 4. Color Tokens — `:root` (Light Mode)

Replace the current `:root` block (which forces dark) with this parchment light set:

```css
:root {
  /* ─── Surfaces ─────────────────────────────────────────────── */
  --background:            #ebe3d8;
  --foreground:            #1a1a12;
  --card:                  #f0ebe3;
  --card-foreground:       #1a1a12;
  --popover:               #f5f0e8;
  --popover-foreground:    #1a1a12;

  /* ─── Primary — Emerald (darker for light bg readability) ──── */
  --primary:               #00a068;
  --primary-foreground:    #ffffff;

  /* ─── Neutrals ──────────────────────────────────────────────── */
  --secondary:             #e0d8cc;
  --secondary-foreground:  #1a1a12;
  --muted:                 #ddd5c8;
  --muted-foreground:      #7a6e5e;
  --border:                rgba(0,0,0,0.10);
  --input:                 rgba(0,0,0,0.08);
  --ring:                  #00a068;

  /* ─── Accent ────────────────────────────────────────────────── */
  --accent:                #e0d8cc;
  --accent-foreground:     #1a1a12;

  /* ─── Destructive ───────────────────────────────────────────── */
  --destructive:           oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.577 0.245 27.325);

  /* ─── Radius — unchanged ────────────────────────────────────── */
  --radius:                0.625rem;

  /* ─── Sidebar ───────────────────────────────────────────────── */
  --sidebar:                    #ddd5c8;
  --sidebar-background:         #ddd5c8;
  --sidebar-foreground:         #7a6e5e;
  --sidebar-primary:            #00a068;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent:             rgba(0,160,104,0.14);
  --sidebar-accent-foreground:  #00a068;
  --sidebar-border:             rgba(0,0,0,0.08);
  --sidebar-ring:               #00a068;

  /* ─── Charts ────────────────────────────────────────────────── */
  --chart-1: #00a068;
  --chart-2: #00c4b4;
  --chart-3: #7a6e5e;
  --chart-4: #e0d8cc;
  --chart-5: #ddd5c8;

  /* ─── Message bubbles ───────────────────────────────────────── */
  --agent-bubble-bg:        #e0d8cc;
  --agent-bubble-text:      #1a1a12;
  --agent-bubble-border:    rgba(0,0,0,0.06);
  --customer-bubble-bg:     #f8f3ec;
  --customer-bubble-text:   #1a1a12;
  --internal-note-bg:       rgba(180,140,0,0.08);
  --internal-note-border:   rgba(180,140,0,0.35);
  --internal-note-text:     #8a6800;

  /* ─── Conversation list ─────────────────────────────────────── */
  --conv-active-bg:         #d8ede6;
  --conv-active-border:     #00a068;
  --conv-hover-bg:          #e3ddd4;
  --unassigned-bg:          rgba(249,115,22,0.05);
  --online-dot:             #00a068;
  --unassigned-dot:         #f97316;
}
```

---

## 5. `.dark` Block — Unchanged

The `.dark` block in `globals.css` stays **exactly as-is** (Navy + Emerald dark tokens). Do not modify it.

---

## 6. Theme Toggle — How It Works

`next-themes` is already installed and wired:

```tsx
// components/theme-provider.tsx (already exists — do not change)
<NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
```

This means:
- `defaultTheme="system"` → app follows OS preference on first load
- `attribute="class"` → toggles the `.dark` class on `<html>`
- User's manual choice persists to `localStorage` via next-themes automatically

The only missing piece is a UI button to trigger the toggle.

---

## 7. Component Changes

### New: `components/shell/theme-toggle.tsx`

A minimal icon button using `useTheme` from `next-themes`. Shows ☀️ sun when currently in dark mode (click to go light), shows 🌙 moon when currently in light mode (click to go dark).

```tsx
"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — only render icon after mount
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <div className="size-7" />;

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
```

### Modify: `components/shell/app-sidebar.tsx`

Add a utility row in `SidebarFooter` (above `UserMenu`) containing:
1. A `BellIcon` placeholder button (notifications — future feature, inert for now)
2. `ThemeToggle` component

Replace the `SidebarFooter` block:

```tsx
// Before:
<SidebarFooter>
  <SidebarSeparator />
  <UserMenu user={user} locale={locale} />
</SidebarFooter>

// After:
<SidebarFooter>
  <SidebarSeparator />
  <div className="flex items-center justify-center gap-1 py-1 group-data-[collapsible=icon]:flex-col">
    <Button
      variant="ghost"
      size="icon"
      className="size-7 text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent"
      title="Notifications (coming soon)"
      disabled
    >
      <Bell className="size-4" />
    </Button>
    <ThemeToggle />
  </div>
  <UserMenu user={user} locale={locale} />
</SidebarFooter>
```

Add to imports:
```tsx
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
```

---

## 8. What Does NOT Need Direct Changes

Everything else inherits the parchment tokens automatically through shadcn's semantic token system:

| Component | How it adapts |
|---|---|
| `message-bubble.tsx` | `--customer-bubble-bg/text` and `--internal-note-*` tokens update automatically |
| `conversation-list-item.tsx` | `--conv-active-bg/border`, `--conv-hover-bg` tokens update automatically |
| `message-input.tsx` | `--internal-note-bg/border/text` tokens update automatically |
| All shadcn components | `bg-background`, `text-foreground`, `bg-primary`, etc. update automatically |
| Charts | `--chart-1` through `--chart-5` update automatically |
| Outbound bubble | **Stays unchanged** — hardcoded `from-[#00e5a0] to-[#00c4b4]` gradient looks correct on parchment |

---

## 9. What Is NOT Changing

- `.dark` token block (Navy + Emerald) — untouched
- `@theme inline` block — untouched
- `ThemeProvider` component — untouched
- `app/layout.tsx` — untouched
- All component logic, props, routing, data layer
- RTL layout — all `start`/`end` utilities remain

---

## 10. Implementation Order

1. **Restore `:root` tokens** — replace `:root` block in `app/globals.css` with parchment light set
2. **Create `ThemeToggle`** — new `components/shell/theme-toggle.tsx`
3. **Update sidebar footer** — add bell + toggle row in `app-sidebar.tsx`
4. **Smoke test both modes** — toggle dark↔light, check all pages in both
