# Feature Specification: WhatsApp Embedded Signup

**Feature Branch**: `003-whatsapp-embedded-signup`
**Created**: 2026-04-02
**Status**: Draft
**Input**: User description: "WhatsApp Embedded Signup — Admin connects their WhatsApp Business Account (WABA) to WaDesk in under 5 minutes using Meta's Embedded Signup flow. They authenticate with Facebook, select or create a WABA, choose a phone number, and the channel is immediately active in their inbox. This is the critical onboarding step — without it no messages can be received."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Admin connects a WhatsApp number for the first time (Priority: P1)

A new WaDesk admin has just created their account. They land on the onboarding page and see a
"Connect WhatsApp" button. They click it, complete the Facebook/Meta login, select their existing
WhatsApp Business Account (or create a new one), choose a phone number, and grant the required
permissions. Within seconds, the connected number appears as an active channel in their WaDesk inbox —
ready to receive messages. Total time from clicking the button to first message received: under 5 minutes.

**Why this priority**: This is the gateway to the entire product. Zero channels connected = zero
conversations = zero value. Every other feature is blocked until this works.

**Independent Test**: Complete the Facebook OAuth + WABA selection flow, verify the channel appears
in the inbox channel list, send a test WhatsApp message to the connected number, and confirm it
appears in the Unassigned queue.

**Acceptance Scenarios**:

1. **Given** an admin is on the WaDesk dashboard with no channels connected, **When** they click
   "Connect WhatsApp", **Then** a Meta-branded popup/flow opens for Facebook authentication.
2. **Given** the admin has authenticated with Facebook, **When** they select an existing WABA and
   phone number and grant permissions, **Then** the channel is created in WaDesk and appears in
   the inbox channel list within 10 seconds.
3. **Given** the admin does not have an existing WABA, **When** they complete the Embedded Signup
   flow to create a new WABA, **Then** the new number is registered and connected as a channel.
4. **Given** the channel is connected, **When** a customer sends a WhatsApp message to the
   connected number, **Then** it appears in the WaDesk inbox Unassigned queue within 3 seconds.
5. **Given** the admin completes signup, **When** they view the channel in settings, **Then** they
   can see the connected phone number, display name, and WABA ID.

---

### User Story 2 — Admin connects an additional WhatsApp number (Priority: P2)

An admin who already has one WhatsApp number connected wants to add a second number (e.g., a
dedicated Sales line in addition to their Support line). They go to Settings → Channels, click
"Add Channel", and complete the Embedded Signup flow again. The new number is added as a separate
channel without affecting the existing one. Both channels appear in the inbox with distinct labels.

**Why this priority**: Multi-number is a core Phase 1 requirement (Growth plan: up to 3 numbers).
Adding a second channel must not disrupt or reconfigure the first.

**Independent Test**: With one channel already connected, complete the flow to add a second number.
Verify both channels appear independently in the inbox, each receiving messages separately.

**Acceptance Scenarios**:

1. **Given** one channel is already active, **When** the admin adds a second number via "Add Channel",
   **Then** the second channel is created without affecting the first.
2. **Given** two channels are connected, **When** a customer messages each number,
   **Then** the messages appear in separate channel views in the inbox.
3. **Given** a tenant is on the Free or Starter plan (max 1 number), **When** they try to add a
   second channel, **Then** they see an upgrade prompt explaining the plan limit.

---

### User Story 3 — Admin disconnects or reconnects a channel (Priority: P3)

An admin needs to disconnect a WhatsApp number from WaDesk — for example, because they are
changing their WhatsApp Business setup or troubleshooting. They can disconnect from Settings →
Channels. Disconnecting stops new messages from arriving but preserves all existing conversation
history. They can reconnect the same number later by going through the Embedded Signup flow again.

**Why this priority**: Channel management is required for production use. Admins must be able to
recover from misconfigurations without losing data.

**Independent Test**: Disconnect a channel, verify new messages no longer appear, verify old
conversations still exist. Reconnect, verify new messages resume.

**Acceptance Scenarios**:

1. **Given** a connected channel, **When** an admin clicks "Disconnect", **Then** the channel is
   marked inactive and new inbound messages stop appearing in the inbox.
2. **Given** a disconnected channel, **When** the admin reconnects it via Embedded Signup,
   **Then** it becomes active again and new messages resume flowing.
3. **Given** a channel is disconnected, **When** an admin views conversation history,
   **Then** all past conversations and messages are still accessible (no data loss).

---

### Edge Cases

- What happens if the admin closes the Meta popup mid-flow before completing?
  The flow is abandoned silently — no partial channel is created. The admin can restart by clicking "Connect WhatsApp" again.
- What happens if the phone number selected is already registered on another WaDesk tenant?
  Blocked — Meta will surface an error during the flow. WaDesk shows a clear message: "This number is already in use."
- What happens if Meta's Embedded Signup service is unavailable?
  Show a "Connection service temporarily unavailable" message with a retry option.
- What happens if the webhook registration fails after WABA selection succeeds?
  Channel is created in a "pending" state. A background retry registers the webhook. Admin sees "Connecting..." status until webhook is confirmed.
- What happens when a connected number's access token expires?
  The channel is flagged as "Disconnected — reconnection required" in the inbox. The admin is prompted to re-authenticate.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Admins MUST be able to initiate the WhatsApp channel connection flow from the WaDesk dashboard without leaving the platform (popup or embedded flow).
- **FR-002**: The connection flow MUST use Meta's official Embedded Signup to authenticate with Facebook and authorize WaDesk to send/receive messages on behalf of the WABA.
- **FR-003**: After a successful connection, a new WhatsApp channel MUST appear in the tenant's channel list within 10 seconds.
- **FR-004**: The connected channel MUST immediately begin receiving inbound WhatsApp messages — no manual webhook configuration required from the admin.
- **FR-005**: Admins MUST be able to set a display name for the channel (e.g., "Support Line", "Sales") during or after connection.
- **FR-006**: The system MUST enforce plan-based channel limits — Free and Starter tenants cannot connect more than 1 number; Growth: up to 3; Business: unlimited.
- **FR-007**: Admins MUST be able to disconnect a channel from Settings → Channels. Disconnecting MUST preserve all existing conversation history.
- **FR-008**: Admins MUST be able to reconnect a previously disconnected number by completing the Embedded Signup flow again.
- **FR-009**: The system MUST detect and surface expired or revoked access tokens, prompting the admin to reconnect.
- **FR-010**: The connection status of each channel (Active / Connecting / Disconnected) MUST be visible in Settings → Channels.

### Key Entities

- **Channel**: A connected WhatsApp Business number belonging to a tenant. Key attributes: tenantId, phone number, display name, WABA ID, Meta phone number ID, connection status (active/connecting/disconnected), connected at timestamp.
- **WABAConnection**: The OAuth-derived access token and permissions for a WABA. Attributes: tenantId, WABA ID, access token (stored server-side only — never exposed to client), token expiry.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can complete the full WhatsApp connection flow — from clicking "Connect WhatsApp" to receiving their first test message in the inbox — in under 5 minutes.
- **SC-002**: Channel connection takes effect within 10 seconds of the admin completing the Meta authorization flow.
- **SC-003**: 100% of connected channels receive inbound messages without any manual webhook configuration by the admin.
- **SC-004**: Admins can connect their WhatsApp number on the first attempt with a success rate of 90% or higher (measured over first 30 days of launch).
- **SC-005**: Disconnecting a channel results in zero data loss — all conversation history remains accessible.

## Assumptions

- Meta's Embedded Signup JavaScript SDK is embedded in the WaDesk frontend; the OAuth flow opens in a popup.
- WaDesk registers a single Meta App that all tenants connect through (shared app, each tenant's WABA is independently authorized).
- Access tokens obtained via Embedded Signup are long-lived system user tokens or exchanged for permanent tokens server-side.
- Each connected phone number maps to exactly one WaDesk channel document per tenant.
- Webhook registration (subscribing the WaDesk webhook URL to the WABA) is handled automatically by WaDesk after the admin completes the flow — the admin never sees or touches webhook URLs.
- Phone number display names come from the Meta WABA profile; admins can override with a WaDesk-internal label.
- The Free plan permits 1 channel; channel limit is enforced before the connection flow begins, not after.
- Re-connecting a disconnected number reuses the existing channel document (updates token + status) rather than creating a new one.
