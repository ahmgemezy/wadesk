# Convex API Contracts: Contact Management

## contacts.ts — additions to existing module

### `contacts.listForTenant` (query — update existing)

Add `isArchived` filter and pagination.

```ts
args: {
  includeArchived: v.optional(v.boolean()),  // default false
  paginationOpts: paginationOptsValidator,
}
returns: PaginationResult<Doc<"contacts">>
```

Roles: all authenticated

---

### `contacts.getById` (query — new)

```ts
args: { contactId: v.id("contacts") }
returns: {
  contact: Doc<"contacts"> | null,
  conversationCount: number,
}
```

Validates `contact.tenantId === callerTenantId`. Returns `null` if not found or wrong tenant.
Roles: all authenticated

---

### `contacts.search` (query — new)

```ts
args: {
  query: v.string(),          // name or phone prefix
  includeArchived: v.optional(v.boolean()),
  paginationOpts: paginationOptsValidator,
}
returns: PaginationResult<Doc<"contacts">>
```

Implementation: use `.withSearchIndex("search_by_name")` for name query; for phone query (detected by starting with `+` or digit), use `by_tenant_phone` index with prefix.
Roles: all authenticated

---

### `contacts.update` (mutation — new)

```ts
args: {
  contactId: v.id("contacts"),
  customName: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  notes: v.optional(v.string()),
  assignedAgentId: v.optional(v.string()),
}
returns: null
```

Validates `tenantId` match. Patches only provided fields.
Roles: all authenticated (agents, supervisors, admins)

---

### `contacts.create` (mutation — new)

```ts
args: {
  phone: v.string(),          // must be E.164 or valid local format
  customName: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  notes: v.optional(v.string()),
}
returns: v.id("contacts")
```

Checks for existing contact by `tenantId + phone`. If exists, returns error with existing contact ID.
Phone must be validated/normalized before calling this mutation (caller normalizes).
Sets `source: "manual"`.
Roles: supervisor, admin

---

### `contacts.archive` (mutation — new)

```ts
args: {
  contactId: v.id("contacts"),
  archive: v.boolean(),   // true = archive, false = unarchive
}
returns: null
```

Roles: supervisor, admin

---

### `contacts.importBatch` (action — new)

Called from client after CSV parsed and phone numbers pre-normalized client-side (libphonenumber-js). Action validates, deduplicates, and inserts in chunks.

```ts
args: {
  rows: v.array(v.object({
    phone: v.string(),       // E.164 already normalized
    name: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  })),
  onDuplicate: v.union(v.literal("skip"), v.literal("overwrite")),
}
returns: {
  added: number,
  skipped: number,    // duplicates skipped
  failed: number,     // invalid phone after normalization
  failedRows: v.array(v.object({ row: v.number(), reason: v.string() })),
}
```

Max rows: 10,000 (validated in action; client should pre-check too).
Roles: supervisor, admin (checked via ctx.auth inside action using getCallerIdentity)

---

## customFields.ts — new module

### `customFields.list` (query)

```ts
args: { contactId: v.id("contacts") }
returns: Doc<"customFields">[]
```

Validates contact belongs to caller's tenant.
Roles: all authenticated

---

### `customFields.upsert` (mutation)

```ts
args: {
  contactId: v.id("contacts"),
  key: v.string(),
  value: v.string(),
}
returns: v.id("customFields")
```

If a custom field with the same `contactId + key` exists, updates `value`. Otherwise inserts.
Roles: all authenticated

---

### `customFields.delete` (mutation)

```ts
args: { customFieldId: v.id("customFields") }
returns: null
```

Validates tenantId match via the parent contact.
Roles: all authenticated

---

## UI Component Contracts

### `<ContactPanel contactId={Id<"contacts">} />`

Used in: inbox conversation thread sidebar
- Displays: name (customName ?? displayName), phone (dir="ltr"), tags, notes, conversation count, custom fields
- Edit mode: inline editing of customName, tags, notes, custom fields
- Loading state: skeleton
- Error state: "لم يتم العثور على جهة الاتصال" / "Contact not found"
- RTL: full support

### `<ContactList />`

Used in: `/contacts` page
- Search input (searches name + phone)
- Add Contact button (hidden for agents, visible for supervisor/admin)
- Import CSV button (hidden for agents, visible for supervisor/admin)
- Archived toggle
- Pagination
- Row click → opens `<ContactDetailSheet>`

### `<AddContactDialog />`

Props: `onSuccess?: (contactId: Id<"contacts">) => void`
- Phone field: `dir="ltr"`, E.164 or local format (normalized client-side)
- Duplicate detection: shows warning with link to existing contact

### `<CsvImportDialog />`

Steps: Upload → Preview → Options (skip/overwrite duplicates) → Import → Summary
- Max row check before calling action
- Progress indicator during import
- Summary: "X مضاف، Y مكرر، Z فاشل"

### `<ContactDetailSheet contactId={Id<"contacts">} />`

Full-page sheet from contacts list. Includes all contact fields + conversation history list + custom fields editor.
