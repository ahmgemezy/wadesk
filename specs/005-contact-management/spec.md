# Feature Specification: Contact Management

**Feature Branch**: `005-contact-management`
**Created**: 2026-04-02
**Status**: Draft
**Input**: User description: "Contact management — lightweight CRM profile for every WhatsApp customer. Auto-created on first message, agents can view and edit name, tags, notes, and custom fields. Admins can add contacts manually or import via CSV."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Agent views a customer's contact profile while handling a conversation (Priority: P1)

An agent opens a conversation in the inbox and sees a contact panel on the side showing the
customer's name, phone number, tags, previous conversation count, and any notes left by other
agents. The agent can update the customer's display name and add a tag without leaving the
conversation view. Changes save instantly and are visible to all agents on the same team.

**Why this priority**: Agents need contact context to give personalized service. Knowing a
customer is "VIP" or "مشكلة متكررة" before replying is the core value of contact management.

**Independent Test**: Open a conversation with a known customer → verify contact panel shows their
profile → update the display name → open the same conversation as a different agent → verify
updated name is visible.

**Acceptance Scenarios**:

1. **Given** an agent opens a conversation, **When** the contact panel loads,
   **Then** it shows the customer's display name (or phone if no name), phone number, tags,
   notes, and number of previous conversations.
2. **Given** an agent updates a customer's display name, **When** they save,
   **Then** the new name appears immediately across all conversations with that customer.
3. **Given** an agent adds a tag to a contact, **When** another agent opens the same contact,
   **Then** they see the tag has been added.
4. **Given** a customer messages for the first time, **When** the message arrives,
   **Then** a contact profile is automatically created with their phone number and WhatsApp
   display name (if available).

---

### User Story 2 — Agent searches for a contact and views their full history (Priority: P2)

An agent needs to look up a specific customer by name or phone number. They open the Contacts
section, search for the customer, and see their full profile including all past conversations,
custom notes, and tags. They can add or update any field from this view.

**Why this priority**: Without search, agents cannot proactively look up customers — they can
only see context during active conversations.

**Independent Test**: Create/find a contact → navigate to Contacts section → search by phone →
open profile → verify all conversation history and notes are visible.

**Acceptance Scenarios**:

1. **Given** an agent searches by phone number or name, **When** results load,
   **Then** matching contacts appear with their name, phone, and last conversation date.
2. **Given** an agent opens a contact profile, **When** they view conversation history,
   **Then** all past conversations with that contact are listed in reverse chronological order.
3. **Given** no matches for a search query, **When** results load,
   **Then** an empty state with an "Add Contact" option is shown.

---

### User Story 3 — Admin adds a contact manually (Priority: P3)

An admin or agent adds a new contact manually — entering a name and phone number, optionally
adding tags and notes — before that customer has messaged the business. This lets the team
proactively prepare profiles for known customers.

**Why this priority**: Agents often know their customers before they message. Pre-loading contact
data saves time when the first conversation arrives.

**Independent Test**: Add a contact manually with name + phone + tag → search for them → verify
they appear → send them a WhatsApp message via the connected number → conversation appears linked
to the pre-created contact profile.

**Acceptance Scenarios**:

1. **Given** an admin clicks "Add Contact", **When** they enter a valid phone number and name and
   save, **Then** the contact appears in the contact list.
2. **Given** an admin enters a phone number already in the system, **When** they try to save,
   **Then** they see a duplicate warning and are offered to view the existing contact instead.
3. **Given** a manually added contact later messages the business, **When** the message arrives,
   **Then** it is linked to the existing contact profile (no duplicate created).

---

### User Story 4 — Admin imports contacts from CSV (Priority: P4)

An admin uploads a CSV file containing customer records. WABDesk shows a preview of what will
be imported, reports on duplicates, and completes the import. All imported contacts are
immediately searchable and visible to agents.

**Why this priority**: Most businesses migrating to WABDesk have an existing customer list. Bulk
import removes the bottleneck of manual entry.

**Independent Test**: Upload a valid CSV with 10 contacts → review preview → confirm → verify
all 10 appear in the contact list. Upload again with 5 of the same numbers → verify duplicate
handling works (skip or merge).

**Acceptance Scenarios**:

1. **Given** an admin uploads a valid CSV with `phone` column, **When** the preview loads,
   **Then** they see a table of contacts to be imported with a count of duplicates detected.
2. **Given** duplicates exist, **When** the admin chooses "Skip duplicates" and confirms,
   **Then** only new contacts are imported; existing contacts are unchanged.
3. **Given** the admin confirms import, **When** import completes,
   **Then** they see a summary: "X added, Y skipped (duplicates), Z failed (invalid numbers)."
4. **Given** a CSV with invalid phone numbers, **When** import runs,
   **Then** invalid rows are skipped with reasons listed; valid rows are imported successfully.

---

### Edge Cases

- What happens when a contact's phone number changes on WhatsApp?
  WABDesk identifies contacts by phone number — if the number changes, a new contact is created. Agents can manually merge by updating the existing contact's name/notes.
- What happens when two agents edit the same contact simultaneously?
  Last write wins — no locking required for MVP. Field-level conflicts are accepted as a known limitation.
- What happens when a CSV is uploaded with more than 10,000 rows?
  Import is blocked with a clear error: "Maximum 10,000 contacts per upload. Please split your file."
- What happens when a contact is deleted?
  Deletion is blocked if the contact has any conversation history — the contact can only be archived (hidden from search but preserved for compliance).
- What happens when an imported phone number is in local format (e.g., 01012345678)?
  WABDesk auto-converts to E.164 format using the country code inferred from the tenant's connected number's country.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A contact profile MUST be automatically created when a customer sends their first WhatsApp message to a connected channel.
- **FR-002**: Each contact MUST be uniquely identified by their phone number per tenant — no duplicate contacts with the same phone number.
- **FR-003**: Agents MUST be able to view a contact's profile (name, phone, tags, notes, conversation history) from within the conversation view.
- **FR-004**: Agents MUST be able to edit a contact's display name, tags, and notes.
- **FR-005**: Agents MUST be able to search for contacts by name or phone number from a dedicated Contacts section.
- **FR-006**: Admins MUST be able to add contacts manually by entering a phone number, name, and optional tags/notes.
- **FR-007**: Admins MUST be able to import contacts from a CSV file. Required column: `phone`. Optional columns: `name`, `tags`, `notes`.
- **FR-008**: CSV import MUST support up to 10,000 contacts per upload. Rows beyond the limit are rejected.
- **FR-009**: CSV import MUST auto-convert local phone formats to E.164. Invalid numbers that cannot be converted are skipped and reported.
- **FR-010**: CSV import MUST detect duplicates (by phone number) and offer the admin a choice: skip or overwrite.
- **FR-011**: Contacts with existing conversation history MUST NOT be deletable — they can only be archived.
- **FR-012**: All contact data MUST be scoped to the tenant — contacts from one business are never visible to another.

### Key Entities

- **Contact**: A customer who has interacted with or been added to a tenant. Key attributes: tenantId, phone (E.164), display name (from WhatsApp), custom name (agent override), tags (array), notes (free text), source (auto/manual/import), first seen, last seen, assigned agent.
- **CustomField**: Agent-defined key-value pair on a contact. Attributes: contactId, key (e.g., "Order ID"), value.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A contact profile is automatically created and visible in the inbox within 3 seconds of a customer's first message.
- **SC-002**: Agents can find any contact by phone number or name in under 5 seconds using the search function.
- **SC-003**: A CSV import of 1,000 contacts completes in under 60 seconds.
- **SC-004**: Zero duplicate contacts are created when the same phone number appears in two import files or messages twice.
- **SC-005**: Contact edits (name, tags, notes) are visible to all agents on the team within 3 seconds of saving.

## Assumptions

- Contact profiles are tenant-scoped — one contact per phone number per tenant (the same customer can exist in multiple tenants as separate records).
- WhatsApp display names (from the customer's WhatsApp profile) are captured when available but treated as a default that agents can override with a custom name.
- Tags are free-form strings — no predefined tag taxonomy required in Phase 1; admins and agents create tags ad hoc.
- Custom fields (key-value pairs) are supported in Phase 1 but without enforced types or validation — any string key and string value.
- CSV import country code inference uses the country of the tenant's first connected WhatsApp channel.
- Archived contacts are excluded from search results by default but accessible via a "Show archived" toggle.
- Contact merge (combining two profiles for the same person) is deferred to Phase 2.
- Email and social profiles on contacts are deferred to Phase 2.
