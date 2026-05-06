# Stage 2b — Auth Helpers + Middleware Plan

**Produced:** 2026-05-06
**Locked base:** `docs/migration/clerk-to-better-auth/STAGE_1_ARCHITECTURE.md` §9 + `STAGE_2A_FOUNDATION.md`
**Scope:** Planning only — no installs, no source file modifications. All diffs are applied in Stage 3 alongside Stage 2a diffs.

---

## §1. Scope Summary

Stage 2b covers three files. `convex/lib/auth.ts` is simplified by deleting the three private helpers (`resolveOrgId`, `normalizeOrgRole`, `resolveOrgRole`) that existed solely to normalise Clerk's dual JWT format — dead code once Stage 2a's `definePayload` emits a single flat `orgId`/`orgRole` claim. Both public-facing helpers grow by 2 lines each because the `NO_ROLE` defensive guard (Stage 1 §3.5) adds an explicit check absent in the original. Net deletion is 24 lines. All four exported function signatures and the `OrgRole` type are byte-for-byte preserved, so the 43 caller sites are unaffected. `middleware.ts` is deleted in full per Stage 1 §9 Flag #3; the deletion is safe only if `app/(dashboard)/layout.tsx` has gained the `isAuthenticated()` guard from Stage 2d before or simultaneous with Stage 3 applying this deletion — this is a hard ordering constraint. `convex/lib/tenants.ts` cleanup is abandoned after reading both `getEmailLocalePublic` and `getForwardTemplatesPublic` in full: both functions intentionally return graceful defaults when identity is absent, and routing them through `getCallerIdentity(ctx)` would change that silent-return into a thrown error, breaking the public-query pattern. No change to `convex/lib/tenants.ts` is included in Stage 3.

---

## §2. `convex/lib/auth.ts` BEFORE/AFTER

### BEFORE (current file, all 82 lines)

```typescript
  1  import { ConvexError } from "convex/values";
  2  import type { GenericQueryCtx, GenericMutationCtx, GenericActionCtx } from "convex/server";
  3  import type { DataModel } from "../_generated/dataModel";
  4  
  5  type Ctx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;
  6  
  7  export type OrgRole = "org:admin" | "org:supervisor" | "org:agent";
  8  
  9  // Clerk v2 session tokens store org info in a compact nested object:
 10  //   { o: { id: "org_...", rol: "admin", slg: "..." } }
 11  // Older JWT template tokens used top-level camelCase claims:
 12  //   { orgId: "org_...", orgRole: "org:admin" }
 13  // We support both formats.
 14  
 15  function resolveOrgId(identity: Record<string, unknown>): string | undefined {
 16    const direct = identity.orgId as string | undefined;
 17    if (direct) return direct;
 18    const o = identity.o as { id?: string } | undefined;
 19    return o?.id;
 20  }
 21  
 22  // Clerk v2 compact format omits the "org:" prefix from role names.
 23  // Normalise to the full "org:…" form used throughout the codebase.
 24  function normalizeOrgRole(raw: string | null | undefined): OrgRole {
 25    if (!raw) return "org:agent";
 26    if (raw.startsWith("org:")) return raw as OrgRole;
 27    return `org:${raw}` as OrgRole;
 28  }
 29  
 30  function resolveOrgRole(identity: Record<string, unknown>): OrgRole {
 31    const direct = identity.orgRole as string | undefined;
 32    if (direct) return normalizeOrgRole(direct);
 33    const o = identity.o as { rol?: string } | undefined;
 34    return normalizeOrgRole(o?.rol);
 35  }
 36  
 37  export async function getCallerIdentity(ctx: Ctx | GenericActionCtx<DataModel>) {
 38    const identity = await ctx.auth.getUserIdentity();
 39    if (!identity) {
 40      throw new ConvexError("UNAUTHORIZED");
 41    }
 42    const orgId = resolveOrgId(identity as Record<string, unknown>);
 43    if (!orgId) {
 44      throw new ConvexError("NO_ORG");
 45    }
 46    return {
 47      tenantId: orgId,
 48      callerId: identity.subject,
 49      // Cast to string to preserve the type callers expect (they do their own
 50      // "admin" / "org:admin" checks against this value).
 51      orgRole: resolveOrgRole(identity as Record<string, unknown>) as string,
 52    };
 53  }
 54  
 55  export async function getCallerRole(ctx: Ctx | GenericActionCtx<DataModel>): Promise<OrgRole> {
 56    const identity = await ctx.auth.getUserIdentity();
 57    if (!identity) {
 58      throw new ConvexError("UNAUTHORIZED");
 59    }
 60    const orgId = resolveOrgId(identity as Record<string, unknown>);
 61    if (!orgId) {
 62      throw new ConvexError("NO_ORG");
 63    }
 64    const role = resolveOrgRole(identity as Record<string, unknown>);
 65    if (role !== "org:admin" && role !== "org:supervisor" && role !== "org:agent") {
 66      throw new ConvexError("FORBIDDEN");
 67    }
 68    return role;
 69  }
 70  
 71  export function assertAdmin(role: OrgRole): void {
 72    if (role !== "org:admin") {
 73      throw new ConvexError("FORBIDDEN");
 74    }
 75  }
 76  
 77  export function assertAdminOrSupervisor(role: OrgRole): void {
 78    if (role !== "org:admin" && role !== "org:supervisor") {
 79      throw new ConvexError("FORBIDDEN");
 80    }
 81  }
 82  
```

### AFTER (full file, all 58 lines)

```typescript
  1  import { ConvexError } from "convex/values";
  2  import type { GenericQueryCtx, GenericMutationCtx, GenericActionCtx } from "convex/server";
  3  import type { DataModel } from "../_generated/dataModel";
  4  
  5  type Ctx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;
  6  
  7  export type OrgRole = "org:admin" | "org:supervisor" | "org:agent";
  8  
  9  export async function getCallerIdentity(ctx: Ctx | GenericActionCtx<DataModel>) {
 10    const identity = await ctx.auth.getUserIdentity();
 11    if (!identity) {
 12      throw new ConvexError("UNAUTHORIZED");
 13    }
 14    const orgId = identity.orgId as string | undefined;
 15    if (!orgId) {
 16      throw new ConvexError("NO_ORG");
 17    }
 18    const orgRole = identity.orgRole as string | undefined;
 19    if (!orgRole) {
 20      throw new ConvexError("NO_ROLE");
 21    }
 22    return {
 23      tenantId: orgId,
 24      callerId: identity.subject,
 25      orgRole,
 26    };
 27  }
 28  
 29  export async function getCallerRole(ctx: Ctx | GenericActionCtx<DataModel>): Promise<OrgRole> {
 30    const identity = await ctx.auth.getUserIdentity();
 31    if (!identity) {
 32      throw new ConvexError("UNAUTHORIZED");
 33    }
 34    const orgId = identity.orgId as string | undefined;
 35    if (!orgId) {
 36      throw new ConvexError("NO_ORG");
 37    }
 38    const orgRole = identity.orgRole as string | undefined;
 39    if (!orgRole) {
 40      throw new ConvexError("NO_ROLE");
 41    }
 42    if (orgRole !== "org:admin" && orgRole !== "org:supervisor" && orgRole !== "org:agent") {
 43      throw new ConvexError("FORBIDDEN");
 44    }
 45    return orgRole;
 46  }
 47  
 48  export function assertAdmin(role: OrgRole): void {
 49    if (role !== "org:admin") {
 50      throw new ConvexError("FORBIDDEN");
 51    }
 52  }
 53  
 54  export function assertAdminOrSupervisor(role: OrgRole): void {
 55    if (role !== "org:admin" && role !== "org:supervisor") {
 56      throw new ConvexError("FORBIDDEN");
 57    }
 58  }
```

### Diff summary table

| Helper | BEFORE lines | AFTER lines | Change | Detail |
|---|---|---|---|---|
| Comment block (lines 9–13) | 5 | 0 | **Deleted** | Described Clerk dual-format support; now obsolete |
| Blank line 14 | 1 | 0 | **Deleted** | Separator before `resolveOrgId` |
| `resolveOrgId` (lines 15–20) | 6 | 0 | **Deleted** | Read `identity.orgId` OR `identity.o.id` — only `orgId` path survives |
| Blank line 21 | 1 | 0 | **Deleted** | Separator |
| `normalizeOrgRole` comment (lines 22–23) | 2 | 0 | **Deleted** | Described compact-format prefix normalisation |
| `normalizeOrgRole` (lines 24–28) | 5 | 0 | **Deleted** | Added `"org:"` prefix to Clerk v2 compact role strings |
| Blank line 29 | 1 | 0 | **Deleted** | Separator |
| `resolveOrgRole` (lines 30–35) | 6 | 0 | **Deleted** | Dispatched to `normalizeOrgRole` for either flat or compact path |
| Blank line 36 | 1 | 0 | **Deleted** | Separator before first export |
| `getCallerIdentity` (lines 37–53) | 17 | 19 | **Simplified (+2)** | Removed 3 helper calls; added direct reads + `NO_ROLE` guard |
| `getCallerRole` (lines 55–69) | 15 | 17 | **Simplified (+2)** | Same simplification; `FORBIDDEN` guard now reachable (see OQ below) |
| `assertAdmin` (lines 71–75) | 5 | 5 | **Unchanged** | Zero edits |
| `assertAdminOrSupervisor` (lines 77–81) | 5 | 5 | **Unchanged** | Zero edits |
| **Total** | **82** | **58** | **−24 lines** | |

### Preservation verification

The following are confirmed byte-for-byte identical between BEFORE and AFTER. Stage 3 can verify by grepping for each:

| Contract | BEFORE | AFTER | Status |
|---|---|---|---|
| `OrgRole` type | `"org:admin" \| "org:supervisor" \| "org:agent"` | Identical | **Preserved** |
| `getCallerIdentity` parameter | `ctx: Ctx \| GenericActionCtx<DataModel>` | Identical | **Preserved** |
| `getCallerIdentity` return shape | `{ tenantId: string; callerId: string; orgRole: string }` (inferred) | Identical (TypeScript narrows `string \| undefined` to `string` after guard) | **Preserved** |
| `getCallerRole` signature | `(ctx: Ctx \| GenericActionCtx<DataModel>): Promise<OrgRole>` | Identical | **Preserved** |
| `assertAdmin` signature | `(role: OrgRole): void` | Identical | **Preserved** |
| `assertAdminOrSupervisor` signature | `(role: OrgRole): void` | Identical | **Preserved** |
| Error identifier `"UNAUTHORIZED"` | `throw new ConvexError("UNAUTHORIZED")` | Identical, two occurrences | **Preserved** |
| Error identifier `"NO_ORG"` | `throw new ConvexError("NO_ORG")` | Identical, two occurrences | **Preserved** |
| Error identifier `"FORBIDDEN"` | `throw new ConvexError("FORBIDDEN")` | Identical, three occurrences | **Preserved** |
| Error identifier `"NO_ROLE"` | Does not exist | Added, two occurrences (new) | **New — Stage 1 §3.5** |

**Behavior change note on `FORBIDDEN` in `getCallerRole`:** In the BEFORE, `resolveOrgRole` had an `"org:agent"` fallback (line 25 of `normalizeOrgRole`), making the `FORBIDDEN` guard in `getCallerRole` unreachable — every call returned a valid `OrgRole`. In the AFTER, the `NO_ROLE` guard fires first for null/undefined `orgRole`, and `FORBIDDEN` fires for non-empty but non-matching strings (e.g., `"admin"` without prefix, or an unknown role). This is intentional: the original `FORBIDDEN` guard was dead code; the AFTER makes it live for the correct failure mode.

---

## §3. `middleware.ts` BEFORE/AFTER

### BEFORE (current file, all 25 lines)

```typescript
  1  import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
  2  
  3  const isPublicRoute = createRouteMatcher([
  4    "/",
  5    "/sign-in(.*)",
  6    "/sign-up(.*)",
  7    "/select-org",
  8    "/privacy(.*)",
  9    "/terms(.*)",
 10    "/dpa(.*)",
 11  ]);
 12  
 13  export default clerkMiddleware((auth, request) => {
 14    if (!isPublicRoute(request)) {
 15      auth.protect();
 16    }
 17  });
 18  
 19  export const config = {
 20    matcher: [
 21      "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
 22      "/(api|trpc)(.*)",
 23    ],
 24  };
 25  
```

### AFTER

**File deleted. AFTER state = file does not exist.**

No replacement file. No passthrough middleware. No `next.config.ts` matcher change. The file is removed from the repository entirely.

### Sequencing dependency

`middleware.ts` deletion and `app/(dashboard)/layout.tsx` receiving its `isAuthenticated()` guard (Stage 2d) are logically one unit of change. `middleware.ts` currently provides the only route-protection mechanism for `/inbox`, `/settings`, and all other dashboard routes. After deletion, the dashboard layout RSC must own this guard or those routes are unauthenticated.

**Stage 3 application order constraint:** `middleware.ts` must NOT be deleted before `app/(dashboard)/layout.tsx` has been updated with `if (!(await isAuthenticated())) redirect('/sign-in')`. The correct order within Stage 3 is:

1. Apply Stage 2d diff for `app/(dashboard)/layout.tsx` (adds `isAuthenticated()` guard)
2. Apply Stage 2b deletion of `middleware.ts`

Never the reverse. In practice, Stage 3 applies all sub-stage diffs in a single deployment, so the ordering is determined by the Stage 3 application order list — not by two separate deploys. There is no "window" where routes are unprotected as long as Stage 3 applies the diffs atomically in the listed order and deploys once.

### Stage 3 verification after deletion

After Stage 3 applies the deletion and deploys:

| Probe | Method | Expected result | What it confirms |
|---|---|---|---|
| `GET /` (unauthenticated) | Browser / curl | HTTP 200, renders marketing page | Public route still works without middleware |
| `GET /sign-in` (unauthenticated) | Browser | HTTP 200, renders sign-in form | Auth page still accessible |
| `GET /inbox` (unauthenticated) | Browser | Redirects to `/sign-in` | Dashboard layout `isAuthenticated()` guard fires |
| `GET /inbox` (valid session cookie) | Browser | HTTP 200, renders inbox | Authenticated user passes `isAuthenticated()` |
| `GET /settings/billing` (unauthenticated) | Browser | Redirects to `/sign-in` | Nested settings layouts also protected |
| `GET /api/auth/sign-in` | Browser | HTTP 200 or redirect to Better Auth flow | Auth Route Handler is reachable |

The absence of `middleware.ts` means the `matcher` config is also gone. The Next.js edge middleware no longer runs on any path. This is intentional — `isAuthenticated()` guards in RSC layouts provide protection without a middleware layer.

---

## §4. `convex/lib/tenants.ts` BEFORE/AFTER

### Decision: Refactor ABANDONED

After reading both function bodies in full, the refactor (routing through `getCallerIdentity`) is abandoned because it would change runtime behavior. Both functions are intentionally designed to return graceful defaults when the caller has no authenticated identity — they are public Convex queries. `getCallerIdentity` throws `ConvexError("UNAUTHORIZED")` on missing identity and `ConvexError("NO_ORG")` on missing orgId; substituting it would turn silent defaults into thrown errors for unauthenticated callers. The evidence from the function bodies follows.

**AFTER state = identical to BEFORE. No change to `convex/lib/tenants.ts` in Stage 3.**

### BEFORE — `getEmailLocalePublic` (lines 126–147 with 5 lines of surrounding context)

```typescript
126        en: "For better service, please contact our {{branchName}} branch at {{branchNumber}}",
127      };
128    },
129  });
130  
131  export const getEmailLocalePublic = query({
132    args: {},
133    handler: async (ctx): Promise<"ar" | "en"> => {
134      const identity = await ctx.auth.getUserIdentity();
135      if (!identity?.orgId) return "ar";
136      const tenant = await ctx.db
137        .query("tenants")
138        .withIndex("by_tenantId", (q) => q.eq("tenantId", identity.orgId as string))
139        .first();
140      return tenant?.emailLocale ?? "ar";
141    },
142  });
143  
144  export const updateEmailLocale = mutation({
145    args: { locale: v.union(v.literal("ar"), v.literal("en")) },
146    handler: async (ctx, args) => {
147      const { tenantId, orgRole } = await getCallerIdentity(ctx);
```

**Evidence for abandonment:** Line 135: `if (!identity?.orgId) return "ar"`. This is a defensive graceful default — no identity, no org in identity, or identity without orgId all return `"ar"` silently. If refactored to `const { tenantId } = await getCallerIdentity(ctx)`, this silent return becomes `throw new ConvexError("UNAUTHORIZED")` (missing identity) or `throw new ConvexError("NO_ORG")` (identity without org). Callers of this public query that call it before auth is fully initialised (e.g., loading locale for the sign-in page) would break.

### BEFORE — `getForwardTemplatesPublic` (lines 161–190 with 5 lines of surrounding context)

```typescript
161    const all = await ctx.db.query("tenants").collect();
162    return all.find((t) => t.paddle_subscription_id === args.subscriptionId) ?? null;
163  },
164  });
165  
166  export const getForwardTemplatesPublic = query({
167    args: {},
168    handler: async (ctx): Promise<{ ar: string; en: string }> => {
169      const identity = await ctx.auth.getUserIdentity();
170      if (!identity?.orgId) {
171        return {
172          ar: "للحصول على خدمة أفضل، تواصل مع فرع {{branchName}} على {{branchNumber}}",
173          en: "For better service, please contact our {{branchName}} branch at {{branchNumber}}",
174        };
175      }
176      const tenant = await ctx.db
177        .query("tenants")
178        .withIndex("by_tenantId", (q) => q.eq("tenantId", identity.orgId as string))
179        .first();
180      return tenant?.forwardMessageTemplates ?? {
181        ar: "للحصول على خدمة أفضل، تواصل مع فرع {{branchName}} على {{branchNumber}}",
182        en: "For better service, please contact our {{branchName}} branch at {{branchNumber}}",
183      };
184    },
185  });
186  
187  export const updateForwardTemplate = mutation({
188    args: { ar: v.string(), en: v.string() },
189    handler: async (ctx, args) => {
190      const { tenantId, orgRole } = await getCallerIdentity(ctx);
```

**Evidence for abandonment:** Lines 170–175: `if (!identity?.orgId) { return { ar: "...", en: "..." }; }`. Same pattern — returns hardcoded defaults when no identity. Used by the forward-message template preview before a tenant is authenticated or before their `tenants` row is populated. Same refactor risk as above.

**Correctness note (no action required):** Stage 1 §3.7 confirmed that `definePayload` in Stage 2a emits `orgId` under the key name `identity.orgId` — the same claim name both functions read at lines 135 and 170/178. Both functions will continue to read the correct value after Stage 3 deploys. No change is needed for correctness; the hygiene cleanup is deferred indefinitely.

---

## §5. Stage 3 Application Order Dependencies

The following ordering constraints must be respected when Stage 3 applies all sub-stage diffs:

- **`convex/lib/auth.ts` simplification must be deployed atomically with Stage 2a.** If `convex/lib/auth.ts` is simplified before `convex/auth.ts` (Stage 2a) is live and emitting `identity.orgId`/`identity.orgRole` flat claims, Clerk v2 compact tokens with only `identity.o.id`/`identity.o.rol` would fail with `NO_ORG` (since `resolveOrgId` is deleted). Stage 3 deploys everything in one Convex push, so this is satisfied automatically by the single-deployment model.

- **`middleware.ts` deletion must NOT precede `app/(dashboard)/layout.tsx` gaining its `isAuthenticated()` guard.** The layout RSC guard is Stage 2d scope. Within Stage 3's application order, Stage 2d diffs for `app/(dashboard)/layout.tsx` must be applied before `middleware.ts` is deleted. See §3 for verification steps.

- **`convex/lib/tenants.ts` — no ordering constraint.** Refactor abandoned; no change ships.

- **`assertAdmin` and `assertAdminOrSupervisor` are unchanged.** The 43 call sites that import them require no change and have no ordering dependency.

- **`NO_ROLE` behavior is a new throw path.** Any caller that currently receives a JWT with no `orgRole` claim (e.g., during the brief window between Stage 3 deploying `convex/lib/auth.ts` and `convex/auth.ts` being fully live) would see `NO_ROLE` rather than a silent fallback to `"org:agent"`. This is the correct behavior per Stage 1 §3.5, but it means the Convex and Next.js deploys in Stage 3 must be sequenced as one atomic push — not Convex first, then Next.js later with a gap.

---

## §6. Verification Steps for Stage 3

### After applying `convex/lib/auth.ts` diff

1. `npx tsc --noEmit` — must produce empty output. If any error references `convex/lib/auth.ts`, stop.
2. Spot-check 3 call sites from the Stage 0 §2.4 list:
   - `convex/conversations.ts:55` — calls `getCallerIdentity(ctx)`, destructures `{ tenantId }`. Compile must succeed without change.
   - `convex/channels.ts:154` — calls `getCallerIdentity(ctx)`, then `assertAdmin(orgRole as OrgRole)`. Compile must succeed.
   - `convex/export.ts:90` — calls `assertAdminOrSupervisor`, preceded by `getCallerRole`. Compile must succeed.
3. At runtime after Stage 3 deploys: sign in as `org:admin` user, call any mutation using `getCallerIdentity`, assert `tenantId` and `orgRole` are non-empty strings matching the expected values.
4. At runtime: sign in without setting an active org (edge case — new user before onboarding hook fires), assert the mutation throws `NO_ROLE` or `NO_ORG` rather than silently returning `"org:agent"`.

### After deleting `middleware.ts`

Use the probe table from §3. Specifically:
- `GET /inbox` unauthenticated → must redirect to `/sign-in` (proves layout guard is live)
- `GET /inbox` authenticated → must return 200 (proves guard passes valid session)
- `GET /` unauthenticated → must return 200 (proves public routes still work)

If `/inbox` unauthenticated returns 200 (no redirect), the dashboard layout guard is not installed — do not proceed with Stage 3 deployment.

### `convex/lib/tenants.ts`

No verification needed — no change planned. Existing test coverage (if any) continues to pass. The direct `identity.orgId` reads on lines 135 and 178 continue to work because `definePayload` emits `orgId` under the same key name.

---

## §7. Open Questions

**OQ-B1 — `FORBIDDEN` reachability in `getCallerRole` post-migration.** In the BEFORE, the `FORBIDDEN` guard (line 65) was unreachable because `resolveOrgRole` always returned a valid `OrgRole`. In the AFTER, it is reachable for non-empty but non-matching role strings. If Better Auth's colon role names (OQ-4 from Stage 2a, critical open question) fail and the org plugin instead emits bare strings like `"admin"`, every `getCallerRole` call would throw `FORBIDDEN` rather than matching. This is a Stage 3 day-one verification item carried over from Stage 2a. **If OQ-4 validates colon role names, the AFTER `getCallerRole` is correct. If OQ-4 fails and bare names are used instead, the `OrgRole` type and all three enum comparisons in `getCallerRole` must be updated — a larger Stage 3 scope change requiring Ahmed approval before the diff is applied.**

**OQ-B2 — `NO_ROLE` guard in `getCallerRole` vs `getCallerIdentity`.** Both functions now throw `NO_ROLE` on missing `orgRole`. A caller using `getCallerRole` specifically because it wanted only the role check will now also get `NO_ROLE` on top of `UNAUTHORIZED` and `NO_ORG`. This matches the intent (if `orgRole` is missing from the JWT, it is a configuration error, not a permissions error). No change to the plan — documenting for Stage 3 awareness.

**OQ-B3 — `getCallerRole` duplicate identity fetch.** `getCallerRole` fetches `identity` independently from `getCallerIdentity` — it does not delegate to `getCallerIdentity` internally. This was true in the BEFORE and is preserved in the AFTER per CLAUDE.md §30.3. An alternative design (call `getCallerIdentity(ctx)` and extract `orgRole`) would avoid the duplicate `getUserIdentity()` call but would change the structure in a way not requested. Noting for Stage 4 cleanup consideration — not a Stage 2b change.

**OQ-B4 — `convex/lib/tenants.ts` "Public" suffix caller inventory.** The abandoned refactor leaves both functions reading `identity?.orgId` directly. Stage 3 must confirm at least one caller of `getEmailLocalePublic` or `getForwardTemplatesPublic` actually calls them pre-auth (to validate the graceful-default pattern is still needed). If a future audit shows all callers are post-auth, the refactor can be reconsidered. Not blocking Stage 3.

---

## §8. Out of Scope (Explicit)

The following files were considered but are NOT in Stage 2b scope:

| File | Owner stage | Reason deferred |
|---|---|---|
| `convex/auth.ts` | Stage 2a | Already planned; foundation files |
| `convex/auth.config.ts` | Stage 2a | Already planned |
| `convex/http.ts` | Stage 2a | Already planned |
| `convex/convex.config.ts` | Stage 2a | Already planned |
| `convex/betterAuth/*` | Stage 2a | Already planned |
| `app/(dashboard)/layout.tsx` | Stage 2d | Sequencing dependency (must update BEFORE `middleware.ts` is deleted) |
| `app/page.tsx` and other RSC files | Stage 2d | Frontend |
| `convex/members.ts` | Stage 2c | 27 `clerkClient()` call sites |
| `convex/orgMembers.ts` | Stage 2c | `clerkClient()` call sites |
| `convex/lib/emailHelpers.ts` | Stage 2c | `clerkClient()` call sites |
| `convex/actions/validateInvite.ts` | Stage 2c | `clerkClient()` call sites |
| `convex/actions/roundRobin.ts` | Stage 2c | `clerkClient()` call site |
| `convex/onboarding.ts:ensureCreated` | Stage 2c | tenantId source change |
| `lib/utils.ts` `slugify()` | Stage 2c | Q10 slug helper |
| `lib/shell/role-utils.ts` Q8 supervisor branch fix | Stage 2d | Frontend |
| All hooks, providers, auth pages | Stage 2d | Frontend |
| `package.json` | Stage 2a | Already planned |
| `convex/_generated/*` | Never | Auto-generated |
