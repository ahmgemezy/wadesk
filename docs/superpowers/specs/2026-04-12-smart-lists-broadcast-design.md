# Smart Lists & Broadcast Campaigns — Design Spec

**Date:** 2026-04-12  
**Branch:** to be created (e.g. `010-smart-lists-broadcast`)  
**Status:** Approved — ready for implementation planning

---

## Overview

Two connected features:

1. **Smart Lists** — saved dynamic contact segments defined by filter rules. A list auto-updates as contacts change. Used as the audience for broadcast campaigns.
2. **Broadcast Campaigns** — send a Meta-approved WhatsApp template message to a smart list audience in 3 steps: pick audience → pick template → review & send.

---

## What We're NOT Building

- Custom broadcast message composition (Meta requires pre-approved templates only)
- Broadcast scheduling (send-now only in this spec)
- Broadcast analytics / delivery tracking (separate feature)
- Age or gender filters (not in the contacts schema)
- Manual/static lists (dynamic only)

---

## 1. Phone → Country/City Auto-Detection

### Problem
`country` and `city` fields exist in the `contacts` schema but are never populated. Filters on these fields are useless without data.

### Solution
A utility `lib/phoneGeo.ts` that maps E.164 phone prefixes to country and region.

**Mapping strategy:**
- Use the `libphonenumber-js` library (already installed for phone normalization) — it provides `parsePhoneNumber()` which returns `country` (ISO 3166-1 alpha-2 code, e.g. `"EG"`, `"SA"`, `"AE"`).
- Map ISO code → Arabic/English country name for display.
- `city` cannot be reliably auto-detected from a phone number — leave it empty on auto-create. Agents fill it manually, or it can be populated via CSV import.

**Where it runs:**
- `contacts.create` mutation — after saving, derive `country` from `phone` if not already set.
- `convex/contactsImport.ts` batch import — same derivation per row.
- Does NOT overwrite an existing manually set `country`.

**Country display names (core markets):**
| ISO | Arabic | English |
|-----|--------|---------|
| EG | مصر | Egypt |
| SA | السعودية | Saudi Arabia |
| AE | الإمارات | UAE |
| KW | الكويت | Kuwait |
| QA | قطر | Qatar |
| BH | البحرين | Bahrain |
| OM | عُمان | Oman |
| JO | الأردن | Jordan |
| LB | لبنان | Lebanon |
| Other | (ISO code) | (ISO code) |

---

## 2. Data Model

### New table: `contactLists`

```typescript
contactLists: defineTable({
  tenantId: v.string(),
  name: v.string(),
  description: v.optional(v.string()),
  filters: v.object({
    countries: v.optional(v.array(v.string())),  // ISO codes, OR within
    cities: v.optional(v.array(v.string())),      // OR within
    stages: v.optional(v.array(v.union(
      v.literal("lead"), v.literal("prospect"),
      v.literal("customer"), v.literal("retained"), v.literal("churned")
    ))),
    tags: v.optional(v.array(v.string())),        // OR within
  }),
  createdBy: v.string(),   // Clerk userId
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_tenant", ["tenantId"])
```

### New table: `broadcasts`

```typescript
broadcasts: defineTable({
  tenantId: v.string(),
  name: v.string(),
  listId: v.id("contactLists"),
  templateName: v.string(),          // Meta template name
  templateLanguage: v.string(),      // e.g. "ar", "en"
  channelId: v.id("channels"),       // which WhatsApp number to send from
  status: v.union(
    v.literal("draft"),
    v.literal("sending"),
    v.literal("sent"),
    v.literal("failed"),
  ),
  recipientSnapshot: v.array(v.id("contacts")),  // contacts at send time
  recipientCount: v.number(),
  sentAt: v.optional(v.number()),
  createdBy: v.string(),
  createdAt: v.number(),
})
  .index("by_tenant", ["tenantId"])
  .index("by_tenant_status", ["tenantId", "status"])
```

---

## 3. Filter Logic

Filters combine with **AND across types, OR within each type**:

A contact matches a list if:
- Its `country` is in `filters.countries` (if set) — OR match within the array
- Its `city` is in `filters.cities` (if set) — OR match within the array  
- Its `stage` is in `filters.stages` (if set) — OR match within the array
- It has **at least one** tag from `filters.tags` (if set) — OR match
- Omitting a filter type = no restriction on that field

**Implementation:** Convex does not support complex multi-field OR queries natively. Filter matching is done with `withIndex("by_tenant")` to fetch all non-archived tenant contacts, then in-memory post-filtering. This is acceptable for the expected contact volumes (< 50k contacts per tenant at this stage).

---

## 4. Convex Functions

### `convex/contactLists.ts`

| Function | Type | Description |
|----------|------|-------------|
| `listForTenant` | query | All lists for tenant, ordered by `createdAt` desc |
| `getById` | query | Single list by ID (tenant-scoped) |
| `getMatchingContacts` | query | Live-filtered contacts matching a list's rules. Returns `{ contacts, count }`. Paginated. |
| `getStats` | query | Count + breakdown by stage + breakdown by country/city + tag distribution for a list |
| `create` | mutation | Create new list. Admin/Supervisor only. |
| `update` | mutation | Update name, description, or filters. Admin/Supervisor only. |
| `remove` | mutation | Delete list (soft: check no active broadcasts reference it). Admin only. |

### `convex/broadcasts.ts`

| Function | Type | Description |
|----------|------|-------------|
| `listForTenant` | query | All broadcasts for tenant |
| `create` | mutation | Create broadcast in `draft` status |
| `send` | action | Snapshot matching contacts → send WhatsApp template to each via Meta API → update status to `sent` or `failed` |

### `convex/contacts.ts` changes

- `create` mutation: after insert, call `lib/phoneGeo.ts` to derive and set `country` if not provided.
- No changes to `listForTenant` or `search` — those remain as-is.

---

## 5. UI — Pages & Components

### New: `app/(dashboard)/lists/page.tsx`
- Server component, reads locale from cookie
- Renders `<ListsPage locale={locale} />`

### New: `components/lists/lists-page.tsx` (client)
- Fetches `contactLists.listForTenant`
- Card grid layout (2–3 columns)
- "+ قائمة جديدة" button opens `<CreateListDialog />`
- Each card: name, filter summary chips, total contact count, stage breakdown badges
- Click card → navigate to `/lists/[id]`

### New: `app/(dashboard)/lists/[id]/page.tsx`
- Server component

### New: `components/lists/list-detail.tsx` (client)
- Fetches `contactLists.getById` + `contactLists.getStats`
- Header: list name, filter summary, Edit button, "إرسال حملة" button
- Stat boxes: total count + per-stage counts (colored)
- Bar chart: city distribution (top 5 + "other")
- Tag cloud: tag name + count

### New: `components/lists/create-list-dialog.tsx` (client)
- Side-panel layout (Sheet component from shadcn)
- Left: name input + 4 filter sections (country, city, stage, tags) with pill selectors
- Right: live preview — calls `contactLists.getMatchingContacts` with current filter state, debounced 300ms
- Save button → calls `contactLists.create`

### New: `app/(dashboard)/broadcasts/page.tsx`
- Lists all broadcasts for tenant

### New: `components/broadcasts/create-broadcast-wizard.tsx` (client)
- 3-step wizard (Step indicator at top)
- **Step 1 — Audience:** list selector, pre-filled if `listId` passed via query param (from list detail "إرسال حملة" button)
- **Step 2 — Message:** fetch Meta-approved templates for the selected channel, display as selectable cards with template preview
- **Step 3 — Review & Send:** summary (list name, contact count, template name, channel), "إرسال الحملة" button calls `broadcasts.send`

### Sidebar navigation
- Add "القوائم" (Lists) nav item between Contacts and Broadcasts
- Add "الحملات" (Broadcasts) nav item

---

## 6. RTL Requirements

All new components must follow project RTL rules:
- `dir="rtl"` on root containers
- `ms-` / `me-` for margins (no `ml-` / `mr-`)
- Directional icons (chevrons, arrows) flipped for RTL
- Arabic labels for all UI text in Arabic locale
- Filter pill selectors: right-to-left layout

---

## 7. Permissions

| Action | Admin | Supervisor | Agent |
|--------|-------|------------|-------|
| View lists | ✅ | ✅ | ✅ |
| Create / edit lists | ✅ | ✅ | ❌ |
| Delete lists | ✅ | ❌ | ❌ |
| Create broadcast | ✅ | ✅ | ❌ |
| Send broadcast | ✅ | ✅ | ❌ |

All enforced server-side in Convex functions via `getCallerRole()`.

---

## 8. Plan Availability

| Feature | Free | Starter | Growth | Business |
|---------|------|---------|--------|----------|
| Smart Lists | ✅ (max 3 lists) | ✅ (max 10) | ✅ unlimited | ✅ unlimited |
| Broadcasts | ❌ | ✅ | ✅ | ✅ |

Plan limits enforced in `contactLists.create` and `broadcasts.create` mutations via `lib/planLimits.ts`.

---

## 9. Meta Template Constraint

Broadcast messages **must** use Meta-approved WhatsApp templates. The send action:
1. Fetches the tenant's approved templates from Meta API (`GET /phone_number_id/message_templates`)
2. Displays them in Step 2 of the wizard
3. Sends using the template API (`POST /phone_number_id/messages` with `type: "template"`)

Free-form message broadcasts are not supported and not shown in the UI.

---

## 10. Definition of Done

- [ ] `country` auto-populated from phone on contact create and import
- [ ] `contactLists` table in schema
- [ ] `broadcasts` table in schema
- [ ] All Convex functions implemented and tenant-scoped
- [ ] Lists page loads and displays lists in card grid (RTL)
- [ ] Create list dialog with live preview works
- [ ] List detail shows stats breakdown correctly
- [ ] Broadcast wizard completes end-to-end (audience → template → send)
- [ ] Plan limits enforced (max lists per plan, broadcast access)
- [ ] Permissions enforced server-side
- [ ] All UI tested in Arabic (RTL) and English (LTR)
