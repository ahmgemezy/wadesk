# Feature Specification: Multi-Agent Shared Inbox

**Feature Branch**: `001-multi-agent-inbox`
**Created**: 2026-04-02
**Status**: Draft
**Input**: User description: "Multi-agent shared inbox where multiple agents handle WhatsApp customer conversations from one shared dashboard"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Agent views and replies to assigned conversations (Priority: P1)

An agent logs into the WaDesk dashboard and sees a list of conversations assigned to them.
They open a conversation, read the customer's WhatsApp messages, and send a reply. The reply
appears in the conversation thread instantly. The customer receives the reply on WhatsApp without
knowing it came from a team platform.

**Why this priority**: This is the core product action. Nothing else matters if agents cannot
read and reply to messages.

**Independent Test**: Can be fully tested by sending a WhatsApp message to the connected number,
opening the inbox, and verifying the message appears and a reply can be sent — all without any
other feature.

**Acceptance Scenarios**:

1. **Given** an agent is logged in and has an assigned conversation, **When** they open it,
   **Then** they see all messages in chronological order with timestamps and sender indicators.
2. **Given** an agent has a conversation open, **When** they type a reply and submit,
   **Then** the reply is sent via WhatsApp and appears in the conversation thread immediately.
3. **Given** a customer sends a new message, **When** the inbox is open,
   **Then** the new message appears in real time without a page refresh.

---

### User Story 2 — Admin/Supervisor assigns conversations to agents (Priority: P2)

An admin or supervisor views the shared inbox, sees all incoming conversations (including
unassigned ones), and assigns a conversation to a specific agent. The assigned agent's name
appears on the conversation. The agent immediately sees the conversation in their queue.

**Why this priority**: Assignment is how work gets distributed. Without it, agents don't know
which conversations are theirs.

**Independent Test**: Create an unassigned conversation, assign it to an agent via the inbox UI,
and verify the agent sees it in their queue — testable without quick replies or labels.

**Acceptance Scenarios**:

1. **Given** an unassigned conversation exists, **When** an admin assigns it to Agent A,
   **Then** Agent A sees it in their conversation list and the conversation shows "Assigned to Agent A."
2. **Given** a conversation is assigned to Agent A, **When** an admin reassigns it to Agent B,
   **Then** Agent B's queue updates in real time and Agent A no longer sees the conversation.
3. **Given** an agent is offline for more than the configured threshold, **When** the threshold is
   reached, **Then** the conversation returns to the Unassigned queue automatically.

---

### User Story 3 — Agent leaves an internal note (Priority: P3)

An agent adds an internal note to a conversation — visible to other agents and supervisors but
never sent to the customer. Notes appear inline in the conversation thread with a distinct visual
treatment (different background and a "Note" label).

**Why this priority**: Internal notes prevent duplicate effort and enable team coordination
without exposing internal communication to customers.

**Independent Test**: Add an internal note to a conversation and verify it appears in the thread
for another agent but does not appear on the customer's WhatsApp.

**Acceptance Scenarios**:

1. **Given** an agent has a conversation open, **When** they add an internal note,
   **Then** the note appears inline in the thread, visually distinct from customer messages.
2. **Given** an internal note exists in a conversation, **When** the customer views their WhatsApp,
   **Then** the note is never visible to them.
3. **Given** a supervisor opens the same conversation, **When** they view the thread,
   **Then** they can see the internal note.

---

### User Story 4 — Agent changes conversation status (Priority: P4)

An agent can mark a conversation as Open, Pending, or Resolved. The status is visible in the
conversation list. Resolved conversations move out of the active inbox. Supervisors can filter
the inbox by status.

**Why this priority**: Status management determines inbox cleanliness and is a prerequisite for
analytics and SLA tracking.

**Independent Test**: Mark a conversation as Resolved and verify it leaves the active queue and
appears under a Resolved filter.

**Acceptance Scenarios**:

1. **Given** an open conversation, **When** an agent marks it Resolved,
   **Then** it is removed from the active inbox and appears under Resolved conversations.
2. **Given** a resolved conversation, **When** the customer sends a new message,
   **Then** the conversation automatically re-opens and returns to the active inbox.
3. **Given** an admin views the inbox, **When** they filter by status,
   **Then** only conversations matching the selected status are shown.

---

### User Story 5 — Agent uses a quick reply (Priority: P5)

An agent selects a saved quick reply (pre-written response) from a library and sends it with
one click, optionally editing it before sending. Quick replies are scoped to the tenant.

**Why this priority**: Reduces repetitive typing and speeds up response time — especially
valuable for common Arabic greetings and standard responses.

**Independent Test**: Create a quick reply, open a conversation, select it from the list, and
verify it populates the reply box and can be sent.

**Acceptance Scenarios**:

1. **Given** quick replies exist for the tenant, **When** an agent opens the quick reply panel,
   **Then** they see all available quick replies organized by category.
2. **Given** an agent selects a quick reply, **When** it is inserted into the reply box,
   **Then** they can edit it before sending.
3. **Given** a quick reply is selected and sent, **When** the customer receives it,
   **Then** it arrives as a normal WhatsApp message with no indication it was a template.

---

### Edge Cases

- What happens when two agents reply to the same conversation simultaneously?
  Last write wins — both messages are sent; no locking required for MVP.
- What happens when the WhatsApp number is disconnected mid-session?
  Outgoing message fails with a clear error; inbox continues showing existing conversations.
- What happens if a customer sends an unsupported message type (voice note, sticker, reaction)?
  Displayed as "[Unsupported message type]" placeholder with an icon.
- What happens when an agent's session expires while the inbox is open?
  They are redirected to the login page; no data is lost.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display all conversations assigned to the authenticated agent in real time.
- **FR-002**: The system MUST display unassigned conversations in a shared "Unassigned" queue visible to all agents.
- **FR-003**: Admins and Supervisors MUST be able to assign any conversation to any agent.
- **FR-004**: Agents MUST only see their own assigned conversations — not other agents' conversations.
- **FR-005**: The system MUST deliver outbound replies to the correct customer WhatsApp number.
- **FR-006**: The system MUST display incoming customer messages in real time without page refresh.
- **FR-007**: Agents MUST be able to add internal notes to conversations; notes MUST NOT be sent to customers.
- **FR-008**: Conversations MUST support statuses: Open, Pending, Resolved.
- **FR-009**: Resolved conversations MUST re-open automatically when the customer sends a new message.
- **FR-010**: The system MUST support quick replies scoped per tenant, selectable during message composition.
- **FR-011**: Every conversation MUST be scoped to a specific WhatsApp channel (channelId) and tenant (tenantId).
- **FR-012**: The inbox MUST support filtering conversations by status and by channel.
- **FR-013**: If an assigned agent is offline beyond a configurable threshold, the conversation MUST return to the Unassigned queue.
- **FR-014**: The system MUST support three assignment modes: First Reply Wins, Manual Assignment, and Round Robin (Round Robin available on Growth plan and above only).

### Key Entities

- **Conversation**: A thread between a customer and the business on a specific channel.
  Key attributes: tenantId, channelId, contactId, assignedAgentId, status, labels, lastMessageAt.
- **Message**: An individual WhatsApp message within a conversation.
  Attributes: conversationId, direction (inbound/outbound), content, contentType, timestamp, isInternalNote, authorId.
- **Contact**: The customer profile auto-created on first message.
  Attributes: tenantId, phone (E.164), displayName, customName, tags.
- **QuickReply**: A saved response template scoped to a tenant.
  Attributes: tenantId, title, content, category.
- **Channel**: A connected WhatsApp Business number.
  Attributes: tenantId, phoneNumberId, displayName, assignmentMode.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An agent can read an incoming customer message and send a reply in under 60 seconds from a cold start (first login of the day).
- **SC-002**: New incoming messages appear in the inbox within 3 seconds of being sent by the customer.
- **SC-003**: 100% of outbound replies are delivered to the correct customer — zero cross-tenant or cross-conversation misdelivery.
- **SC-004**: Agents can handle at least 20 simultaneous open conversations without UI degradation.
- **SC-005**: Role-based visibility is enforced at all times — agents MUST NOT see other agents' assigned conversations under any circumstances.
- **SC-006**: Conversation assignment (manual) takes no more than 3 clicks from the inbox view.

## Assumptions

- Each tenant has at least one WhatsApp channel connected before agents can use the inbox.
- Clerk authentication and organization membership are already in place.
- Round Robin assignment is only available on Growth plan and above; Free and Starter use First Reply Wins or Manual Assignment.
- Unsupported WhatsApp message types (voice notes, stickers, reactions) are shown as placeholders in Phase 1 — full media support is deferred.
- Message search within conversations is deferred to Phase 2.
- Broadcast/bulk messaging is explicitly out of scope for this feature.
- The inbox supports Arabic (RTL) and English (LTR) — text direction follows message content, not a global UI setting.
