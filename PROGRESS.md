# WABDesk — Build Progress

> Single source of truth for project progress. Read by Claude Chat (project manager) to stay updated.
> **Last audited:** 2026-05-11 — WhatsApp Catalog Integration (4 stages + CRUD): product sync from Meta, manual product CRUD in settings, agent product browser in inbox, product card rendering in thread. See entry below.
> **Previously audited:** 2026-04-28 — Member profile modal, team presence, channel retention, React Email system, conversation search, batch actions, rate limiting, message scheduling, template library, legal pages, CSAT v2, departments.
> Never modify CLAUDE.md unless explicitly asked.

---

## Project Summary

**WABDesk** is an Arabic-first multi-agent WhatsApp Business platform built for SMBs in Arabic-speaking markets.  
**Stack:** Next.js 15 (App Router) · Convex (backend + real-time DB) · Clerk (auth + multi-tenant orgs) · shadcn/ui · Tailwind CSS v4 · Meta WhatsApp Cloud API · Paddle (billing integrated)  
**Current branch:** `feat/013-departments`  
**Build status:** ✅ No TypeScript errors · ✅ Convex schema deployed (31 tables) · ✅ Dev server runs · ✅ Outbound messages wired to Meta API · ✅ Broadcasts batched sending · ✅ React Email transactional system · ✅ Member profile modal complete · ✅ Tabbed transfer + cross-branch forward live · ✅ CSAT end-to-end working with score surfacing

---

## ✅ Completed Tasks

### 2026-05-09: Broadcasts UI Redesign + Scheduling Backend ✅

**Branch:** `feat/clerk-to-better-auth`

**Files modified:**
- `convex/schema.ts` — added `"scheduled"` to broadcasts status union; added `scheduledAt`, `deliveryRate`, `openRate`, `ctr` optional fields; added `.index("by_status_scheduled", ["status", "scheduledAt"])` for cron query
- `convex/broadcasts.ts` — `create` mutation accepts `scheduledAt?: number` (validates future timestamp; sets `status: "scheduled"` automatically); added `getDueScheduledInternal` (internalQuery, range query on new index); added `sendInternal` (internalAction, skips auth, only fires `"scheduled"` broadcasts); added `processScheduledBroadcastsInternal` (internalAction, cron entry point)
- `convex/crons.ts` — added `process-scheduled-broadcasts` cron every 1 minute → calls `processScheduledBroadcastsInternal`
- `components/broadcasts/broadcasts-page.tsx` — full redesign: header (title + subtitle + search + filter + "Create Campaign" CTA); Active Campaigns 2-col grid with `border-s-4` status color, progress bar, `deliveryRate`/`openRate`/`ctr` metric display (shows `--` when undefined); Recent History table with same metric columns; empty state; "Create Campaign" button opens modal
- `components/broadcasts/create-broadcast-modal.tsx` — NEW FILE: two-column Dialog (form left, WhatsApp preview right); recipients as tag-chip with list selector; channel selector; Meta/WABDesk template toggle; scrollable template list; variable fill-in; scheduling via date + time inputs (CTA becomes "Schedule Broadcast" when both filled); "Save Draft" saves without sending; success auto-closes modal

**Files created:**
- `components/broadcasts/create-broadcast-modal.tsx` (310 lines)

**Scheduling flow:**
1. User fills date + time in modal → CTA shows "Schedule Broadcast"
2. `create` mutation called with `scheduledAt` → DB stores `status: "scheduled"`
3. Cron runs every minute → `getDueScheduledInternal` finds overdue scheduled broadcasts → `sendInternal` fires each (snapshots contacts, transitions to "sending", schedules batch processor)
4. Batch processor handles actual Meta API calls (unchanged)

**Metric fields:**
- `deliveryRate`, `openRate`, `ctr` stored on broadcasts doc; currently `undefined` on all existing rows (shown as `--` in UI); ready to be populated by a future webhook/delivery-receipt processor

**Backward compat:** `/broadcasts/new` page and `CreateBroadcastWizard` unchanged — still used by `list-detail.tsx` (`?listId=xxx` flow). New modal is the primary create flow from the dashboard.

**TypeScript:** `npx tsc --noEmit` → exit 0, zero errors

---

### 2026-05-06: Clerk → Better Auth Migration — Stage 2a Part A Applied (Foundation Pre-Schema-Gen) ✅ CORRECTED

**Branch:** `feat/clerk-to-better-auth` (created from `feat/013-departments`)

**npm changes:**
- Installed: `@convex-dev/better-auth@0.12.2` (exact pin), `better-auth@~1.6.9` (resolves to 1.6.9)
- Uninstalled: `@clerk/nextjs@^7.2.5`, `@clerk/localizations@^4.5.8`, `@better-auth/infra@^0.2.5`
- `package-lock.json` regenerated

**Convex env vars set (dev deployment: determined-loris-556):**
- `BETTER_AUTH_SECRET` (generated via `openssl rand -base64 32` — value redacted)
- `SITE_URL=http://localhost:3000`
- Deferred — require Ahmed's credentials before runtime testing: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`
- Deferred — production deployment: When prod Convex deployment is created, `SITE_URL` on prod must be updated to the production domain; `NEXT_PUBLIC_CONVEX_SITE_URL` on Vercel must point to the prod deployment's `.site` URL (not the dev `eu-west-1` URL)

**Vercel / .env.local:**
- Added `NEXT_PUBLIC_CONVEX_SITE_URL=https://determined-loris-556.eu-west-1.convex.site` (eu-west-1 regional deployment)
- Note: `.env.local` manually updated by Ahmed (CLI write permission denied for .env files)
- `.gitignore` already excludes `.env.local` (line 18)

**Files created:**
- `convex/betterAuth/convex.config.ts` — 5 lines (component definition)
- `convex/convex.config.ts` — 7 lines (app definition with betterAuth component)
- `convex/betterAuth/auth.ts` — 29 lines (static export for CLI schema gen — NOT runtime; corrected to include `database: convexAdapter({} as any, {} as any)`)
- `convex/betterAuth/schema.ts` — 107 lines (CLI-generated via `npx auth generate` with Convex adapter; NOT manually written)

**Files modified:** none (package.json changes done via npm install/uninstall, not direct edit)

**Schema generation — corrected path:**
- Initial apply: `npx auth generate` failed with "memory is not supported" because `convex/betterAuth/auth.ts` had no `database:` key → better-auth defaulted to "memory" adapter → memory adapter lacks `createSchema`. Schema was then written manually (91 lines), which introduced 8 field-type errors against the test profile.
- Root cause: `convex/betterAuth/auth.ts` needed `import { convexAdapter } from "@convex-dev/better-auth"` and `database: convexAdapter({} as any, {} as any)`. Pattern sourced from `node_modules/@convex-dev/better-auth/dist/auth-options.js:15-16` (library's own internal schema-gen config, comment "This is the config used to generate the schema").
- Fix applied: auth.ts corrected, manual schema.ts deleted (`rm convex/betterAuth/schema.ts`), `cd convex/betterAuth && npx auth generate` re-run → generated 107-line `convex/betterAuth/schema.ts` with auto-generated header.
- `activeOrganizationRole` IS present in generated session table as `v.optional(v.union(v.null(), v.string()))` — §6 one-line fix was NOT needed.
- All 7 expected tables in generated output: `user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`

**C2 cross-check divergences (CLI output vs. test profile — resolved):**

| Divergence | Verdict |
|---|---|
| `invitation` 6 required fields | ✅ Accept CLI — test profile includes teams plugin (`teamId` present); org-only config makes these required |
| `organization.updatedAt` absent | ⚠️ Accept with OQ — see OQ-1 below |
| `member.updatedAt` absent | ⚠️ Accept with OQ — see OQ-1 below |
| Extra indexes (`member.role`, `invitation.role/status/inviterId`) | ✅ Accept CLI — performance choices, no correctness risk |
| `user.userId` index without field | ✅ Accept CLI — see V1 finding below |

**V1 investigation — `user.userId` index source identified:**
`node_modules/@convex-dev/better-auth/dist/client/create-schema.js:10-17` contains a hardcoded `indexFields` map:
```javascript
// Manually add fields to index on for schema generation,
// all fields in the schema specialFields are automatically indexed
export const indexFields = {
    ...
    user: [["email", "name"], "name", "userId"],
    ...
};
```
The `"userId"` entry is hardcoded for the user table for ALL configurations. `mergedIndexFields()` resolves it via `table.fields["userId"]?.fieldName ?? "userId"` — when no plugin adds `userId` to user (our config), the field lookup returns `undefined` and the fallback is the literal string `"userId"`, generating the index against a non-existent field.
Test profile (line 18/28): user table HAS `userId: v.optional(...)` as an optional field (added by a plugin in that config) AND the matching index — consistent. Our generated schema: index present, field absent — inconsistent, but intentional from the CLI's perspective.
Verdict: CLI-hardcoded forward-compat index. No TypeScript error. Whether Convex accepts an index on a field not declared in the schema is unknown until Phase 3 deploy — see OQ-2 below.

**Runtime verification OQs (deferred to Migration Phase 3):**
- **OQ-1 — `updatedAt` on org/member:** `organization.updatedAt` and `member.updatedAt` are absent from the CLI-generated schema. Verify during runtime testing whether better-auth ever attempts to write `updatedAt` to org or member records. If it does, Convex will reject the write and the schema needs the field added. Reference: `node_modules/@convex-dev/better-auth/src/client/adapter.ts` org plugin update operations.
- **OQ-2 — `user.userId` index at deploy:** The generated user table has `.index("userId", ["userId"])` but no `userId` field in the schema. Convex's deploy-time validation of index fields vs schema fields is unknown from static analysis. Verify at first `npx convex dev` run in Phase 3 — if Convex rejects it, remove the index line (single surgical edit to generated schema).

**TypeScript baseline:**
- All TS errors are `Cannot find module '@clerk/nextjs'` / `'@clerk/nextjs/server'` — expected, caused by uninstalling Clerk in Step 1
- Companion `TS7006 Parameter implicitly has any type` errors appear only inside those same Clerk-importing files — same root cause
- Zero errors in Part A's new files (`convex/betterAuth/`)
- These errors are owned by Stage 2b–2d call-site replacements — NOT Part A blockers

**Planning doc corrections needed:**
- `STAGE_2A_FOUNDATION.md` §5.3 specifies `convex/betterAuth/auth.ts` content but omits `database: convexAdapter({} as any, {} as any)` (and the corresponding `import { convexAdapter } from "@convex-dev/better-auth"`). This caused the `npx auth generate` "memory is not supported" error in initial Part A apply. The library's own `node_modules/@convex-dev/better-auth/dist/auth-options.js:15-16` documents this as the canonical schema-gen pattern. Defer to a planning-doc revision; do not silently edit during apply.

**Carry-over to Part B (Stage 2a Part B):**
- `convex/auth.ts` — create (§5.1)
- `convex/auth.config.ts` — modify (§4.3 AFTER)
- `convex/http.ts` — modify (§4.4 AFTER, adds `authComponent.registerRoutes`)
- `lib/auth-client.ts` — create (§5.4)
- `lib/auth-server.ts` — create (§5.5)
- `app/api/auth/[...all]/route.ts` — create (§5.6)

### 2026-05-07: Clerk → Better Auth Migration — Stage 2a Part B1 Applied (Convex Backend) ✅ CLOSED-PENDING-CODEGEN

**Files in scope (B1):**
- `convex/auth.ts` — NEW (176 lines; §5.1 content with Bug B + Bug C corrections applied)
- `convex/auth.config.ts` — MODIFIED (§4.3 AFTER; applied in prior session)
- `convex/http.ts` — MODIFIED (§4.4 AFTER, adds `authComponent.registerRoutes`; applied in prior session)

**TypeScript baseline after fixes:**
- `convex/auth.ts` errors: **3** — all `TS2339: Property 'betterAuth' does not exist on type '{}'` at lines 11, 92, 132. Root cause: Bug A (stale `_generated/api.d.ts` has `components: {}`). **Expected and accepted — codegen-pending.**
- Pre-existing Clerk errors (other files): **83** — unchanged from Part A baseline. All `TS2307 Cannot find module '@clerk/nextjs'` / `@clerk/nextjs/server'` + cascading `TS7006` implicit-any in same files. Owned by Stage 2c call-site replacements.
- Third-category errors (unrelated to codegen or Clerk): **0** ✓
- **Total: 86**

**Codegen status:**
`npx convex codegen` FAILED — blocked by 6 Convex files still importing `@clerk/nextjs/server`: `convex/lib/emailHelpers.ts`, `convex/teamPresence.ts`, `convex/orgMembers.ts`, `convex/members.ts`, `convex/actions/validateInvite.ts`, `convex/actions/roundRobin.ts`. These are **Stage 2c scope**, not Stage 2b. Codegen will re-run successfully after Stage 2c lands. All three Bug A residuals in `convex/auth.ts` will self-heal at that point.

**Bug resolutions:**

**Bug A (components.betterAuth typed as {}) — DEFERRED / codegen-pending.**
`_generated/api.d.ts:229` still shows `components: {}` because codegen can't run until Stage 2c clears the 6 Clerk-importing Convex files. After Stage 2c, `npx convex codegen` succeeds and `components.betterAuth` resolves to the full component API type. No code edit required — self-healing.

**Bug B (authComponent.adapter(ctx).findMany — incorrect pattern) — RUNTIME CORRECTED, type-pending.**
Root cause confirmed (pre-fix): `authComponent.adapter(ctx)` returns `AdapterFactory` (a callable), not a `DBAdapter` with `.findMany()`. Source: `node_modules/@convex-dev/better-auth/dist/client/create-client.d.ts` `SlimComponentApi` type.
Fix applied at two sites:
- `session.create.before` (line 92): replaced `authComponent.adapter(ctx).findMany({...})` → `ctx.runQuery(components.betterAuth.adapter.findMany, {...})`
- `session.update.before` (line 132): same swap, two-condition `where` array preserved
- Line 51 (`database: authComponent.adapter(ctx),`) left unchanged — that usage is correct (passes factory to `database:` config).
Type-pending: `components.betterAuth.adapter.findMany` won't resolve until Bug A clears (post-Stage-2c codegen).

**Bug C (ac.newRole({}) produces Role<never>) — RESOLVED.**
Root cause confirmed via `node_modules/better-auth/dist/plugins/access/access.d.mts` + `types.d.mts`:
- `createAccessControl({})` produces an `ac` where `TStatements = {}`, so `keyof TStatements = never`, so `K extends never`, so `newRole({})` returns `Role<never>` — incompatible with `roles?: { [key in string]?: Role<any> }`.
- `role<TStatements extends Statements>(statements: TStatements)` is standalone, accepts `{}`, returns `{ authorize: ..., statements: {} }` which satisfies `Role<any>` per `type Role<TStatements extends Statements = Record<string, any>> = { authorize: (request: any, ...) => ...; statements: TStatements; }`.
- `OrganizationOptions.ac` confirmed as `ac?: AccessControl | undefined` — optional. `role()` doesn't depend on any `ac` instance.
Fix applied:
1. Import changed: `import { createAccessControl }` → `import { role }` from `better-auth/plugins/access`
2. `const ac = createAccessControl({})` line removed entirely
3. Three role declarations: `ac.newRole({})` → `role({})`
4. `organization({ ac, roles: {...} })` → `organization({ roles: {...} })` — `ac,` parameter removed
Note: local `const role = (members[0]...)?.role` at line 139 shadows the imported `role` function within the `session.update.before` async callback scope — TypeScript strict mode does not error on variable shadowing (not a tsc option; ESLint-only rule).

**Verification gates:**
- Gate 2 (definePayload is synchronous, no DB access): PASS — `definePayload` function is still sync; all DB access remains in `databaseHooks`.
- Gate 4 (session.create.before hook present, auto-sets activeOrganizationId for single-org users): PASS-static — hook is present at lines 91–107; runtime verification deferred to Stage 3 integration test.

**Planning doc corrections needed:**
- `STAGE_2A_FOUNDATION.md` §5.1 lines 93 and 133: `authComponent.adapter(ctx).findMany({...})` is incorrect. `authComponent.adapter(ctx)` returns `AdapterFactory` (callable), not `DBAdapter`. Correct pattern: `ctx.runQuery(components.betterAuth.adapter.findMany, args)` per `SlimComponentApi` in `node_modules/@convex-dev/better-auth/dist/client/create-client.d.ts`. Both bugs caught at TypeScript baseline (B1 Gate 4); corrected in as-applied version.
- `STAGE_2A_FOUNDATION.md` §5.1 lines 21-23: `ac.newRole({})` from empty `createAccessControl({})` produces `Role<never>` due to TypeScript strict function type variance. Correct: `role({})` from `better-auth/plugins/access`. The `ac` parameter to `organization()` is optional and can be omitted when using standalone `role()`.
- Codegen sequencing: §5.1 implicitly assumed codegen could run before Stage 2c call-site replacements. This is false — codegen bundles the full Convex function tree and fails if any Convex file imports a non-bundlable package (`@clerk/nextjs/server`). Bug A self-heals after Stage 2c.

**Carry-over to Part B2 (Stage 2a Part B2):**
- `lib/auth-client.ts` — create (§5.4)
- `lib/auth-server.ts` — create (§5.5)
- `app/api/auth/[...all]/route.ts` — create (§5.6)

### 2026-05-07: Clerk → Better Auth Migration — Stage 2a Part B2 Applied (Next.js Auth Client + Server + Route) ✅ CLOSED-PENDING-CODEGEN

**Branch:** `feat/clerk-to-better-auth`

**Files created (3 new files, 0 existing files modified):**
- `lib/auth-client.ts` — 27 lines (§5.4 content with preemptive Bug C fix applied)
- `lib/auth-server.ts` — 14 lines (§5.5 content; applied verbatim — no divergences)
- `app/api/auth/[...all]/route.ts` — 3 lines (§5.6 content; applied verbatim — no divergences)

**Library cross-checks performed:**

| Symbol | Import path | Source verified | Result |
|---|---|---|---|
| `createAuthClient` | `better-auth/react` | `node_modules/better-auth/dist/client/react/index.d.mts:127` | ✓ exported |
| `convexClient` | `@convex-dev/better-auth/client/plugins` | `node_modules/@convex-dev/better-auth/dist/client/plugins/index.d.ts` → re-exports `../../plugins/convex/client.js` | ✓ exported |
| `organizationClient` | `better-auth/client/plugins` | `node_modules/better-auth/dist/client/plugins/index.d.mts:55` | ✓ exported |
| `role` | `better-auth/plugins/access` | `node_modules/better-auth/dist/plugins/access/access.d.mts:11` | ✓ exported (preemptive Bug C fix) |
| `convexBetterAuthNextJs` | `@convex-dev/better-auth/nextjs` | `node_modules/@convex-dev/better-auth/dist/nextjs/index.d.ts` | ✓ exported |
| `handler` (destructured) | return of `convexBetterAuthNextJs(...)` | same file; `handler: { GET: (request: Request) => Promise<Response>; POST: (request: Request) => Promise<Response>; }` | ✓ confirmed |
| All 7 return exports | `convexBetterAuthNextJs` | same file | ✓ all confirmed: `handler`, `preloadAuthQuery`, `isAuthenticated`, `getToken`, `fetchAuthQuery`, `fetchAuthMutation`, `fetchAuthAction` |

**Bugs caught and resolved:**

**Bug C carry-over in §5.4 — CAUGHT PREEMPTIVELY, FIXED.**
`STAGE_2A_FOUNDATION.md` §5.4 verbatim uses `createAccessControl({}) + ac.newRole({})` — the same `Role<never>` pattern that caused Bug C in B1's `convex/auth.ts`. Root cause is identical: empty `TStatements = {}` → `K extends never` → `newRole({})` returns `Role<never>`.
Fix applied:
1. Import changed: `import { createAccessControl }` → `import { role }` from `better-auth/plugins/access`
2. `const ac = createAccessControl({})` line removed entirely
3. Three role declarations: `ac.newRole({})` → `role({})`
4. `organizationClient` call: `ac` parameter verified as optional (`OrganizationClientOptions.ac?: AccessControl | undefined` per `node_modules/better-auth/dist/plugins/organization/client.d.mts`) → dropped
Citation: `OrganizationClientOptions.ac?: AccessControl | undefined` in `node_modules/better-auth/dist/plugins/organization/client.d.mts`.

**Planning doc corrections (appended to running list):**
- `STAGE_2A_FOUNDATION.md` §5.4: `createAccessControl({}) + ac.newRole({})` pattern repeated from §5.1; corrected per Bug C fix from B1. `organizationClient` `ac` parameter is optional (same as server-side `organization`); dropped.
- §5.5: No divergences found — all 7 destructured exports confirmed in installed `@convex-dev/better-auth@0.12.2` type definitions.
- §5.6: No divergences found — `handler` shape confirmed; `export const { GET, POST } = handler` destructuring pattern confirmed correct.

**TypeScript baseline:**
- `lib/auth-client.ts` errors: **0** ✓
- `lib/auth-server.ts` errors: **0** ✓
- `app/api/auth/[...all]/route.ts` errors: **0** ✓
- `convex/auth.ts` errors: **3** — Bug A codegen-pending residuals (unchanged from B1)
- Pre-existing Clerk errors (other files): **83** — unchanged
- Third-category errors: **0** ✓
- **Total: 86** — identical to B1 baseline

**Stage 2a status:** ✅ CLOSED-PENDING-CODEGEN — all 6 Part A files + 3 Part B1 files + 3 Part B2 files in place. Codegen unblocks after Stage 2c clears the 6 Clerk-importing Convex files (`convex/lib/emailHelpers.ts`, `convex/teamPresence.ts`, `convex/orgMembers.ts`, `convex/members.ts`, `convex/actions/validateInvite.ts`, `convex/actions/roundRobin.ts`). All Bug A TS residuals self-heal post-codegen.

### 2026-05-07: Clerk → Better Auth Migration — Stage 2b Applied (convex/lib/auth.ts JWT Shape) ✅ CLOSED-PENDING-CODEGEN

**Branch:** `feat/clerk-to-better-auth`

**File modified (1 file):**
- `convex/lib/auth.ts` — BEFORE: 82 lines → AFTER: 58 lines (−24 lines)

**Summary of change:**
`convex/lib/auth.ts` previously supported two Clerk JWT formats: legacy flat claims (`identity.orgId`, `identity.orgRole`) and Clerk v2 compact nested claims (`identity.o.id`, `identity.o.rol`). This dual-format support required three private helpers — `resolveOrgId`, `normalizeOrgRole`, and `resolveOrgRole` — plus a comment block explaining the Clerk token shapes. All three helpers are deleted in Stage 2b. Both public exported functions (`getCallerIdentity`, `getCallerRole`) now read flat claims directly: `identity.orgId as string | undefined` and `identity.orgRole as string | undefined`, matching the shape emitted by `definePayload` in `convex/auth.ts` (Stage 2a). `assertAdmin` and `assertAdminOrSupervisor` are byte-for-byte unchanged. All four exported function signatures and the `OrgRole` type are preserved identically — 43 call sites unaffected.

**Logic changes beyond JWT shape (both documented in `STAGE_2B_LIB_AUTH.md`):**
1. `NO_ROLE` guard added to both `getCallerIdentity` and `getCallerRole` — replaces the silent `"org:agent"` fallback from the deleted `normalizeOrgRole`. If `identity.orgRole` is falsy, `ConvexError("NO_ROLE")` is thrown. Intentional per Stage 1 §3.5.
2. `FORBIDDEN` guard in `getCallerRole` is now reachable for non-empty but unrecognized role strings. In the BEFORE this was dead code (every path through `normalizeOrgRole` returned a valid `OrgRole`). Documented in §2 and §7 OQ-B1 of the planning doc. Runtime risk: if Better Auth emits bare role names without `"org:"` prefix (OQ-4, unresolved), `getCallerRole` would throw `FORBIDDEN`. Stage 3 day-one verification required.

**Context7:** Not applicable — Stage 2b uses no external library API beyond Convex primitives (`ConvexError`, `ctx.auth.getUserIdentity()`).

**TypeScript baseline:**
- Pre-2b: **86** (83 pre-existing Clerk + 3 Bug A residuals in `convex/auth.ts`)
- Post-2b: **86** — identical
- `convex/lib/auth.ts` errors pre-2b: **0** (file was type-clean in BEFORE state)
- `convex/lib/auth.ts` errors post-2b: **0** — confirmed via targeted grep
- Delta: **0 new errors** — baseline unchanged

**Stage 2a status:** ✅ CLOSED-PENDING-CODEGEN (carry-over from B1/B2 — Bug A residuals in `convex/auth.ts:11,92,132` self-heal after Stage 2c clears Clerk imports from the 6 Convex files listed below).

**Carry-over to Stage 2c** (the 6 `clerkClient`-importing Convex files — must be cleared to unblock codegen):
- `convex/lib/emailHelpers.ts`
- `convex/teamPresence.ts`
- `convex/orgMembers.ts`
- `convex/members.ts`
- `convex/actions/validateInvite.ts`
- `convex/actions/roundRobin.ts`

**Open questions for Stage 3 runtime verification:**
- OQ-4 (carry-over from Stage 2a): verify Better Auth 1.6.9 organization plugin emits colon-prefixed role strings (`"org:admin"` etc.) — if bare strings are emitted, `getCallerRole` `FORBIDDEN` guard fires on every call and `OrgRole` type + comparisons must be updated before Stage 3 cutover.
- OQ-B1: `FORBIDDEN` reachability confirmed once OQ-4 is resolved.
- OQ-B2: `NO_ROLE` guard fires for missing `orgRole` — confirm this is correct behavior for new users pre-onboarding (expected to get `NO_ORG` first since `definePayload` sets `orgId` to `""` before `orgRole` is checked).

---

### 2026-05-07: Clerk → Better Auth Migration — Stage 2c.A Applied (Foundation Lib Helpers) ✅ CLOSED-PENDING-STAGE-2C-B

**Branch:** `feat/clerk-to-better-auth`

**Files modified (4 files):**
- `lib/utils.ts` — BEFORE: 6 lines → AFTER: 29 lines (+23 lines; `slugify` appended, `cn` untouched)
- `convex/lib/planLimits.ts` — BEFORE: 153 lines → AFTER: 153 lines (0 line count change; `assertAgentLimitNotReached` signature changed only)
- `convex/lib/lastAdmin.ts` — BEFORE: 19 lines → AFTER: 14 lines (−5 lines)
- `convex/lib/emailHelpers.ts` — BEFORE: 46 lines → AFTER: 60 lines (+14 lines)

**Summary of changes:**

- **`lib/utils.ts`:** Appended `slugify(name: string): string` — converts org names to URL-safe slugs with 5 regex transforms; falls back to `"org-" + 8-char crypto.randomUUID() suffix` for empty results (Arabic-only names strip to empty). Uses global `crypto.randomUUID()` (Web Crypto — no Node import). Required by Stage 2d onboarding flow. `cn` untouched byte-for-byte.

- **`convex/lib/planLimits.ts`:** `assertAgentLimitNotReached` signature changed from `(clerkOrgMemberships: { data: unknown[] }, plan: Plan)` → `(currentMemberCount: number, plan: Plan)`. Body changed from `clerkOrgMemberships.data.length >= limit` → `currentMemberCount >= limit`. No adapter call in this file — the change moves member-counting responsibility to the caller. No Clerk import was ever present in this file. **Protected file (CLAUDE.md §30.3) — Ahmed approval confirmed by stage prompt.**

- **`convex/lib/lastAdmin.ts`:** `assertNotLastAdmin` input type changed from Clerk membership shape (`{ data: Array<{ role: string; publicUserData?: { userId: string } | null }> }`) to Better Auth member shape (`Array<{ role: string; userId: string }>`). Role filter drops bare `"admin"` check (dead code post-migration; Better Auth emits `"org:admin"` only). `publicUserData?.userId` → `a.userId`. No adapter call in this file. No Clerk import was ever present.

- **`convex/lib/emailHelpers.ts`:** Removed `"use node"` (no Node.js APIs needed). Removed `clerkClient` import from `@clerk/nextjs/server`. Added `GenericActionCtx<DataModel>` type (from `convex/server` + `../_generated/dataModel`). Added `components` import from `../_generated/api`. All 3 exported functions (`getAdminEmails`, `resolveUserEmail`, `resolveOrgName`) gained `ctx: Ctx` as first parameter. Clerk calls replaced with `ctx.runQuery(components.betterAuth.adapter.findMany/findOne, ...)` — Bug B correction applied (see below). `getAdminEmails` additionally filters at query level (`role: "org:admin"` in the `where` clause) instead of post-filtering.

**Bug B preemptive correction — applied in `emailHelpers.ts` at all adapter call sites:**

Planning doc §2 prescribed: `const adapter = authComponent.adapter(ctx); adapter.findMany({...})` — identical Bug B pattern that failed in B1's `convex/auth.ts`. `authComponent.adapter(ctx)` returns `AdapterFactory` (callable), not a `DBAdapter` with `.findMany`. Source: `node_modules/@convex-dev/better-auth/dist/client/create-client.d.ts` `SlimComponentApi` type (confirmed: `adapter.findMany: FunctionReference<"query", "internal">`).

Corrected pattern applied at 4 call sites in `emailHelpers.ts`:
- Line 12: `ctx.runQuery(components.betterAuth.adapter.findMany, { model: "member", where: [...] })` — getAdminEmails member fetch
- Line 21: `ctx.runQuery(components.betterAuth.adapter.findOne, { model: "user", where: [...] })` — getAdminEmails user lookup (inside Promise.all map)
- Line 40: `ctx.runQuery(components.betterAuth.adapter.findOne, { model: "user", where: [...] })` — resolveUserEmail
- Line 52: `ctx.runQuery(components.betterAuth.adapter.findOne, { model: "organization", where: [...] })` — resolveOrgName

**Library cross-checks:**

| Query | Library | Finding |
|---|---|---|
| `ctx.runQuery(components.betterAuth.adapter.findMany, args)` usage | `/get-convex/better-auth` | Confirmed: `ctx.runQuery(components.betterAuth.someFile.someFunction, args)` is the documented pattern for calling component functions. `SlimComponentApi.adapter.findMany: FunctionReference<"query", "internal">` — callable via `ctx.runQuery`. |
| `findMany` argument shape (`model`, `where`, `limit`, `sortBy`) | `/websites/better-auth` | Confirmed: `model` (required), `where` (required), `limit` (optional), `sortBy` (optional), `offset` (optional). Array-of-conditions `where` format matches planning doc §2. |
| `authComponent.adapter(ctx)` purpose | `/get-convex/better-auth` | Confirmed: returns Better Auth-compatible database adapter for passing to `betterAuth({ database: authComponent.adapter(ctx) })`. NOT for direct `.findMany()` calls. Planning doc §2 Bug B confirmed. |

**Planning doc corrections (running list — appended):**

Previous corrections: §5.1 Bug B (authComponent.adapter(ctx) pattern), §5.1 Bug C (ac.newRole({}) → role({})), §5.3 missing `database:` key, §5.4 Bug C repeat.

**Stage 2c global planning-doc bug (§2 adapter pattern):** `const adapter = authComponent.adapter(ctx); adapter.findMany({...})` is incorrect throughout all of Stage 2c. `authComponent.adapter(ctx)` returns `AdapterFactory` (callable for `database:` config), not a `DBAdapter`. Correct: `ctx.runQuery(components.betterAuth.adapter.findMany, args)`. Same Bug B as §5.1; applies across all of Stage 2c wherever the planning doc prescribes the `adapter.findMany/findOne/create/update/delete` pattern. Cite: `SlimComponentApi` in `node_modules/@convex-dev/better-auth/dist/client/create-client.d.ts`.

**Stage 2c §3 (`planLimits.ts`):** No Bug B correction needed — function has no adapter calls. Change is purely a signature type refactoring (Clerk membership object → numeric count). No planning doc correction needed for §3.

**Stage 2c §4 (`lastAdmin.ts`):** No Bug B correction needed — function has no adapter calls. Input type change only. No planning doc correction needed for §4.

**Stage 2c §5 (`emailHelpers.ts`) caller note:** §5 AFTER's signatures add `ctx: Ctx` as first parameter. The planning doc's §6 and §7 describe the corresponding caller updates (`notifyEmail.ts`, `channelRetentionAction.ts`). Those callers are Stage 2c.B scope — the 9 TS2554 cascade errors they generate in this intermediate state are expected and tracked below.

**TypeScript baseline:**

- Pre-2c.A: **86** (83 Clerk + 3 Bug A in `convex/auth.ts`)
- Post-2c.A: **94**
- Delta: **+8**

Delta justification:
- `convex/lib/emailHelpers.ts`: −5 Clerk errors (1 TS2307 + 4 TS7006) → resolved by removing `@clerk/nextjs/server` import
- `convex/lib/emailHelpers.ts`: +4 Bug A errors (TS2339: Property 'betterAuth' does not exist on type '{}' at lines 12, 21, 40, 52) — codegen-pending, same class as `convex/auth.ts` Bug A residuals
- `convex/actions/notifyEmail.ts`: +7 TS2554 "Expected 2 arguments, but got 1" — cascade from `emailHelpers.ts` signature change (callers now missing `ctx` arg)
- `convex/actions/channelRetentionAction.ts`: +2 TS2554 "Expected 2 arguments, but got 1" — same cascade
- `lib/utils.ts`, `convex/lib/planLimits.ts`, `convex/lib/lastAdmin.ts`: 0 new errors each ✓

Note: Stage prompt predicted 80–83. Actual post-2c.A is 94. The discrepancy: (a) `lastAdmin.ts` never had Clerk imports so its change removes zero Clerk errors — the prompt assumed it might have had some; (b) the 9 TS2554 cascade errors from callers were not accounted for in the estimate. These callers (`notifyEmail.ts`, `channelRetentionAction.ts`) ARE Stage 2c.B scope — resolving them in Stage 2c.B will drop 9 errors, returning to a count near 85 (94 − 9 = 85).

In-scope file targeted grep (clean except Bug A in emailHelpers.ts):
```
convex/lib/emailHelpers.ts(12,57): TS2339 — Bug A (codegen-pending)
convex/lib/emailHelpers.ts(21,33): TS2339 — Bug A (codegen-pending)
convex/lib/emailHelpers.ts(40,48): TS2339 — Bug A (codegen-pending)
convex/lib/emailHelpers.ts(52,47): TS2339 — Bug A (codegen-pending)
```

`lib/utils.ts`, `convex/lib/planLimits.ts`, `convex/lib/lastAdmin.ts` — zero errors. ✓

**Carry-over to Stage 2c.B** (6 files — resolves 9 TS2554 cascade + remaining Clerk errors):
- `convex/actions/notifyEmail.ts` — add `ctx` to 7 call sites (§6)
- `convex/actions/channelRetentionAction.ts` — add `ctx` to 2 call sites (§7)
- `convex/emails/templates/invitation.tsx` — new file (§4.4 fallback path, if OQ-C3.2 resolves to fallback)

**Carry-over to Stage 2c.C** (5 files — zero-diff verify or apply):
- `convex/orgMembers.ts` — 5 clerkClient() call sites (§8)
- `convex/members.ts` — 11 clerkClient() call sites (§9)
- `convex/teamPresence.ts` — 1 clerkClient() call site (§10)
- `convex/actions/validateInvite.ts` — 1 clerkClient() call site (§11)
- `convex/actions/roundRobin.ts` — 1 clerkClient() call site (§12)
- `convex/onboarding.ts` — zero-diff verify (§2.2 of Gap Closer — confirmed Clerk-free)

---

### 2026-05-07: Clerk → Better Auth Migration — Stage 2c.B Applied (Actions + Email Infrastructure) ✅ CLOSED-PENDING-STAGE-2C-C

**Branch:** `feat/clerk-to-better-auth`

**Files modified (5 files) + created (1 file):**
- `convex/actions/notifyEmail.ts` — MODIFIED (7 call sites updated: `getAdminEmails`, `resolveOrgName`, `resolveUserEmail` each gain `ctx` as first arg)
- `convex/actions/channelRetentionAction.ts` — MODIFIED (2 call sites: `getAdminEmails(channel.tenantId)` → `getAdminEmails(ctx, channel.tenantId)`)
- `convex/actions/validateInvite.ts` — MODIFIED (~74 lines; Clerk block replaced with Better Auth adapter calls)
- `convex/actions/roundRobin.ts` — MODIFIED (fallback branch only; import + agentIds.length === 0 block rewritten)
- `convex/actions/sendEmail.ts` — MODIFIED (3 surgical additions: import, SUBJECTS entry, buildElement case)
- `convex/emails/templates/invitation.tsx` — CREATED (new file, ~93 lines; bilingual AR+EN React Email template)

**Summary:**

Stage 2c.B resolves the 9 TS2554 cascade errors introduced by Stage 2c.A (which changed `emailHelpers.ts` function signatures to add `ctx` as first parameter). The two caller files — `notifyEmail.ts` (7 sites) and `channelRetentionAction.ts` (2 sites) — now pass `ctx` through correctly, eliminating the cascade.

`validateInvite.ts` and `roundRobin.ts` (fallback branch only) are migrated from `clerkClient()` to the Bug B-corrected adapter pattern (`ctx.runQuery/runMutation(components.betterAuth.adapter.X, args)`). Both Clerk imports are removed. The `OrgRole` type import in `validateInvite.ts` was also dropped (unused after changing `link.defaultRole as OrgRole` → `link.defaultRole as string`).

`sendEmail.ts` gains the `"invitation"` template route (3 additive regions, no other lines changed). `invitation.tsx` is a new React Email template with bilingual AR+EN rendering (both sections always rendered — not if/else) and Apple-blue `#0071E3` CTA using `Button` directly from `@react-email/components` (not `WaButton`, which is hardcoded green).

**Bug B correction — confirmed at all adapter call sites in Stage 2c.B files:**

- `convex/actions/validateInvite.ts` line 26: `ctx.runQuery(components.betterAuth.adapter.findMany, {...})` — member fetch
- `convex/actions/validateInvite.ts` line 35: `ctx.runQuery(components.betterAuth.adapter.findOne, {...})` — org name lookup
- `convex/actions/validateInvite.ts` line 44: `ctx.runMutation(components.betterAuth.adapter.create, {...})` — member creation
- `convex/actions/roundRobin.ts` line 42: `ctx.runQuery(components.betterAuth.adapter.findMany, {...})` — member list
- `convex/actions/roundRobin.ts` line 53: `ctx.runQuery(components.betterAuth.adapter.findOne, {...})` — user name lookup

**Additional correction beyond task description:** The task prompt stated `ctx.runQuery` for all adapter calls including `create`. Node_modules type verification (`node_modules/@convex-dev/better-auth/dist/client/create-client.d.ts` line 38) shows `create: FunctionReference<"mutation", "internal">`. Applied `ctx.runMutation` for `create` to avoid a runtime boundary violation. This is a correction to the planning doc, not a behavioral change. Same pattern applies for `updateOne`, `updateMany`, `deleteOne`, `deleteMany` in Stage 2c.C.

**Also confirmed from node_modules:** The Convex adapter API method names are `create`, `findOne`, `findMany`, `updateOne`, `updateMany`, `deleteOne`, `deleteMany` — NOT `update`/`delete` (singular). Stage 2c.C files (`orgMembers.ts`, `members.ts`) that use `adapter.update` and `adapter.delete` per the planning doc must use `updateOne`/`deleteOne` instead.

**Library cross-checks performed:**

| Query | Library | Finding |
|---|---|---|
| `ctx.runQuery(components.betterAuth.adapter.findMany, args)` pattern (reuse from 2c.A) | `/get-convex/better-auth` | Confirmed — same Bug B correction, no re-query needed |
| `adapter.create` return shape | `/websites/better-auth` | Confirmed: returns created record with `id` field (not `_id`). No explicit throw on duplicate documented. |
| `adapter.create` function type | node_modules grep | `create: FunctionReference<"mutation", "internal">` → use `ctx.runMutation` |

**OQ-C5 status:** `adapter.create` does not throw on duplicate per published docs (no error documented). The explicit pre-check in `validateInvite.ts` (`alreadyMember` check before insert) is safe and harmless regardless. Deferred to Phase 3 runtime verification to confirm.

**Behavioral changes flagged:**

- §11's "already member" check pattern: BEFORE used try/catch on Clerk's `createOrganizationMembership` error message; AFTER checks `members.find(m => m.userId === userId)` before inserting. Same user-facing result: early return with `{ orgId, orgName }` if already a member. No behavioral change visible to caller.
- OQ-C5 deferred to Phase 3 runtime testing as noted in planning doc.

**Cascade resolution:**

- Pre-2c.A baseline: 86 errors (83 Clerk + 3 Bug A in `convex/auth.ts`)
- Post-2c.A: 94 errors (+9 TS2554 cascade from `emailHelpers.ts` signature change)
- All 9 TS2554 cascade errors RESOLVED in Stage 2c.B ✓

**TypeScript baseline:**

- Pre-2c.B: **94**
- Post-2c.B: **85**
- Delta: **−9**

Delta breakdown by category:
- −9 TS2554 cascade (notifyEmail: 7, channelRetentionAction: 2) — RESOLVED
- −1 TS2307 validateInvite.ts (Clerk import removed)
- −1 TS2307 roundRobin.ts (Clerk import removed)
- −3 TS7006 roundRobin.ts (`.filter((m) =>`, `.sort((a, b) =>` implicit-any params eliminated)
- +3 TS2339 Bug A validateInvite.ts (lines 26, 35, 44 — `components.betterAuth` codegen-pending)
- +2 TS2339 Bug A roundRobin.ts (lines 42, 53 — `components.betterAuth` codegen-pending)

In-scope file targeted greps:
- `notifyEmail.ts`: 0 errors ✓ (all 7 cascade resolved)
- `channelRetentionAction.ts`: 0 errors ✓ (all 2 cascade resolved)
- `sendEmail.ts`: 0 errors ✓
- `invitation.tsx`: 0 errors ✓
- `validateInvite.ts`: 3 Bug A errors (expected, codegen-pending)
- `roundRobin.ts`: 2 Bug A errors (expected, codegen-pending)
- `@clerk` errors in validateInvite + roundRobin: 0 ✓

**Carry-over to Stage 2c.C** (5 files — final clerkClient elimination; clearing these unblocks codegen and eliminates all Bug A residuals):
- `convex/orgMembers.ts` — 5 clerkClient() call sites (§8)
- `convex/members.ts` — 11 clerkClient() call sites (§9)
- `convex/teamPresence.ts` — 1 clerkClient() call site (§10)
- `convex/actions/validateInvite.ts` — 0 remaining Clerk imports (done in 2c.B)
- `convex/actions/roundRobin.ts` — 0 remaining Clerk imports (done in 2c.B)
- `convex/onboarding.ts` — zero-diff verify (Clerk-free per Stage 2c.1 §2.2)

After Stage 2c.C, `npx convex codegen` will succeed, `_generated/api.d.ts` will populate `components.betterAuth`, and all 12 Bug A TS2339 residuals (auth.ts: 3, emailHelpers.ts: 4, validateInvite.ts: 3, roundRobin.ts: 2) self-heal.

Note for Stage 2c.C: planning doc uses `adapter.update` and `adapter.delete` — apply as `updateOne` and `deleteOne` (confirmed method names from `create-client.d.ts`).

---

### 2026-05-07: Clerk → Better Auth Migration — Stage 2c.C.1 Applied (Member Queries + Team Presence + New listActive) ✅ CLOSED-PENDING-STAGE-2C-C2

**Branch:** `feat/clerk-to-better-auth`

**Files modified (2) + created (1) + verified-no-change (1):**
- `convex/members.ts` — MODIFIED (11 Clerk call sites → Bug B-corrected adapter calls; Clerk import removed)
- `convex/teamPresence.ts` — MODIFIED (1 Clerk call site → Bug B-corrected adapter calls; interface renamed, map renamed)
- `convex/orgMembersQueries.ts` — CREATED (new file; `listActive` query for Stage 2d auth-hooks shim)
- `convex/onboarding.ts` — VERIFIED ZERO-DIFF (confirmed no Clerk references — matches Stage 2c.1 §2.4 verdict)

**Summary:**

Stage 2c.C.1 clears Clerk from `convex/members.ts` (11 call sites) and `convex/teamPresence.ts` (1 call site), and creates the new `convex/orgMembersQueries.ts` file with the `listActive` query. All Stage 2c planning doc adapter calls used `authComponent.adapter(ctx)` (Bug B broken pattern); all applied with Bug B correction using `ctx.runQuery`/`ctx.runMutation` on `components.betterAuth.adapter.*` references directly.

`convex/orgMembersQueries.ts` was placed in a separate file from `convex/orgMembers.ts` because Convex's runtime rules prohibit `query`/`mutation` declarations in `"use node"` files (per Stage 2c.3 §2.2 architectural constraint). Confirmed from Convex type definitions: `GenericQueryCtx` includes `runQuery` at line 195 of `node_modules/convex/dist/esm-types/server/registration.d.ts`, so `ctx.runQuery(components.betterAuth.adapter.findMany, ...)` IS valid from inside a query handler.

**Bug B correction — confirmed at every adapter call site:**

`convex/members.ts` (16 call sites):
- Line 31: `ctx.runQuery(components.betterAuth.adapter.findOne, {...})` — getMemberProfile member
- Line 41: `ctx.runQuery(components.betterAuth.adapter.findOne, {...})` — getMemberProfile user
- Line 97: `ctx.runQuery(components.betterAuth.adapter.findOne, {...})` — updateMemberRole member
- Line 107: `ctx.runMutation(components.betterAuth.adapter.updateOne, {...})` — updateMemberRole write
- Line 160: `ctx.runQuery(components.betterAuth.adapter.findOne, {...})` — removeMember member
- Line 170: `ctx.runMutation(components.betterAuth.adapter.deleteOne, {...})` — removeMember delete
- Line 190: `ctx.runQuery(components.betterAuth.adapter.findOne, {...})` — updateMemberChannels member
- Line 200: `ctx.runQuery(components.betterAuth.adapter.findOne, {...})` — updateMemberChannels user
- Line 258: `ctx.runQuery(components.betterAuth.adapter.findOne, {...})` — updateMemberDepartments member
- Line 268: `ctx.runQuery(components.betterAuth.adapter.findOne, {...})` — updateMemberDepartments user
- Line 361: `ctx.runMutation(components.betterAuth.adapter.updateOne, {...})` — updateMemberDisplayName
- Line 394: `ctx.runMutation(components.betterAuth.adapter.updateOne, {...})` — updateMemberAvatarFromStorage
- Line 422: `ctx.runMutation(components.betterAuth.adapter.updateOne, {...})` — updateMemberAvatarFromUrl
- Line 447: `ctx.runMutation(components.betterAuth.adapter.updateOne, {...})` — removeMemberAvatar
- Line 476: `ctx.runQuery(components.betterAuth.adapter.findOne, {...})` — disableAccount
- Line 510: `ctx.runQuery(components.betterAuth.adapter.findOne, {...})` — enableAccount

`convex/teamPresence.ts` (2 call sites):
- Line 41: `ctx.runQuery(components.betterAuth.adapter.findMany, {...})` — member list
- Line 48: `ctx.runQuery(components.betterAuth.adapter.findOne, {...})` — per-user lookup in Promise.all

`convex/orgMembersQueries.ts` (2 call sites in new file — Bug B correction applied to §3.1's `authComponent.adapter(ctx)` pattern):
- `ctx.runQuery(components.betterAuth.adapter.findMany, {...})` — member list
- `ctx.runQuery(components.betterAuth.adapter.findOne, {...})` — per-user lookup in Promise.all

**Method-name corrections confirmed:**
- `updateOne` used throughout (NOT `update`) ✓
- `deleteOne` used in `removeMemberFromOrganization` (NOT `delete`) ✓
- No `update`, `delete`, `updateMany`, or `deleteMany` calls used

**Library cross-checks performed (literal output):**

From `node_modules/@convex-dev/better-auth/dist/client/create-client.d.ts`:
```
41:        updateOne: FunctionReference<"mutation", "internal">;
42:        updateMany: FunctionReference<"mutation", "internal">;
43:        deleteOne: FunctionReference<"mutation", "internal">;
44:        deleteMany: FunctionReference<"mutation", "internal">;
```
→ Confirms `updateOne`/`deleteOne` are mutations → `ctx.runMutation` applied correctly.

From `node_modules/convex/dist/esm-types/server/registration.d.ts` line 195:
```
runQuery: <Query extends FunctionReference<"query", "public" | "internal">>(query: Query, ...args: OptionalRestArgs<Query>) => Promise<FunctionReturnType<Query>>;
```
→ Confirms `GenericQueryCtx` HAS `runQuery` → `ctx.runQuery` valid from query handler in `orgMembersQueries.ts`.

**Planning doc corrections (running list — appended):**
- Method names: `updateOne`/`deleteOne` (not `update`/`delete`) — applies to all of Stage 2c (from 2c.B)
- Runner distinction: `ctx.runQuery` for reads, `ctx.runMutation` for writes (from 2c.B)
- Stage 2c §9 AFTER uses `authComponent.adapter(ctx)` (Bug B broken pattern) — corrected to `ctx.runQuery/runMutation(components.betterAuth.adapter.X, ...)` throughout
- Stage 2c.3 §3.1 uses `authComponent.adapter(ctx)` (Bug B broken pattern) — same correction applied

**Behavioral changes flagged:**
- `getMemberProfile`: `firstName`/`lastName` now return `null` (Better Auth stores single `name` field). Existing callers in Stage 2d must handle null split-names.
- `updateMemberAvatarFromStorage`: No longer downloads blob and re-uploads to Clerk CDN. Stores Convex Storage URL directly. Avatar domain changes from Clerk CDN to `storage.convex.cloud`.
- `updateMemberAvatarFromUrl`: No longer downloads+re-uploads. Stores source URL directly. Source URL must be stable.
- `teamPresence.ts`: `ClerkMemberInfo.clerkRole` renamed to `MemberInfo.role`. `clerkMembers` Map renamed to `memberMap`. Clerk role normalization (`"admin"` → `"org:admin"`) removed — Better Auth already emits full form.

**Zero-diff verification — `convex/onboarding.ts`:**
Reading the file confirmed: zero `clerkClient` or `@clerk` references. File is auth-library-agnostic (uses `tenantId` as opaque string from `getCallerIdentity`, writes to Convex tables only). Matches Stage 2c.1 §2.4 verdict verbatim. No changes made.

**TypeScript baseline:**
- Pre-2c.C.1: **85**
- Post-2c.C.1: **94**
- Delta: **+9**

Delta breakdown:
- −9 Clerk errors resolved (members.ts: 1 TS2307 + ~5 TS7006 implicit-any from Clerk API callbacks; teamPresence.ts: 1 TS2307 + ~2 TS7006)
- +16 Bug A TS2339 from members.ts (16 adapter call sites)
- +2 Bug A TS2339 from teamPresence.ts (2 adapter call sites)
- 0 errors from orgMembersQueries.ts (new file not yet in `_generated/api.d.ts` because codegen hasn't run; tsconfig excludes `convex/` directory so unreferenced new files aren't compiled)
- 0 errors from onboarding.ts (zero-diff)

Note: Task prompt predicted ~78-80. Actual is 94. Discrepancy: Bug A count was 18 (not 4-8 as estimated) because members.ts has 16 adapter call sites across 11 functions, not 3-6 as predicted.

Targeted grep verification:
- Clerk @clerk errors in convex/members.ts or convex/teamPresence.ts: 0 ✓ (grep false-positive was `department-members.tsx` whose `.tsx` extension matches `members\.ts` pattern)
- orgMembersQueries.ts errors: 0 ✓ (not yet type-checked — not in api.d.ts)
- onboarding.ts errors: 0 ✓ (zero-diff, no change)
- convex/orgMembers.ts Clerk errors: 1 TS2307 remaining ✓ (Stage 2c.C.2 scope)

**Codegen status:** Still blocked. `convex/orgMembers.ts` holds the last `@clerk/nextjs/server` import in the convex directory. Codegen will unblock after 2c.C.2 clears it.

**Carry-over to Stage 2c.C.2:** `convex/orgMembers.ts` only (5 clerkClient() call sites — §8). After 2c.C.2 closes, run `npx convex codegen` to regenerate `_generated/api.d.ts` → adds `betterAuth` to `components` type → all Bug A TS2339 residuals (auth.ts: 3, emailHelpers.ts: 4, validateInvite.ts: 3, roundRobin.ts: 2, members.ts: 16, teamPresence.ts: 2, plus future ones from orgMembersQueries.ts) self-clear.

---

### 2026-05-06: Clerk → Better Auth Migration — Stage 2d Phase 2 Planning (Auth Pages Rebuild + Org Components + Accept-Invite)

**Planning only — no source files modified. All diffs applied in Stage 3.**

Produced `docs/migration/clerk-to-better-auth/STAGE_2D_PHASE_2.md` (comprehensive planning doc, ~2200 lines).

**Phase 2 scope: 7 files (6 rewrites + 1 new)**
- `app/(auth)/sign-in/[[...sign-in]]/page.tsx` — REWRITE custom form replacing `<SignIn>` component
- `app/(auth)/sign-up/[[...sign-up]]/page.tsx` — REWRITE custom form replacing `<SignUp>` component
- `app/select-org/page.tsx` — REWRITE minimal `<OrganizationList>` rebuild (D5=B: no avatars/role/activity)
- `app/join/[token]/page.tsx` — REWRITE (replace `<SignIn>` JSX with redirect to unified sign-in)
- `app/accept-invite/[invitationId]/page.tsx` — CREATE (NEW file for Better Auth invitation acceptance, state machine: loading → unauthenticated → ready → accepting → accepted/error)
- `components/shell/user-menu.tsx` — REWRITE (`<SignOutButton>` + `<OrganizationSwitcher>` custom rebuilds)
- `components/onboarding/step-workspace-name.tsx` — REWRITE (`<CreateOrganization>` → custom form)

**Discovery findings (§1):**
- **§1.1 Verbatim reads:** All 6 existing files read; 1 new file confirmed as non-existent
- **§1.2 Design tokens extracted:** 40+ tokens from current `appearance` props (primary color #0071E3, card glassmorphism rgba(255,255,255,0.88) with backdrop-blur-24, button rounded-full, shadows, typography)
- **§1.3 Per-page authClient methods:** Mapped all 7 files to their Better Auth client methods (signIn.email, signIn.social, signUp.email, useListOrganizations, organization.create, organization.setActive, useSession, acceptInvitation, rejectInvitation, signOut)
- **§1.4 Post-action redirects:** Confirmed all success paths (sign-in → /inbox or ?redirectTo, sign-up → /onboarding, org select → /inbox, org create → /onboarding, accept-invite → /inbox, sign-out → /)
- **§1.5 i18n + RTL:** Current codebase uses inline bilingual strings (Arabic-first, slash-separated); no `lib/i18n.ts` exists; no locale provider visible; Phase 2 preserves inline pattern
- **§1.6 OAuth config:** Stage 2a planned `convex/auth.ts` with Google/Facebook social providers; file doesn't exist yet (planning-only); Phase 2 pages call authClient methods, no page-level config needed
- **§1.7 Scope confirmed:** 7 files in scope; Phase 3 files (provider swap, dashboard guard, role-utils Q8, UI deletion) explicitly deferred

**Design tokens synthesized (§2):**
- Colors: primary #0071E3 + variants, text #1D1D1F/#6E6E73, surfaces (card rgba(255,255,255,0.88), input rgba(0,0,0,0.04)), social buttons (Google light, Facebook #1877F2)
- Typography: font-family "-apple-system, BlinkMacSystemFont, 'SF Pro Display'..." for English; Cairo/Tajawal for Arabic (per CLAUDE.md)
- Sizing: card border-radius 22px, input border-radius 12px, button border-radius full, card max-width ~420px
- Effects: backdrop-filter blur(24px) saturate(180%), box-shadow 0 2px 6px rgba(0,0,0,0.04), ... 0 30px 60px rgba(0,0,0,0.06)

**Per-page structural outlines (§3):**
- **§3.1 sign-in:** Form with email + password inputs, Google/Facebook social buttons, "Forgot password?" link (no handler v1), error display, link to sign-up
- **§3.2 sign-up:** Form with name + email + password, same social buttons, link to sign-in, 8-char min password requirement
- **§3.3 select-org:** List of existing orgs (click to setActive + /inbox), separator, create new workspace section (name input + create button), empty state (if no orgs)
- **§3.4 accept-invite (NEW):** State machine (loading → unauthenticated → ready → accepting → accepted/error); unauthenticated redirects to /sign-in?redirectTo=/accept-invite/[id]; ready shows "{inviter} invited you to {org}" with Accept/Reject buttons; error states for expired, not-found, email-mismatch
- **§3.5 join:** Redirect to /sign-in?redirectTo=/join/[token] when not signed in; preserve existing validateAndJoin logic + error states (INVITE_INVALID, PLAN_LIMIT, ALREADY_MEMBER)
- **§3.6 user-menu:** Keep avatar + profile modal trigger; replace `<OrganizationSwitcher>` with custom dropdown (org list + click to setActive + create new workspace link); replace `<SignOutButton>` with custom button calling authClient.signOut()
- **§3.7 step-workspace-name:** Replace `<CreateOrganization>` with custom form (name input + create button); preserve useEffect that calls ensureCreated() on orgId change

**Dependency chain (§5):**
- Phase 2 assumes Stage 2a creates `lib/auth-client.ts`, `convex/auth.ts` (not yet created — planning-only)
- Phase 2 assumes Phase 1 creates `lib/auth-hooks.ts` shim (not yet created — planning-only)
- Phase 2 assumes Stage 2c.1 adds `lib/utils.ts:slugify` (not yet created — planning-only)
- None of these prerequisites exist; all created in Stage 3 apply

**Open questions (10 flagged in §6):**
- OQ-2d1: Better Auth's `getInvitation()` method signature (needed for accept-invite page)
- OQ-2d2: Better Auth's `rejectInvitation()` method (if exists)
- OQ-2d3: Post-reject navigation target (/sign-in vs /select-org)
- OQ-2d4: `signOut()` redirect parameter (callbackURL vs manual router.push)
- OQ-2d5: OAuth redirect error handling + error URL pattern
- OQ-2d6: Locale detection mechanism (cookie, path, header, or default Arabic)
- OQ-2d7: Stage 2a's `lib/auth-client.ts` file content (expected export pattern)
- OQ-2d8: Phase 1's shim hook name (useAuth vs useSession)
- OQ-2d9: `useListOrganizations()` exact return type
- OQ-2d10: `organization.create()` return shape (id extraction for setActive)

**Files NOT in scope (§4):** Provider swap, clerk-provider delete, dashboard guard, role-utils Q8, avatar/ban UI deletion — all Phase 3

**Phase 2 ready for Phase 3 apply after OQ resolution.**

**Revised 2026-05-06 (after Phase 2 planning review):**
- **B1 resolved:** `lib/i18n/context.tsx` confirmed (`useT()`, `useLocale()`, `LocaleProvider`). `LocaleProvider` mounted in `app/layout.tsx` wrapping all routes including `app/(auth)/...`. Locale from cookie `"locale"` (defaults to `"ar"`). Arabic font is IBM Plex Sans Arabic via `--font-arabic` CSS var (not Cairo/Tajawal). All Phase 2 pages corrected to use `useT()` not legacy slash-separated strings. OQ-2d6 closed.
- **B2/B4 resolved:** Verified in `better-auth` dist types (`dist/plugins/organization/routes/crud-invites.d.mts`). `getInvitation({ id })` returns `{ ..., organizationName, organizationSlug, inviterEmail }` — no `inviterName` field (UI uses `inviterEmail` instead). `acceptInvitation({ invitationId })` and `rejectInvitation({ invitationId })` both exist. OQ-2d1 and OQ-2d2 closed. §3.4.3 updated with verified shapes.
- **B3 resolved:** 4 inferred tokens removed or flagged. `cardBorderLight` dropped (not in `appearance` props). `cardPadding`, `cardMaxWidth`, `inputBorderDefault` flagged as Clerk-internal defaults with planned values; marked `[verify Phase 3]`.
- **A1 applied:** "Forgot password?" link removed from sign-in form for v1. Better Auth has `requestPasswordReset` endpoint; post-launch addition only.
- **A2 applied:** "Settings" link removed from OrganizationSwitcher dropdown (`/settings/org` route unconfirmed).
- **A3 applied:** §2.2 now commits to Tailwind-only (no `style=` props). Token objects are Tailwind class strings. Long shadow value → `globals.css` CSS var + `shadow-[var(...)]`.
- **A4 applied:** §9 Phase 3 preview now includes audit note for `validateAndJoin`'s `ctx.auth.getUserIdentity()` under Better Auth.
- **OQ-2d4 closed:** `signOut` uses `fetchOptions.onSuccess` callback for redirect.
- **Remaining hard blockers:** OQ-2d7 (lib/auth-client.ts create pattern — `better-auth/react` vs `@convex-dev/better-auth/client`), OQ-2d8 (Phase 1 shim export name). Both need cross-referencing Phase 1 doc before Phase 3 apply.

**Revised 2026-05-06 (after final approval — OQ-2d7 + OQ-2d8 closures):**
- **OQ-2d7 CLOSED:** Stage 2a §5.4 (lines 1058–1095) specifies `lib/auth-client.ts` uses `createAuthClient` from `"better-auth/react"` with `convexClient()` + `organizationClient()` plugins. All Phase 2 calls to `authClient.useSession()` are correct against this client.
- **OQ-2d8 CLOSED:** Phase 1 §2.5 (lines 331–412) specifies `lib/auth-hooks.ts` exports `useAuth()`, `useUser()`, `useOrganization()` in Clerk-compatible shape. All three internally call `authClient.useSession()` + `authClient.useActiveOrganization()` and translate the shape. No `useSession` is exported from the shim.
- **§1.8 added:** New canonical "Hook Source Per Phase 2 File" table added to doc. Per-file mapping: 4 files use native `authClient` (sign-in, sign-up, select-org, accept-invite); 1 uses shim only (join); 2 use a mix (user-menu, step-workspace-name). Rule documented: shim for Phase 1-touched code paths; native `authClient` for net-new code.
- **§3.5, §3.6, §3.7 updated:** Explicit imports blocks added. `join/[token]` uses shim only. `user-menu` shows both `useAuth, useUser` from `@/lib/auth-hooks` + `authClient` from `@/lib/auth-client`. `step-workspace-name` shows `useAuth` from shim + `authClient` from native.
- **§5 prerequisite table updated:** `lib/auth-hooks.ts` row corrected — `accept-invite` removed (uses native, not shim); `step-workspace-name` added. Stage 2a §5.4 line range (1058–1095) and Phase 1 §2.5 line range (331–412) cited.
- **§6 OQ table updated:** OQ-2d7 and OQ-2d8 moved to CLOSED table. "OPEN: Hard blockers" section removed (no remaining hard blockers). All 8 OQs are now accounted for: 6 closed, 4 soft flags.
- **No remaining hard blockers. Phase 2 planning complete. Ready for Phase 3 apply.**

### 2026-05-06: Clerk → Better Auth Migration — Stage 2c.1 Gap Closer

**Planning only — no source files modified. All diffs applied in Stage 3.**

Produced `docs/migration/clerk-to-better-auth/STAGE_2C1_GAP_CLOSER.md`. Closes three gaps from Stage 2c:

- **`convex/onboarding.ts` BEFORE/AFTER**: Verdict **(A) zero-line diff** — file has no Clerk imports, no `^org_` format checks, no tenantId length validation, no external API calls; auth-library-agnostic; tenantId is an opaque string stored directly in Convex tables.
- **`lib/utils.ts:slugify` added**: File exists (6 lines, `cn` only). `slugify` appended at line 8. Uses global `crypto.randomUUID()` fallback for Arabic/non-Latin org names that produce empty slug after stripping. No `import { randomUUID } from "node:crypto"` — browser-safe. Five test-case traces included in doc.
- **`sendInvitationEmail` wiring resolved**: Callback signature confirmed single-argument (no `ctx`). Option (b) chosen — direct Resend `fetch` call inside the callback. Inline HTML bilingual template (AR primary, EN secondary) via `buildInvitationEmailHtml` helper defined at module scope in `convex/auth.ts`. No React Email — callback runs in Convex edge runtime (no `"use node"`).
- **`auth.api.inviteMember` pattern established**: `inviteByEmail` corrected — `adapter.create` → `auth.api.inviteMember({ body: { organizationId, email, role }, headers })`. OQ-C3.2 flagged: synthetic headers construction from Convex action ctx is uncertain; three candidate approaches documented; fallback (`adapter.create` + `ctx.scheduler.runAfter`) provided.
- **`inviteByWhatsApp` corrected**: Stage 2c §8.4 OQ-C3 concern was unfounded — `inviteByWhatsApp` does not create email invitations in the current source code (uses shareable link tokens via `inviteLinks` table). Only change: member-count `adapter.findMany` replaces `getOrganizationMembershipList`.
- **`validateAndJoin` confirmed**: `adapter.create({ model: "member" })` in Stage 2c §11 is correct — no member lifecycle hooks in `convex/auth.ts`; manual `agentWelcomeEmail` dispatch unchanged.
- **Stage 2c §14 OQ-C3 closed**: Adapter writes bypass hooks by design. API layer owns all side effects. New OQ-C3.2 raised for synthetic-headers pattern.
- **Two product decisions logged**: D1 (`assertAgentLimitNotReached` signature `{ data: unknown[] }` → `number`) approved. D2 (Q2 avatar = Option B rewrite — keep backend functions, remove UI buttons) confirmed.

Stage 2d ready to open after review.

- task/038-auth-migration-stage-2c-2: Stage 2c.1 Gap C resolution — Path B implementation plan. Planning only; no installs, no source modifications. Produced docs/migration/clerk-to-better-auth/STAGE_2C2_PATH_B.md with: §1 discovery output (existing email infrastructure verified — actual send-action at convex/actions/sendEmail.ts, templates directory at convex/emails/templates/, signature table from real file content: templateKey=v.string() open, variables=Record<string,string>, locale=union("ar"|"en"), from-address routing by template category), §2 convex/auth.ts:sendInvitationEmail reverted to no-op stub with explanatory comment (Stage 2c.1 §4.1 buildInvitationEmailHtml helper deleted — not added to Stage 3 apply), §3 convex/actions/sendEmail.ts adds "invitation" template key (1 import + 4 lines to SUBJECTS + 2 lines to buildElement switch — additive only; no validator change needed since templateKey is v.string()), §4 convex/emails/templates/invitation.tsx NEW bilingual AR/EN React Email template mirroring existing conventions (inline styles, WaEmailLayout+WaSection+Button, Apple-blue #0071E3 CTA, always renders both language sections in one email), §5 convex/orgMembers.ts:inviteByEmail third revision (adapter.create + ctx.scheduler.runAfter — deterministic, no synthetic headers gamble). Stage 2c §8.1 + Stage 2c.1 §4.1 §4.4 superseded. Stage 2c.1 §4.5 §4.6 §4.7 stand. Four new OQs logged (2c2-A: adapter.create return shape/id field; 2c2-B: accept-invite route path; 2c2-C: inviter.name reliability; 2c2-D: hardcoded locale "ar" for invitation email). Stage 2d ready to open after review.

- task/037-auth-migration-stage-2c-1: Stage 2c gap closer for Clerk → Better Auth migration. Planning only; no installs, no source modifications. Produced docs/migration/clerk-to-better-auth/STAGE_2C1_GAP_CLOSER.md with: convex/onboarding.ts BEFORE/AFTER (verdict: zero-line diff), lib/utils.ts:slugify added with Arabic-empty crypto.randomUUID fallback, sendInvitationEmail wiring resolved—auth.api.inviteMember pattern established for invitation creation (supersedes Stage 2c §8.1 adapter.create approach; §8.4 corrected — no invitation creation in inviteByWhatsApp), direct Resend call used for email send (inline HTML, no React Email — edge runtime constraint), no invitation email template file created (inline HTML in auth.ts callback), Stage 2c §14 OQ-C3 closed (partial — OQ-C3.2 new open question on synthetic headers). Two product decisions logged (D1: assertAgentLimitNotReached signature change approved; D2: Q2 avatar = Option B rewrite — no avatar function deletions). Stage 2d ready to open after review.

---

### 2026-05-06: Clerk → Better Auth Migration — Stage 2c Planning (clerkClient() call sites)

**Planning only — no source files modified. All diffs applied in Stage 3.**

Produced `docs/migration/clerk-to-better-auth/STAGE_2C_CLERK_CLIENT_SITES.md` (1037 lines). Covers the complete replacement plan for all 22 `clerkClient()` call sites across 6 Convex files.

**Files inventoried (in scope for Stage 3 diffs):**

- `convex/orgMembers.ts` — 5 actions: `inviteByEmail`, `list`, `changeRole`, `inviteByWhatsApp`, `removeMember`
- `convex/members.ts` — 11 actions: `getMemberProfile`, `updateMemberRole`, `removeMemberFromOrganization`, `updateMemberChannels`, `updateMemberDepartments`, `updateMemberDisplayName`, `updateMemberAvatarFromStorage`, `updateMemberAvatarFromUrl`, `removeMemberAvatar`, `disableAccount`, `enableAccount`
- `convex/teamPresence.ts` — `listWithDepartments` (missed from Stage 2b's scope list)
- `convex/lib/emailHelpers.ts` — all 3 exported functions gain `ctx` parameter; callers in `notifyEmail.ts` and `channelRetentionAction.ts` updated
- `convex/actions/validateInvite.ts` — `validateAndJoin`
- `convex/actions/roundRobin.ts` — fallback branch in `assignRoundRobin`

**Helper type changes required:**

- `convex/lib/planLimits.ts:assertAgentLimitNotReached` — input type `{ data: unknown[] }` → `number` (**requires Ahmed approval** — §30.3 protected file)
- `convex/lib/lastAdmin.ts:assertNotLastAdmin` — input type changes from Clerk membership shape to `Array<{ role: string; userId: string }>`

**Key behavioral changes documented:**

- Member names: Clerk's `firstName`+`lastName` split → single Better Auth `user.name` string
- Avatar upload: Clerk CDN binary re-upload → Convex Storage URL or direct URL stored
- Role normalization: `"admin"` → `"org:admin"` normalization removed (Better Auth emits full colon form already)
- Invitation emails: Clerk-hosted email → Better Auth `sendInvitationEmail` hook → WabDesk React Email system

**Open questions blocking Stage 3 apply:**

- **OQ-C3 (critical):** Whether direct `adapter.create({ model: "invitation" })` triggers Better Auth's `sendInvitationEmail` hook. If not, `inviteByEmail` must call `auth.api.organization.inviteMember` (HTTP path) instead.
- **OQ-C4:** Whether frontend components destructure `firstName`/`lastName` from `getMemberProfile` separately.
- **OQ-C5:** Whether `adapter.create` is idempotent on duplicate member (userId+organizationId).

**Migration stage summary:**
| Stage | Doc | Status |
|---|---|---|
| Stage 0 — Inventory | `STAGE_0_INVENTORY.md` | ✅ Done |
| Stage 1 — Architecture | `STAGE_1_ARCHITECTURE.md` | ✅ Done |
| Stage 2a — Foundation files | `STAGE_2A_FOUNDATION.md` | ✅ Done |
| Stage 2b — Auth helpers + middleware | `STAGE_2B_LIB_AUTH.md` | ✅ Done |
| Stage 2c — clerkClient() sites | `STAGE_2C_CLERK_CLIENT_SITES.md` | ✅ Done |
| Stage 2d — Frontend | Not started | ⬜ |
| Stage 3 — Apply all diffs | — | ⬜ |

### 2026-05-05: 032-design-tokens-foundation — Status + Shadow token vocabulary added to globals.css

Added the Apple+Stitch design-system token vocabulary (status and shadow) to `app/globals.css` as pure additions — no existing token values were changed. This is Phase 1 of the WABDesk design system foundation; Phase 2 (Inbox pilot component updates) will consume these tokens.

**Files modified:** `app/globals.css` only

**Tokens added:**

- **Status (`:root`):** `--success` `#059669`, `--success-foreground` `#059669`, `--warning` `#d97706` (amber-600, WCAG AA on white ~3.4:1), `--warning-foreground` `#d97706`, `--info` `var(--primary)`, `--info-foreground` `var(--primary)`
- **Status (`.dark`):** `--success` `#34d399`, `--success-foreground` `#34d399`, `--warning` `#fbbf24`, `--warning-foreground` `#fbbf24`, `--info` `var(--primary)`, `--info-foreground` `var(--primary)`
- **Status (`@theme inline`):** `--color-success`, `--color-success-foreground`, `--color-warning`, `--color-warning-foreground`, `--color-info`, `--color-info-foreground` — enables `bg-success`, `text-warning`, etc. as Tailwind utilities
- **Shadows (`:root`):** `--shadow-xs` 4% opacity, `--shadow-sm` 6%/4% two-layer, `--shadow-md` 8%/4% two-layer (Apple-minimal aesthetic)
- **Shadows (`.dark`):** identical values to light (transparent-black shadows are dark-surface-safe; Phase 2 can tune if needed)

**Explicit non-changes (all preserved verbatim):** `--primary`, `--background`, `--radius`, `--shadow-level-2`, `--shadow-level-3`, all sidebar tokens, all chart tokens, all message-bubble tokens, all Clerk badge overrides, all animation keyframes

**Architectural decision — shadow token placement:** `--shadow-xs`/`--shadow-sm`/`--shadow-md` are in `:root` + `.dark` only, NOT in `@theme inline`. Pre-audit found 11 existing `shadow-sm`/`shadow-md` utility usages across 7 components (`tabs.tsx`, `sidebar.tsx`, `message-bubble.tsx` ×3, `conversation-list.tsx`, `searchable-select.tsx`, `select.tsx`, `message-action-menu.tsx`). Adding these to `@theme inline` would silently override Tailwind's native shadow utilities at those 11 sites. New consumers reference them via `shadow-[var(--shadow-xs)]`, matching the existing `shadow-[var(--shadow-level-2)]` pattern in `card.tsx`.

**Line count:** BEFORE 242 lines → AFTER 274 lines (+32 lines: 8 Change A + 5 Change B + 8 Change C + 5 Change D + 6 Change E; the +2 vs Stage 2's estimate of ~30 comes from the blank-line separators between new sections for visual consistency with the file's existing section pattern)

**TypeScript:** 0 errors

**Forward note:** Phase 2 (Inbox pilot) will migrate hardcoded colors (`text-amber-500`, `text-red-500`, etc.) to `text-warning`, `text-destructive` etc., and swap `shadow-sm` calls in new components to `shadow-[var(--shadow-sm)]` where Apple-minimal depth is appropriate.

### 2026-05-05: SLA Breach Clearing — Verification + Doc Cleanup (No Code Change)

Originally scoped as a bug fix (PROJECT_STATE.md §5 issue #2: "SLA breach clearing logic unclear"). Stage-gated investigation revealed the clearing was already fully implemented — the §5 entry was stale documentation drift, not an unfixed bug. Scope was re-narrowed to verification + docs only.

- Verified 6 clearing paths in `convex/messages.ts` (sendReply:105, sendQuotedReply:724, sendLocationReply:409, insertMediaMessage:562, createInbound:284) and `convex/inbox.ts` (sendMessage:237)
- Verified 4 edge-case paths correctly do NOT clear: scheduled message dispatch, CSAT auto-send, broadcast batch send, automation auto-response
- Updated `convex/sla.ts` file-level comment (lines 9–15): now lists all 6 clearing paths + 6 non-clearing paths explicitly; previously listed 5 paths and was missing `createInbound` reopen branch
- Removed stale §5 issue #2 from PROJECT_STATE.md; added `### ✅ SLA Breach Clearing` documentation section to §4; corrected SLA Monitoring status ⚠️ → ✅; added §8 session entry; renumbered Medium Priority items 2–6
- TypeScript: 0 errors (comment-only edit)

### Core Infrastructure

**Multi-Tenant Auth (Clerk + Convex)**

- Clerk Organizations = tenants; `orgId` = `tenantId` everywhere
- Roles: `org:admin`, `org:supervisor`, `org:agent` — enforced server-side in every Convex query/mutation
- JWT validated in Convex via `auth.getUserIdentity()`
- Middleware: all dashboard routes protected; public: `/`, `/sign-in`, `/sign-up`, `/select-org`
- Files: `middleware.ts`, `convex/lib/auth.ts` (auth helpers), `lib/shell/role-utils.ts`

**Convex Schema (31 tables, all real)**
All tables are real, indexed, and used by live queries:
`tenants`, `channels`, `contacts`, `contactLists`, `broadcasts`, `conversations`, `messages`, `quickReplies`, `inviteLinks`, `customFields`, `followUps`, `contactEvents`, `notifications`, `metaTemplates`, `onboardingState`, `conversationMetrics`, `automationRules`, `businessHours`, `ruleFireLog`, `conversationLabels`, `channelMembers`, `csatSettings`, `messageTemplates`, `broadcastTemplates`, `departments`, `departmentMembers`, `webhook_events`, `rateLimits`, `presence`, `memberActionLog`, `memberProfiles`

**Plan Limits (server-side enforced)**

- `convex/lib/planLimits.ts` — every plan-gated mutation checks tenant plan
- Limits: agents (3/5/15/∞), channels (1/2/5/∞), automation rules (2/10/30/∞), contact lists (3/10/∞/∞), message templates (0/10/50/∞)
- Round-robin, CSAT, SLA: Growth+ only
- Broadcasts: Starter+ only; supervisor role: Starter+ only

**Access Token Encryption**

- AES-256-GCM encryption for WhatsApp access tokens at rest
- `convex/lib/encryption.ts` — encrypt/decrypt helpers; token decrypted only in Convex actions, never returned to client

---

### Onboarding Flow

- Multi-step wizard: create org → connect WhatsApp → invite team → complete
- Progress tracked in `onboardingState` table
- `convex/onboarding.ts`: `getState`, `ensureCreated`, `markStep`, `markComplete`
- Steps: `StepWorkspaceName`, `StepConnectWhatsApp`, `StepInviteTeam`, `StepComplete`
- WhatsApp Embedded Signup (Meta FB SDK popup → token exchange → `channels.create`)
- Pages: `/onboarding`, `/accept-invite`, `/join/[token]`, `/select-org`

---

### WhatsApp Channel Management

- **Schema fields:** `phoneNumberId`, `displayPhone`, `displayName`, `wabaId`, `accessToken` (encrypted), `assignmentMode`, `roundRobinIndex`, `status`, `slaThresholdMinutes`, `slaEnabled`
- `convex/channels.ts`: full CRUD + `setAssignmentMode`, `setSlaThreshold`, `incrementRoundRobinIndex`, `setAccessToken` (encrypts), `disconnectChannel` (revokes Meta webhook subscription)
- Reconnecting a number reuses existing `channelId` — preserves conversation history
- Pages: `/settings/channels`, `/settings/channels/[channelId]`

---

### Inbox (Multi-Agent Shared Inbox)

- **Real-time** via Convex `useQuery` subscriptions — no polling
- `convex/inbox.ts`: `listConversations` (filter: all/mine/unassigned/unread, contactStage), `getMessages`, `markAsRead`, `markAsUnread`, `updateStatus`, `getInternalNotesByContact`
- `convex/conversations.ts`: `listForCaller`, `get`, `assign`, `assignInternal`, `createIfNeeded`
- `convex/messages.ts`: `listForConversation`, `sendReply`, `updateStatus`, `addReaction`, `removeReaction`, `markDeletedInDb`, `setMetaMessageId`, `generateUploadUrl`, `sendMediaReply`, `sendLocationReply`
- **Role-gated:** Agents see only assigned conversations + unassigned queue; Admin/Supervisor see all
- **Components:** `ConversationList`, `ConversationListItem`, `ConversationThread`, `MessageBubble`, `MessageInput`, `QuickReplyPanel`, `AssignAgentDialog`, `StatusSelector`, `LabelPicker`, `MessageActionMenu`, `ReplyContextBanner`
- Pages: `/inbox`, `/inbox/[id]`

**Message Types (inbound + outbound):**

- ✅ Text, Image, Video, Audio, Document, Sticker, Location
- ✅ Reactions (emoji picker, send/remove via Meta API)
- ✅ Quoted/reply-to messages
- ✅ Message deletion (30-min window, calls Meta delete API)
- ✅ Internal notes (amber, invisible to customer)
- ✅ Optimistic UI: message shows "sending" state, updates to "sent" → "delivered" → "read"

**Outbound Actions (`convex/actions/sendWhatsAppMessage.ts`):**

- `sendMessage` (text) → Meta Graph API
- `sendMediaMessage` → uploads to Meta media, gets `media_id`, sends
- `sendLocation` → WhatsApp location message type
- `sendQuotedMessage` → with context
- `deleteWhatsAppMessage` → Meta delete API
- `sendReaction` → Meta reaction API

---

### Webhook Receiver

- `app/api/webhook/whatsapp/route.ts` — GET (hub verification) + POST (HMAC-SHA256 verify → forward to Convex, return 200 immediately)
- `convex/http.ts` `metaWebhook` action:
  - Parses message / status / reaction events
  - Auto-creates conversation + contact on first inbound
  - Deduplicates by `metaMessageId`
  - Fires automation rules on every inbound message
  - Captures CSAT rating if conversation is in CSAT flow
  - Updates `lastInboundAt` for SLA tracking
  - Auto-reopens resolved conversation when customer messages again

---

### Contact Management (CRM-Lite)

- **Schema:** `contacts` (phone, displayName, customName, tags, notes, stage, firstSeenAt, lastSeenAt, country, city, spent, totalConversations), `customFields`, `contactEvents`, `followUps`
- `convex/contacts.ts`: paginated list, search (phone/name), create, update, archive, addTag, removeTag, updateStage, updateNote
- `convex/customFields.ts`: setField, listForContact, removeField
- `convex/contactEvents.ts`: timeline with 10+ event types (stage_changed, assigned, note_updated, tags_changed, followup_scheduled, followup_sent, etc.)
- `convex/contactsImport.ts`: `importBatch` action — batches 100 rows, 500ms delay between chunks, skip/overwrite duplicates
- Country auto-detected from phone prefix (`libphonenumber-js`)
- CSV parsing via `papaparse` (client-side)
- **Components:** `ContactList`, `ContactDetailSheet`, `ContactPanel` (inbox sidebar), `ContactTimeline`, `AddContactDialog`, `CSVImportDialog`, `BulkTagDialog`, `FollowUpModal`
- Pages: `/contacts`, `/contacts/[id]`
- **Stage pipeline:** lead → prospect → customer → retained → churned (each change logged to `contactEvents`)

---

### Follow-ups

- `convex/followUps.ts`: create, cancel, `listByContact`, `listPending` (role-scoped), `processDue` (internalMutation)
- Cron: every 30 minutes → `followUps.processDue` → sends pending follow-ups via Meta API → max 2 attempts before auto-fail
- Revenue tracking per follow-up (`expectedRevenue`, `currency`) — schema only, no analytics UI yet
- Visible in contact panel; pending and completed shown separately

---

### 007 — Marketing Site

- **Status:** Done
- **Branch:** `007-marketing-site` (merged into `002-agent-roles`)
- **What was built:** Public marketing site (landing page, pricing, features, Arabic-first copy)
- **Key additions:** Next.js 15 App Router public routes · Clerk auth check (redirect if signed in)

---

### 008 — Dashboard Shell

- **Status:** Done (core shell complete; features added incrementally on this branch)
- **Branch:** `008-dashboard-shell`
- **What was built:** Main app shell — sidebar navigation, layout, protected route structure
- **Key additions:**
  - shadcn/ui Sidebar component with collapsible rail mode
  - Lucide React icons
  - Clerk `auth()` server-side route protection
  - TypeScript strict mode (no `any`)

---

### 009 — Inbox UI (Mock Data Phase)

- **Status:** Done
- **What was built:** Full 3-column inbox UI wired to mock data
- **New files:**
  - `lib/mock/inbox-data.ts` — 10 mock conversations, 40+ messages
  - `components/inbox/conversation-list-item.tsx`
  - `components/inbox/conversation-thread.tsx`
  - `components/inbox/message-input.tsx`
  - `components/inbox/message-bubble.tsx`
- **Key decisions:**
  - All UI uses `useQuery`/`useMutation` from day one — task 012 just swapped handlers
  - Mobile-responsive: single column toggle (list ↔ chat)
  - Contact side panel hidden on `< lg` breakpoint

---

### 010 — WhatsApp Embedded Signup

- **Status:** Done ✅ (spec compliance pass complete)
- **What was built:** Full Meta WhatsApp Embedded Signup — Admin connects WABA; tokens stored AES-256-GCM encrypted; webhook auto-subscribed; channels page with status badges, disconnect (with Meta webhook revocation), reconnect
- **Note:** Spec specified a `wabaPhoneNumbers` table — implemented as `channels` instead (better design: multi-number ready from day one). The `by_phone_number_id` index exists on `channels` — Task 011 webhook router is fully unblocked.
- **New files:**
  - `convex/lib/encryption.ts` — AES-256-GCM encrypt/decrypt
  - `components/onboarding/embedded-signup-button.tsx` — FB JS SDK popup with postMessage WABA data capture
  - `components/onboarding/channel-status-badge.tsx`
  - `components/onboarding/step-connect-whatsapp.tsx` — onboarding wizard step (with skip option)
  - `types/meta.ts` — `WABAPhoneNumber`, `WABADetails`, `FBLoginResponse`, `TokenExchangeResponse`
- **Modified files (spec compliance pass):**
  - `convex/channels.ts` — added `disconnectChannel` action (decrypts token → calls `DELETE /subscribed_apps` on Meta → patches DB); updated import to include `decrypt`
  - `app/(dashboard)/settings/channels/page.tsx` — calls `disconnectChannel` action instead of `disconnect` mutation
  - `components/onboarding/step-connect-whatsapp.tsx` — added `onSkip` prop + `handleSkip` (calls `markStep` then `onSkip?.()`)
  - `components/onboarding/onboarding-wizard.tsx` — passes `onSkip={() => {}}` to `StepConnectWhatsApp`
  - `lib/shell/nav-config.ts` — changed `/settings/channels` from `minRole: "admin"` to `minRole: "supervisor"` (spec: all roles can view connection status)
- **Key decisions:**
  - `accessToken` encrypted at rest (AES-256-GCM); never returned to client
  - Reconnection reuses existing `channelId` — preserves conversation history
  - Webhook subscription failure → 5-retry scheduled job (60s intervals)
  - Disconnect is best-effort: Meta webhook revocation attempted but DB disconnect proceeds regardless (network failure shouldn't block admin from disconnecting)
- **Env vars required:**
  ```
  NEXT_PUBLIC_META_APP_ID=
  NEXT_PUBLIC_META_CONFIG_ID=
  ENCRYPTION_SECRET=
  ```

---

### 011 — Webhook Receiver

- **Status:** Done + Extended (2026-04-25)
- **What was built:** Full Meta WhatsApp Cloud API webhook receiver — inbound messages appear in Inbox in real-time
- **New files:**
  - `app/api/webhook/whatsapp/route.ts` — HMAC verification, fires to Convex
  - `convex/http.ts` — shared-secret + HMAC dual auth, all content types (`/meta-webhook`)
- **Supported inbound types:** text · image · audio · document · video · sticker · location
- **Key decisions:**
  - Dedup by `metaMessageId` — Meta sends duplicates, skipped silently
  - Resolved conversations auto-reopen to `"open"` when customer messages again
- **Extension (2026-04-25) — structured `/webhooks/meta` endpoint:**
  - `convex/webhooks/verify.ts` — timing-safe HMAC-SHA256 using Web Crypto API
  - `convex/webhooks/processors/messages.ts` — modular inbound message processor
  - `convex/webhooks/processors/statuses.ts` — outbound status update processor
  - `convex/webhooks/processors/templates.ts` — template status stub (logs to webhook_events)
  - `convex/webhooks/meta.ts` — new HTTP action at `/webhooks/meta`, routes by wabaId
  - `convex/webhookEvents.ts` — `insert` internalMutation for debug logging
  - Schema additions: `webhook_events` table, `channels.by_waba_id` index, `channels.getByWabaId` query
  - `/meta-webhook` legacy endpoint preserved for backward compat
- **Env vars required:**
  ```
  CONVEX_SITE_URL=
  WHATSAPP_WEBHOOK_VERIFY_TOKEN=
  META_WEBHOOK_VERIFY_TOKEN=
  WHATSAPP_WEBHOOK_SECRET=
  WHATSAPP_APP_SECRET=
  META_APP_SECRET=
  WHATSAPP_API_TOKEN=
  WHATSAPP_API_VERSION=v19.0
  ```

---

### 012 — Real-time Message Delivery (Inbox Live)

- **Status:** Done
- **What was built:** Replaced all mock stubs with real Convex queries/mutations; inbox is fully live
- **Schema changes:**
  - `messages.status` — added `"sending"` literal for optimistic UI state
- **Key additions:**
  - `components/dev/seed-button.tsx` — dev-only seed button (renders only in `NODE_ENV=development`)
  - `inbox.seed` mutation — idempotent seed: contacts + channel + conversations + messages
  - Optimistic update on `sendMessage` — message appears instantly in thread before server confirms
- **Key decisions:**
  - `"sending"` status written on insert; task 013 patches to `"sent"` after Meta delivery
  - Agents in "all" filter see only their own conversations + unassigned queue (per CLAUDE.md §25)

---

### Permissions Audit & Fix

- **Status:** Done
- **What was done:** Full audit of role-based permissions across the codebase aligned to CLAUDE.md §25
- **Bugs fixed:**
  - `convex/messages.ts` — Supervisor excluded from viewing messages, sending replies, adding internal notes. Added `org:supervisor` to all role checks.
  - `convex/quickReplies.ts` — Supervisor excluded from managing quick replies. Replaced inline checks with `assertAdminOrSupervisor`.
  - `components/inbox/conversation-list-item.tsx` — Supervisor excluded from Assign button. Fixed.
  - `convex/orgMembers.ts` — Supervisor couldn't invite/remove agents. Added validation that target must be `org:agent`.
  - `lib/shell/nav-config.ts` — Contacts had `minRole: "supervisor"` incorrectly. Changed to `minRole: "agent"`.
- **Client-side updates:** `invite-modal.tsx`, `team-member-list.tsx`, `role-select.tsx`

---

### Customer Journey

- **Status:** Done
- **Branch:** `008-dashboard-shell`
- **What was built:** Full customer stage pipeline + follow-up scheduling system
- **Stages:** lead → prospect → customer → retained → churned
- **New tables in Convex:**
  - `followUps` — scheduled follow-ups (attemptCount, expectedRevenue, channelId, status)
  - `contactEvents` — append-only timeline log per contact
  - `notifications` — in-app bell notifications
- **New files:**
  - `convex/crons.ts` — 30-min cronJob runs `processDue`
  - `convex/followUps.ts` — `processDue` internalAction + `recordFollowUpResult` internalMutation
  - `components/ui/notification-bell.tsx`
  - `components/contacts/contact-side-panel.tsx`
  - `components/contacts/follow-up-modal.tsx`
  - `components/contacts/contact-timeline.tsx`
  - `app/(dashboard)/contacts/[id]/page.tsx` — full contact profile page
- **Business logic:** Max 2 follow-up attempts before auto-churn; sends via Meta API; revenue tracking per follow-up
- **Inbox integration:** Stage filter tabs in conversation list (filter by lead/prospect/customer/etc.)

---

### Inbox — Rich Media, Emoji, Attachments & Contact Panel Upgrades

- **Status:** Done
- **Branch:** `008-dashboard-shell`
- **Commit:** `e100803`
- **What was built:** Comprehensive inbox UX improvements across message rendering, composer, conversation list, and contact side panel

#### Message Rendering (MessageBubble)

- Inbound rich media now fully rendered:
  - **Image/Sticker** — `<img>` with lazy loading, rounded, max 256px height
  - **Video** — `<video controls>` with max height
  - **Audio** — `<audio controls>` with waveform icon
  - **Document** — FileIcon + filename + download link
  - **Location** — MapPin icon + Google Maps link (parses `"lat,lng|name"` content format)
- Status ticks: `·` sending · `✓` sent · `✓✓` delivered · `✓✓` (green) read · `✗` failed

#### Outbound Attachments (MessageInput)

- **Image, Video, Document, Audio** — file picker per type → Convex Storage upload → `sendMediaReply` action → Meta Media API
- **Location** — browser `navigator.geolocation` → `sendLocationReply` mutation → `sendLocation` WhatsApp action
- **Emoji picker** — `emoji-picker-react` lazy-loaded via `next/dynamic`; positioned `absolute bottom-full` above toolbar; closes on outside click
- Attachment preview card shown before send (image thumbnail for images, icons for others)
- Location preview card shows lat/lng coordinates

#### Convex Backend (messages.ts, actions/sendWhatsAppMessage.ts)

- `generateUploadUrl` mutation — wraps `ctx.storage.generateUploadUrl()`
- `sendMediaReply` action — uploads to Meta Media API via FormData → gets `media_id` → sends WhatsApp media message
- `sendLocationReply` mutation — inserts location message, schedules `sendLocation` action
- `sendMediaMessage` internalAction — uploads file to Meta, sends WhatsApp media message
- `sendLocation` internalAction — sends WhatsApp location message type
- `getConversationInternal`, `getChannelInternal`, `getContactInternal` — internalQuery helpers

#### Conversation List Improvements

- **Scroll fix** — replaced `ScrollArea` with plain `div overflow-y-auto` (ScrollArea breaks flex height chain)
- **Stage filter tags** — now `flex-wrap` instead of horizontal scroll; all stages visible
- **Unread filter tab** — new "Unread" tab in assignment filter; counts and filters conversations with `unreadCount > 0`
- **Read/Unread toggle** — hover-reveal button per conversation row (MailOpen/MailCheck icons); calls `markAsRead` / `markAsUnread`

#### Sidebar Badge

- `app-sidebar.tsx` — queries live unread count; shows green badge on Inbox nav item (capped at 99+); tooltip says "X unread messages"

#### Contact Panel (ContactPanel)

- **Customer Journey** — clickable stage pills directly in panel (no need to open contact profile page)
- **Internal Notes section** — pulls recent internal notes from all conversations with this contact via `getInternalNotesByContact`; shown as amber cards with timestamp
- **Follow-ups section** — pending follow-ups (blue cards with cancel button) + completed follow-ups (grayed, strikethrough); + button opens `FollowUpModal`
- `channelId` and `conversationId` now threaded down from inbox page → ContactPanel

#### Convex Backend (inbox.ts)

- `markAsUnread` mutation — patches conversation `unreadCount: 1`
- `getInternalNotesByContact` query — queries all conversations for contact, collects internal notes, returns top 10 sorted desc

#### Bug Fixes

- `ScrollArea` replaced everywhere it broke flex scroll chains (thread + list)
- Emoji picker fixed: added `relative` to outer wrapper so `absolute bottom-full` positions correctly
- Tailwind canonical classes fixed: `max-w-[160px]` → `max-w-40`, `after:start-1/2` → `after:inset-s-1/2`, `after:w-[2px]` → `after:w-0.5`, `min-w-[80px]` → `min-w-20`
- Auth in Convex actions: switched from `getCallerIdentity` (uses `ctx.db`, not available in actions) to `ctx.auth.getUserIdentity()` directly

---

### Smart Contact Lists

- **Status:** Done
- **Branch:** `009-automation-rules`
- **Commits:** `eca897a` → `2fbc031`
- **What was built:** Dynamic/static contact lists for segmentation and broadcast targeting
- **New Convex tables:**
  - `contactLists` — stores list metadata, filter criteria, type (`smart` | `static`), cached contact count
- **New files:**
  - `convex/contactLists.ts` — full CRUD + `getMatchingContacts`, `getAvailableCountries`, `backfillCountries`
  - `components/lists/lists-page.tsx` — card grid layout showing all lists with stats
  - `components/lists/list-card.tsx` — individual list card with type badge and count
  - `components/lists/list-detail.tsx` — list detail page showing matching contacts (avatar, name, phone, stage)
  - `components/lists/create-list-dialog.tsx` — two-column sheet: filter builder (left) + live preview panel (right)
  - `app/(dashboard)/lists/page.tsx` and `app/(dashboard)/lists/[id]/page.tsx`
- **Key features:**
  - Smart lists: filter by tags, stage, country (derived from phone prefix), custom fields — count updates live
  - Static lists: manually curated contact sets
  - Country detection from phone number prefix via `lib/cityData.ts` (no stored `country` field dependency)
  - `backfillCountries` mutation for existing contacts that predate the auto-detect feature
  - Plan limits enforced via `convex/lib/planLimits.ts`
- **Plan limits:** Free 3 lists · Starter 10 · Growth 50 · Business unlimited

---

### Broadcast Campaigns — Sending Loop (Task 015-A)

- **Status:** Done
- **Branch:** `task/015-broadcasts-sending-loop`
- **What was built:** Batched broadcast sending loop with real-time progress UI and per-contact retry logic
- **Schema changes on `broadcasts`:**
  - `recipientSnapshot` changed from `v.array(v.id("contacts"))` to `v.array(v.object({ contactId, phone, name }))` — snapshot now stores phone/name at send time
  - `retryMap: v.optional(v.record(v.string(), v.number()))` — tracks per-contact attempt count (up to 3)
- **New files:**
  - `convex/actions/processBroadcastBatch.ts` — `internalAction` that processes 50 contacts per invocation, calls Meta API, retries failed contacts up to 3×, schedules next batch with 2s delay, schedules retry batches with 60s delay
- **Modified files:**
  - `convex/broadcasts.ts` — rewrote `send` action (role check, plan check, snapshot build, schedules batch 0); added `getInternal`, `incrementSent`, `markFailed`, `incrementRetry`, `markComplete` (idempotent), `getTenantInternal` internalMutations/Queries; updated `updateStatus` to accept `retryMap`
  - `convex/lib/planLimits.ts` — `assertBroadcastsAllowed` now blocks both `free` and `starter` (Growth+ only, matching CLAUDE.md §10)
  - `components/broadcasts/broadcasts-page.tsx` — real-time progress bar + animated spinner badge for `status === "sending"`; bilingual sent/failed counter line
- **Key decisions:**
  - Batch size: 50 contacts/batch, 2s between batches, 60s before retry batches
  - Max 3 attempts per contact; exhausted contacts counted in `failedCount`
  - `markComplete` is idempotent — guards against double-call on terminal status
  - Channel `accessToken` (AES-256-GCM encrypted) used for Meta API token; falls back to `META_SYSTEM_USER_TOKEN` env var
  - Empty contact list throws immediately in `send` action (no silent fail)
  - Real-time UI updates via Convex subscription — no polling

### Broadcast Campaigns — Creation Wizard

- **Status:** Done (UI complete; sending loop implemented above)
- **Branch:** `009-automation-rules`
- **Commits:** `5eaffa3`, `dc00b7c`
- **What was built:** Broadcast campaign creation wizard and campaign list page
- **New Convex tables:**
  - `broadcasts` — campaign record (name, status, listId, templateId, scheduledAt, sentCount, failedCount)
- **New files:**
  - `convex/broadcasts.ts` — queries, mutations, `sendBroadcast` action (sends via Meta template API)
  - `components/broadcasts/broadcasts-page.tsx` — campaign list with status badges (draft/scheduled/sending/sent/failed)
  - `components/broadcasts/create-broadcast-wizard.tsx` — 3-step wizard: pick list → compose message → schedule/send
  - `app/(dashboard)/broadcasts/page.tsx` and `app/(dashboard)/broadcasts/new/page.tsx`
- **Key decisions:**
  - Broadcasts only available on Growth and above (plan-gated)
  - Sends use pre-approved WhatsApp template messages (Meta requirement for outbound to non-24h window contacts)
  - Scheduled broadcasts use Convex scheduled functions

---

### Task 013 — Full WhatsApp Message Send Pipeline

- **Status:** Done (completed and hardened)
- **Branch:** `009-automation-rules`
- **What was built / fixed:**
  - `convex/schema.ts` — added `failureReason: v.optional(v.string())` to messages table
  - `convex/inbox.ts` `sendMessage` mutation — now schedules `sendWhatsAppMessage.sendMessage` action after inserting; also handles first-reply assignment, SLA breach clear, metrics recording; added permission check for agents
  - `convex/actions/sendWhatsAppMessage.ts` — `sendMessage`, `sendLocation`, `sendQuotedMessage`, `sendMediaMessage` actions all now (1) extract and store wamid via `setMetaMessageId`, (2) update status to `"sent"` (not `"delivered"`) on success — `"delivered"` and `"read"` come from the webhook; `markFailed` accepts and stores `failureReason`
  - `convex/messages.ts` `updateStatus` — accepts optional `failureReason` and patches it to DB
  - `components/inbox/message-input.tsx` — Enter sends (Shift+Enter adds newline); character count warning at 3500+ chars (red at 4096+); send disabled when > 4096 chars
  - `components/inbox/message-bubble.tsx` — `StatusTick` shows animated `·` for "sending"; shows `✗ Retry` button for "failed" messages; `onRetry` prop added to `MessageBubble`
  - `components/inbox/conversation-thread.tsx` — passes real `status` (no longer maps "sending" → "sent"); wires `onRetry` to call `sendMessage` mutation with original content
- **Status flow:** `"sending"` (optimistic) → `"sent"` (Meta accepted) → `"delivered"` (webhook) → `"read"` (webhook)
- **Architecture:** mutation writes DB + schedules action; action calls Meta API + patches status — never throw, always handle errors gracefully

---

### Conversation Labels

- `convex/labels.ts`: list, create, remove (cascades to all conversations), addToConversation, removeFromConversation
- `conversationLabels` table: name, color, emoji, tenantId
- Inline label chips in conversation list + label filter bar in inbox
- Pages: `/settings/labels`

---

### Quick Replies

- `convex/quickReplies.ts`: list (by category), create, update, remove
- Insert via slash-command in `MessageInput` or `QuickReplyPanel` popover
- Pages: `/settings/quick-replies`

---

### Message Templates (with Variables)

- `convex/messageTemplates.ts`: list (by category), create (plan-gated, extracts `{{variable}}` placeholders), update, remove
- Schema: `messageTemplates` — title, body, category, language (ar/en), variables (extracted), tenantId
- Variable extraction: regex `/\{\{(\w+)\}\}/g` on save; dynamic fill-in form per variable
- Plan limits: Free=0, Starter=10, Growth=50, Business=∞
- **Components:** `TemplatesSettings` (CRUD), `TemplatePicker` (used in broadcast wizard)
- Pages: `/settings/templates`

---

### CSAT (Customer Satisfaction)

- `convex/csat.ts`: `sendCsatMessage` (internalAction), `captureRating` (internalMutation), `getSettingsInternal`, `markCsatSent`
- `csatSettings` table: enabled toggle, delayMinutes
- `conversationMetrics`: csatSentAt, csatScore (1–5), csatRespondedAt
- Trigger: conversation resolved → `ctx.scheduler.runAfter(delayMs)` → Arabic CSAT message sent
- Capture: webhook intercepts single-digit (1–5) replies → `captureRating` → score stored in `conversationMetrics`
- Growth+ only
- Pages: `/settings/csat`

---

### SLA Alerts

- `convex/sla.ts`: `checkBreaches` (internalMutation)
- Cron: every 5 minutes → `sla.checkBreaches` → marks `slaBreachedAt` on conversations that exceeded threshold
- Notifications sent to channel supervisors (via `channelMembers`)
- Inbox: ⚠️ amber badge on conversation row when `slaBreachedAt` set
- SLA cleared on agent reply (`sendReply` patches `slaBreachedAt: undefined`)
- Pages: channel settings (SLA threshold config per channel)

---

### Department / Channel Members

- `channelMembers` table: maps (channelId, userId, role) with indexes
- `convex/channelMembers.ts`: listForChannel, addMember, removeMember
- Used by: SLA notification (find channel supervisors), round-robin (rotation pool)
- **Component:** `DepartmentMembers` (member list with add/remove UI in channel settings)

---

### Round-Robin Assignment

- `convex/actions/roundRobin.ts`: `assignRoundRobin` internalAction
  - Fetches live Clerk org memberships (no stale cache)
  - Picks member at `roundRobinIndex % memberCount`
  - Calls `conversations.assignInternal(assignmentType: "round_robin")`
  - Increments `roundRobinIndex` atomically
- Schema: `channels.assignmentMode` (first_reply / manual / round_robin), `channels.roundRobinIndex`, `conversations.assignmentType`, `conversations.assignedAt`
- Plan-gated: Growth+ for round_robin mode
- Manual reassignment by Admin/Supervisor does not reset index
- No online/offline awareness in v1
- **Component:** `AssignmentModeSelect` (radio buttons in channel settings), `AssignAgentDialog`

---

### Automations Engine

- `convex/automations.ts`: listRules, getBusinessHours, createRule, updateRule, deleteRule, reorderRules, setBusinessHours, `checkNoReplyTimeouts` (internalMutation), `fireRuleForConversation` (internalMutation)
- `businessHours` table: timezone + schedule grid; `automationRules` table; `ruleFireLog` table
- **4 trigger types:** keyword match · outside business hours · first message · no-reply timeout
- Template interpolation: `{{business_name}}`, `{{customer_name}}`, `{{current_time}}` in auto-reply body
- Cron: every 1 min → `checkNoReplyTimeouts`; every inbound message → `fireRuleForConversation`
- Plan limits: Free=2, Starter=10, Growth=30, Business=∞
- `lib/automationHelpers.ts`: rule evaluation, timezone-aware hours check
- Pages: `/automations`

---

### Shareable Invite Link UI

- Multi-link per tenant: each link has a label, role (`org:agent` or `org:supervisor`), expiry (7d / 30d / never), and createdBy
- `convex/inviteLinks.ts`: `list` (all non-revoked links, newest first), `create`, `revoke` (by linkId), `regenerate` (new token, same record)
- Role gating: Admin can create agent + supervisor links; Supervisor can only create agent links (enforced server-side)
- `convex/schema.ts`: `inviteLinks` table updated with `label` field and expanded `defaultRole` to support `org:supervisor`
- `convex/actions/validateInvite.ts`: uses `link.defaultRole` for org membership role instead of hardcoded `org:agent`
- `components/settings/invite-links.tsx`: loading skeleton, empty state, link cards with copy/regenerate/revoke actions, create dialog
- `/settings/team` page: Invite Links section added below Team Members list
- Bilingual AR/EN via `useT()`, RTL-correct layout

---

### Data Export

- CSV + JSON export for contacts (with all custom fields flattened) and conversations (with optional messages)
- `convex/export.ts`: `generateContactsExport` (format: csv/json), `generateConversationsExport` (format: json/csv/html, `includeMessages` toggle), `getExportStats` (contact + conversation counts for UI)
- Files stored in Convex File Storage; action returns `{ url, filename }` for browser download
- Available to Admin + Supervisor; scoped strictly to caller's `tenantId`
- UI: format selector (CSV/JSON) for contacts, format selector (JSON/CSV/HTML) + include-messages toggle + large-dataset warning for conversations, stats counts under each card title
- Pages: `/settings/export`

---

### WhatsApp Business Profile Editing

- `convex/waBusinessProfile.ts`: `getProfile` (fetches from Meta API), `updateProfile` (patches fields), `uploadProfilePhoto` (uploads to Meta, updates profile)
- Editable fields: about/description, email, websites, vertical (category), profile photo
- All calls go through Convex actions (token decrypted server-side, never client)
- ⚠️ Display name change (requires Meta review) — schema noted in CLAUDE.md but "pending review" UI badge not confirmed in component scan
- Pages: `/settings/channels/[channelId]/profile`

---

### Contact Lists (Smart Segmentation)

- `convex/contactLists.ts`: listForTenant, create, update, delete, getById, `getCountForFilters`
- `contactLists` table: name, description, filters (countries/cities/stages/tags)
- Filter evaluation: in-memory on fetched contacts (no full-text index needed for current scale)
- Plan limits: Free=3, Starter=10, Growth/Business=∞
- Pages: `/lists`, `/lists/[id]`

---

### Broadcasts

- `convex/broadcasts.ts`: listForTenant, create (draft), `send` (action)
- `broadcasts` table: name, listId, channelId, templateName, templateLanguage, status (draft/sending/sent/failed), recipientSnapshot, recipientCount, sentCount, failedCount
- **Wizard:** name → pick list → pick channel → pick template → review → send (5-step, fully wired to create mutation)
- Plan: Starter+ only
- Pages: `/broadcasts`, `/broadcasts/new`

---

### Team Management

- `convex/orgMembers.ts`: inviteByEmail (Clerk API), list (Clerk API), setRole (Clerk API), remove (Clerk API)
- `inviteLinks` table: token-based invite links (expiry, revoked flag)
- `convex/actions/validateInvite.ts`: validate token before join
- Pages: `/join/[token]`, `/settings/team`
- Supervisor constraints: can only invite/remove `org:agent` — cannot touch other admins/supervisors

---

### In-App Notifications

- `notifications` table: type (followup_due / sla_breach), referenceId, message, read
- `convex/notifications.ts`: list (user-scoped), markAsRead
- Triggered by: SLA breach (to supervisors), follow-up due (to assigned agent)
- **Component:** `NotificationBell` (unread count badge, dropdown list, mark-as-read)

---

### Marketing Site + Legal Pages

- Full landing page: hero, features, pricing, differentiators, CTA, footer
- Pricing table with 4 tiers (Free / Starter / Growth / Business)
- Arabic/English locale switching
- Mobile nav drawer
- Animated inbox mockup component
- Route: `/`
- **Legal pages added (2026-04-26):** `/privacy`, `/terms`, `/dpa` — full Arabic+English content
- **New components:** `privacy-content.tsx`, `terms-content.tsx`, `dpa-content.tsx`, `legal-page-wrapper.tsx`
- Marketing footer updated with legal page links

---

### Template Library

- Pre-built library of 66 curated templates accessible from Settings → Templates → "Template Library" tab
- Industry tabs (e-commerce, healthcare, real estate, etc.) + purpose chips for combined filtering
- Arabic + English templates across 14 categories (8 Meta + 6 Quick-Reply)
- Preview sheet with WhatsApp bubble + variable highlighting
- Quick-reply templates pre-fill the create dialog; Meta templates submit via Convex action to Meta Graph API
- Variable auto-conversion: `{{named}}` → `{{1}}` in `submitToMeta` Convex action
- **Files:** `lib/templateLibrary.ts`, `components/templates/library-template-card.tsx`, `components/templates/library-template-preview.tsx`, `components/templates/meta-submit-form.tsx`, `components/templates/template-library-tab.tsx`

---

### Broadcast Templates Builder

- Dedicated broadcast template management: `components/broadcasts/broadcast-templates-tab.tsx`, `components/broadcasts/broadcast-template-builder.tsx`
- `convex/broadcastTemplates.ts`: CRUD for tenant-specific broadcast templates synced with Meta
- `convex/metaTemplates.ts`: Meta template sync (fetch/cache from Meta Graph API)
- `broadcastTemplates` table: name, category, language, header (type + text/mediaUrl), body, footer, buttons, status (`draft|submitted|approved|rejected`), `metaStatus`
- Create wizard integration: source picker ("Meta Templates" vs "Broadcast Templates"), media URL override, dynamic URL suffix per button, variable fill-in
- Plan-gated: Starter+

---

### Quick Reply Variables

- Quick replies now support `{{variable}}` placeholders (same syntax as message templates)
- Selecting a quick reply with variables opens an inline fill-in form before inserting into composer
- **Modified:** `components/inbox/quick-reply-panel.tsx` — variable detection + fill-in UX
- **App route:** `/inbox/[id]` — variable fill-in state threaded from page level

---

### Settings Sub-Nav

- Settings section now has a persistent sub-navigation component for all settings pages
- **New file:** `components/settings/settings-sub-nav.tsx`
- **New file:** `app/(dashboard)/settings/layout.tsx` — wraps all settings routes with sub-nav
- **New file:** `app/(dashboard)/settings/page.tsx` — settings landing page redirect

---

### Departments Feature

- Channels are organized into departments (groups of channels) for better multi-channel management
- `convex/departments.ts`: listForTenant, create, update, remove, listForTransfer
- `convex/departmentMembers.ts`: addMember, removeMember, listForDepartment
- `departments` table: tenantId, name, description, channelIds
- `departmentMembers` table: tenantId, departmentId, userId, role
- Used for: conversation transfer between departments, channel grouping in UI
- **Defensive fix:** `listForTransfer` returns empty array (not NOT_FOUND) when channels are orphaned

---

### Member Profile Modal

- Rich tabbed modal for viewing/managing team members — opens from team member list
- **Tabs:** Overview (stats, bio, contact details) | Analytics (performance charts) | History (action log) | Manage (role, status, remove)
- **New files:**
  - `components/team/member-profile-modal.tsx` — modal shell with tab routing
  - `components/team/member-profile/overview-tab.tsx` — bio, contact info, recent activity
  - `components/team/member-profile/analytics-tab.tsx` — Recharts performance charts
  - `components/team/member-profile/history-tab.tsx` — action log timeline
  - `components/team/member-profile/manage-tab.tsx` — role change, status, remove member
  - `hooks/use-member-profile.ts` — data fetching hook
- **Convex:** `convex/members.ts` (mutations), `convex/memberQueries.ts` (queries + analytics)
- **New tables:** `memberProfiles` (bio, jobTitle, phone, avatar), `memberActionLog` (audit trail)
- Contact details stored: phone, job title, bio — Admin/Supervisor can edit via Manage tab

---

### Team Presence System

- Real-time online/offline/away/busy presence indicators for team members
- **New files:** `convex/presence.ts`, `convex/teamPresence.ts`, `convex/teamPresenceQueries.ts`
- **New table:** `presence` — userId, tenantId, status, lastSeen
- **New UI:** `components/ui/presence-indicator.tsx` (colored dot), `components/ui/team-presence-dropdown.tsx` (team status overview)
- **Hooks:** `hooks/use-presence.ts`
- Shell integration: `components/shell/presence-initializer.tsx` sets presence on load/unload
- Presence auto-expires (heartbeat pattern via scheduled functions)

---

### Channel Retention (30-day Auto-Delete)

- Disconnected channels are retained for 30 days then auto-deleted (with all associated data)
- **New files:** `convex/channelRetention.ts`, `convex/actions/channelRetentionAction.ts`
- **Schema:** `channels.deletedAt`, `channels.retentionExpiresAt` added
- **Cron:** `check-channel-retention` runs daily → finds expired channels → purges conversations, messages, channelMembers, and channel record
- UI: Channels page shows retention countdown badge for disconnected channels
- Notification sent to admin 7 days before deletion (email + in-app)
- **Fix (1d77419):** Channels with only resolved conversations can be deleted immediately

---

### Transactional Email System

- All transactional emails use branded React Email HTML templates (Arabic + English variants)
- **New directory:** `emails/` — 9 template pairs (AR + EN):
  - `agent-welcome`, `new-assignment`, `sla-breach`, `followup-due`, `followup-due-failed`
  - `channel-deleted`, `channel-expiring-soon`, `billing-payment-failed`, `billing-subscription-expired`
- `convex/emails/` — base layout (`base.tsx`), reusable components, template wrappers
- `convex/actions/notifyEmail.ts` — single dispatch action (picks AR or EN based on locale)
- `convex/actions/sendEmail.ts` — updated to use React Email + Resend API
- Email triggers: channel deletion warning, SLA breach, new assignment, follow-up failure, billing events
- **Env var:** `RESEND_API_KEY` required

---

### Message Scheduling

- Agents can schedule outbound messages for future delivery
- **New file:** `convex/messageScheduling.ts` — `scheduleMessage` mutation + `sendScheduled` internalAction
- Scheduled messages stored in `messages` table with `scheduledAt` field and `status: "scheduled"`
- Convex scheduler dispatches at the correct time; failed sends are marked and retried once
- UI integration: date-time picker in `MessageInput` toolbar (clock icon)

---

### Conversation & Message Search

- Full-text search across conversation content and message body
- **New file:** `convex/search.ts` — `searchConversations` and `searchMessages` queries
- Uses Convex search index on `messages.content` and `contacts.displayName`
- Scoped to caller's `tenantId`; role-gated (agents see only their assigned conversations)
- UI: search bar in inbox header with result list dropdown

---

### Conversation Merge

- Admin can merge duplicate conversations (same contact, different channels or sessions)
- **New file:** `convex/conversationMerge.ts` — `mergeConversations` mutation
- Merges messages from source → target conversation; marks source as resolved with merge note
- Admin-only; available from conversation header action menu

---

### Batch Actions

- Admin/Supervisor can perform bulk operations on conversations
- **New file:** `convex/batchActions.ts` — `batchClose`, `batchAssign`, `batchLabel`, `batchDelete`
- All batch mutations validate `tenantId` and role before operating
- UI: checkbox selection in conversation list + bulk action toolbar

---

### Rate Limiting

- Per-user mutation rate limiting to prevent abuse
- **New file:** `convex/lib/rateLimit.ts` — token-bucket rate limiter using `rateLimits` table
- **New table:** `rateLimits` — userId, action, tokens, lastRefill
- Applied to: `sendMessage`, `sendMediaReply`, `importBatch`

---

### Klaro Consent Manager + Google Consent Mode v2

- **Status:** Done
- **What was built:** Open-source consent banner (Klaro! v0.7.21) integrated with Google Consent Mode v2 default-denied state — ready for GA4/GTM/Facebook Pixel/Google Ads addition.
- **New files:**
  - `lib/klaro/config.ts` — Klaro config + AR/EN translations + 5 services (essential, GA4, GTM, FB Pixel, Google Ads)
  - `lib/klaro/consent-mode.ts` — Consent Mode v2 default state script (all denied except security_storage + functionality_storage)
  - `components/consent/klaro-provider.tsx` — Client Component with `usePathname` re-init (fixes Klaro issue #552 for Next.js App Router)
  - `components/consent/cookie-settings-button.tsx` — Footer button to re-open settings modal
  - `styles/klaro.css` — Custom CSS with RTL overrides + WABDesk indigo branding
  - `app/cookies/page.tsx` — Cookie Policy legal page (legal page #4)
  - `components/marketing/cookies-content.tsx` — AR/EN Cookie Policy content with detailed cookie table (10 cookies)
  - `types/klaro.d.ts` — TypeScript declaration for `klaro/dist/klaro-no-css`
- **Modified files:**
  - `app/layout.tsx` — Injected Consent Mode default in `<head>` with `strategy="beforeInteractive"`; mounted `<KlaroProvider />` inside `LocaleProvider`
  - `components/marketing/marketing-footer.tsx` — Added Cookie Policy link + Cookie Settings button
  - `components/marketing/legal-page-wrapper.tsx` — Added `"cookies"` to `LegalPage` type, labels, siblingPages, and footer nav
  - `components/marketing/privacy-content.tsx` — Added analytics + advertising disclosure section (10a AR + 10a EN)
  - `lib/marketing/i18n.ts` — Added `footer.cookies` and `footer.cookieSettings` keys
- **Key decisions:**
  - Notice mode (non-blocking banner) over modal — chosen for conversion
  - Cookie storage with 365-day expiry over localStorage — better for compliance audits
  - Default state: all denied except `essential` and `security_storage` / `functionality_storage` — opt-in (GDPR-compliant)
  - Decline-all button visible (GDPR requirement)
  - 5 services pre-configured: essential, GA4, GTM, Facebook Pixel, Google Ads
  - CSS static-imported in `klaro-provider.tsx` (not dynamic) — standard Next.js pattern
- **Env vars required:** None (Klaro is fully client-side)
- **TypeScript:** 0 errors
- **Next step when adding GTM/GA:** Use `type="text/plain"` + `data-name="google-tag-manager"` on the script tag so Klaro controls loading
- **Post-merge fixes (2026-05-02):**
  - `privacy-content.tsx` — merged section 10a (analytics disclosure) into section 10 as leading paragraphs in both AR and EN; deleted standalone 10a section
  - `legal-page-wrapper.tsx` — added `<CookieSettingsButton />` to footer so /privacy, /terms, /dpa, /cookies pages all expose the Klaro modal trigger
  - Base CSS import confirmed: `klaro/dist/klaro.css` imported exactly once in `klaro-provider.tsx`; no duplicate in `styles/klaro.css`

---

### Klaro Consent Manager — Post-merge bug fixes (2026-05-02)

**Summary:** Four bugs were discovered and fixed after the Klaro integration was merged into the main branch. None of the bugs were regressions in the integration logic itself — they were surface-level issues that only became visible during browser testing across both EN and AR modes. The root causes split into three categories: a locale-system mismatch (Klaro was reading from the wrong locale store), missing translation keys that Klaro expected but the config didn't provide, and CSS selector specificity gaps that caused RTL layout to apply incorrectly.

**Bug 1 — Locale system mismatch**
`KlaroProvider` was using `LocaleContext` (cookie-driven, sets `<html dir>`) to determine the current locale. The marketing pages use a separate `useMarketingLocale()` hook (localStorage-driven). The two systems are not synchronized — the cookie value can lag behind the localStorage toggle, causing Klaro to render in the wrong language. Fixed by switching `KlaroProvider` to read locale from `useMarketingLocale()`, aligning it with the rest of the marketing site.

- **File modified:** `components/consent/klaro-provider.tsx`

**Bug 2 — Missing `purposeItem` translation keys + `poweredBy` footer link**
Klaro rendered `[missing translation]` placeholders for service-count labels (e.g. "1 service", "2 services") because the `purposeItem.service` and `purposeItem.services` keys were absent from both the AR and EN translation objects. Separately, the "Powered by Klaro" footer link was still visible despite the intent to hide it — `poweredBy: ""` (empty string) in per-locale `consentNotice` does not suppress the link; the correct fix is `disablePoweredBy: true` at the top level of the Klaro config object.

- **File modified:** `lib/klaro/config.ts`

**Bug 3 — RTL CSS applied to `<html>` instead of `#klaro` wrapper**
`styles/klaro.css` used `[dir="rtl"]` as the ancestor selector for all RTL overrides. Because `<html dir="rtl">` is set permanently by the cookie-driven locale system (even in EN mode — see architectural note below), this selector matched in all page states, applying RTL layout universally. The fix was to change the selector root from `[dir="rtl"]` to `#klaro[dir="rtl"]`, which matches only the Klaro wrapper element (Klaro sets `dir` on `#klaro` independently from the locale toggle). Additionally, four CSS rules were missing from the original RTL overrides: close button physical position, toggle switch anchor, service row padding, and footer button alignment. All four were added under the corrected selector.

- **File modified:** `styles/klaro.css`

**Bug 4 — Modal background color override not applying**
Klaro's own stylesheet uses `.cm-klaro` as part of its base selector, giving it higher specificity than WABDesk's overrides which targeted only `#klaro`. Fixed by prepending `.cm-klaro` to the override selector chain to match Klaro's base specificity.

- **File modified:** `styles/klaro.css`

**Files modified (complete list):**

- `components/consent/klaro-provider.tsx` — Stages A + B (locale fix + re-init on nav)
- `components/consent/cookie-settings-button.tsx` — Stage B (locale-aware re-open)
- `lib/klaro/config.ts` — Stage B (missing translation keys + `disablePoweredBy: true`)
- `styles/klaro.css` — Stage C (RTL selector specificity + 4 missing RTL rules + modal bg override)

**Architectural note — dual locale system (known limitation, not fixed here):**
The codebase has two separate locale systems that are not synchronized: (1) a cookie-driven system that sets `<html dir="rtl">` and is used by the dashboard and app shell; (2) a `localStorage`-based toggle used by the marketing pages via `useMarketingLocale()`. The result is that `<html dir="rtl">` is effectively permanent — it does not reflect the marketing site's current language toggle. Klaro is now isolated from this conflict via the `#klaro[dir]` selector, but any future CSS that uses `html[dir="rtl"]` or `[dir="rtl"]` at page root will face the same trap. This should be investigated and resolved before production — ideally by unifying both systems onto a single locale source of truth. Flagged as a pre-launch TODO.

---

### 013 — WhatsApp Coexistence (Stage 5 — UI Badge + Embedded Signup Config)

- **Status:** Stage 5 Complete — Feature fully shipped
- **Branch:** `feat/013-departments`
- **What was built in Stage 5:**
  - **`components/onboarding/embedded-signup-button.tsx`** (MODIFIED): Added `featureType: "whatsapp_business_app_onboarding"` and `sessionInfoVersion: "3"` to the `extras` object in `FB.login()`. `featureType` activates WhatsApp Business App Onboarding (coexistence) at Meta's side for all new WABA connections. `sessionInfoVersion: "3"` is the current Meta-recommended companion parameter. Verified via Meta developer docs (context7). The `waba_id` / `phone_number_id` postMessage callback is unaffected.
  - **`components/inbox/message-bubble.tsx`** (MODIFIED): Two changes:
    - Added `source?: "customer" | "api" | "mobile"` to the local `Message` type
    - Added `mobileBadge` element (📱 + "From mobile" / "من الموبايل") rendered only when `!isInbound && message.source === "mobile"`; badge sits in `timeRow` after the StatusTick; Tailwind-only, uses `ms-2` (logical margin, RTL-correct), green-50/green-700 colours, tooltip text; uses existing `useT()` hook with inline strings (no separate locale files — this codebase uses inline `t(en, ar)` at call sites)
  - **No schema changes** — Stage 5 is entirely UI + signup config
- **i18n strings added (inline, not in locale files):**
  - `t("From mobile", "من الموبايل")` — badge label
  - `t("Sent from the WhatsApp mobile app", "هذه الرسالة أُرسلت من تطبيق الواتساب على الهاتف")` — badge tooltip
- **Notes:**
  - `setup: ""` in extras is a pre-existing string (docs show `setup: {}` object form) — not changed in Stage 5; no functional impact
  - `sessionInfoVersion: "3"` tells Meta to include richer session info in the postMessage; the code only reads `waba_id`/`phone_number_id` from postMessage so this is a no-op for current behavior but future-proofs the signup flow
  - Badge is RTL-correct: `ms-2` = `margin-inline-start`, `justify-end` on timeRow aligns group to logical end; in RTL the badge renders at the physical right of the time row (logical start), which is expected
- **Carry-forward TODOs (not in Stage 5):**
  - `authorId: echo.from` in processEcho stores a phone number, not a Clerk ID — fix with `mobileSenderPhone` field when addressing analytics
  - Mobile-sent messages do not auto-reopen resolved conversations — revisit if reported as UX issue

---

### CSAT v2 — Major Update

- CSAT system overhauled (2026-04-27): now uses structured button template instead of free-form text
- Resolves the Meta 24-hour window violation (previous free-form Arabic text was non-compliant)
- Rating now captured via interactive button response (1–5 stars as button payload)
- `convex/csat.ts` substantially rewritten (+383 lines): better error handling, template-based send, rating capture via webhook
- Settings page enhanced: preview of CSAT message, toggle, delay config, test send button

---

### WA Business Profile + System User Fix (2026-04-27)

- **Resumable upload API** now used for profile photo uploads (large file support)
- **Permanent System User Token:** `WHATSAPP_API_TOKEN` env var used for all Meta API calls (not per-channel token)
- **System user assignment:** on Embedded Signup completion, WABDesk system user is auto-assigned to the WABA (`convex/channels.ts` — `assignSystemUser`)
- `convex/waBusinessProfile.ts` updated: uses `META_SYSTEM_USER_TOKEN` for profile API calls, resumable upload flow for photo

---

### Crons (Convex scheduled jobs)

| Job                          | Interval     | Handler                            |
| ---------------------------- | ------------ | ---------------------------------- |
| `process-due-followups`      | Every 30 min | `followUps.processDue`             |
| `check-automation-timeouts`  | Every 1 min  | `automations.checkNoReplyTimeouts` |
| `check-sla-breaches`         | Every 5 min  | `sla.checkBreaches`                |
| `check-channel-retention`    | Daily        | `channelRetention.checkExpired`    |
| `process-scheduled-messages` | Every 1 min  | `messageScheduling.sendScheduled`  |
| `refresh-team-presence`      | Every 2 min  | `teamPresence.refreshAll`          |

---

### 013 — WhatsApp Coexistence (Stage 4 — Echo Processing + Source Tagging + Automation Guard)

- **Status:** Stage 4 Finalized — Awaiting Stage 5 (UI badge + Embedded Signup featureType)
- **Branch:** `feat/013-departments`
- **What was built in Stage 4:**
  - **`convex/lib/echoDeduplication.ts`** (NEW): `computeContentHash` (Web Crypto SHA-256 of contentType:content) + `findDuplicateOutbound` — secondary dedup, signature `(ctx, { conversationId, content, contentType, echoTimestamp })`, window anchored on echo's own timestamp (not Date.now()), default 5000ms via `ECHO_DEDUP_WINDOW_MS` env var; queries `by_conversation` on `createdAt` (≡ timestamp for api-sent messages)
  - **`convex/webhooks/processors/echoes.ts`** (REPLACED stub): Full 3-level dedup — Level 1 primary by wamid → Level 2 secondary content hash + time window → Level 3 tertiary insert as source="mobile"; kill switch (`coexistenceEnabled === false`); conversation SLA clear on mobile reply; does NOT reopen resolved conversations; does NOT increment unreadCount; does NOT call evaluateAndFireAutomations
  - **`convex/webhooks/processors/history.ts`** (REPLACED stub): Historical message backfill — iterates changes, extracts message-like objects from new_value, deduplicates by wamid; source tagged by direction: outbound → "mobile", inbound → "customer" (source = message origin, not delivery mechanism); only attaches to existing conversations (does not create new ones)
  - **`convex/webhooks/processors/appStateSync.ts`** (validator tightened): appState arg changed from v.string() to v.union(v.literal("business_app"), v.literal("cloud_api")); returns reason: "v1_stub_no_logic"; still log-only in v1
  - **`convex/webhooks/meta.ts`** (minor): Removed ! non-null assertions on history and smb_app_state_sync using local const narrowing; narrowed payload type for smb_app_state_sync to literal union
  - **`convex/webhooks/processors/messages.ts`** (source tagging): Added source: "customer" to createInbound call; added messageSource: "customer" to evaluateAndFireAutomations call
  - **`convex/messages.ts`** — two changes:
    - `createInbound`: added optional source arg (v.optional(v.union(...))), persisted on insert
    - `setMetaMessageId`: idempotent (no-op if already set); if a different row already owns the wamid, logs `[SET_WAMID] wamid_already_owned_by_other_row` and returns — no data deleted
  - **`convex/inbox.ts`** sendMessage: added source: "api" on outbound message insert (notes get undefined)
  - **`convex/automations.ts`** evaluateAndFireAutomations: added optional messageSource arg; early-return guard if messageSource is present and !== "customer" (skips automation eval for echoes and API replies)
- **Stage 4 invariants verified:**
  - Echo for existing wamid → primary dedup no-op; api source stays api ✅
  - Echo arrives before wamid patch → secondary hash dedup patches wamid on api row, source stays api ✅
  - Echo with no outbound match → tertiary insert, source=mobile, no unread, no automation ✅
  - Two echoes for same wamid → second hits primary dedup, no-op ✅
  - Customer message → messageSource="customer" passes the guard, automations still fire ✅
  - setMetaMessageId: wamid already owned by other row → logs anomaly, returns, no delete ✅
  - History inbound messages → source="customer"; history outbound → source="mobile" ✅
- **Deferred to Stage 5:**
  - MessageBubble UI badge (📱 icon for source="mobile" messages)
  - Embedded Signup featureType parameter (whatsapp_business_app_onboarding)
- **Notes:**
  - Media for echoes: metaMediaId stored, mediaUrl left undefined (download deferred to future task)
  - ECHO_DEDUP_WINDOW_MS is configurable via env var (default 5000ms)
- **Deferred (carry-forward TODOs for future task):**
  - `authorId: echo.from` in processEcho stores a business phone number, not a Clerk user ID — violates type contract of the field. Future fix: add separate `mobileSenderPhone` field on messages, set `authorId: undefined` for mobile sends, use new field for mobile-sender lookups
  - Mobile-sent messages (source="mobile") do not auto-reopen resolved conversations. If the business owner replies from mobile to a resolved thread, the message is stored but the conversation status stays resolved. The resolved conversation may surface high in the inbox via `lastMessageAt` sort. Revisit if reported as UX issue

---

### 013 — WhatsApp Coexistence (Stage 3 — Schema & Webhook Routing)

- **Status:** Stage 3 Complete (Schema + Webhook Router) — Awaiting Stage 4 (Deduplication Logic)
- **Branch:** `feat/013-departments`
- **What was built in Stage 3:**
  - **Schema changes:** Added 3 optional fields to support coexistence (all backward-compatible):
    - `channels.coexistenceEnabled: v.optional(v.boolean())` — kill switch to disable echo processing (defaults true)
    - `messages.source: v.optional(v.union(v.literal("customer"), v.literal("api"), v.literal("mobile")))` — tracks message origin
    - `messages.metaMediaId: v.optional(v.string())` — stores raw Meta media ID for echoes (media download deferred to future task)
  - **Webhook routing:** Updated `convex/webhooks/meta.ts` to dispatch three coexistence webhook fields:
    - `smb_message_echoes` → `processEcho` stub (logs only in v1; full dedup logic in Stage 4)
    - `history` → `processHistory` stub (logs only in v1; state sync in Stage 4)
    - `smb_app_state_sync` → `processAppStateSync` stub (logs only in v1; state tracking in Stage 4)
  - **New processor files (stubs for Stage 4):**
    - `convex/webhooks/processors/echoes.ts` — echo processing entry point
    - `convex/webhooks/processors/history.ts` — conversation state sync entry point
    - `convex/webhooks/processors/appStateSync.ts` — app state sync entry point
  - **TypeScript compilation:** ✅ Passes cleanly (npx tsc --noEmit)
  - **Convex schema:** ✅ Codegen successful (npx convex codegen); zero compilation errors
- **Deferred to Stage 4:**
  - 3-level deduplication strategy (primary by wamid, secondary by content_hash + time window, tertiary insert as mobile message)
  - Automation guard (skip automation evaluation for mobile-source messages)
  - Conversation metadata update (lastMessageAt, unreadCount for echoes)
  - UI source badge display (📱 icon for mobile messages)
- **Deferred to Stage 5:**
  - Embedded Signup featureType parameter (`whatsapp_business_app_onboarding`)
  - Conversation thread message source badge rendering with RTL support
- **Notes:**
  - Phase 2 rollout strategy updated: coexistence auto-enabled for all tenants once Meta enables per WABA; `coexistenceEnabled` is kill switch only
  - Media download for echoes deferred beyond Stage 5; `metaMediaId` stored but `mediaUrl` remains undefined for echoes
  - Message routing stubs log to `console.log` with JSON tag for debugging; no real processing in v1

---

### Cleanup — Remove 10 Dead Schema Tables (2026-05-04)

Removes 10 schema tables that were either schema-only (no callers anywhere) or wired-but-empty (UI rendered, write path had zero callers). All 10 were verified empty in the local Convex deployment — no destructive migration required, no behavior change to any live feature.

**Schema removed (10 tables):**

- Schema-only (no callers): `notificationPreferences`, `knowledgeBaseCategories`, `knowledgeBaseArticles`, `sentimentLogs`, `agentDailyStats`, `agentWorkloads`, `visualAutomations`, `automationNodes`, `automationEdges`
- Wired-but-empty: `customerJourneys` (UI always rendered the empty state — no insert path existed)

**Code removed:**

- `convex/customerInsights.ts` — dropped `listJourneys` query and `logJourneyEvent` mutation; surviving `getContactInsights` / `updateContactInsights` are unaffected
- `components/contacts/customer-journey-map.tsx` — full file delete
- `app/(dashboard)/contacts/[id]/page.tsx` — dropped `CustomerJourneyMap` usage; collapsed the now-degenerate two-tab `<Tabs>` shell on the right column to a single Card with `CardHeader` + `CardContent` (the surviving "Detailed Activity" tab promoted to a `CardTitle`)

**Docs:**

- `docs/superpowers/plans/2026-04-09-customer-journey.md` and `docs/superpowers/specs/2026-04-09-customer-journey-design.md` moved to `paused/` subdirectories (preserved for future revival, not deleted)
- Stale narrative references to `notificationPreferences` cleaned from `PROJECT_STATE.md` (3 lines) and `AUDIT_REPORT.md` (1 row)

**No behavior change.** No live query, mutation, action, or scheduled function referenced any of the removed tables.

Files: `convex/schema.ts`, `convex/customerInsights.ts`, `app/(dashboard)/contacts/[id]/page.tsx`, `components/contacts/customer-journey-map.tsx` (deleted), `PROGRESS.md`, `PROJECT_STATE.md`, `AUDIT_REPORT.md`, `docs/superpowers/{plans,specs}/2026-04-09-customer-journey*.md` (moved)

---

### Tabbed Transfer Dialog + Cross-Branch Forward + Inbox Queue Tree (2026-05-03)

Replaces the department-only transfer dialog with a tabbed flow covering both **within-branch routing** (department + optional agent + internal note) and **cross-branch forwarding** (sends a tenant-editable templated message to the customer through the source channel's number, then closes the conversation as `status: "forwarded"`).

**Schema delta:**

- `conversations.status` union extended with `"forwarded"`
- `conversations`: new `forwardedToChannelId`, `forwardedToDepartmentId`, `forwardedAt`, `forwardedBy` audit fields
- `messages.eventType` union extended with `transfer_within_channel` and `forward_to_branch` (legacy `transfer_department` retained for read compat)
- `messages.eventData` extended with target branch/dept fields
- `tenants.forwardMessageTemplates` (optional, `ar` / `en`)

**Server:**

- `conversations.transferWithinChannel` (replaces `transferToDepartment`; agent-accessible; supports optional agent + internal note)
- `conversations.forwardToBranch` action with paired `_validateForward` / `_finalizeForward` helpers — reads message status after Meta send and bails before finalizing if Meta rejected the send
- `conversations.previewForwardMessage` (server-rendered preview)
- `inbox.queueCounts` — role-scoped sidebar tree data
- `channels.listOtherChannelsForForward`
- `departmentMembers.listForDepartment`
- `lib/tenants.{getForwardTemplates,getForwardTemplatesPublic,updateForwardTemplate}`
- `messages.createOutboundForward`, `markFailed`, `getStatusInternal`
- Inbound 24h-reopen rule skips `status: "forwarded"` — forwarded conversations always start a fresh inbound

**UI:**

- New `components/inbox/transfer-dialog.tsx` (355 lines, tabbed) replaces deleted `transfer-department-dialog.tsx`
- New `components/inbox/inbox-queue-tree.tsx` (175 lines) — role-scoped queue tree in inbox sidebar
- New `components/settings/forward-template-card.tsx` (111 lines) — admin edits AR/EN forward templates from `/settings/general`

Files: `app/(dashboard)/inbox/page.tsx`, `components/inbox/{transfer-dialog,inbox-queue-tree,conversation-list,conversation-thread,message-bubble,message-input}.tsx`, `components/settings/{forward-template-card,general-settings}.tsx`, `convex/{conversations,channels,inbox,messages,schema}.ts`, `convex/lib/tenants.ts`

---

### CSAT End-to-End Fix + Score Surfacing (2026-05-02)

CSAT was silently broken: `conversations.setStatus` (the only mutation the UI calls) never scheduled the CSAT action — only the unused `inbox.updateStatus` did. Even when CSAT did run, `markCsatSent` no-op'd if the `conversationMetrics` row was missing, so `csatSentAt` was never recorded and customer 1–5 replies were treated as regular messages, reopening the conversation.

**Fixes (`ed413c8`):**

- `conversations.setStatus` now schedules `sendCsatMessage` when CSAT is enabled
- `markCsatSent` upserts the `conversationMetrics` row instead of failing on missing data
- `markCsatSent` inserts the rendered CSAT body as an outbound text message in the thread so agents can see what was sent
- `checkAndRecordResponse` inserts a `csat_received` system event with `eventData.csatScore` after recording the score

**Cycle-matching fix (`5ff394b`):**

- Previous logic took the most-recent conversation and checked its metric — but a contact can have multiple conversations and the open CSAT cycle may live on an older one. New logic scans all of the contact's conversations, filters to those with an open CSAT cycle (`csatSentAt` set, no later customer response), and picks the most recently-sent.

**Surfacing:**

- New amber thread pill: `⭐⭐⭐⭐⭐ Customer rated 5/5` via the new `csat_received` `eventType` (schema + MessageBubble)
- New `⭐ N/5` badge on each conversation card in the inbox list (`inbox.listForUser` joins `conversationMetrics`)
- New "Satisfaction" section in the contact panel: average, count, and last score (new `csat.getContactCsat` query)

Files: `convex/{csat,conversations,inbox,schema}.ts`, `components/inbox/{message-bubble,conversation-list-item,conversation-list}.tsx`, `components/contacts/contact-panel.tsx`, `.gitignore` (added `playwright-report/`, `test-results/`, `brainstorm content/`)

---

### 24-Hour Conversation Reopen Window + Real-Name Resolve Attribution (2026-05-02)

- Resolved/reopened activity pills now show the actual member name (Clerk profile via `useUser` → mutation arg) — not the literal "Agent". `inbox.updateStatus` creates the same system event so behavior is consistent between the two status mutations.
- New windowed-reopen behavior on inbound: when a customer replies within `channels.reopenWindowHours` (default 24h) of resolution, the same conversation reopens with a "↩ {customer} reopened" pill and the previously-assigned agent gets a notification. After the window, a brand-new conversation is created — fresh SLA, fresh assignment.
- Schema delta: `conversations.resolvedAt`, `channels.reopenWindowHours`; new `conversation_reopened` notification type
- Per-channel admin UI to configure the reopen window (1–720h) at `/settings/channels/[channelId]`

**Bundled in the same commit (in-progress work from prior sessions):**

- **Follow-ups precise scheduling**: `runAt` set to the exact dispatch time; sent follow-ups recorded back into the inbox conversation thread (`convex/followUps.ts` +341/-87 lines)
- **Notifications settings page**: `app/(dashboard)/settings/notifications/page.tsx` + `components/settings/notifications-settings.tsx` (240 lines)
- **Email template polish** across `agentWelcome`, `billingPaymentFailed`, `billingSubscriptionExpired`, `channelDeleted`, `channelExpiringSoon`, `followupDue`, `newAssignment`, `slaBreach`, and `base.tsx`
- Inbox page tightening, contact detail sheet adjustments, sign-in/up minor edits

Files: `convex/{channels,conversations,inbox,messages,notifications,followUps,schema,crons}.ts`, `convex/emails/**`, `components/inbox/{conversation-thread,message-bubble,status-selector}.tsx`, `components/ui/notification-bell.tsx`, `lib/notification-routes.ts`, `lib/shell/nav-config.ts`

---

### Conversation Activity Pills + Transfer Notifications + Conversation Claim (2026-05-02)

- New `system_event` message type with `eventType` + `eventData` fields on the `messages` table
- Centered, color-coded event pills replace internal-note transfer logs in the conversation thread: `transfer_department`, `agent_assigned`, `agent_unassigned`, `resolved`, `reopened`
- All pills bilingual (AR/EN) via `useT()`; rendered in `components/inbox/message-bubble.tsx`
- New `conversation_transferred` notification type — fans out to all department members + supervisors on transfer, skipping the actor
- New `conversations.claim` mutation: server-side membership check; non-privileged agents see a locked MessageInput until they claim an unassigned-to-them conversation
- New `components/inbox/claim-button.tsx` wired into both inbox pages
- Schema delta: `messages.eventType`, `messages.eventData`; `notifications` types union extended
- Bug fixes folded in: React Rules-of-Hooks fix in MessageInput (early return moved after hooks), double `getUserIdentity` removed in `setStatus`, `any` casts removed in `conversation-thread`, `Message` type exported from `message-bubble`

Files: `convex/{conversations,schema}.ts`, `convex/lib/tenants.ts`, `components/inbox/{claim-button,message-bubble,conversation-thread,message-input,assign-agent-dialog}.tsx`, `app/(dashboard)/inbox/{page,[id]/page}.tsx`, `components/ui/notification-bell.tsx`, `lib/shell/nav-config.ts`

---

### General Settings Page + Resend Template Sync Tooling (2026-05-01)

- New `app/(dashboard)/settings/general/page.tsx` + `components/settings/general-settings.tsx` (90 lines) — workspace-wide settings landing
- `scripts/sync-resend-templates.ts` (256 lines): syncs React Email templates → Resend; produces `scripts/resend-template-ids.json` mapping
- `scripts/test-email.ts` (65 lines): one-off send for verifying template rendering against a real address
- No schema or runtime impact — tooling-only addition

---

### CLAUDE.md §30 — AI Agent Behavior Rules (2026-05-03)

- Added §30 to `CLAUDE.md`: think-before-coding, simplicity-first, surgical-changes, goal-driven execution, stage output requirements, rejection triggers, and definition of "trivial"
- Establishes mandatory stage-gated workflow for all non-trivial tasks: BEFORE/AFTER diffs at stage boundaries, literal `npx tsc --noEmit` output, `PROGRESS.md` entry per stage, push-back invitation
- Lists explicit rejection triggers (e.g., summary instead of code, out-of-scope file edits, `any` types, unrequested "improvements", placeholder code)
- Doc-only — no code or schema impact

---

### Notification Preferences Feature (2026-05-04)

Adds per-user notification preferences with channel-specific toggles. Users can opt
out of in-app or email notifications for each event type independently. Free plans get
in-app notifications only; Starter+ plans unlock the email channel. Two events
(sla_breach, csat_received) are Growth+-only.

**New schema:**

- `notificationPreferences` table — per-user × event-type × channel preferences (~14 rows per user max)
- New literals: `conversation_assigned` and `channel_token_expired` added to `notifications.type` union (alongside the legacy `new_assignment` and `channel_expiring_soon`)

**New code:**

- `convex/notifications.ts` — `notifyDispatch` (central mutation; reads prefs, gates by plan, writes in-app, schedules email), `notifySend` (action; resolves email via Clerk Node, dispatches to Resend), `getPreferences` + `updatePreference` (CRUD)
- `convex/lib/notificationEvents.ts` — single source of truth for event types, defaults, plan-gating, and the daily-email-cap key builder
- `convex/lib/rateLimit.ts` — `tryConsumeQuota` helper (soft cap, never throws — counterpart to `enforceRateLimit`)
- `convex/lib/tenants.ts` — `readPlan` helper (sync plan-fetch for mutation context)
- `convex/emails/templates/{conversationTransferred,conversationReopened,csatReceived}.tsx` — 3 new React Email templates
- `app/(dashboard)/settings/notifications/page.tsx` — tabbed page (Log + Preferences)
- `components/settings/notifications-{tab-shell,preferences,preferences-row,error-boundary}.tsx` — UI components
- `hooks/use-notification-preferences.ts` — single hook with optimistic updates + plan-aware gating flags
- `lib/notifications/eventLabels.ts` — UI-side event labels with en/ar translations

**Refactored:**

- 9 existing notification call sites migrated from direct `ctx.db.insert("notifications", ...)` to `notifyDispatch`
- 3 new call sites added to close gaps: `assign` and `assignInternal` now write in-app rows; `csat.ts checkAndRecordResponse` now dispatches a notification
- 3 unused `*Email` internalAction exports removed from `notifyEmail.ts`: `slaBreachEmail`, `followupDueEmail`, `newAssignmentEmail`
- `followUps.ts` literal corrected from `channel_expiring_soon` (semantic mismatch — was actually a token-expiry event) to `channel_token_expired`

**Cost economics:**

- Resend free tier (3000/mo, 100/day) supports the launch phase; conservative email defaults keep ~30 emails/day per active tenant
- Per-plan daily cap: Starter 50, Growth 200, Business 1000; soft cap silently drops over-cap emails (in-app still fires)
- Upgrade Resend Pro at ~5 paying tenants

**Files: 23 files changed across 5 implementation commits + 1 PROGRESS.md commit (this commit).**

Implementer: GLM 5.1 (cheaper coding model). Reviewer: Claude Code. Approver: Ahmed. Planning artifacts at `docs/superpowers/plans/notification-prefs/01-foundation.md` through `06-execution.md`.

---

### task/032-auth-migration-stage-0 — Clerk → Better Auth Discovery Inventory (2026-05-06)

- task/032-auth-migration-stage-0: Discovery inventory for Clerk → Better Auth migration. Read-only audit; no source files modified. Produced docs/migration/clerk-to-better-auth/STAGE_0_INVENTORY.md cataloging: package.json deps, middleware.ts, convex/auth.config.ts, convex/lib/auth.ts helpers, all ctx.auth.getUserIdentity() call sites with file:line, all assertAdmin/assertAdminOrSupervisor/getCallerRole call sites, all useUser/useAuth/useOrganization usages, all <SignedIn/>/<UserButton/>/<OrganizationSwitcher/> usages, app/(auth)/\* page designs, /select-org, /accept-invite, /join/[token] flows, Clerk webhook handlers (none found), and Clerk Node SDK call sites. Baseline `npx tsc --noEmit` clean.
  - Verification round: confirmed @better-auth/infra is a real published package ("Dashboard and analytics plugin for Better Auth" by the Better Auth core team, unused in source), inventoried lib/shell/role-utils.ts (10 import sites; HIGH-risk supervisor bare-string fallback gap identified), verified <SignedIn/>/<SignedOut/>/<Protect/> are not used — protection is via clerkMiddleware only. STAGE_0_INVENTORY.md §9 appended. §3.2 addendum added.

### task/033-auth-migration-stage-1 — Clerk → Better Auth Architecture Mapping (2026-05-06)

- task/033-auth-migration-stage-1: Architecture mapping for Clerk → Better Auth migration. Planning only; no code, no installs, no source edits. Produced docs/migration/clerk-to-better-auth/STAGE_1_ARCHITECTURE.md (600 lines) mapping every Clerk concept from Stage 0 inventory to Better Auth equivalent, with citations. Locked Option A (preserved "org:" role prefix). Defined JWT definePayload strategy (orgId + orgRole via session additionalField + databaseHooks). Documented local install decision (required for org plugin + schema customization). Produced 5-section migration scope table (30 files + 8 new), Stage 3 verification checklist, Better Auth schema tables inventory. Surfaced 10 open questions for Ahmed (see §4): Q1 active-org auto-set, Q2 avatar storage, Q3 ban/unban, Q4 member data source, Q5 tenants table relationship, Q6 shareable invite link, Q7 audit logs, Q8 role-utils supervisor fix, Q9 social auth providers, Q10 org slug generation. Stage 2 (BEFORE/AFTER diffs against pinned library versions) blocked on Q9 (social auth confirm) and Ahmed's review of all 10 questions.
  - Stage 1 closeout: locked Q1–Q10 answers (Q9 = Option B with Google + Facebook OAuth). Resolved 6 review flags: tenants-row timing (Pattern A — lazy), new-user-no-org verification step (#6 added to §6), middleware.ts decision (delete), cookie/CORS strategy documented, Q2/Q3 UI deletion scope made explicit, OAuth redirect URI operational checklist added. STAGE_1_ARCHITECTURE.md §9 appended; §5.2 numbering bug fixed. Stage 2a ready to open.

### task/034-auth-migration-stage-2a — Clerk → Better Auth Foundation Files Diff (2026-05-06)

- task/034-auth-migration-stage-2a: Foundation files diff for Clerk → Better Auth migration. Planning only; no installs, no source modifications. Produced docs/migration/clerk-to-better-auth/STAGE_2A_FOUNDATION.md with: pinned versions (@convex-dev/better-auth@0.12.2, better-auth@~1.6.9), 3 architecture corrections from doc research (Better Auth instance lives in Convex not Vercel; all 6 auth env vars go on Convex not Vercel; no crossDomain plugin for Next.js), 6-variable Convex env setup + 1 Vercel env addition, BEFORE/AFTER diffs for 4 modified files (package.json, convex/convex.config.ts, convex/auth.config.ts, convex/http.ts), full content for 7 new files (convex/auth.ts, convex/betterAuth/convex.config.ts, convex/betterAuth/auth.ts, lib/auth-client.ts, lib/auth-server.ts, app/api/auth/[...all]/route.ts) plus CLI step for convex/betterAuth/schema.ts, Stage 3 ordered 16-step application list, 6 verification gate mappings, and explicit out-of-scope list. Flagged colon role name risk (OQ-4, Stage 3 day-one verification) and session.additionalFields uncertainty (OQ-1). Stage 2b ready to open after review.

### task/035-auth-migration-stage-2b — Clerk → Better Auth Auth Helpers + Middleware Plan (2026-05-06)

- task/035-auth-migration-stage-2b: Auth helpers + middleware plan for Clerk → Better Auth migration. Planning only; no installs, no source modifications. Produced docs/migration/clerk-to-better-auth/STAGE_2B_LIB_AUTH.md with: convex/lib/auth.ts simplification (24 lines deleted, NO_ROLE guard added to both getCallerIdentity and getCallerRole, all four exported signatures and OrgRole type preserved byte-for-byte, FORBIDDEN guard in getCallerRole made reachable where it was previously dead code), middleware.ts deletion plan with Stage 2d sequencing dependency (deletion must not precede app/(dashboard)/layout.tsx gaining isAuthenticated() guard), convex/lib/tenants.ts cleanup abandoned—both getEmailLocalePublic and getForwardTemplatesPublic return graceful defaults on missing identity at lines 135 and 170; routing through getCallerIdentity would convert silent returns to thrown errors, breaking the intentional public-query pattern; field name identity.orgId continues to work post-Stage-2a because definePayload emits orgId under that exact key. Stage 2c ready to open after review.

---

## 🔄 Partially Completed

### Revenue Analytics — Schema Exists, No UI

- **What's done:** `contacts.spent`, `contacts.spentCurrency` fields in schema; `followUps.expectedRevenue`, `followUps.currency` fields; `RevenueWidget` component exists
- **What's missing:** No UI to input actual revenue per conversation or per contact. No analytics query for revenue over time. `RevenueWidget` displays the field but there's no editor.

### WhatsApp Business Profile — Display Name "Pending Review" State

- **What's done:** `updateProfile` action in `convex/waBusinessProfile.ts`, full edit form at `/settings/channels/[channelId]/profile`
- **What's missing:** Display name changes require Meta review (not instant). Per CLAUDE.md §28, the UI should show an amber "Pending Meta Review" badge and poll for approval. This state tracking is not confirmed in the component scan.

---

## ❌ Not Started / Deferred

| Feature                                  | Notes                                                                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| ~~**Paddle Billing Integration**~~       | ✅ Completed                                                                                                                |
| ~~**Broadcasts Sending Loop**~~          | ✅ Completed                                                                                                                |
| ~~**Shareable Invite Link UI**~~         | ✅ Completed                                                                                                                |
| ~~**Conversation / Message Search**~~    | ✅ Completed — `convex/search.ts`                                                                                           |
| ~~**Batch Actions on Inbox**~~           | ✅ Completed — `convex/batchActions.ts`                                                                                     |
| ~~**Agent Online/Offline Status**~~      | ✅ Completed — presence system via `convex/presence.ts`                                                                     |
| ~~**Conversation Merging**~~             | ✅ Completed — `convex/conversationMerge.ts`                                                                                |
| ~~**Rate Limiting**~~                    | ✅ Completed — `convex/lib/rateLimit.ts`                                                                                    |
| ~~**Email Notifications**~~              | ✅ Completed — React Email + Resend, 9 template pairs                                                                       |
| ~~**Message Scheduling**~~               | ✅ Completed — `convex/messageScheduling.ts`                                                                                |
| **Invite by WhatsApp**                   | CLAUDE.md §19: Admin enters agent phone → send invite via WhatsApp. Low priority — email + shareable link cover most cases. |
| **WA Display Name Pending Review Badge** | Profile edit form exists; amber "Pending Meta Review" badge not confirmed in UI component scan                              |
| **Revenue Analytics UI**                 | `contact.spent` schema exists, no input UI or revenue-over-time query                                                       |
| **AI / Chatbot Integration**             | Rules-based automation only. No LLM-powered auto-replies. Phase 2.                                                          |
| **WhatsApp Catalog**                     | CLAUDE.md §6 explicitly deferred to Phase 2.                                                                                |
| **WooCommerce / Shopify Integration**    | Phase 2.                                                                                                                    |
| **WhatsApp OTP**                         | Phase 2.                                                                                                                    |

---

## 🗂️ Current File Structure

```
/
├── app/
│   ├── (dashboard)/              # Protected routes (Clerk-gated)
│   │   ├── inbox/                # Shared inbox (main feature)
│   │   ├── contacts/             # CRM-lite contact management
│   │   ├── lists/                # Contact list segmentation
│   │   ├── broadcasts/           # Broadcast campaigns + broadcast templates
│   │   ├── automations/          # Automation rules builder
│   │   ├── analytics/            # Team analytics (Admin/Supervisor)
│   │   ├── my-stats/             # Personal stats (all roles)
│   │   └── settings/
│   │       ├── layout.tsx         # Settings sub-nav wrapper
│   │       ├── channels/         # Channel list + per-channel settings + WA profile
│   │       ├── team/             # Team members, invite, roles, member profile modal
│   │       ├── labels/           # Conversation label library
│   │       ├── quick-replies/    # Quick reply CRUD (with variable fill-in)
│   │       ├── templates/        # Message templates + Template Library tab
│   │       ├── csat/             # CSAT v2 settings (button template, preview, test send)
│   │       ├── export/           # Data export
│   │       └── billing/          # Paddle billing
│   ├── api/webhook/whatsapp/     # Meta webhook endpoint (GET verify + POST handler)
│   ├── onboarding/               # Onboarding wizard
│   ├── sign-in/, sign-up/        # Clerk auth pages
│   ├── join/[token]/             # Invite link join page
│   ├── privacy/, terms/, dpa/    # Legal pages
│   └── page.tsx                  # Marketing landing page
├── components/
│   ├── inbox/                    # Conversation list, thread, message bubble, input, search
│   ├── contacts/                 # Contact list, panel, timeline, CSV import
│   ├── analytics/                # Dashboard charts (Recharts)
│   ├── automations/              # Rule cards, form, business hours
│   ├── broadcasts/               # Campaign list, creation wizard, broadcast template builder
│   ├── lists/                    # Contact list pages
│   ├── onboarding/               # Wizard steps
│   ├── settings/                 # All settings page components + settings-sub-nav.tsx
│   ├── shell/                    # Sidebar, user menu, notification bell, presence-initializer
│   ├── team/                     # member-profile-modal.tsx + member-profile/ tabs
│   ├── templates/                # Template picker, fill form, library tab, meta submit form
│   ├── marketing/                # Landing page sections + legal page content components
│   └── ui/                       # shadcn/ui primitives + presence-indicator, team-presence-dropdown
├── convex/
│   ├── schema.ts                 # 32-table schema (all real)
│   ├── http.ts                   # metaWebhook HTTP action
│   ├── crons.ts                  # 6 scheduled jobs
│   ├── actions/
│   │   ├── sendWhatsAppMessage.ts  # All outbound Meta API calls
│   │   ├── roundRobin.ts           # Round-robin assignment logic
│   │   ├── validateInvite.ts       # Invite token validation
│   │   ├── channelRetentionAction.ts # Channel purge action
│   │   ├── notifyEmail.ts          # Email dispatch (AR/EN routing)
│   │   ├── sendEmail.ts            # React Email + Resend send action
│   │   ├── sendInviteWhatsApp.ts   # WhatsApp invite sending
│   │   └── processBroadcastBatch.ts # Batched broadcast sending
│   ├── lib/
│   │   ├── auth.ts                # getCallerIdentity, assertAdmin, assertAdminOrSupervisor
│   │   ├── encryption.ts          # AES-256-GCM for access tokens
│   │   ├── planLimits.ts          # Plan quota checks
│   │   └── rateLimit.ts           # Token-bucket rate limiter
│   ├── emails/                    # React Email base layout + template components
│   ├── inbox.ts, conversations.ts, messages.ts, messageScheduling.ts
│   ├── contacts.ts, customFields.ts, contactEvents.ts, contactsImport.ts, contactsImportHelpers.ts
│   ├── contactLists.ts, broadcasts.ts, broadcastTemplates.ts, metaTemplates.ts
│   ├── channels.ts, channelMembers.ts, channelRetention.ts
│   ├── departments.ts, departmentMembers.ts
│   ├── analytics.ts, conversationMetrics.ts, search.ts
│   ├── labels.ts, quickReplies.ts, messageTemplates.ts
│   ├── csat.ts, sla.ts, notifications.ts
│   ├── automations.ts, followUps.ts, batchActions.ts, conversationMerge.ts
│   ├── members.ts, memberQueries.ts
│   ├── presence.ts, teamPresence.ts, teamPresenceQueries.ts
│   ├── onboarding.ts, orgMembers.ts
│   ├── waBusinessProfile.ts, export.ts
│   ├── webhookEvents.ts, migrations.ts
│   └── seed.ts                    # Dev-only seed data
├── emails/                        # React Email template files (9 types × AR+EN = 18 files)
├── lib/
│   ├── utils.ts, phoneGeo.ts, automationHelpers.ts, templateHelpers.ts, cityData.ts
│   ├── templateLibrary.ts         # 66 pre-built templates with industry tags
│   ├── shell/                     # nav-config, role-utils, locale-action, types
│   ├── i18n/                      # AR/EN translation context (useT, useLocale)
│   └── marketing/                 # Pricing data, marketing i18n
├── hooks/
│   ├── use-mobile.ts, use-member-profile.ts, use-presence.ts
├── types/
│   └── meta.ts                    # TypeScript types for Meta API payloads
├── middleware.ts                   # Clerk auth middleware
└── CLAUDE.md                       # Project spec (do not modify unless asked)
```

---

## 📋 Recommended Next Steps (Priority Order)

| #   | Task                                     | What's needed                                                                                                                                      | Blocker?                                     |
| --- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1   | **WA Display Name Pending Review Badge** | `wa-business-profile.tsx`: show amber "Pending Meta Review" badge for display name changes; poll Meta API for approval — CLAUDE.md §28 requirement | Low — polish                                 |
| 2   | **Revenue Analytics UI**                 | Input field for `contact.spent` in contact panel; revenue-over-time chart in analytics dashboard                                                   | Nice-to-have                                 |
| 3   | **Invite by WhatsApp**                   | CLAUDE.md §19: send invite link via WhatsApp when admin enters agent phone number                                                                  | Low priority — email + link cover most cases |
| 4   | **CSAT Meta Template Approval**          | Submit CSAT button template to Meta for pre-approval; currently unverified                                                                         | Required before production CSAT use          |
| 5   | **Production Hardening**                 | Webhook signature verification, SLA breach clearing audit, CSAT template approval                                                                  | Required before launch                       |

---

## Auth Migration: Stage 2d Phase 1

- **task/039-auth-migration-stage-2d-phase-1**: Stage 2d Phase 1 — auth hooks shim + call site updates. Planning only; no installs, no source modifications. Produced `docs/migration/clerk-to-better-auth/STAGE_2D_PHASE_1.md` with: §1 discovery (Stage 0 §3.1 reconciliation — 33 files with `@clerk/nextjs` imports confirmed, 6 new files found since Stage 0, 0 files removed; 28 hook-using files in Phase 1 scope, 5 JSX-only files deferred to Phase 2, 1 provider file deferred to Phase 3), §2 `lib/auth-hooks.ts` shim design (118 lines, exposes 5 `useAuth()` fields, 7 `useUser()` fields, 10 `useOrganization()` fields per §1.3 matrix; memberships handled via Option A — Convex query `api.orgMembers.listActive`; non-goals documented; deletion path for post-launch cleanup), §3 28 call site BEFORE/AFTER diffs (27 files = 1 line import change, 1 file = 2 lines to split combined import; `user-menu.tsx` keeps JSX component imports on `@clerk/nextjs` for Phase 2). No `useClerk()`, `auth.has()`, or `<SignedIn>` found in codebase. Phase 1.5 follow-ups: none. Phase 2 (auth page rebuilds, select-org, accept-invite, join, user-menu JSX, step-workspace-name CreateOrganization) and Phase 3 (provider swap, dashboard layout guard, middleware, role-utils Q8, UI deletion) still ahead.

---

## Auth Migration: Stage 2c.3

- **task/040-auth-migration-stage-2c-3**: Add `convex/orgMembers.ts:listActive` query — closes Stage 2d Phase 1 missing-query gap. Planning only; no installs, no source modifications. Produced `docs/migration/clerk-to-better-auth/STAGE_2C3_LIST_ACTIVE_QUERY.md` with: §2 discovery (current `convex/orgMembers.ts` verbatim — 322 lines, 5 exports all wrapped as `action`; naming collision check confirmed empty; existing `list` wrapping declaration confirmed `action` with admin/supervisor gating; helper imports `getCallerIdentity` and `authComponent` confirmed present post-Stage-2c; 1 new import needed — `query` added to existing `import { action, internalQuery }` line), §3 new `listActive` query (34 lines, `query` wrapping, returns flat `{ memberId, userId, name, email, image, role }[]` for shim consumers; mirrors Stage 2c §8.2 adapter `findMany` + `Promise.all` + `findOne` pattern; appended at line 323 after `removeMember`), §4 behavioral verification (no admin gating — all roles can read; returns `[]` on empty; current user included in results), 4 open questions logged (member PK field name `_id` vs `id`; `findMany` `operator: "in"` support; `"use node"` coexistence with `query`; adapter `findOne` null handling). Stage 2d Phase 2 unblocked once Stage 3 applies this alongside `lib/auth-hooks.ts`.

---

- **task/041-auth-migration-stage-2c-3-revision**:
  Stage 2c.3 corrected to Path X — listActive query placed in new file convex/orgMembersQueries.ts (not convex/orgMembers.ts) due to Convex runtime rule prohibiting query/mutation declarations in "use node" files (per docs.convex.dev/functions/runtimes). Prior Stage 2c.3 deliverable replaced by corrected version. Stage 2d Phase 1 amended via STAGE_2D_PHASE_1_AMENDMENT.md — one-line shim correction: api.orgMembers.listActive → api.orgMembersQueries.listActive. Source code surface area unchanged from prior Stage 2c.3 plan (same listActive implementation, same return shape, same shim consumers); architectural placement corrected. OQ-3 from prior version (use node coexistence) is RESOLVED via Path X. Stage 2d Phase 2 unblocked.

---

### 2026-05-07: Clerk → Better Auth Migration — Stage 2d Applied (All Frontend + Server-Side Auth Migration) ✅ ZERO TS ERRORS

**Branch:** `feat/clerk-to-better-auth`

**Files modified (27) + created (3):**

**Server-side layouts / pages (all `@clerk/nextjs/server` imports eliminated):**
- `app/page.tsx` — MODIFIED: replaced `auth()` + `clerkClient()` with `isAuthenticated()` + `fetchAuthQuery(api.orgMembersQueries.getCurrentUserProfile)`
- `app/(dashboard)/layout.tsx` — MODIFIED: import + auth body rewritten; `profile.image ?? ""` (not `null`) to match `ResolvedUser.imageUrl: string`
- `app/(dashboard)/analytics/layout.tsx` — MODIFIED: `auth()` + `getToken` + `fetchQuery` → `getServerAuth()` + `fetchAuthQuery`
- `app/(dashboard)/analytics/page.tsx` — MODIFIED: removed unused `auth()` call (layout already guards role)
- `app/(dashboard)/contacts/layout.tsx` — MODIFIED: `auth()` → `getServerAuth()`
- `app/(dashboard)/my-stats/page.tsx` — MODIFIED: `auth()` → `getServerAuth()`
- `app/(dashboard)/settings/billing/layout.tsx` — MODIFIED: `auth()` → `getServerAuth()`
- `app/(dashboard)/settings/channels/layout.tsx` — MODIFIED: `auth()` → `getServerAuth()`
- `app/(dashboard)/settings/general/page.tsx` — MODIFIED: `auth()` → `getServerAuth()`
- `app/(dashboard)/settings/layout.tsx` — MODIFIED: `auth()` → `getServerAuth()`
- `app/(dashboard)/settings/team/page.tsx` — MODIFIED: `auth()` → `getServerAuth()`
- `app/onboarding/layout.tsx` — MODIFIED: `auth()` + `getToken` + `fetchQuery` → `getServerAuth()` + `fetchAuthQuery`
- `app/accept-invite/page.tsx` — REWRITTEN: simplified to `redirect("/inbox")` (invite acceptance via `[invitationId]` dynamic route)

**New files created:**
- `app/accept-invite/[invitationId]/page.tsx` — CREATED: client component state machine (loading → redirecting → accepting → accepted/error) using `authClient.organization.acceptInvitation({ invitationId })`
- `app/(auth)/sign-in/[[...sign-in]]/page.tsx` — REWRITTEN: custom email + password form using `authClient.signIn.email()`; supports `?redirectTo` query param; matches existing glassmorphism card design
- `app/(auth)/sign-up/[[...sign-up]]/page.tsx` — REWRITTEN: custom name + email + password form using `authClient.signUp.email()`; redirects to `/onboarding` on success
- `app/select-org/page.tsx` — REWRITTEN: uses `authClient.useListOrganizations()` (reactive atom hook) with type assertion; `authClient.organization.setActive()` on click; shows "Create Workspace" fallback
- `app/join/[token]/page.tsx` — REWRITTEN: removed `<SignIn>` Clerk component; replaced with `useEffect` redirect to `/sign-in?redirectTo=/join/${token}` when unauthenticated; existing validateAndJoin flow preserved
- `components/shell/user-menu.tsx` — REWRITTEN: `SignOutButton` → `authClient.signOut()` with `router.push("/")`; `OrganizationSwitcher` removed; `useAuth`, `useUser` from `@/lib/auth-hooks`
- `components/onboarding/step-workspace-name.tsx` — REWRITTEN: `<CreateOrganization>` → custom form using `authClient.organization.create()` + `setActive()` + `ensureCreated()`; `useEffect` on `orgId` preserved

**Client components (22 files — import path only):**
All 22 files changed `from "@clerk/nextjs"` → `from "@/lib/auth-hooks"` via bulk `sed` (no logic changes).

**Logic fixes in client components:**
- `components/inbox/conversation-list-item.tsx:118` — removed dead `|| membership?.role === "admin"` comparison (TypeScript narrowing after `=== "org:admin"` eliminated `"admin"` from overlap)
- `components/inbox/status-selector.tsx:31` — `user?.primaryEmailAddress?.emailAddress` → `user?.emailAddresses[0]?.emailAddress`
- `components/shell/my-profile-modal.tsx` — replaced `user.update({ firstName, lastName })` with `authClient.updateUser({ name })`; replaced `user.setProfileImage({ file })` (upload) with Convex storage upload (`generateAvatarUploadUrl` → POST → `getStorageUrl` → `authClient.updateUser({ image })`); replaced `user.setProfileImage({ file: null })` with `authClient.updateUser({ image: null })`; URL-save simplified to `authClient.updateUser({ image: url })` directly

**New Convex function (1 additive):**
- `convex/profiles.ts:getStorageUrl` — public mutation wrapping `ctx.storage.getUrl(storageId)`, used by `my-profile-modal.tsx` to get the download URL after file upload

**New Convex query (1 additive, in previously created file):**
- `convex/orgMembersQueries.ts:getCurrentUserProfile` — query using `ctx.auth.getUserIdentity()` directly (avoids `getCallerIdentity` which throws `NO_ORG`); returns `{ userId, orgId, orgRole, name, email, image, orgName } | null`

**lib additions (all previously created or extended):**
- `lib/auth-server.ts` — added `getServerAuth()` helper (JWT base64url decode; gives `{ userId, orgId, orgRole }` without Convex round-trip)
- `lib/auth-hooks.ts` — created in prior session: `useAuth()`, `useUser()`, `useOrganization()` shims
- `middleware.ts` — rewritten in prior session: cookie-based auth check
- `components/convex-client-provider.tsx` — rewritten in prior session
- `components/clerk-provider-with-locale.tsx` — passthrough (preserves `LOCALE_CHANGE_EVENT` export for `brand-panel.tsx` + `lib/marketing/i18n.ts`)

**TypeScript baseline:**
- Pre-Stage-2d: 94 errors (all Clerk TS2307 + Bug A TS2339 residuals)
- Post-Stage-2d: **0 errors** ✅
- `npx tsc --noEmit` output: (empty — zero errors)

**Open items carried into Phase 3 (runtime verification):**
- `npx convex codegen` — must be run to regenerate `_generated/api.d.ts` and populate `components.betterAuth` (all Bug A self-heal after this)
- OQ-4 (carry-over): verify Better Auth 1.6.9 emits colon-prefixed role strings (`"org:admin"` etc.) at runtime
- `authClient.useListOrganizations()` type assertion in `select-org/page.tsx` — verify actual return type at runtime matches `Org[]` shape
- `authClient.organization.setActive({ organizationId })` — verify method name matches installed version (might be `setActiveOrganization`)
- `app/accept-invite/[invitationId]/page.tsx` — verify `authClient.organization.acceptInvitation({ invitationId })` method name + return shape

---


---

### 2026-05-11: Query Performance Optimization — Scale Hardening ✅ ZERO TS ERRORS

**Branch:** `feat/clerk-to-better-auth`

**Motivation:** 33-table schema with unbounded `.collect()` calls in hot-path queries (inbox list, sidebar counts, analytics) would degrade the real-time experience at tenant scale (1000+ contacts, 10000+ messages). The worst offenders were O(N) full-tenant scans that load every document then discard most, and an N+1 pattern in analytics that issued one `ctx.db.get()` per metric row.

**Files changed (4):**

**`convex/schema.ts` — 2 additive indexes:**
- `conversations.by_tenant_status_last_message` on `["tenantId", "status", "lastMessageAt"]` — enables the inbox list to skip to only open/pending/resolved rows and return them sorted by recency in a single bounded read; previously required a full-tenant `by_last_message` scan + in-memory status filter
- `contacts.by_tenant_created` on `["tenantId", "createdAt"]` — enables date-range analytics queries (revenue, contact growth) to be pushed to the database index instead of filtering in memory after a full tenant scan

**`convex/inbox.ts` — 6 changes:**
- `listConversations`: `collect()` → when `args.status` is provided, uses new `by_tenant_status_last_message` index (reads only matching rows, ordered); all other cases bounded with `take(1000)`. Previously loaded all conversations for the tenant on every inbox render.
- `getMessages`: `collect()` → `take(200)` — bounds per-conversation message load
- `getMessagesPaginated`: new query — exposes `paginationOptsValidator` for cursor-based infinite scroll in the conversation thread UI
- `getInternalNotesByContact`: conversations `collect()` → `take(20)`
- `queueCounts` open/pending scans: `collect()` → `take(5000)` — these feed per-channel/per-dept counts in the sidebar tree; bounded to prevent unbounded transaction reads
- `queueCounts` resolved/forwarded scans: `collect()` → `take(9999)` — sidebar counts only; unread notifications: `collect()` → `take(999)`

**`convex/messages.ts` — 1 change:**
- `listForConversation`: replaced `messages.some(m => m.followUpId !== undefined)` full-array scan (required loading all messages first) with `conversation.hasFollowUp` — the denormalized flag already maintained by `followUps` mutations. `collect()` → `take(500)`. The follow-up visibility check now costs 0 extra reads instead of N.

**`convex/analytics.ts` — 5 changes:**
- `getMyStats` admin path: added `.gte("createdAt", startOfMonth)` to `by_tenant_created` index query — was iterating ALL metrics for the tenant then discarding those before start-of-month in memory
- `getLabelDistribution`: eliminated N+1 (`metrics → ctx.db.get(conversationId)` per row); now queries `conversations` directly via the existing `by_last_message` index with `startTs`/`endTs` range — no extra reads per conversation
- `getRevenueByCurrency`: uses new `by_tenant_created` index with `startTs`/`endTs` range; `isArchived` filter applied in memory (post-range, cheap). Was: full `by_tenant_archived` scan → date filter in memory.
- `getContactsByRevenueCurrency`: same fix as above
- `getContactActivity`: unbounded `for await` → `.take(100)`

**TypeScript:**
- Pre: 0 errors (baseline from previous session)
- Post: **0 errors** ✅
- `npx tsc --noEmit` output: (empty — zero errors)

**Acceptance criteria status:**
- ✅ No query scans entire table — all hot-path queries now use indexed fields with explicit bounds
- ✅ Contact list paginates correctly — `contacts.listForTenant` already used `paginationOptsValidator`; `by_tenant_created` index added for analytics
- ✅ Conversation list bounded — `take(1000)` with status-indexed fast path
- ✅ `getMessagesPaginated` available for UI to wire infinite scroll
- ✅ Analytics N+1 eliminated; date-range filtering pushed to DB level
- ⚠️ Load test at 1000 contacts / 10000 messages — requires real Convex function execution time logs (Convex dashboard → Functions tab); not automatable from CLI

---

### 2026-05-11: WhatsApp Catalog Integration ✅ ZERO TS ERRORS

**Branch:** `feat/clerk-to-better-auth`

**Motivation:** Phase 2 feature — agents can browse products from a connected Meta Commerce Manager catalog directly inside conversations and send single-product cards to customers. Admins can also create and edit products manually within WABDesk without relying solely on Meta sync.

**Files created (5):**

**`convex/catalog.ts`** — Full catalog backend:
- `listProducts` / `searchProducts` / `getSyncStatus` — public queries (auth + tenant-scoped)
- `updateChannelCatalog` / `triggerManualSync` — admin-only, plan-gated (`assertCatalogAllowed` → Growth+)
- `createProduct` / `updateProduct` / `deleteProduct` — admin-only CRUD for manual products; `createProduct` checks for duplicate `retailerId` via `by_channel_retailer` index
- `clearChannelProducts` (internal) — clears `source !== "manual"` rows only; manual products survive re-syncs
- `insertProductBatch` (internal) — bulk insert up to 100 products per call

**`convex/actions/syncCatalog.ts`** — Meta Commerce Manager sync action:
- `fetchAllProducts` — paginates `GET /{catalog-id}/products` with cursor; truncates at 5000 products with a warning log
- `syncChannelCatalog` (internalAction) — reads channel token (decrypted) or falls back to `WHATSAPP_API_TOKEN`; clears synced rows then re-inserts via `insertProductBatch` in 100-item batches
- `syncAllCatalogs` (internalAction) — iterates all channels with `catalogId` set; called by daily cron

**`components/catalog/catalog-browser.tsx`** — Inbox product browser popover:
- Resolves `channelId` from `api.conversations.get`; skips queries when loading
- Returns `null` (hidden) when `syncStatus.catalogId` is falsy — no button for channels without a catalog
- `searchProducts` with live `q` state (50-result bounded); product rows with thumbnail, name, price, per-row Send button
- Send calls `api.messages.sendProductCard`; closes popover on success; shows toast on error

**`components/settings/catalog-settings.tsx`** — Admin settings component with full product CRUD:
- `ChannelCatalogCard` — catalog ID input + Save; Sync from Meta button (shows product count + last sync date); Products section with search + list
- `ProductRow` — shows thumbnail, name, retailer ID (monospace), price, "Manual" badge for `source: "manual"` products; hover-reveal Edit / Delete actions; delete uses `AlertDialog` confirmation
- `ProductFormDialog` — Dialog with fields: retailer ID (create-only), name, description, price + currency, image URL; handles `RETAILER_ID_EXISTS` and `CATALOG_NOT_CONFIGURED` error codes explicitly

**`app/(dashboard)/settings/catalog/page.tsx`** — Page wrapper

**Files modified (11):**

**`convex/schema.ts`:**
- `channels` table: added `catalogId: v.optional(v.string())`
- `messages.contentType` union: added `v.literal("product")`
- `catalogProducts` table (new, 35th table): `tenantId`, `channelId`, `catalogId`, `retailerId`, `name`, `description?`, `price?`, `currency?`, `imageUrl?`, `availability?`, `syncedAt`, `source?` (`"sync" | "manual"`) — indexes: `by_tenant`, `by_channel`, `by_channel_retailer`; search index: `search_by_name` (filterField: `tenantId`)

**`convex/lib/planLimits.ts`:** Added `assertCatalogAllowed(plan)` → `assertPlanAtLeast(plan, "growth")`

**`convex/channels.ts`:** Added `listChannelsWithCatalog` internalQuery (bounded `.take(2000)` + JS filter for `status === "active" && catalogId !== undefined`)

**`convex/crons.ts`:** Added `sync-catalog-products` interval (every 24h) → `internal.actions.syncCatalog.syncAllCatalogs`

**`convex/messages.ts`:** Added `sendProductCard` mutation — auth + role check + plan gate + JSON-encodes product fields into `content`; schedules `sendProduct` action; sets `lastMessagePreview: "🛍 <name>"`; handles first-reply assignment, SLA clear, participant/message counts

**`convex/actions/sendWhatsAppMessage.ts`:** Added `sendProduct` internalAction — posts `interactive.product` message to Meta API; same `markFailed` / `setMetaMessageId` / `updateStatus` flow as `sendMessage`

**`components/inbox/message-bubble.tsx`:**
- Added `"product"` to `Message.contentType` union
- Added `ShoppingBagIcon` import
- New render branch: parses JSON from `message.content`; renders `w-52` bubble with optional image header, product name + icon, description (line-clamp-2), price, `timeRow`, `reactionBadges`

**`components/inbox/message-input.tsx`:** Added `CatalogBrowser` import + `<CatalogBrowser conversationId={conversationId} />` after `TemplatePicker` in `!isNote` toolbar section

**`lib/shell/types.ts`:** Added `"ShoppingBag"` to `IconName` union

**`components/shell/resolve-icon.tsx`:** Added `ShoppingBag` import + `ICON_MAP` entry

**`lib/shell/nav-config.ts`:** Added catalog entry (`href: "/settings/catalog"`, `icon: "ShoppingBag"`, `minRole: "admin"`) after CSAT in settings children

**TypeScript:**
- `npx tsc --noEmit` output: (empty — zero errors) ✅

**Architecture decisions:**
- Manual products (`source: "manual"`) survive Meta re-syncs — `clearChannelProducts` only deletes rows where `source !== "manual"`
- `CatalogBrowser` returns `null` (no button in toolbar) when `syncStatus.catalogId` is falsy — avoids cluttering inbox for channels without a catalog
- Product send uses `interactive.product` (requires matching `product_retailer_id` in Meta catalog) — manual products must use the same retailer ID as their Meta counterpart to send successfully
- `PopoverTrigger` and `AlertDialogTrigger` styled directly (no `asChild` — not supported by this project's custom component wrappers)
- `searchProducts` with empty `q` returns `.take(50)` via `by_channel` index — sufficient for SMB catalogs; no pagination needed in settings or browser

