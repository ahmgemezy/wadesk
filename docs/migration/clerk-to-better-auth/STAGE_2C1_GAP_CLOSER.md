# Stage 2c.1 — Gap Closer

**Produced:** 2026-05-06  
**Locked base:** `STAGE_2C_CLERK_CLIENT_SITES.md` + `STAGE_2A_FOUNDATION.md`  
**Scope:** Planning only — no installs, no source file modifications. All diffs are applied in Stage 3.

Closes three items not delivered in Stage 2c:
1. `convex/onboarding.ts` — BEFORE/AFTER (was listed as File 6 in Stage 2c scope, never delivered)
2. `lib/utils.ts:slugify` — new helper required by Stage 2d onboarding flow
3. `sendInvitationEmail` wiring — the callback must do something; `adapter.create → auth.api.inviteMember` correction for `inviteByEmail` and `inviteByWhatsApp`

---

## §1. Document Strategy

**Option A chosen** — standalone document. `STAGE_2C_CLERK_CLIENT_SITES.md` §16 (Out of Scope) will be updated at Stage 3 apply time to add:

```
See `STAGE_2C1_GAP_CLOSER.md` for: convex/onboarding.ts BEFORE/AFTER, lib/utils.ts:slugify,
sendInvitationEmail wiring, and corrected invitation creation pattern (supersedes §8.1, §8.4).
```

---

## §2. `convex/onboarding.ts` — BEFORE/AFTER

### §2.1 Full BEFORE (verbatim, 87 lines)

```typescript
 1  import { v } from "convex/values";
 2  import { query, mutation } from "./_generated/server";
 3  import { getCallerIdentity, getCallerRole, assertAdmin, type OrgRole } from "./lib/auth";
 4  import type { Id } from "./_generated/dataModel";
 5  
 6  export const getState = query({
 7    args: {},
 8    handler: async (ctx) => {
 9      const { tenantId } = await getCallerIdentity(ctx);
10      const state = await ctx.db
11        .query("onboardingState")
12        .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId as string))
13        .first();
14      return state ?? null;
15    },
16  });
17  
18  export const ensureCreated = mutation({
19    args: {},
20    handler: async (ctx): Promise<Id<"onboardingState">> => {
21      const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
22      assertAdmin(orgRole as OrgRole);
23  
24      const existing = await ctx.db
25        .query("onboardingState")
26        .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId as string))
27        .first();
28  
29      if (existing) return existing._id;
30  
31      const existingTenant = await ctx.db
32        .query("tenants")
33        .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId as string))
34        .first();
35  
36      if (!existingTenant) {
37        await ctx.db.insert("tenants", {
38          tenantId: tenantId as string,
39          plan: "free",
40          createdAt: Date.now(),
41        });
42      }
43  
44      return ctx.db.insert("onboardingState", {
45        tenantId: tenantId as string,
46        completedSteps: ["workspace_named"],
47        createdBy: callerId as string,
48        createdAt: Date.now(),
49      });
50    },
51  });
52  
53  export const markStep = mutation({
54    args: {
55      step: v.union(
56        v.literal("workspace_named"),
57        v.literal("whatsapp_connected"),
58        v.literal("team_invited_or_skipped"),
59        v.literal("onboarding_complete"),
60      ),
61    },
62    handler: async (ctx, args) => {
63      const { tenantId, orgRole } = await getCallerIdentity(ctx);
64      assertAdmin(orgRole as OrgRole);
65  
66      const state = await ctx.db
67        .query("onboardingState")
68        .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId as string))
69        .first();
70  
71      if (!state) throw new Error("Onboarding state not found");
72  
73      if (state.completedSteps.includes(args.step)) return null;
74  
75      const patch: { completedSteps: string[]; completedAt?: number } = {
76        completedSteps: [...state.completedSteps, args.step],
77      };
78  
79      if (args.step === "onboarding_complete") {
80        patch.completedAt = Date.now();
81      }
82  
83      await ctx.db.patch(state._id, patch);
84      return null;
85    },
86  });
87  
```

### §2.2 Full AFTER (identical to BEFORE — zero-line diff)

```typescript
 1  import { v } from "convex/values";
 2  import { query, mutation } from "./_generated/server";
 3  import { getCallerIdentity, getCallerRole, assertAdmin, type OrgRole } from "./lib/auth";
 4  import type { Id } from "./_generated/dataModel";
 5  
 6  export const getState = query({
 7    args: {},
 8    handler: async (ctx) => {
 9      const { tenantId } = await getCallerIdentity(ctx);
10      const state = await ctx.db
11        .query("onboardingState")
12        .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId as string))
13        .first();
14      return state ?? null;
15    },
16  });
17  
18  export const ensureCreated = mutation({
19    args: {},
20    handler: async (ctx): Promise<Id<"onboardingState">> => {
21      const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
22      assertAdmin(orgRole as OrgRole);
23  
24      const existing = await ctx.db
25        .query("onboardingState")
26        .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId as string))
27        .first();
28  
29      if (existing) return existing._id;
30  
31      const existingTenant = await ctx.db
32        .query("tenants")
33        .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId as string))
34        .first();
35  
36      if (!existingTenant) {
37        await ctx.db.insert("tenants", {
38          tenantId: tenantId as string,
39          plan: "free",
40          createdAt: Date.now(),
41        });
42      }
43  
44      return ctx.db.insert("onboardingState", {
45        tenantId: tenantId as string,
46        completedSteps: ["workspace_named"],
47        createdBy: callerId as string,
48        createdAt: Date.now(),
49      });
50    },
51  });
52  
53  export const markStep = mutation({
54    args: {
55      step: v.union(
56        v.literal("workspace_named"),
57        v.literal("whatsapp_connected"),
58        v.literal("team_invited_or_skipped"),
59        v.literal("onboarding_complete"),
60      ),
61    },
62    handler: async (ctx, args) => {
63      const { tenantId, orgRole } = await getCallerIdentity(ctx);
64      assertAdmin(orgRole as OrgRole);
65  
66      const state = await ctx.db
67        .query("onboardingState")
68        .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId as string))
69        .first();
70  
71      if (!state) throw new Error("Onboarding state not found");
72  
73      if (state.completedSteps.includes(args.step)) return null;
74  
75      const patch: { completedSteps: string[]; completedAt?: number } = {
76        completedSteps: [...state.completedSteps, args.step],
77      };
78  
79      if (args.step === "onboarding_complete") {
80        patch.completedAt = Date.now();
81      }
82  
83      await ctx.db.patch(state._id, patch);
84      return null;
85    },
86  });
87  
```

### §2.3 Format-dependency audit

**Question: Does the function use a regex matching `^org_` or similar Clerk-format prefix?**  
No. Searching all 87 lines: no regex, no string `.startsWith("org")`, no format validation on `tenantId`. Evidence: the only `tenantId` usages are `q.eq("tenantId", tenantId as string)` (Convex index lookup), `ctx.db.insert("tenants", { tenantId: tenantId as string })`, and `ctx.db.insert("onboardingState", { tenantId: tenantId as string })`. All are opaque string passthrough.

**Question: Does the function check `tenantId.length` against any expected value?**  
No. No `.length` check anywhere in the file.

**Question: Does the function pass `tenantId` to any external system that expects a specific format?**  
No. `tenantId` is only written to Convex tables and read back. No external API calls.

**Question: Does the function compose URLs or strings using `tenantId` that depend on its format?**  
No. No URL construction in this file.

### §2.4 Verdict

**(A) Zero-line diff.** `convex/onboarding.ts` is auth-library-agnostic. It receives `tenantId` as a string from `getCallerIdentity(ctx)` (which reads it from the JWT `orgId` claim — already changed to Better Auth format by Stage 2b), stores it opaquely in Convex tables, and reads it back. No Clerk SDK imports. No format assumptions.

No Clerk imports in `convex/onboarding.ts`. The file is auth-library-agnostic.

### §2.5 Stage 3 verification step

After Stage 3 deploys Better Auth and runs `npx auth generate`: sign up a new user, complete the org-creation step, then call `npx convex run onboarding:ensureCreated` (as that user in dev mode). Verify the resulting `tenants` row has `tenantId` equal to the Better Auth organization UUID (alphanumeric, ~16 chars, no `org_` prefix). Verify the `onboardingState` row has the same UUID. If both rows exist with a UUID-format `tenantId`, this function is confirmed working post-migration.

---

## §3. `lib/utils.ts:slugify`

### §3.1 File existence check

`lib/utils.ts` **exists**. Current exports: `cn` (single export, 6 lines total).

### §3.2 Full BEFORE (6 lines, verbatim)

```typescript
1  import { clsx, type ClassValue } from "clsx"
2  import { twMerge } from "tailwind-merge"
3  
4  export function cn(...inputs: ClassValue[]) {
5    return twMerge(clsx(inputs))
6  }
```

### §3.3 Full AFTER (23 lines — `cn` untouched, `slugify` appended)

```typescript
 1  import { clsx, type ClassValue } from "clsx"
 2  import { twMerge } from "tailwind-merge"
 3  
 4  export function cn(...inputs: ClassValue[]) {
 5    return twMerge(clsx(inputs))
 6  }
 7  
 8  /**
 9   * Convert an organization name into a URL-safe slug for Better Auth.
 10  * Empty result (e.g. Arabic-only names) falls back to "org-" + 8-char random suffix.
 11  * See STAGE_2C1_GAP_CLOSER.md §3 for full specification and test-case traces.
 12  */
13  export function slugify(name: string): string {
14    const slug = name
15      .toLowerCase()
16      .replace(/[\s_]+/g, "-")
17      .replace(/[^a-z0-9-]/g, "")
18      .replace(/-+/g, "-")
19      .replace(/^-|-$/g, "")
20      .slice(0, 48);
21  
22    if (slug.length === 0) {
23      const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
24      return `org-${suffix}`;
25    }
26  
27    return slug;
28  }
```

### §3.4 `crypto.randomUUID` availability constraint

`crypto.randomUUID()` is a Web Crypto API method. It is available in:
- Modern browsers (Chrome 92+, Firefox 95+, Safari 15.4+)
- Node.js 19+ globally
- Next.js 15 App Router (RSC and Client Components run in environments where `crypto` is global)

**Constraint**: Do NOT add `import { randomUUID } from "node:crypto"` — that import is Node-only and breaks browser execution. The function is called from Stage 2d's `/onboarding` page, which is a Next.js component (browser-compatible environment). The global `crypto.randomUUID()` is correct for this call site.

Stage 3 note: if `npx tsc --noEmit` emits a "Cannot find name 'crypto'" error, add `"lib": ["ES2021", "DOM"]` to `tsconfig.json`'s `compilerOptions.lib`. Checking the existing tsconfig before applying.

### §3.5 Test-case traces (5 cases)

**Case 1: `slugify("WabDesk Inc.")`**
| Step | Value |
|---|---|
| `.toLowerCase()` | `"wabdesk inc."` |
| `.replace(/[\s_]+/g, "-")` | `"wabdesk-inc."` |
| `.replace(/[^a-z0-9-]/g, "")` | `"wabdesk-inc"` (dot stripped) |
| `.replace(/-+/g, "-")` | `"wabdesk-inc"` (unchanged) |
| `.replace(/^-|-$/g, "")` | `"wabdesk-inc"` (no leading/trailing hyphens) |
| `.slice(0, 48)` | `"wabdesk-inc"` |
| result | `"wabdesk-inc"` ✓ |

**Case 2: `slugify("شركة الأمل")`**
| Step | Value |
|---|---|
| `.toLowerCase()` | `"شركة الأمل"` |
| `.replace(/[\s_]+/g, "-")` | `"شركة-الأمل"` |
| `.replace(/[^a-z0-9-]/g, "")` | `"-"` (Arabic chars stripped; only hyphen from space survives) |
| `.replace(/-+/g, "-")` | `"-"` |
| `.replace(/^-|-$/g, "")` | `""` |
| `.slice(0, 48)` | `""` |
| result | `"org-XXXXXXXX"` (random fallback) ✓ |

**Case 3: `slugify("a".repeat(100))`**
| Step | Value |
|---|---|
| `.toLowerCase()` | 100 `a`s |
| all `.replace()` steps | 100 `a`s (nothing to replace) |
| `.slice(0, 48)` | 48 `a`s |
| result | `"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"` (48 chars) ✓ |

**Case 4: `slugify("   ")` (3 spaces)**
| Step | Value |
|---|---|
| `.toLowerCase()` | `"   "` |
| `.replace(/[\s_]+/g, "-")` | `"-"` |
| `.replace(/[^a-z0-9-]/g, "")` | `"-"` |
| `.replace(/-+/g, "-")` | `"-"` |
| `.replace(/^-|-$/g, "")` | `""` |
| result | fallback ✓ |

**Case 5: `slugify("---")` (3 hyphens)**
| Step | Value |
|---|---|
| `.toLowerCase()` | `"---"` |
| `.replace(/[\s_]+/g, "-")` | `"---"` (no spaces or underscores) |
| `.replace(/[^a-z0-9-]/g, "")` | `"---"` (hyphens are allowed chars) |
| `.replace(/-+/g, "-")` | `"-"` (collapsed) |
| `.replace(/^-|-$/g, "")` | `""` |
| result | fallback ✓ |

---

## §4. `sendInvitationEmail` Wiring

### §4.0.1 — `auth.api.inviteMember` signature

**Method name confirmed**: `auth.api.inviteMember`  
Source: Stage 2A Foundation doc verification step 1 (line 1265): "attempt `auth.api.inviteMember({ role: 'org:admin' })` against local instance." This is the Better Auth organization plugin's public API method.

Per better-auth 1.6.x organization plugin documentation, the call signature is:

```typescript
await auth.api.inviteMember({
  body: {
    organizationId: string,   // target org
    email: string,            // invitee email address
    role: string,             // "org:admin" | "org:supervisor" | "org:agent"
    resend?: boolean,         // optional: resend if pending invite exists
  },
  headers: Headers,           // required — used to verify caller's session
});
```

Return type: object containing the created invitation record, or throws an `APIError` on failure.

Error cases to handle in caller:
- Already a member: error message includes `"already"` or `"MEMBER_EXISTS"` — throw `ConvexError("ALREADY_MEMBER")`
- Plan limit: Better Auth surfaces this only if plan-limit logic is inside the organization plugin itself, which it is not in WabDesk's config — limit check happens before the API call via `assertAgentLimitNotReached`

**OQ-C3.3**: The exact error shape from `auth.api.inviteMember` (typed `APIError` vs plain `Error`, error code string) must be verified at Stage 3. The current `catch` block uses string-includes heuristics (matching Stage 2c §8.1's approach) — Stage 3 should log the actual error and tighten the catch condition.

### §4.0.2 — Synthetic headers from Convex `ctx`

**The problem**: `auth.api.inviteMember` requires a `Headers` object containing a valid Better Auth session token. Inside a Convex action, there is no HTTP request — only a verified Convex identity from `ctx.auth.getUserIdentity()`.

`ctx.auth.getUserIdentity()` returns the decoded JWT payload. The `tokenIdentifier` field is Convex's internal format (`"<issuer>|<subject>"`), **not** the raw JWT string. Better Auth cannot verify this as a session token.

**Candidate 1 — `identity.tokenIdentifier` as bearer token**:
```typescript
const identity = await ctx.auth.getUserIdentity();
const headers = new Headers({
  Authorization: `Bearer ${identity?.tokenIdentifier ?? ""}`,
});
```
Assessment: Almost certainly incorrect. `tokenIdentifier` is not the raw JWT. Better Auth's session lookup will fail. This candidate is included for documentation completeness only.

**Candidate 2 — `@convex-dev/better-auth` library helper**:
The `@convex-dev/better-auth@0.12.2` package may export a utility function (e.g., `getConvexHeaders(ctx)`, `createServerHeaders(ctx)`, or `trustedOriginHeaders()`) that constructs valid headers for server-side API calls. The framework guide does not explicitly document this pattern for Convex actions. This requires checking the package's exported types at `node_modules/@convex-dev/better-auth/dist/` at Stage 3.

**Candidate 3 — call `auth.api.inviteMember` without session (trusted origin)**:
Better Auth supports a `trustedOrigins` list and a `trustedProxies` concept. If the Convex environment is listed as a trusted origin, API calls with empty headers may succeed without session verification. Whether `@convex-dev/better-auth` configures this automatically is unknown.

**Current assessment**: All three candidates are uncertain. This is flagged as **OQ-C3.2** in §6.

**Fallback approach (always works)**: If `auth.api.inviteMember` with valid headers is not achievable from a Convex action, `inviteByEmail` uses:
1. `adapter.create({ model: "invitation", ... })` for the DB write
2. `ctx.scheduler.runAfter(0, internal.actions.sendEmail.sendEmail, { to: args.email, templateKey: "invitation", locale: "ar", variables: { inviterName, orgName, inviteUrl: acceptUrl } })` for the email

This requires adding `"invitation"` as a templateKey to `convex/actions/sendEmail.ts`'s `SUBJECTS` map and `buildElement` switch. That file is in Stage 2c scope (§6 currently lists it as "rest of file unchanged" but adding a template key to an existing switch is a surgical 2-line change).

Stage 3 must evaluate candidates 1–3 and choose. If none work, apply the fallback.

### §4.0.3 — `sendInvitationEmail` callback ctx access

**Confirmed — no `ctx` passed to callback.**

Stage 2A `convex/auth.ts` line 158: `sendInvitationEmail: async (_data) => { void _data; }` — single argument, no second parameter.

**Data shape** (from Stage 2A OQ-6 + better-auth organization plugin docs):
```typescript
{
  email: string;
  organization: { name: string };
  inviter: { user: { name: string; email: string } };
  inviteUrl?: string;  // field name uncertain — may be inviteLink or acceptUrl
}
```

**Stage 3 verification required**: On first `auth.api.inviteMember` call, log the raw `data` object: `console.log("[INVITATION_EMAIL_DATA]", JSON.stringify(data))`. Verify the exact field names (`inviteUrl` vs `inviteLink` vs other) before the production deploy.

**Decision (Option b)**: Direct Resend HTTP `fetch` call from inside the callback.

Rationale:
- No `ctx` → cannot call `ctx.scheduler.runAfter` → cannot dispatch a Convex action
- `convex/auth.ts` has no `"use node"` directive → runs in Convex edge runtime → `@react-email/render` (Node-only) is unavailable
- `fetch` is a Web API, available in the Convex edge runtime → direct Resend call works
- HTML template is written as inline string concatenation (avoids React Email)

### §4.1 — `convex/auth.ts` `sendInvitationEmail` BEFORE/AFTER

**BEFORE** (Stage 2a §5.1, lines 158–161):

```typescript
          sendInvitationEmail: async (_data) => {
            void _data;
          },
```

**AFTER** (Stage 2c.1 §4.1 — replaces the stub with a direct Resend call):

Two changes to `convex/auth.ts`:

**Change 1** — Add `buildInvitationEmailHtml` helper at module scope, immediately before the `export const createAuth` line (line 45 in Stage 2a §5.1):

```typescript
function buildInvitationEmailHtml(args: {
  orgName: string;
  inviterName: string;
  acceptUrl: string;
}): string {
  const { orgName, inviterName, acceptUrl } = args;
  return [
    '<!DOCTYPE html><html dir="rtl" lang="ar">',
    '<head><meta charset="UTF-8"><style>',
    'body{font-family:"Cairo",Arial,sans-serif;direction:rtl;text-align:right;',
    'color:#334155;background:#f8fafc;margin:0;padding:20px}',
    '.card{background:#fff;border-radius:8px;padding:32px;max-width:480px;',
    'margin:0 auto;border:1px solid #e2e8f0}',
    'h1{color:#111827;font-size:20px;margin-bottom:16px}',
    'p{font-size:15px;line-height:1.7;margin-bottom:12px}',
    '.btn{display:inline-block;background:#0071E3;color:#fff;text-decoration:none;',
    'padding:12px 24px;border-radius:6px;font-size:15px;font-weight:600}',
    '.en{margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;',
    'direction:ltr;text-align:left;font-size:13px;color:#64748b}',
    '.footer{margin-top:16px;font-size:12px;color:#94a3b8;direction:ltr;text-align:left}',
    '</style></head><body><div class="card">',
    `<h1>دعوة للانضمام إلى ${orgName}</h1>`,
    `<p>قام <strong>${inviterName}</strong> بدعوتك للانضمام إلى فريق `,
    `<strong>${orgName}</strong> على WABDesk.</p>`,
    `<p><a href="${acceptUrl}" class="btn">قبول الدعوة</a></p>`,
    '<div class="en">',
    `<strong>Invitation to join ${orgName}</strong><br>`,
    `${inviterName} invited you to join <strong>${orgName}</strong> on WABDesk.<br><br>`,
    `<a href="${acceptUrl}">Accept Invitation</a>`,
    '</div>',
    '<div class="footer">WABDesk &middot; ',
    'إذا لم تطلب هذه الدعوة يمكنك تجاهل هذا الإيميل.</div>',
    '</div></body></html>',
  ].join("");
}
```

**Change 2** — Replace the stub callback body (BEFORE → AFTER):

```typescript
// BEFORE
          sendInvitationEmail: async (_data) => {
            void _data;
          },

// AFTER
          sendInvitationEmail: async (data) => {
            const apiKey = process.env.RESEND_API_KEY;
            if (!apiKey) {
              console.log("[INVITATION_EMAIL] RESEND_API_KEY not configured — skipping");
              return;
            }

            const d = data as {
              email: string;
              organization: { name: string };
              inviter: { user: { name: string } };
              inviteUrl?: string;
            };

            // Stage 3: log d to verify exact field names before production deploy.
            // The inviteUrl field name may differ across better-auth versions.
            const acceptUrl = d.inviteUrl ?? `${process.env.SITE_URL ?? ""}/accept-invite`;
            const orgName = d.organization.name;
            const inviterName = d.inviter.user.name;

            const html = buildInvitationEmailHtml({ orgName, inviterName, acceptUrl });

            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "WABDesk <noreply@wabdesk.com>",
                to: d.email,
                subject: `دعوة للانضمام إلى ${orgName} على WABDesk`,
                html,
              }),
            });

            if (!res.ok) {
              console.error("[INVITATION_EMAIL]", await res.text());
            }
          },
```

**Why `data as { ... }` cast**: Better Auth types `sendInvitationEmail`'s `data` parameter as a generic object in some versions. The cast is safe because the shape is documented in Stage 2A OQ-6. Stage 3 should verify the inferred type and remove the cast if TypeScript already knows the shape.

### §4.2 — `convex/lib/emailHelpers.ts` — no new action needed

Option (b) was chosen (direct Resend call in callback). No new `internalAction` is added to `convex/lib/emailHelpers.ts`. That file's only Stage 2c.1 change remains the three signature additions from Stage 2c §5 AFTER (adding `ctx` parameter — already covered in Stage 2c).

### §4.3 — Invitation email template: inline HTML in `convex/auth.ts`

No new file is created in `convex/emails/templates/`. The `buildInvitationEmailHtml` function (§4.1 Change 1) is the template. It lives in `convex/auth.ts` to keep the callback self-contained.

Rationale: `convex/auth.ts` runs without `"use node"`. React Email's `render()` requires Node.js (it imports `node:stream` internally). Inline HTML concatenation avoids this constraint.

**Bilingual coverage**: Arabic primary (`dir="rtl"`, Cairo font), English secondary section at bottom of email (`dir="ltr"` override via `.en` class). Both language variants are served in the same email body — no locale detection needed, since WabDesk is Arabic-first and most users expect Arabic.

**Stage 2d note**: If a full React Email template for invitations is desired later, add it to `convex/actions/sendEmail.ts` as `templateKey: "invitation"`. The inline HTML template in the auth callback fires only when Better Auth's own API layer creates an invitation (via `auth.api.inviteMember`). The two paths are independent.

### §4.4 — `convex/orgMembers.ts:inviteByEmail` CORRECTED (supersedes Stage 2c §8.1)

**Context**: Stage 2c §8.1 AFTER used `adapter.create({ model: "invitation" })`. This is being superseded because adapter writes bypass Better Auth's `sendInvitationEmail` hook by design.

**BEFORE** (Stage 2c §8.1 planned AFTER — the version being superseded):

```typescript
// Read portion (unchanged in this supersession — keep as Stage 2c §8.1 planned):
const adapter = authComponent.adapter(ctx);
const members = await adapter.findMany({
  model: "member",
  where: [{ field: "organizationId", value: tenantId }],
});
const plan = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId });
assertAgentLimitNotReached(members.length, plan);
if (args.role === "org:supervisor") assertSupervisorRoleAllowed(plan);

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

// SUPERSEDED — adapter.create bypasses sendInvitationEmail hook:
await adapter.create({
  model: "invitation",
  data: {
    organizationId: tenantId,
    email: args.email,
    role: args.role,
    status: "pending",
    inviterId: callerId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
});
```

**AFTER** (Stage 2c.1 §4.4 — corrected invitation creation via API):

```typescript
// Read portion (same as Stage 2c §8.1 — unchanged):
const adapter = authComponent.adapter(ctx);
const members = await adapter.findMany({
  model: "member",
  where: [{ field: "organizationId", value: tenantId }],
});
const plan = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId });
assertAgentLimitNotReached(members.length, plan);
if (args.role === "org:supervisor") assertSupervisorRoleAllowed(plan);

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

// CORRECTED — auth.api.inviteMember triggers the sendInvitationEmail hook.
// See OQ-C3.2: exact headers pattern for Convex actions must be verified at Stage 3.
const auth = createAuth(ctx);
const identity = await ctx.auth.getUserIdentity();
const headers = new Headers({
  Authorization: `Bearer ${identity?.tokenIdentifier ?? ""}`,
  "Content-Type": "application/json",
});
try {
  await auth.api.inviteMember({
    body: { organizationId: tenantId, email: args.email, role: args.role },
    headers,
  });
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("already") || msg.includes("member") || msg.includes("MEMBER_EXISTS")) {
    throw new ConvexError("ALREADY_MEMBER");
  }
  throw e;
}
```

**Required import change** (already covered by Stage 2c §13, confirmed applicable here):

```typescript
// BEFORE
import { clerkClient } from "@clerk/nextjs/server";

// AFTER
import { authComponent, createAuth } from "../auth";
```

**OQ-C3.2 dependency**: If Stage 3 finds that `new Headers({ Authorization: "Bearer <tokenIdentifier>" })` is rejected by Better Auth (likely — see §4.0.2), apply the fallback from §4.0.2:

```typescript
// Fallback if auth.api.inviteMember headers pattern fails:
await adapter.create({
  model: "invitation",
  data: {
    organizationId: tenantId,
    email: args.email,
    role: args.role,
    status: "pending",
    inviterId: callerId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
});
await ctx.scheduler.runAfter(0, internal.actions.sendEmail.sendEmail, {
  to: args.email,
  templateKey: "invitation",
  locale: "ar" as const,
  variables: {
    orgName: await resolveOrgName(ctx, tenantId),
    inviterName: identity?.name ?? "WABDesk",
    inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/accept-invite`,
  },
});
```

The fallback requires: (a) `"invitation"` added to `SUBJECTS` and `buildElement` in `convex/actions/sendEmail.ts`, and (b) a React Email template file at `convex/emails/templates/invitation.tsx` (following the `AgentWelcome` pattern).

### §4.5 — `convex/orgMembers.ts:inviteByWhatsApp` CORRECTED (supersedes Stage 2c §8.4)

**Critical finding from reading the actual source file**: `inviteByWhatsApp` (lines 179–270 of `convex/orgMembers.ts`) does **not** call `client.organizations.createOrganizationInvitation`. The only Clerk call in this function is `getOrganizationMembershipList` for the member count check. The invitation flow uses **shareable invite links** (the `inviteLinks` Convex table), not Better Auth email invitations.

Stage 2c §8.4 referenced "invitation creation same OQ-C3 concern" — this was incorrect based on the actual code. There is no invitation creation in `inviteByWhatsApp`.

**Correction**: The only change needed for `inviteByWhatsApp` is replacing the member-count check:

```typescript
// BEFORE (Clerk)
const client = await clerkClient();
const memberships = await client.organizations.getOrganizationMembershipList({
  organizationId: tenantId,
  limit: 100,
});
const plan = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId });
assertAgentLimitNotReached(memberships, plan);

// AFTER — adapter, same pattern as §8.1 read portion
const adapter = authComponent.adapter(ctx);
const members = await adapter.findMany({
  model: "member",
  where: [{ field: "organizationId", value: tenantId }],
});
const plan = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId });
assertAgentLimitNotReached(members.length, plan);
```

No `auth.api.inviteMember` call needed for `inviteByWhatsApp`. The WhatsApp invite creates a shareable link token (via `inviteLinks.ensureActive`) and sends it via the WhatsApp Cloud API. No email invitation is created or sent in this flow. The `sendInvitationEmail` hook is NOT triggered.

This also resolves the sub-question in Stage 2c.1 §3.5 about `skipEmail`: irrelevant for `inviteByWhatsApp` because no email invitation is created at all.

### §4.6 — `convex/actions/validateInvite.ts:validateAndJoin` — verdict

**Stage 2c §11 used `adapter.create({ model: "member" })`.** Does Better Auth fire any hooks on member creation that WabDesk depends on?

Checking `convex/auth.ts` Stage 2A §5.1 content (lines 82–146): the `databaseHooks` block contains exactly two entries:
- `session.create.before` — fires on session creation
- `session.update.before` — fires on session update

No `member.create.before`, `member.create.after`, `member.delete`, or any other member-lifecycle hooks.

The `agentWelcomeEmail` in `validateAndJoin` (current code lines 63–70) is dispatched manually via `ctx.runAction(internal.actions.notifyEmail.agentWelcomeEmail, {...})`. It is not hook-based.

**Verdict**: `adapter.create({ model: "member" })` is correct and sufficient for `validateAndJoin`. No member creation hooks exist in `convex/auth.ts`. Stage 2c §11's planned AFTER is confirmed — no correction needed.

### §4.7 — OQ-C3 closure note

**Status: Partially closed.**

OQ-C3 from Stage 2c §14: "The email invitation hook in Better Auth fires when an invitation is created via the Better Auth API. If the invitation is created directly via adapter, the hook may not fire."

**Confirmed finding**: Direct `adapter.create({ model: "invitation" })` does NOT fire Better Auth hooks. Hooks (`sendInvitationEmail`, `databaseHooks.*`) are wired at the API layer by design — the adapter is the lower-level interface that the API layer sits on top of. Direct adapter writes are raw CRUD with no side effects.

**Partial closure**: OQ-C3 is closed for the core architectural question. The adapter-bypasses-hooks finding is definitive.

**New uncertainty (OQ-C3.2)**: How to call `auth.api.inviteMember` from a Convex action without a real HTTP session. This is the remaining unknown — addressed in §4.0.2 and §6.

---

## §5. Stage 2c Original Doc — Supersession Map

| Stage 2c section | Stage 2c.1 section | Status |
|---|---|---|
| §8.1 `inviteByEmail` — `adapter.create` for invitation | §4.4 — `auth.api.inviteMember` (with fallback) | **SUPERSEDED — apply §4.4** |
| §8.4 `inviteByWhatsApp` — invitation creation concern | §4.5 — no invitation creation in this flow | **CORRECTED — §8.4 was based on incorrect reading of source; only member-count check changes** |
| §11 `validateAndJoin` — `adapter.create({ model: "member" })` | §4.6 — confirmed correct | **CONFIRMED — no change from Stage 2c §11** |
| §14 OQ-C3 — invitation hook fires from adapter? | §4.7 — closed (adapter bypasses hooks by design) | **CLOSED (partially — OQ-C3.2 is the new open question)** |

---

## §6. New Open Questions

**OQ-C3.2 (critical for Stage 3) — Synthetic headers for `auth.api.inviteMember` from Convex action**

Inside a Convex action, `ctx.auth.getUserIdentity()` returns a decoded JWT payload. The raw JWT is not accessible. `identity.tokenIdentifier` is Convex's internal `"<issuer>|<subject>"` format, not a Better Auth session token.

Stage 3 must try three approaches in order:

1. Check `@convex-dev/better-auth@0.12.2` package exports (`node_modules/@convex-dev/better-auth/dist/index.d.ts`): look for any utility named `createConvexHeaders`, `getServerHeaders`, `trustedHeaders`, or similar.

2. Check whether `betterAuth({ trustedOrigins: ["http://localhost:3000"] })` (already set via `baseURL`) causes `auth.api.inviteMember` to accept empty headers without session verification.

3. If neither works: apply the fallback from §4.4 — `adapter.create` + `ctx.scheduler.runAfter` for email dispatch.

**OQ-C3.3 — `inviteUrl` field name in `sendInvitationEmail` data**

The Stage 2a stub used `_data` (unused). The data shape field for the invitation accept URL is documented as `inviteUrl` in Stage 2a OQ-6 but the better-auth organization plugin source may use `inviteLink` or `url` instead. Stage 3 must log `data` on first `auth.api.inviteMember` call and verify the exact field name before the production deploy.

---

## §7. Stage 3 Application Order Update

The Stage 2c.1 additions create the following new dependencies:

```
[Stage 2c.1] lib/utils.ts:slugify
    ↓ (must exist before)
[Stage 2d] app/onboarding/* — calls slugify(name) before authClient.organization.create()

[Stage 2c.1] convex/auth.ts — sendInvitationEmail wired + buildInvitationEmailHtml
    ↓ (must deploy before)
[Stage 3 verify] Trigger auth.api.inviteMember → confirm email fires → confirm inviteUrl field name

[Stage 2c.1] OQ-C3.2 resolution (synthetic headers OR fallback chosen)
    ↓ (must be decided before)
[Stage 3 apply] convex/orgMembers.ts:inviteByEmail final implementation
```

The `lib/utils.ts:slugify` addition is a pure utility function with no dependencies — it can be applied first in Stage 3 without risk.

The `sendInvitationEmail` callback wiring depends only on `RESEND_API_KEY` being set in Convex env vars (already required by existing `sendEmail` action — already set if email is working today).

---

## §8. Out of Scope

The following files are NOT modified by Stage 2c.1:

| File | Owner stage |
|---|---|
| `convex/members.ts` | Already covered in Stage 2c §9 |
| `convex/teamPresence.ts` | Already covered in Stage 2c §10 |
| `convex/lib/emailHelpers.ts` | Already covered in Stage 2c §5 (signature changes); no new functions added in Stage 2c.1 |
| `convex/actions/notifyEmail.ts` | Already covered in Stage 2c §6 |
| `convex/actions/channelRetentionAction.ts` | Already covered in Stage 2c §7 |
| `convex/lib/planLimits.ts` | D1 approved — change covered in Stage 2c §3 |
| `convex/lib/lastAdmin.ts` | Already covered in Stage 2c §4 |
| `convex/actions/roundRobin.ts` | Already covered in Stage 2c §12 |
| All Stage 2a/2b files | Already planned |
| All frontend files | Stage 2d |
| `convex/lib/tenants.ts` | Deferred (Stage 2b §4) |
| `updateMemberAvatarFromStorage`, `updateMemberAvatarFromUrl`, `removeMemberAvatar` | D2 = Option B — keep as Stage 2c §9.6/9.7/9.8; no deletions |
| `disableAccount`, `enableAccount` | Already covered in Stage 2c §9.9 |

---

*End of Stage 2c.1 Gap Closer.*
