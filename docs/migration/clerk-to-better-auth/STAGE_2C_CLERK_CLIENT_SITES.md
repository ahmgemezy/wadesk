# Stage 2c — clerkClient() Call-Site Replacements

**Produced:** 2026-05-06  
**Locked base:** `STAGE_1_ARCHITECTURE.md` §2E + `STAGE_2A_FOUNDATION.md`  
**Scope:** Planning only — no installs, no source file modifications. All diffs are applied in Stage 3.

---

## §1. Scope

Stage 0 counted 27 `clerkClient()` call sites. Stage 2b §8 attributed them to Stage 2c. An additional call site in `convex/teamPresence.ts` was discovered during file reading — it was omitted from Stage 2b's out-of-scope table but belongs here.

| File | `clerkClient()` calls | Stage 1 §2E row |
|---|---|---|
| `convex/orgMembers.ts` | 5 | Email invite, list members, change role, WhatsApp invite, remove member |
| `convex/members.ts` | 11 | Member profile, role change, remove, channel/dept updates, name/avatar mutations |
| `convex/teamPresence.ts` | 1 | List members for team presence |
| `convex/lib/emailHelpers.ts` | 3 | `getAdminEmails`, `resolveUserEmail`, `resolveOrgName` |
| `convex/actions/validateInvite.ts` | 1 | Plan limit check + create membership |
| `convex/actions/roundRobin.ts` | 1 | Fallback member list when no dept members |

Additionally, two helpers called by the above files have Clerk-specific input types:

| File | What changes | Touches protected file? |
|---|---|---|
| `convex/lib/planLimits.ts:assertAgentLimitNotReached` | Input type `{ data: unknown[] }` → `number` | **Yes — requires Ahmed approval before Stage 3** |
| `convex/lib/lastAdmin.ts:assertNotLastAdmin` | Input type (Clerk membership shape) → Better Auth member shape | Not on §30.3 protected list; free to change |

---

## §2. Better Auth Adapter API Contract

All `clerkClient()` reads are replaced by `authComponent.adapter(ctx)` queries. `authComponent` is imported from `convex/auth.ts` (Stage 2a file). The adapter targets Better Auth's Convex tables.

### Model names (after `npx auth generate`)

| Better Auth concept | Adapter model name | Convex table name |
|---|---|---|
| User account | `"user"` | `better_auth_users` (generated) |
| Organization | `"organization"` | `better_auth_organizations` |
| Organization member | `"member"` | `better_auth_members` |
| Invitation | `"invitation"` | `better_auth_invitations` |
| Session | `"session"` | `better_auth_sessions` |

**OQ-C1:** Exact Convex table names are determined by `npx auth generate` output. The model names above match Better Auth's organization plugin schema. Stage 3 must run `npx auth generate` first and verify model names from the generated `convex/betterAuth/schema.ts` before applying any adapter call.

### Member record shape

```typescript
{
  id: string,           // Better Auth internal ID
  userId: string,       // references user.id
  organizationId: string,
  role: string,         // "org:admin" | "org:supervisor" | "org:agent" (Option A)
  createdAt: Date,
}
```

### User record shape

```typescript
{
  id: string,
  name: string,         // single full name — Clerk's firstName+lastName merge into this
  email: string,
  emailVerified: boolean,
  image: string | null, // URL string only — no binary upload
  createdAt: Date,
  updatedAt: Date,
}
```

### Organization record shape

```typescript
{
  id: string,
  name: string,
  slug: string,
  createdAt: Date,
  logo: string | null,
  metadata: string | null,
}
```

### Invitation record shape

```typescript
{
  id: string,
  organizationId: string,
  email: string,
  role: string,
  status: "pending" | "accepted" | "rejected" | "canceled",
  expiresAt: Date,
  inviterId: string,    // userId of the inviter
  createdAt: Date,
}
```

### Adapter method signatures

```typescript
const adapter = authComponent.adapter(ctx);

// Read many
const rows = await adapter.findMany({
  model: "member",
  where: [{ field: "organizationId", value: tenantId }],
  // optional: sortBy?: { field, direction }, limit?: number
});

// Read one
const row = await adapter.findOne({
  model: "user",
  where: [{ field: "id", value: userId }]
});

// Create
const created = await adapter.create({
  model: "member",
  data: { userId, organizationId, role, createdAt: new Date() }
});

// Update
await adapter.update({
  model: "user",
  where: [{ field: "id", value: userId }],
  update: { name: fullName }
});

// Delete
await adapter.delete({
  model: "member",
  where: [{ field: "id", value: memberId }]
});
```

**OQ-C2:** Whether `adapter.findMany` supports `{ field: "id", operator: "in", value: [id1, id2] }` for batch user lookups is unconfirmed. If not supported, fall back to `Promise.all(ids.map(id => adapter.findOne(...)))`. Stage 3 verifies this against actual adapter API before choosing approach.

---

## §3. `convex/lib/planLimits.ts` — Required Change (Ahmed Approval)

`assertAgentLimitNotReached` currently takes `{ data: unknown[] }` — the exact shape returned by Clerk's `getOrganizationMembershipList`. After migration, callers will pass a Better Auth member array. The simplest fix changes the parameter to a count.

**This file is on CLAUDE.md §30.3's protected list. This change requires Ahmed's explicit approval before Stage 3 applies it.**

### BEFORE (lines 48–55)

```typescript
export function assertAgentLimitNotReached(
  clerkOrgMemberships: { data: unknown[] },
  plan: Plan,
): void {
  const limit = AGENT_LIMITS[plan] ?? AGENT_LIMITS.free;
  if (clerkOrgMemberships.data.length >= limit) {
    throw new ConvexError({
      message: "PLAN_LIMIT_REACHED",
      data: { currentPlan: plan, limit },
    });
  }
}
```

### AFTER (proposed)

```typescript
export function assertAgentLimitNotReached(
  currentMemberCount: number,
  plan: Plan,
): void {
  const limit = AGENT_LIMITS[plan] ?? AGENT_LIMITS.free;
  if (currentMemberCount >= limit) {
    throw new ConvexError({
      message: "PLAN_LIMIT_REACHED",
      data: { currentPlan: plan, limit },
    });
  }
}
```

### Caller change (at every call site)

```typescript
// BEFORE
assertAgentLimitNotReached(memberships, plan);

// AFTER — memberships is now the Better Auth members array
assertAgentLimitNotReached(members.length, plan);
```

Call sites that change: `convex/orgMembers.ts:inviteByEmail`, `convex/orgMembers.ts:inviteByWhatsApp`, `convex/actions/validateInvite.ts:validateAndJoin`.

---

## §4. `convex/lib/lastAdmin.ts` — Required Change

`assertNotLastAdmin` takes Clerk's membership shape. Better Auth member records use `userId` (not `publicUserData?.userId`).

### BEFORE

```typescript
export async function assertNotLastAdmin(
  memberships: { data: Array<{ role: string; publicUserData?: { userId: string } | null }> },
  targetUserId: string,
): Promise<void> {
  const admins = memberships.data.filter(
    (m) => m.role === "org:admin" || m.role === "admin",
  );
  if (admins.length <= 1) {
    const isTargetAdmin = admins.some(
      (a) => a.publicUserData?.userId === targetUserId,
    );
    if (isTargetAdmin) {
      throw new ConvexError("LAST_ADMIN");
    }
  }
}
```

### AFTER

```typescript
export async function assertNotLastAdmin(
  members: Array<{ role: string; userId: string }>,
  targetUserId: string,
): Promise<void> {
  const admins = members.filter((m) => m.role === "org:admin");
  if (admins.length <= 1) {
    const isTargetAdmin = admins.some((a) => a.userId === targetUserId);
    if (isTargetAdmin) {
      throw new ConvexError("LAST_ADMIN");
    }
  }
}
```

**Behavioral note:** The BEFORE also matched `role === "admin"` (bare string, Clerk v2 compact format). In the AFTER, only `"org:admin"` is matched because Better Auth emits full colon-prefixed roles (Option A from Stage 1). The bare `"admin"` branch was Clerk compatibility code — it is dead post-migration.

### Caller change

```typescript
// BEFORE — Clerk memberships
const memberships = await client.organizations.getOrganizationMembershipList({ ... });
await assertNotLastAdmin(memberships, targetUserId);

// AFTER — Better Auth members
const members = await adapter.findMany({
  model: "member",
  where: [{ field: "organizationId", value: tenantId }]
});
await assertNotLastAdmin(members, targetUserId);
```

Call sites: `convex/orgMembers.ts:changeRole`, `convex/orgMembers.ts:removeMember`.

---

## §5. `convex/lib/emailHelpers.ts` BEFORE/AFTER

Currently exports three plain TypeScript functions that call `clerkClient()`. After migration they query the adapter, which requires `ctx`. **All three function signatures add `ctx` as a first parameter.**

This is a breaking signature change — callers in `convex/actions/notifyEmail.ts` and `convex/actions/channelRetentionAction.ts` must also be updated (§10 covers those callers).

### BEFORE (full file, 46 lines)

```typescript
"use node";

import { clerkClient } from "@clerk/nextjs/server";

export async function getAdminEmails(
  orgId: string,
): Promise<Array<{ userId: string; email: string }>> {
  try {
    const client = await clerkClient();
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100,
    });
    return memberships.data
      .filter((m) => m.role === "org:admin")
      .filter((m) => m.publicUserData?.userId)
      .map((m) => ({
        userId: m.publicUserData!.userId!,
        email: (m.publicUserData?.identifier ?? "") as string,
      }))
      .filter((m) => m.email.length > 0);
  } catch {
    return [];
  }
}

export async function resolveUserEmail(userId: string): Promise<string | null> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return user.emailAddresses[0]?.emailAddress ?? null;
  } catch {
    return null;
  }
}

export async function resolveOrgName(orgId: string): Promise<string> {
  try {
    const client = await clerkClient();
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    return org.name ?? orgId;
  } catch {
    return orgId;
  }
}
```

### AFTER (proposed, ~50 lines)

```typescript
// "use node" removed — pure adapter queries; callers are already actions

import type { GenericActionCtx } from "convex/server";
import type { DataModel } from "../_generated/dataModel";
import { authComponent } from "../auth";

type Ctx = GenericActionCtx<DataModel>;

export async function getAdminEmails(
  ctx: Ctx,
  orgId: string,
): Promise<Array<{ userId: string; email: string }>> {
  try {
    const adapter = authComponent.adapter(ctx);
    const adminMembers = await adapter.findMany({
      model: "member",
      where: [
        { field: "organizationId", value: orgId },
        { field: "role", value: "org:admin" },
      ],
    });
    const users = await Promise.all(
      adminMembers.map((m) =>
        adapter.findOne({ model: "user", where: [{ field: "id", value: m.userId }] }),
      ),
    );
    return adminMembers
      .map((m, i) => ({ userId: m.userId, email: (users[i]?.email ?? "") as string }))
      .filter((m) => m.email.length > 0);
  } catch {
    return [];
  }
}

export async function resolveUserEmail(ctx: Ctx, userId: string): Promise<string | null> {
  try {
    const adapter = authComponent.adapter(ctx);
    const user = await adapter.findOne({ model: "user", where: [{ field: "id", value: userId }] });
    return (user?.email as string | null) ?? null;
  } catch {
    return null;
  }
}

export async function resolveOrgName(ctx: Ctx, orgId: string): Promise<string> {
  try {
    const adapter = authComponent.adapter(ctx);
    const org = await adapter.findOne({
      model: "organization",
      where: [{ field: "id", value: orgId }],
    });
    return ((org?.name as string | null) ?? null) ?? orgId;
  } catch {
    return orgId;
  }
}
```

**Behavioral note on `getAdminEmails`:** The BEFORE uses Clerk's `getOrganizationMembershipList` which returns all members, then filters for `role === "org:admin"`. The AFTER filters at the query level. No behavioral difference — same result, fewer records fetched.

**`"use node"` removal:** These functions no longer use Node.js APIs. Callers (`notifyEmail.ts`, `channelRetentionAction.ts`) already have `"use node"` and pass `ctx` — removing `"use node"` from `emailHelpers.ts` is safe.

---

## §6. `convex/actions/notifyEmail.ts` — Caller Updates

This file calls all three helpers. Each call site gains `ctx` as first argument. No other logic changes.

### Changed call sites (6 of them)

```typescript
// BEFORE
getAdminEmails(args.tenantId)
resolveOrgName(args.tenantId)
resolveUserEmail(args.userId)

// AFTER
getAdminEmails(ctx, args.tenantId)
resolveOrgName(ctx, args.tenantId)
resolveUserEmail(ctx, args.userId)
```

All occurrences at lines 77, 78, 99, 100, 121, 122, 158.

---

## §7. `convex/actions/channelRetentionAction.ts` — Caller Updates

```typescript
// BEFORE (lines 30, 68)
getAdminEmails(channel.tenantId)

// AFTER
getAdminEmails(ctx, channel.tenantId)
```

---

## §8. `convex/orgMembers.ts` BEFORE/AFTER

### 8.1 `inviteByEmail`

```typescript
// BEFORE — Clerk
const client = await clerkClient();
const memberships = await client.organizations.getOrganizationMembershipList({
  organizationId: tenantId, limit: 100,
});
const plan = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId });
assertAgentLimitNotReached(memberships, plan);
if (args.role === "org:supervisor") assertSupervisorRoleAllowed(plan);

try {
  await client.organizations.createOrganizationInvitation({
    organizationId: tenantId,
    inviterUserId: callerId,
    emailAddress: args.email,
    role: args.role,
    redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/accept-invite`,
  });
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("already") || msg.includes("member")) {
    throw new ConvexError("ALREADY_MEMBER");
  }
  throw e;
}

// AFTER — Better Auth adapter
const adapter = authComponent.adapter(ctx);
const members = await adapter.findMany({
  model: "member",
  where: [{ field: "organizationId", value: tenantId }],
});
const plan = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId });
assertAgentLimitNotReached(members.length, plan);
if (args.role === "org:supervisor") assertSupervisorRoleAllowed(plan);

// Check not already a member or pending invite
const existingMember = members.find((m) => m.userId === callerId);
const existingInvites = await adapter.findMany({
  model: "invitation",
  where: [
    { field: "organizationId", value: tenantId },
    { field: "email", value: args.email },
    { field: "status", value: "pending" },
  ],
});
if (existingInvites.length > 0) {
  throw new ConvexError("ALREADY_MEMBER");
}

await adapter.create({
  model: "invitation",
  data: {
    organizationId: tenantId,
    email: args.email,
    role: args.role,
    status: "pending",
    inviterId: callerId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  },
});
// Email sending: Better Auth's organization plugin fires sendInvitationEmail
// hook (configured in convex/auth.ts Stage 2a) which routes to WabDesk's
// React Email system. No explicit email call needed here.
```

**OQ-C3 (critical):** The email invitation hook in Better Auth fires when an invitation is created **via the Better Auth API** (`auth.api.organization.inviteMember`). If the invitation is created directly via adapter, the hook may not fire. Stage 3 must verify whether the `sendInvitationEmail` callback is triggered by direct adapter writes or only by API calls. If adapter writes bypass the hook, the approach changes to using `auth.api.organization.inviteMember` from within the Convex action (requires constructing a synthetic `Request` object with a valid session token as the `Authorization` header). This is the single most uncertain point in Stage 2c.

### 8.2 `list`

```typescript
// BEFORE — two Clerk calls
const memberships = await client.organizations.getOrganizationMembershipList({ organizationId: tenantId, limit: 100 });
const invitations = await client.organizations.getOrganizationInvitationList({ organizationId: tenantId, limit: 100 });

// AFTER — two adapter calls
const adapter = authComponent.adapter(ctx);
const [rawMembers, rawInvitations] = await Promise.all([
  adapter.findMany({ model: "member", where: [{ field: "organizationId", value: tenantId }] }),
  adapter.findMany({
    model: "invitation",
    where: [
      { field: "organizationId", value: tenantId },
      { field: "status", value: "pending" },
    ],
  }),
]);

// Fetch user data for each member (name, email, image)
const memberUsers = await Promise.all(
  rawMembers.map((m) =>
    adapter.findOne({ model: "user", where: [{ field: "id", value: m.userId }] }),
  ),
);
```

The returned shape maps as:
- `userId`: `m.userId`
- `email`: `memberUsers[i]?.email`
- `name`: `memberUsers[i]?.name` (single field — Clerk split this into firstName+lastName)
- `imageUrl`: `memberUsers[i]?.image`
- `role`: `m.role` (already `"org:admin"` etc. — no normalization needed)
- `status`: `"active"`
- `joinedAt`: `m.createdAt` (as number: `new Date(m.createdAt).getTime()`)

For pending invitations:
- `userId`: `inv.id` (used as the revoke target ID)
- `email`: `inv.email`
- `role`: `inv.role`
- `status`: `"pending"`

**Behavioral note:** Clerk's `publicUserData.firstName`/`publicUserData.lastName` split becomes a single `user.name` in Better Auth. The `list` action currently builds `fullName` from those parts. After migration, `user.name` is the only field — split is not available. Any UI that displays separate first/last name will receive a combined `name` string. Frontend components in Stage 5 scope must handle this.

The `metadata` field (`profiles`, `departments`) continues to come from `internal.memberQueries.getAllMemberMetadata` — no change.

### 8.3 `changeRole`

```typescript
// BEFORE
const client = await clerkClient();
if (args.newRole !== "org:admin") {
  const memberships = await client.organizations.getOrganizationMembershipList({ ... });
  await assertNotLastAdmin(memberships, args.targetUserId);
}
await client.organizations.updateOrganizationMembership({
  organizationId: tenantId,
  userId: args.targetUserId,
  role: args.newRole,
});

// AFTER
const adapter = authComponent.adapter(ctx);
if (args.newRole !== "org:admin") {
  const members = await adapter.findMany({
    model: "member",
    where: [{ field: "organizationId", value: tenantId }],
  });
  await assertNotLastAdmin(members, args.targetUserId);
}
const targetMember = await adapter.findOne({
  model: "member",
  where: [
    { field: "userId", value: args.targetUserId },
    { field: "organizationId", value: tenantId },
  ],
});
if (!targetMember) throw new ConvexError("MEMBER_NOT_FOUND");
await adapter.update({
  model: "member",
  where: [{ field: "id", value: targetMember.id }],
  update: { role: args.newRole },
});
```

### 8.4 `inviteByWhatsApp`

Same member-list → adapter pattern as `inviteByEmail`. Invitation creation same OQ-C3 concern for `adapter.create` vs. API call. The WhatsApp send flow is unchanged.

### 8.5 `removeMember`

```typescript
// BEFORE
const memberships = await client.organizations.getOrganizationMembershipList({ ... });
await assertNotLastAdmin(memberships, args.targetUserId);
// ... supervisor target-role check ...
await client.organizations.deleteOrganizationMembership({ organizationId: tenantId, userId: args.targetUserId });
// For pending:
await client.organizations.revokeOrganizationInvitation({ organizationId: tenantId, invitationId: args.targetUserId });

// AFTER
const adapter = authComponent.adapter(ctx);
if (args.status === "pending") {
  await adapter.update({
    model: "invitation",
    where: [{ field: "id", value: args.targetUserId }],
    update: { status: "canceled" },
  });
  return;
}

const members = await adapter.findMany({
  model: "member",
  where: [{ field: "organizationId", value: tenantId }],
});
await assertNotLastAdmin(members, args.targetUserId);

if (role === "org:supervisor") {
  const target = members.find((m) => m.userId === args.targetUserId);
  assertSupervisorCanManageTarget(role, target?.role);
}

const targetMember = members.find((m) => m.userId === args.targetUserId);
if (!targetMember) throw new ConvexError("MEMBER_NOT_FOUND");
await adapter.delete({
  model: "member",
  where: [{ field: "id", value: targetMember.id }],
});
```

---

## §9. `convex/members.ts` BEFORE/AFTER

### 9.1 `getMemberProfile`

```typescript
// BEFORE
const client = await clerkClient();
const memberships = await client.organizations.getOrganizationMembershipList({ ... });
const member = memberships.data.find((m) => m.publicUserData?.userId === args.memberId);
if (!member) return null;
// ... reads firstName, lastName, identifier, imageUrl from publicUserData

// AFTER
const adapter = authComponent.adapter(ctx);
const targetMember = await adapter.findOne({
  model: "member",
  where: [
    { field: "userId", value: args.memberId },
    { field: "organizationId", value: tenantId },
  ],
});
if (!targetMember) return null;
const user = await adapter.findOne({
  model: "user",
  where: [{ field: "id", value: args.memberId }],
});
if (!user) return null;
// Returns: name: user.name, email: user.email, imageUrl: user.image,
//          role: targetMember.role, joinedAt: new Date(targetMember.createdAt).getTime()
```

**Behavioral note:** `firstName` and `lastName` are separate return fields today. In Better Auth, `user.name` is a single string. The returned object currently has `{ firstName, lastName, name }`. After migration, `firstName` and `lastName` cannot be extracted from `user.name` reliably. Stage 3 options:
- Return `firstName: null, lastName: null, name: user.name` (single string in name, nulls for split fields)
- Drop `firstName`/`lastName` from the return type entirely

**OQ-C4:** Does any UI caller destructure `firstName` or `lastName` separately from `getMemberProfile`? If yes, UI needs updating in Stage 5. If no, dropping them from the return type is safe. Stage 3 must grep callers before deciding.

### 9.2 `updateMemberRole`

```typescript
// BEFORE
await client.organizations.updateOrganizationMembership({ ... });

// AFTER — same adapter update pattern as §8.3
const targetMember = await adapter.findOne({ model: "member", where: [...] });
await adapter.update({ model: "member", where: [{ field: "id", value: targetMember.id }], update: { role: args.newRole } });
```

### 9.3 `removeMemberFromOrganization`

```typescript
// BEFORE
const client = await clerkClient();
await client.organizations.deleteOrganizationMembership({ organizationId: tenantId, userId: args.memberId });

// AFTER
const adapter = authComponent.adapter(ctx);
const targetMember = await adapter.findOne({
  model: "member",
  where: [{ field: "userId", value: args.memberId }, { field: "organizationId", value: tenantId }],
});
if (!targetMember) throw new ConvexError("MEMBER_NOT_FOUND");
await adapter.delete({ model: "member", where: [{ field: "id", value: targetMember.id }] });
```

### 9.4 `updateMemberChannels` and `updateMemberDepartments`

Both functions call `getOrganizationMembershipList` only to verify the member exists and to read their role. After migration:

```typescript
// BEFORE
const client = await clerkClient();
const memberships = await client.organizations.getOrganizationMembershipList({ ... });
const member = memberships.data.find((m) => m.publicUserData?.userId === args.memberId);
if (!member) throw new ConvexError("MEMBER_NOT_FOUND");
const memberRole = (member.role === "admin" ? "org:admin" : member.role) as OrgRole;
const nonAdminRole = memberRole === "org:admin" ? "org:supervisor" : memberRole;

// AFTER
const adapter = authComponent.adapter(ctx);
const targetMember = await adapter.findOne({
  model: "member",
  where: [{ field: "userId", value: args.memberId }, { field: "organizationId", value: tenantId }],
});
if (!targetMember) throw new ConvexError("MEMBER_NOT_FOUND");
const memberRole = targetMember.role as OrgRole;
const nonAdminRole = memberRole === "org:admin" ? "org:supervisor" : (memberRole as "org:supervisor" | "org:agent");
// ... rest of channel/dept mutation unchanged
```

The Clerk `role === "admin"` normalization (→ `"org:admin"`) is removed; Better Auth already emits the full colon form.

Additionally, `userName` passed to `addMemberToChannels`/`addMemberToDepartments` needs the user's name. Currently read from `member.publicUserData?.firstName || identifier`. After migration:

```typescript
const user = await adapter.findOne({ model: "user", where: [{ field: "id", value: args.memberId }] });
const userName = (user?.name as string | null) ?? args.memberId;
const userEmail = (user?.email as string) ?? "";
const userImageUrl = (user?.image as string | null) ?? undefined;
```

### 9.5 `updateMemberDisplayName`

```typescript
// BEFORE
const client = await clerkClient();
await client.users.updateUser(args.memberId, {
  firstName: args.firstName,
  ...(args.lastName !== undefined && { lastName: args.lastName }),
});

// AFTER
const adapter = authComponent.adapter(ctx);
const fullName = [args.firstName, args.lastName].filter(Boolean).join(" ");
await adapter.update({
  model: "user",
  where: [{ field: "id", value: args.memberId }],
  update: { name: fullName },
});
```

**Behavioral note:** Better Auth stores a single `name` field. This action's signature (`firstName`, optional `lastName`) is preserved but they are concatenated before storage. Split-name recovery is not possible post-migration — this is intentional and not reversible.

### 9.6 `updateMemberAvatarFromStorage`

```typescript
// BEFORE
const storageUrl = await ctx.runMutation(internal.profiles.getStorageUrlInternal, { storageId });
if (!storageUrl) throw new ConvexError("STORAGE_URL_FAILED");
const res = await fetch(storageUrl);
const blob = await res.blob();
const client = await clerkClient();
await client.users.updateUserProfileImage(args.memberId, { file: blob });

// AFTER — no Clerk upload; just set the URL
const storageUrl = await ctx.runMutation(internal.profiles.getStorageUrlInternal, { storageId });
if (!storageUrl) throw new ConvexError("STORAGE_URL_FAILED");
const adapter = authComponent.adapter(ctx);
await adapter.update({
  model: "user",
  where: [{ field: "id", value: args.memberId }],
  update: { image: storageUrl },
});
// fetch(storageUrl) and blob creation are deleted — not needed
```

**Behavioral change:** Clerk stored the image on Clerk's CDN after receiving the binary blob. Better Auth stores only a URL. The Convex Storage URL is stored directly. This means the user's avatar URL will be a Convex Storage URL (`storage.convex.cloud/...`) instead of a Clerk CDN URL. This changes the domain but not the functionality — the image is still served.

### 9.7 `updateMemberAvatarFromUrl`

```typescript
// BEFORE
const res = await fetch(args.url);
const blob = await res.blob();
const client = await clerkClient();
await client.users.updateUserProfileImage(args.memberId, { file: blob });

// AFTER — set URL directly; no fetching needed
const adapter = authComponent.adapter(ctx);
await adapter.update({
  model: "user",
  where: [{ field: "id", value: args.memberId }],
  update: { image: args.url },
});
// fetch + blob creation deleted
```

**Behavioral change:** BEFORE downloaded the image from `args.url` and re-uploaded to Clerk. AFTER stores `args.url` directly. This means:
- No re-upload cost
- If the source URL is ephemeral (expires), the stored image breaks
- If the source URL is a permanent CDN link, behavior is equivalent

### 9.8 `removeMemberAvatar`

```typescript
// BEFORE
const client = await clerkClient();
await client.users.deleteUserProfileImage(args.memberId);

// AFTER
const adapter = authComponent.adapter(ctx);
await adapter.update({
  model: "user",
  where: [{ field: "id", value: args.memberId }],
  update: { image: null },
});
```

### 9.9 `disableAccount` and `enableAccount`

Both use `getOrganizationMembershipList` only to verify the member exists. After migration:

```typescript
// BEFORE
const client = await clerkClient();
const memberships = await client.organizations.getOrganizationMembershipList({ ... });
const member = memberships.data.find((m) => m.publicUserData?.userId === args.memberId);
if (!member) throw new ConvexError("MEMBER_NOT_FOUND");

// AFTER
const adapter = authComponent.adapter(ctx);
const targetMember = await adapter.findOne({
  model: "member",
  where: [{ field: "userId", value: args.memberId }, { field: "organizationId", value: tenantId }],
});
if (!targetMember) throw new ConvexError("MEMBER_NOT_FOUND");
```

**Note on `disableAccount`/`enableAccount`:** Clerk had a native ban/unban API that WABDesk did not use (these actions do not call `banUser` — they only verify existence and log). Better Auth's admin plugin also has `banUser`/`unbanUser`, but since WabDesk currently only logs the action without actually banning the user in Clerk either, no behavioral change is needed here. The functions remain existence-check + log.

---

## §10. `convex/teamPresence.ts` BEFORE/AFTER

### `listWithDepartments`

```typescript
// BEFORE
const client = await clerkClient();
const memberships = await client.organizations.getOrganizationMembershipList({ organizationId: tenantId, limit: 100 });
const clerkMembers = new Map(
  memberships.data
    .filter((m) => m.publicUserData?.userId)
    .map((m) => {
      const userId = m.publicUserData!.userId!;
      return [userId, {
        userId,
        email: m.publicUserData?.identifier ?? "",
        name: [m.publicUserData?.firstName, m.publicUserData?.lastName].filter(Boolean).join(" ") || null,
        imageUrl: m.publicUserData?.imageUrl ?? null,
        clerkRole: m.role,
      }];
    })
);

// AFTER
const adapter = authComponent.adapter(ctx);
const rawMembers = await adapter.findMany({
  model: "member",
  where: [{ field: "organizationId", value: tenantId }],
});
const users = await Promise.all(
  rawMembers.map((m) =>
    adapter.findOne({ model: "user", where: [{ field: "id", value: m.userId }] }),
  ),
);
const memberMap = new Map(
  rawMembers.map((m, i) => [
    m.userId,
    {
      userId: m.userId,
      email: (users[i]?.email as string) ?? "",
      name: (users[i]?.name as string | null) ?? null,
      imageUrl: (users[i]?.image as string | null) ?? null,
      role: m.role as string,
    },
  ]),
);
```

The `ClerkMemberInfo` interface rename: `clerkRole` → `role` (no normalization needed since Better Auth emits `"org:admin"` directly). Update the interface and all references in the same file.

The `role` normalization line `clerkInfo.clerkRole === "admin" ? "org:admin" : clerkInfo.clerkRole` is replaced by `info.role` (already correct format).

---

## §11. `convex/actions/validateInvite.ts` BEFORE/AFTER

```typescript
// BEFORE
const client = await clerkClient();
const memberships = await client.organizations.getOrganizationMembershipList({ organizationId: tenantId, limit: 100 });
const plan = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId });
assertAgentLimitNotReached(memberships, plan);

try {
  await client.organizations.createOrganizationMembership({ organizationId: tenantId, userId, role: link.defaultRole });
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("already") || msg.includes("member")) {
    const org = await client.organizations.getOrganization({ organizationId: tenantId });
    return { orgId: tenantId, orgName: org.name ?? "Organization" };
  }
  throw e;
}
const org = await client.organizations.getOrganization({ organizationId: tenantId });
const orgName = org.name ?? "Organization";

// AFTER
const adapter = authComponent.adapter(ctx);
const members = await adapter.findMany({
  model: "member",
  where: [{ field: "organizationId", value: tenantId }],
});
const plan = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId });
assertAgentLimitNotReached(members.length, plan);

// Check if already a member
const alreadyMember = members.find((m) => m.userId === userId);
const org = await adapter.findOne({ model: "organization", where: [{ field: "id", value: tenantId }] });
const orgName = (org?.name as string | null) ?? "Organization";
if (alreadyMember) {
  return { orgId: tenantId, orgName };
}

await adapter.create({
  model: "member",
  data: {
    userId,
    organizationId: tenantId,
    role: link.defaultRole as string,
    createdAt: new Date(),
  },
});
```

**Behavioral note:** The BEFORE catches an "already member" error from Clerk and returns success. The AFTER checks membership before inserting and returns early. Same user-facing result; no try/catch needed since adapter `create` does not throw on duplicate (verify in Stage 3 — **OQ-C5**).

---

## §12. `convex/actions/roundRobin.ts` BEFORE/AFTER

Only the fallback branch (when `agentIds.length === 0`) changes. The primary path (department members) is unchanged.

```typescript
// BEFORE — fallback
const client = await clerkClient();
const memberships = await client.organizations.getOrganizationMembershipList({
  organizationId: args.tenantId, limit: 100,
});
const activeMembers = memberships.data
  .filter((m) => m.role !== undefined)
  .sort((a, b) => (a.publicUserData?.userId ?? "").localeCompare(b.publicUserData?.userId ?? ""));
if (activeMembers.length === 0) return;
const idx = (department.roundRobinIndex ?? 0) % activeMembers.length;
const agentMember = activeMembers[idx];
const assignedAgentId = agentMember.publicUserData?.userId;
const agentName = agentMember.publicUserData?.firstName ?? agentMember.publicUserData?.identifier ?? assignedAgentId ?? undefined;

// AFTER — fallback
const adapter = authComponent.adapter(ctx);
const allMembers = await adapter.findMany({
  model: "member",
  where: [{ field: "organizationId", value: args.tenantId }],
});
const sortedMembers = allMembers.sort((a, b) => a.userId.localeCompare(b.userId));
if (sortedMembers.length === 0) return;
const idx = (department.roundRobinIndex ?? 0) % sortedMembers.length;
const agentMember = sortedMembers[idx];
const assignedAgentId = agentMember.userId as string;
// Fetch user name
const user = await adapter.findOne({ model: "user", where: [{ field: "id", value: assignedAgentId }] });
const agentName = (user?.name as string | null) ?? assignedAgentId;
```

---

## §13. Import Changes Per File

Every file that imports `clerkClient` drops that import and gains `authComponent`:

```typescript
// BEFORE (in each file)
import { clerkClient } from "@clerk/nextjs/server";

// AFTER
import { authComponent } from "../auth"; // or "../../auth" depending on path
```

The `authComponent` is the export from Stage 2a's `convex/auth.ts`. The import path is `"../auth"` from most files in `convex/` and `"../../auth"` from `convex/actions/` and `convex/lib/`.

---

## §14. Open Questions

**OQ-C1 — Adapter model names.** Exact model names are confirmed only after `npx auth generate` (Stage 3 setup step). The names used above (`"member"`, `"user"`, `"organization"`, `"invitation"`) match Better Auth's organization plugin schema in all published docs, but the generated table names may differ. Stage 3 verifies from `convex/betterAuth/schema.ts` before applying diffs.

**OQ-C2 — Batch user lookup.** Whether `adapter.findMany` supports `operator: "in"` for `id` is unconfirmed. If unsupported, use `Promise.all` with individual `findOne` calls (already shown in AFTER diffs above as the primary approach).

**OQ-C3 (critical) — Invitation email hook.** The `sendInvitationEmail` callback in the org plugin fires when Better Auth creates an invitation internally. Direct `adapter.create({ model: "invitation", ... })` may bypass this hook. Stage 3 must test: create an invitation via adapter, check whether `sendInvitationEmail` fires. If it does not fire, `inviteByEmail` must be rewritten to call `auth.api.organization.inviteMember` instead, which requires constructing a `Request` with a valid `Authorization: Bearer <token>` header for the calling user. This path is more complex but achievable since Convex actions run Node.js and can call the Better Auth server's HTTP endpoints.

**OQ-C4 — firstName/lastName split in UI.** `getMemberProfile` currently returns `firstName` and `lastName` as separate fields. After migration they collapse to `name`. Stage 3 must grep callers of this action in frontend components to determine if the split fields are used separately (would require UI Stage 5 changes) or only as `fullName` (no UI change needed).

**OQ-C5 — Adapter `create` on duplicate.** Whether `adapter.create` throws on a duplicate member (same userId + organizationId) is unconfirmed. If it throws, `validateAndJoin` must catch and handle. If it is idempotent, the explicit check-before-insert in §11 AFTER is redundant but harmless.

**OQ-C6 — `authComponent` accessible in Convex actions.** `authComponent.adapter(ctx)` requires `ctx` to be a Convex server context (`GenericActionCtx` or similar). Actions run Node.js and have full `ctx` access — this should work. Confirm during Stage 3 setup that `adapter` calls succeed from `"use node"` actions.

---

## §15. Behavioral Changes Summary

| Change | BEFORE | AFTER | User-visible? |
|---|---|---|---|
| Member name storage | `firstName + lastName` (two fields) | Single `name` string | Existing member names preserved if seeded correctly on migration |
| Avatar upload | Binary blob → Clerk CDN | Convex Storage URL stored directly | Avatar URL domain changes |
| Avatar from URL | Downloads + re-uploads to Clerk | Stores source URL directly | Source URL must be stable |
| `disableAccount` | Logs only (Clerk ban not called) | Logs only (no change) | None |
| Invitation email | Clerk sends invite email | Better Auth hook sends via WabDesk email system | Email template changes (Clerk template → WabDesk React Email) |
| Role normalization | `"admin"` → `"org:admin"` done everywhere | Not needed — Better Auth emits full form | None |
| Agent limit check | `memberships.data.length` | `members.length` | Same count, different source |

---

## §16. Out of Scope (Stage 2c)

| File | Owner stage | Reason |
|---|---|---|
| `convex/auth.ts` | Stage 2a | Foundation |
| `convex/lib/auth.ts` | Stage 2b | Already planned |
| `middleware.ts` | Stage 2b | Already planned |
| All frontend hooks/providers | Stage 2d | Frontend scope |
| `app/accept-invite/` or `app/join/[token]/` pages | Stage 2d | Frontend scope |
| `convex/lib/tenants.ts` | Deferred indefinitely (Stage 2b §4) | Refactor abandoned |
| `convex/memberQueries.ts` | Not a Clerk dependency | Convex-native — no change needed |
| `convex/lib/notificationEvents.ts` | Not a Clerk dependency | No change needed |
| `convex/actions/channelRetentionAction.ts` lines beyond `getAdminEmails` call | Only the helper call changes (§7) | Rest of file unchanged |
