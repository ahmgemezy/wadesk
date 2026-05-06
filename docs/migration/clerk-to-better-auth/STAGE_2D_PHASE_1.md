# Stage 2d Phase 1 — Auth Hooks Shim + Hook Call Site Updates

> Planning only — no installs, no source-file modifications.
> Produced: 2026-05-06
> Locked decisions: D3 (shim approach), D4 (custom auth page rebuild — Phase 2), D5 (minimal org components — Phase 2)

---

## §1. Discovery

### §1.1 Stage 0 §3.1 reconciliation

#### Verbatim grep output — `from "@clerk/nextjs"` imports

```
app/select-org/page.tsx:3:import { OrganizationList } from "@clerk/nextjs";
app/join/[token]/page.tsx:7:import { SignIn } from "@clerk/nextjs";
app/join/[token]/page.tsx:8:import { useAuth } from "@clerk/nextjs";
app/(auth)/sign-up/[[...sign-up]]/page.tsx:1:import { SignUp } from "@clerk/nextjs";
app/(auth)/sign-in/[[...sign-in]]/page.tsx:1:import { SignIn } from "@clerk/nextjs";
app/(dashboard)/settings/channels/page.tsx:5:import { useAuth } from "@clerk/nextjs";
app/(dashboard)/inbox/page.tsx:23:import { useOrganization } from "@clerk/nextjs";
app/(dashboard)/automations/page.tsx:4:import { useAuth } from "@clerk/nextjs";
components/ui/presence-indicator.tsx:4:import { useOrganization } from "@clerk/nextjs";
components/ui/team-presence-dropdown.tsx:5:import { useOrganization } from "@clerk/nextjs";
components/settings/notifications-settings.tsx:5:import { useOrganization } from "@clerk/nextjs";
components/settings/csat-settings.tsx:13:import { useOrganization } from "@clerk/nextjs";
components/settings/labels-settings.tsx:13:import { useOrganization } from "@clerk/nextjs";
components/settings/team-member-list.tsx:5:import { useOrganization, useUser } from "@clerk/nextjs";
components/settings/invite-links.tsx:5:import { useOrganization } from "@clerk/nextjs";
components/settings/department-members.tsx:5:import { useOrganization, useUser } from "@clerk/nextjs";
components/settings/invite-modal.tsx:5:import { useOrganization, useAuth } from "@clerk/nextjs";
components/inbox/conversation-list-item.tsx:9:import { useOrganization, useUser } from "@clerk/nextjs";
components/inbox/conversation-list.tsx:5:import { useAuth, useOrganization } from "@clerk/nextjs";
components/inbox/status-selector.tsx:4:import { useUser } from "@clerk/nextjs";
components/inbox/transfer-picker.tsx:4:import { useOrganization, useUser } from "@clerk/nextjs";
components/shell/convex-auth-guard.tsx:6:import { useAuth } from "@clerk/nextjs";
components/shell/app-sidebar.tsx:7:import { useAuth } from "@clerk/nextjs";
components/shell/user-menu.tsx:4:import { SignOutButton, OrganizationSwitcher, useAuth, useUser } from "@clerk/nextjs";
components/shell/my-profile-modal.tsx:4:import { useUser } from "@clerk/nextjs";
components/contacts/follow-up-modal.tsx:5:import { useOrganization } from "@clerk/nextjs";
components/contacts/contact-list.tsx:8:import { useOrganization, useAuth } from "@clerk/nextjs";
components/contacts/contact-detail-sheet.tsx:8:import { useOrganization } from "@clerk/nextjs";
components/clerk-provider-with-locale.tsx:3:import { ClerkProvider } from "@clerk/nextjs";
components/convex-client-provider.tsx:5:import { useAuth } from "@clerk/nextjs";
components/team/member-profile/manage-tab.tsx:4:import { useAuth } from "@clerk/nextjs";
components/automations/AutomationRulesClient.tsx:5:import { useOrganization } from "@clerk/nextjs";
components/onboarding/step-workspace-name.tsx:4:import { CreateOrganization } from "@clerk/nextjs";
components/onboarding/step-workspace-name.tsx:5:import { useAuth } from "@clerk/nextjs";
components/onboarding/onboarding-wizard.tsx:5:import { useAuth } from "@clerk/nextjs";
```

Total: 35 import lines across 33 files.

#### Reconciliation against Stage 0 §3.1

Stage 0 §3.1 listed 27 files using Clerk hooks. Current source has **33 files** total with `@clerk/nextjs` imports.

**New files since Stage 0 §3.1 (6 files):**

| File | Import | Hook/Component | In Phase 1 scope? |
|---|---|---|---|
| `components/ui/presence-indicator.tsx` | `useOrganization` | Hook | **Yes** — import-line change |
| `components/ui/team-presence-dropdown.tsx` | `useOrganization` | Hook | **Yes** — import-line change |
| `components/settings/department-members.tsx` | `useOrganization`, `useUser` | Hook | **Yes** — import-line change |
| `components/automations/AutomationRulesClient.tsx` | `useOrganization` | Hook | **Yes** — import-line change |
| `components/settings/invite-links.tsx` | `useOrganization` | Hook | **Yes** — import-line change |
| `components/team/member-profile/manage-tab.tsx` | `useAuth` | Hook | **Yes** — import-line change |

**All 6 new files use hooks only (no JSX components).** They are fully in Phase 1 scope.

**Files in Stage 0 §3.1 confirmed still present:** All 27 files from Stage 0 §3.1 still exist with Clerk imports.

**Files with Clerk imports that use ONLY non-hook components (Phase 2 scope):**

| File | Import | Phase |
|---|---|---|
| `app/(auth)/sign-in/[[...sign-in]]/page.tsx` | `SignIn` | Phase 2 |
| `app/(auth)/sign-up/[[...sign-up]]/page.tsx` | `SignUp` | Phase 2 |
| `app/select-org/page.tsx` | `OrganizationList` | Phase 2 |
| `components/clerk-provider-with-locale.tsx` | `ClerkProvider` | Phase 3 |
| `components/onboarding/step-workspace-name.tsx` | `CreateOrganization` | Phase 2 |

**Files with mixed hook + JSX component imports (Phase 1 hooks, Phase 2 JSX):**

| File | Hook import | JSX component import | Phase 1 scope |
|---|---|---|---|
| `app/join/[token]/page.tsx` | `useAuth` | `SignIn` | Yes (hook only) |
| `components/shell/user-menu.tsx` | `useAuth`, `useUser` | `SignOutButton`, `OrganizationSwitcher` | Yes (hooks only) |
| `components/onboarding/step-workspace-name.tsx` | `useAuth` | `CreateOrganization` | Yes (hook only) |

**File using `useAuth` as a prop (Phase 3 scope):**

| File | Usage | Phase |
|---|---|---|
| `components/convex-client-provider.tsx` | `useAuth` passed as prop to `ConvexProviderWithClerk` | Phase 3 |

### §1.2 Per-file import line audit

Only files that import Clerk **hooks** are listed. Files importing only JSX components (`SignIn`, `SignUp`, `OrganizationList`, `ClerkProvider`, `CreateOrganization`) are Phase 2/3 and excluded.

#### Phase 1 scope — hook-using files (26 files)

| # | File path | Line(s) | Hook(s) imported | Import statement (verbatim) | Hook fields read |
|---|---|---|---|---|---|
| 1 | `app/(dashboard)/automations/page.tsx` | 4 | `useAuth` | `import { useAuth } from "@clerk/nextjs";` | `orgRole`, `isLoaded` |
| 2 | `app/(dashboard)/inbox/page.tsx` | 23 | `useOrganization` | `import { useOrganization } from "@clerk/nextjs";` | `membership.role` |
| 3 | `app/(dashboard)/settings/channels/page.tsx` | 5 | `useAuth` | `import { useAuth } from "@clerk/nextjs";` | `isLoaded`, `orgId`, `orgRole` |
| 4 | `app/join/[token]/page.tsx` | 8 | `useAuth` | `import { useAuth } from "@clerk/nextjs";` | `isLoaded`, `isSignedIn`, `orgId` |
| 5 | `components/automations/AutomationRulesClient.tsx` | 5 | `useOrganization` | `import { useOrganization } from "@clerk/nextjs";` | `organization.name` |
| 6 | `components/contacts/contact-detail-sheet.tsx` | 8 | `useOrganization` | `import { useOrganization } from "@clerk/nextjs";` | `membership.role`, `memberships.data[].publicUserData.userId`, `memberships.data[].publicUserData.firstName`, `memberships.data[].role` |
| 7 | `components/contacts/contact-list.tsx` | 8 | `useOrganization`, `useAuth` | `import { useOrganization, useAuth } from "@clerk/nextjs";` | `isLoaded`, `orgId`, `membership.role` |
| 8 | `components/contacts/follow-up-modal.tsx` | 5 | `useOrganization` | `import { useOrganization } from "@clerk/nextjs";` | `memberships.data[].publicUserData.userId`, `memberships.data[].publicUserData.firstName`, `memberships.data[].publicUserData.lastName` |
| 9 | `components/inbox/conversation-list.tsx` | 5 | `useAuth`, `useOrganization` | `import { useAuth, useOrganization } from "@clerk/nextjs";` | `userId`, `memberships.data[].publicUserData.userId`, `memberships.data[].publicUserData.firstName`, `memberships.data[].publicUserData.lastName`, `memberships.data[].publicUserData.identifier` |
| 10 | `components/inbox/conversation-list-item.tsx` | 9 | `useOrganization`, `useUser` | `import { useOrganization, useUser } from "@clerk/nextjs";` | `membership.role`, `user.id` |
| 11 | `components/inbox/status-selector.tsx` | 4 | `useUser` | `import { useUser } from "@clerk/nextjs";` | `user.fullName`, `user.firstName`, `user.lastName`, `user.primaryEmailAddress.emailAddress` |
| 12 | `components/inbox/transfer-picker.tsx` | 4 | `useOrganization`, `useUser` | `import { useOrganization, useUser } from "@clerk/nextjs";` | `memberships.data[].publicUserData.userId`, `memberships.data[].publicUserData.firstName`, `memberships.data[].publicUserData.lastName`, `memberships.data[].publicUserData.identifier`, `user.firstName`, `user.emailAddresses[0].emailAddress`, `user.id` |
| 13 | `components/onboarding/onboarding-wizard.tsx` | 5 | `useAuth` | `import { useAuth } from "@clerk/nextjs";` | `isLoaded`, `orgId` |
| 14 | `components/onboarding/step-workspace-name.tsx` | 5 | `useAuth` | `import { useAuth } from "@clerk/nextjs";` | `orgId` |
| 15 | `components/settings/csat-settings.tsx` | 13 | `useOrganization` | `import { useOrganization } from "@clerk/nextjs";` | `membership.role` |
| 16 | `components/settings/department-members.tsx` | 5 | `useOrganization`, `useUser` | `import { useOrganization, useUser } from "@clerk/nextjs";` | `membership.role`, `user.id` |
| 17 | `components/settings/invite-links.tsx` | 5 | `useOrganization` | `import { useOrganization } from "@clerk/nextjs";` | `membership.role`, `memberships.data[].publicUserData.userId`, `memberships.data[].publicUserData.firstName`, `memberships.data[].publicUserData.lastName`, `memberships.data[].publicUserData.identifier` |
| 18 | `components/settings/invite-modal.tsx` | 5 | `useOrganization`, `useAuth` | `import { useOrganization, useAuth } from "@clerk/nextjs";` | `organization` (truthiness), `membership.role`, `isLoaded` |
| 19 | `components/settings/labels-settings.tsx` | 13 | `useOrganization` | `import { useOrganization } from "@clerk/nextjs";` | `membership.role` |
| 20 | `components/settings/notifications-settings.tsx` | 5 | `useOrganization` | `import { useOrganization } from "@clerk/nextjs";` | `membership.role` |
| 21 | `components/settings/team-member-list.tsx` | 5 | `useOrganization`, `useUser` | `import { useOrganization, useUser } from "@clerk/nextjs";` | `organization` (truthiness), `membership.role`, `user.id` |
| 22 | `components/shell/app-sidebar.tsx` | 7 | `useAuth` | `import { useAuth } from "@clerk/nextjs";` | `isLoaded`, `orgId` |
| 23 | `components/shell/convex-auth-guard.tsx` | 6 | `useAuth` | `import { useAuth } from "@clerk/nextjs";` | `isLoaded`, `orgId` |
| 24 | `components/shell/my-profile-modal.tsx` | 4 | `useUser` | `import { useUser } from "@clerk/nextjs";` | `user.firstName`, `user.lastName`, `user.fullName`, `user.imageUrl` |
| 25 | `components/shell/user-menu.tsx` | 4 | `useAuth`, `useUser` | `import { SignOutButton, OrganizationSwitcher, useAuth, useUser } from "@clerk/nextjs";` | `isSignedIn`, `userId`, `user.fullName`, `user.firstName`, `user.imageUrl` |
| 26 | `components/ui/presence-indicator.tsx` | 4 | `useOrganization` | `import { useOrganization } from "@clerk/nextjs";` | `organization.id` |
| 27 | `components/ui/team-presence-dropdown.tsx` | 5 | `useOrganization` | `import { useOrganization } from "@clerk/nextjs";` | `organization.id` |
| 28 | `components/team/member-profile/manage-tab.tsx` | 4 | `useAuth` | `import { useAuth } from "@clerk/nextjs";` | `userId` |

### §1.3 Field-usage matrix (the shim API contract)

#### `useAuth()` fields used

| Field | # files | Example files |
|---|---|---|
| `isLoaded` | 7 | `components/shell/app-sidebar.tsx:85`, `components/shell/convex-auth-guard.tsx:22`, `app/(dashboard)/automations/page.tsx:9`, `app/(dashboard)/settings/channels/page.tsx:28`, `app/join/[token]/page.tsx:15`, `components/onboarding/onboarding-wizard.tsx:33`, `components/settings/invite-modal.tsx:29` |
| `isSignedIn` | 2 | `app/join/[token]/page.tsx:15`, `components/shell/user-menu.tsx:18` |
| `userId` | 3 | `components/inbox/conversation-list.tsx:76`, `components/shell/user-menu.tsx:18`, `components/team/member-profile/manage-tab.tsx:62` |
| `orgId` | 6 | `components/shell/app-sidebar.tsx:85`, `components/shell/convex-auth-guard.tsx:22`, `app/(dashboard)/settings/channels/page.tsx:28`, `app/join/[token]/page.tsx:15`, `components/onboarding/onboarding-wizard.tsx:33`, `components/onboarding/step-workspace-name.tsx:10` |
| `orgRole` | 2 | `app/(dashboard)/automations/page.tsx:9`, `app/(dashboard)/settings/channels/page.tsx:28` |

#### `useUser()` fields used

| Field | # files | Example files |
|---|---|---|
| `user.id` | 5 | `components/inbox/conversation-list-item.tsx:153`, `components/inbox/transfer-picker.tsx:183`, `components/settings/team-member-list.tsx:74`, `components/settings/department-members.tsx:48`, `components/shell/user-menu.tsx:18` |
| `user.firstName` | 4 | `components/shell/my-profile-modal.tsx:54`, `components/inbox/status-selector.tsx:28`, `components/inbox/transfer-picker.tsx:176`, `components/shell/user-menu.tsx:24` |
| `user.lastName` | 2 | `components/shell/my-profile-modal.tsx:55`, `components/inbox/status-selector.tsx:28` |
| `user.fullName` | 3 | `components/shell/my-profile-modal.tsx:72`, `components/inbox/status-selector.tsx:27`, `components/shell/user-menu.tsx:24` |
| `user.imageUrl` | 2 | `components/shell/my-profile-modal.tsx:71`, `components/shell/user-menu.tsx:25` |
| `user.primaryEmailAddress.emailAddress` | 1 | `components/inbox/status-selector.tsx:31` |
| `user.emailAddresses[0].emailAddress` | 1 | `components/inbox/transfer-picker.tsx:176` |

**Note on `user.emailAddresses`:** Only `user.emailAddresses?.[0]?.emailAddress` is used (1 file: `transfer-picker.tsx:176`). The shim provides `user.emailAddresses` as `[{ emailAddress: data.user.email }]` — a single-element array containing the user's email.

#### `useOrganization()` fields used

| Field | # files | Example files |
|---|---|---|
| `organization` (truthiness) | 2 | `components/settings/team-member-list.tsx:96`, `components/settings/invite-modal.tsx:47` |
| `organization.id` | 3 | `components/ui/presence-indicator.tsx:14`, `components/ui/team-presence-dropdown.tsx:39` |
| `organization.name` | 1 | `components/automations/AutomationRulesClient.tsx:54` |
| `membership.role` | 11 | `app/(dashboard)/inbox/page.tsx:57`, `components/inbox/conversation-list-item.tsx:80`, `components/contacts/contact-list.tsx:107`, `components/contacts/contact-detail-sheet.tsx:175`, `components/settings/team-member-list.tsx:71`, `components/settings/csat-settings.tsx:70`, `components/settings/department-members.tsx:44`, `components/settings/invite-links.tsx:425`, `components/settings/invite-modal.tsx:28`, `components/settings/labels-settings.tsx:31`, `components/settings/notifications-settings.tsx:27` |
| `memberships.data` | 5 | `components/inbox/conversation-list.tsx:77`, `components/inbox/transfer-picker.tsx:35`, `components/contacts/follow-up-modal.tsx:39`, `components/contacts/contact-detail-sheet.tsx:175`, `components/settings/invite-links.tsx:425` |
| `memberships.data[].publicUserData.userId` | 5 | Same 5 files as `memberships.data` |
| `memberships.data[].publicUserData.firstName` | 5 | Same 5 files |
| `memberships.data[].publicUserData.lastName` | 4 | `components/inbox/conversation-list.tsx:89`, `components/inbox/transfer-picker.tsx:185`, `components/contacts/follow-up-modal.tsx:194`, `components/settings/invite-links.tsx:435` |
| `memberships.data[].publicUserData.identifier` | 3 | `components/inbox/conversation-list.tsx:92`, `components/inbox/transfer-picker.tsx:188`, `components/settings/invite-links.tsx:435` |
| `memberships.data[].role` | 1 | `components/contacts/contact-detail-sheet.tsx:414` |

### §1.4 Discrepancies + new findings

**`useClerk()`:** NOT found in any file. Confirmed via grep:
```
grep -rn "useClerk" app components lib --include="*.ts" --include="*.tsx"
(empty)
```
No files use `useClerk()`. No Phase 1.5 follow-up needed.

**`auth.has()` / permission checks:** NOT found in any file. Confirmed via grep. No Phase 1.5 follow-up needed.

**`<SignedIn>` / `<SignedOut>` / `<Protect>`:** NOT found. Stage 0 §V3 confirmed. Verified again in current source. No Phase 1.5 follow-up needed.

**`user.emailAddresses` (array):** Used in 1 file (`transfer-picker.tsx:176`) as `user?.emailAddresses?.[0]?.emailAddress`. The shim exposes `user.emailAddresses` as a single-element array `[{ emailAddress }]`. This is a Clerk concept; the shim maps it from Better Auth's `user.email`. Flagged as a minor mapping risk — if `user.email` is `null`, `emailAddresses` will be `[]` rather than `undefined`, which matches how Clerk handles unverified-email users.

**`organization.slug`:** NOT read by any file. Confirmed. The shim does NOT expose `organization.slug`.

**`memberships` call-site arguments:** Three different argument patterns exist:
1. `useOrganization({ memberships: true })` — 2 files (`conversation-list.tsx:77`, `transfer-picker.tsx:35`)
2. `useOrganization({ memberships: { infinite: true } })` — 2 files (`follow-up-modal.tsx:39`, `contact-detail-sheet.tsx:175`)
3. `useOrganization({ memberships: { pageSize: 500, keepPreviousData: true } })` — 1 file (`invite-links.tsx:425`)

In Clerk, these arguments control pagination/refresh behavior. The shim ignores these arguments entirely — `memberships` always fetches all org members via the Convex query. This is acceptable because: (a) org sizes are small (plan limits cap members), (b) the shim always fetches all members regardless of pagination arguments. No call site reads `memberships.totalCount` or pagination metadata.

### §1.5 Total Phase 1 scope file count

**Phase 1 scope = 29 files modified (1 new shim + 28 import-line updates).**

Breakdown:
- 1 new file: `lib/auth-hooks.ts`
- 28 files with import-line changes (the 28 hook-using files from §1.2)

Excluded from Phase 1:
- 5 files using only Clerk JSX components (Phase 2): `sign-in`, `sign-up`, `select-org`, `step-workspace-name` (`CreateOrganization` only), `clerk-provider-with-locale`
- 1 file deferred to Phase 3: `components/convex-client-provider.tsx`

---

## §2. The shim

### §2.1 Required reading citations

1. Stage 2A §5.4 (`lib/auth-client.ts`) — `authClient` export with `convexClient()` + `organizationClient()` plugins. The shim imports `authClient` from this file.
2. Stage 2A §5.1 (`convex/auth.ts`) — `definePayload` JWT shape: flat `orgId`, `orgRole` (from `session.activeOrganizationId`, `session.activeOrganizationRole`).
3. Better Auth React docs — `authClient.useSession()` returns `{ data: { user, session } | null, isPending, error }`. User has `id`, `name`, `email`, `image`. Session has `activeOrganizationId`.
4. Better Auth organization plugin docs — `authClient.useActiveOrganization()` returns `{ data: Organization | null, isPending }`. Organization has `id`, `name`, `slug`.
5. `convex/orgMembers.ts:list` — currently a Convex action (not a query) using `clerkClient()`. Stage 2c will migrate this to a Convex query using Better Auth adapter tables. The shim needs a **query** (not an action) to use with `useQuery`. This is flagged in §6 open questions.

### §2.2 Shim contract (TypeScript interfaces)

Derived exclusively from the §1.3 field-usage matrix:

```typescript
interface UseAuthReturn {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null | undefined;
  orgId: string | null | undefined;
  orgRole: string | null | undefined;
}

interface UseUserReturn {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
    imageUrl: string;
    primaryEmailAddress: { emailAddress: string } | null;
    emailAddresses: Array<{ emailAddress: string }>;
  } | null | undefined;
}

interface UseOrganizationReturn {
  isLoaded: boolean;
  organization: {
    id: string;
    name: string;
  } | null | undefined;
  membership: {
    role: string;
  } | null | undefined;
  memberships: {
    data: Array<{
      id: string;
      publicUserData: {
        userId: string;
        firstName: string | null;
        lastName: string | null;
        imageUrl: string;
        identifier: string;
      };
      role: string;
    }>;
  } | null | undefined;
}
```

**Fields NOT exposed (not in §1.3 matrix):**
- `user.publicMetadata` — no file reads it
- `user.phoneNumbers` — no file reads it
- `organization.slug` — no file reads it
- `membership.createdAt` — no file reads it
- `memberships.totalCount` / pagination metadata — no file reads it

### §2.3 Implementation patterns

Five mapping rules, each grounded in actual source file usage:

**Rule 1 — `isLoaded` inversion.** Clerk: `isLoaded = true` when data is ready. Better Auth: `isPending = true` when loading. Map: `isLoaded = !isPending`. Used in 7 files for `useAuth`, 13+ files for `useOrganization`.

**Rule 2 — Name splitting.** Better Auth uses a single `user.name` field. The shim splits:
```typescript
const [firstName, ...rest] = (user.name ?? "").split(" ");
const lastName = rest.join(" ") || null;
const fullName = user.name || null;
```
Used in `my-profile-modal.tsx:54-55`, `status-selector.tsx:27-29`, `user-menu.tsx:24`.

**Rule 3 — Image URL rename.** Better Auth `user.image` → shim `user.imageUrl`. Direct rename. Used in `my-profile-modal.tsx:71`, `user-menu.tsx:25`.

**Rule 4 — Email wrapping.** Better Auth `user.email` → shim `user.primaryEmailAddress = { emailAddress: user.email }` and `user.emailAddresses = [{ emailAddress: user.email }]`. Used in `status-selector.tsx:31`, `transfer-picker.tsx:176`.

**Rule 5 — Organization + membership from session.** Better Auth `useActiveOrganization()` returns the org. The membership role comes from `session.activeOrganizationRole` (set by the `session.update.before` hook in `convex/auth.ts`). Map: `membership = { role: session.activeOrganizationRole }`.

### §2.4 The `memberships` problem

**Chosen: Option A — shim calls a Convex query internally.**

5 files read `memberships.data` with `publicUserData` fields. The shim absorbs this complexity so each call site changes only its import line.

**Data source:** A Convex query `api.orgMembers.listActive` (Stage 2c will create this from the existing `list` action, converting it to a query against Better Auth adapter tables). If Stage 2c hasn't created this query yet, the shim can use a temporary query that reads from Better Auth's `member` table directly.

**Shape mapping:**
```typescript
// Better Auth member → Clerk membership shape
{
  id: member.id,
  publicUserData: {
    userId: member.userId,
    firstName: splitName(member.user?.name).first,
    lastName: splitName(member.user?.name).last,
    imageUrl: member.user?.image ?? "",
    identifier: member.user?.email ?? "",
  },
  role: member.role,
}
```

**Trade-off acknowledged:** The shim depends on Convex's `useQuery`, so it can't be used in non-Convex React contexts. Acceptable for WabDesk — every hook-using component is already inside the Convex provider tree.

**`revalidate` not exposed:** No call site calls `memberships.revalidate()`. The shim omits it. Convex queries auto-revalidate on mutation.

### §2.5 Full `lib/auth-hooks.ts` file content

```typescript
// lib/auth-hooks.ts
//
// Shim hooks that present Better Auth's session and organization data
// in the shape Clerk's hooks used to provide.
//
// Why this exists:
//   The migration from Clerk to Better Auth (see docs/migration/clerk-to-better-auth/)
//   touches 28+ frontend files. Rather than rewriting each call site to Better Auth's
//   native hook shape, this shim translates one shape to the other in one place.
//   Each call site changes only its import line.
//
// When to delete this:
//   This is acknowledged technical debt. Once the migration is stable in production
//   (target: 1-3 months post-launch), refactor each call site to use Better Auth's
//   native hooks (authClient.useSession(), authClient.useActiveOrganization(), etc.)
//   and delete this file.
//
// What this shim does NOT do:
//   - Expose Clerk-specific features (publicMetadata, verification status, etc.)
//   - Provide sign-in/sign-up/sign-out methods (use authClient directly)
//   - Implement <SignedIn>/<SignedOut>/<Protect> components (not used in codebase)

import { authClient } from "@/lib/auth-client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function splitName(
  name: string | null | undefined,
): { first: string | null; last: string | null } {
  if (!name) return { first: null, last: null };
  const parts = name.split(" ");
  return {
    first: parts[0] || null,
    last: parts.slice(1).join(" ") || null,
  };
}

export function useAuth() {
  const { data, isPending } = authClient.useSession();

  return {
    isLoaded: !isPending,
    isSignedIn: !!data?.user,
    userId: data?.user?.id ?? null,
    orgId: (data?.session?.activeOrganizationId as string | null | undefined) ?? null,
    orgRole:
      (data?.session as Record<string, unknown> | undefined)
        ?.activeOrganizationRole as string | null | undefined ?? null,
  };
}

export function useUser() {
  const { data, isPending } = authClient.useSession();

  if (isPending) {
    return { isLoaded: false, isSignedIn: false, user: undefined };
  }

  if (!data?.user) {
    return { isLoaded: true, isSignedIn: false, user: null };
  }

  const { first, last } = splitName(data.user.name);
  const email = data.user.email ?? "";

  return {
    isLoaded: true,
    isSignedIn: true,
    user: {
      id: data.user.id,
      firstName: first,
      lastName: last,
      fullName: data.user.name || null,
      imageUrl: data.user.image ?? "",
      primaryEmailAddress: email ? { emailAddress: email } : null,
      emailAddresses: email ? [{ emailAddress: email }] : [],
    },
  };
}

export function useOrganization(
  _opts?: Record<string, unknown>,
) {
  const session = authClient.useSession();
  const orgQuery = authClient.useActiveOrganization();
  const members = useQuery(
    api.orgMembers.listActive,
    session.data?.session?.activeOrganizationId ? {} : "skip",
  );

  const isLoaded =
    !session.isPending && !orgQuery.isPending && members !== undefined;

  const org = orgQuery.data;
  const activeOrgRole =
    (session.data?.session as Record<string, unknown> | undefined)
      ?.activeOrganizationRole as string | null | undefined;

  return {
    isLoaded,
    organization: org
      ? { id: org.id, name: org.name }
      : null,
    membership: activeOrgRole
      ? { role: activeOrgRole }
      : null,
    memberships: members
      ? {
          data: members.map((m) => {
            const { first, last } = splitName(m.name);
            return {
              id: m.memberId,
              publicUserData: {
                userId: m.userId,
                firstName: first,
                lastName: last,
                imageUrl: m.image ?? "",
                identifier: m.email ?? "",
              },
              role: m.role,
            };
          }),
        }
      : undefined,
  };
}
```

**Estimated length:** 118 lines. Within the 100–180 target.

**Dependencies:**
- `authClient` from `@/lib/auth-client` (Stage 2A §5.4)
- `useQuery` from `convex/react`
- `api.orgMembers.listActive` — a Convex query that returns org members with `{ memberId, userId, name, email, image, role }`. This query must be created in Stage 2c (replacing the Clerk `clerkClient()` action). If Stage 2c hasn't created it yet, it must exist before Stage 3 applies this shim.

### §2.6 Non-goals

The shim does NOT:

- Implement `useClerk()` (sign-out, etc.) — no file uses it; Phase 2 handles sign-out via `authClient.signOut()` directly
- Implement `auth.has()` permission checks — no file uses them
- Implement `<SignedIn>`, `<SignedOut>`, `<Protect>` JSX components — not used in codebase (verified Stage 0 §V3 and current source)
- Provide methods for sign-in, sign-up, sign-out, organization create — Phase 2 (UI rebuilds use `authClient` directly)
- Cache anything beyond what Better Auth's hooks already cache
- Provide TypeScript types matching Clerk's exact types — the shim's types are independent and only need to satisfy what call sites read

---

## §3. Call site updates

### §3.1 `app/(dashboard)/automations/page.tsx`

**Lines changed:** 1 (import statement)

**BEFORE (line 4):**
```typescript
import { useAuth } from "@clerk/nextjs";
```

**AFTER (line 4):**
```typescript
import { useAuth } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `orgRole`, `isLoaded`. Both exposed by shim §2.2 `useAuth()`. ✓

---

### §3.2 `app/(dashboard)/inbox/page.tsx`

**Lines changed:** 1 (import statement)

**BEFORE (line 23):**
```typescript
import { useOrganization } from "@clerk/nextjs";
```

**AFTER (line 23):**
```typescript
import { useOrganization } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `membership.role` (line 57-58). Exposed by shim §2.2 `useOrganization()`. ✓

---

### §3.3 `app/(dashboard)/settings/channels/page.tsx`

**Lines changed:** 1 (import statement)

**BEFORE (line 5):**
```typescript
import { useAuth } from "@clerk/nextjs";
```

**AFTER (line 5):**
```typescript
import { useAuth } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `isLoaded`, `orgId`, `orgRole`. All exposed by shim §2.2 `useAuth()`. ✓

---

### §3.4 `app/join/[token]/page.tsx`

**Lines changed:** 1 (import statement — hooks only)

**BEFORE (line 8):**
```typescript
import { useAuth } from "@clerk/nextjs";
```

**AFTER (line 8):**
```typescript
import { useAuth } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `isLoaded`, `isSignedIn`, `orgId`. All exposed by shim §2.2 `useAuth()`. ✓

**Special note:** Line 7 (`import { SignIn } from "@clerk/nextjs"`) and line 97 (`<SignIn />`) are **Phase 2 scope**. Phase 1 changes only the hook import.

---

### §3.5 `components/automations/AutomationRulesClient.tsx`

**Lines changed:** 1 (import statement)

**BEFORE (line 5):**
```typescript
import { useOrganization } from "@clerk/nextjs";
```

**AFTER (line 5):**
```typescript
import { useOrganization } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `organization.name` (line 54). Exposed by shim §2.2 `useOrganization()`. ✓

---

### §3.6 `components/contacts/contact-detail-sheet.tsx`

**Lines changed:** 1 (import statement)

**BEFORE (line 8):**
```typescript
import { useOrganization } from "@clerk/nextjs";
```

**AFTER (line 8):**
```typescript
import { useOrganization } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `membership.role`, `memberships.data[].publicUserData.userId`, `memberships.data[].publicUserData.firstName`, `memberships.data[].role`. All exposed by shim §2.2 `useOrganization()`. ✓

---

### §3.7 `components/contacts/contact-list.tsx`

**Lines changed:** 1 (import statement)

**BEFORE (line 8):**
```typescript
import { useOrganization, useAuth } from "@clerk/nextjs";
```

**AFTER (line 8):**
```typescript
import { useOrganization, useAuth } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `isLoaded`, `orgId` from `useAuth`; `membership.role` from `useOrganization`. All exposed. ✓

---

### §3.8 `components/contacts/follow-up-modal.tsx`

**Lines changed:** 1 (import statement)

**BEFORE (line 5):**
```typescript
import { useOrganization } from "@clerk/nextjs";
```

**AFTER (line 5):**
```typescript
import { useOrganization } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `memberships.data[].publicUserData.userId`, `.firstName`, `.lastName`. All exposed. ✓

---

### §3.9 `components/inbox/conversation-list.tsx`

**Lines changed:** 1 (import statement)

**BEFORE (line 5):**
```typescript
import { useAuth, useOrganization } from "@clerk/nextjs";
```

**AFTER (line 5):**
```typescript
import { useAuth, useOrganization } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `userId` from `useAuth`; `memberships.data[].publicUserData.userId`, `.firstName`, `.lastName`, `.identifier` from `useOrganization`. All exposed. ✓

---

### §3.10 `components/inbox/conversation-list-item.tsx`

**Lines changed:** 1 (import statement)

**BEFORE (line 9):**
```typescript
import { useOrganization, useUser } from "@clerk/nextjs";
```

**AFTER (line 9):**
```typescript
import { useOrganization, useUser } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `membership.role` from `useOrganization`; `user.id` from `useUser`. All exposed. ✓

---

### §3.11 `components/inbox/status-selector.tsx`

**Lines changed:** 1 (import statement)

**BEFORE (line 4):**
```typescript
import { useUser } from "@clerk/nextjs";
```

**AFTER (line 4):**
```typescript
import { useUser } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `user.fullName`, `user.firstName`, `user.lastName`, `user.primaryEmailAddress.emailAddress`. All exposed. ✓

---

### §3.12 `components/inbox/transfer-picker.tsx`

**Lines changed:** 1 (import statement)

**BEFORE (line 4):**
```typescript
import { useOrganization, useUser } from "@clerk/nextjs";
```

**AFTER (line 4):**
```typescript
import { useOrganization, useUser } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `memberships.data[].publicUserData.*` from `useOrganization`; `user.firstName`, `user.emailAddresses[0].emailAddress`, `user.id` from `useUser`. All exposed. ✓

---

### §3.13 `components/onboarding/onboarding-wizard.tsx`

**Lines changed:** 1 (import statement)

**BEFORE (line 5):**
```typescript
import { useAuth } from "@clerk/nextjs";
```

**AFTER (line 5):**
```typescript
import { useAuth } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `isLoaded`, `orgId`. Both exposed. ✓

---

### §3.14 `components/onboarding/step-workspace-name.tsx`

**Lines changed:** 1 (hook import only — line 5)

**BEFORE (line 5):**
```typescript
import { useAuth } from "@clerk/nextjs";
```

**AFTER (line 5):**
```typescript
import { useAuth } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `orgId`. Exposed. ✓

**Special note:** Line 4 (`import { CreateOrganization } from "@clerk/nextjs"`) and line 25 (`<CreateOrganization>`) are **Phase 2 scope**. Phase 1 changes only the hook import.

---

### §3.15 `components/settings/csat-settings.tsx`

**Lines changed:** 1 (import statement)

**BEFORE (line 13):**
```typescript
import { useOrganization } from "@clerk/nextjs";
```

**AFTER (line 13):**
```typescript
import { useOrganization } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `membership.role`. Exposed. ✓

---

### §3.16 `components/settings/department-members.tsx`

**Lines changed:** 1 (import statement)

**BEFORE (line 5):**
```typescript
import { useOrganization, useUser } from "@clerk/nextjs";
```

**AFTER (line 5):**
```typescript
import { useOrganization, useUser } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `membership.role` from `useOrganization`; `user.id` from `useUser`. Both exposed. ✓

---

### §3.17 `components/settings/invite-links.tsx`

**Lines changed:** 1 (import statement)

**BEFORE (line 5):**
```typescript
import { useOrganization } from "@clerk/nextjs";
```

**AFTER (line 5):**
```typescript
import { useOrganization } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `membership.role`, `memberships.data[].publicUserData.*`. All exposed. ✓

---

### §3.18 `components/settings/invite-modal.tsx`

**Lines changed:** 1 (import statement)

**BEFORE (line 5):**
```typescript
import { useOrganization, useAuth } from "@clerk/nextjs";
```

**AFTER (line 5):**
```typescript
import { useOrganization, useAuth } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `organization` (truthiness), `membership.role` from `useOrganization`; `isLoaded` from `useAuth`. All exposed. ✓

---

### §3.19 `components/settings/labels-settings.tsx`

**Lines changed:** 1 (import statement)

**BEFORE (line 13):**
```typescript
import { useOrganization } from "@clerk/nextjs";
```

**AFTER (line 13):**
```typescript
import { useOrganization } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `membership.role`. Exposed. ✓

---

### §3.20 `components/settings/notifications-settings.tsx`

**Lines changed:** 1 (import statement)

**BEFORE (line 5):**
```typescript
import { useOrganization } from "@clerk/nextjs";
```

**AFTER (line 5):**
```typescript
import { useOrganization } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `membership.role`. Exposed. ✓

---

### §3.21 `components/settings/team-member-list.tsx`

**Lines changed:** 1 (import statement)

**BEFORE (line 5):**
```typescript
import { useOrganization, useUser } from "@clerk/nextjs";
```

**AFTER (line 5):**
```typescript
import { useOrganization, useUser } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `organization` (truthiness), `membership.role` from `useOrganization`; `user.id` from `useUser`. All exposed. ✓

---

### §3.22 `components/shell/app-sidebar.tsx`

**Lines changed:** 1 (import statement)

**BEFORE (line 7):**
```typescript
import { useAuth } from "@clerk/nextjs";
```

**AFTER (line 7):**
```typescript
import { useAuth } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `isLoaded` (as `clerkLoaded`), `orgId`. Both exposed. ✓

---

### §3.23 `components/shell/convex-auth-guard.tsx`

**Lines changed:** 1 (import statement)

**BEFORE (line 6):**
```typescript
import { useAuth } from "@clerk/nextjs";
```

**AFTER (line 6):**
```typescript
import { useAuth } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `isLoaded` (as `clerkLoaded`), `orgId`. Both exposed. ✓

---

### §3.24 `components/shell/my-profile-modal.tsx`

**Lines changed:** 1 (import statement)

**BEFORE (line 4):**
```typescript
import { useUser } from "@clerk/nextjs";
```

**AFTER (line 4):**
```typescript
import { useUser } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `user.firstName`, `user.lastName`, `user.fullName`, `user.imageUrl`. All exposed. ✓

---

### §3.25 `components/shell/user-menu.tsx`

**Lines changed:** 1 (import statement — hooks portion of line 4)

**BEFORE (line 4):**
```typescript
import { SignOutButton, OrganizationSwitcher, useAuth, useUser } from "@clerk/nextjs";
```

**AFTER (line 4):**
```typescript
import { SignOutButton, OrganizationSwitcher } from "@clerk/nextjs";
```

**NEW line 5 (added):**
```typescript
import { useAuth, useUser } from "@/lib/auth-hooks";
```

**Lines changed:** 2 (split the existing import into two lines)

**Field-usage validation:** Reads `isSignedIn`, `userId` from `useAuth`; `user.fullName`, `user.firstName`, `user.imageUrl` from `useUser`. All exposed. ✓

**Special note:** `SignOutButton` and `OrganizationSwitcher` remain imported from `@clerk/nextjs` until Phase 2 replaces them.

---

### §3.26 `components/ui/presence-indicator.tsx`

**Lines changed:** 1 (import statement)

**BEFORE (line 4):**
```typescript
import { useOrganization } from "@clerk/nextjs";
```

**AFTER (line 4):**
```typescript
import { useOrganization } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `organization.id`. Exposed. ✓

---

### §3.27 `components/ui/team-presence-dropdown.tsx`

**Lines changed:** 1 (import statement)

**BEFORE (line 5):**
```typescript
import { useOrganization } from "@clerk/nextjs";
```

**AFTER (line 5):**
```typescript
import { useOrganization } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `organization.id`. Exposed. ✓

---

### §3.28 `components/team/member-profile/manage-tab.tsx`

**Lines changed:** 1 (import statement)

**BEFORE (line 4):**
```typescript
import { useAuth } from "@clerk/nextjs";
```

**AFTER (line 4):**
```typescript
import { useAuth } from "@/lib/auth-hooks";
```

**Field-usage validation:** Reads `userId` (as `currentUserId`). Exposed. ✓

---

### §3 summary table

| # | File | Lines diffed | Reason if not just import-line |
|---|---|---|---|
| 1 | `app/(dashboard)/automations/page.tsx` | 1 | — |
| 2 | `app/(dashboard)/inbox/page.tsx` | 1 | — |
| 3 | `app/(dashboard)/settings/channels/page.tsx` | 1 | — |
| 4 | `app/join/[token]/page.tsx` | 1 | — (note: line 7 `SignIn` import is Phase 2) |
| 5 | `components/automations/AutomationRulesClient.tsx` | 1 | — |
| 6 | `components/contacts/contact-detail-sheet.tsx` | 1 | — |
| 7 | `components/contacts/contact-list.tsx` | 1 | — |
| 8 | `components/contacts/follow-up-modal.tsx` | 1 | — |
| 9 | `components/inbox/conversation-list.tsx` | 1 | — |
| 10 | `components/inbox/conversation-list-item.tsx` | 1 | — |
| 11 | `components/inbox/status-selector.tsx` | 1 | — |
| 12 | `components/inbox/transfer-picker.tsx` | 1 | — |
| 13 | `components/onboarding/onboarding-wizard.tsx` | 1 | — |
| 14 | `components/onboarding/step-workspace-name.tsx` | 1 | — (note: line 4 `CreateOrganization` import is Phase 2) |
| 15 | `components/settings/csat-settings.tsx` | 1 | — |
| 16 | `components/settings/department-members.tsx` | 1 | — |
| 17 | `components/settings/invite-links.tsx` | 1 | — |
| 18 | `components/settings/invite-modal.tsx` | 1 | — |
| 19 | `components/settings/labels-settings.tsx` | 1 | — |
| 20 | `components/settings/notifications-settings.tsx` | 1 | — |
| 21 | `components/settings/team-member-list.tsx` | 1 | — |
| 22 | `components/shell/app-sidebar.tsx` | 1 | — |
| 23 | `components/shell/convex-auth-guard.tsx` | 1 | — |
| 24 | `components/shell/my-profile-modal.tsx` | 1 | — |
| 25 | `components/shell/user-menu.tsx` | 2 | Split combined import: hooks → `@/lib/auth-hooks`, JSX components stay on `@clerk/nextjs` |
| 26 | `components/ui/presence-indicator.tsx` | 1 | — |
| 27 | `components/ui/team-presence-dropdown.tsx` | 1 | — |
| 28 | `components/team/member-profile/manage-tab.tsx` | 1 | — |

---

## §4. Out of scope

Phase 1 does NOT touch:

| File / area | Reason | Phase |
|---|---|---|
| `components/convex-client-provider.tsx` | `useAuth` is passed as prop to `ConvexProviderWithClerk`, not called as hook. Entire file rewritten in Phase 3. | Phase 3 |
| `app/(auth)/sign-in/[[...sign-in]]/page.tsx` | Uses `SignIn` JSX component only — no hooks. | Phase 2 |
| `app/(auth)/sign-up/[[...sign-up]]/page.tsx` | Uses `SignUp` JSX component only — no hooks. | Phase 2 |
| `app/select-org/page.tsx` | Uses `OrganizationList` JSX component only — no hooks. | Phase 2 |
| `components/clerk-provider-with-locale.tsx` | Uses `ClerkProvider` — entire file deleted. | Phase 3 |
| `components/onboarding/step-workspace-name.tsx` line 4 (`CreateOrganization`) + line 25 | JSX component rebuild. | Phase 2 |
| `components/shell/user-menu.tsx` `SignOutButton` + `OrganizationSwitcher` JSX | Component rebuild. | Phase 2 |
| `app/join/[token]/page.tsx` line 7 (`SignIn`) + line 97 | JSX component rebuild. | Phase 2 |
| `app/(dashboard)/layout.tsx` | Server-side `auth()` guard. | Phase 3 |
| `lib/shell/role-utils.ts` Q8 supervisor branch | Role-string fix. | Phase 3 |
| `components/shell/user-menu.tsx` avatar/ban controls | UI deletion per D2 Option B. | Phase 3 |
| All `convex/` files | Stage 2a/2b/2c scope. | Separate stages |
| `middleware.ts` | Clerk middleware deletion. | Phase 3 |

---

## §5. Phase 1 application order for Stage 3

1. Create `lib/auth-hooks.ts` (the shim — §2.5)
2. Verify `api.orgMembers.listActive` Convex query exists (Stage 2c dependency)
3. Update all 28 call site imports (order within doesn't matter — each is independent)

---

## §6. New open questions

1. **`api.orgMembers.listActive` query existence.** Stage 2c must create this query. If Stage 2c converts `convex/orgMembers.ts:list` from an action (using `clerkClient()`) to a query (using Better Auth adapter), the query must return `{ memberId, userId, name, email, image, role }[]`. If this query doesn't exist when Stage 3 applies Phase 1, the shim's `useOrganization().memberships` will always be `undefined`. **Recommendation:** Flag in Stage 2c as a blocking dependency for Phase 1.

2. **`session.activeOrganizationRole` reliability.** Stage 2A §5.1 configures `session.additionalFields.activeOrganizationRole` and writes it in `session.update.before`. Stage 2A §9 OQ-1 asks whether Better Auth 1.6.9 supports `session.additionalFields`. If not, `activeOrganizationRole` must be manually added to the schema (§5.2 of Stage 2A). The shim depends on this field being present on the session object returned by `authClient.useSession()`. **Action:** Verify in Stage 3 day-one against the generated schema.

3. **Better Auth `user.image` vs `user.imageUrl`.** Better Auth 1.6.9 uses `user.image` (confirmed in docs). The shim maps it to `imageUrl`. If a future version renames it, the shim needs a one-line update. Low risk.

4. **`useActiveOrganization()` return shape.** Docs show `{ data: Organization | null, isPending }`. The `Organization` type is confirmed to have `id` and `name`. The `slug` field is NOT exposed in the shim (no file reads it). If a file later needs `slug`, it would be a Phase 1.5 addition.

5. **`user.emailAddresses` shape fidelity.** The shim creates a single-element array `[{ emailAddress }]` from `user.email`. Clerk's actual `emailAddresses` is a full EmailAddress object array with `id`, `verification` status, etc. No file reads anything beyond `[0].emailAddress`, so the shim's simplified shape is sufficient. If a future feature needs email verification status, it should use Better Auth's native API, not extend this shim.

---

## §7. Phase 2 + Phase 3 preview

**Phase 2 scope (next prompt after Phase 1 closes):**
- `app/(auth)/sign-in/[[...sign-in]]/page.tsx` — custom HTML form with `authClient.signIn.email()` + `authClient.signIn.social()`
- `app/(auth)/sign-up/[[...sign-up]]/page.tsx` — same pattern
- `app/select-org/page.tsx` — minimal `<OrganizationList>` rebuild (D5 = B)
- `app/accept-invite/[[...accept-invite]]/page.tsx` — invitation acceptance flow
- `app/join/[token]/page.tsx` — `<SignIn>` JSX replacement (Phase 1 changed the hook import)
- `components/shell/user-menu.tsx` — `<SignOutButton>` swap + `<OrganizationSwitcher>` rebuild
- `components/onboarding/step-workspace-name.tsx` — `<CreateOrganization>` replacement

**Phase 3 scope (after Phase 2 closes):**
- `components/convex-client-provider.tsx` — `<ConvexProviderWithClerk>` → Better Auth bridge
- `components/clerk-provider-with-locale.tsx` — DELETE
- `app/(dashboard)/layout.tsx` — `isAuthenticated()` server-side guard
- `middleware.ts` — Clerk middleware deletion + replacement
- `lib/shell/role-utils.ts` — Q8 supervisor branch fix
- UI deletion of avatar/ban controls per D2 Option B
- Final integration check: `grep -rn "@clerk" app components lib | grep -v node_modules` returns empty
