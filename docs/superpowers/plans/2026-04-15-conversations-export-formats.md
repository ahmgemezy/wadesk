# Plan: Conversations Export — CSV & HTML Viewer Formats

**Branch:** `015-conversations-export-formats`  
**Goal:** Add two new export format options for conversations — a flat CSV (one row per message, accessible to non-technical users) and a self-contained HTML viewer (browse conversations in a browser, no tools needed) — alongside the existing JSON option.

---

## Context

### Current State
- `convex/export.ts` — has `generateConversationsExport` action (JSON only), `generateContactsExport` action (CSV)
- `components/settings/data-export.tsx` — UI with two export buttons; one download URL state shared across both kinds
- `app/(dashboard)/settings/export/page.tsx` — renders `<DataExport />`

### What Needs to Change
The "Export Conversations" row currently only exports JSON. We need to turn it into a format selector so the admin can pick: **JSON** / **CSV** / **HTML Viewer** before hitting Export.

---

## Implementation Steps

### Step 1 — Add `format` arg to `generateConversationsExport` in `convex/export.ts`

Change the existing action signature to accept a `format` argument:

```ts
args: { format: v.union(v.literal("json"), v.literal("csv"), v.literal("html")) }
```

Keep the existing JSON path unchanged. Add two new branches in the handler:

#### CSV branch
Build a flat CSV — **one row per message** — with these columns:
```
conversationId, contactPhone, contactName, channel, status, labels, assignedAgentId, conversationCreatedAt, conversationResolvedAt, messageFrom, messageType, messageContent, messageSentAt, isInternal
```

Rules:
- `labels` → semicolon-separated string (e.g. `"شكوى;VIP"`)
- `messageContent` → use `escapeCsvField()` (already defined in the file) — handle Arabic text and commas safely
- Use `new Date(timestamp).toISOString()` for all dates
- Store as `text/csv` blob, return storage URL

#### HTML branch
Generate a **self-contained HTML file** (no external dependencies — inline all CSS):

Structure:
- Full-page layout with a sidebar listing all conversations (contact name + date + status badge)
- Clicking a conversation shows messages on the right in a WhatsApp-style chat bubble layout
  - Customer messages: left-aligned, gray bubble
  - Agent messages: right-aligned, green bubble
  - Internal notes: right-aligned, amber/yellow bubble with a 🔒 icon
- Header shows: contact name, phone, channel, status, labels (as colored badges), assigned agent
- Search box at the top of the sidebar to filter by contact name or phone
- Fully RTL-aware: use `dir="auto"` on message bubbles so Arabic text renders correctly
- No JavaScript frameworks — plain vanilla JS for the sidebar click interaction and search filter
- Embed all conversation data as a JSON blob inside a `<script>` tag
- Store as `text/html` blob, return storage URL

HTML file structure:
```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>WaDesk Export — [TenantId] — [Date]</title>
  <style>/* all styles inline */</style>
</head>
<body>
  <script>const DATA = [/* conversations JSON */];</script>
  <script>/* vanilla JS app logic */</script>
</body>
</html>
```

---

### Step 2 — Update `components/settings/data-export.tsx`

Replace the single "Export Conversations (JSON)" row with a **format-selector UI**:

**UI design:**
- Keep the row label: "Export Conversations"
- Below the description, add three toggle buttons (like a segmented control using shadcn `ToggleGroup` or plain styled `Button` variants):
  - `JSON` — "للمطورين وأدوات الاستيراد" / "For developers & import tools"
  - `CSV` — "لإكسل وجوجل شيتس" / "For Excel & Google Sheets"
  - `HTML` — "عرض في المتصفح" / "Browse in browser"
- Default selected: `JSON`
- Export button remains the same; passes selected format to the action

**State changes:**
- Add `conversationsFormat: "json" | "csv" | "html"` state (default `"json"`)
- Keep separate download URLs per export kind — change `downloadUrl: string | null` to:
  ```ts
  const [downloadUrls, setDownloadUrls] = useState<Record<ExportKind, string | null>>({
    contacts: null,
    conversations: null,
  });
  ```
- Show the download link under its respective section (not a single shared banner)

**Bilingual labels for format options:**
| Format | English | Arabic |
|--------|---------|--------|
| JSON | For developers & import tools | للمطورين وأدوات الاستيراد |
| CSV | For Excel & Google Sheets | لإكسل وجوجل شيتس |
| HTML | Browse in browser | عرض في المتصفح |

---

### Step 3 — Verify RTL & Arabic correctness

- Test format toggle renders correctly in RTL layout
- Verify Arabic text in CSV exports doesn't get mangled (UTF-8 BOM may be needed for Excel on Windows — prepend `\uFEFF` to the CSV string)
- Verify HTML viewer renders Arabic chat bubbles with `dir="auto"` correctly
- Check download link appears under the correct section after export

---

## Files to Modify

| File | Change |
|------|--------|
| `convex/export.ts` | Add `format` arg to `generateConversationsExport`; add CSV and HTML generation branches |
| `components/settings/data-export.tsx` | Add format selector UI; split download URL state per section |

## Files NOT to Touch
- `app/(dashboard)/settings/export/page.tsx` — no changes needed
- `convex/schema.ts` — no schema changes needed
- Any other file

---

## Constraints & Rules
- No new npm packages — use only what's already in the project
- All Convex action code: TypeScript strict, no `any`
- CSV must prepend UTF-8 BOM (`\uFEFF`) so Arabic text opens correctly in Excel
- HTML file must be fully self-contained — zero external CDN or font URLs
- `escapeCsvField()` already exists in `convex/export.ts` — reuse it, do not duplicate
- Follow existing `t("English", "Arabic")` pattern for all new UI strings
- RTL rules from CLAUDE.md apply: use `ms-`/`me-` Tailwind utilities, no hardcoded `left`/`right`

---

## Definition of Done
- [ ] Admin can select JSON / CSV / HTML before exporting conversations
- [ ] CSV opens correctly in Excel with Arabic text (UTF-8 BOM)
- [ ] HTML viewer renders all conversations with chat bubble UI, search works
- [ ] Download link appears under the conversations section (not a shared banner)
- [ ] No TypeScript errors
- [ ] Works in RTL layout
