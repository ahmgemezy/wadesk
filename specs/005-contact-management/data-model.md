# Data Model: Contact Management

## Entities

### contacts (existing — additions required)

Current fields are sufficient. Two additions needed:

| New Field | Type | Notes |
|-----------|------|-------|
| `isArchived` | `v.boolean()` | Defaults to `false`. Archived contacts are hidden from default queries. |

New index needed:
```ts
.index("by_tenant_archived", ["tenantId", "isArchived"])
```

New search index needed:
```ts
.searchIndex("search_by_name", {
  searchField: "displayName",
  filterFields: ["tenantId"],
})
```

> Note: Convex search indexes support a single `searchField`. Searching `customName` requires a second search index or combining fields. For Phase 1, search on `displayName` (which includes the WhatsApp profile name and is always set) is sufficient. Phone search uses the existing `by_tenant_phone` index with prefix filtering.

---

### customFields (new table)

| Field | Type | Notes |
|-------|------|-------|
| `tenantId` | `v.string()` | Tenant scope — ALWAYS included |
| `contactId` | `v.id("contacts")` | Parent contact |
| `key` | `v.string()` | e.g., "Order ID", "City", "رقم الطلب" |
| `value` | `v.string()` | e.g., "12345", "Cairo" |
| `createdAt` | `v.number()` | Unix timestamp |

Indexes:
```ts
.index("by_contact", ["contactId"])
.index("by_tenant", ["tenantId"])
```

---

## Validation Rules

- `phone` must be E.164 format (`+[country][number]`) — enforced in all write mutations
- `phone` + `tenantId` is unique — enforced via `upsertByPhone` pattern (check before insert)
- `isArchived: true` contacts cannot be operated on by agents (only admin/supervisor can archive/unarchive)
- Contacts with any associated `conversations` document cannot be archived via delete — archiving is the only option (checked in `archive` mutation)
- CSV import rows with invalid phone numbers (cannot be normalized to E.164) are skipped; reported in import summary
- CSV import blocked client-side if row count > 10,000

---

## State Transitions

### Contact `isArchived`

```
active (isArchived: false)
  → archive mutation (admin/supervisor) → archived (isArchived: true)
  → unarchive mutation (admin/supervisor) → active
```

No deletion if conversations exist. If no conversations, deletion is permitted (admin only).

---

## Schema Diff (convex/schema.ts)

### contacts table — add to existing definition:

```ts
contacts: defineTable({
  // ... existing fields unchanged ...
  isArchived: v.boolean(),   // ADD THIS
})
  .index("by_tenant", ["tenantId"])
  .index("by_tenant_phone", ["tenantId", "phone"])
  .index("by_tenant_archived", ["tenantId", "isArchived"])  // ADD THIS
  .searchIndex("search_by_name", {                          // ADD THIS
    searchField: "displayName",
    filterFields: ["tenantId"],
  })
```

### customFields table — add new:

```ts
customFields: defineTable({
  tenantId: v.string(),
  contactId: v.id("contacts"),
  key: v.string(),
  value: v.string(),
  createdAt: v.number(),
})
  .index("by_contact", ["contactId"])
  .index("by_tenant", ["tenantId"]),
```
