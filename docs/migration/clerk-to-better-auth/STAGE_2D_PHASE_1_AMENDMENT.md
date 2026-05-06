# Stage 2d Phase 1 — Amendment §6.6 (One-Line Shim Correction)

**Produced:** 2026-05-06
**Amends:** `STAGE_2D_PHASE_1.md` §2.5 (the shim's `useOrganization` implementation)
**Trigger:** Stage 2c.3 (Path X) — `listActive` query placed in new file `convex/orgMembersQueries.ts` rather than `convex/orgMembers.ts`, due to Convex runtime rules prohibiting queries in `"use node"` files.

---

## §6.6 Amendment — `lib/auth-hooks.ts` `api` reference correction

### Why this amendment exists

Stage 2d Phase 1's deliverable (lines 419-422 of `STAGE_2D_PHASE_1.md` §2.5) wrote the shim with:

```typescript
const members = useQuery(
  api.orgMembers.listActive,
  session.data?.session?.activeOrganizationId ? {} : "skip",
);
```

This referenced `api.orgMembers.listActive` — a function name that did not yet exist in any Stage 2c sub-stage's plan. Verification (Claude Chat review post-Phase-1) found:

1. The query needs to exist somewhere in `convex/` for the shim to compile and function
2. Stage 2c.3 was drafted to add it
3. The first Stage 2c.3 revision placed it in `convex/orgMembers.ts`, but Convex's runtime rules (`docs.convex.dev/functions/runtimes`) prohibit `query` declarations in files with `"use node"`
4. Stage 2c.3 (Path X) corrects this by placing `listActive` in a new file: `convex/orgMembersQueries.ts`

The shim's reference path must therefore change from `api.orgMembers.listActive` to `api.orgMembersQueries.listActive`.

### The correction

**Affected file:** `lib/auth-hooks.ts` (Stage 2d Phase 1 §2.5)

**Before (Phase 1 deliverable as written):**

```typescript
const members = useQuery(
  api.orgMembers.listActive,
  session.data?.session?.activeOrganizationId ? {} : "skip",
);
```

**After (Path X corrected):**

```typescript
const members = useQuery(
  api.orgMembersQueries.listActive,
  session.data?.session?.activeOrganizationId ? {} : "skip",
);
```

**Diff:** 1 line. Single identifier change `orgMembers` → `orgMembersQueries`. No other shim code changes.

### Where this lives in the Phase 1 deliverable

`STAGE_2D_PHASE_1.md` §2.5 line 420 (within the full `lib/auth-hooks.ts` content block). Stage 3 application reads this amendment alongside Phase 1's main deliverable and applies the corrected reference.

For clarity at Stage 3 application time: the full corrected shim function (the affected portion only) is:

```typescript
export function useOrganization(
  _opts?: Record<string, unknown>,
) {
  const session = authClient.useSession();
  const orgQuery = authClient.useActiveOrganization();
  const members = useQuery(
    api.orgMembersQueries.listActive,   // ← Path X correction
    session.data?.session?.activeOrganizationId ? {} : "skip",
  );

  // ... rest of useOrganization unchanged ...
}
```

### Why a separate amendment doc rather than rewriting Phase 1

Three reasons:

1. **Stage 2d Phase 1's main deliverable is 1098 lines.** Rewriting the entire doc for a one-identifier change would create a misleading impression that more changed than actually did.
2. **The amendment is mechanically simple.** Stage 3 application can apply Phase 1 deliverable + this amendment in two reads — no need to merge or re-derive.
3. **Audit trail clarity.** GLM 5.1 produced the original Phase 1; the amendment documents human review identifying the Path X dependency. Keeping the original visible preserves the review history.

### Stage 3 application order

Stage 3 must apply, in order:

1. Stage 2c — all changes to `convex/orgMembers.ts` (existing functions migrate from `clerkClient()` to adapter)
2. Stage 2c.3 — create new file `convex/orgMembersQueries.ts` containing `listActive`
3. Stage 2c.3 — run `npx convex dev` (or build step) to regenerate `convex/_generated/api.ts` with the new `orgMembersQueries` namespace
4. Stage 2d Phase 1 — create `lib/auth-hooks.ts` using the corrected reference per this amendment (Path X identifier)
5. Stage 2d Phase 1 — update the 28 call site imports

Steps 2-4 must complete before TypeScript validation of the shim runs. Step 3 is the critical generation step — without it, `api.orgMembersQueries` will be undefined.

### Open questions (none new)

This amendment introduces no new open questions. The Phase 1 §6 open questions (5 items) and Stage 2c.3 §7 open questions (5 items, with #3 resolved by Path X) cover the remaining unknowns for Stage 3.

### Related docs

- `STAGE_2D_PHASE_1.md` — main Phase 1 deliverable (this amendment supersedes the `api.orgMembers.listActive` reference at §2.5 line 420)
- `STAGE_2C3_LIST_ACTIVE_QUERY.md` — Stage 2c.3 deliverable (Path X corrected version) — defines the new file `convex/orgMembersQueries.ts`
- `docs.convex.dev/functions/runtimes` — authoritative source on `"use node"` constraint

---

*End of Phase 1 §6.6 amendment.*
