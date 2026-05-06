# Stage 2c.3 — `listActive` Query for Shim Memberships Source (CORRECTED — Path X)

**Produced:** 2026-05-06
**Locked base:** `STAGE_2C_CLERK_CLIENT_SITES.md`, `STAGE_2D_PHASE_1.md`, Convex runtime documentation
**Scope:** Planning only — no installs, no source-file modifications.
**Revision note:** This document supersedes the prior `STAGE_2C3_LIST_ACTIVE_QUERY.md`. The prior version placed `listActive` in `convex/orgMembers.ts`, which has `"use node"` at line 1. Per Convex's official documentation (`docs.convex.dev/functions/runtimes`), files with `"use node"` cannot contain `query` or `mutation` declarations — only actions. The prior version would fail at deploy time. **Path X** corrects this by placing `listActive` in a separate file: `convex/orgMembersQueries.ts` (no `"use node"` directive).

---

## §1. Why this stage exists

Stage 2d Phase 1's auth-hooks shim (`lib/auth-hooks.ts` line 419-420) calls a Convex query that was not yet planned. Stage 2c.3 adds it.

The shim's reference is updated as part of this stage from `api.orgMembers.listActive` to `api.orgMembersQueries.listActive` — see `STAGE_2D_PHASE_1.md` §6.6 amendment (also produced in this revision pass).

---

## §2. Discovery output

### §2.1 Full `convex/orgMembers.ts` current content (verbatim, line-numbered)

The file content remains as documented in the prior revision's §2.1 — 322 lines, 5 exports, all `action` wrapping, `"use node"` at line 1. Reproduced here as a content header summary (full content already in the prior revision; not duplicated to keep this corrected doc focused on what changed):

| Line | Name | Wrapping primitive |
|---|---|---|
| 23 | `inviteByEmail` | `action` |
| 73 | `list` | `action` |
| 137 | `changeRole` | `action` |
| 179 | `inviteByWhatsApp` | `action` |
| 273 | `removeMember` | `action` |

**File-level directive:** `"use node"` (line 1) — applies to all exports in this file.

**Architectural constraint (corrected):** Per Convex's runtime documentation:

> *"Files with the 'use node' directive should not contain any Convex queries or mutations since they cannot be run in the Node.js runtime."*

> *"Only actions can be defined in 'use node' files (no queries or mutations)."*

— Source: `docs.convex.dev/functions/runtimes`, also `docs.convex.dev/api/modules/server`

This means the `listActive` query CANNOT live in `convex/orgMembers.ts`. Path X resolves this by placing it in a separate file with no `"use node"` directive.

### §2.2 Naming collision check

```
$ grep -rn "listActive\|list_active\|listActiveMembers" convex/ --include="*.ts"
(empty output)
```

No `listActive` declaration anywhere in `convex/`. Safe to use.

### §2.3 Existing `list` function — unchanged

`list` remains an `action` in `convex/orgMembers.ts`. Stage 2c §8.2 owns it. Stage 2c.3 does not modify it.

The architectural reasoning for `listActive` separate from `list` (different consumers, different shapes, different gating) is preserved. The new constraint added by this revision: `listActive` ALSO cannot share a file with `list` due to Convex's runtime rules.

### §2.4 New file — no existing imports

`convex/orgMembersQueries.ts` does not currently exist. The new file declares its own imports from scratch:

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";
import { getCallerIdentity } from "./lib/auth";
import { authComponent } from "./auth";
```

All four imports point to existing modules (no new modules required). The `getCallerIdentity` and `authComponent` imports follow the same paths used in `convex/orgMembers.ts` (relative imports from the same `convex/` directory).

### §2.5 Stage 2c §8.2 adapter pattern reference

Verbatim from `STAGE_2C_CLERK_CLIENT_SITES.md` §8.2 lines 497-514:

```typescript
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

const memberUsers = await Promise.all(
  rawMembers.map((m) =>
    adapter.findOne({ model: "user", where: [{ field: "id", value: m.userId }] }),
  ),
);
```

`listActive` mirrors the `rawMembers` + `memberUsers` portion of this pattern. It does NOT fetch invitations.

---

## §3. The new `listActive` query

### §3.1 Full `convex/orgMembersQueries.ts` file content

```typescript
// convex/orgMembersQueries.ts
//
// Lightweight queries for organization member data, used by client-side hooks.
//
// This file exists separately from convex/orgMembers.ts because the latter has
// "use node" at the top (required by Node-only operations like the Meta WhatsApp
// API and auth.api.* HTTP calls). Convex's runtime rules prohibit query and
// mutation declarations in "use node" files. See docs.convex.dev/functions/runtimes.
//
// When operations in convex/orgMembers.ts no longer require Node runtime
// (post-launch cleanup), this file can be merged back. Phase 2 cleanup task.

import { query } from "./_generated/server";
import { v } from "convex/values";
import { getCallerIdentity } from "./lib/auth";
import { authComponent } from "./auth";

/**
 * Lightweight query for the auth-hooks shim's useOrganization().memberships.
 *
 * Returns ALL active members of the caller's tenant in a flat shape suitable
 * for client-side rendering. Does NOT include pending invitations (use
 * convex/orgMembers.ts:list for that — different consumer, different shape).
 *
 * Access control: caller must be authenticated and have an active org context.
 * Any authenticated member of an org can read the org's member list — this is
 * intentional. The shim's consumers (transfer picker, agent picker, etc.)
 * render for all roles, not just admins.
 *
 * Used by:
 *   - lib/auth-hooks.ts:useOrganization (Stage 2d Phase 1)
 */
export const listActive = query({
  args: {},
  returns: v.array(
    v.object({
      memberId: v.string(),
      userId: v.string(),
      name: v.union(v.string(), v.null()),
      email: v.union(v.string(), v.null()),
      image: v.union(v.string(), v.null()),
      role: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const adapter = authComponent.adapter(ctx);

    const members = await adapter.findMany({
      model: "member",
      where: [{ field: "organizationId", value: tenantId }],
    });

    const users = await Promise.all(
      members.map((m: { userId: string }) =>
        adapter.findOne({
          model: "user",
          where: [{ field: "id", value: m.userId }],
        }),
      ),
    );

    return members.map(
      (m: { id: string; userId: string; role: string }, i: number) => ({
        memberId: m.id,
        userId: m.userId,
        name: (users[i] as { name?: string | null } | null)?.name ?? null,
        email: (users[i] as { email?: string | null } | null)?.email ?? null,
        image: (users[i] as { image?: string | null } | null)?.image ?? null,
        role: m.role,
      }),
    );
  },
});
```

**Line count:** 65 lines including the file-level docstring, the function-level docstring, and imports. The function body itself is 36 lines.

### §3.2 File location and registration

**File path:** `convex/orgMembersQueries.ts`

**Convex API path:** `api.orgMembersQueries.listActive`

Convex auto-generates the API path from file location. Per Convex's file-based routing (`docs.convex.dev/api/modules/server`):

> *"A public function defined in `convex/example.ts` named `f` has a function reference of `api.example.f`."*

So `convex/orgMembersQueries.ts:listActive` becomes `api.orgMembersQueries.listActive` — this is the path the shim references.

**Stage 3 will:**
1. Create the new file `convex/orgMembersQueries.ts` with the content from §3.1
2. Re-run `npx convex dev` (or build) to regenerate `convex/_generated/api.ts` — this auto-adds the `orgMembersQueries` namespace
3. The shim's `api.orgMembersQueries.listActive` reference resolves correctly after step 2

### §3.3 Return shape validator

```typescript
v.array(
  v.object({
    memberId: v.string(),
    userId: v.string(),
    name: v.union(v.string(), v.null()),
    email: v.union(v.string(), v.null()),
    image: v.union(v.string(), v.null()),
    role: v.string(),
  }),
)
```

Field-by-field mapping to the shim's `useOrganization().memberships.data[]`:

- `memberId` → shim's `memberships.data[].id`
- `userId` → shim's `memberships.data[].publicUserData.userId`
- `name` → shim splits via `splitName(name)` into `publicUserData.firstName` + `publicUserData.lastName`
- `email` → shim's `memberships.data[].publicUserData.identifier`
- `image` → shim's `memberships.data[].publicUserData.imageUrl`
- `role` → shim's `memberships.data[].role`

This matches `STAGE_2D_PHASE_1.md` §2.5 lines 442-455 of `lib/auth-hooks.ts`.

### §3.4 Import diff

**No diff** to existing files. `convex/orgMembersQueries.ts` is a new file with its own imports declared in §3.1. `convex/orgMembers.ts` is NOT modified by Stage 2c.3.

---

## §4. Behavioral verification

### §4.1 Access control — any authenticated org member can read

`listActive` calls `getCallerIdentity(ctx)` which throws `UNAUTHORIZED` if no identity is present, or `NO_ORG` if no `tenantId` is set. Beyond authentication and tenant context, no role gating is applied.

This is intentional. The shim's 6 consumers (transfer picker, agent picker, contact lists, etc.) render for any authenticated user. Adding admin/supervisor gating would break these UIs for agent-role users.

### §4.2 Empty-list handling

If the org has zero members other than the caller, `members` is `[caller]`. If somehow `members` is `[]` (edge case), `members.map(...)` returns `[]`. No throw, no special-casing. The shim's `memberships.data` becomes `[]` — consumers handle empty arrays correctly.

### §4.3 Self-inclusion — current user IS in returned list

The query returns ALL members of the active org including the caller. Consumers that need to filter "me" out (e.g., transfer-picker excludes current user from transfer targets) do so themselves at the UI layer.

This decouples the query from UI semantics — same query serves transfer-picker (filters self), conversation-list (does not filter self), agent-picker (may or may not filter depending on UX), without each needing a different query.

---

## §5. Performance characteristics

- **Query complexity:** O(N) where N = number of org members. N is bounded by the plan's agent limit (~50 for Business plan max). Acceptable for v1.
- **N+1 user lookup:** The `Promise.all + findOne` pattern fires one DB read per member. Same as Stage 2c §8.2's existing `list`. Stage 2c OQ-C2 flagged whether `findMany` supports `operator: "in"` — if it does (Stage 3 verifies), `listActive` can be optimized in a Phase 2 cleanup. For v1, the N+1 pattern is acceptable.
- **Re-render frequency:** Convex's query reactivity re-runs `listActive` whenever member rows change. Adding/removing/role-changing a member reflects in `memberships.data` immediately. This is correct behavior for the shim consumers.

---

## §6. Stage 3 application order

**Dependency chain (corrected for Path X):**

1. Stage 2c applies all changes to `convex/orgMembers.ts` (existing function migrations — `list`, `inviteByEmail`, `changeRole`, `inviteByWhatsApp`, `removeMember`)
2. Stage 2c.3 creates new file `convex/orgMembersQueries.ts` with `listActive`
3. Stage 2c.3 runs `npx convex dev` (or equivalent build step) to regenerate `_generated/api.ts` with the new namespace
4. Stage 2d Phase 1 creates `lib/auth-hooks.ts` (which references `api.orgMembersQueries.listActive` per Phase 1 §6.6 amendment)
5. Stage 2d Phase 1 updates the 28 call site imports

Steps 2 and 4 must both land before Stage 3's TypeScript baseline check. Step 3 between them ensures the API namespace is generated.

If `convex/orgMembersQueries.ts` is not yet deployed when the shim first renders, `useQuery(api.orgMembersQueries.listActive, ...)` returns `undefined` (Convex's standard behavior for skipped or pending queries). The shim's `memberships` field becomes `undefined` — consumers handle this gracefully via existing `if (!memberships) return null` patterns.

---

## §7. Open questions (revised)

1. **Member primary key field name.** The implementation uses `m.id` as the member's primary key. Better Auth's generated schema may expose this as `id` or `_id` depending on adapter convention. Stage 2c OQ-C1 raises this concern. **Action:** Stage 3 day-one — check the generated `convex/betterAuth/schema.ts` for the `member` table's primary key field name. If it's `_id`, change `memberId: m.id` to `memberId: m._id`.

2. **`findMany` operator support.** Stage 2c OQ-C2 asks whether `adapter.findMany` supports `{ operator: "in" }` for batch user lookups. If it does, the N+1 pattern in `listActive` can be optimized. If not, the current `Promise.all + findOne` pattern is the fallback. **Action:** Stage 3 verifies against the actual adapter API.

3. **~~`"use node"` coexistence~~** **— RESOLVED via Path X.** The prior revision flagged this as low-risk; the actual Convex docs prohibit it outright. Path X resolves by placing `listActive` in a separate file (`convex/orgMembersQueries.ts`) with no `"use node"` directive. No Stage 3 verification needed for this question — the architectural decision eliminates the concern.

4. **Adapter `findOne` null handling.** If a member's user has been deleted from Better Auth (edge case — orphaned membership), `findOne` returns `null`. The type assertions `(users[i] as { name?: string | null } | null)?.name ?? null` handle this gracefully — all fields default to `null`. **No action needed.**

5. **(NEW) Future consolidation back to single file.** If post-launch cleanup removes `"use node"` from `convex/orgMembers.ts` (because none of its functions actually require Node runtime once Stage 2c.1's `auth.api.*` patterns are reviewed for Convex-runtime compatibility), `listActive` can be moved back into `convex/orgMembers.ts`. This is a Phase 2 cleanup task, not a Stage 3 concern. The shim path would need to update from `api.orgMembersQueries.listActive` back to `api.orgMembers.listActive`, but consolidation gives one logical concept one file.

---

## §8. Out of scope (explicit)

Stage 2c.3 does NOT touch:

| File / area | Reason |
|---|---|
| `convex/orgMembers.ts` (entire file) | Stage 2c §8 owns it; "use node" stays |
| `lib/auth-hooks.ts` | Stage 2d Phase 1 owns it; the one-line shim reference correction is a Phase 1 amendment, not Stage 2c.3 scope (see Phase 1 §6.6 amendment doc) |
| `convex/auth.ts` | Stage 2a owns it |
| `convex/lib/auth.ts` | Stage 2b owns it |
| Any other file in `convex/` or `app/` or `components/` | Not in scope |

The single change Stage 2c.3 introduces: **one new file at `convex/orgMembersQueries.ts`**.

---

*End of Stage 2c.3 — Path X (Corrected).*
