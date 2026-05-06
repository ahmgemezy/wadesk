# Stage 0 — Clerk → Better Auth Migration Inventory

> Read-only discovery. No source files were modified in producing this document.
> Produced: 2026-05-06
> Branch: feat/013-departments

---

## 1. Clerk Dependency Inventory

### 1.1 `@clerk/*` packages in `package.json`

| Package | Version |
|---|---|
| `@clerk/nextjs` | `^7.2.5` |
| `@clerk/localizations` | `^4.5.8` |

**Note:** `@better-auth/infra` (`^0.2.5`) is already present in `dependencies`. This is not a Clerk package but is relevant — it suggests a prior Better Auth investigation was started. It is the only Better Auth package currently in the project.

### 1.2 Clerk env vars

`.env.example` does **not exist** in the repository. The following Clerk-related keys were found in `.env.local` (values redacted, keys are the inventory):

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

No `CLERK_WEBHOOK_SECRET` exists — confirming there are no Clerk event webhook handlers (see §5B).

### 1.3 `middleware.ts` — verbatim `clerkMiddleware` configuration block and `matcher`

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/select-org",
  "/privacy(.*)",
  "/terms(.*)",
  "/dpa(.*)",
]);

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

---

## 2. Convex Auth Surface

### 2.1 `convex/auth.config.ts` — verbatim

```typescript
export default {
  providers: [
    {
      domain: "https://communal-octopus-5.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
```

The `domain` is the Clerk JWKS endpoint for this project's Clerk instance. The `applicationID: "convex"` refers to the JWT template name configured in the Clerk dashboard.

### 2.2 `convex/lib/auth.ts` — exported helpers (verbatim signatures + purpose)

```typescript
export type OrgRole = "org:admin" | "org:supervisor" | "org:agent";
```

---

**`getCallerIdentity`**

```typescript
export async function getCallerIdentity(ctx: Ctx | GenericActionCtx<DataModel>)
```

**Purpose:** Reads the JWT identity from Convex context, extracts `orgId` and `orgRole`, returns `{ tenantId, callerId, orgRole }`. Throws `ConvexError("UNAUTHORIZED")` if no identity; throws `ConvexError("NO_ORG")` if no org in token.

**JWT claims read:**
- `identity.subject` → `callerId` (the Clerk user ID, `user_...`)
- `identity.orgId` (legacy flat claim) OR `identity.o.id` (Clerk v2 compact nested) → `tenantId` (the Clerk org ID, `org_...`)
- `identity.orgRole` (legacy flat claim, e.g. `"org:admin"`) OR `identity.o.rol` (Clerk v2 compact, omits `"org:"` prefix) → `orgRole`

The helper normalises both Clerk JWT token formats (legacy template-based and Clerk v2 compact session tokens).

---

**`getCallerRole`**

```typescript
export async function getCallerRole(ctx: Ctx | GenericActionCtx<DataModel>): Promise<OrgRole>
```

**Purpose:** Same JWT extraction as `getCallerIdentity` but returns only the normalised `OrgRole`. Throws `UNAUTHORIZED`, `NO_ORG`, or `FORBIDDEN` (if role is not one of the three valid values).

**JWT claims read:** Same as `getCallerIdentity`.

---

**`assertAdmin`**

```typescript
export function assertAdmin(role: OrgRole): void
```

**Purpose:** Throws `ConvexError("FORBIDDEN")` unless `role === "org:admin"`. Synchronous guard called after `getCallerIdentity` or `getCallerRole`.

**JWT claims read:** None (receives already-resolved `OrgRole`).

---

**`assertAdminOrSupervisor`**

```typescript
export function assertAdminOrSupervisor(role: OrgRole): void
```

**Purpose:** Throws `ConvexError("FORBIDDEN")` unless role is `"org:admin"` or `"org:supervisor"`. Synchronous guard called after role resolution.

**JWT claims read:** None.

---

### 2.3 Direct `ctx.auth.getUserIdentity()` call sites

Files calling `ctx.auth.getUserIdentity()` directly (not via the `getCallerIdentity`/`getCallerRole` wrappers), excluding `convex/lib/auth.ts` which is the definition site:

| File | Line | Surrounding Function / Context |
|---|---|---|
| `convex/lib/auth.ts` | 38 | `getCallerIdentity` (definition) |
| `convex/lib/auth.ts` | 56 | `getCallerRole` (definition) |
| `convex/actions/notifyEmail.ts` | 58 | action handler — checks identity before sending email |
| `convex/actions/validateInvite.ts` | 14 | `validateAndJoin` action — extracts `userId` and `identity.email` |
| `convex/billing.ts` | 41 | `createCheckout` action handler |
| `convex/billing.ts` | 79 | `updateSubscription` action handler |
| `convex/billing.ts` | 124 | `getCustomerPortalUrl` action handler |
| `convex/broadcastTemplates.ts` | 345 | action handler (getCallerRole pattern — direct call then passes to helper) |
| `convex/broadcastTemplates.ts` | 418 | action handler |
| `convex/broadcasts.ts` | 78 | action handler |
| `convex/broadcasts.ts` | 148 | action handler |
| `convex/channels.ts` | 260 | action handler (channel operations) |
| `convex/channels.ts` | 367 | action handler |
| `convex/channels.ts` | 495 | action handler |
| `convex/contactsImport.ts` | 34 | action handler — extracts `orgRole` directly |
| `convex/conversations.ts` | 189 | mutation handler — optional identity read for assignment |
| `convex/conversations.ts` | 209 | mutation handler — assignment path |
| `convex/conversations.ts` | 278 | mutation handler — conditional identity read |
| `convex/conversations.ts` | 665 | query/action handler |
| `convex/conversations.ts` | 797 | internal action handler |
| `convex/conversations.ts` | 995 | mutation handler |
| `convex/csat.ts` | 432 | action handler — CSAT settings |
| `convex/csat.ts` | 480 | action handler — CSAT settings |
| `convex/export.ts` | 92 | `exportContacts` action — uses getCallerRole internally |
| `convex/export.ts` | 355 | `exportConversations` action |
| `convex/inbox.ts` | 304 | mutation handler — inbox operation |
| `convex/inviteLinks.ts` | 196 | action handler — invite link management |
| `convex/inviteLinks.ts` | 235 | action handler |
| `convex/inviteLinks.ts` | 259 | action handler |
| `convex/lib/tenants.ts` | 134 | `getEmailLocalePublic` query — reads `identity.orgId` directly |
| `convex/lib/tenants.ts` | 169 | `getForwardTemplatesPublic` query — reads `identity.orgId` directly |
| `convex/metaTemplates.ts` | 29 | query handler |
| `convex/metaTemplates.ts` | 47 | query handler |
| `convex/metaTemplates.ts` | 220 | action handler — uses getCallerRole |
| `convex/presence.ts` | 80 | mutation handler — presence update |
| `convex/waBusinessProfile.ts` | 19 | `assertAdminAndGetTenantId` (file-local helper calling `getCallerRole`) |

### 2.4 `assertAdmin` / `assertAdminOrSupervisor` / `getCallerRole` / `getCallerIdentity` call sites

Organized by file. Line numbers reference the assertion call (not the preceding `getCallerIdentity` call).

| File | Lines (assertion) | Helper Called | Role Asserted |
|---|---|---|---|
| `convex/analytics.ts` | 20, 66, 134, 179, 228, 323, 368 | `assertAdminOrSupervisor` | admin or supervisor |
| `convex/analytics.ts` | 276, 410 | `getCallerIdentity` only | any authenticated |
| `convex/automations.ts` | 19, 31, 63, 148, 174, 201, 217 | `assertAdminOrSupervisor` | admin or supervisor |
| `convex/automations.ts` | 261 | `assertAdmin` | admin only |
| `convex/automations.ts` | 243 | `getCallerIdentity` only | any authenticated |
| `convex/batchActions.ts` | 13, 41 | `assertAdminOrSupervisor` | admin or supervisor |
| `convex/batchActions.ts` | 129, 170 | `getCallerIdentity` only | any authenticated |
| `convex/billing.ts` | 84, 129 | `getCallerRole` only (role stored, no assert) | any role |
| `convex/broadcastTemplates.ts` | 109, 169, 201, 343, 416 | `assertAdminOrSupervisor` | admin or supervisor |
| `convex/broadcastTemplates.ts` | 26, 49, 66 | `getCallerIdentity` only | any authenticated |
| `convex/broadcasts.ts` | 38, 84 | `assertAdminOrSupervisor` | admin or supervisor |
| `convex/broadcasts.ts` | 18, 36 | `getCallerIdentity` only | any authenticated |
| `convex/channelMembers.ts` | 73, 138 | `assertAdmin` | admin only |
| `convex/channelMembers.ts` | 8, 30, 53 | `getCallerIdentity` only | any authenticated |
| `convex/channels.ts` | 154, 178, 207, 233, 279, 301, 326, 698 | `assertAdmin` | admin only |
| `convex/channels.ts` | 16, 73, 678, 697 | `getCallerIdentity` only | any authenticated |
| `convex/contactEvents.ts` | 47 | `getCallerIdentity` only | any authenticated |
| `convex/contactLists.ts` | 268, 318 | `assertAdminOrSupervisor` | admin or supervisor |
| `convex/contactLists.ts` | 339 | `assertAdmin` | admin only |
| `convex/contactLists.ts` | 56, 68, 90, 116, 129, 164, 225, 266, 316 | `getCallerIdentity` only | any authenticated |
| `convex/contacts.ts` | 164, 188, 320 | `assertAdminOrSupervisor` | admin or supervisor |
| `convex/contacts.ts` | 29, 55, 93, 125, 165, 186, 291, 318, 341, 389 | `getCallerIdentity` only | any authenticated |
| `convex/contactsImport.ts` | 38 | `assertAdminOrSupervisor` | admin or supervisor |
| `convex/conversationMerge.ts` | 12 | `assertAdminOrSupervisor` | admin or supervisor |
| `convex/conversationMerge.ts` | 79 | `getCallerIdentity` only | any authenticated |
| `convex/conversationMetrics.ts` | 105 | `getCallerIdentity` only | any authenticated |
| `convex/conversations.ts` | 442 | `assertAdmin` | admin only |
| `convex/conversations.ts` | 55, 111, 149, 257, 371, 444, 594, 774, 965 | `getCallerIdentity` only | any authenticated |
| `convex/csat.ts` | 436, 484, 646 | `assertAdmin` | admin only |
| `convex/csat.ts` | 510, 586, 624, 719 | `getCallerIdentity` only | any authenticated |
| `convex/customFields.ts` | 8, 27, 57 | `getCallerIdentity` only | any authenticated |
| `convex/customerInsights.ts` | 10, 36 | `getCallerIdentity` only | any authenticated |
| `convex/departmentMembers.ts` | 9, 31, 66, 87, 145 | `getCallerIdentity` only | any authenticated |
| `convex/departments.ts` | 62, 105, 125, 153, 171, 242 | `assertAdmin` | admin only |
| `convex/departments.ts` | 9, 25, 45, 61 | `getCallerIdentity` only | any authenticated |
| `convex/export.ts` | 90, 353 | `assertAdminOrSupervisor` | admin or supervisor |
| `convex/followUps.ts` | 16, 30, 60, 105 | `getCallerIdentity` only | any authenticated |
| `convex/inbox.ts` | 351 | `assertAdminOrSupervisor` | admin or supervisor |
| `convex/inbox.ts` | 38, 140, 166, 190, 277, 350, 370, 399, 409, 421, 580 | `getCallerIdentity` only | any authenticated |
| `convex/inviteLinks.ts` | 57, 91, 114, 231 | `assertAdminOrSupervisor` | admin or supervisor |
| `convex/inviteLinks.ts` | 194, 233, 255 | `assertAdmin` | admin only |
| `convex/inviteLinks.ts` | 21, 54, 88 | `getCallerIdentity` only | any authenticated |
| `convex/labels.ts` | 24 | `assertAdminOrSupervisor` | admin or supervisor |
| `convex/labels.ts` | 52 | `assertAdmin` | admin only |
| `convex/labels.ts` | 8, 80, 101 | `getCallerIdentity` only | any authenticated |
| `convex/lib/tenants.ts` | 41, 148, 191 | `assertAdmin` | admin only |
| `convex/lib/tenants.ts` | 13, 40, 89, 147, 190 | `getCallerIdentity` only | any authenticated |
| `convex/memberQueries.ts` | 14, 143, 272, 363, 391 | `assertAdmin` | admin only |
| `convex/memberQueries.ts` | 104 | `assertAdminOrSupervisor` | admin or supervisor |
| `convex/memberQueries.ts` | 16, 106, 145, 162, 185, 345, 365, 393 | `getCallerIdentity` only | any authenticated |
| `convex/members.ts` | 28, 91, 124, 171, 235, 299, 333, 361, 395, 421, 443, 484 | `assertAdmin` | admin only |
| `convex/members.ts` | 30, 93, 126, 173, 237, 301, 335, 363, 397, 423, 445, 486 | `getCallerIdentity` only | (follows assert) |
| `convex/messageScheduling.ts` | 13, 62, 85 | `getCallerIdentity` only | any authenticated |
| `convex/messageTemplates.ts` | 43, 79, 104 | `assertAdminOrSupervisor` | admin or supervisor |
| `convex/messageTemplates.ts` | 15, 41, 77, 102 | `getCallerIdentity` only | any authenticated |
| `convex/messages.ts` | 15, 56, 160, 405, 458, 476, 593, 697, 770, 815 | `getCallerIdentity` only | any authenticated |
| `convex/metaTemplates.ts` | 225 | `assertAdminOrSupervisor` | admin or supervisor |
| `convex/metaTemplates.ts` | 29, 47 | direct `getUserIdentity` | any authenticated |
| `convex/notifications.ts` | 137, 149 | `assertAdmin` | admin only |
| `convex/notifications.ts` | 64, 79, 94, 110, 121, 136, 148, 291, 325 | `getCallerIdentity` only | any authenticated |
| `convex/onboarding.ts` | 22, 64 | `assertAdmin` | admin only |
| `convex/onboarding.ts` | 9, 21, 63 | `getCallerIdentity` only | any authenticated |
| `convex/orgMembers.ts` | 40, 148, 196 | `assertAdmin` | admin only |
| `convex/orgMembers.ts` | 280 | `assertAdminOrSupervisor` | admin or supervisor |
| `convex/orgMembers.ts` | 33, 43, 76, 81, 150, 204, 282 | `getCallerRole` / `getCallerIdentity` | various |
| `convex/presence.ts` | 8, 42, 109 | `getCallerIdentity` only | any authenticated |
| `convex/profiles.ts` | 8, 25, 57 | `getCallerIdentity` only | any authenticated |
| `convex/quickReplies.ts` | 35, 59, 80 | `assertAdminOrSupervisor` | admin or supervisor |
| `convex/quickReplies.ts` | 8, 33, 57, 78 | `getCallerIdentity` only | any authenticated |
| `convex/search.ts` | 21, 87 | `getCallerIdentity` only | any authenticated |
| `convex/seed.ts` | 15 | `getCallerIdentity` only | any authenticated |
| `convex/sla.ts` | 100 | `assertAdmin` | admin only |
| `convex/sla.ts` | 99 | `getCallerIdentity` only | any authenticated |
| `convex/teamPresence.ts` | 37 | `getCallerIdentity` only | any authenticated |
| `convex/waBusinessProfile.ts` | 18, 27, 79, 126 | `assertAdmin` (via local `assertAdminAndGetTenantId`) | admin only |

**Total Convex files with auth calls: 43** (analytics, automations, batchActions, billing, broadcastTemplates, broadcasts, channelMembers, channels, contactEvents, contactLists, contacts, contactsImport, conversationMerge, conversationMetrics, conversations, csat, customFields, customerInsights, departmentMembers, departments, export, followUps, inbox, inviteLinks, labels, lib/auth, lib/tenants, memberQueries, members, messageScheduling, messageTemplates, messages, metaTemplates, notifications, onboarding, orgMembers, presence, profiles, quickReplies, search, seed, sla, teamPresence, waBusinessProfile)

### 2.5 `convex/http.ts` — Clerk webhooks

`convex/http.ts` registers only two routes:
- `POST /meta-webhook` → Meta WhatsApp webhook handler
- `POST /paddle-webhook` → Paddle billing webhook handler

**No Clerk webhook route exists in `convex/http.ts` or anywhere in `app/api/`.** The directory `app/api/webhooks/clerk/` does not exist.

---

## 3. Frontend Auth Surface

### 3.1 Hooks usage

| File | Line | Hook | What's done with the result |
|---|---|---|---|
| `app/(dashboard)/automations/page.tsx` | 9 | `useAuth` | Reads `orgRole`, `isLoaded` for role-gated UI |
| `app/(dashboard)/inbox/page.tsx` | 57 | `useOrganization` | Reads `membership` for current user's role |
| `app/(dashboard)/settings/channels/page.tsx` | 28 | `useAuth` | Reads `isLoaded`, `orgId`, `orgRole` for channel settings access control |
| `app/join/[token]/page.tsx` | 15 | `useAuth` | Reads `isLoaded`, `isSignedIn`, `orgId` to decide which UI to render |
| `components/automations/AutomationRulesClient.tsx` | 43 | `useOrganization` | Reads `organization.id` for feature gating |
| `components/contacts/contact-detail-sheet.tsx` | 175 | `useOrganization` | Reads `membership.role` and `memberships` for org member list |
| `components/contacts/contact-list.tsx` | 104, 107 | `useAuth` + `useOrganization` | Reads `orgId`, `membership.role` for contact access control |
| `components/contacts/follow-up-modal.tsx` | 39 | `useOrganization` | Reads `memberships` for agent picker |
| `components/convex-client-provider.tsx` | 20 | `useAuth` | Passed as `useAuth` prop to `ConvexProviderWithClerk` (JWT bridge) |
| `components/inbox/conversation-list-item.tsx` | 80, 81 | `useOrganization` + `useUser` | Reads `membership` for role display; `user.id` for "me" badge |
| `components/inbox/conversation-list.tsx` | 76, 77 | `useAuth` + `useOrganization` | Reads `userId`, `memberships` for assignment filtering |
| `components/inbox/status-selector.tsx` | 25 | `useUser` | Reads `user` for current user identity |
| `components/inbox/transfer-picker.tsx` | 34, 35 | `useUser` + `useOrganization` | Current user + memberships for transfer target list |
| `components/onboarding/onboarding-wizard.tsx` | 33 | `useAuth` | Reads `isLoaded`, `orgId` for onboarding redirect guard |
| `components/onboarding/step-workspace-name.tsx` | 10 | `useAuth` | Reads `orgId` as `tenantId` to pass to Convex mutation |
| `components/settings/csat-settings.tsx` | 70 | `useOrganization` | Reads `membership.role` for admin-only UI guard |
| `components/settings/department-members.tsx` | 44, 45 | `useOrganization` + `useUser` | Reads `membership.role`, current `user.id` |
| `components/settings/invite-links.tsx` | 425 | `useOrganization` | Reads `membership.role` and `memberships` list |
| `components/settings/invite-modal.tsx` | 28, 29 | `useOrganization` + `useAuth` | Reads `organization.id`, `membership.role`, `isLoaded` |
| `components/settings/labels-settings.tsx` | 31 | `useOrganization` | Reads `membership.role` for admin guard |
| `components/settings/notifications-settings.tsx` | 27 | `useOrganization` | Reads `membership.role` for admin guard |
| `components/settings/team-member-list.tsx` | 69, 70 | `useOrganization` + `useUser` | Reads `organization.id`, `membership.role`, current `user.id` |
| `components/shell/app-sidebar.tsx` | 85 | `useAuth` | Reads `isLoaded`, `orgId` for sidebar auth guard |
| `components/shell/convex-auth-guard.tsx` | 22 | `useAuth` | Reads `isLoaded`, `orgId` — blocks render until org is active |
| `components/shell/my-profile-modal.tsx` | 30 | `useUser` | Reads `user` for profile display |
| `components/shell/user-menu.tsx` | 18, 19 | `useAuth` + `useUser` | Reads `isSignedIn`, `userId` (for identity), `user` (for name/avatar) |
| `components/team/member-profile/manage-tab.tsx` | 62 | `useAuth` | Reads `userId` to prevent self-modification |
| `components/ui/presence-indicator.tsx` | 13, 36 | `useOrganization` | Reads `organization.id` for presence lookup |
| `components/ui/team-presence-dropdown.tsx` | 38 | `useOrganization` | Reads `organization.id` for presence display |

### 3.2 Components usage

| File | Line | Component | Purpose / surrounding context |
|---|---|---|---|
| `app/(auth)/sign-in/[[...sign-in]]/page.tsx` | 74 | `<SignIn>` | Clerk-hosted sign-in form with custom `appearance` prop |
| `app/(auth)/sign-up/[[...sign-up]]/page.tsx` | 74 | `<SignUp>` | Clerk-hosted sign-up form with custom `appearance` prop |
| `app/join/[token]/page.tsx` | 97 | `<SignIn>` | Fallback for unauthenticated visitors of join link; no appearance override |
| `app/select-org/page.tsx` | 8 | `<OrganizationList>` | Full-page Clerk org selector with `hidePersonal`, `afterSelectOrganizationUrl="/inbox"`, `afterCreateOrganizationUrl="/onboarding"` |
| `app/layout.tsx` | 47, 68 | `<ClerkProviderWithLocale>` | Root layout wrapper; custom component wrapping `<ClerkProvider>` |
| `components/clerk-provider-with-locale.tsx` | 27, 33 | `<ClerkProvider>` | Sets `localization` (arSA / enUS), `signInUrl`, `signUpUrl` |
| `components/convex-client-provider.tsx` | 20 | `ConvexProviderWithClerk` | Bridges Clerk JWT to Convex client (from `convex/react-clerk`) |
| `components/shell/user-menu.tsx` | 4, 85 | `<SignOutButton>` + `<OrganizationSwitcher>` | User menu; `<OrganizationSwitcher>` for org-switching UI |

---

## 4. Auth Pages Catalogue

### `app/(auth)/layout.tsx`

**Clerk components:** None — fully custom layout.

**Design:** Two-column split layout (`min-h-screen flex`). Left panel (form side): radial gradient background, `FormLogo` (inline SVG + "WABDesk" wordmark in Apple-style typography), renders `{children}`. Right panel: `<BrandPanel defaultLocale={locale}>` (locale-aware client component from `components/auth/brand-panel`). Panel order is DOM-ordered so it is automatically start-aligned in both RTL and LTR. Locale read from cookie server-side.

---

### `app/(auth)/sign-in/[[...sign-in]]/page.tsx`

**Clerk component:** `<SignIn fallbackRedirectUrl="/inbox" signUpUrl="/sign-up" appearance={appearance} />`

**Custom styling:** Large `appearance` object passed to Clerk `<SignIn>` with:
- `colorPrimary: "#0071E3"` (Apple blue)
- `card`: glassmorphism (`backdrop-filter: blur(24px) saturate(180%)`, `border-radius: 22px`, layered box shadows)
- Custom Tailwind class overrides on `formButtonPrimary` (rounded-full), `socialButtonsBlockButton__google`, `socialButtonsBlockButton__facebook`
- Font: Apple system stack (`-apple-system, BlinkMacSystemFont, 'SF Pro Display'`)

**Note:** The `<SignIn>` component renders the entire form UI. Only the wrapper `<div className="flex items-center justify-center w-full">` is custom.

---

### `app/(auth)/sign-up/[[...sign-up]]/page.tsx`

**Clerk component:** `<SignUp fallbackRedirectUrl="/onboarding" signInUrl="/sign-in" appearance={appearance} />`

**Custom styling:** Identical `appearance` object as sign-in. `fallbackRedirectUrl="/onboarding"` — new users land in the onboarding wizard after signup.

---

### `app/select-org/page.tsx`

**Clerk component:** `<OrganizationList hidePersonal afterSelectOrganizationUrl="/inbox" afterCreateOrganizationUrl="/onboarding" />`

**Custom styling:** None — bare `OrganizationList` centered in `min-h-screen flex items-center justify-center bg-background`.

**Note:** This is a "use client" page. It shows existing org memberships and allows creating a new org. Used for returning members who land without an active org in session.

---

### `app/accept-invite/page.tsx`

**Clerk component:** None — server component only.

**Behaviour:** Server-side RSC. Reads `auth()` (userId, getToken), `currentUser()`, and `clerkClient()`. Gets the user's latest org membership, sends a welcome email via Convex action, then immediately `redirect("/inbox")`. No UI rendered — purely a server-side callback page reached after accepting a Clerk email invitation.

---

### `app/join/[token]/page.tsx`

**Clerk component:** `<SignIn />` (no appearance override) — rendered only if user is not signed in.

**Custom UI:** "Use client" page. Three visual states:
1. **Unauthenticated:** Shows heading + `<SignIn />` form in a `max-w-sm` card.
2. **Signed in, not yet joined:** Shows "Join Team" heading + `<Button onClick={handleJoin}>` that calls `validateAndJoin` Convex action.
3. **Joined:** Shows success message, redirects to `/inbox` after 1500ms.

The token comes from Convex's `inviteLinks` table (generated by admin/supervisor, not from Clerk's built-in invite system).

---

## 5. Org / User Provisioning Flow

### Flow A — New user signs up via `/sign-up`

- **Step 1** (`app/(auth)/sign-up/[[...sign-up]]/page.tsx:74`): User fills and submits Clerk `<SignUp>`. Clerk handles user creation internally.
- **Step 2**: Clerk redirects to `fallbackRedirectUrl="/onboarding"`.
- **Step 3** (`app/onboarding/layout.tsx:auth()`): Server-side `auth()` is called. `userId` is set; `orgId` is **null** (brand-new user has no org).
- **Step 4** (`app/page.tsx:31`): If user hits `/` while signed in without an org, `clerkClient().users.getOrganizationMembershipList()` is called. If `totalCount === 0`, redirect to `/onboarding`.
- **Step 5** (`components/onboarding/step-workspace-name.tsx`): User enters workspace name. This triggers Clerk's org creation (via Clerk's frontend SDK — exact mechanism is inside the `CreateOrganization` flow or `organization.create()` Clerk client call from within the wizard).
- **Step 6**: After org is created, `orgId` is available via `useAuth()`.
- **Step 7** (`convex/onboarding.ts:ensureCreated:36-48`): `onboarding.ensureCreated` mutation is called. If no `tenants` row exists for `tenantId` (= Clerk `orgId`), one is created inline with `plan: "free"`. This is the **tenant provisioning moment**.
- **Step 8**: Onboarding wizard continues through WABA connection, team invite, and marks `onboarding_complete`.

**Better Auth migration impact: HIGH** — The entire sign-up flow uses Clerk's `<SignUp>` hosted component. Better Auth requires custom form UI (good fit — existing design can be preserved). The org creation step inside the onboarding wizard currently relies on Clerk's frontend client SDK; this must be replaced with Better Auth's organization plugin API. Tenant row creation in Convex (Step 7) is auth-library-agnostic and can remain unchanged.

---

### Flow B — Org creation: what creates the `tenants` row?

**There is no Clerk webhook.** The `tenants` row is created lazily inside:
- `convex/onboarding.ts:ensureCreated` (`line 37-42`) — called from the onboarding wizard on the first admin step. Checks for existing row; inserts if absent.

There is no trigger from Clerk's org creation event. The Convex `tenants` table receives a row only when an admin actively progresses through the onboarding wizard.

**Better Auth migration impact: LOW** — The lazy-create pattern is auth-library-agnostic. `tenantId` will become the Better Auth `organizationId` instead of Clerk `orgId`, but the creation logic in `convex/onboarding.ts` does not care about the ID source.

---

### Flow C — Existing user accepts email invite to an existing org

- **Step 1**: Admin/Supervisor uses Clerk's built-in email invite (triggered from `convex/orgMembers.ts:inviteByEmail:45` → `clerkClient().organizations.createOrganizationInvitation()`).
- **Step 2**: Clerk sends invite email. User clicks the link → Clerk's hosted accept-invite flow handles authentication and adds the user to the Clerk org.
- **Step 3** (`app/accept-invite/page.tsx`): User is redirected here post-acceptance. Server-side: `auth()` provides `userId`; `clerkClient().users.getOrganizationMembershipList()` confirms membership. Convex action `notifyEmail.sendWelcomeOnJoin` sends a welcome email.
- **Step 4**: Redirect to `/inbox`.

No Convex membership record is explicitly created — member data comes from Clerk's organization membership API, queried on demand by `clerkClient()` in Convex actions.

**Better Auth migration impact: HIGH** — Clerk's built-in email invite flow is replaced entirely by Better Auth's `organization.inviteMember()` API. The `app/accept-invite/page.tsx` server callback and `clerkClient().organizations.createOrganizationInvitation()` in `convex/orgMembers.ts` both require replacement. Importantly, Better Auth stores members in its own database tables (via the Convex adapter), so `clerkClient()` lookups for membership data will be replaced by Convex queries to Better Auth tables.

---

### Flow D — User opens `/join/[token]/` shareable link

- **Step 1** (`app/join/[token]/page.tsx`): Token is extracted from URL params.
- **Step 2**: If not signed in: `<SignIn />` renders. User signs in / signs up. Page re-renders via Clerk's auth state.
- **Step 3**: `useAuth().isSignedIn` becomes true. "Join" button renders.
- **Step 4** (`convex/actions/validateInvite.ts:validateAndJoin`): On button click, Convex action is called:
  - `ctx.auth.getUserIdentity()` extracts `userId` from JWT (`line 14-16`)
  - `internal.inviteLinks.getByToken` fetches the token record from Convex's `inviteLinks` table (`line 18-23`)
  - Validates expiry and revocation
  - `clerkClient().organizations.getOrganizationMembershipList()` checks plan limits (`line 30-33`)
  - `clerkClient().organizations.createOrganizationMembership()` adds user to Clerk org (`line 38-42`)
  - Sends welcome email via `internal.actions.notifyEmail.agentWelcomeEmail`
  - Returns `{ orgId, orgName }`
- **Step 5**: UI shows success → `router.push("/inbox")` after 1500ms.

**Better Auth migration impact: HIGH** — `clerkClient().organizations.createOrganizationMembership()` is the core of this flow. In Better Auth, membership is created via the organization plugin's API and stored in Convex adapter tables, not in Clerk. The `inviteLinks` table and token validation are auth-library-agnostic; only the membership creation call needs replacing.

---

## 6. Clerk Node SDK Usage (Server-Side)

Every server-side `clerkClient()` call (not React hooks):

| File | Line | API Method | Purpose |
|---|---|---|---|
| `app/(dashboard)/layout.tsx` | 49 | `client.organizations.getOrganization()` | Fetch org name for dashboard header display |
| `app/accept-invite/page.tsx` | 19 | `clerk.users.getOrganizationMembershipList()` | Confirm user's latest org membership after invite acceptance |
| `app/page.tsx` | 31 | `client.users.getOrganizationMembershipList()` | Check if user has any orgs (to decide /onboarding vs /inbox redirect) |
| `convex/actions/roundRobin.ts` | 43 | `client.organizations.getOrganizationMembershipList()` | Fallback: get all org members when no department members for round-robin assignment |
| `convex/actions/validateInvite.ts` | 28 | `client.organizations.getOrganizationMembershipList()` | Check plan member limit before adding new member |
| `convex/actions/validateInvite.ts` | 38 | `client.organizations.createOrganizationMembership()` | Add user to Clerk org via shareable invite token |
| `convex/actions/validateInvite.ts` | 54 | `client.organizations.getOrganization()` | Fetch org name for welcome email |
| `convex/lib/emailHelpers.ts` | 9 | `client.organizations.getOrganizationMembershipList()` | `getAdminEmails()`: resolve admin email addresses for system notifications |
| `convex/lib/emailHelpers.ts` | 29 | `client.users.getUser()` | `resolveUserEmail()`: resolve user email from userId for notifications |
| `convex/lib/emailHelpers.ts` | 39 | `client.organizations.getOrganization()` | `resolveOrgName()`: resolve org name from orgId for email copy |
| `convex/members.ts` | 32 | `client.users.getUser()` | `getMemberProfile`: fetch Clerk user profile data |
| `convex/members.ts` | 99 | `client.users.updateUser()` | `updateMemberRole`: update user metadata in Clerk |
| `convex/members.ts` | 154 | `client.organizations.updateOrganizationMembership()` | `removeMemberFromOrganization`: update role in Clerk org |
| `convex/members.ts` | 175 | `client.organizations.getOrganizationMembershipList()` | `updateMemberChannels`: validate membership before channel update |
| `convex/members.ts` | 239 | `client.organizations.getOrganizationMembershipList()` | `updateMemberDepartments`: validate membership |
| `convex/members.ts` | 337 | `client.users.updateUser()` | `updateMemberDisplayName`: update Clerk user firstName |
| `convex/members.ts` | 374 | `client.users.updateUserProfileImage()` | `updateMemberAvatarFromStorage`: upload avatar to Clerk |
| `convex/members.ts` | 403 | `client.users.updateUserProfileImage()` | `updateMemberAvatarFromUrl`: upload avatar to Clerk |
| `convex/members.ts` | 425 | `client.users.deleteUserProfileImage()` | `removeMemberAvatar`: delete avatar from Clerk |
| `convex/members.ts` | 451 | `client.users.banUser()` | `disableAccount`: ban user in Clerk |
| `convex/members.ts` | 488 | `client.users.unbanUser()` | `enableAccount`: unban user in Clerk |
| `convex/orgMembers.ts` | 45 | `client.organizations.createOrganizationInvitation()` | `inviteByEmail`: create Clerk email invite |
| `convex/orgMembers.ts` | 83 | `client.organizations.getOrganizationMembershipList()` | `list`: list all org members from Clerk |
| `convex/orgMembers.ts` | 161 | `client.organizations.updateOrganizationMembership()` | `changeRole`: update Clerk org membership role |
| `convex/orgMembers.ts` | 206 | `client.organizations.createOrganizationInvitation()` | `inviteByWhatsApp`: create Clerk invite, extract URL for WhatsApp send |
| `convex/orgMembers.ts` | 288 | `client.organizations.deleteOrganizationMembership()` | `removeMember`: remove user from Clerk org |
| `convex/teamPresence.ts` | 42 | `client.organizations.getOrganizationMembershipList()` | `listWithDepartments`: resolve org members for presence display |

**Also uses `auth()` / `currentUser()` from `@clerk/nextjs/server` (no clerkClient):**

| File | Line | API | Purpose |
|---|---|---|---|
| `app/(dashboard)/analytics/layout.tsx` | 1 | `auth()` | Route protection |
| `app/(dashboard)/analytics/page.tsx` | 1 | `auth()` | Route protection |
| `app/(dashboard)/contacts/layout.tsx` | 1 | `auth()` | Route protection |
| `app/(dashboard)/layout.tsx` | 34 | `auth()` | Destructures `userId`, `orgId`, `orgRole`, `getToken` |
| `app/(dashboard)/layout.tsx` | 44 | `currentUser()` | Fetch user name/email/avatar for sidebar |
| `app/(dashboard)/my-stats/page.tsx` | 1 | `auth()` | Route protection |
| `app/(dashboard)/settings/billing/layout.tsx` | 1 | `auth()` | Route protection |
| `app/(dashboard)/settings/channels/layout.tsx` | 1 | `auth()` | Route protection |
| `app/(dashboard)/settings/general/page.tsx` | 1 | `auth()` | Route protection |
| `app/(dashboard)/settings/layout.tsx` | 1 | `auth()` | Route protection |
| `app/(dashboard)/settings/team/page.tsx` | 1 | `auth()` | Route protection |
| `app/accept-invite/page.tsx` | 9-10 | `auth()` + `currentUser()` | Session check + user profile fetch |
| `app/onboarding/layout.tsx` | `auth()` | Route protection + onboarding guard |

---

## 7. Risks & Unknowns

- **`@better-auth/infra` already in `package.json`** — Version `^0.2.5` is present in `dependencies` but not `@convex-dev/better-auth`. Unclear what was attempted or when it was added. Stage 1 must decide whether this version is compatible with `@convex-dev/better-auth`.

- **`convex/auth.config.ts` issuer URL is Clerk-specific** — The `domain: "https://communal-octopus-5.clerk.accounts.dev"` is the JWKS endpoint for this project's Clerk instance. Replacing it with Better Auth's JWT config requires the `@convex-dev/better-auth` component's `convex()` plugin to inject the correct config. The `applicationID: "convex"` maps to the Clerk JWT template name — Better Auth uses a different mechanism (no named templates).

- **`identity.o.id` / `identity.o.rol` dual-format support** — `convex/lib/auth.ts` supports both legacy flat JWT claims (`orgId`, `orgRole`) and Clerk v2 compact nested format (`o.id`, `o.rol`). Better Auth's organization plugin will use entirely different claim names (e.g., `organizationId`, `role`). The normalization logic in `convex/lib/auth.ts` must be rewritten — not just a rename.

- **`convex/orgMembers.ts:list` fetches all members from Clerk** — There is no `members`-like table in Convex schema. Member data (name, email, avatar, role) is sourced entirely from `clerkClient().organizations.getOrganizationMembershipList()`. Better Auth (with Convex adapter) stores members in its own tables (`member`, `organization`). Stage 1 must map how member queries switch from Clerk API calls to Convex/Better Auth queries.

- **`convex/members.ts` avatar/ban operations** — `banUser`, `unbanUser`, `updateUserProfileImage`, `deleteUserProfileImage` are Clerk-specific user management APIs. Better Auth does not have built-in equivalents for ban/unban or Clerk-hosted avatar storage. These functions need explicit design in Stage 1.

- **`ConvexProviderWithClerk` JWT bridge** — `components/convex-client-provider.tsx` uses `ConvexProviderWithClerk` from `convex/react-clerk` which hooks Clerk's `useAuth` to automatically pass JWT tokens to Convex. Better Auth requires replacing this with a different bridge — likely a custom `ConvexProvider` that reads Better Auth session tokens and injects them into Convex requests.

- **`getToken({ template: "convex" })`** — Used in `app/(dashboard)/layout.tsx:62`, `app/accept-invite/page.tsx:17`, and `app/onboarding/layout.tsx` to get a Convex-compatible JWT from Clerk. Better Auth generates JWTs differently (no named templates). Every `getToken({ template: "convex" })` call site must be updated.

- **`app/select-org/page.tsx` uses `<OrganizationList>`** — This renders Clerk's full org-switcher/creator UI. Better Auth has no equivalent hosted component. Stage 5 will need a fully custom org selector page built against Better Auth's `authClient`.

- **Role names format** — Current system uses `"org:admin"`, `"org:supervisor"`, `"org:agent"` (Clerk org role format with `"org:"` prefix). Better Auth organization plugin uses `"owner"`, `"admin"`, `"member"` by default, but supports custom roles. The string comparison throughout the frontend (`orgRole === "org:admin"`) and `lib/shell/role-utils.ts:resolveRole` will need updating. 43 Convex files rely on these role strings.

- **`convex/lib/tenants.ts:getEmailLocalePublic` and `getForwardTemplatesPublic`** — Both read `identity.orgId` **directly** (not via `getCallerIdentity`), bypassing the dual-format normalization at `convex/lib/auth.ts:15-20`. If Better Auth's JWT uses a different claim name, these two queries will silently fail (return defaults) rather than throwing an error.

- **No Clerk webhook — tenant provisioning is fully lazy** — `tenants` rows are only created inside `convex/onboarding.ts:ensureCreated`. There is no org creation event handler. This is actually favorable for migration: the provisioning code does not depend on Clerk org IDs being set externally.

- **`convex/actions/roundRobin.ts` fetches all org members from Clerk as fallback** — When no department members are configured, it calls `clerkClient().organizations.getOrganizationMembershipList()` for round-robin assignment. This is a runtime path that will silently fail post-migration if not updated.

- **`app/(auth)/sign-in` and `app/(auth)/sign-up` use Clerk-hosted `<SignIn>` and `<SignUp>` components** — The design is entirely controlled by Clerk's `appearance` prop (not by custom HTML). Preserving the visual design requires reimplementing the same `appearance`-driven styling as actual form HTML with Better Auth's `authClient`. The card glassmorphism, button styles, and social button overrides will need to be rebuilt as Tailwind/inline-style HTML.

---

## 8. Files NOT Touched in Stage 0

- **No source files were modified.**
- **No `/convex/_generated/*` files were inspected.**
- **No Better Auth installation, schema, or code was written.**

---

## 9. Verification Round (2026-05-06)

### V1 — `@better-auth/infra ^0.2.5` status

**Verbatim `package.json` lines 17–23 (5 lines before and after the entry):**

```json
  "dependencies": {
    "@base-ui/react": "^1.3.0",
    "@better-auth/infra": "^0.2.5",
    "@clerk/localizations": "^4.5.8",
    "@clerk/nextjs": "^7.2.5",
    "@paddle/paddle-js": "^1.6.2",
    "@react-email/components": "^1.0.12",
```

**`npm view @better-auth/infra` verbatim output:**

```
@better-auth/infra@0.2.5 | MIT | deps: 4 | versions: 16
Dashboard and analytics plugin for Better Auth
https://better-auth.com

keywords: better-auth, auth, authentication, dashboard, analytics, security

dist
.tarball: https://registry.npmjs.org/@better-auth/infra/-/infra-0.2.5.tgz
.shasum: 876b1f50dfad0cac71a6f365dd89466546230c12
.integrity: sha512-TYY5OUV/pnG3OYZlHHcFo4jaIQBTWb2K8QR3fKiugTa9OJ1W3JcPbS5xSdTxcBeUFScLEFTTO59oCZ9a7f16AQ==
.unpackedSize: 540.5 kB

dependencies:
@better-fetch/fetch: ^1.1.21
better-call: ^1.3.3
jose: ^6.1.0
libphonenumber-js: ^1.12.36

maintainers:
- bekacru <Bekacru@gmail.com>
- better-gustavo <gustavo@better-auth.com>

dist-tags:
beta: 0.1.10
latest: 0.2.5

published 2 weeks ago by bekacru <Bekacru@gmail.com>
```

**Source files importing `@better-auth/infra` (grep result):**

```
./package-lock.json
./package.json
```

No `.ts` / `.tsx` source files import this package.

**Conclusions:**

**(a)** `@better-auth/infra` is a **real, published package** on the npm registry. The entry in `package.json` was not a misread.

**(b)** It is the official **Dashboard and analytics plugin for Better Auth**, maintained by the Better Auth core team (bekacru). It provides a web-based admin interface for monitoring auth activity, sessions, and security events. Published 2 weeks ago (latest: 0.2.5). Depends on `better-call`, `@better-fetch/fetch`, `jose`, and `libphonenumber-js`.

**(c)** The package is installed (present in `package-lock.json`) but **not imported in any source file**. It is a dead dependency as of Stage 0 — likely added experimentally during an earlier migration investigation. It is not `@convex-dev/better-auth` (the Convex adapter component, which is still absent from `package.json`).

**Correction to §1.1:** The §1.1 note ("suggests a prior Better Auth investigation was started") stands. The package identity is now confirmed. The §7 risk bullet about `@better-auth/infra` being "unrecognized" is resolved — it is a legitimate Better Auth ecosystem package, unused in source. It will remain uninstalled in migration scope unless the team explicitly decides to use the dashboard plugin. No §1.1 edit needed.

---

### V2 — `lib/shell/role-utils.ts` full inventory

**Verbatim file contents:**

```typescript
import type { ResolvedRole } from "./types";

export const ROLE_ORDER: Record<ResolvedRole, number> = {
  agent: 0,
  supervisor: 1,
  admin: 2,
};

export function resolveRole(
  orgRole: string | undefined,
): ResolvedRole {
  if (orgRole === "org:admin" || orgRole === "admin") return "admin";
  if (orgRole === "org:supervisor") return "supervisor";
  return "agent";
}

export function hasMinRole(
  userRole: ResolvedRole,
  requiredRole: ResolvedRole,
): boolean {
  return ROLE_ORDER[userRole] >= ROLE_ORDER[requiredRole];
}
```

**Exported symbols:**

| Symbol | Kind | Purpose |
|---|---|---|
| `ROLE_ORDER` | `const Record<ResolvedRole, number>` | Numeric rank map used by `hasMinRole` for ordinal comparison (`agent=0`, `supervisor=1`, `admin=2`) |
| `resolveRole(orgRole)` | `function` | Normalizes raw Clerk role strings → `ResolvedRole` union (`"admin" \| "supervisor" \| "agent"`). Accepts both prefixed (`"org:admin"`) and bare (`"admin"`) for admin; only prefixed for supervisor |
| `hasMinRole(userRole, requiredRole)` | `function` | Returns `true` if `userRole` numeric rank ≥ `requiredRole` numeric rank |

**All importers (grep result verbatim):**

```
app/(dashboard)/layout.tsx:9:import { resolveRole } from "@/lib/shell/role-utils";
app/(dashboard)/settings/layout.tsx:4:import { resolveRole, hasMinRole } from "@/lib/shell/role-utils";
app/(dashboard)/settings/team/page.tsx:4:import { resolveRole } from "@/lib/shell/role-utils";
app/(dashboard)/settings/channels/layout.tsx:3:import { resolveRole } from "@/lib/shell/role-utils";
app/(dashboard)/settings/billing/layout.tsx:3:import { resolveRole } from "@/lib/shell/role-utils";
app/(dashboard)/contacts/layout.tsx:3:import { resolveRole } from "@/lib/shell/role-utils";
app/(dashboard)/contacts/layout.tsx:4:import { hasMinRole } from "@/lib/shell/role-utils";
app/(dashboard)/analytics/layout.tsx:5:import { resolveRole, hasMinRole } from "@/lib/shell/role-utils";
components/shell/user-menu.tsx:10:import { resolveRole } from "@/lib/shell/role-utils";
lib/shell/nav-config.ts:2:import { ROLE_ORDER } from "./role-utils";
```

**10 import sites total** — all are Stage 5 (frontend) touch points.

**Role-string format analysis:**

`resolveRole` accepts **two formats**:

1. Clerk-prefixed: `"org:admin"`, `"org:supervisor"` (current Clerk JWT claim value)
2. Bare (already stripped): `"admin"` only — supervisor has **no bare fallback**

This asymmetry means:
- `resolveRole("admin")` → `"admin"` ✅ (has bare fallback)
- `resolveRole("supervisor")` → `"agent"` ⚠️ (falls through — no bare fallback for supervisor)
- `resolveRole("org:agent")` → `"agent"` ✅ (falls through correctly, but implicitly)

**Migration implication:** After migration, Better Auth organization roles will be bare strings (e.g., `"admin"`, `"supervisor"`, `"agent"`) without the `"org:"` prefix. The `resolveRole` function will work correctly for `"admin"` but **silently misclassify `"supervisor"` as `"agent"`** unless the bare `"supervisor"` branch is added. This is a **HIGH-risk edge case** — a supervisor logging in post-migration would see agent-level permissions until `resolveRole` is updated. Stage 5 must patch this function on day one.

---

### V3 — Absence of `<SignedIn/>`, `<SignedOut/>`, `<Protect/>`

**Grep 1 — JSX usage (`<SignedIn`, `<SignedOut`, `<Protect`):**

```
(empty — no output)
```

**Grep 2 — import-line check (Clerk imports filtered for these symbols):**

```
(empty — no output)
```

**Conclusion:** `<SignedIn/>`, `<SignedOut/>`, and `<Protect/>` are **not used anywhere** in the codebase (verified 2026-05-06). _(Correction to §3.2: appending this note below.)_

**Addendum to §3.2:**

> `<SignedIn/>`, `<SignedOut/>`, `<Protect/>` are not used in the codebase (verified 2026-05-06). Route protection is handled entirely by `clerkMiddleware` in `middleware.ts` (§2.1) and by `auth().protect()` in server components.
- **No `package.json` changes.**
