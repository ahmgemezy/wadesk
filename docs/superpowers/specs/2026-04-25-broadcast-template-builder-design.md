# Broadcast Template Builder — Design Spec

**Date:** 2026-04-25  
**Status:** Approved  
**Branch target:** feat/ (new branch from `002-agent-roles`)

---

## Problem

WhatsApp broadcasts require Meta-approved templates. Today, admins must leave WABDesk and use Meta Business Manager to create those templates — a painful, technical process that breaks the flow. There is also no way to include media (images, videos) or call-to-action buttons in templates created from within WABDesk.

WABDesk must become a self-contained Meta template builder: admin writes the template, WABDesk submits it to Meta, and once approved it appears in Broadcasts.

---

## Scope

This spec covers:
- New `broadcastTemplates` Convex table and CRUD + Meta submission functions
- Template builder UI (form + live preview)
- "Broadcast Templates" tab in Settings → Templates
- Integration with the Broadcasts wizard (approved templates selectable)
- Status sync (manual + cron)
- Plan gating

Out of scope:
- WhatsApp template analytics (open rate, click rate) — Phase 2
- Authentication category templates — not needed for SMB use case
- CATALOG / LTO / CAROUSEL template formats — Phase 2

---

## Data Layer

### New table: `broadcastTemplates`

```typescript
broadcastTemplates: defineTable({
  tenantId: v.string(),
  channelId: v.id("channels"),       // which WABA channel to submit to

  // Meta identity
  name: v.string(),                  // slugified Meta name, e.g. "product_showcase_ar"
  title: v.string(),                 // display name in WABDesk UI only
  language: v.string(),              // "ar" | "en"
  category: v.union(
    v.literal("MARKETING"),
    v.literal("UTILITY"),
  ),

  // Header
  headerType: v.union(
    v.literal("NONE"),
    v.literal("TEXT"),
    v.literal("IMAGE"),
    v.literal("VIDEO"),
    v.literal("DOCUMENT"),
  ),
  headerText: v.optional(v.string()),       // only when headerType === "TEXT"
  headerMediaUrl: v.optional(v.string()),   // default media URL; overridable at send time

  // Body
  body: v.string(),                         // text with {{variable_name}} placeholders
  variables: v.array(v.string()),           // auto-extracted on save (order matters for Meta mapping)

  // Footer (optional)
  footer: v.optional(v.string()),

  // Buttons (optional, up to 3)
  buttons: v.optional(v.array(v.object({
    type: v.union(v.literal("URL"), v.literal("PHONE_NUMBER"), v.literal("QUICK_REPLY")),
    text: v.string(),
    value: v.string(),                      // URL, phone number, or quick-reply payload
    isDynamic: v.optional(v.boolean()),     // true = URL appends a {{1}} suffix at broadcast time
  }))),

  // Meta approval lifecycle
  metaStatus: v.union(
    v.literal("draft"),
    v.literal("pending"),
    v.literal("approved"),
    v.literal("rejected"),
    v.literal("paused"),
  ),
  metaTemplateId: v.optional(v.string()),
  metaRejectionReason: v.optional(v.string()),
  metaSubmittedAt: v.optional(v.number()),

  createdBy: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_tenant", ["tenantId"])
  .index("by_channel", ["channelId"])
  .index("by_tenant_status", ["tenantId", "metaStatus"])
```

### Existing tables — no changes

- `messageTemplates` — quick-reply templates, unchanged
- `metaTemplates` — synced-from-Meta templates, unchanged
- Both continue to work as before

---

## Convex Functions — `convex/broadcastTemplates.ts`

| Function | Type | Auth | Notes |
|---|---|---|---|
| `list` | query | any role | filter by `tenantId`, optional `metaStatus` arg |
| `create` | mutation | admin / supervisor | saves as `draft`; enforces plan limit |
| `update` | mutation | admin / supervisor | blocked if status is `pending` or `approved` |
| `remove` | mutation | admin / supervisor | blocked if status is `pending` or `approved` |
| `submit` | action | admin / supervisor | POSTs to Meta API, sets status → `pending` |
| `syncStatus` | action | internal | GETs from Meta API, updates status field |

### Plan limits (enforced server-side in `convex/lib/planLimits.ts`)

| Plan | Max broadcast templates |
|---|---|
| Free | 2 |
| Starter | 6 |
| Growth | 20 |
| Business | Unlimited |

### Variable mapping

Body uses named placeholders internally (`{{name}}`, `{{order_id}}`). On `submit`, they are mapped positionally to Meta's `{{1}}`, `{{2}}` format using the order of the `variables[]` array. Example mapping is included in the submission payload so Meta can validate.

Dynamic URL button suffix maps to its own `{{1}}` scoped to that button's `example` field.

---

## Meta API — Submission

**Endpoint:**
```
POST https://graph.facebook.com/v25.0/{waba-id}/message_templates
Authorization: Bearer {channel.accessToken}
```

**Payload example** (product image + body variables + dynamic URL button):
```json
{
  "name": "product_showcase_ar",
  "language": "ar",
  "category": "MARKETING",
  "components": [
    { "type": "HEADER", "format": "IMAGE" },
    {
      "type": "BODY",
      "text": "أهلاً {{1}}، شوف منتجنا الجديد بسعر {{2}} جنيه!",
      "example": { "body_text": [["Ahmed", "299"]] }
    },
    { "type": "FOOTER", "text": "شكراً لتعاملك معنا" },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "URL",
          "text": "اشتري دلوقتي",
          "url": "https://shop.com/{{1}}",
          "example": ["bags/leather-tote"]
        }
      ]
    }
  ]
}
```

**On success:** set `metaStatus = "pending"`, store `metaTemplateId`, record `metaSubmittedAt`.  
**On failure:** stay `draft`, surface Meta's error message in the UI (e.g. "Template name already exists for this WABA").

---

## Meta API — Status Sync

**Endpoint:**
```
GET https://graph.facebook.com/v25.0/{waba-id}/message_templates?name={name}
Authorization: Bearer {channel.accessToken}
```

Two sync mechanisms:
1. **Manual** — "Check Status" button on the template card calls `syncStatus` immediately
2. **Cron** — runs every 30 minutes via Convex scheduler, calls `syncStatus` for all `pending` templates

When a template transitions to `approved`, create an in-app notification for the admin who submitted it.

---

## Approval Lifecycle

```
draft ──[Submit]──► pending ──[Meta approves]──► approved
                           └──[Meta rejects]───► rejected ──[Edit + resubmit]──► pending

approved ──[Meta pauses]──► paused ──[Admin resubmits]──► pending
```

- `draft` and `rejected` → editable, can be deleted
- `pending` and `approved` → locked (edit and delete buttons disabled with tooltip)
- `paused` → read-only, can resubmit

---

## UI

### Settings → Templates — new "Broadcast Templates" tab

Third tab alongside "My Templates" and "Template Library".

**Tab content — cards grid** (same layout as My Templates):

Each card shows:
- Title + language badge
- Category badge (MARKETING / UTILITY)
- Header type icon: 🖼 IMAGE / 🎬 VIDEO / 📄 DOCUMENT / **T** TEXT / — NONE
- Status badge: Draft (gray) / Pending Review (amber) / Approved (green) / Rejected (red) / Paused (orange)
- Edit icon — disabled with tooltip if `pending` or `approved`
- "Check Status" button — visible only when `pending`
- Delete icon — disabled with tooltip if `pending` or `approved`
- If `rejected`: show rejection reason in a red callout on the card

**Empty state:** CTA to create first broadcast template.

**Free plan banner:** "You have 2/2 broadcast templates. Upgrade to Starter for 6."

---

### Template Builder Dialog

Opens on "Add Broadcast Template" or "Edit". Two-column layout on ≥ md screens:
- Left: form
- Right: live `WhatsAppTemplatePreview` (updates as admin types)

**Form sections:**

**1. Basic Info**
- Display title (WABDesk UI label, free text)
- Template name (Meta slug — auto-generated from title as `lowercase_underscore`, editable, validated: only `[a-z0-9_]` allowed)
- Channel selector (dropdown of connected channels)
- Language: Arabic / English segmented control
- Category: Marketing / Utility segmented control

**2. Header** (segmented pill: None / Text / Image / Video / Document)
- None → nothing shown
- Text → text input
- Image / Video / Document → URL input labeled "Default media URL" with helper text: "Agents can change this when sending a broadcast"

**3. Body**
- Textarea, `dir="auto"`, min height 120px
- Auto-detected `{{variable}}` badges shown below
- Character counter

**4. Footer** (collapsed by default, "+ Add Footer" link to expand)
- Single-line text input, max 60 chars

**5. Buttons** (collapsed by default, "+ Add Button" to expand)
- Up to 3 buttons
- Each button: type selector (URL / Phone / Quick Reply) → fields per type
  - URL: Button label + URL input + "Dynamic suffix {{1}}" toggle with explainer: "Turn on if the link changes per broadcast (e.g. different product page)"
  - Phone: Button label + phone input (`dir="ltr"`)
  - Quick Reply: Button label only

**Submit bar (sticky footer of dialog):**
- "Save as Draft" (always enabled when title + body filled)
- "Submit to Meta" (enabled when status is `draft` or `rejected`; shows spinner during submission)
- If status is `pending` or `approved`: form is read-only; shows "Template is locked while under Meta review" / "Template is approved and in use"

---

### Broadcast Wizard Integration

In the broadcast wizard step where the admin picks a template, the source picker gains a new option:

```
○ My Meta Templates (synced from Meta Business Manager)
● Broadcast Templates (built in WABDesk)         ← new
```

When "Broadcast Templates" is selected, only templates with `metaStatus === "approved"` are shown.

**Media override:** If the selected template has `headerType` IMAGE/VIDEO/DOCUMENT, show a field:
```
Product image URL
[https://cdn.example.com/bags/leather-tote.jpg  ]  ← pre-filled from headerMediaUrl
```

**Dynamic URL suffix:** If any button has `isDynamic: true`, show a field:
```
Link suffix for "اشتري دلوقتي" button
[bags/leather-tote                               ]
Final URL: https://shop.com/bags/leather-tote
```

**Variable fill-in:** Body variables are filled per-contact from the contact's fields (same pattern as existing broadcast variable mapping).

---

## Files Changed / Created

### New files
- `convex/broadcastTemplates.ts` — all Convex functions
- `components/broadcasts/broadcast-template-builder.tsx` — create/edit dialog
- `components/broadcasts/broadcast-template-card.tsx` — card with status badge
- `components/broadcasts/broadcast-templates-tab.tsx` — tab content (grid + empty state)

### Modified files
- `convex/schema.ts` — add `broadcastTemplates` table
- `convex/lib/planLimits.ts` — add broadcast template limits per plan
- `convex/crons.ts` — add 30-min cron for `syncStatus`
- `components/settings/templates-settings.tsx` — add "Broadcast Templates" tab
- `components/broadcasts/create-broadcast-wizard.tsx` — add source picker + media override + dynamic URL suffix fields

---

## Definition of Done

- [ ] Template can be created, saved as draft, edited, and deleted
- [ ] Template builder shows live WhatsApp phone preview as admin types
- [ ] Submit to Meta works; status transitions to `pending`
- [ ] Manual "Check Status" button updates status correctly
- [ ] Cron syncs `pending` templates every 30 minutes
- [ ] In-app notification fires when template is approved
- [ ] Approved templates appear in Broadcasts wizard
- [ ] Media URL is pre-filled from template default; admin can override
- [ ] Dynamic URL suffix field appears when `isDynamic: true`
- [ ] Plan limits enforced server-side (Free: 2, Starter: 6, Growth: 20, Business: unlimited)
- [ ] All UI works correctly in RTL (Arabic) and LTR (English)
- [ ] Locked state (pending/approved) shows correct tooltips and read-only form
