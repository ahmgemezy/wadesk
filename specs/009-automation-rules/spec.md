# Feature Specification: Automation Rules

**Feature Branch**: `009-automation-rules`  
**Created**: 2026-04-12  
**Status**: Draft  
**Input**: User description: "Build an Automation Rules system — if this → send that rules that automatically reply to incoming WhatsApp messages"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Activate a Keyword Rule (Priority: P1)

An Admin sets up a rule that automatically replies when a customer's message contains a specific keyword (e.g., "سعر" or "price"). This covers the most common SMB use case: instant responses to high-frequency inquiries without agent involvement.

**Why this priority**: Keyword rules are the entry point for automation. Most businesses want to handle "what's the price?" or "how do I order?" automatically. Delivering this alone gives immediate value.

**Independent Test**: Admin creates a keyword rule, a simulated customer message containing the keyword arrives on a conversation with no active agent, and the automated reply is sent.

**Acceptance Scenarios**:

1. **Given** no active rule exists, **When** an Admin creates a keyword rule with trigger word "سعر" and response text "أهلاً! الأسعار متاحة على موقعنا", **Then** the rule appears in the rules list as active with priority 1.
2. **Given** a keyword rule is active, **When** a customer sends a message containing "سعر" and no agent has replied to that conversation, **Then** the configured response is sent automatically within 30 seconds.
3. **Given** a keyword rule is active, **When** an agent has already replied to the conversation within the current open session, **Then** the rule does NOT fire and no automated message is sent.
4. **Given** two keyword rules exist (one for "سعر", one for "price"), **When** a customer message matches both, **Then** only the higher-priority rule fires (first match wins).

---

### User Story 2 - Outside Business Hours Auto-Reply (Priority: P2)

An Admin configures business hours for their account, then sets up a rule that auto-replies when a message arrives outside those hours. Customers receive an immediate response even when the team is offline.

**Why this priority**: Out-of-hours messages with no response lead to customer frustration and lost leads. This is the second most-requested automation pattern for SMBs.

**Independent Test**: Admin sets business hours to 9am–5pm Sun–Thu, creates an outside-hours rule, a message arrives at 8pm, and the automated reply fires.

**Acceptance Scenarios**:

1. **Given** business hours are set to 09:00–17:00 Sun–Thu (Cairo time), **When** a message arrives at 20:00 on a Wednesday, **Then** the outside-hours rule fires and sends the configured reply.
2. **Given** the same setup, **When** a message arrives at 10:00 on a Tuesday, **Then** the outside-hours rule does NOT fire.
3. **Given** no business hours have been configured for the tenant, **Then** the outside-hours trigger can be selected but saving is blocked — the UI shows a clear prompt to configure hours first.
4. **Given** a message arrives exactly at the closing time (e.g., 17:00), **Then** the message is treated as outside hours (closing time is exclusive — the rule fires at or after 17:00).

---

### User Story 3 - First-Message Welcome Reply (Priority: P3)

When a brand-new contact messages the business for the very first time, an automated welcome message is sent. This gives the brand a professional first impression with zero agent effort.

**Why this priority**: Welcome messages improve first-contact experience and set expectations. Lower priority than keyword/hours rules because it only fires once per contact lifetime.

**Independent Test**: A contact with no prior conversation history sends a message; the welcome rule fires. The same contact sends another message later; the rule does NOT fire again.

**Acceptance Scenarios**:

1. **Given** a first-message rule is active, **When** a contact who has never messaged this business before sends their first message, **Then** the configured welcome reply is sent automatically.
2. **Given** the same rule, **When** the same contact sends a follow-up message in a new conversation later, **Then** the first-message rule does NOT fire again.
3. **Given** a keyword rule (priority 1) and a first-message rule (priority 2) are both active, **When** a first-time contact sends a message containing the keyword, **Then** only the keyword rule fires.

---

### User Story 4 - No-Reply Timeout Message (Priority: P4)

If an agent hasn't replied to an open conversation within a configured number of minutes, an automated message is sent to the customer acknowledging the delay.

**Why this priority**: Prevents customers from feeling ignored during busy periods. More complex than other triggers (requires time-based checking) so lower priority for initial delivery.

**Independent Test**: A conversation is assigned to an agent. The agent does not reply for X minutes (configured). The automated reply fires. If the agent replies before X minutes, the rule does NOT fire.

**Acceptance Scenarios**:

1. **Given** a no-reply timeout rule set to 10 minutes, **When** an agent-assigned conversation receives no agent reply for 10 minutes after the last customer message, **Then** the automated message is sent to the customer.
2. **Given** the same rule, **When** the agent replies at minute 8, **Then** the timeout rule does NOT fire.
3. **Given** an unassigned conversation in the shared queue, **Then** the no-reply timeout rule does NOT apply — it only triggers for conversations with an assigned agent.
4. **Given** the timeout message fires, **Then** it fires only once per timeout window — not repeatedly for the same unanswered stretch.

---

### User Story 5 - Manage Rules Dashboard (Priority: P2)

An Admin can view all rules in a list, toggle them on/off instantly, reorder priority via drag-and-drop, and preview what a rule will send before saving.

**Why this priority**: Without a management UI, rules become uncontrollable and unrecoverable. Tied with outside-hours in priority because enabling/disabling rules is as critical as creating them.

**Independent Test**: Admin opens rules list, toggles a rule off, a trigger event occurs — rule does NOT fire. Admin toggles back on, trigger event occurs — rule fires.

**Acceptance Scenarios**:

1. **Given** a list of 5 rules, **When** Admin drags rule #3 to position #1, **Then** the updated priority order is saved and future rule evaluation uses the new order immediately.
2. **Given** an active rule, **When** Admin clicks the toggle to disable it, **Then** the rule stops firing for messages received after the toggle without being deleted.
3. **Given** a rule being created or edited, **When** Admin clicks "Preview", **Then** a sample output is shown using placeholder values for dynamic variables (e.g., "أهلاً Ahmed, مرحباً في WABDesk").
4. **Given** a tenant on the Free plan with 2 existing rules, **When** Admin tries to create a third rule, **Then** an upgrade prompt appears and the rule is not saved.

---

### Edge Cases

- What happens when a message matches multiple rules? First match in priority order wins; only one rule fires per message.
- What if `{{agent_name}}` is used in a rule that fires before any agent is assigned? Resolved to fallback "فريق الدعم" / "Support Team".
- What if `{{customer_name}}` is unknown (no name set for the contact)? Resolved to fallback "عزيزي العميل" / "Dear Customer".
- What if a rule response text is empty when the Admin tries to save? Save is blocked with a clear validation error.
- What if business hours span midnight (e.g., 22:00–06:00)? The outside-hours trigger must handle cross-midnight ranges correctly.
- What if a tenant's timezone changes after rules are live? Business hours evaluation immediately uses the new timezone.
- What if a tenant deletes a rule while it is currently being evaluated? Evaluation completes without firing (deletion takes precedence).
- What if two Admins simultaneously create rules that would push the tenant over the plan limit? The system enforces the limit atomically — only one succeeds.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST enforce rule isolation per tenant — no tenant can view, edit, or trigger another tenant's rules.
- **FR-002**: System MUST evaluate rules in priority order; the first matching rule fires and evaluation stops (no cascading).
- **FR-003**: Rules MUST NOT fire if a human agent has sent at least one message in the current open conversation session.
- **FR-004**: System MUST support four trigger types: Keyword match, Outside business hours, First message from contact, No-reply timeout.
- **FR-005**: Keyword trigger MUST support one or more words/phrases (case-insensitive, partial match within the message body).
- **FR-006**: Outside business hours trigger MUST use the tenant's configured timezone and weekly business hours schedule.
- **FR-007**: First-message trigger MUST fire only once per contact per tenant lifetime, regardless of how many conversations the contact opens.
- **FR-008**: No-reply timeout trigger MUST be configurable per rule, from 1 minute to 1440 minutes (24 hours).
- **FR-009**: No-reply timeout MUST only apply to conversations that have an assigned agent; unassigned conversations are excluded.
- **FR-010**: Rule responses MUST support plain text with dynamic variables: `{{customer_name}}`, `{{business_name}}`, `{{agent_name}}`, `{{current_time}}`.
- **FR-011**: All dynamic variables MUST resolve to defined fallback values when the actual value is unavailable at send time.
- **FR-012**: System MUST enforce per-plan rule creation limits: Free=2, Starter=10, Growth=30, Business=unlimited.
- **FR-013**: When a tenant reaches their plan rule limit, the system MUST block rule creation and display an upgrade prompt.
- **FR-014**: Admins MUST be able to create, edit, delete, toggle on/off, and reorder rules from the dashboard.
- **FR-015**: Rule priority order MUST be changeable via drag-and-drop in the dashboard and must persist immediately.
- **FR-016**: Rule toggles MUST take effect immediately — a disabled rule stops firing for messages received after the toggle.
- **FR-017**: System MUST provide a preview of rule output before saving, showing dynamic variables resolved with sample/fallback values.
- **FR-018**: Only Admins can create and manage automation rules; Supervisors and Agents have no access to rule management.

### Key Entities

- **AutomationRule**: Belongs to a tenant. Has a name, enabled status (boolean), priority order (integer), trigger type, trigger configuration, and a response text template. Soft-deletable.
- **RuleTrigger**: Configuration for the trigger. For Keyword: list of keyword strings. For Outside Hours: references tenant business hours config. For First Message: no additional config. For No-Reply Timeout: timeout duration in minutes.
- **RuleFireLog**: Record of when a rule fired for a specific conversation — prevents duplicate fires within the same timeout window, and supports future analytics.
- **BusinessHoursConfig**: Tenant-level setting. Days of week, open time, close time, and timezone. Required before the Outside Hours trigger can be activated.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Automated replies for Keyword, Outside Hours, and First Message triggers are delivered within 30 seconds of the triggering event.
- **SC-002**: No-reply timeout rules fire within 60 seconds of the configured timeout expiring.
- **SC-003**: Admins can create a fully working automation rule (trigger + response) in under 2 minutes from the dashboard.
- **SC-004**: Zero cross-tenant rule exposure — a tenant's rules cannot be accessed, triggered, or viewed by another tenant under any condition.
- **SC-005**: Rule priority reordering takes effect for all subsequent messages without requiring a page reload.
- **SC-006**: Dynamic variable substitution is correct in 100% of rule fires — no raw `{{variable}}` placeholders appear in customer-facing messages.
- **SC-007**: Rule preview accurately shows the final message a customer would receive, including resolved variable fallbacks.
- **SC-008**: Plan limits are enforced at rule creation — no tenant can exceed their allowed rule count even under concurrent creation attempts.

## Assumptions

- Business hours configuration (timezone, open/close times, days of week) will be managed in a separate Settings section of the WABDesk dashboard; the Automation Rules feature depends on that configuration existing before the Outside Hours trigger can be used.
- "Human agent currently active" is defined as: the assigned agent has sent at least one outbound message in the current conversation while it is in Open or Pending status.
- The no-reply timeout is measured from the timestamp of the most recent inbound customer message, not from conversation creation or assignment time.
- Phase 1 applies rules to all WhatsApp channels for a tenant (not per-channel scoping); per-channel rule configuration is deferred to Phase 2.
- Only Admins manage rules; Supervisors and Agents are fully excluded from rule creation and editing.
- Text-only responses are in scope; media attachments, interactive buttons, and Meta-approved WhatsApp template messages are deferred to Phase 2.
- `{{current_time}}` resolves to the current time in the tenant's configured timezone.
- The rules dashboard UI must support Arabic RTL layout, consistent with the rest of the WABDesk product.
- The system does not need to notify Admins when a rule fires (no fire alerts in Phase 1); a rule fire log may be viewed in analytics later.
