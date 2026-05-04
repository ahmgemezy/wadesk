# Notification Prefs — Stage 3: UI Data Contract + React Hooks

> Implementer: GLM 5.1.
> Reviewer: Claude Code.
> Approver: Ahmed.
>
> Apply Stage 3 AFTER Stages 1 and 2 are landed and `npx tsc --noEmit` is clean.
> Stage 3's output is a hook + a labels file + an updated route wrapper.
> Stages 4–5 build on Stage 3's data contract.

---

## Pre-flight checklist

Files Stage 3 touches — verify existence and line counts **before applying**:

| File | Expected state at apply time | Action |
| --- | --- | --- |
| `convex/lib/notificationEvents.ts` | ~60 lines (created by Stage 1 § 2) | **Must exist.** If missing, STOP — Stage 1 not applied. |
| `convex/notifications.ts` | ~290 lines (Stage 1 + Stage 2 additions) | Verify `getPreferences` and `updatePreference` are exported. |
| `convex/lib/tenants.ts` | ~210 lines (Stage 1 § 4 added `readPlan`) | Read-only; Stage 3 does not touch it. |
| `app/(dashboard)/settings/notifications/page.tsx` | 9 lines (current) | **MODIFIED** by Stage 3. |
| `lib/notifications/eventLabels.ts` | Does not exist | **CREATED** by Stage 3. |
| `hooks/use-notification-preferences.ts` | Does not exist | **CREATED** by Stage 3. |
| `components/settings/notifications-tab-shell.tsx` | Does not exist | **CREATED** by Stage 3 (skeleton; Stage 4 fills preferences panel). |

> ⚠️ **CRITICAL — Stage 1 not applied as of 2026-05-04:** `convex/lib/notificationEvents.ts`
> does NOT exist in the working tree. `convex/notifications.ts` is at 175 lines and does NOT
> contain `getPreferences`, `updatePreference`, or `notifyDispatch`. Do NOT apply Stage 3 until
> Stage 1 and Stage 2 are fully landed and `npx tsc --noEmit` is clean.

**Naming convention for hooks:** kebab-case — confirmed by listing `hooks/`:
`use-member-profile.ts`, `use-mobile.ts`, `use-presence.ts`.
Hook file → `hooks/use-notification-preferences.ts`.

**Toast library:** `sonner`. Confirmed via grep across 10+ settings components including
`notifications-settings.tsx` and `csat-settings.tsx`: `import { toast } from "sonner"`.

**Import path alias:** `@/*` → `./*` (confirmed via `tsconfig.json`).
`@/convex/lib/notificationEvents` resolves to `./convex/lib/notificationEvents.ts`.
`tsconfig.json` has `"exclude": ["convex"]` — convex files are not auto-discovered, but
explicit imports compile correctly. No existing codebase precedent for a frontend file importing
from `convex/lib/*.ts` directly (existing files only use `@/convex/_generated/api` and
`@/convex/_generated/dataModel`). See Risk Flag 1.

**`withOptimisticUpdate`:** confirmed working pattern at `components/inbox/message-input.tsx:88`.
Pattern verified — not fabricated from training data. See § 2d.

**Tabs component:** `components/ui/tabs.tsx` wraps `@base-ui/react/tabs` (NOT Radix UI).
Controlled-tab pattern (`value` + `onValueChange`) confirmed at `components/inbox/transfer-dialog.tsx:41`.

---

## Section 1 — Event labels (Task A)

### 1a — File location decision

**Decision: A1** — `lib/notifications/eventLabels.ts`.

Justification (cited from codebase):
- `tsconfig.json` `"exclude": ["convex"]` means convex files are not auto-included in the
  Next.js compilation graph. No existing frontend file imports from `convex/lib/*.ts` directly
  (verified via grep — zero results).
- String tables (UI labels) are a frontend-only concern. Placing them in `convex/lib/` couples
  UI locale strings to the Convex runtime module.
- A2 (extending `notificationEvents.ts` itself) is rejected: it mixes UI-layer data into a
  backend module and violates the convention that `convex/` files should be pure backend.

The only import from `convex/lib/` in Stage 3 is `import type { ToggleableEventType }` — a
type-only import erased at compile time. Zero runtime bundle risk.

### 1b — Full file body

New file: `lib/notifications/eventLabels.ts`

```ts
import type { ToggleableEventType } from "@/convex/lib/notificationEvents";

/**
 * Human-readable labels for each toggleable notification event type.
 * Consumed by NotificationsPreferences UI (Stage 4).
 *
 * The ToggleableEventType import is type-only — zero runtime bundle from the
 * Convex module. If TypeScript cannot resolve @/convex/lib/notificationEvents,
 * Stage 1 has not been applied.
 */
export const EVENT_LABELS: Record<
  ToggleableEventType,
  { en: string; ar: string; descriptionEn: string; descriptionAr: string }
> = {
  sla_breach: {
    en: "SLA breach",
    ar: "تجاوز اتفاقية مستوى الخدمة",
    descriptionEn: "Alert when an open conversation exceeds your SLA threshold.",
    descriptionAr: "تنبيه عند تجاوز محادثة مفتوحة عتبة اتفاقية مستوى الخدمة.",
  },
  followup_due: {
    en: "Follow-up due",
    ar: "متابعة مستحقة",
    descriptionEn: "Alert when a scheduled follow-up is sent or fails.",
    descriptionAr: "تنبيه عند إرسال متابعة مجدولة أو فشلها.",
  },
  conversation_transferred: {
    en: "Conversation transferred",
    ar: "محادثة محولة",
    descriptionEn: "Alert when a conversation is transferred to your department.",
    descriptionAr: "تنبيه عند تحويل محادثة إلى قسمك.",
  },
  conversation_assigned: {
    en: "Conversation assigned",
    ar: "محادثة معيّنة",
    descriptionEn: "Alert when a conversation is assigned to you.",
    descriptionAr: "تنبيه عند تعيين محادثة لك.",
  },
  conversation_reopened: {
    en: "Conversation reopened",
    ar: "محادثة أُعيد فتحها",
    descriptionEn: "Alert when a customer replies to a resolved conversation.",
    descriptionAr: "تنبيه عندما يرد عميل على محادثة تم إغلاقها.",
  },
  csat_received: {
    en: "CSAT received",
    ar: "تقييم رضا العملاء وصل",
    descriptionEn: "Alert when a customer submits a satisfaction rating.",
    descriptionAr: "تنبيه عند إرسال عميل تقييم الرضا.",
  },
  channel_expiring_soon: {
    en: "Channel expiring soon",
    ar: "القناة على وشك الانتهاء",
    descriptionEn: "Alert when your WhatsApp channel nears the 30-day retention limit.",
    descriptionAr: "تنبيه عندما تقترب قناة واتساب من حد الاحتفاظ البالغ 30 يوماً.",
  },
};
```

### 1c — Anti-instructions

- **DO NOT** add entries for `agent_welcome`, `channel_token_expired`, `billing_*`,
  `template_*`, or `new_assignment` — those are transactional events excluded from
  `TOGGLEABLE_EVENT_TYPES` in `convex/lib/notificationEvents.ts`.
- **DO NOT** place this file in `convex/lib/notificationEvents.ts` (A2 rejected, see 1a).
- **DO NOT** add `route`, `href`, or `icon` fields — routing and iconography are Stage 4 concerns.
- **DO NOT** call `useT()` inside this file — it is a static data module, not a component.
  Stage 4 selects `label.en` or `label.ar` based on the locale returned by `useT()`.
- **DO NOT** use `as const` on the object — the `Record<ToggleableEventType, ...>` type
  constraint already enforces exhaustiveness.

---

## Section 2 — `useNotificationPreferences` hook (Task B)

### 2a — File location and naming

**Path:** `hooks/use-notification-preferences.ts`

Convention: existing hooks use **kebab-case** file names (`use-member-profile.ts`,
`use-mobile.ts`, `use-presence.ts`). Camel-case would be a violation.

### 2b — Type signatures

```ts
type PreferenceRow = {
  eventType: ToggleableEventType;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  isPlanGated: boolean;   // true for sla_breach / csat_received on free or starter plans
  isEmailGated: boolean;  // true for ALL events when plan === "free"
};

type UseNotificationPreferencesReturn = {
  preferences: PreferenceRow[] | undefined;  // undefined while either query is loading
  plan: Plan | undefined;                    // undefined while loading
  isLoading: boolean;                        // true until BOTH rawPreferences and plan arrive
  isError: boolean;                          // always false — see Risk Flag 2
  errorMessage: string | undefined;          // always undefined — see Risk Flag 2
  updatePreference: (
    eventType: ToggleableEventType,
    inAppEnabled: boolean,
    emailEnabled: boolean,
  ) => Promise<void>;
};
```

`preferences` is `undefined` until **both** `rawPreferences` and `plan` are loaded. Rendering
toggle rows without knowing the plan would cause Growth+-only toggles to flash from ungated to
gated. Hold both signals before rendering.

### 2c — Full hook body

New file: `hooks/use-notification-preferences.ts`

```ts
"use client";

import { useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  GROWTH_PLUS_ONLY_EVENTS,
  type ToggleableEventType,
} from "@/convex/lib/notificationEvents";
import { useT } from "@/lib/i18n/context";
import type { Plan } from "@/convex/lib/planLimits";

type PreferenceRow = {
  eventType: ToggleableEventType;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  isPlanGated: boolean;
  isEmailGated: boolean;
};

type UseNotificationPreferencesReturn = {
  preferences: PreferenceRow[] | undefined;
  plan: Plan | undefined;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | undefined;
  updatePreference: (
    eventType: ToggleableEventType,
    inAppEnabled: boolean,
    emailEnabled: boolean,
  ) => Promise<void>;
};

export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const t = useT();

  const rawPreferences = useQuery(api.notifications.getPreferences);
  const plan = useQuery(api.lib.tenants.getCurrentPlan);

  const updatePrefMutation = useMutation(
    api.notifications.updatePreference,
  ).withOptimisticUpdate((localStore, args) => {
    const existing = localStore.getQuery(api.notifications.getPreferences, {});
    if (existing === undefined) return;
    const updated = existing.map((row) =>
      row.eventType === args.eventType
        ? {
            ...row,
            inAppEnabled: args.inAppEnabled,
            emailEnabled: args.emailEnabled,
          }
        : row,
    );
    localStore.setQuery(api.notifications.getPreferences, {}, updated);
  });

  const computedPreferences = useMemo<PreferenceRow[] | undefined>(() => {
    if (rawPreferences === undefined || plan === undefined) return undefined;
    return rawPreferences.map((row) => ({
      ...row,
      isPlanGated:
        GROWTH_PLUS_ONLY_EVENTS.has(row.eventType) &&
        (plan === "free" || plan === "starter"),
      isEmailGated: plan === "free",
    }));
  }, [rawPreferences, plan]);

  const updatePreference = useCallback(
    async (
      eventType: ToggleableEventType,
      inAppEnabled: boolean,
      emailEnabled: boolean,
    ): Promise<void> => {
      try {
        await updatePrefMutation({ eventType, inAppEnabled, emailEnabled });
      } catch (err) {
        toast.error(
          t(
            "Failed to update preference. Please try again.",
            "تعذّر تحديث التفضيل. حاول مجدداً.",
          ),
        );
        throw err;
      }
    },
    [updatePrefMutation, t],
  );

  return {
    preferences: computedPreferences,
    plan,
    isLoading: rawPreferences === undefined || plan === undefined,
    isError: false,
    errorMessage: undefined,
    updatePreference,
  };
}
```

### 2d — Optimistic update verification

**Source:** `components/inbox/message-input.tsx:88-118` — existing codebase call site, verified
by direct file read. Pattern is **not** fabricated from training data.

The confirmed pattern from that file:
```ts
const sendMessage = useMutation(api.inbox.sendMessage).withOptimisticUpdate(
  (localStore, args) => {
    const existing = localStore.getQuery(api.inbox.getMessages, {
      conversationId: args.conversationId,
    });
    if (existing !== undefined) {
      localStore.setQuery(api.inbox.getMessages, { conversationId: args.conversationId }, [
        ...existing,
        { /* optimistic row */ },
      ]);
    }
  },
);
```

Key differences for our hook:
- `getPreferences` has `args: {}` — pass `{}` as the second argument to both `getQuery` and
  `setQuery`. Passing any other value will miss the cache entry.
- The guard is inverted to early-exit style: `if (existing === undefined) return;` rather than
  `if (existing !== undefined) { ... }`. Same semantics, cleaner nesting.
- `getPreferences` returns a plain object array (not Convex documents with `_id`/`_creationTime`),
  so the mapped `updated` array has the exact same TypeScript shape as the query result. No cast needed.

Rollback: Convex automatically reverts optimistic updates when the mutation rejects. The
`throw err` in `updatePreference`'s catch block is necessary to:
1. Signal the rejection to Convex's optimistic update queue (triggers automatic revert).
2. Allow the consumer component to detect failure if it `await`s `updatePreference`.

### 2e — Anti-instructions

- **DO NOT** make `updatePreference` synchronous — it must `await` the mutation so the
  rejection path propagates correctly for optimistic rollback.
- **DO NOT** add debounce or batching — per-toggle immediate save is a locked decision (α).
- **DO NOT** add a `resetAll` or `bulkUpdate` path — single-event upsert only (Stage 1 § 6).
- **DO NOT** wrap `useQuery` calls in try/catch — Convex `useQuery` throws errors via React's
  throw mechanism, not via return values. Use an Error Boundary at the component level (§ 4b).
- **DO NOT** return `null` for error state — return `undefined` for loading and keep
  `isError: false` always. Stage 4 handles query errors via Error Boundary.
- **DO NOT** compute `isPlanGated` / `isEmailGated` inside the UI component — always consume
  them from the hook's returned `PreferenceRow`. The hook is the single source of truth.
- **DO NOT** import `TOGGLEABLE_EVENT_TYPES` array directly into the hook — it is not needed.
  `getPreferences` always returns all 7 rows (with defaults filled server-side).
- **DO NOT** pass `"skip"` to either `useQuery` call — the user is always authenticated when
  viewing `/settings/notifications` (Clerk middleware guards the route).

---

## Section 3 — Route + page wrapper (Task C)

### 3a — Route diagram

```
app/(dashboard)/settings/notifications/page.tsx
  ↳ MODIFIED (Stage 3) — removes direct NotificationsSettings import
  ↳ Wraps <NotificationsTabShell /> in <Suspense> (required by useSearchParams in Next.js 15)

components/settings/notifications-tab-shell.tsx
  ↳ NEW (Stage 3) — "use client"; reads ?tab query param; syncs URL ↔ active tab
  ↳ Tab "log" (default): renders <NotificationsSettings /> (unchanged existing component)
  ↳ Tab "preferences": placeholder div — Stage 4 replaces with <NotificationsPreferences />
  ↳ Responsibility: URL state ↔ tab sync ONLY; no data fetching here

components/settings/notifications-settings.tsx
  ↳ UNCHANGED — existing log component; no modifications in Stage 3

components/settings/notifications-preferences.tsx
  ↳ NOT CREATED in Stage 3 — Stage 4 creates this file
  ↳ Stage 4 imports useNotificationPreferences from hooks/use-notification-preferences.ts

hooks/use-notification-preferences.ts
  ↳ NEW (Stage 3) — data contract for Stage 4

lib/notifications/eventLabels.ts
  ↳ NEW (Stage 3) — static label table for Stage 4
```

**Tab structure (Ahmed's confirmed preference: γ — tabbed page):**
- Default tab: `"log"` — preserves existing behavior; the bell icon deep-link
  (`/settings/notifications`) lands on the log by default.
- Second tab: `"preferences"` — new UI (Stage 4).
- URL deep-link: `?tab=preferences` opens the Preferences tab directly.
- Navigating to the `"log"` tab removes `?tab` from the URL (clean URL for default state).

### 3b — Updated page.tsx wrapper (literal new content)

File: `app/(dashboard)/settings/notifications/page.tsx`

**BEFORE** (9 lines — current state as read 2026-05-04):
```tsx
import { NotificationsSettings } from "@/components/settings/notifications-settings";

export default function NotificationsSettingsPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <NotificationsSettings />
    </div>
  );
}
```

**AFTER** (replace entire file):
```tsx
import { Suspense } from "react";
import { NotificationsTabShell } from "@/components/settings/notifications-tab-shell";

export default function NotificationsSettingsPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Suspense fallback={<div className="h-96 rounded-lg bg-muted animate-pulse" />}>
        <NotificationsTabShell />
      </Suspense>
    </div>
  );
}
```

The `<Suspense>` wrapper is **required**. `NotificationsTabShell` calls `useSearchParams()` from
`next/navigation`, which suspends during SSR in Next.js 15. Omitting the boundary causes a
hydration error at runtime.

### 3c — Tab shell component skeleton (Stage 4 fills the preferences body)

New file: `components/settings/notifications-tab-shell.tsx`

```tsx
"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NotificationsSettings } from "@/components/settings/notifications-settings";
import { useT } from "@/lib/i18n/context";

// Stage 4 will add this import after creating the file:
// import { NotificationsPreferences } from "@/components/settings/notifications-preferences";

const VALID_TABS = ["log", "preferences"] as const;
type TabValue = (typeof VALID_TABS)[number];

function isValidTab(v: string | null): v is TabValue {
  return v !== null && (VALID_TABS as readonly string[]).includes(v);
}

export function NotificationsTabShell() {
  const t = useT();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tabParam = searchParams.get("tab");
  const activeTab: TabValue = isValidTab(tabParam) ? tabParam : "log";

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "log") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="log">
          {t("Notification Log", "سجل الإشعارات")}
        </TabsTrigger>
        <TabsTrigger value="preferences">
          {t("Preferences", "التفضيلات")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="log" className="mt-4">
        <NotificationsSettings />
      </TabsContent>
      <TabsContent value="preferences" className="mt-4">
        {/* Stage 4: uncomment import above and replace this div with <NotificationsPreferences /> */}
        <div className="h-64 rounded-lg bg-muted animate-pulse" />
      </TabsContent>
    </Tabs>
  );
}
```

`Tabs` / `TabsTrigger` / `TabsContent` API confirmed from `components/ui/tabs.tsx` (wraps
`@base-ui/react/tabs`). The `value` + `onValueChange` controlled-tab pattern is confirmed at
`components/inbox/transfer-dialog.tsx:41`.

### 3d — Anti-instructions

- **DO NOT** remove the `<Suspense>` wrapper from `page.tsx` — `useSearchParams()` requires it
  in Next.js 15 (produces a hydration error at runtime if omitted).
- **DO NOT** pass `searchParams` as a prop from the RSC page — the tab shell reads them
  client-side via `useSearchParams()` (matches codebase pattern for client-component URL state).
- **DO NOT** create `components/settings/notifications-preferences.tsx` in Stage 3 — that is
  Stage 4. The placeholder `<div>` in the preferences panel is intentional scaffolding.
- **DO NOT** uncomment the `NotificationsPreferences` import in Stage 3 — the file doesn't exist
  yet; TypeScript will error.
- **DO NOT** modify `components/settings/notifications-settings.tsx` — zero changes in Stage 3.
- **DO NOT** add a `key` prop to force remounting on tab change — components manage their own
  subscriptions.
- **DO NOT** use `useRouter().push` instead of `replace` — push adds history entries on every
  tab click, bloating the back-stack. `replace` is the correct call for URL-sync state.

---

## Section 4 — Loading and empty states (Task D)

### 4a — Skeleton row JSX

Stage 4 copies these primitives verbatim. Import `Skeleton` from `@/components/ui/skeleton`.

```tsx
import { Skeleton } from "@/components/ui/skeleton";

// Single preference row skeleton — mirrors the 2-toggle (In-app / Email) layout Stage 4 renders.
function PreferenceRowSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-56" />
      </div>
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center gap-1">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-5 w-9 rounded-full" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-5 w-9 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Full skeleton — 7 rows = one per TOGGLEABLE_EVENT_TYPE.
export function PreferencesLoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 7 }).map((_, i) => (
        <PreferenceRowSkeleton key={i} />
      ))}
    </div>
  );
}
```

### 4b — All states

**State 1 — Initial load (`rawPreferences === undefined` OR `plan === undefined`):**
- `isLoading === true`, `preferences === undefined`.
- **Render:** `<PreferencesLoadingSkeleton />` (7 skeleton rows).

**State 2 — One query resolved, other still loading:**
- The hook holds both signals: `computedPreferences` returns `undefined` until BOTH arrive.
  `isLoading === true` still. **Same render as State 1.**
- **Why not partial render:** showing toggle rows without a confirmed plan means Growth+-only
  toggles (sla_breach, csat_received) could flash from enabled → disabled when plan arrives.
  Hold both signals before rendering any real row.

**State 3 — Both loaded, all 7 rows present:**
- `isLoading === false`, `preferences.length === 7`.
- **Render:** 7 toggle rows. An empty state (0 rows) is **structurally impossible** — the
  `getPreferences` query always fills in defaults for all 7 event types when no row exists.
  Do not add an empty-state branch.

**State 4 — Query error (Convex `useQuery` throws):**
- `useQuery` propagates errors by throwing, not by returning an error value. The hook's
  `isError` field is always `false`. The error surfaces at the component boundary.
- **Stage 4 must wrap `<NotificationsPreferences />` in a React Error Boundary.**
- Error boundary fallback JSX (Stage 4 implements this):

```tsx
function PreferencesErrorFallback({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive space-y-2">
      <p>
        {t(
          "Failed to load notification preferences.",
          "تعذّر تحميل تفضيلات الإشعارات.",
        )}
      </p>
      <button className="underline" onClick={onRetry}>
        {t("Retry", "إعادة المحاولة")}
      </button>
    </div>
  );
}
// onRetry = () => window.location.reload()
```

**State 5 — Plan query error (degrade to `"free"`):**
- If `getCurrentPlan` throws, Convex propagates via the same throw mechanism.
- The Error Boundary catches both query errors together (same boundary).
- **Degraded display:** never partially render with an unknown plan. The Error Boundary's
  fallback (State 4's JSX) applies to plan errors too. Conservative but correct.

---

## Section 5 — Test plan (Task E)

Four testable concerns for a future test pass (no test code in Stage 3):

1. **Optimistic update applies before mutation completes:** calling `updatePreference("followup_due", false, false)` must immediately update the query cache entry for `getPreferences` (the toggle reflects `false` before the server responds). Verify by spying on `localStore.setQuery` during the `withOptimisticUpdate` callback or using Convex's test utilities to inspect the local store.

2. **Optimistic update rolls back on mutation error:** when the server rejects `updatePreference` (e.g., mock it to throw `ConvexError("UNAUTHORIZED")`), the toggle state must revert to its pre-call value and `toast.error` must have been called once. Verify the query cache is restored to the pre-mutation value.

3. **`isPlanGated` is `true` for `sla_breach` when plan is `"free"`:** `GROWTH_PLUS_ONLY_EVENTS.has("sla_breach")` returns `true`, `plan === "free"` → the `sla_breach` entry in `computedPreferences` must have `isPlanGated === true`. Verify by rendering the hook with a mocked `getCurrentPlan` returning `"free"`.

4. **`isEmailGated` is `true` for all 7 events when plan is `"free"`:** regardless of event type, when `plan === "free"`, every row in `preferences` must have `isEmailGated === true`. Verify by mapping `preferences.every(r => r.isEmailGated)` with a mocked `"free"` plan.

---

## Verification — what GLM must paste back after Stage 3 application

1. **Literal `npx tsc --noEmit` output** — paste stdout/stderr exactly. Must be empty with exit 0. Do NOT paraphrase or write "no errors."
2. **Actual diff applied** — `git diff` for all 4 file paths:
   - `app/(dashboard)/settings/notifications/page.tsx`
   - `lib/notifications/eventLabels.ts` (new)
   - `hooks/use-notification-preferences.ts` (new)
   - `components/settings/notifications-tab-shell.tsx` (new)
3. **Plain-text confirmation:** "Stage 3 anti-instructions: confirmed none violated."

---

## Stage 3 — completion criteria

- New file: `lib/notifications/eventLabels.ts` — 7 entries, one per `ToggleableEventType` from Stage 1's `notificationEvents.ts`.
- New file: `hooks/use-notification-preferences.ts` — exports `useNotificationPreferences`.
- Modified: `app/(dashboard)/settings/notifications/page.tsx` — new wrapper with `<Suspense>` around `<NotificationsTabShell />`.
- New file: `components/settings/notifications-tab-shell.tsx` — placeholder for Stage 4's preferences panel.
- `npx tsc --noEmit` clean (empty stdout, exit 0).
- `components/settings/notifications-settings.tsx` — **zero changes**.
- No new Convex functions, schema changes, env vars, or package.json additions.
- No `PROGRESS.md` / `CLAUDE.md` / `PROJECT_STATE.md` / `AUDIT_REPORT.md` edits.
- Stage 4 has everything it needs: the hook exports the data contract, the label table is ready, and the tab shell has a placeholder div to replace.

---

## Stage 3 — risk flags

1. **Frontend imports from `@/convex/lib/`** — `eventLabels.ts` uses `import type { ToggleableEventType }` and the hook imports `GROWTH_PLUS_ONLY_EVENTS` and `Plan` from `convex/lib/` files. No prior codebase precedent. `tsconfig.json` excludes `convex/` from auto-discovery but explicit imports still compile. `GROWTH_PLUS_ONLY_EVENTS` is a plain `Set` (browser-safe); `Plan` is a `type` import (erased). Risk: if a future change adds a Node.js-only dependency (e.g., Clerk Node SDK) to `notificationEvents.ts` or `planLimits.ts`, the frontend bundle breaks. Mitigation: Stage 1 § 2's anti-instructions already prohibit adding non-pure-data imports to `notificationEvents.ts`.

2. **`isError` is always `false`** — Convex `useQuery` does not return error values; errors propagate via React's throw mechanism and are caught by Error Boundaries. The hook's `isError` and `errorMessage` fields are structural placeholders. If Stage 4 omits an Error Boundary around `<NotificationsPreferences />`, an uncaught query error will crash the entire settings page. Stage 4 must add the Error Boundary.

3. **`api.notifications.getPreferences` and `api.notifications.updatePreference` don't exist until Stage 1 is applied** — `npx tsc --noEmit` will fail with "Property 'getPreferences' does not exist" until Stage 1 lands. Do not apply Stage 3 before Stage 1.

4. **`useSearchParams()` requires `<Suspense>` in Next.js 15** — the `<Suspense>` wrapper in the updated `page.tsx` is mandatory. Removing it produces a Next.js hydration error at runtime: `"useSearchParams() should be wrapped in a suspense boundary"`.

5. **`@base-ui/react/tabs` `onValueChange` type** — confirmed by reading `components/ui/tabs.tsx` (wraps `TabsPrimitive.Root` which accepts `onValueChange?: (value: string) => void`). If the installed version of `@base-ui/react` uses a different prop name or callback signature, inspect `node_modules/@base-ui-components/react/tabs/index.d.ts` and adjust `handleTabChange` accordingly.

6. **Placeholder div in `notifications-tab-shell.tsx`** — the `<div className="h-64 rounded-lg bg-muted animate-pulse" />` in the preferences panel is intentional scaffolding for Stage 4. Stage 4 must both (a) uncomment the `NotificationsPreferences` import and (b) replace the placeholder div. Missing either step leaves the preferences tab broken.

7. **`getPreferences` args shape for localStore** — `getPreferences` has `args: {}`. The `localStore.getQuery` and `localStore.setQuery` calls must pass `{}` as the second argument. Passing any other value (including omitting it) will miss the query cache entry and the optimistic update will silently no-op.

---

*If you disagree with any decision above, explain before complying with Stage 4.*
