# Convex API Contracts: WhatsApp Embedded Signup

**Feature**: `003-whatsapp-embedded-signup` | **Date**: 2026-04-02

All write operations calling Meta APIs are **actions** (not mutations). All functions validate `tenantId` from Clerk JWT.

---

## channels.ts

### `listForTenant` — query (live)
Returns all channels for the tenant with status and display info. Never returns `accessToken`.

**Input**: none (tenantId from auth context)

**Output**:
```typescript
Array<{
  _id: Id<"channels">;
  phoneNumberId: string;
  displayPhone: string;
  displayName: string;
  wabaId: string;
  assignmentMode: "first_reply" | "manual" | "round_robin";
  status: "connecting" | "active" | "disconnected" | "reconnect_required";
  connectedAt: number | null;
}>
```

**Auth**: Any authenticated org member.

---

### `completeEmbeddedSignup` — action
Exchanges the OAuth code for a system user token, registers the webhook, and creates/updates the channel document.

**Input**:
```typescript
{
  code: string;            // OAuth code from FB.login callback
  wabaId: string;          // From postMessage event
  phoneNumberId: string;   // From postMessage event
  displayName: string;     // Admin-set label (e.g. "Support Line")
}
```

**Behavior**:
1. Validates caller is Admin
2. Checks plan channel limit — throws `ConvexError("PLAN_LIMIT_REACHED")` if at limit
3. Calls `GET graph.facebook.com/v21.0/oauth/access_token` to exchange `code` → system user token
4. AES-256 encrypts the token using `ENCRYPTION_SECRET` env var
5. Calls `POST graph.facebook.com/v21.0/{wabaId}/subscribed_apps` to register webhook
6. Upserts channel by `(tenantId, phoneNumberId)`:
   - If exists (reconnection): updates `accessToken`, `status: "active"`, `connectedAt`
   - If new: creates channel document with `status: "connecting"` then patches to `"active"` on webhook success
7. If webhook registration fails: leaves status as `"connecting"`, schedules retry action
8. Sets `onboardingStates.whatsappConnected = true` for the tenant

**Auth**: Admin only.

**Output**: `{ channelId: Id<"channels">; displayPhone: string }`

**Errors**:
- `ConvexError("FORBIDDEN")`
- `ConvexError("PLAN_LIMIT_REACHED")`
- `ConvexError("TOKEN_EXCHANGE_FAILED", { reason })` — Meta rejected the code
- `ConvexError("DUPLICATE_NUMBER")` — phone number already active on another tenant

---

### `disconnect` — mutation
Marks a channel as disconnected. Preserves all conversation history.

**Input**: `{ channelId: Id<"channels"> }`

**Behavior**:
1. Validates caller is Admin
2. Validates channel belongs to caller's tenant
3. Patches `status: "disconnected"`, `disconnectedAt: Date.now()`
4. Does NOT delete the channel or any conversations

**Auth**: Admin only.

**Output**: `void`

---

### `rename` — mutation
Updates the admin-facing display name of a channel.

**Input**: `{ channelId: Id<"channels">; displayName: string }`

**Auth**: Admin only.

**Output**: `void`

---

### `setStatus` — internal mutation
Updates channel status. Called internally by actions after webhook registration or token error detection.

**Input**: `{ channelId: Id<"channels">; status: "connecting" | "active" | "disconnected" | "reconnect_required" }`

**Auth**: Internal only.

**Output**: `void`

---

## onboardingStates.ts

### `getForTenant` — query (live)
Returns the onboarding completion state for the caller's tenant.

**Input**: none

**Output**:
```typescript
{
  workspaceNamed: boolean;
  whatsappConnected: boolean;
  teamInvited: boolean;
  inboxVisited: boolean;
  completedAt: number | null;
} | null
```

**Auth**: Any authenticated org member.

---

### `markStep` — mutation
Marks a specific onboarding step as complete.

**Input**: `{ step: "workspace_named" | "team_invited" | "inbox_visited" }`

**Note**: `whatsapp_connected` is set automatically by `completeEmbeddedSignup` action — not callable directly via this mutation.

**Auth**: Admin only.

**Output**: `void`

---

## UI: Next.js App Router

### `GET /onboarding` (or `/setup`)
Protected page — authenticated users only.

**Behavior**: Reads `onboardingStates.getForTenant`; if all required steps complete, redirects to `/inbox`. Otherwise shows the current incomplete step.

### `components/onboarding/embedded-signup-button.tsx`
Client component that:
1. Loads Facebook JS SDK via `<Script src="https://connect.facebook.net/en_US/sdk.js" />`
2. Calls `FB.init({ appId: process.env.NEXT_PUBLIC_META_APP_ID, version: 'v21.0' })`
3. Attaches `window.postMessage` listener for `WA_EMBEDDED_SIGNUP` event
4. On button click: calls `FB.login` with `config_id`
5. On both callbacks resolved: calls `useMutation(api.channels.completeEmbeddedSignup)`
6. Shows loading state ("Connecting...") while action runs
7. On success: shows "Connected!" and triggers parent step completion
8. On error: shows inline error with specific reason

### `app/(dashboard)/settings/channels/page.tsx`
Admin-only page listing all channels with status badges, display names, Disconnect button, and "Add Channel" button that opens `<EmbeddedSignupButton>`.
