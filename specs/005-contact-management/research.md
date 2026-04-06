# Research: Contact Management

## 1. CSV Phone Number Normalization

**Decision**: Use the `libphonenumber-js` library (already available in the JS ecosystem) on the server side inside a Convex action.

**Rationale**: Handles local formats like `01012345678` (Egypt) → `+201012345678`. Country code is inferred from the tenant's first active channel's `phoneNumberId` (which maps to a country). The `parsePhoneNumber(input, defaultRegion)` API covers all MENA formats.

**Alternatives considered**: Manual regex — rejected (too many country variations); google-libphonenumber — same capability but heavier, libphonenumber-js is the standard JS port.

**How to use**: In the `importBatch` action, read the tenant's first channel to get the country hint, then normalize all phone strings before inserting.

---

## 2. CSV Parsing in Convex Action

**Decision**: Use `papaparse` (browser-side parsing) to parse the CSV before sending rows to the Convex action. The client parses and sends an array of `{ phone, name?, tags?, notes? }` objects to the action. The action never receives a raw file.

**Rationale**: Convex actions do not support raw file uploads. Parsing in the browser avoids sending raw file blobs over the wire. `papaparse` is the standard CSV parser for JS — handles encoding, quoted fields, etc.

**Alternatives considered**: Send CSV as a string and parse in action — technically feasible but wasteful (Convex has argument size limits). Parse on a Next.js API route — adds unnecessary server tier.

**Constraint enforced client-side**: If row count > 10,000, show error before calling action at all.

---

## 3. Contacts Page Role Access

**Decision**: Change the `/contacts` layout minimum role from `supervisor` to `agent`. All roles can search and view contacts. Add/import/archive restricted to `admin`/`supervisor` in the UI (hiding buttons) and enforced in the Convex mutations (checking role).

**Rationale**: FR-005 requires agents to search contacts from a dedicated section. The spec's User Story 2 explicitly says "An agent needs to look up a specific customer." The current layout redirect to `/inbox` for agents is wrong for this feature.

**Alternatives considered**: Keep layout as supervisor-only, add a read-only contact lookup in the inbox only — rejected because spec explicitly requires a dedicated Contacts section for agents.

---

## 4. Contact Search Strategy

**Decision**: Use Convex's `.withSearchIndex` for full-text search on the `contacts` table, indexed on `displayName` and `customName`. Phone search uses an index range query on `by_tenant_phone` with a prefix match.

**Rationale**: Convex supports search indexes natively. For the contact name, a search index on `displayName` + `customName` handles the "search by name" requirement. Phone prefix matching works with the existing `by_tenant_phone` index.

**Note**: A new search index `search_by_name` must be defined on the contacts table targeting `displayName` and `customName` fields.

**Alternatives considered**: Filter all contacts client-side — rejected for larger datasets; external search (Algolia) — overkill for Phase 1.

---

## 5. Archiving vs Deletion

**Decision**: Add `isArchived: boolean` field to `contacts` table. The `archive` mutation sets `isArchived: true`. The `listForTenant` and `search` queries default to `isArchived: false` filter with an optional `includeArchived` param.

**Rationale**: FR-011 prohibits deleting contacts with conversation history. Archiving preserves compliance data while hiding stale contacts from normal views. Checking conversation existence before deletion and rejecting is error-prone — archiving is simpler and safer.

**Alternatives considered**: Soft-delete with a `deletedAt` timestamp — equivalent but `isArchived` is more semantically clear for this use case.

---

## 6. Custom Fields Storage

**Decision**: New `customFields` table with: `tenantId`, `contactId` (Id<"contacts">), `key` (string), `value` (string), `createdAt`. Index on `by_contact` (`contactId`). No predefined schema — fully dynamic key-value.

**Rationale**: Spec requires agent-defined arbitrary fields (e.g., "Order ID", "City"). Storing them as a separate table (not embedded array on contact) keeps the contact document small and allows efficient per-contact listing without loading the entire contact record.

**Alternatives considered**: Embedded as `customFields: array<{key,value}>` on the contact document — rejected because Convex recommends against high-churn embedded arrays (per guidelines.md); also makes individual field updates require patching the entire array.
