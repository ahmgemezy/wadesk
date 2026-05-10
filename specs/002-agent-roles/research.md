# Research: Agent Roles & Permissions

**Feature**: `002-agent-roles` | **Date**: 2026-04-02

---

## 1. Clerk Organizations — Email Invitations & Role Assignment

**Decision**: Use Clerk's native `organizationInvitation.create()` Backend SDK API for email invitations.

**Rationale**: Clerk Organizations has a complete invitation lifecycle built in. Admin calls a Convex action → action uses Clerk Backend SDK (`clerkClient.organizations.createOrganizationInvitation()`) → Clerk sends the email with a join link → invitee clicks → Clerk handles account creation and org membership auto-join. The `role` parameter maps directly to WABDesk roles.

**Pattern**:
```typescript
// convex/orgMembers.ts (action — server-side only)
import { clerkClient } from "@clerk/nextjs/server";

await clerkClient.organizations.createOrganizationInvitation({
  organizationId: tenantId,
  inviterUserId: callerId,
  emailAddress: email,
  role: "org:agent", // or "org:supervisor", "org:admin"
  redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite`,
});
```

**Alternatives considered**:
- Custom transactional email (Resend/SendGrid): More work, Clerk already handles delivery and token security. Rejected.

---

## 2. Clerk Custom Roles — WABDesk Role Mapping

**Decision**: Create three Clerk Organization roles: `org:admin`, `org:supervisor`, `org:agent`. Map 1:1 to WABDesk permission matrix.

**Rationale**: Clerk supports custom roles per organization. Using named roles (`org:admin`, `org:supervisor`, `org:agent`) means role is extracted directly from the Clerk JWT in every Convex function via `identity.orgRole` — no extra lookup. Permissions are enforced server-side by checking this value.

**Role extraction in Convex**:
```typescript
const identity = await ctx.auth.getUserIdentity();
const role = identity?.orgRole; // "org:admin" | "org:supervisor" | "org:agent"
```

**Clerk Dashboard setup**: Create roles `supervisor` and `agent` (Clerk automatically namespaces as `org:supervisor`, `org:agent`). Default member role = `org:agent`.

**Alternatives considered**:
- Store role in Clerk `publicMetadata`: Requires extra metadata sync, not reflected in JWT without custom claims. Rejected.
- Convex `orgMembers` table mirroring Clerk membership: Creates sync complexity. Rejected — Clerk is authoritative.

---

## 3. Shareable Invite Links

**Decision**: Store token in Convex `inviteLinks` table. Serve `/join/[token]` page in Next.js. After signup, server action validates token and calls Clerk Backend SDK to add member.

**Rationale**: Clerk has no built-in "shareable public link" concept — only direct email invitations. We generate a cryptographically random token, store it in Convex with `expiresAt` and `revoked` flag, and build a custom join flow. One active link per tenant at a time (FR-005).

**Flow**:
1. Admin clicks "Generate Link" → Convex mutation creates `inviteLink` doc, auto-revokes previous
2. Admin copies/shares the URL: `https://app.wabdesk.com/join/{token}`
3. New user opens link → Next.js validates token → shows "Join WABDesk" page
4. User completes Clerk signup (or login if existing account)
5. Post-auth callback page server action: validates token again → calls `clerkClient.organizations.createOrganizationMembership()` with `role: "org:agent"` → marks token as used (revoked)

**Token generation**:
```typescript
import { randomBytes } from "crypto";
const token = randomBytes(32).toString("hex"); // 64-char hex
```

**Constraint enforced in Convex**: Before creating a new `inviteLink`, patch all existing non-expired, non-revoked links for the tenant to `revoked: true`.

**Alternatives considered**:
- Clerk invitation with pre-set email: Requires email — defeats purpose of shareable link. Rejected.
- Time-limited JWT signed with secret: No server-side revocation possible. Rejected (FR-006 requires revocation).

---

## 4. WhatsApp Invite via Meta API

**Decision**: Send invite message using tenant's connected WhatsApp channel via Meta Cloud API template message. Fall back to copy-link if send fails.

**Rationale**: Inviting new agents (who have never messaged the business) requires a Meta-approved template message — the 24-hour session window doesn't apply here since this is a business-initiated message to a new number. The invite link (from flow #3) is embedded in the template body.

**Implementation**:
1. Admin enters phone number (E.164 validated)
2. Convex action sends via Meta API using tenant's `channel.accessToken` and `channel.phoneNumberId`
3. Template: pre-approved "agent_invite" template with variable `{{1}}` = invite link
4. On failure: return structured error `{ code: "WHATSAPP_SEND_FAILED", reason: string }` → UI shows inline error + "Copy Link" CTA

**Template requirement**: Tenants must have a Meta-approved invite template. For MVP, WABDesk provides a standard shared template or documents how to create it.

**Note for MVP**: If no approved template exists, WhatsApp invite degrades gracefully to showing the copy-link fallback. This is acceptable per spec edge case handling.

**Alternatives considered**:
- Send as free-form text: Only works within 24h session window — agents won't have an existing session. Rejected.
- Use WABDesk's own Meta app system user to send: Sends from WABDesk's number, not tenant's — confusing for recipient. Rejected.

---

## 5. Last Admin Protection

**Decision**: Check admin count via Clerk Backend SDK before any demotion or removal. Block if count === 1.

**Rationale**: FR-013 requires at least one Admin per tenant at all times. Clerk doesn't enforce this natively. We check in the Convex mutation/action before calling Clerk API.

**Pattern**:
```typescript
const memberships = await clerkClient.organizations.getOrganizationMembershipList({
  organizationId: tenantId,
});
const adminCount = memberships.data.filter(m => m.role === "org:admin").length;
if (adminCount === 1 && targetMember.role === "org:admin") {
  throw new ConvexError("LAST_ADMIN");
}
```

**Alternatives considered**:
- Client-side check only: Bypassable. Rejected per Constitution Principle II.

---

## 6. Round Robin Assignment

**Decision**: Fetch active org members from Clerk Backend SDK in a Convex action. Sort by `userId` for determinism. Use `channel.roundRobinIndex` mod agent count to select next agent. Atomically increment index.

**Rationale**: Active agent list is Clerk-authoritative (not duplicated in Convex). Round Robin runs in a Convex action (can call Clerk SDK). Index stored on `channels` document.

**Pattern**:
```typescript
// In the webhook action, when assignmentMode === "round_robin"
const memberships = await clerkClient.organizations.getOrganizationMembershipList({
  organizationId: tenantId,
});
const agents = memberships.data
  .filter(m => m.role !== "org:admin" || true) // all active members
  .sort((a, b) => a.publicUserData.userId.localeCompare(b.publicUserData.userId));

const channel = await ctx.runQuery(api.channels.get, { channelId });
const idx = channel.roundRobinIndex % agents.length;
const assignedAgentId = agents[idx].publicUserData.userId;

await ctx.runMutation(api.channels.incrementRoundRobinIndex, { channelId });
await ctx.runMutation(api.conversations.assign, { conversationId, agentId: assignedAgentId });
```

**Note**: Round Robin distributes to ALL active (non-removed) members regardless of role or online status — per spec clarification 2026-04-02.

**Alternatives considered**:
- Duplicate agent list in Convex: Creates sync complexity with Clerk. Rejected.
- Presence-based (online agents only): Requires presence system — out of scope. Rejected per spec.

---

## 7. Plan Limit Enforcement — Agent Count

**Decision**: Before processing a join (email invite accept, WhatsApp invite accept, or shareable link join), check current active member count against `tenant.plan` limits in Convex.

**Limits** (from CLAUDE.md):
| Plan | Max Agents |
|------|-----------|
| Free | 2 |
| Starter | 5 |
| Growth | 15 |
| Business | Unlimited |

**Pattern**: Convex action reads `tenant.plan` → fetches Clerk org membership count → compares → blocks join with `ConvexError("PLAN_LIMIT_REACHED")` if exceeded.

**Alternatives considered**:
- Check only in UI: Bypassable. Rejected per Constitution Principle II.
