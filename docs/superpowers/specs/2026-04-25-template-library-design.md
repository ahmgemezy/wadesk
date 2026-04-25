# Template Library — Design Spec
**Date:** 2026-04-25  
**Branch:** feat/013-departments  
**Status:** Approved — ready for implementation

---

## Overview

Add a curated pre-built template library to Settings → Templates. Users browse categorized example templates, preview them, and either save them as quick-reply templates (instant) or submit them directly to Meta for approval (broadcast-ready). The library lives in a static TypeScript file — no new database table needed.

---

## Decisions Summary

| Decision | Choice | Reason |
|---|---|---|
| Scope | Both Meta + Quick-Reply templates | Covers all template needs in one place |
| Library storage | Static `lib/templateLibrary.ts` | No DB needed for curated static content |
| Entry point | New "Template Library" tab on Settings → Templates | Always visible, discoverable without hunting for a button |
| Languages | Arabic + English (separate entries per language) | Matches existing `messageTemplates` schema |
| Card click | Preview sheet first → action button | User evaluates before committing |
| Meta submission | In-app via Convex action → Meta Graph API | No clipboard/BizManager detour |

---

## Template Categories

### Meta (Broadcast) Templates
Require Meta approval before use in broadcasts.

| Category | Description |
|---|---|
| `promotions` | Flash sales, discount codes, seasonal campaigns |
| `orders` | Confirmation, shipping, delivery updates |
| `appointments` | Booking confirmations, visit reminders |
| `payments` | Payment due, receipt confirmation, invoice ready |
| `welcome` | New customer welcome, account created |
| `feedback` | Post-service rating requests, review collection |
| `alerts` | Account alerts, security notices, status changes |
| `reengagement` | Win-back inactive customers, follow-up |

### Quick-Reply (Inbox) Templates
No Meta approval needed. Agents use directly in conversations.

| Category | Description |
|---|---|
| `greetings` | Opening lines, hello messages |
| `complaints` | Apology templates, escalation acknowledgment |
| `support` | Troubleshooting steps, reset instructions |
| `closing` | Wrapping up a conversation, resolution confirmation |
| `handoff` | Transferring to another agent or department |
| `out_of_hours` | Auto-reply for outside business hours |

---

## Static Library File

**Path:** `lib/templateLibrary.ts`

```ts
export type LibraryTemplate = {
  id: string;               // e.g. "flash-sale-ar"
  title: string;            // display name in English
  type: "meta" | "quick_reply";
  category: string;         // matches categories above
  language: "ar" | "en";
  body: string;             // template body with {{variable_name}} placeholders
  variables: string[];      // extracted variable names e.g. ["discount", "hours", "code"]
  metaCategory?: "MARKETING" | "UTILITY" | "AUTHENTICATION"; // only for type: "meta"
};
```

- ~50 templates total: ~3–5 per category, each in both Arabic and English
- Arabic and English stored as separate entries (matching `messageTemplates.language` field)
- Variables use named format `{{variable_name}}` for readability; auto-converted to Meta's numbered format `{{1}}` on submit
- No loading state — imported directly as a static array

---

## Page Structure

`components/settings/templates-settings.tsx` gains a two-tab layout:

- **"My Templates"** — existing content, unchanged
- **"📚 Template Library"** — new tab (see below)

---

## Template Library Tab

**Component:** `components/templates/template-library-tab.tsx`

### Filters (client-side, no Convex query)
1. **Search box** — filters by title and body text
2. **Type pills** — `All` | `📢 Meta (Broadcast)` | `💬 Quick-Reply`
3. **Category chips** — dynamic based on active type filter; shows relevant categories only

### Card Grid
- 3 columns on desktop, 2 on tablet, 1 on mobile
- Each card: **`components/templates/library-template-card.tsx`**

### Card Contents
- Title
- Body preview (2 lines, truncated, RTL-aware)
- Language badge: `AR` or `EN`
- Type badge: orange `📢 Meta` or blue `💬 Quick-Reply`
- Category badge

---

## Preview Sheet

**Component:** `components/templates/library-template-preview.tsx`  
Implemented as a `Sheet` (shadcn) opening from the right side.

### Contents
- Title + badges (type, category, language)
- WhatsApp phone mockup with template body — rendered as a simple chat bubble (the existing `WhatsAppTemplatePreview` expects Meta's `TemplateComponent[]` format; library templates have a plain body string, so the preview sheet uses a lightweight inline bubble renderer with variable highlighting instead)
- Variables list (highlighted in green)
- Type-specific note:
  - Meta: amber warning — *"Meta templates need approval before use in broadcasts"*
  - Quick-Reply: green note — *"Ready to use immediately — no Meta approval needed"*
- Action buttons:
  - **"Use This Template"** — behavior differs by type (see below)
  - **📋 copy icon** — copies body text to clipboard

### "Use This Template" — Quick-Reply
1. Closes preview sheet
2. Opens existing create dialog in `TemplatesSettings` with fields pre-filled:
   - `title` ← library template title
   - `body` ← library template body
   - `category` ← library template category
   - `language` ← library template language
3. User edits if needed → saves normally to `messageTemplates`

### "Use This Template" — Meta
1. Closes preview sheet
2. Opens `MetaSubmitForm` (see below)

---

## Meta Submit Form

**Component:** `components/templates/meta-submit-form.tsx`  
Implemented as a `Dialog` or `Sheet`.

### Fields (all pre-filled from library template)
| Field | Pre-fill | Notes |
|---|---|---|
| Template name | auto-generated slug e.g. `flash_sale_offer` | Editable; lowercase + underscores only; must be unique in WABA |
| Template body | library body | Editable; user sees named vars `{{discount}}` — auto-converted to `{{1}}` on submit |
| Meta category | mapped from library `metaCategory` | `MARKETING` / `UTILITY` / `AUTHENTICATION` dropdown |
| Language | library language | Dropdown |
| Channel | first channel (if only one) or dropdown | Required; tenant may have multiple WABAs |

### Variable auto-conversion
On submit, named variables are replaced in order of appearance:
- `{{discount}}` → `{{1}}`
- `{{hours}}` → `{{2}}`
- `{{code}}` → `{{3}}`

This conversion happens inside the Convex action before calling Meta API. The user never sees numbered variables.

### Submit action
- Calls `convex/metaTemplates.ts` → new `submitToMeta` action
- Action: `POST https://graph.facebook.com/v25.0/{wabaId}/message_templates`
- Uses `process.env.META_SYSTEM_USER_TOKEN` (same as `syncFromMeta`) — not per-channel token
- On success: inserts record into `metaTemplates` table with `status: "PENDING"`
- On Meta API error (including duplicate name): surfaces error message inline in the form — do not dismiss the form
- On success: shows toast *"Template submitted — Meta will review it within a few hours"*
- Template appears in "My Templates" tab with ⏳ Pending badge

### Status updates
The existing webhook listener (`convex/http.ts`) already handles `message_template_status_update` events from Meta. When Meta approves or rejects, the `metaTemplates` record status updates automatically and a notification is created.

---

## New Convex Function

**File:** `convex/metaTemplates.ts` — add `submitToMeta` action

```ts
submitToMeta: action({
  args: {
    channelId: v.id("channels"),
    name: v.string(),          // template name slug
    body: v.string(),          // body with numbered vars already applied
    metaCategory: v.string(),  // "MARKETING" | "UTILITY" | "AUTHENTICATION"
    language: v.string(),      // "ar" | "en"
  },
  // 1. Auth + tenant check
  // 2. Get channel (wabaId + token)
  // 3. POST to Meta Graph API
  // 4. On success: ctx.runMutation(internal.metaTemplates.upsertBatch, ...)
  // 5. Return template id from Meta response
})
```

---

## Files Changed / Created

| File | Change |
|---|---|
| `lib/templateLibrary.ts` | **New** — static array of ~50 pre-built templates |
| `components/templates/template-library-tab.tsx` | **New** — library tab with search, filters, card grid |
| `components/templates/library-template-card.tsx` | **New** — individual template card |
| `components/templates/library-template-preview.tsx` | **New** — preview side sheet |
| `components/templates/meta-submit-form.tsx` | **New** — Meta submission form/dialog |
| `components/settings/templates-settings.tsx` | **Modified** — wrap existing content in "My Templates" tab, add Library tab |
| `convex/metaTemplates.ts` | **Modified** — add `submitToMeta` action |

---

## Plan Gating

| Plan | Can use library | Can submit Meta templates |
|---|---|---|
| Free | ✅ browse only | ❌ (0 custom templates) |
| Starter | ✅ | ✅ (up to 10) |
| Growth | ✅ | ✅ (up to 50) |
| Business | ✅ | ✅ (unlimited) |

Free plan users see the library and can browse, but "Use This Template" for both types is disabled with an upgrade prompt.

---

## RTL / Arabic Rules

- Template body previews use `dir="rtl"` for Arabic templates, `dir="ltr"` for English
- Category chips and filter pills use `ms-` / `me-` spacing
- Card grid is direction-agnostic (CSS grid)
- Template name slug field always `dir="ltr"` (Meta requirement: ASCII only)
