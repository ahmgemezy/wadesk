# Convex API Contracts: Multi-Tenant Onboarding

## convex/onboarding.ts — new module

### `onboarding.getState` (query)

```ts
args: {}
returns: Doc<"onboardingState"> | null
```

Returns the onboarding state for the caller's tenant (from `getCallerIdentity`). Returns `null` if not yet created.
Roles: all authenticated (called before role is established)

---

### `onboarding.ensureCreated` (mutation)

```ts
args: {}
returns: Id<"onboardingState">
```

Idempotent. If an `onboardingState` for this tenant already exists, returns its `_id` without modification. If not, creates one with `completedSteps: ["workspace_named"]` (org exists since user has an orgId at call time).

Roles: org:admin only (agents should never trigger this)

---

### `onboarding.markStep` (mutation)

```ts
args: {
  step: v.union(
    v.literal("workspace_named"),
    v.literal("whatsapp_connected"),
    v.literal("team_invited_or_skipped"),
    v.literal("onboarding_complete"),
  )
}
returns: null
```

Appends `step` to `completedSteps` if not already present. If step is `"onboarding_complete"`, also sets `completedAt: Date.now()`.

Roles: org:admin (enforced via `assertAdmin` from `convex/lib/auth.ts`)

---

## UI Component Contracts

### `<OnboardingWizard locale="ar" | "en" />`

Client component. Reads `onboardingState` via `useQuery(api.onboarding.getState)`. Derives `currentStep` from `completedSteps`. Renders the appropriate step component.

Props:
```ts
{ locale: "ar" | "en" }
```

Step routing:
- `completedSteps` is empty OR doesn't include `workspace_named` → show Step 2 (CreateOrganization)
- includes `workspace_named` but not `whatsapp_connected` → show Step 3 (Connect WhatsApp)
- includes `whatsapp_connected` but not `team_invited_or_skipped` → show Step 4 (Invite Team)
- includes `team_invited_or_skipped` but not `onboarding_complete` → show Step 5 (Complete)
- includes `onboarding_complete` → `router.replace("/inbox")`

---

### `<StepProgress steps={...} currentStep={...} locale="ar" | "en" />`

Displays a horizontal (or vertical on mobile) progress bar with step names.

Steps config (rendered in Arabic when `locale === "ar"`):
```ts
[
  { key: "workspace_named",          ar: "اسم العمل",         en: "Workspace" },
  { key: "whatsapp_connected",       ar: "ربط واتساب",        en: "Connect WhatsApp" },
  { key: "team_invited_or_skipped",  ar: "دعوة الفريق",       en: "Invite Team" },
  { key: "onboarding_complete",      ar: "جاهز!",             en: "You're ready!" },
]
```

RTL: steps flow right-to-left when `locale === "ar"`. Progress line fills from right.

---

### `<StepWorkspaceName />`

Renders Clerk `<CreateOrganization afterCreateOrganizationUrl="/onboarding" />`.
Calls `onboarding.ensureCreated` on mount if `orgId` is present (handles the post-creation return).

---

### `<StepConnectWhatsApp onComplete={() => void} />`

Wraps the existing Embedded Signup component (from feature 003). On successful channel creation, calls `onboarding.markStep("whatsapp_connected")` then calls `onComplete()`.

Error state: shows retry button, does not advance step.

---

### `<StepInviteTeam onComplete={() => void} onSkip={() => void} />`

Shows email input + "Send Invite" button. On success OR on "Skip for now" click, calls `onboarding.markStep("team_invited_or_skipped")` then calls `onComplete()`.

Uses existing `inviteLinks` Convex functions from feature 002.

---

### `<StepComplete />`

Success screen with Arabic copy:
> "🎉 مبروك! صندوق الرسائل جاهز. ابعت رسالة واتساب على [رقمك] وشوفها هنا!"

Button: "افتح صندوق الرسائل" / "Open Inbox" — calls `onboarding.markStep("onboarding_complete")` then `router.replace("/inbox")`.
