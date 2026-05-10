# Feature Specification: Multi-Tenant Onboarding Flow

**Feature Branch**: `004-multi-tenant-onboarding`
**Created**: 2026-04-02
**Status**: Draft
**Input**: User description: "Multi-tenant onboarding flow — from account signup to first WhatsApp message received in under 5 minutes. Steps: sign up with Clerk, create organization, connect WhatsApp via Embedded Signup (feature 003), optionally invite first agent, land in live inbox. Every step is guided with clear progress indicators."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Business owner signs up and reaches a live inbox in under 5 minutes (Priority: P1)

A small business owner in Egypt discovers WABDesk, clicks "Get Started for Free", and completes
the entire setup without help. They create an account, set up their business workspace, connect
their WhatsApp number, and land in a live inbox ready to receive customer messages. The whole
journey takes under 5 minutes. No credit card required. No technical knowledge needed.

**Why this priority**: This is the most important metric in the entire product. Sub-5-minute
onboarding directly determines whether a business owner converts from visitor to active user.
Every extra step costs conversions.

**Independent Test**: Open the signup page as a new user → complete all steps without assistance
→ verify the inbox is live and a test WhatsApp message appears → measure total elapsed time
(must be under 5 minutes).

**Acceptance Scenarios**:

1. **Given** a new visitor clicks "Get Started for Free", **When** they complete the signup form,
   **Then** they land on a guided setup flow (not a blank dashboard).
2. **Given** the user completes account creation, **When** they reach the WhatsApp connection step,
   **Then** the Embedded Signup flow launches with one click — no manual Meta app configuration.
3. **Given** the user completes WhatsApp connection, **When** they send a test WhatsApp message
   to their connected number, **Then** it appears in their WABDesk inbox within 3 seconds.
4. **Given** the user completes all steps, **When** they land on the inbox,
   **Then** a progress indicator confirms all setup steps are complete.
5. **Given** the entire flow from signup to first message, **When** measured end-to-end,
   **Then** the elapsed time is under 5 minutes for a user with an existing WhatsApp Business number.

---

### User Story 2 — User resumes interrupted onboarding (Priority: P2)

A business owner starts the signup process but gets interrupted (closes the tab, gets a phone
call) after completing account creation but before connecting WhatsApp. When they return —
whether minutes or days later — they are taken directly back to the step they left off at,
not to a blank inbox or a confusing generic dashboard.

**Why this priority**: Interruptions during onboarding are common. Resuming exactly where you
left off dramatically increases completion rates.

**Independent Test**: Complete account creation → close the browser → re-open and log back in →
verify the user is taken to the WhatsApp connection step (not the completed inbox).

**Acceptance Scenarios**:

1. **Given** a user completed account creation but not WhatsApp connection, **When** they log in
   again, **Then** they see the onboarding flow at the WhatsApp connection step.
2. **Given** a user connected WhatsApp but skipped inviting an agent, **When** they return,
   **Then** they are taken to the inbox (not blocked by the skipped step).
3. **Given** a user has fully completed onboarding, **When** they log in,
   **Then** they go directly to the inbox — the onboarding flow never appears again.

---

### User Story 3 — Admin invites their first agent during onboarding (Priority: P3)

After connecting WhatsApp, the onboarding flow offers the admin an optional step to invite their
first team member. They can enter an email or phone number, send the invite, and proceed to the
inbox. The invited agent receives an invitation and can join the workspace. This step can be
skipped — the inbox is fully usable by the admin alone.

**Why this priority**: Team setup during onboarding drives activation — businesses that add their
first agent within 24 hours of signup have higher 30-day retention.

**Independent Test**: Complete account creation + WhatsApp connection → reach "Invite your team"
step → invite an agent by email → verify invite is sent → skip and proceed to inbox → verify
inbox is accessible without completing the invite step.

**Acceptance Scenarios**:

1. **Given** the admin reaches the "Invite your team" step, **When** they enter an email and click
   "Send Invite", **Then** the invitation is sent and a success confirmation is shown.
2. **Given** the admin clicks "Skip for now", **When** they proceed,
   **Then** they land directly in the inbox without error.
3. **Given** the invited agent receives the email and clicks the join link, **When** they complete
   signup, **Then** they join the workspace as an Agent and see the inbox.

---

### Edge Cases

- What happens if the WhatsApp connection step fails during onboarding?
  The user sees a clear error with a "Try again" button. The step is not marked complete. They can retry without restarting the entire flow.
- What happens if the user signs up with an email that already has a WABDesk account?
  They are taken to the login page with a message: "You already have an account. Sign in to continue."
- What happens if the user's free plan trial has already expired when they first complete onboarding?
  Edge case excluded from MVP — trials only start on paid plan. Free plan has no expiry.
- What happens when onboarding is complete but no WhatsApp messages have arrived yet?
  The inbox shows an empty state with guidance: "Your inbox is live! Send a WhatsApp message to [your number] to see it here."

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: New users MUST be presented with a step-by-step onboarding flow immediately after account creation — they MUST NOT land on a blank dashboard.
- **FR-002**: The onboarding flow MUST consist of exactly these steps in order: (1) Create account, (2) Set up workspace name, (3) Connect WhatsApp, (4) Invite team (optional), (5) Go to inbox.
- **FR-003**: Each completed onboarding step MUST be persisted — users who return after interruption MUST resume at their last incomplete step.
- **FR-004**: The WhatsApp connection step MUST embed the Embedded Signup flow inline (feature 003) — no redirect away from WABDesk.
- **FR-005**: The "Invite team" step MUST be skippable — the inbox MUST be accessible without completing it.
- **FR-006**: Once all required steps (1–3) are complete, the user MUST land in the live inbox and the onboarding flow MUST never appear again.
- **FR-007**: The onboarding flow MUST work correctly in Arabic (RTL) with Arabic UI copy as the default for users whose browser language is Arabic.
- **FR-008**: The onboarding flow MUST display a progress indicator showing which steps are complete, in progress, and remaining.
- **FR-009**: The workspace name entered during onboarding MUST be used as the organization display name visible to all team members.
- **FR-010**: No credit card is required to complete onboarding — the free plan MUST be activated without payment.

### Key Entities

- **OnboardingState**: Tracks completion of each step for a tenant. Attributes: tenantId, steps completed (array), completed at timestamp. Steps: `account_created`, `workspace_named`, `whatsapp_connected`, `team_invited` (optional), `inbox_visited`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 80% of new signups who start onboarding complete all required steps (1–3) within the same session.
- **SC-002**: The median time from clicking "Get Started" to first WhatsApp message received in inbox is under 5 minutes.
- **SC-003**: Users who return after an interrupted onboarding resume at the correct step 100% of the time.
- **SC-004**: Zero users land on a blank or confusing dashboard after completing account creation — all are directed to the guided flow.
- **SC-005**: The onboarding flow is fully usable in Arabic RTL with no layout or text-direction errors.

## Assumptions

- Clerk handles account creation and authentication; WABDesk controls the post-signup redirect to the onboarding flow.
- Workspace name = Clerk organization name; creating the workspace during onboarding creates the Clerk org.
- WhatsApp connection (step 3) depends on feature 003 (Embedded Signup) being implemented first.
- Team invite (step 4) reuses the invite-by-email mechanism from feature 002 (Agent Roles).
- Onboarding state is stored per tenant so all admins in the same organization see the same completion status.
- The onboarding flow is shown only to the first admin who creates the organization; subsequent admins who join via invite go directly to the inbox.
- Free plan is activated automatically on organization creation — no additional action required.
- Mobile onboarding (phone + tablet) is in scope for the layout; the flow must be responsive.
