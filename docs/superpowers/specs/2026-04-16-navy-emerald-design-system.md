# WaDesk — Navy + Emerald Design System

**Date:** 2026-04-16
**Branch:** 009-automation-rules
**Scope:** Full visual retheme — design tokens + targeted component updates. No UX, routing, or data layer changes.

---

## 1. Goal

Replace the current green-on-light color system with a **Navy + Emerald** dark design system applied globally via CSS custom properties. The "command center" aesthetic — deep navy base, emerald/teal accent gradient — inspired by the approved full-inbox mockup.

All existing UX flows, component structure, navigation, and RTL logic remain exactly as they are. Only the visual layer changes.

---

## 2. Design Decisions (Approved)

| Dimension | Choice | Notes |
|---|---|---|
| Color palette | Navy + Emerald | Deep navy base `#0f1623`, emerald accent `#00e5a0 → #00c4b4` |
| Typography | Bold Display | 800–900 weight headings, uppercase labels, large stat numbers |
| Message bubbles | Pill / asymmetric radius | Customer: emerald gradient; Agent: dark `#253040` |
| Conversation list | Rich items | Avatar + online dot + labels/tags + unread badge + SLA indicator |
| Surface layering | Tiered dark | 5 distinct dark levels for visual depth |

---

## 3. Surface Layers (Tiered Dark)

Five surfaces create depth without borders:

| Layer | Hex | Used For |
|---|---|---|
| `layer-0` | `#0a1020` | Deepest — icon nav sidebar |
| `layer-1` | `#0f1623` | App canvas background |
| `layer-2` | `#141927` | Conversation list panel |
| `layer-3` | `#1c2535` | Chat area, primary content |
| `layer-4` | `#192230` | Contact detail panel |
| `layer-5` | `#253040` | Cards, bubbles, stat boxes |
| `layer-6` | `#1e2c40` | Active conversation item, hover |

---

## 4. Color Tokens

### `:root` — Dark (primary — this theme is dark-first)

| Token | Value | Usage |
|---|---|---|
| `--background` | `#0f1623` | App canvas |
| `--foreground` | `#dce8f5` | Body text |
| `--card` | `#1c2535` | Cards, panels |
| `--card-foreground` | `#dce8f5` | Text on cards |
| `--popover` | `#192230` | Dropdown / popover backgrounds |
| `--popover-foreground` | `#dce8f5` | Text in popovers |
| `--primary` | `#00e5a0` | Buttons, active states, accent |
| `--primary-foreground` | `#0a1020` | Text on primary (dark on emerald) |
| `--secondary` | `#1e2c40` | Secondary surfaces, hover states |
| `--secondary-foreground` | `#dce8f5` | Text on secondary |
| `--muted` | `#253040` | Muted backgrounds |
| `--muted-foreground` | `#4a6080` | Placeholder text, timestamps, captions |
| `--accent` | `#00c4b4` | Accent gradient end, highlights |
| `--accent-foreground` | `#0a1020` | Text on accent |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Keep as-is |
| `--border` | `rgba(255,255,255,0.07)` | Dividers, input borders |
| `--input` | `rgba(255,255,255,0.08)` | Input field borders |
| `--ring` | `#00e5a0` | Focus rings |
| `--sidebar` | `#0a1020` | Nav sidebar background |
| `--sidebar-foreground` | `#4a6080` | Inactive nav icon color |
| `--sidebar-primary` | `#00e5a0` | Active nav icon |
| `--sidebar-primary-foreground` | `#0a1020` | Text on active nav |
| `--sidebar-accent` | `rgba(0,229,160,0.12)` | Nav icon hover/active background |
| `--sidebar-accent-foreground` | `#00e5a0` | Icon color on active bg |
| `--sidebar-border` | `rgba(255,255,255,0.06)` | Sidebar right border |

### Semantic Color Variables

Add to `:root` alongside token set above:

```css
/* Message bubbles */
--customer-bubble-bg:        linear-gradient(135deg, #00e5a0, #00c4b4);
--customer-bubble-text:      #0a1020;
--agent-bubble-bg:           #253040;
--agent-bubble-text:         #dce8f5;
--agent-bubble-border:       rgba(255,255,255,0.06);

/* Internal notes */
--internal-note-bg:          rgba(248,180,0,0.06);
--internal-note-border:      rgba(248,180,0,0.25);
--internal-note-text:        #c8a020;

/* Conversation list */
--conv-active-bg:            #1e2c40;
--conv-active-border:        #00e5a0;
--conv-hover-bg:             #171f30;
--conv-unassigned-bg:        rgba(249,115,22,0.04);
--unread-badge-bg:           linear-gradient(135deg, #00e5a0, #00c4b4);
--unread-badge-text:         #0a1020;

/* Status indicators */
--online-dot:                #00e5a0;
--unassigned-dot:            #f97316;
--sla-warn-border:           #f97316;
--sla-warn-text:             #f97316;

/* Tag chips */
--tag-order-bg:              rgba(0,229,160,0.10);
--tag-order-text:            #00c4b4;
--tag-vip-bg:                rgba(99,102,241,0.15);
--tag-vip-text:              #818cf8;
--tag-inquiry-bg:            rgba(248,180,0,0.10);
--tag-inquiry-text:          #f8b400;
--tag-complaint-bg:          rgba(239,68,68,0.10);
--tag-complaint-text:        #f87171;
```

### Light Mode Handling

This theme is dark-first. Since shadcn uses `:root` for light and `.dark` for dark mode, the implementation must apply the Navy + Emerald tokens to **both** `:root` and `.dark` in `globals.css`. This makes the app always render in the dark theme regardless of the OS or user preference toggle.

If a light mode toggle exists in the UI (e.g. ThemeProvider), leave it in place — it will simply have no visible effect in v1. A proper light variant is out of scope for this spec.

---

## 5. Typography — Bold Display

Font family: **Cairo** (already loaded). No new fonts.

| Element | Size | Weight | Other |
|---|---|---|---|
| Page / section title | `17–20px` | `800` | `letter-spacing: -0.3px` |
| Stat / metric number | `18–22px` | `900` | `line-height: 1` |
| Contact name, conv name | `12–14px` | `700–800` | |
| Uppercase label / section header | `8–10px` | `600–700` | `text-transform: uppercase; letter-spacing: 0.8px` |
| Body / preview text | `11–13px` | `400–500` | |
| Timestamp, caption | `10px` | `400` | `color: var(--muted-foreground)` |
| Tag / badge text | `9px` | `600–700` | |

Apply in CSS:

```css
/* globals.css — add under :root */
--font-display-weight: 800;
--font-stat-weight: 900;
--font-label-size: 9px;
--font-label-weight: 700;
--font-label-spacing: 0.8px;
```

---

## 6. Component-Level Changes

These components need direct updates beyond token inheritance:

### `components/inbox/message-bubble.tsx`
- **Customer messages:** `background: var(--customer-bubble-bg)` (emerald gradient), `color: var(--customer-bubble-text)`, radius `14px 14px 2px 14px`
- **Agent messages:** `background: var(--agent-bubble-bg)`, `color: var(--agent-bubble-text)`, `border: 1px solid var(--agent-bubble-border)`, radius `14px 14px 14px 2px`
- **Internal notes:** `background: var(--internal-note-bg)`, `border: 1px dashed var(--internal-note-border)`, `color: var(--internal-note-text)`, radius `10px`
- **Timestamps:** `color: var(--muted-foreground)`, `font-size: 10px`

### `components/inbox/conversation-list-item.tsx`
- **Active item:** `background: var(--conv-active-bg)`, `border-inline-end: 2px solid var(--conv-active-border)`
- **Hover item:** `background: var(--conv-hover-bg)`
- **Unassigned item:** `background: var(--conv-unassigned-bg)`, unassigned orange dot `var(--unassigned-dot)`
- **SLA breach item:** `border-inline-end: 2px solid var(--sla-warn-border)`, time in `var(--sla-warn-text)` + bold
- **Contact name:** `font-weight: 700`, `color: #dce8f5`
- **Preview text:** `font-size: 11px`, `color: var(--muted-foreground)`
- **Online dot:** `background: var(--online-dot)`
- **Unread badge:** `background: var(--unread-badge-bg)`, `color: var(--unread-badge-text)`, `font-weight: 800`, `font-size: 9px`
- **Tag chips:** use semantic `--tag-*-bg` / `--tag-*-text` variables per label type

### `components/shell/app-sidebar.tsx`
- Sidebar background picks up `--sidebar` automatically
- Active nav item: `background: var(--sidebar-accent)`, icon `color: var(--sidebar-primary)`
- Inactive nav icon: `color: var(--sidebar-foreground)`
- Logo mark: `background: linear-gradient(135deg, #00e5a0, #00c4b4)`, text `color: #0a1020`
- User avatar at bottom: `border: 1.5px solid rgba(0,229,160,0.2)`

### `components/inbox/chat-header.tsx`
- Contact name: `font-weight: 800`, `font-size: 14px`
- Status badge (Open): `background: rgba(0,229,160,0.12)`, `color: #00e5a0`, `border: 1px solid rgba(0,229,160,0.2)`
- Status badge (Pending): `background: rgba(248,180,0,0.1)`, `color: #f8b400`, matching border
- Primary action button (Resolve): `background: linear-gradient(135deg,#00e5a0,#00c4b4)`, `color: #0a1020`, `font-weight: 700`
- Secondary action buttons: `background: rgba(255,255,255,0.06)`, `border: 1px solid rgba(255,255,255,0.08)`

### `components/contacts/contact-detail-panel.tsx` (if exists)
- Panel background: `#192230`
- Stat numbers: `font-weight: 900`, `font-size: 15px`
- Stat labels: uppercase, `font-size: 8px`, `letter-spacing: 0.5px`
- Section titles: uppercase, `font-size: 9px`, `font-weight: 700`, `letter-spacing: 0.8px`
- Contact avatar border: `2px solid rgba(0,229,160,0.25)`

### `components/inbox/message-input.tsx`
- Input box: `background: rgba(255,255,255,0.05)`, `border: 1px solid rgba(255,255,255,0.08)`, `border-radius: 10px`
- Send button: `background: linear-gradient(135deg,#00e5a0,#00c4b4)`, icon `color: #0a1020`
- Toolbar icon buttons: inactive `color: #4a6080`, hover `color: #8090a8`

### `app/globals.css`
- Rewrite all `:root` CSS custom properties with Navy + Emerald tokens
- Remove Warm Gold tokens completely
- Add semantic color variables block
- Add typography weight/size variables

### All other components
No direct changes needed — they use shadcn semantic tokens (`bg-background`, `text-foreground`, `bg-primary`, etc.) which will update automatically.

---

## 7. What Is NOT Changing

- Component structure, props, and logic
- Navigation hierarchy and routes
- UX flows (assignment, status, labels, CSAT, SLA, automations, etc.)
- shadcn component internals
- RTL layout logic — all `start`/`end` Tailwind utilities remain
- Convex data layer
- Clerk auth
- Any feature behavior

---

## 8. Border Radius

Keep current `--radius: 0.625rem` base. Derived values (`--radius-sm/md/lg/xl/2xl/3xl/4xl`) unchanged.

Message bubble radii are handled directly in `message-bubble.tsx` via inline styles or Tailwind, not as global tokens.

---

## 9. Implementation Order

1. **Token swap** — rewrite `:root` in `app/globals.css` (Navy + Emerald palette + semantic variables)
2. **Message bubbles** — update `message-bubble.tsx` (colors + asymmetric radius)
3. **Conversation list item** — update active/hover/unassigned/SLA/badge/tag styles
4. **Sidebar** — verify logo, active state, and user avatar pick up new tokens
5. **Chat header** — update contact name weight, status badges, action button styles
6. **Contact detail panel** — update stat numbers, section labels
7. **Message input** — update input + send button styles
8. **Smoke test** — open inbox, contacts, analytics, automations, settings; verify no broken styles in RTL

---

## 10. Out of Scope

- Light mode variant for Navy + Emerald (follow-up spec)
- Custom scrollbar styling
- Animation / transition changes
- Print styles
- Any new features
