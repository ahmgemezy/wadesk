# Research: Multi-Tenant Onboarding Flow

## 1. Onboarding State Storage Strategy

**Decision**: New `onboardingState` Convex table (separate from `tenants`), not embedded in the tenant document.

**Rationale**: The `tenants` table tracks billing/plan state — mixing it with transient onboarding state would make the tenant document harder to reason about. A separate table keeps concerns separate and makes it easy to query completion status independently. Onboarding state also changes multiple times during the wizard (high churn) — Convex guidelines recommend separating high-churn data from primary documents.

**Alternatives considered**:
- Add `onboardingCompletedSteps` field to `tenants` table — simpler but conflates onboarding state with tenant configuration; also, the tenant record may not exist yet when the user first enters the wizard.
- Use Clerk organization metadata (`publicMetadata`) — avoids a Convex table but requires Clerk Management API calls to write; Convex is the source of truth for app data.

---

## 2. Onboarding Completion Check in Dashboard Layout

**Decision**: Use `fetchQuery` from `convex/nextjs` in the server component (`app/(dashboard)/layout.tsx`) to check onboarding completion server-side, before rendering the dashboard.

**Rationale**: The dashboard layout is a Next.js Server Component — it cannot use React hooks. `fetchQuery` is the Convex-recommended way to call queries from RSCs (documented in Convex Next.js integration). This avoids a client-side flash of the dashboard before a redirect.

**The check**: If `orgId` exists but no active channel for the tenant exists → redirect to `/onboarding`. This is the minimum check — a connected WhatsApp number is the core "graduation" criterion. Alternatively, check `onboardingState.completedSteps.includes("whatsapp_connected")`.

**Alternatives considered**: Client-side redirect in the dashboard root page — causes a brief flash of the dashboard UI before redirecting; worse UX.

---

## 3. Step Progression After Clerk Organization Creation

**Decision**: Set `afterCreateOrganizationUrl="/onboarding"` on the Clerk `CreateOrganization` component. When the user returns to `/onboarding` with a valid `orgId`, the wizard detects the org exists and shows step 3 (Connect WhatsApp).

**Rationale**: Clerk's `CreateOrganization` component handles the org creation flow internally. The `afterCreateOrganizationUrl` prop controls the redirect after success. Pointing it back to `/onboarding` keeps the user in the guided flow.

**Note**: After org creation, the Clerk session now includes `orgId`. The onboarding wizard reads this from `useAuth()` client-side.

---

## 4. Locale Detection for RTL

**Decision**: Reuse the existing `detectLocale` function already in `app/(dashboard)/layout.tsx`. Pass `locale` as a prop to `<OnboardingWizard>`. Arabic locale → `dir="rtl"`, Cairo/Tajawal font, Arabic copy.

**Rationale**: The function already exists and is tested. In the onboarding page (a Client Component), use `navigator.language` (client-side) since the page doesn't have server-side header access directly. Alternatively, pass locale from a parent Server Component wrapper.

**Implementation**: Wrap `app/onboarding/page.tsx` in a lightweight Server Component that reads headers and passes `locale` to the client `<OnboardingWizard>` component.

---

## 5. "First Admin Only" Gate

**Decision**: Show the onboarding wizard only to the first admin who creates the org. Subsequent admins/supervisors/agents who join via invite skip onboarding and go directly to the inbox.

**How to detect**: Check if `onboardingState.createdBy === callerId` (the current user's Clerk subject). If the current user is not the creator of the onboarding state AND onboarding is complete, go to inbox.

**Simpler alternative**: Just check if onboarding is complete (regardless of who). If complete → inbox. If incomplete → wizard for any admin/supervisor. This is what we use — it's simpler and covers the case where the original admin needs a co-admin to finish setup.

**Agents**: If role is `org:agent` and onboarding is incomplete, redirect to a "waiting" page — agents cannot connect WhatsApp. Actually, agents shouldn't be on the onboarding page at all. The onboarding wizard checks role: only `org:admin` can complete steps 2-3; if `org:agent` hits `/onboarding`, redirect to inbox (agents join after onboarding is done).

---

## 6. Handling Interrupted Onboarding

**Decision**: Each step completion calls `onboarding.markStep(stepName)`. On return, the wizard reads the `completedSteps` array and derives `currentStep` as the first step not in the array. This is purely state-driven — no URL params needed.

**Step order**: `workspace_named` → `whatsapp_connected` → `team_invited_or_skipped` → `onboarding_complete`

**Rationale**: URL-param-based step tracking is lost on page refresh or tab close. Convex state is durable.
