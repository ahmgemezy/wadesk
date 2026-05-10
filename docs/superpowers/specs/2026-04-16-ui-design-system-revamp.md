# WABDesk UI Design System Revamp

**Date:** 2026-04-16  
**Branch:** 009-automation-rules  
**Scope:** Visual retheme of the entire app — design tokens only, no UX changes

---

## 1. Goal

Replace the current neutral/green color system with a **Warm Gold** design system applied globally via CSS custom properties. All existing UX flows, component structure, and navigation remain exactly as they are. Only the visual layer changes.

---

## 2. Design Decisions (Approved)

| Decision | Choice |
|---|---|
| Color palette | Warm Gold (sand base + gold primary) |
| Typography | Cairo (already loaded) — keep as-is |
| Message bubbles | Pill/Rounded (20px radius, one flat corner) |
| Conversation list items | Rich (avatar + online dot + labels + unread badge) |

---

## 3. Color Tokens

### Light Mode

| Token | Hex | Usage |
|---|---|---|
| `--background` | `#faf9f6` | App background, main canvas |
| `--foreground` | `#1a1c1a` | Body text |
| `--card` | `#ffffff` | Cards, dialogs, popovers |
| `--card-foreground` | `#1a1c1a` | Text on cards |
| `--popover` | `#ffffff` | Dropdown/popover backgrounds |
| `--popover-foreground` | `#1a1c1a` | Text in popovers |
| `--primary` | `#775a19` | Buttons, active states, links |
| `--primary-foreground` | `#ffffff` | Text on primary color |
| `--secondary` | `#efeeeb` | Secondary surfaces (list item hover, etc.) |
| `--secondary-foreground` | `#1a1c1a` | Text on secondary |
| `--muted` | `#f4f3f1` | Muted backgrounds |
| `--muted-foreground` | `#7f7667` | Placeholder text, timestamps, captions |
| `--accent` | `#e9c176` | Accent chips, highlights, badges |
| `--accent-foreground` | `#4e3700` | Text on accent |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Keep as-is (red for errors) |
| `--border` | `#e3e2e0` | Dividers, input borders |
| `--input` | `#e3e2e0` | Input field borders |
| `--ring` | `#c5a059` | Focus rings |
| `--sidebar` | `#efeeeb` | Sidebar background |
| `--sidebar-foreground` | `#1a1c1a` | Sidebar text |
| `--sidebar-primary` | `#775a19` | Active sidebar item |
| `--sidebar-primary-foreground` | `#ffffff` | Text on active sidebar item |
| `--sidebar-accent` | `#e3e2e0` | Sidebar hover state |
| `--sidebar-accent-foreground` | `#1a1c1a` | Text on sidebar hover |
| `--sidebar-border` | `#d1c5b4` | Sidebar divider |

### Dark Mode

| Token | Value | Usage |
|---|---|---|
| `--background` | `#1a1c1a` | Dark canvas |
| `--foreground` | `#f4f3f1` | Text on dark |
| `--card` | `#242620` | Cards |
| `--card-foreground` | `#f4f3f1` | |
| `--popover` | `#242620` | |
| `--popover-foreground` | `#f4f3f1` | |
| `--primary` | `#e9c176` | Gold on dark (lighter shade) |
| `--primary-foreground` | `#1a1c1a` | |
| `--secondary` | `#2e2f2a` | |
| `--secondary-foreground` | `#f4f3f1` | |
| `--muted` | `#2e2f2a` | |
| `--muted-foreground` | `#9a9186` | |
| `--accent` | `#c5a059` | |
| `--accent-foreground` | `#1a1c1a` | |
| `--border` | `rgba(255,255,255,0.1)` | |
| `--input` | `rgba(255,255,255,0.12)` | |
| `--ring` | `#775a19` | |
| `--sidebar` | `#1e2019` | |
| `--sidebar-foreground` | `#f4f3f1` | |
| `--sidebar-primary` | `#e9c176` | |
| `--sidebar-primary-foreground` | `#1a1c1a` | |
| `--sidebar-accent` | `#2e2f2a` | |
| `--sidebar-accent-foreground` | `#f4f3f1` | |
| `--sidebar-border` | `rgba(255,255,255,0.08)` | |

### Semantic Color Variables (New — Light Only for v1)

These go in `:root` alongside the token set above:

```css
--agent-bubble-bg: #ffdea5;        /* agent message background */
--agent-bubble-text: #4e3700;      /* agent message text */
--customer-bubble-bg: #efeeeb;     /* customer message background */
--customer-bubble-text: #1a1c1a;   /* customer message text */
--internal-note-bg: #fffbf0;       /* internal note background */
--internal-note-border: #e9c176;   /* internal note border */
--unassigned-bg: #fffbf0;          /* unassigned conv row tint */
--online-dot: #22c55e;             /* contact online indicator */
--unassigned-dot: #f97316;         /* unassigned indicator dot */
```

---

## 4. Typography

No changes to font families — Cairo is already loaded and set as `--font-sans` and `--font-heading`.

The only typography adjustment is ensuring `font-feature-settings` for Arabic numerals is not overridden anywhere. No new fonts to install.

---

## 5. Border Radius

Keep current `--radius: 0.625rem` as the base. The derived values (`--radius-sm/md/lg/xl/2xl/3xl/4xl`) stay as-is.

One addition for message bubbles — handled directly in the bubble component via Tailwind classes, not as a global token.

---

## 6. Component-Level Changes

These components need visual touch-ups after the token swap, because they hardcode colors or have design details beyond tokens:

### `components/inbox/message-bubble.tsx`
- Agent messages: `bg-[--agent-bubble-bg] text-[--agent-bubble-text]`
- Customer messages: `bg-[--customer-bubble-bg] text-[--customer-bubble-text]`  
- Internal notes: `bg-[--internal-note-bg] border border-[--internal-note-border] border-dashed`
- Pill shape: `rounded-[20px]` with one flat corner (agent = bottom-start flat, customer = bottom-end flat)
- Timestamps: `text-muted-foreground text-xs`

### `components/inbox/conversation-list-item.tsx`
- Active item: `bg-secondary border-s-2 border-primary` (gold left/right border)
- Unassigned item: `bg-[--unassigned-bg]`
- Online dot: `bg-[--online-dot]`
- Unassigned dot: `bg-[--unassigned-dot]`
- Label chips: use `bg-accent text-accent-foreground` for category labels
- Unread badge: `bg-primary text-primary-foreground`

### `components/shell/app-sidebar.tsx`
- Background already uses `--sidebar` token — will pick up automatically
- Active nav item indicator: confirm it uses `--sidebar-primary`

### All other components
- No direct color changes needed — they use shadcn semantic tokens (`bg-background`, `text-foreground`, `bg-primary`, etc.) which will update automatically when tokens change

---

## 7. What Is NOT Changing

- Component structure and props
- Navigation hierarchy and routes
- UX flows (assignment, status, labels, templates, etc.)
- shadcn component internals
- RTL layout logic
- Convex data layer
- Clerk auth
- Any feature behavior

---

## 8. Implementation Plan (High Level)

1. **Token swap** — rewrite CSS custom properties in `app/globals.css` (`:root` and `.dark`)
2. **Semantic variables** — add the 9 semantic color variables to `:root`
3. **Message bubbles** — update `message-bubble.tsx` for pill shape + semantic colors
4. **Conversation list item** — update active/unassigned/badge styles
5. **Smoke test** — open each main section (inbox, contacts, analytics, automations, settings) and verify nothing looks broken

---

## 9. Out of Scope

- Dark mode semantic variables (add in follow-up)
- Custom scrollbar styling
- Animation/transition changes
- Print styles
