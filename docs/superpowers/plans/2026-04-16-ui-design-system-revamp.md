# UI Design System Revamp (Warm Gold) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current neutral/green color system with a Warm Gold design system applied globally via CSS custom properties, with targeted visual touch-ups to message bubbles and conversation list items.

**Architecture:** All color changes flow from a single source — CSS custom properties in `app/globals.css`. shadcn components pick up the new palette automatically. Only two components need manual edits because they hardcode green/amber colors that tokens don't cover: `message-bubble.tsx` (bubble colors + pill shape) and `conversation-list-item.tsx` (status chip colors + unassigned row tint).

**Tech Stack:** Tailwind CSS v4, shadcn/ui, CSS custom properties (oklch and hex)

---

## Files Changed

| File | Action | Why |
|---|---|---|
| `app/globals.css` | Modify | Replace all `:root` and `.dark` CSS token values; add 9 semantic variables |
| `components/inbox/message-bubble.tsx` | Modify | Replace `bg-green-100/dark:bg-green-900` with semantic bubble tokens; add pill shape |
| `components/inbox/conversation-list-item.tsx` | Modify | Replace hardcoded green/yellow/gray status chip colors; update label chip and unassigned row |

---

## Task 1: Replace CSS Design Tokens in `globals.css`

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Replace the `:root` block**

Open `app/globals.css`. Replace the entire `:root { ... }` block (lines 7–42) with:

```css
:root {
  --background: #faf9f6;
  --foreground: #1a1c1a;
  --card: #ffffff;
  --card-foreground: #1a1c1a;
  --popover: #ffffff;
  --popover-foreground: #1a1c1a;
  --primary: #775a19;
  --primary-foreground: #ffffff;
  --secondary: #efeeeb;
  --secondary-foreground: #1a1c1a;
  --muted: #f4f3f1;
  --muted-foreground: #7f7667;
  --accent: #e9c176;
  --accent-foreground: #4e3700;
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.577 0.245 27.325);
  --border: #e3e2e0;
  --input: #e3e2e0;
  --ring: #c5a059;
  --radius: 0.625rem;
  --sidebar: #efeeeb;
  --sidebar-background: #efeeeb;
  --sidebar-foreground: #1a1c1a;
  --sidebar-primary: #775a19;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #e3e2e0;
  --sidebar-accent-foreground: #1a1c1a;
  --sidebar-border: #d1c5b4;
  --sidebar-ring: #c5a059;
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);

  /* Semantic: message bubbles */
  --agent-bubble-bg: #ffdea5;
  --agent-bubble-text: #4e3700;
  --customer-bubble-bg: #efeeeb;
  --customer-bubble-text: #1a1c1a;
  --internal-note-bg: #fffbf0;
  --internal-note-border: #e9c176;

  /* Semantic: conversation list */
  --unassigned-bg: #fffbf0;
  --online-dot: #22c55e;
  --unassigned-dot: #f97316;
}
```

- [ ] **Step 2: Replace the `.dark` block**

Replace the entire `.dark { ... }` block (lines 44–78) with:

```css
.dark {
  --background: #1a1c1a;
  --foreground: #f4f3f1;
  --card: #242620;
  --card-foreground: #f4f3f1;
  --popover: #242620;
  --popover-foreground: #f4f3f1;
  --primary: #e9c176;
  --primary-foreground: #1a1c1a;
  --secondary: #2e2f2a;
  --secondary-foreground: #f4f3f1;
  --muted: #2e2f2a;
  --muted-foreground: #9a9186;
  --accent: #c5a059;
  --accent-foreground: #1a1c1a;
  --destructive: oklch(0.704 0.191 22.216);
  --destructive-foreground: oklch(0.637 0.237 25.331);
  --border: rgba(255, 255, 255, 0.1);
  --input: rgba(255, 255, 255, 0.12);
  --ring: #775a19;
  --sidebar: #1e2019;
  --sidebar-background: #1e2019;
  --sidebar-foreground: #f4f3f1;
  --sidebar-primary: #e9c176;
  --sidebar-primary-foreground: #1a1c1a;
  --sidebar-accent: #2e2f2a;
  --sidebar-accent-foreground: #f4f3f1;
  --sidebar-border: rgba(255, 255, 255, 0.08);
  --sidebar-ring: #775a19;
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
}
```

- [ ] **Step 3: Verify the file still compiles**

```bash
cd /Users/ahmedgemmezy/Documents/WABDesk && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (or only pre-existing warnings unrelated to CSS).

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat(design-system): apply Warm Gold CSS token system"
```

---

## Task 2: Update Message Bubbles — Colors + Pill Shape

**Files:**
- Modify: `components/inbox/message-bubble.tsx`

Currently:
- Outbound (agent) bubbles: `bg-green-100 dark:bg-green-900`
- Inbound (customer) bubbles: `bg-muted`
- Internal notes: `bg-amber-50 dark:bg-amber-950 border-amber-200`
- All bubbles: `rounded-lg`

Target:
- Outbound: `bg-[--agent-bubble-bg] text-[--agent-bubble-text]`
- Inbound: `bg-[--customer-bubble-bg] text-[--customer-bubble-text]`
- Internal notes: `bg-[--internal-note-bg] border-[--internal-note-border] border-dashed`
- Pill shape: `rounded-[20px]` with one flat corner (outbound = `rounded-es-sm`, inbound = `rounded-ee-sm`)
- Deleted message placeholder uses `bg-[--customer-bubble-bg]` for inbound

- [ ] **Step 1: Replace `bubbleBase` and deleted message colors**

Find this block around line 161–187:

```tsx
  if (message.deletedAt) {
    return (
      <div className={message.direction === "inbound" ? "flex justify-start" : "flex justify-end"}>
        <div className={`max-w-[75%] rounded-lg p-3 ${message.direction === "inbound" ? "bg-muted" : "bg-green-100 dark:bg-green-900"} opacity-50 italic`}>
```

Replace with:

```tsx
  if (message.deletedAt) {
    return (
      <div className={message.direction === "inbound" ? "flex justify-start" : "flex justify-end"}>
        <div className={`max-w-[75%] rounded-[20px] p-3 ${message.direction === "inbound" ? "bg-[--customer-bubble-bg] text-[--customer-bubble-text] rounded-ee-sm" : "bg-[--agent-bubble-bg] text-[--agent-bubble-text] rounded-es-sm"} opacity-50 italic`}>
```

- [ ] **Step 2: Replace internal note colors**

Find this block around line 172–184:

```tsx
  if (message.isInternalNote) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[75%] rounded-lg bg-amber-50 dark:bg-amber-950 p-3 border border-amber-200 dark:border-amber-800">
          <div className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">
```

Replace with:

```tsx
  if (message.isInternalNote) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[75%] rounded-[20px] rounded-ee-sm bg-[--internal-note-bg] p-3 border border-dashed border-[--internal-note-border]">
          <div className="text-xs font-medium text-[--agent-bubble-text] mb-1">
```

- [ ] **Step 3: Replace `bubbleBase` variable**

Find line 187:

```tsx
  const bubbleBase = `max-w-[75%] rounded-lg p-3 ${isInbound ? "bg-muted" : "bg-green-100 dark:bg-green-900"}`;
```

Replace with:

```tsx
  const bubbleBase = `max-w-[75%] rounded-[20px] p-3 ${
    isInbound
      ? "bg-[--customer-bubble-bg] text-[--customer-bubble-text] rounded-ee-sm"
      : "bg-[--agent-bubble-bg] text-[--agent-bubble-text] rounded-es-sm"
  }`;
```

- [ ] **Step 4: Fix quoted message preview colors**

Find lines 85–90 in the `QuotedMessagePreview` component:

```tsx
      className={`rounded px-2 py-1 mb-1 text-xs border-s-2 ${
        isOutbound
          ? "bg-green-50 dark:bg-green-950 border-green-400"
          : "bg-gray-100 dark:bg-gray-800 border-gray-400"
      }`}
```

Replace with:

```tsx
      className={`rounded px-2 py-1 mb-1 text-xs border-s-2 ${
        isOutbound
          ? "bg-[--internal-note-bg] border-[--accent]"
          : "bg-[--muted] border-[--border]"
      }`}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/ahmedgemmezy/Documents/WABDesk && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add components/inbox/message-bubble.tsx
git commit -m "feat(design-system): warm gold pill bubbles for messages"
```

---

## Task 3: Update Conversation List Item Colors

**Files:**
- Modify: `components/inbox/conversation-list-item.tsx`

Currently hardcodes green/yellow/gray for status chips (`bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300` etc.) and `bg-muted` for label chips. Unassigned text uses `text-amber-600`.

Target:
- Status "open": `bg-[--online-dot]/15 text-[--online-dot]` (green tint, token-based)
- Status "pending": `bg-accent/30 text-accent-foreground` (gold tint)
- Status "resolved": `bg-muted text-muted-foreground`
- Label chips: `bg-accent/20 text-accent-foreground`
- Unassigned text: `text-[--unassigned-dot]`

- [ ] **Step 1: Replace `statusColor` values**

Find lines 74–79:

```tsx
  const statusColor =
    conversation.status === "open"
      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
      : conversation.status === "pending"
        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
        : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
```

Replace with:

```tsx
  const statusColor =
    conversation.status === "open"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      : conversation.status === "pending"
        ? "bg-accent/30 text-accent-foreground"
        : "bg-muted text-muted-foreground";
```

- [ ] **Step 2: Replace label chip classes**

Find lines 171–177:

```tsx
                <span
                  key={name}
                  className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground font-medium max-w-[72px] truncate"
                >
```

Replace with:

```tsx
                <span
                  key={name}
                  className="inline-flex items-center gap-0.5 rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] leading-none text-accent-foreground font-medium max-w-[72px] truncate"
                >
```

- [ ] **Step 3: Replace unassigned text color**

Find line 197–199:

```tsx
            {!conversation.assignedAgentId && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400">
```

Replace with:

```tsx
            {!conversation.assignedAgentId && (
              <span className="text-[10px] text-[--unassigned-dot]">
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/ahmedgemmezy/Documents/WABDesk && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add components/inbox/conversation-list-item.tsx
git commit -m "feat(design-system): warm gold colors for conversation list item"
```

---

## Task 4: Smoke Test

No code changes — visual verification only.

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/ahmedgemmezy/Documents/WABDesk && npm run dev
```

Expected: server starts on `http://localhost:3000` with no build errors.

- [ ] **Step 2: Check each section**

Open `http://localhost:3000` in a browser and verify these sections look correct (warm sand/gold palette, no leftover green):

| Section | URL | What to check |
|---|---|---|
| Inbox list | `/inbox` | Sand background, gold active item border, gold/amber label chips, unassigned rows have amber tint |
| Conversation thread | `/inbox/[any-id]` | Agent bubbles are light gold (#ffdea5), customer bubbles are warm gray (#efeeeb), internal notes are dashed gold border, pill shape |
| Sidebar | any | Warm sand background, gold active icon |
| Contacts | `/contacts` | Background/card colors updated (token-driven, no manual changes needed) |
| Settings | `/settings` | Same — token-driven |
| Dark mode | toggle | Sidebar goes dark brown, primary turns to light gold (#e9c176) |

- [ ] **Step 3: If anything looks broken**

Common issues and fixes:
- A section still shows green → search for `green-` in that component file and replace with the appropriate token class
- A button looks wrong → shadcn Button uses `bg-primary` which now maps to `#775a19` — this is expected and correct
- Focus rings look off → they now use `--ring: #c5a059` (golden) — correct

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(design-system): Warm Gold retheme complete"
```
