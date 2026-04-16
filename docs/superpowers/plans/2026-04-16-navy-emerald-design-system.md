# Navy + Emerald Design System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current green-on-light color system with a Navy + Emerald dark-first design system by rewriting CSS tokens in `globals.css` and making targeted updates to 4 components.

**Architecture:** All colors flow through CSS custom properties in `app/globals.css`. Both `:root` and `.dark` get identical Navy + Emerald tokens so the UI is always dark regardless of OS preference. Four components need direct edits beyond what the token swap provides automatically (outbound bubble gradient, list item active state, sidebar logo, note textarea).

**Tech Stack:** Next.js 15, Tailwind CSS v4, shadcn/ui, Cairo font (already loaded).

---

## File Map

| File | Action | What changes |
|---|---|---|
| `app/globals.css` | **Modify** | Full rewrite of `:root` and `.dark` token blocks + add semantic vars |
| `components/inbox/message-bubble.tsx` | **Modify** | Outbound bubble: gradient classes + text color; internal note: text color |
| `components/inbox/conversation-list-item.tsx` | **Modify** | Active state classes, hover class, contact name weight |
| `components/inbox/message-input.tsx` | **Modify** | Note-mode textarea background + border |
| `components/shell/app-sidebar.tsx` | **Modify** | Add emerald gradient logo mark in sidebar header |

No new files. No Convex, no routes, no logic changes.

---

## Task 1: Rewrite CSS tokens in `app/globals.css`

**Files:**
- Modify: `app/globals.css`

This is the biggest task — it drives most visual changes automatically across all pages.

- [ ] **Step 1.1: Replace the `:root` block**

Open `app/globals.css`. Replace the entire `:root { ... }` block (lines 7–70) with:

```css
:root {
  /* ─── Surfaces ─────────────────────────────────────────────── */
  --background:            #0f1623;
  --foreground:            #dce8f5;
  --card:                  #1c2535;
  --card-foreground:       #dce8f5;
  --popover:               #192230;
  --popover-foreground:    #dce8f5;

  /* ─── Primary — Emerald ─────────────────────────────────────── */
  --primary:               #00e5a0;
  --primary-foreground:    #0a1020;

  /* ─── Neutrals ──────────────────────────────────────────────── */
  --secondary:             #1e2c40;
  --secondary-foreground:  #dce8f5;
  --muted:                 #253040;
  --muted-foreground:      #4a6080;
  --border:                rgba(255,255,255,0.07);
  --input:                 rgba(255,255,255,0.08);
  --ring:                  #00e5a0;

  /* ─── Accent — Teal ─────────────────────────────────────────── */
  --accent:                #00c4b4;
  --accent-foreground:     #0a1020;

  /* ─── Destructive ───────────────────────────────────────────── */
  --destructive:           oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.577 0.245 27.325);

  /* ─── Radius — unchanged ────────────────────────────────────── */
  --radius:                0.625rem;

  /* ─── Sidebar ───────────────────────────────────────────────── */
  --sidebar:                    #0a1020;
  --sidebar-background:         #0a1020;
  --sidebar-foreground:         #4a6080;
  --sidebar-primary:            #00e5a0;
  --sidebar-primary-foreground: #0a1020;
  --sidebar-accent:             rgba(0,229,160,0.12);
  --sidebar-accent-foreground:  #00e5a0;
  --sidebar-border:             rgba(255,255,255,0.06);
  --sidebar-ring:               #00e5a0;

  /* ─── Charts ────────────────────────────────────────────────── */
  --chart-1: #00e5a0;
  --chart-2: #00c4b4;
  --chart-3: #4a6080;
  --chart-4: #253040;
  --chart-5: #1e2c40;

  /* ─── Message bubbles ───────────────────────────────────────── */
  --agent-bubble-bg:        #253040;
  --agent-bubble-text:      #dce8f5;
  --agent-bubble-border:    rgba(255,255,255,0.06);
  --customer-bubble-bg:     #253040;
  --customer-bubble-text:   #dce8f5;
  --internal-note-bg:       rgba(248,180,0,0.06);
  --internal-note-border:   rgba(248,180,0,0.25);
  --internal-note-text:     #c8a020;

  /* ─── Conversation list ─────────────────────────────────────── */
  --conv-active-bg:         #1e2c40;
  --conv-active-border:     #00e5a0;
  --conv-hover-bg:          #171f30;
  --unassigned-bg:          rgba(249,115,22,0.04);
  --online-dot:             #00e5a0;
  --unassigned-dot:         #f97316;
}
```

- [ ] **Step 1.2: Replace the `.dark` block**

Replace the entire `.dark { ... }` block (lines 72–132) with an **identical copy** of the `:root` block above — same values, just different selector. This forces the app to always render in dark mode:

```css
.dark {
  /* ─── Surfaces ─────────────────────────────────────────────── */
  --background:            #0f1623;
  --foreground:            #dce8f5;
  --card:                  #1c2535;
  --card-foreground:       #dce8f5;
  --popover:               #192230;
  --popover-foreground:    #dce8f5;

  /* ─── Primary — Emerald ─────────────────────────────────────── */
  --primary:               #00e5a0;
  --primary-foreground:    #0a1020;

  /* ─── Neutrals ──────────────────────────────────────────────── */
  --secondary:             #1e2c40;
  --secondary-foreground:  #dce8f5;
  --muted:                 #253040;
  --muted-foreground:      #4a6080;
  --border:                rgba(255,255,255,0.07);
  --input:                 rgba(255,255,255,0.08);
  --ring:                  #00e5a0;

  /* ─── Accent — Teal ─────────────────────────────────────────── */
  --accent:                #00c4b4;
  --accent-foreground:     #0a1020;

  /* ─── Destructive ───────────────────────────────────────────── */
  --destructive:           oklch(0.704 0.191 22.216);
  --destructive-foreground: oklch(0.637 0.237 25.331);

  /* ─── Radius ────────────────────────────────────────────────── */
  --radius:                0.625rem;

  /* ─── Sidebar ───────────────────────────────────────────────── */
  --sidebar:                    #0a1020;
  --sidebar-background:         #0a1020;
  --sidebar-foreground:         #4a6080;
  --sidebar-primary:            #00e5a0;
  --sidebar-primary-foreground: #0a1020;
  --sidebar-accent:             rgba(0,229,160,0.12);
  --sidebar-accent-foreground:  #00e5a0;
  --sidebar-border:             rgba(255,255,255,0.06);
  --sidebar-ring:               #00e5a0;

  /* ─── Charts ────────────────────────────────────────────────── */
  --chart-1: #00e5a0;
  --chart-2: #00c4b4;
  --chart-3: #4a6080;
  --chart-4: #253040;
  --chart-5: #1e2c40;

  /* ─── Message bubbles ───────────────────────────────────────── */
  --agent-bubble-bg:        #253040;
  --agent-bubble-text:      #dce8f5;
  --agent-bubble-border:    rgba(255,255,255,0.06);
  --customer-bubble-bg:     #253040;
  --customer-bubble-text:   #dce8f5;
  --internal-note-bg:       rgba(248,180,0,0.06);
  --internal-note-border:   rgba(248,180,0,0.25);
  --internal-note-text:     #c8a020;

  /* ─── Conversation list ─────────────────────────────────────── */
  --conv-active-bg:         #1e2c40;
  --conv-active-border:     #00e5a0;
  --conv-hover-bg:          #171f30;
  --unassigned-bg:          rgba(249,115,22,0.04);
  --online-dot:             #00e5a0;
  --unassigned-dot:         #f97316;
}
```

- [ ] **Step 1.3: Verify the `@theme inline` block is untouched**

The `@theme inline { ... }` block (currently starting around line 134) must remain exactly as-is — it just maps the CSS vars to Tailwind color names. Do not change it.

- [ ] **Step 1.4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors (globals.css changes don't affect TypeScript).

- [ ] **Step 1.5: Commit**

```bash
git add app/globals.css
git commit -m "feat(design): replace tokens with Navy + Emerald palette"
```

---

## Task 2: Update message bubbles in `message-bubble.tsx`

**Files:**
- Modify: `components/inbox/message-bubble.tsx`

Three changes:
1. Outbound (agent→customer) bubble: CSS var can't hold a gradient, so use Tailwind gradient classes directly.
2. Internal note label: use `--internal-note-text` instead of `--agent-bubble-text` for amber color.
3. Internal note content: add amber text color.

- [ ] **Step 2.1: Update the `bubbleBase` variable (outbound gradient)**

Find this block in the file (around line 187):

```tsx
  const bubbleBase = `max-w-[75%] rounded-[20px] p-3 ${
    isInbound
      ? "bg-[--customer-bubble-bg] text-[--customer-bubble-text] rounded-ee-sm"
      : "bg-[--agent-bubble-bg] text-[--agent-bubble-text] rounded-es-sm"
  }`;
```

Replace with:

```tsx
  const bubbleBase = `max-w-[75%] rounded-[20px] p-3 ${
    isInbound
      ? "bg-[--customer-bubble-bg] text-[--customer-bubble-text] rounded-ee-sm"
      : "bg-gradient-to-br from-[#00e5a0] to-[#00c4b4] text-[#0a1020] rounded-es-sm"
  }`;
```

- [ ] **Step 2.2: Update the internal note label text color**

Find the internal note render block (around line 172–184):

```tsx
  if (message.isInternalNote) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[75%] rounded-[20px] rounded-ee-sm bg-[--internal-note-bg] p-3 border border-dashed border-[--internal-note-border]">
          <div className="text-xs font-medium text-[--agent-bubble-text] mb-1">
            {t("Internal Note", "ملاحظة داخلية")}
          </div>
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
          <div className="text-xs text-muted-foreground mt-1 text-start">{timeStr}</div>
        </div>
      </div>
    );
  }
```

Replace with:

```tsx
  if (message.isInternalNote) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[75%] rounded-[20px] rounded-ee-sm bg-[--internal-note-bg] p-3 border border-dashed border-[--internal-note-border]">
          <div className="text-xs font-medium text-[--internal-note-text] mb-1">
            {t("Internal Note", "ملاحظة داخلية")}
          </div>
          <div className="text-sm whitespace-pre-wrap text-[--internal-note-text]">{message.content}</div>
          <div className="text-xs text-muted-foreground mt-1 text-start">{timeStr}</div>
        </div>
      </div>
    );
  }
```

- [ ] **Step 2.3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2.4: Commit**

```bash
git add components/inbox/message-bubble.tsx
git commit -m "feat(design): update message bubble colors for Navy + Emerald"
```

---

## Task 3: Update conversation list item in `conversation-list-item.tsx`

**Files:**
- Modify: `components/inbox/conversation-list-item.tsx`

Three changes:
1. Active item: use semantic `--conv-active-bg` / `--conv-active-border` instead of `bg-accent/60`.
2. Hover: use `--conv-hover-bg` for the correct darker navy tone.
3. Contact name: bump from `font-semibold` to `font-bold` (Bold Display typography).

- [ ] **Step 3.1: Update the root `className` on the list item div**

Find this `cn(...)` block (around line 94–98):

```tsx
      className={cn(
        "group w-full text-start p-3 border-b hover:bg-secondary/70 transition-colors cursor-pointer",
        isActive && "bg-accent/60 border-s-[3px] border-s-primary",
        !conversation.assignedAgentId && !isActive && "bg-(--unassigned-bg)",
      )}
```

Replace with:

```tsx
      className={cn(
        "group w-full text-start p-3 border-b hover:bg-[--conv-hover-bg] transition-colors cursor-pointer",
        isActive && "bg-[--conv-active-bg] border-s-2 border-s-[--conv-active-border]",
        !conversation.assignedAgentId && !isActive && "bg-(--unassigned-bg)",
      )}
```

- [ ] **Step 3.2: Update contact name font weight**

Find the contact name span (around line 116–119):

```tsx
            <span
              className="text-sm font-semibold truncate"
              dir="auto"
            >
```

Replace with:

```tsx
            <span
              className="text-sm font-bold truncate"
              dir="auto"
            >
```

- [ ] **Step 3.3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3.4: Commit**

```bash
git add components/inbox/conversation-list-item.tsx
git commit -m "feat(design): update conversation list item for Navy + Emerald"
```

---

## Task 4: Update note textarea in `message-input.tsx`

**Files:**
- Modify: `components/inbox/message-input.tsx`

The note-mode textarea currently uses hardcoded Tailwind amber classes. Update to use the semantic note tokens so it matches the dark theme.

- [ ] **Step 4.1: Update the Textarea className for note mode**

Find the Textarea component (around line 344–361):

```tsx
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          isNote
            ? t("Add internal note...", "اكتب ملاحظة داخلية...")
            : t("Type your reply...", "اكتب ردك...")
        }
        className={`min-h-20 resize-none ${
          isNote
            ? "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800"
            : ""
        }`}
        dir="auto"
      />
```

Replace with:

```tsx
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          isNote
            ? t("Add internal note...", "اكتب ملاحظة داخلية...")
            : t("Type your reply...", "اكتب ردك...")
        }
        className={`min-h-20 resize-none ${
          isNote
            ? "bg-[--internal-note-bg] border-[--internal-note-border] text-[--internal-note-text] placeholder:text-[--internal-note-text]/50"
            : ""
        }`}
        dir="auto"
      />
```

- [ ] **Step 4.2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4.3: Commit**

```bash
git add components/inbox/message-input.tsx
git commit -m "feat(design): update note textarea colors for Navy + Emerald"
```

---

## Task 5: Add emerald logo mark to the sidebar

**Files:**
- Modify: `components/shell/app-sidebar.tsx`

The current sidebar header shows just the text "WaDesk". Add an emerald gradient rounded square with a "W" as a logo mark — visible both in expanded and collapsed state.

- [ ] **Step 5.1: Update the `SidebarHeader` content**

Find the `SidebarHeader` block (around line 95–100):

```tsx
      <SidebarHeader className="p-3 flex flex-row items-center gap-2">
        <span className="text-base font-bold flex-1 tracking-tight text-foreground group-data-[collapsible=icon]:hidden">
          WaDesk
        </span>
        <LocaleSwitcher locale={locale} />
      </SidebarHeader>
```

Replace with:

```tsx
      <SidebarHeader className="p-3 flex flex-row items-center gap-2">
        <div className="size-7 rounded-lg bg-gradient-to-br from-[#00e5a0] to-[#00c4b4] flex items-center justify-center shrink-0">
          <span className="text-[11px] font-black text-[#0a1020] leading-none">W</span>
        </div>
        <span className="text-base font-bold flex-1 tracking-tight text-foreground group-data-[collapsible=icon]:hidden">
          WaDesk
        </span>
        <LocaleSwitcher locale={locale} />
      </SidebarHeader>
```

- [ ] **Step 5.2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5.3: Commit**

```bash
git add components/shell/app-sidebar.tsx
git commit -m "feat(design): add emerald logo mark to sidebar header"
```

---

## Task 6: Build verification and smoke test

**Files:** none — read-only verification

- [ ] **Step 6.1: Run the full build**

```bash
npm run build
```

Expected: Build succeeds with no errors. Warnings about unused CSS vars are OK. Any TypeScript error must be fixed before continuing.

- [ ] **Step 6.2: Start the dev server**

```bash
npm run dev
```

Open `http://localhost:3000`.

- [ ] **Step 6.3: Smoke-test each main section**

Check these pages visually. For each, confirm: dark navy background, emerald accent, no light-mode flash, readable Arabic text.

| Page | URL | What to check |
|---|---|---|
| Inbox list | `/inbox` | Conversation list items, active state (navy bg + emerald left border), unread badge (emerald), sidebar (dark `#0a1020`) |
| Open conversation | `/inbox/[any-id]` | Outbound bubbles (emerald gradient), inbound bubbles (dark `#253040`), internal notes (amber tint), send button area |
| Contacts | `/contacts` | Cards, table, no broken colors |
| Analytics | `/analytics` | Charts (emerald palette), stat cards |
| Automations | `/automations` | Cards, switch toggles |
| Settings | `/settings` | Form inputs, panels |

- [ ] **Step 6.4: Check sidebar states**

In the sidebar:
- Verify the "W" logo mark appears (emerald gradient square)
- Click to collapse sidebar — confirm "W" stays visible, text "WaDesk" hides
- Verify the active nav item has a teal/emerald icon color
- Verify inactive nav icons are muted (`#4a6080`)

- [ ] **Step 6.5: Check RTL layout**

Switch language to Arabic (use the locale switcher in the sidebar). Verify:
- Active conversation item border is on the **right** side (inline-end in RTL)
- Message bubbles still display correctly
- No broken layout

- [ ] **Step 6.6: Commit smoke test completion note**

```bash
git commit --allow-empty -m "chore: Navy + Emerald design system smoke test passed"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Token swap (`:root` + `.dark`) → Task 1
- ✅ Forced dark mode → Task 1 (both blocks identical)
- ✅ Outbound bubble gradient → Task 2
- ✅ Internal note amber colors → Task 2
- ✅ Active conv item border + bg → Task 3
- ✅ Hover state → Task 3
- ✅ Contact name `font-bold` → Task 3
- ✅ Note textarea → Task 4
- ✅ Sidebar logo mark → Task 5
- ✅ Sidebar token inheritance → automatic via globals.css (no direct component edit needed for active/inactive icon colors — shadcn SidebarMenuButton uses `--sidebar-primary` / `--sidebar-foreground` automatically)
- ✅ Chat header → automatic via `bg-background` token (no direct edits needed)
- ✅ Contact panel stat numbers → automatic via `text-foreground` (no direct edits needed — stat numbers use default text color)
- ✅ Unread badge → automatic via `bg-primary text-primary-foreground` on `Badge` component

**What is NOT in scope (confirm before starting):**
- No new features, no UX changes, no new pages, no Convex changes
- No light mode variant
- No per-label-type color logic (all labels use generic accent color)
