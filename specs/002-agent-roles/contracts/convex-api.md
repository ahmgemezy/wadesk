# Convex API Contracts: Agent Roles & Permissions

**Feature**: `002-agent-roles` | **Date**: 2026-04-02

These contracts extend the API from `001-multi-agent-inbox`. All functions validate `tenantId` from the Clerk JWT. All write operations that call Clerk Backend SDK are implemented as **actions** (not mutations) since they perform async I/O.

---

## orgMembers.ts

### `list` — query (live)
Returns all active and pending members of the caller's org.

**Input**: none (tenantId from auth context)

**Note**: This query returns data cached from Clerk via a Convex action sync, OR calls Clerk SDK directly in a non-live query. For live updates, the client polls this query after invite/role-change actions settle.

**Output**:
```typescript
Array<{
  userId: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
  role: "org:admin" | "org:supervisor" | "org:agent";
  status: "active" | "pending";
  joinedAt: number | null;
}>
```

**Auth**: Admin or Supervisor role required.

---

### `inviteByEmail` — action
Sends a Clerk email invitation to a new team member.

**Input**:
```typescript
{ email: string; role: "org:admin" | "org:supervisor" | "org:agent" }
```

**Behavior**:
1. Validates caller is Admin (only Admins can invite — FR-003)
2. Checks plan agent limit — throws `ConvexError("PLAN_LIMIT_REACHED")` if at limit
3. Calls `clerkClient.organizations.createOrganizationInvitation({ emailAddress, role })`
4. Returns void on success

**Auth**: Admin role required. Returns `ConvexError("FORBIDDEN")` for other roles.

**Output**: `void`

**Errors**:
- `ConvexError("FORBIDDEN")` — caller is not Admin
- `ConvexError("PLAN_LIMIT_REACHED")` — tenant at agent limit
- `ConvexError("ALREADY_MEMBER")` — email already has active membership

---

### `inviteByWhatsApp` — action
Sends an invite link via WhatsApp message to a phone number.

**Input**:
```typescript
{ phone: string; role: "org:admin" | "org:supervisor" | "org:agent" }
```

**Behavior**:
1. Validates caller is Admin
2. Validates `phone` is valid E.164 format — throws `ConvexError("INVALID_PHONE")` if not
3. Checks plan agent limit
4. Creates (or reuses) the active `inviteLink` for the tenant (calls `inviteLinks.getOrCreate` internally)
5. Calls Meta Cloud API to send WhatsApp template message with the invite URL
6. On Meta API failure: throws `ConvexError("WHATSAPP_SEND_FAILED", { reason: string })` — UI shows inline error + copy-link fallback

**Auth**: Admin role required.

**Output**: `void`

**Errors**:
- `ConvexError("FORBIDDEN")`
- `ConvexError("INVALID_PHONE")`
- `ConvexError("PLAN_LIMIT_REACHED")`
- `ConvexError("WHATSAPP_SEND_FAILED", { reason })` — with specific Meta error reason

---

### `changeRole` — action
Changes an existing member's role.

**Input**:
```typescript
{ targetUserId: string; newRole: "org:admin" | "org:supervisor" | "org:agent" }
```

**Behavior**:
1. Validates caller is Admin
2. If demoting an Admin: checks count of admins. If count === 1, throws `ConvexError("LAST_ADMIN")`
3. Calls `clerkClient.organizations.updateOrganizationMembership({ userId, role })`
4. Role change takes effect immediately — Clerk JWT refreshes on next request (SC-003)

**Auth**: Admin role required.

**Output**: `void`

**Errors**:
- `ConvexError("FORBIDDEN")`
- `ConvexError("LAST_ADMIN")` — cannot demote the last admin

---

### `removeMember` — action
Removes a member from the tenant org and returns their open conversations to Unassigned.

**Input**:
```typescript
{ targetUserId: string }
```

**Behavior**:
1. Validates caller is Admin
2. Checks last-admin protection (same as `changeRole`)
3. Calls `clerkClient.organizations.deleteOrganizationMembership({ userId })`
4. Calls internal mutation `conversations.unassignAll({ agentId: targetUserId, tenantId })` — sets `assignedAgentId = null` on all open conversations assigned to this agent (SC-005: within 5 seconds)

**Auth**: Admin role required.

**Output**: `void`

---

## inviteLinks.ts

### `generate` — mutation
Creates a new shareable invite link, revoking any previous active link.

**Input**: none (tenantId and callerId from auth context)

**Behavior**:
1. Validates caller is Admin
2. Sets `revoked: true` on all existing non-revoked `inviteLinks` for this tenant
3. Creates new `inviteLink` with:
   - `token`: 64-char hex random string
   - `expiresAt`: `Date.now() + 7 * 24 * 60 * 60 * 1000` (7 days)
   - `revoked: false`
   - `defaultRole: "org:agent"`
4. Returns the full invite URL

**Auth**: Admin role required.

**Output**: `{ token: string; expiresAt: number; url: string }`

---

### `revoke` — mutation
Revokes the active shareable invite link.

**Input**: none

**Behavior**: Sets `revoked: true` on the current active link for the tenant.

**Auth**: Admin role required.

**Output**: `void`

---

### `getActive` — query (live)
Returns the currently active invite link (if any).

**Input**: none

**Output**:
```typescript
{
  token: string;
  expiresAt: number;
  url: string;
  createdAt: number;
} | null
```

**Auth**: Admin role required.

---

### `validateAndJoin` — action (called from `/join/[token]` page)
Validates a token and adds the authenticated user to the org.

**Input**:
```typescript
{ token: string }
```

**Behavior**:
1. Looks up `inviteLink` by token
2. Validates: not revoked, not expired → throws `ConvexError("INVITE_INVALID")` if either
3. Checks plan agent limit → throws `ConvexError("PLAN_LIMIT_REACHED")` if at limit
4. Calls `clerkClient.organizations.createOrganizationMembership({ organizationId, userId, role: "org:agent" })`
5. Does NOT revoke the link — multiple users can join via the same link until it expires or is revoked

**Auth**: Caller must be authenticated (any Clerk user).

**Output**: `{ orgId: string; orgName: string }` — used to redirect to inbox

**Errors**:
- `ConvexError("INVITE_INVALID")` — expired or revoked
- `ConvexError("PLAN_LIMIT_REACHED")`
- `ConvexError("ALREADY_MEMBER")` — user is already in this org

---

## channels.ts (additions)

### `setAssignmentMode` — mutation
Updates the assignment mode for a channel.

**Input**:
```typescript
{ channelId: Id<"channels">; mode: "first_reply" | "manual" | "round_robin" }
```

**Behavior**:
1. Validates caller is Admin
2. If `mode === "round_robin"`: checks `tenant.plan` is Growth or Business — throws `ConvexError("PLAN_REQUIRED", { requiredPlan: "growth" })` for Free/Starter
3. Patches `channel.assignmentMode`

**Auth**: Admin role required.

**Output**: `void`

---

## conversations.ts (additions)

### `unassignAll` — internal mutation
Unassigns all open conversations for a given agent. Called when an agent is removed.

**Input**:
```typescript
{ agentId: string }
```

**Behavior**: Queries all conversations where `assignedAgentId === agentId` and `status !== "resolved"` → sets `assignedAgentId = null` for each.

**Auth**: Internal only — not callable from client.

**Output**: `{ count: number }` — number of conversations returned to Unassigned

---

## UI Routes (Next.js App Router)

### `GET /join/[token]`
Public page — no auth required to view.

**Behavior**:
1. Calls `inviteLinks.validateToken` (read-only check) to verify token is valid before showing UI
2. If invalid: shows "Invite expired or invalid" message
3. If valid: shows "Join [OrgName] on WABDesk" page with Clerk sign-up/sign-in component
4. After auth: calls `inviteLinks.validateAndJoin` server action with the token
5. On success: redirects to `/inbox`

### `GET /accept-invite` (Clerk redirect URL)
Post-email-invitation acceptance page. Clerk redirects here after the invitee completes signup.

**Behavior**: Clerk handles the invite acceptance automatically. This page confirms success and redirects to `/inbox`.
