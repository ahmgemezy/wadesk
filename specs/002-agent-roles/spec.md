# Feature Specification: Agent Roles & Permissions

**Feature Branch**: `002-agent-roles`
**Created**: 2026-04-02
**Status**: Draft
**Input**: User description: "Agent roles and permissions: Admin, Supervisor, Agent roles with distinct permission matrix, three invitation methods (email, WhatsApp, shareable link), and three conversation assignment modes (First Reply Wins, Manual, Round Robin)"

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Admin invites a new agent and assigns them a role (Priority: P1)

An admin opens the team settings page and invites a new team member using any of three methods:
entering their email address, entering their WhatsApp number, or generating a shareable invite link.
The admin selects a role (Admin, Supervisor, or Agent) and sends the invitation. The invitee receives
the invitation via the chosen channel (email, WhatsApp message, or shared link). When they accept,
they are added to the team with the correct role and permissions immediately active.

**Why this priority**: Agent invitation is the gateway for team adoption. Without it, no one
other than the founder can use the product.

**Independent Test**: Can be fully tested by inviting a new member via each method, having them accept,
and verifying they can (or cannot) perform role-specific actions — independent of assignment modes.

**Acceptance Scenarios**:

1. **Given** an admin is on the team settings page, **When** they enter an email, select "Agent"
   role, and send the invite, **Then** the invitee receives an invitation email with a join link.
2. **Given** an admin enters a WhatsApp number and selects a role, **When** they send the invite,
   **Then** the invitee receives a WhatsApp message with a join link.
3. **Given** an admin generates a shareable invite link, **When** they share it and a new user opens it,
   **Then** the new user can create an account and joins with the Agent role by default.
4. **Given** an invitee clicks any join link, **When** they complete account creation,
   **Then** they appear in the team list with the correct role and can log into the inbox.
5. **Given** a new agent logs in for the first time, **When** they open the inbox,
   **Then** they can only see conversations assigned to them (not all conversations).

---

### User Story 2 — Admin invites an agent via WhatsApp (Priority: P2)

An admin enters a phone number and sends an invitation via WhatsApp instead of email. The invitee
receives a WhatsApp message with a join link. They click the link and create an account. This is
the preferred method for Arab market agents who may not regularly check email.

**Why this priority**: WhatsApp invitation is a core differentiator for the Arab SMB market.
Agents in Egypt and Gulf countries are far more reachable via WhatsApp than email.

**Independent Test**: Enter a phone number in the invite flow, send via WhatsApp, have the
recipient click the link, and verify they join with the correct role.

**Acceptance Scenarios**:

1. **Given** an admin enters a valid phone number and selects "Invite via WhatsApp",
   **When** they confirm, **Then** a WhatsApp message is sent to that number with a join link.
2. **Given** the invitee receives the WhatsApp message and clicks the link,
   **When** they complete account creation, **Then** they are added to the team as an Agent.
3. **Given** an invalid or unformatted phone number is entered,
   **When** the admin tries to send, **Then** they see a clear error and the invite is not sent.

---

### User Story 3 — Admin generates a shareable invite link (Priority: P3)

An admin generates a time-limited invite link (valid for 7 days) that can be shared anywhere —
a WhatsApp group, Slack, email thread. Anyone who clicks the link and creates an account joins
the workspace as an Agent by default. The admin can revoke the link at any time.

**Why this priority**: Shareable links allow bulk onboarding of a team without entering individual
email addresses or phone numbers.

**Independent Test**: Generate a link, open it in an incognito browser, create an account, and
verify the new user joins as Agent. Test that the link stops working after revocation.

**Acceptance Scenarios**:

1. **Given** an admin generates an invite link, **When** they share it and a new user opens it,
   **Then** the new user can create an account and joins as Agent role.
2. **Given** an invite link exists, **When** an admin revokes it,
   **Then** anyone clicking the link after revocation sees an "Invite expired or invalid" message.
3. **Given** an invite link is 7 days old, **When** someone tries to use it,
   **Then** it is automatically expired and the user cannot join.

---

### User Story 4 — Role-based access control is enforced in the inbox (Priority: P4)

Each role has a distinct set of allowed actions. An Agent can only see their own assigned
conversations. A Supervisor can see all conversations and reassign them. An Admin has full access
including billing and settings. These restrictions are enforced on every action — not just in the
UI but at the data access level.

**Why this priority**: Security and trust. A business owner MUST be able to rely on agents not
seeing each other's conversations or changing settings they shouldn't touch.

**Independent Test**: Log in as each role and attempt actions outside the role's permission —
verify they are blocked at every level.

**Acceptance Scenarios**:

1. **Given** a user with Agent role, **When** they try to view another agent's conversations,
   **Then** those conversations are not visible and cannot be accessed.
2. **Given** a user with Supervisor role, **When** they try to change billing settings,
   **Then** the action is blocked and they see a "Permission denied" message.
3. **Given** a user with Admin role, **When** they perform any action in the permission matrix,
   **Then** all Admin-level actions succeed without restriction.

---

### User Story 5 — Admin configures conversation assignment mode per channel (Priority: P5)

An admin opens channel settings and selects one of three assignment modes: First Reply Wins,
Manual Assignment, or Round Robin (Growth plan and above only). The mode takes effect
immediately for new conversations on that channel.

**Why this priority**: Assignment mode determines the operational workflow for the entire team.
Different businesses need different models depending on team size and specialization.

**Independent Test**: Set a channel to Manual Assignment mode, receive a new conversation, and
verify it lands in the Unassigned queue rather than auto-assigning.

**Acceptance Scenarios**:

1. **Given** a channel is set to "First Reply Wins", **When** any agent first replies to a
   conversation, **Then** that conversation is automatically assigned to them.
2. **Given** a channel is set to "Manual Assignment", **When** a new conversation arrives,
   **Then** it goes to the Unassigned queue and no agent is assigned automatically.
3. **Given** a channel is set to "Round Robin" (Growth plan), **When** multiple conversations
   arrive, **Then** they are distributed equally across available agents in rotation.
4. **Given** a tenant is on the Free or Starter plan, **When** an admin tries to set Round Robin,
   **Then** the option is disabled with an upgrade prompt.

---

### Edge Cases

- What happens when the only Admin tries to demote themselves to Agent?
  Blocked — at least one Admin MUST exist at all times per tenant.
- What happens when an invited agent's email already has a WABDesk account in another org?
  They can join multiple organizations with the same account; roles are org-scoped.
- What happens when a shareable invite link is used after the workspace reaches its plan's
  agent limit?
  The join is blocked with a message explaining the plan limit and an upgrade prompt.
- What happens when an admin removes an agent who has open assigned conversations?
  Conversations are automatically returned to the Unassigned queue.
- What happens when a WhatsApp invite message fails to send (number not on WhatsApp, channel disconnected, API error)?
  An inline error is shown with the specific reason; the admin is offered an option to copy the invite link as a fallback.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST support three roles per tenant: Admin, Supervisor, Agent.
- **FR-002**: Each role MUST enforce the permission matrix defined in CLAUDE.md exactly —
  permissions are enforced at the data level, not only in the UI.
- **FR-003**: Admins MUST be able to invite team members by email address.
- **FR-004**: Admins MUST be able to invite team members by phone number via WhatsApp message.
- **FR-005**: Admins MUST be able to generate a time-limited shareable invite link (default: 7 days). Only one active link exists per tenant at a time — generating a new link auto-revokes the previous one.
- **FR-006**: Admins MUST be able to manually revoke the active shareable invite link before it expires.
- **FR-007**: New members joining via shareable link MUST be assigned the Agent role by default.
- **FR-008**: Admins MUST be able to change any team member's role (except demoting the last Admin).
- **FR-009**: Admins MUST be able to remove team members; their assigned conversations MUST return to Unassigned.
- **FR-010**: The system MUST enforce plan-based agent count limits — joining is blocked when the limit is reached.
- **FR-011**: Admins MUST be able to configure the assignment mode per channel: First Reply Wins, Manual, or Round Robin.
- **FR-012**: Round Robin assignment mode MUST only be available on Growth plan and above.
- **FR-013**: At least one Admin MUST exist per tenant at all times — the last Admin cannot be demoted or removed.

### Key Entities

- **OrgMember**: A team member within a tenant. Attributes: tenantId, userId, role (admin/supervisor/agent), status (active/invited/removed), invitedAt, joinedAt.
- **InviteLink**: A shareable invite token. Attributes: tenantId, token, createdBy, expiresAt, revoked, defaultRole. Constraint: only one non-revoked, non-expired link per tenant at a time.
- **Channel**: Includes assignmentMode (first_reply/manual/round_robin).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An admin can invite a new agent (by any method) and have them active in the workspace in under 3 minutes.
- **SC-002**: Role-based access restrictions are enforced with 100% accuracy — no agent can access data or perform actions outside their permission level.
- **SC-003**: Changing a team member's role takes effect immediately without requiring the affected user to log out and back in.
- **SC-004**: A shareable invite link can be generated and shared in under 30 seconds.
- **SC-005**: Removing an agent results in zero orphaned conversations — all their open conversations return to Unassigned within 5 seconds.

## Clarifications

### Session 2026-04-02

- Q: When Round Robin distributes conversations, which agents does it consider? → A: All active (non-removed) agents regardless of online status — no presence system required.
- Q: How should "agent offline" be detected and what is the default threshold for returning conversations? → A: FR-013 removed entirely — no auto-return based on offline status; Supervisors/Admins reassign manually.
- Q: When a WhatsApp invite fails to send, what should the admin see? → A: Show inline error with specific reason and offer to copy the invite link as a fallback.
- Q: Can a tenant have multiple active shareable invite links simultaneously? → A: One active link at a time — generating a new one auto-revokes the previous.

## Assumptions

- Clerk Organizations are used to manage membership and role assignments; role labels (Admin/Supervisor/Agent) map to Clerk organization roles.
- WhatsApp invitation messages are sent from the tenant's connected WhatsApp channel.
- Invite emails use a standard transactional email service (provider TBD at implementation).
- Round Robin distributes conversations to all active (non-removed) agents regardless of online status; no presence system required.
- Custom role creation (beyond Admin/Supervisor/Agent) is deferred to a future phase.
- Bulk CSV import of team members is deferred to Phase 2.
