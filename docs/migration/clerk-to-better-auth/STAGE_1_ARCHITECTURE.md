# Stage 1 — Architecture Mapping: Clerk → Better Auth

> Planning only. No code, no installs, no source edits produced in this stage.
> Source of truth for prior state: `docs/migration/clerk-to-better-auth/STAGE_0_INVENTORY.md` (incl. §9 Verification Round)
> Produced: 2026-05-06
> Branch: feat/013-departments

### Locked decisions (not re-litigated here)

| Decision | Choice | Rationale |
|---|---|---|
| Auth library | `better-auth` (open-source) | Eliminates ~$110+/mo Clerk cost pre-launch |
| Convex integration | `@convex-dev/better-auth` (local install) | Only viable Convex adapter; local install required for org plugin + additionalFields |
| Role-string convention | Option A — preserve `"org:admin"` / `"org:supervisor"` / `"org:agent"` | Smallest blast radius; 43 Convex files unchanged if Option A validates |
| Auth UI design | Preserve existing glassmorphism card design | Ahmed's design; `layout.tsx` is already custom HTML |
| Data migration | None — zero real users | Pre-launch optimal window |
| Migration timeline | 7–10 days | Pre-launch window |

---

## 1. Integration Topology

### 1.1 How the pieces fit together

Better Auth replaces Clerk's single external SaaS dependency with two in-repo surfaces: a Next.js Route Handler (Vercel) and a Convex Component (Convex deployment). Clerk runs entirely outside the codebase — all auth state lives on Clerk's servers and WabDesk reads it via JWTs and the Clerk Node SDK. After migration, auth state lives in Convex and auth routes live in the Next.js app.

**Vercel (Next.js)** hosts the Better Auth server. A new Route Handler at `app/api/auth/[...all]/route.ts` wraps `betterAuth({ ... })` and handles every auth endpoint: sign-in, sign-up, session refresh, organization create/invite/accept, and token issuance. All of these are HTTP requests, not WebSocket. The symmetric signing secret `BETTER_AUTH_SECRET` lives as a Vercel env var and never leaves the server. Server-side helpers — `getToken()`, `isAuthenticated()`, `fetchAuthQuery` — are exported from a new `lib/auth-server.ts` using `convexBetterAuthNextJs()` from `@convex-dev/better-auth/nextjs` (https://labs.convex.dev/better-auth/framework-guides/next).

**Convex** hosts the `@convex-dev/better-auth` Component via the **local install path** at `convex/betterAuth/`. Local install (rather than the pre-built package Component) is required here because WabDesk needs to: (a) use the `organization` plugin which may not be supported in the pre-built Component, (b) add `additionalFields` to the session schema for `activeOrganizationRole`, and (c) query Better Auth's tables directly from WabDesk Convex functions. The Component provides: the Convex database adapter used by Better Auth for all DB operations; a JWKS HTTP endpoint at `{CONVEX_SITE_URL}/.well-known/jwks.json` that Convex uses to verify incoming JWTs; and `authComponent` — a typed helper exported from `convex/auth.ts` that exposes `authComponent.getAuthUser(ctx)` and `authComponent.adapter(ctx)` for use inside Convex functions (https://labs.convex.dev/better-auth/features/local-install).

**Browser** holds `authClient` (from `lib/auth-client.ts`), created with `createAuthClient({ plugins: [convexClient(), organizationClient()] })`. The `convexClient()` plugin intercepts Better Auth session cookies, extracts a short-lived JWT, and passes it to the Convex WebSocket connection automatically. `ConvexBetterAuthProvider` (from `@convex-dev/better-auth/react`) replaces `ConvexProviderWithClerk` — it accepts `client`, `authClient`, and `initialToken`. The `initialToken` is fetched server-side in the root layout via `getToken()` so the first SSR render delivers a valid JWT to Convex immediately, eliminating the unauthenticated flash (https://labs.convex.dev/better-auth/framework-guides/next).

### 1.2 Topology diagram

```
┌─ Browser ─────────────────────────────────────────────────────────────────┐
│  authClient (better-auth/react + convexClient + organizationClient)        │
│  ConvexBetterAuthProvider                                                  │
│     │                                                                      │
│     ├─ POST /api/auth/* ─────────────────────────────────────────────────►│
│     │                                                           ┌─ Vercel ─┤
│     │                                                           │  Route   │
│     │                                                           │  Handler │
│     │                                                           │  betterAuth({
│     │                                                           │    emailAndPassword,
│     │                                                           │    organization,
│     │                                                           │    convex({ authConfig })
│     │                                                           │  })      │
│     │                                                           │  │       │
│     │                                                           │  └─ DB adapter calls ──►│
│     │                                                           └──────────┤   ┌─ Convex ─┤
│     │                                                                      │   │ betterAuth│
│     ├─ WebSocket (JWT from session cookie) ──────────────────────────────►│   │ Component │
│     │          ctx.auth.getUserIdentity()                                  │   │ (local)   │
│     │          validates JWT via JWKS endpoint ◄────────────────────────  │   │           │
│     │                                                                      │   │ JWKS      │
│     └─ Server Components                                                   │   │ endpoint  │
│           isAuthenticated() / getToken() ─── HTTP ────────────────────────┼──►│           │
└───────────────────────────────────────────────────────────────────────────┘   └───────────┘
```

### 1.3 What this migration eliminates

This is useful context for understanding why each stage's diff looks the way it does.

| Surface removed | What replaces it | Comment |
|---|---|---|
| Clerk Node SDK (`clerkClient()`) — 27 call sites | Better Auth HTTP API + Convex adapter queries | Member data moves from Clerk's servers into Convex |
| Clerk JWKS domain in `convex/auth.config.ts` | Better Auth Component JWKS endpoint | Convex now verifies JWTs it issues |
| Dual-format JWT normalization (lines 15–35 in `convex/lib/auth.ts`) | Single `definePayload` declaration | The normalization exists only because Clerk changed its JWT format |
| `ConvexProviderWithClerk` | `ConvexBetterAuthProvider` | Same interface; different library |
| Clerk-hosted auth UI (`<SignIn>`, `<SignUp>`, `<OrganizationList>`) | Custom HTML forms + Better Auth `authClient` calls | Visual design is preserved |
| Clerk organization member storage | Better Auth `organization_member` table in Convex | From external API to local DB |
| `getToken({ template: "convex" })` JWT template mechanism | `getToken()` — one issuer, no templates | Simpler; no Clerk Dashboard config |
| Monthly Clerk bill ($110+/mo) | Better Auth open-source (zero auth cost) | The core reason for this migration |

### 1.4 Env var allocation post-migration

| Variable | Host | Purpose | Replaces |
|---|---|---|---|
| `BETTER_AUTH_SECRET` | Vercel | JWT signing key (symmetric HMAC-SHA256) | `CLERK_SECRET_KEY` |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Vercel | Better Auth Component HTTP base URL; `convexBetterAuthNextJs` requires the `NEXT_PUBLIC_` prefix for the client-side `convexClient()` plugin | Renames `CONVEX_SITE_URL` |
| `SITE_URL` | Convex env | Better Auth `baseURL`; used to build invitation email links inside Convex actions | New |
| `NEXT_PUBLIC_CONVEX_URL` | Vercel | Unchanged | — |

`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are removed from Vercel. No Clerk env vars survive.

### 1.5 Local install vs. pre-built Component — the decision

`@convex-dev/better-auth` can be used in two modes: (a) as a pre-built Convex Component (installed via `npx convex component add`) or (b) as a **locally installed Component** where the source lives in `convex/betterAuth/` inside the repo.

WabDesk must use local install for three reasons:

1. **Organization plugin.** The pre-built Component may not include the organization plugin in its compiled build (local install supports any Better Auth plugin). The organization plugin is non-negotiable for WabDesk's multi-tenant model. (https://labs.convex.dev/better-auth/features/local-install)

2. **Session `additionalFields`.** Adding `activeOrganizationRole` as a custom field to the `session` table (required for §3's `definePayload` strategy) requires modifying the Better Auth schema. Local install allows schema customization via `npx auth generate` followed by editing the generated schema. The pre-built Component's schema is fixed.

3. **Direct table access from WabDesk Convex functions.** The `convex/orgMembers.ts`, `convex/lib/emailHelpers.ts`, and `convex/actions/roundRobin.ts` functions need to query Better Auth tables (members, users, organizations) using the adapter API. Local install exposes `authComponent.adapter(ctx)` with full read/write access. (https://labs.convex.dev/better-auth/features/local-install)

The local install path adds one extra setup step (`npx auth generate` to produce `convex/betterAuth/schema.ts` from the Better Auth config) but is the only viable path for WabDesk's requirements.

---

## 2. Concept Mapping

Stage 0 catalogued 28 Clerk surfaces. They group into five migration categories by when they ship and what they replace. Each category is mapped below with citations. "Unchanged" means WabDesk code is untouched. "Drop-in" means ≤3 lines changed. "Rewrite" means non-trivial logic replacement.

---

### 2A. Convex JWT configuration (ships in Stage 3)

This category covers the infrastructure that tells Convex which auth provider to trust and how to read identity from incoming JWTs. Getting this right is the foundation for all later stages.

| Clerk surface (Stage 0 §) | Better Auth equivalent | Citation | Impact |
|---|---|---|---|
| `convex/auth.config.ts` — Clerk JWKS issuer `communal-octopus-5.clerk.accounts.dev` (§2.1) | `import { getAuthConfigProvider } from '@convex-dev/better-auth/auth-config'`; `providers: [getAuthConfigProvider()]`. Convex JWT validation points at the Better Auth Component's JWKS endpoint. Clerk's JWKS domain is removed. | https://labs.convex.dev/better-auth/framework-guides/tanstack-start (identical pattern for all frameworks) | 1-file, 3-line swap |
| `convex/lib/auth.ts:getCallerIdentity` — dual-format claim reading for `orgId` and `orgRole` (§2.2–2.3) | Single-format JWT claims `identity.orgId` and `identity.orgRole` emitted via `definePayload`. Dual-format normalization helpers `resolveOrgId`, `resolveOrgRole`, `normalizeOrgRole` (lines 15–35) deleted. | https://labs.convex.dev/better-auth/api/convex-plugin | `convex/lib/auth.ts` loses ~34 lines of dead code. Full design in §3. |
| `assertAdmin` / `assertAdminOrSupervisor` helpers (§2.4) | **Unchanged.** Compare `"org:admin"` / `"org:supervisor"` string literals. Option A preserves these verbatim as Better Auth role names. | — | Zero changes to 2 helpers and 43 call sites |

---

### 2B. Middleware and server-side Next.js (ships in Stage 4)

This category covers how protected routes are guarded and how server components obtain tokens.

| Clerk surface (Stage 0 §) | Better Auth equivalent | Citation | Impact |
|---|---|---|---|
| `clerkMiddleware()` route protection in `middleware.ts` (§1.3) | `middleware.ts` reduced to a cookie-passthrough matcher (or deleted). Route protection moves to each protected layout RSC: `if (!(await isAuthenticated())) redirect('/sign-in')`. Public routes (`/`, `/sign-in`, `/sign-up`, `/select-org`, `/privacy`, `/terms`, `/dpa`) migrate as layout-level exclusions. | https://labs.convex.dev/better-auth/framework-guides/next | `middleware.ts` simplified; each protected layout gains one `isAuthenticated` guard |
| `getToken({ template: "convex" })` — used in dashboard layout, onboarding layout, accept-invite page (§7) | `getToken()` from `convexBetterAuthNextJs()`. No template name needed. | https://labs.convex.dev/better-auth/framework-guides/next | Drop-in minus the argument |
| `auth()` / `currentUser()` in `app/(dashboard)/layout.tsx` (§7) | `isAuthenticated()` for auth guard; `fetchAuthQuery` for user/org data server-side. | https://labs.convex.dev/better-auth/framework-guides/next | 1-file rewrite |

---

### 2C. Frontend providers and hooks (ships in Stage 5)

This category covers all client-side React surfaces — 21 files use Clerk hooks (Stage 0 §3.1). These are the highest-count touch point in the migration but individually low-complexity.

| Clerk surface (Stage 0 §) | Better Auth equivalent | Citation | Impact |
|---|---|---|---|
| `ConvexProviderWithClerk` JWT bridge (`components/convex-client-provider.tsx`, §3.1) | `ConvexBetterAuthProvider` from `@convex-dev/better-auth/react`. Props: `client` (ConvexReactClient), `authClient`, optional `initialToken` (from root layout `getToken()`). | https://labs.convex.dev/better-auth/framework-guides/next | 1-file rewrite |
| `useAuth()` — `isLoaded`, `isSignedIn`, `orgId`, `orgRole`, `userId` (§3.1, 21 files) | `authClient.useSession()` → `{ data: { user, session }, isPending }`. Field map: `isLoaded → !isPending`; `isSignedIn → !!data?.user`; `userId → data?.user.id`; `orgId → data?.session.activeOrganizationId`; `orgRole → data?.session.activeOrganizationRole` (custom additionalField, see §3). | https://better-auth.com/docs/concepts/session-management | 21 files; field names change |
| `useOrganization()` — `membership.role`, `organization.id` (§3.1) | `authClient.useActiveOrganization()` → `{ data: activeOrg }` with `id`, `name`, `slug`. Role via `useSession().data?.session.activeOrganizationRole`. | https://better-auth.com/docs/plugins/organization | All callers rewired |
| `useUser()` — `user.id`, `user.fullName`, `user.imageUrl` (§3.1) | `authClient.useSession().data?.user`. Field map: `fullName → user.name`; `imageUrl → user.image` (URL only). | https://better-auth.com/docs/concepts/session-management | Minor field-name renames |
| `<ClerkProvider>` / `<ClerkProviderWithLocale>` (`components/clerk-provider-with-locale.tsx`, §3.2) | Deleted. Locale handled by existing locale provider. JWT-bridge moves to `ConvexBetterAuthProvider`. | — | 1 file deleted; root layout passes `initialToken` |

---

### 2D. Auth UI components (ships in Stage 5)

Clerk's pre-built UI components have no Better Auth equivalents. Each is replaced with a custom component. The key constraint is that the sign-in/sign-up **visual design** must be preserved exactly — only the library layer swaps.

| Clerk surface (Stage 0 §) | Better Auth equivalent | Citation | Impact |
|---|---|---|---|
| `<SignIn>` with `appearance` prop (`app/(auth)/sign-in/`, §3.2) | Custom HTML form: `authClient.signIn.email({ email, password, callbackURL: "/inbox" })`. Glassmorphism card (backdrop-blur, `#0071E3`, SF Pro stack) rebuilt as Tailwind + inline-style HTML. The `appearance` object is discarded; the visual output is preserved. Auth layout `layout.tsx` contains no Clerk components and is untouched. | https://better-auth.com/docs/basic-usage | `app/(auth)/sign-in/[[...sign-in]]/page.tsx` rebuilt |
| `<SignUp>` with `fallbackRedirectUrl="/onboarding"` (`app/(auth)/sign-up/`, §3.2) | Custom HTML form: `authClient.signUp.email({ email, password, name, callbackURL: "/onboarding" })`. | https://better-auth.com/docs/basic-usage | `app/(auth)/sign-up/[[...sign-up]]/page.tsx` rebuilt |
| `<OrganizationList>` in `app/select-org/page.tsx` (§3.2) | Custom list: `authClient.organization.list()` → render selection cards; `authClient.organization.setActive({ organizationId, organizationSlug })` on selection → redirect `/inbox`. "Create org" via `authClient.organization.create({ name, slug })`. | https://better-auth.com/docs/plugins/organization | `app/select-org/page.tsx` rebuilt (~80 lines) |
| `<OrganizationSwitcher>` in `components/shell/user-menu.tsx` (§3.2) | Custom popover: `authClient.organization.listUserOrganizations()` → render list; `authClient.organization.setActive()` on switch. | https://better-auth.com/docs/plugins/organization | Custom rebuild inside `user-menu.tsx` |
| `<SignOutButton>` (§3.2) | `authClient.signOut({ callbackURL: "/sign-in" })`. | https://better-auth.com/docs/basic-usage | 1-line swap |

---

### 2E. Provisioning flows and clerkClient() call sites (ships in Stage 4–5)

This is the **highest-risk category**. Stage 0 §6 found 27 `clerkClient()` call sites across 5 Convex files. All member data currently lives in Clerk's systems; after migration it lives in Better Auth's Convex Component tables — a fundamental flip from external API calls to local Convex reads.

**The key insight:** post-migration, member data is local. `clerkClient().organizations.getOrganizationMembershipList()` becomes an adapter query on the `organization_member` table in Convex. This is faster (no HTTP round-trip) and simpler (same query patterns as any other Convex data). The 27 call sites are more numerous than complex.

| Clerk surface (Stage 0 §) | Better Auth equivalent | Citation | Impact |
|---|---|---|---|
| Org creation on first signup — Flow A (§5) | `authClient.organization.create({ name, slug })` in `/onboarding`; or auto-created in `databaseHooks.session.create.before` (see Q1). | https://better-auth.com/docs/plugins/organization | `/onboarding` gains explicit org-create step |
| Lazy `tenants` row creation in `convex/onboarding.ts:ensureCreated` — Flow B (§5) | **Logic unchanged.** `tenantId` shifts from Clerk org ID (`org_2abc…`) to Better Auth org ID (UUID). `ensureCreated` reads from `getCallerIdentity(ctx)` → JWT → same pattern, new ID format. | — | Zero logic changes |
| Email invite via `clerkClient().organizations.createOrganizationInvitation()` — Flow C (`convex/orgMembers.ts`, §5, §6) | `auth.api.inviteMember({ body: { email, role, organizationId }, headers })`. The `sendInvitationEmail(data)` callback in the org plugin config routes through WabDesk's existing React Email system. Invitation acceptance moves to new `app/accept-invitation/[invitationId]/page.tsx` calling `authClient.organization.acceptInvitation({ invitationId })`. | https://better-auth.com/docs/plugins/organization | `orgMembers.ts:inviteByEmail` rewritten; `accept-invite` page replaced |
| Shareable link invite via `clerkClient().organizations.createOrganizationMembership()` — Flow D (`convex/actions/validateInvite.ts`, §5) | Keep `inviteLinks` Convex table unchanged. Validate token; call `auth.api.addMember({ body: { userId, organizationId, role } })`. `app/join/[token]/page.tsx` minimal (swap `useAuth`). | https://better-auth.com/docs/plugins/organization | `validateInvite.ts` rewritten; `inviteLinks` table and UX unchanged |
| `clerkClient()` user profile lookups — 6 call sites in `convex/members.ts`, `convex/lib/emailHelpers.ts` (§6) | `authComponent.getAuthUser(ctx)` for current caller; adapter `findOne("user", ...)` for arbitrary lookups. All local — no HTTP. | https://labs.convex.dev/better-auth/framework-guides/next | 6 call sites replaced with local queries |
| `clerkClient()` role change — `convex/orgMembers.ts:changeRole` (§6) | `auth.api.updateMemberRole({ body: { memberId, role, organizationId }, headers })`. | https://better-auth.com/docs/plugins/organization | In-place rewrite |
| `clerkClient()` remove from org — `convex/orgMembers.ts:removeMember`, `convex/members.ts` (§6) | `auth.api.removeMember({ body: { memberIdOrEmail, organizationId }, headers })`. | https://better-auth.com/docs/plugins/organization | In-place rewrite |
| `clerkClient()` list org members — `convex/orgMembers.ts:list` (§6) | Adapter query: `authComponent.adapter(ctx).findMany("member", { where: [{ field: "organizationId", value: orgId }] })`. Members are local Convex rows — no network call. | https://labs.convex.dev/better-auth/features/local-install | In-place rewrite; faster |
| `clerkClient()` update display name — `convex/members.ts` (§6) | `auth.api.updateUser({ body: { name }, headers })` or adapter update. | https://better-auth.com/docs/basic-usage | In-place rewrite |
| `clerkClient()` avatar upload/delete — `convex/members.ts` (§6) | No native Better Auth equivalent. `user.image` is URL-only. | — | Deferred per Q2 |
| `clerkClient()` ban/unban — `convex/members.ts` (§6) | Better Auth `admin` plugin `banUser`/`unbanUser` — app-level only. | https://better-auth.com/docs/plugins/admin | Dropped per Q3 |
| `clerkClient()` `getAdminEmails()`, `resolveUserEmail()`, `resolveOrgName()` — `convex/lib/emailHelpers.ts` (§6) | Adapter queries on `user`, `organization_member`, `organization` tables. All local Convex reads. | https://labs.convex.dev/better-auth/features/local-install | `emailHelpers.ts` rewritten; same signatures |
| Custom roles `"org:admin"` / `"org:supervisor"` / `"org:agent"` (§7, §V2) | `createAccessControl` + `roles` map keyed by `"org:admin"`, `"org:supervisor"`, `"org:agent"` (Option A). If colons are valid in Better Auth role keys, all 43 call sites are untouched. See §6 for the colon-validity risk. | https://better-auth.com/docs/plugins/organization, https://better-auth.com/docs/plugins/access-control | If colons validate: zero changes to 43 call sites |
| `convex/lib/tenants.ts:134,169` direct `identity.orgId` reads (§7, §V2) | `definePayload` emits `orgId` — same field name as today's flat Clerk claim. Reads continue to work. Cleanup (route through `getCallerIdentity`) deferred to Stage 4. | — | Not breaking; deferred |
| `convex/actions/roundRobin.ts` Clerk member-list fallback (§7) | Replace `clerkClient().organizations.getOrganizationMembershipList()` with adapter query on `organization_member` table. | https://labs.convex.dev/better-auth/features/local-install | 1 action, 1 function rewrite |

---

## 3. JWT Payload Design

This is the most structurally consequential decision of the migration. The goal is to keep `convex/lib/auth.ts` changes to deletion rather than rewrite — removing dead normalization code while preserving all caller contracts.

### 3.1 Today's claim shape (Clerk, dual format)

`convex/lib/auth.ts:15–52` handles six possible claim paths:

| Claim path on `identity` | Example value | Used for | Format origin |
|---|---|---|---|
| `subject` | `"user_2abc123"` | `callerId` | JWT `sub` — always present |
| `orgId` | `"org_2abc123"` | `tenantId` | Clerk legacy JWT template (flat) |
| `o.id` | `"org_2abc123"` | `tenantId` | Clerk v2 compact session token (nested) |
| `orgRole` | `"org:admin"` | `orgRole` | Clerk legacy JWT template (already prefixed) |
| `o.rol` | `"admin"` | `orgRole` — needs `"org:"` prefix added | Clerk v2 compact (un-prefixed) |
| _(implicit)_ | `"org:agent"` | `orgRole` fallback | Default when `o.rol` is undefined |

`convex/lib/tenants.ts:134,169` reads `identity.orgId` directly, bypassing the helper — also expects the flat legacy format.

### 3.2 Proposed Better Auth claim shape (via `definePayload`)

```typescript
// convex/auth.ts — passed to convex({ authConfig, jwt: { definePayload } })
definePayload: ({ user, session }) => ({
  orgId:   session.activeOrganizationId ?? "",
  orgRole: (session as any).activeOrganizationRole ?? "org:agent",
  sessionId: session.id,
  iat: Math.floor(Date.now() / 1000),
})
```

`session.activeOrganizationId` is populated by the organization plugin whenever `setActiveOrganization` is called (https://better-auth.com/docs/plugins/organization). `session.activeOrganizationRole` is a custom `additionalField` on the session record, added to the `session` table schema during local install. It is written by a `databaseHooks.session.update.before` hook that looks up the caller's role in the `organization_member` table whenever `activeOrganizationId` changes. The `subject` claim is emitted automatically as the JWT `sub` field — it does not appear in `definePayload`.

This denormalization step is required because `definePayload` is synchronous and receives only `{ user, session }` — no database access is available during payload construction (https://labs.convex.dev/better-auth/api/convex-plugin). The database-hook pattern for initializing session fields is the exact approach Better Auth's own docs recommend for active organization setup (https://better-auth.com/docs/plugins/organization, "Initialize Active Organization with Database Hooks").

### 3.3 Mapping diff: Clerk claims → Better Auth JWT

| Clerk JWT claim | Better Auth JWT field | Verdict |
|---|---|---|
| `identity.subject` | `identity.subject` (auto — JWT `sub`) | **Preserved — same field name** |
| `identity.orgId` (legacy flat) | `identity.orgId` (via `definePayload`) | **Preserved — same field name, now the only format** |
| `identity.o.id` (Clerk v2 compact) | _(not emitted)_ | **Removed** |
| `identity.orgRole` (legacy flat, prefixed) | `identity.orgRole` (via `definePayload`, always prefixed) | **Preserved — same field name** |
| `identity.o.rol` (Clerk v2 compact, un-prefixed) | _(not emitted)_ | **Removed** |

The dual-format normalization logic (`resolveOrgId`, `resolveOrgRole`, `normalizeOrgRole`, lines 15–35) handles the removed Clerk v2 paths. Deleting those paths deletes those helpers. The flat legacy paths survive as the sole format, making all normalization dead code.

### 3.4 Helper-by-helper impact assessment

| Helper in `convex/lib/auth.ts` | Lines | Post-migration status | Net change |
|---|---|---|---|
| `resolveOrgId` (lines 15–19) | 5 | **Deleted** — no longer needed | −5 |
| `normalizeOrgRole` (lines 24–28) | 5 | **Deleted** — no longer needed | −5 |
| `resolveOrgRole` (lines 30–35) | 6 | **Deleted** — no longer needed | −6 |
| `getCallerIdentity` (lines 37–53) | 16 | **Simplified** — reads `identity.orgId` and `identity.orgRole` directly; 3 helper calls removed | ~−10 |
| `getCallerRole` (lines 55–69) | 15 | **Simplified** — same simplification; enum guard on role value unchanged | ~−8 |
| `assertAdmin` (lines 71–75) | 5 | **Unchanged** — compares `role !== "org:admin"` | 0 |
| `assertAdminOrSupervisor` (lines 77–81) | 5 | **Unchanged** | 0 |

Net: `convex/lib/auth.ts` shrinks by approximately 34 lines. Caller contracts (return types, thrown errors, exported type `OrgRole`) are identical.

### 3.5 Proposed `convex/lib/auth.ts` post-migration structure (pseudocode sketch)

```typescript
// After migration: ~48 lines vs. 82 lines today.
// Dual-format helpers deleted. Single claim format from definePayload.

export type OrgRole = "org:admin" | "org:supervisor" | "org:agent";

export async function getCallerIdentity(ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("UNAUTHORIZED");
  const orgId = identity.orgId as string | undefined;
  if (!orgId) throw new ConvexError("NO_ORG");
  const orgRole = identity.orgRole as string | undefined;
  if (!orgRole) throw new ConvexError("NO_ROLE"); // defensive: missing = hook missed
  return { tenantId: orgId, callerId: identity.subject, orgRole };
}
// assertAdmin and assertAdminOrSupervisor: UNCHANGED
```

The `NO_ROLE` guard is new — it defends against the §6 risk where `activeOrganizationRole` is missing from the JWT because the session hook did not fire. Without this guard, a missing role silently returns `"org:agent"` (the `definePayload` fallback), which grants every user agent-level permissions without error.

### 3.6 Better Auth schema tables created by local install

When the local install is configured with `emailAndPassword` + `organization` plugins and `npx auth generate` is run, the following tables are created inside `convex/betterAuth/schema.ts`. WabDesk Convex functions query these tables via `authComponent.adapter(ctx)`.

| Better Auth table | Key fields | WabDesk usage |
|---|---|---|
| `user` | `id`, `name`, `email`, `image`, `emailVerified`, `createdAt` | Replaces all `clerkClient().users.*` lookups |
| `session` | `id`, `userId`, `token`, `expiresAt`, `activeOrganizationId`, `activeOrganizationRole` (additionalField) | Source of JWT claims via `definePayload` |
| `account` | `id`, `userId`, `provider`, `providerAccountId`, `password` (hashed) | Managed internally by Better Auth; WabDesk does not query directly |
| `organization` | `id`, `name`, `slug`, `createdAt` | Linked to `tenants.tenantId`; replaces Clerk org |
| `organization_member` | `id`, `userId`, `organizationId`, `role`, `createdAt` | Replaces `clerkClient().organizations.getOrganizationMembershipList()` |
| `organization_invitation` | `id`, `email`, `organizationId`, `role`, `status`, `expiresAt` | New; replaces Clerk's invitation model for email invites (Flow C) |

These tables live in Component scope (`convex/betterAuth/schema.ts`), not in WabDesk's main `convex/schema.ts`. Indexes follow Better Auth's conventions; WabDesk can add custom indexes to the generated schema file for performance.

### 3.7 `convex/lib/tenants.ts:134,169` plan

Both `getEmailLocalePublic` and `getForwardTemplatesPublic` read `identity.orgId` directly without going through `getCallerIdentity`. Post-migration, `definePayload` emits `orgId` under exactly that key name — so both functions continue to return the correct value without modification. The Stage 0 §V2 risk ("if Better Auth uses a different claim name these silently return defaults") is resolved by the explicit `definePayload` declaration: the key name `orgId` is now under WabDesk's control, not a Clerk convention.

Stage 4 recommended cleanup: route both functions through `getCallerIdentity(ctx)` for consistency. This is a 2-function, ~4-line change that does not alter runtime behavior. It is a non-blocking hygiene item, not a correctness requirement.

---

## 4. Open Questions (Ahmed's Decisions Before Stage 2)

These 10 questions must be answered before Stage 2 can produce implementation diffs. Each lists options with pros/cons and a recommendation where one is clear. Ahmed makes the final call.

**Decision summary** — questions needing answers before Stage 2:

| # | Question | Recommendation | Confidence |
|---|---|---|---|
| Q1 | Active org auto-set on sign-in | Option A (`databaseHooks`) | High |
| Q2 | Avatar storage | Option C (defer) | High |
| Q3 | Ban/unban | Option C (drop) | High |
| Q4 | Member data source | Option A (adapter direct) | High |
| Q5 | `tenants` + `organization` tables | Option A (keep both) | High |
| Q6 | Shareable invite link | Option A (keep `inviteLinks`) | High |
| Q7 | Audit logs | Option A (skip) | High |
| Q8 | `role-utils.ts` bare supervisor fix | Option A (add branch) | High |
| Q9 | Social auth providers | Ahmed must confirm from Clerk Dashboard | No recommendation |
| Q10 | Organization slug generation | Option A (auto from name) | Medium |

---

### Q1 — Active organization auto-set on sign-in

By default, Better Auth sessions start with `activeOrganizationId = null` (https://better-auth.com/docs/plugins/organization). `getCallerIdentity` throws `"NO_ORG"` when `orgId` is absent from the JWT. For WabDesk users who belong to exactly one org, every sign-in would hit this error until `setActiveOrganization` is explicitly called somewhere in the auth flow.

**Options:**
- **(A) `databaseHooks.session.create.before` auto-set.** When a session is created, query the user's org memberships and set `activeOrganizationId` to the first org found. Invisible to the user; no extra redirect. Risk: brand-new signups with no org yet return `null` from the lookup — the `/onboarding` redirect fires before any Convex mutation requiring `orgId`, so this case is handled correctly. (https://better-auth.com/docs/plugins/organization, "Initialize Active Organization with Database Hooks")
- **(B) `/select-org` gate.** After sign-in, always redirect to `/select-org`, which calls `setActive` before `/inbox`. The existing `app/select-org/page.tsx` flow. Extra redirect for every sign-in regardless of how many orgs the user has.
- **(C) Hybrid.** Option A for single-org users; Option B shows the org switcher for multi-org users.

**Recommendation:** Option A. WabDesk users universally belong to exactly one org today. The extra redirect of Option B is unnecessary friction. Option C introduces conditional logic for a future multi-org feature that has no current users — premature complexity.

---

### Q2 — Avatar storage

`convex/members.ts` calls `clerkClient().users.updateUserProfileImage()` and `deleteProfileImage()`. Better Auth does not host avatars; `user.image` is a URL-only string field.

**Options:**
- **(A) Drop avatar upload/delete for now.** Keep `user.image` as a URL (populated from social auth if added later). Remove upload/delete UI buttons. No new infrastructure.
- **(B) Convex File Storage.** Upload image via `useUploadFiles` hook → get a Convex Storage URL → update `user.image` via `auth.api.updateUser()`. Preserves feature parity but requires 2–3 new files and a storage bucket setup.
- **(C) Defer post-launch.** Disable avatar upload UI with a visible placeholder. Implement Option B post-launch when the team has stabilized.

**Recommendation:** Option C. Avatar upload is not on the Phase 1 critical path (CLAUDE.md §6). Deferring removes 2 Clerk SDK call sites from the migration scope without a regression in any launch-critical feature.

---

### Q3 — Ban / unban operations

`convex/members.ts` calls `clerkClient().users.banUser()` / `unbanUser()`. Better Auth's `admin` plugin provides `auth.api.banUser()` / `unbanUser()` (https://better-auth.com/docs/plugins/admin) but these are **app-level** — a ban prevents the user from signing in anywhere in the app, across all tenants.

**Options:**
- **(A) Use Better Auth `admin` plugin ban (app-level).** Simple drop-in. Acceptable now (no real users). Risk: at scale, banning an agent from one tenant would lock them out of all tenants if they're multi-tenant.
- **(B) Org-scoped suspension via `additionalField`.** Add `memberStatus: "active" | "suspended"` to the `organization_member` record using local install schema customization. Add a check in Convex auth helpers. Semantically correct but adds schema complexity.
- **(C) Drop ban/unban entirely.** Removing an agent from the org (`removeMember`) has the same practical effect for WabDesk's use case — agents have no persistent data tied to their slot.

**Recommendation:** Option C. Removing a member is semantically equivalent for WabDesk. Eliminates the cross-tenant blast radius risk of Option A and the schema complexity of Option B.

---

### Q4 — Member data source of truth

Today all member data (profile, role) is sourced on demand from Clerk's Node SDK. Post-migration, members live in Better Auth's Component tables inside Convex. Two query patterns are available.

**Options:**
- **(A) Query Better Auth Component tables directly** via `authComponent.adapter(ctx).findMany(...)`. No data duplication; members stay in Component scope. This is the recommended approach in `@convex-dev/better-auth` docs (https://labs.convex.dev/better-auth/features/local-install).
- **(B) Mirror member data** into a new `members` table in the main Convex schema. Populated via `databaseHooks.member.create/update`. Allows joining members with WabDesk data (channel assignments, department memberships) in a single Convex query without crossing Component scope.

**Recommendation:** Option A for Stage 4. The adapter API is straightforward. Option B can be evaluated post-launch if query patterns across Component boundaries prove awkward in practice.

---

### Q5 — `tenants` table relationship to Better Auth's `organization` table

Better Auth's organization plugin creates its own `organization` table inside the Component. WabDesk's `tenants` table (in the main schema) stores plan, billing state, and feature flags. Both tables reference the same logical entity.

**Options:**
- **(A) Keep both tables; link by ID.** `tenants.tenantId = organization.id`. `organization` holds Better Auth-managed state (name, slug, members, invitations); `tenants` holds WabDesk-specific state (`plan`, `paddleSubscriptionId`, `emailLocale`, retention timestamps, etc.). `getCallerIdentity` returns `tenantId` which indexes both tables independently.
- **(B) Collapse `tenants` into `organization` via `additionalFields`.** Add `plan`, `paddleSubscriptionId`, etc. as additional fields on Better Auth's `organization` table via local install schema customization. Single table for all org state.

**Recommendation:** Option A. The `tenants` table is referenced in 31+ Convex functions via the `by_tenantId` index pattern. Collapsing it into the Component's `organization` table would require touching every one of those call sites and crossing Component scope boundaries on every billing write. Option A requires zero call-site changes. The link `tenantId = organization.id` is established at org creation time and maintained by `getCallerIdentity` reading from the JWT.

---

### Q6 — Shareable invite link (Flow D)

Better Auth's organization plugin has `inviteMember` (email-based, creates a row in `organization_invitation` with a UUID `id`). It has no native shareable multi-use link primitive. WabDesk's `inviteLinks` Convex table implements this with: token, orgId, expiry, maxUses, useCount.

**Options:**
- **(A) Keep `inviteLinks` Convex table unchanged.** Custom action validates token → calls `auth.api.addMember()`. `app/join/[token]/page.tsx` UX preserved with minimal changes.
- **(B) Replace `inviteLinks` with Better Auth's invitation + thin tokenization.** For each user who opens the shareable link, generate a Better Auth invitation and use its UUID as the token. Adds coupling to Better Auth's one-to-one invitation model with no functional benefit over Option A.

**Recommendation:** Option A. The custom table covers multi-use, expiry, and maxUses logic that Better Auth's invitation model doesn't provide natively. Only the membership-creation call changes (`clerkClient()` → `auth.api.addMember()`).

---

### Q7 — Audit logs

Better Auth Infrastructure (the paid commercial product, `@better-auth/infra`) provides an audit log dashboard. WabDesk has no audit log today.

**Options:**
- **(A) Skip entirely** for migration scope and Phase 1 post-launch.
- **(B) Implement a simple `auditLogs` Convex table** post-launch, driven by Convex mutation hooks. Independent of Better Auth.

**Recommendation:** Option A. Audit logs are not a Phase 1 feature (CLAUDE.md §6). `@better-auth/infra` is a paid product outside the migration scope — its orphaned presence in `package.json` is a cleanup item, not a feature to activate (Stage 0 §V1). Confirm Ahmed agrees this is out of scope.

---

### Q8 — `role-utils.ts:resolveRole` Option A fix scope

Stage 0 §V2 identified: `resolveRole("supervisor")` silently returns `"agent"` (no bare `"supervisor"` branch exists). Option A guarantees Better Auth always emits prefixed `"org:supervisor"` — so the bug is currently latent. But it's a one-line fix that eliminates a silent regression if anything in the auth path ever passes a bare role string.

**Options:**
- **(A) Add the bare fallback** (`if (orgRole === "org:supervisor" || orgRole === "supervisor") return "supervisor"`). Matches the existing admin pattern which already handles both `"org:admin"` and bare `"admin"`.
- **(B) Remove all bare-form handling.** Simplify `resolveRole` to only match `"org:…"` forms. Creates a hard dependency on the JWT always emitting prefixed strings.

**Recommendation:** Option A. One extra `||` condition costs nothing. Option B creates a fragile assumption about emit format — if a debug session, test, or future Better Auth update passes a bare string, supervisors silently become agents.

---

### Q9 — Social / OAuth sign-in providers

The Clerk `<SignIn>` component is configured via the Clerk Dashboard and may show Google/Apple social buttons. Stage 0 did not confirm whether social auth is active on the WabDesk Clerk application.

**Options:**
- **(A) Email + password only.** No OAuth providers in Better Auth config. Rebuild `<SignIn>` as an email/password form only.
- **(B) Add Google OAuth.** Requires `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in Vercel env + a Google Cloud OAuth app. ~10 additional lines in `betterAuth({ socialProviders: { google: { clientId, clientSecret } } })`.

**No recommendation — Ahmed must confirm:** Is Google or Apple social sign-in currently enabled in the Clerk Dashboard? Check: Clerk Dashboard → User & Authentication → Social Connections. If enabled, Option B is required and adds `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` to Stage 3's env var list. If disabled, Option A (email-only) is correct and simpler.

Note: if social auth is not currently active in Clerk, it can be added to Better Auth post-migration without any code-incompatible changes. This is not a now-or-never decision.

---

### Q10 — Organization slug requirement

Better Auth's `organization.setActive()` API requires both `organizationId` AND `organizationSlug` (https://better-auth.com/docs/plugins/organization). Better Auth's `organization.create()` also requires a `slug`. WabDesk's current onboarding flow (`convex/onboarding.ts:ensureCreated`) creates a `tenants` row using only `tenantId` — no slug exists anywhere in the current schema.

This means Stage 3 must decide how org slugs are generated. Every `setActive` call (in `app/select-org/`, `<OrganizationSwitcher>`) will need a slug available client-side.

**Options:**
- **(A) Auto-generate slug from org name** at creation time (e.g., `name.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 48)`). Store in Better Auth's `organization.slug` field. Standard practice. No UI changes.
- **(B) Use the organization ID (UUID) as the slug.** Guaranteed unique. Not human-readable but slugs are internal — WabDesk users never see them.
- **(C) Prompt for workspace URL slug in onboarding.** Adds a "Choose your workspace URL" field. More friction; unjustified for WabDesk's SMB use case.

**Recommendation:** Option A. Slug generation from name is zero-friction and standard for SaaS onboarding. Slugs are never surfaced to WabDesk users (no `app.wabdesk.com/org/{slug}` URLs in the UI). The generated slug only needs to be unique within the Better Auth instance — a UUID suffix fallback (`{slug}-{orgId.slice(-6)}`) handles rare collisions.

Implementation note: slug generation lives in the `/onboarding` client flow (where `authClient.organization.create({ name, slug })` is called) and in `convex/auth.ts`'s `databaseHooks.session.create.before` hook. Both locations need the same slug-generation function — extract it to `lib/utils.ts` as `slugify(name: string): string`.

---

## 5. Migration Scope

Files are ordered by Stage and risk. Stage 3 = install/config; Stage 4 = server-side Convex + Next.js server; Stage 5 = frontend.

| Area | Files affected (count + examples) | Risk | Stage |
|---|---|---|---|
| `package.json` — add `better-auth`, `@convex-dev/better-auth`; remove `@clerk/nextjs`, `@clerk/localizations`; remove orphan `@better-auth/infra` | 1 | L | 3 |
| Better Auth Component local install: `convex/betterAuth/` directory with `convex.config.ts`, `auth.ts` (static export for CLI), `schema.ts` (CLI-generated via `npx auth generate`) | 3–4 new files | L | 3 |
| `convex/convex.config.ts` — register local `betterAuth` component instead of remote package | 1 | L | 3 |
| `convex/auth.config.ts` — swap Clerk JWKS domain for `getAuthConfigProvider()` | 1 | L | 3 |
| `convex/auth.ts` — new file: `createAuth`, `authComponent`, `getCurrentUser` | 1 (new, ~50 lines) | M | 3 |
| `lib/auth-client.ts` — new: `authClient` instance with `convexClient()` + `organizationClient()` | 1 (new, ~15 lines) | L | 3 |
| `lib/auth-server.ts` — new: `convexBetterAuthNextJs()` helpers export | 1 (new, ~10 lines) | L | 3 |
| `app/api/auth/[...all]/route.ts` — new Next.js Route Handler | 1 (new, ~5 lines) | L | 3 |
| Env vars: add `BETTER_AUTH_SECRET`, rename `CONVEX_SITE_URL` → `NEXT_PUBLIC_CONVEX_SITE_URL`, add `SITE_URL` to Convex env; remove Clerk vars from Vercel | Vercel + Convex dashboards | L | 3 |
| `convex/lib/auth.ts` — simplify; delete dual-format helpers (~34 lines removed) | 1 | M | 4 |
| `middleware.ts` — simplify to passthrough or delete | 1 | L | 4 |
| `app/(dashboard)/layout.tsx` — swap `auth()` / `currentUser()` / `getToken({ template })` → `isAuthenticated()` / `fetchAuthQuery` / `getToken()` | 1 | M | 4 |
| 27 `clerkClient()` call sites across Convex files | `convex/members.ts`, `convex/orgMembers.ts`, `convex/lib/emailHelpers.ts`, `convex/actions/validateInvite.ts`, `convex/actions/roundRobin.ts` (5 files) | H | 4 |
| `convex/lib/tenants.ts` direct `identity.orgId` reads (hygiene cleanup) | 1 (2 functions) | L | 4 |
| `app/accept-invitation/[invitationId]/page.tsx` — new invitation acceptance page | 1 (new); `app/accept-invite/page.tsx` deleted | M | 4 |
| `components/convex-client-provider.tsx` — rewrite to `ConvexBetterAuthProvider` | 1 | M | 5 |
| `components/clerk-provider-with-locale.tsx` — delete | 1 | L | 5 |
| Frontend hooks: `useAuth` → `useSession`; `useOrganization` → `useActiveOrganization`; `useUser` → session user (21 files, Stage 0 §3.1) | 21 | M | 5 |
| Auth pages rebuild preserving glassmorphism design: `app/(auth)/sign-in/`, `app/(auth)/sign-up/` | 2 | M | 5 |
| `app/select-org/page.tsx` — rebuild `<OrganizationList>` as custom component | 1 | M | 5 |
| `app/join/[token]/page.tsx` — minimal update (swap `useAuth`) | 1 | L | 5 |
| `components/shell/user-menu.tsx` — rebuild `<OrganizationSwitcher>`, swap `<SignOutButton>` | 1 | M | 5 |
| `lib/shell/role-utils.ts` — add bare `"supervisor"` branch (1-line fix); 10 importers verified, no import-site changes needed | 1 | L | 5 |

**Total:** ~30 modified files + ~8 new files + 2 deleted files. No WabDesk Convex schema table additions — Better Auth tables live inside `convex/betterAuth/schema.ts` (Component scope).

### 5.1 New files inventory

These files do not exist today and must be created (not modified) during the migration. Stage 2 will provide their full content as AFTER diffs.

| New file | Stage | Purpose |
|---|---|---|
| `convex/betterAuth/convex.config.ts` | 3 | Declares the `betterAuth` directory as a local Convex Component |
| `convex/betterAuth/auth.ts` | 3 | Static `auth` export for `npx auth generate` schema generation only |
| `convex/betterAuth/schema.ts` | 3 | CLI-generated; contains all Better Auth table definitions |
| `convex/auth.ts` | 3 | `createAuth`, `authComponent`, `getCurrentUser` — the main Better Auth integration point in Convex |
| `lib/auth-client.ts` | 3 | `authClient` instance: `createAuthClient` with `convexClient()` + `organizationClient()` plugins |
| `lib/auth-server.ts` | 3 | `convexBetterAuthNextJs()` helpers: `getToken`, `isAuthenticated`, `handler`, `fetchAuthQuery`, etc. |
| `app/api/auth/[...all]/route.ts` | 3 | Next.js Route Handler that wraps `betterAuth` for all `/api/auth/*` requests |
| `app/accept-invitation/[invitationId]/page.tsx` | 4 | Replaces `app/accept-invite/page.tsx`; calls `authClient.organization.acceptInvitation()` |

### 5.2 Stage dependency graph

```
Stage 3 (install + config)
  └─► Stage 4 (server-side, Convex + Next.js server)
        └─► Stage 5 (frontend + auth pages)
```

Stage 5 cannot start until Stage 4's `convex/lib/auth.ts` changes are deployed and Convex functions accept Better Auth JWTs. Stage 3 and Stage 4 can be planned and diffed in Stage 2 simultaneously, but must be applied in order.

### 5.3 What Stage 2 will produce

Stage 2 takes this architecture document as its sole input and produces BEFORE/AFTER diffs for every file listed in §5. Specifically, Stage 2 must:

1. **Pin `better-auth` and `@convex-dev/better-auth` to exact versions** and include those versions in every diff header so the diffs are reproducible.
2. **Write the full `convex/auth.ts`** — `createAuth` with `emailAndPassword`, `organization` plugin with roles and `sendInvitationEmail`, `convex` plugin with `definePayload`, and the two session `databaseHooks` (create and update for `activeOrganizationRole`).
3. **Write the full simplified `convex/lib/auth.ts`** — post-deletion of dual-format helpers; include the `NO_ROLE` defensive assertion.
4. **Write `lib/auth-client.ts` and `lib/auth-server.ts`** — client and server helper exports.
5. **Write the `middleware.ts` replacement** — passthrough or deletion with justification.
6. **Write BEFORE/AFTER for every `clerkClient()` call site** — 27 calls across 5 files, each with the exact replacement API call.
7. **Write the new auth page components** (`<SignIn>`, `<SignUp>`) — full Tailwind HTML preserving the glassmorphism design.

Stage 2 does NOT install packages. Stage 3 installs, then applies Stage 2's diffs in order.

### 5.4 High-risk call-site detail

The 27 `clerkClient()` call sites are the single largest risk area (Stage 4, H). For clarity, here is the file-by-file breakdown from Stage 0 §6:

| File | Clerk SDK operations | Count | Better Auth replacement strategy |
|---|---|---|---|
| `convex/members.ts` | get user profile, update display name, upload avatar, delete avatar, ban user, unban user | 6+ | Adapter user queries + `updateUser` + deferred/dropped (Q2/Q3) |
| `convex/orgMembers.ts` | invite by email, list members, change role, invite by WhatsApp link, remove member | 5 | `inviteMember` API + adapter `findMany` + `updateMemberRole` + `removeMember` |
| `convex/lib/emailHelpers.ts` | get admin emails (member list), resolve user email, resolve org name | 3 | Adapter queries on `organization_member`, `user`, `organization` tables |
| `convex/actions/validateInvite.ts` | create org membership (shareable link join) | 1 | `auth.api.addMember()` |
| `convex/actions/roundRobin.ts` | get org membership list (fallback when no dept members) | 1 | Adapter `findMany("member", ...)` |

All 5 files ship in Stage 4. None touch the UI or frontend hooks. The invite-by-WhatsApp path in `orgMembers.ts` sends a WhatsApp message via Meta API with an invite URL — only the `clerkClient` membership-creation call changes; the WhatsApp send logic is untouched.

---

## 6. Stage 3 Mandatory Verification Steps

Before any Stage 4 code is written, the following must be verified against the pinned `@convex-dev/better-auth` version. These are not optional — a failed verification changes the architecture.

1. **Role name colon validity.** Instantiate a minimal `betterAuth({ plugins: [organization({ roles: { "org:admin": ..., "org:supervisor": ..., "org:agent": ... } })] })`. Call `auth.api.inviteMember({ body: { email, role: "org:admin", organizationId: "..." } })`. If the call succeeds, Option A is validated. If it throws a validation error about the role name, Option B (bare names) is required and must be negotiated with Ahmed before Stage 4 begins.

2. **`definePayload` sync constraint.** Confirm that `definePayload` in the installed version is synchronous (no `async` support). If async support has been added in the pinned version, the `activeOrganizationRole` session hook strategy can be simplified.

3. **Session `additionalFields` for `activeOrganizationRole`.** Generate the schema with the additionalField defined. Confirm `session.activeOrganizationRole` appears in the generated `convex/betterAuth/schema.ts`. If not, the field name or configuration API may have changed since this document was written.

4. **`databaseHooks.session.create.before` timing.** Write a test: sign in as a user who belongs to one org. Assert that after sign-in `session.activeOrganizationId` is non-null (hook fired) and `session.activeOrganizationRole` matches the member's role. If `activeOrganizationRole` is null, the `update` hook did not fire on creation — investigate whether a separate `create.before` hook for the role is needed.

5. **`NEXT_PUBLIC_CONVEX_SITE_URL` client availability.** Confirm the `convexClient()` browser plugin successfully reads `process.env.NEXT_PUBLIC_CONVEX_SITE_URL`. Rename or add the env var in Vercel **before** deploying Stage 3.

These 5 verifications are Stage 3 day-one work — before any WabDesk source files are edited.

---

## 7. Risks & Non-Obvious Gotchas

These are risks that would not be obvious from reading the Better Auth or `@convex-dev/better-auth` documentation alone. They were surfaced during the Stage 0 and Stage 1 analysis. Each carries a risk rating (L/M/H) based on likelihood × impact. High-risk items have explicit mitigation steps and must be verified in Stage 3 before any Stage 4 code is written.

- **`@convex-dev/better-auth` is in alpha.** The migration guide at https://labs.convex.dev/better-auth/migrations/migrate-to-0-10 documents a recent breaking-change release, indicating active churn. During the 7–10 day migration window a new breaking release is possible. **Risk: M.** Mitigation: pin to an exact version (`@convex-dev/better-auth@x.y.z`) on install; read the CHANGELOG before any `npm update` during the window.

- **Role name colons may be invalid in Better Auth's role registry.** Option A uses `"org:admin"` as a role key in the `roles` map passed to `organization({ roles: { "org:admin": ... } })`. All Better Auth documentation examples use alphanumeric role names (`"admin"`, `"member"`, `"owner"`). If the organization plugin rejects colons in role keys — via URL routing, `zod` schema validation, or database column constraints — Option A fails silently or noisily. **Risk: M.** Mitigation: this must be the _first_ test in Stage 3, before any other migration work. Spin up a local scratch instance; call `organization.inviteMember({ role: "org:admin" })`. If it rejects, escalate immediately: Option B (bare names: `"admin"`, `"supervisor"`, `"agent"`) requires updating the two string literals in `assertAdmin` and `assertAdminOrSupervisor`, plus the `OrgRole` type — a larger but still bounded Stage 4 change.

- **`setActiveOrganization` must be called before any Convex function that calls `getCallerIdentity`.** Sessions start with `activeOrganizationId = null`. The Q1 `databaseHooks.session.create.before` hook (Option A) is load-bearing for WabDesk's entire auth model. If this hook is omitted, every post-login Convex mutation fails with `"NO_ORG"`. **Risk: H if forgotten; L if implemented in Stage 3.** This is not a Stage 4 or 5 item — it ships in Stage 3 as part of `createAuth`.

- **`definePayload` is synchronous — no DB access during JWT construction.** The function receives only `{ user, session }` (https://labs.convex.dev/better-auth/api/convex-plugin). The `activeOrganizationRole` session field populated by `databaseHooks.session.update.before` is load-bearing. If that hook fires _after_ the JWT is issued, or if it is omitted, `identity.orgRole` is `undefined` in Convex. Every `getCallerIdentity` call returns `orgRole = "org:agent"` (the fallback), granting all users agent-level permissions silently. **Risk: M.** Mitigation: add an explicit assertion in `getCallerIdentity` that throws a named error if `orgRole` is missing from the JWT.

- **JWT refresh latency after `setActiveOrganization`.** After `setActiveOrganization` updates the session DB record, the current JWT in `ConvexBetterAuthProvider` still carries the old (or null) `activeOrganizationId`. Convex receives this stale JWT on the next mutation. The `convexClient()` plugin handles token refresh for WebSocket connections automatically, but the timing is not instantaneous. **Risk: L** for the typical WebSocket path; **M** for SSR `fetchAuthMutation` calls using the server-fetched `initialToken`. Stage 3 must test org-switch → Convex mutation timing explicitly.

- **`NEXT_PUBLIC_CONVEX_SITE_URL` env var is new.** `convexBetterAuthNextJs({ convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL! })` needs the `NEXT_PUBLIC_` prefix so the `convexClient()` browser plugin can reach the Component's JWKS endpoint. WabDesk currently has `CONVEX_SITE_URL` (no `NEXT_PUBLIC_` prefix). This requires adding a new env var to Vercel — easy to miss in a checklist. **Risk: L** but a silent failure: the browser plugin sends requests to `undefined`, JWTs never arrive at Convex.

- **`app/accept-invite/page.tsx` must be replaced, not patched.** The current page uses `auth()`, `currentUser()`, and `clerkClient()` in a multi-step flow: fetch user → fetch org membership → send welcome email → redirect. The Better Auth replacement is a simpler two-step: `acceptInvitation` → dispatch welcome email. The welcome email dispatch either moves to `databaseHooks.member.create.after` inside `convex/auth.ts` or fires from a Convex mutation triggered post-acceptance. Neither location is a direct equivalent of the current Clerk flow; Stage 5 needs an explicit plan for welcome-email timing. **Risk: M.**

- **`SITE_URL` env var must exist in the Convex deployment environment**, not just Vercel. `createAuth` sets `baseURL: process.env.SITE_URL`, which is used to construct invitation email links (e.g., `https://app.wabdesk.com/accept-invitation/{id}`). This env var is set in the Convex Dashboard's Environment Variables panel — separate from Vercel's config. If omitted, invitation links in emails silently read `https://undefined/accept-invitation/...`. **Risk: L** with checklist; **M** without.

- **`@better-auth/infra` orphan dependency.** Present in `package.json` but unused in source (Stage 0 §V1). Remove during Stage 3 package changes to prevent confusion with the migration target packages. Leaving it creates ambiguity for future developers. **Risk: L.**

- **`convex/lib/auth.ts` type `OrgRole` is exported and imported in 43 files.** After simplification the type `"org:admin" | "org:supervisor" | "org:agent"` is unchanged — but if Option A fails (colons invalid in Better Auth) and role strings become `"admin" | "supervisor" | "agent"`, the `OrgRole` type must update and every importing file sees a TypeScript error. `npx tsc --noEmit` will catch all 43 in one pass. **Risk: L** with Option A validated; **M** if Option A fails.

- **Email verification in invitations.** Better Auth's organization plugin has a `requireEmailVerificationOnInvitation` option (https://better-auth.com/docs/plugins/organization). If this is set to `true` (it may be the default in some versions), invited users must verify their email before `acceptInvitation` succeeds. WabDesk invites agents by email — if agents don't receive or click a verification email, they can't join. Stage 3 must explicitly set `requireEmailVerificationOnInvitation: false` (or confirm the default) to avoid blocking the invite flow. **Risk: M** if unaddressed.

- **Invite-by-WhatsApp path in `convex/orgMembers.ts`.** The `inviteByWhatsApp` function sends a shareable invite link via Meta WhatsApp API — it reuses the `inviteLinks` Convex table, not Clerk's invitation system. This path is unaffected by the `clerkClient()` removal because it already goes through WabDesk's own `inviteLinks` flow (Flow D), not Flow C. No additional changes needed beyond what's planned for `validateInvite.ts`. **Risk: L.**

- **`convex/crons.ts` — no Clerk dependency found in Stage 0.** Cron jobs that check SLA breaches, CSAT timeouts, etc. use `getCallerIdentity`-derived tenant data but do not call `clerkClient()` and do not read JWT claims directly (they run as internal Convex actions). Stage 0 confirmed no cron file imports from Clerk. These files are unaffected by the migration. Verifying this assumption is a 1-minute grep in Stage 3. **Risk: L.**

---

- **`lib/shell/role-utils.ts` importer count.** Stage 0 §V2 identified 10 files that import from `role-utils.ts`. If Option A holds (colons valid) and the one-line supervisor fix is applied in Stage 5, none of the 10 importers need changes. But if Option A fails and role strings change to bare names, `resolveRole` must change and all 10 importers must be re-verified. **Risk: L** with Option A; **M** without.

---

## 8. Out of Scope (Explicit Exclusions)

- **Stage 1 produces no code, no diffs, no new files, and no package changes.** Stage 2 will produce BEFORE/AFTER diffs for every Stage 3, Stage 4, and Stage 5 file, written against pinned library versions.
- **No package installations.** `better-auth` and `@convex-dev/better-auth` are not installed until Stage 3. The `@convex-dev/better-auth` version is locked in Stage 3 after checking the latest stable release.
- **API signatures referenced in this document are not binding until Stage 3.** All `auth.api.*`, `authClient.*`, and `authComponent.*` method calls are cited from documentation and must be verified against the exact installed version before any code is written.
- **Audit logs** are out of scope for the migration and for Phase 1 entirely (CLAUDE.md §6). `@better-auth/infra` is not activated.
- **SSO, SAML, Passkeys, Magic Link, OTP, 2FA, fraud protection (Sentinel)** — out of scope for this migration and for Phase 1.
- **Better Auth Infrastructure / `@better-auth/infra` / `dash.better-auth.com`** — not used in this migration architecture. The orphan package dependency is removed as Stage 3 cleanup.
- **Data migration.** No real users exist. Clerk user and org data is discarded. No seeding, ID remapping, or backfill scripts.
- **`convex/lib/tenants.ts` hygiene cleanup** (routing direct `identity.orgId` reads through `getCallerIdentity`). Recommended but deferred to Stage 4 as a non-blocking cleanup.
- **Stage 1 does not re-litigate locked decisions.** Option A (preserved `"org:"` role-string prefix), Better Auth as the auth library, `@convex-dev/better-auth` as the Convex integration, and custom auth-page design preservation are all final. Disagreement must be raised before Stage 2 opens.

---

---

## 9. Closeout — Locked Decisions (2026-05-06)

Stage 1 is formally closed as of 2026-05-06. All decisions recorded in this section are final and will not be re-litigated in Stage 2 or any later stage. Any disagreement must be raised before Stage 2a opens. If a locked decision turns out to conflict with a Better Auth API constraint discovered during Stage 3 installation or verification, that constraint must be surfaced explicitly in a follow-up discussion — the document will be amended with a new numbered addendum, never revised in place.

### 9.0 Locked Q1–Q10 Decision Table

| # | Question | Locked answer | Stage 2 implication |
|---|---|---|---|
| Q1 | Active org auto-set on sign-in | **Option A** — `databaseHooks.session.create.before` populates `activeOrganizationId` for single-org users | Stage 3 includes the hook in `convex/auth.ts` |
| Q2 | Avatar storage | **Option C** — defer post-launch; `user.image` is URL-only; avatar upload/delete UI removed | Stage 4 removes avatar SDK calls from `convex/members.ts`; Stage 5 removes avatar UI controls (see §9 Flag #5) |
| Q3 | Ban / unban | **Option C** — drop entirely; removing a member from the org is the equivalent operation | Stage 4 removes `banUser`/`unbanUser` mutations from `convex/members.ts`; Stage 5 removes corresponding UI controls (see §9 Flag #5) |
| Q4 | Member data source | **Option A** — direct adapter queries via `authComponent.adapter(ctx)` | Stage 4 replaces all 27 `clerkClient()` call sites with adapter queries or `auth.api.*` calls |
| Q5 | `tenants` ↔ `organization` | **Option A** — keep both tables, link by ID (`tenants.tenantId = organization.id`) | See §9 Flag #1 for tenants-row creation timing decision |
| Q6 | Shareable invite link | **Option A** — keep `inviteLinks` Convex table unchanged; rewire validation to call `auth.api.addMember()` | Stage 4 rewrites `convex/actions/validateInvite.ts` |
| Q7 | Audit logs | **Option A** — out of scope for migration and Phase 1 entirely | `@better-auth/infra` orphan dependency removed in Stage 3 package cleanup |
| Q8 | `role-utils.ts:resolveRole` fix | **Option A** — add bare `"supervisor"` branch matching the existing admin pattern | Stage 5 one-line fix in `lib/shell/role-utils.ts` |
| Q9 | Social auth providers | **Option B** — Google + Facebook OAuth (both currently enabled in Clerk Dashboard) | Stage 3 env vars expand by 4: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`; `socialProviders` block in `convex/auth.ts`; see §9 Flag #6 for OAuth redirect URI ops checklist |
| Q10 | Org slug generation | **Option A** — auto-generate from name via `slugify()` helper | Stage 3 adds `slugify()` to `lib/utils.ts` |

---

### §9 Flag #1 — `tenants` row creation timing (resolves §2E ambiguity)

§2E states "Logic unchanged" for `convex/onboarding.ts:ensureCreated`. The review flagged that the timing of `tenants` row creation relative to `authClient.organization.create()` shifts post-migration, because the organization is now created during the `/onboarding` client flow rather than already existing when the user's first JWT arrives.

**Two candidate patterns were evaluated:**

- **Pattern A (lazy — chosen):** `convex/onboarding.ts:ensureCreated` continues to fire lazily on the first authenticated Convex query after org creation. The Q1 `databaseHooks.session.create.before` hook ensures `activeOrganizationId` is populated before any Convex mutation is invoked. `tenants` row creation logic remains inside `ensureCreated`. The only code change is the `tenantId` value source — from Clerk's `org_2abc…` prefix format to Better Auth's UUID format, read from `getCallerIdentity(ctx).tenantId`.

- **Pattern B (eager, atomic — rejected):** `tenants` row created inside a `databaseHooks.organization.create.after` hook in `convex/auth.ts`. Atomic with org creation. Rejected because cross-Component-scope writes inside a Better Auth hook increase coupling and move WabDesk business logic into auth infrastructure.

**Locked: Pattern A.** Stage 2's BEFORE/AFTER diff for `convex/onboarding.ts` must document this pattern explicitly. The diff will show zero logic changes to `ensureCreated` — only the `tenantId` value source changes.

---

### §9 Flag #2 — New-user-no-org chicken-and-egg (adds §6 verification step #6)

§7 correctly flags that `setActiveOrganization` must fire before any Convex query that calls `getCallerIdentity`. For brand-new signups, no org exists at sign-in time — the user is redirected to `/onboarding` to create their first org. The question is whether `authClient.organization.create({ name, slug })` automatically makes the new org active in the session, or whether an explicit `setActive` call is required afterward.

**Locked decision:** A 6th mandatory verification step is added to §6 Stage 3 Mandatory Verification Steps. The text of that step is:

> **6. `organization.create()` auto-active session behavior.** After calling `authClient.organization.create({ name, slug })`, immediately query the session and assert: (a) `session.activeOrganizationId` equals the newly-created org ID, and (b) `session.activeOrganizationRole` equals `"org:admin"` (creator role). If `activeOrganizationId` is null after creation, an explicit `authClient.organization.setActive({ organizationId, organizationSlug })` call is required in the `/onboarding` flow before redirecting to `/inbox`. Stage 2's diff for the `/onboarding` page must specify which pattern applies, based on this verification result.

This step is **Stage 3 day-one work** and must be verified before the `/onboarding` flow diff is finalized.

---

### §9 Flag #3 — `middleware.ts` decision (DELETE)

§5 migration scope table listed `middleware.ts` as "simplify to passthrough or delete." The review required a single locked answer.

**Locked: DELETE.** Rationale:

- `app/(dashboard)/layout.tsx` gains an `isAuthenticated()` guard per §2B. Protected routes are guarded at the layout RSC layer, not at middleware.
- Public routes (`/`, `/sign-in`, `/sign-up`, `/select-org`, `/privacy`, `/terms`, `/dpa`) require no protection. Their layouts do not include the auth guard.
- The Better Auth Next.js framework guide does not require middleware for route protection (https://labs.convex.dev/better-auth/framework-guides/next). One fewer moving part in the auth surface.

Stage 2's diff for `middleware.ts` must show: **BEFORE** = current file content; **AFTER** = file deleted. The §5 migration scope table row for `middleware.ts` is amended to read "**delete**" in Stage 2 (in place of "simplify to passthrough or delete").

---

### §9 Flag #4 — Cookie and CORS strategy for cross-domain JWT delivery

The §1 topology diagram does not specify how the Better Auth session cookie flows from `wabdesk.com/api/auth/*` to the browser, nor how `ConvexBetterAuthProvider` extracts a JWT and delivers it to the Convex WebSocket connection (a different domain: `convex.cloud`).

**Cookie attributes (locked):**

| Attribute | Value | Reason |
|---|---|---|
| `HttpOnly` | `true` | Prevents JavaScript from reading the session token; XSS cannot steal it |
| `Secure` | `true` | HTTPS only; Better Auth sets this automatically in production; skipped in `http://localhost` development |
| `SameSite` | `Lax` | Allows top-level navigations (OAuth redirects) while blocking cross-site POST requests |
| `Path` | `/` | Cookie sent with all same-origin requests |
| `Domain` | _(not set)_ | Scoped to the request host (`wabdesk.com`) by default; no subdomain sharing needed |

**JWT delivery path to Convex (locked):**

The `convexClient()` browser plugin (from `@convex-dev/better-auth`) intercepts the Better Auth session. When `ConvexBetterAuthProvider` mounts, the plugin fetches the current session from the same-origin auth endpoint and exchanges the session token for a short-lived Convex JWT via the Better Auth Component's token issuance endpoint. This JWT is passed to the `ConvexReactClient` WebSocket connection as the auth credential. Token refresh on expiry is handled automatically by the plugin.

**Stage 3 verification required:** confirm the exact token exchange endpoint path in the pinned `@convex-dev/better-auth` version. The path is not assumed here — it must be read from the library source or changelog at pin time.

**CORS (locked):**

- The `/api/auth/*` Route Handler runs on Vercel at the same origin as the browser (`wabdesk.com`). No CORS headers are needed for browser requests to auth endpoints.
- The Better Auth Component's JWKS endpoint (`{CONVEX_SITE_URL}/.well-known/jwks.json`) is served by Convex. Convex handles CORS on its HTTP endpoints automatically. No explicit CORS configuration is required in WabDesk code for this endpoint.
- No cross-origin auth requests exist in WabDesk's architecture. The browser only calls auth endpoints on `wabdesk.com`.

---

### §9 Flag #5 — Q2 avatar + Q3 ban/unban UI deletion explicit scope

Dropping ban/unban (Q3) and avatar upload/delete (Q2) requires removing both the Convex backend mutations and any UI surfaces that invoke them. Scope is made explicit here to prevent partial removal in Stage 5.

**Stage 4 scope (Convex mutations — `convex/members.ts`):**

Remove these functions entirely (not marked internal, not feature-flagged — deleted):
- `banUser`
- `unbanUser`
- `updateUserProfileImage`
- `deleteUserProfileImage`

**Stage 5 scope (UI — `components/` and `app/`):**

Stage 2's diff inventory for Stage 5 must include a grep of `components/` and `app/` for the above four mutation names. For each JSX element (button, menu item, settings panel, form) that invokes one of these mutations:
- AFTER state = **removal** (not disabled, not hidden, not feature-flagged)
- The JSX, its event handler, and any related `useT(en, ar)` copy strings are deleted
- If a settings section or header becomes empty after removal, the empty wrapper is also deleted — no layout adjustment, only dead-surface removal

If the grep returns zero results, Stage 2 must include the literal grep output in its response confirming that Stage 5 requires no UI changes for Q2/Q3 scope.

---

### §9 Flag #6 — OAuth redirect URI operational checklist (Q9 Stage 3 prerequisite)

Q9 = Option B (Google + Facebook OAuth) requires updating OAuth app configurations in two external developer consoles. These are out-of-codebase operations tasks for Ahmed, not code changes. They must be completed before Stage 3 deploys to any environment where OAuth sign-in will be tested.

**Stage 3 prerequisite checklist (Ahmed):**

- [ ] **Google Cloud Console** → APIs & Services → Credentials → existing OAuth 2.0 Client ID → Authorized redirect URIs: add `https://wabdesk.com/api/auth/callback/google` and `http://localhost:3000/api/auth/callback/google`
- [ ] **Facebook Developer Console** → WabDesk app → Facebook Login → Settings → Valid OAuth Redirect URIs: add `https://wabdesk.com/api/auth/callback/facebook` and `http://localhost:3000/api/auth/callback/facebook`
- [ ] **Do NOT remove Clerk's existing callback URIs yet.** Leave them as a rollback safety net until the migration is fully validated in production for at least 7 days.
- [ ] **Post-migration cleanup (separate task):** After 7 days of verified production operation, remove Clerk callback URIs as a standalone cleanup task (not part of Stages 3–5).
- [ ] **Vercel env vars** — add before Stage 3 deploys: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`

Stage 3's `convex/auth.ts` diff will include a `socialProviders` block with `google` and `facebook` configurations referencing these env vars.

---

*End of Stage 1 Architecture Mapping and Closeout.*
