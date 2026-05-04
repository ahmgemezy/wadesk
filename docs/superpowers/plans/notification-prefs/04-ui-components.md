# Notification Prefs — Stage 4: UI Components

> Implementer: GLM 5.1.
> Reviewer: Claude Code.
> Approver: Ahmed.
>
> Apply Stage 4 AFTER Stages 1–3 are landed and `npx tsc --noEmit` is clean.
> Stage 4 produces the preferences UI — the surface that consumes the hook
> from Stage 3.
> Stage 5 (templates) and Stage 6 (final integration) follow.

---

## Pre-flight checklist

Verify the following files exist and are at the expected line counts **before applying Stage 4**.
If any file is missing, STOP — the prerequisite stage has not been applied.

| File | Expected state at apply time | Action |
| --- | --- | --- |
| `convex/lib/notificationEvents.ts` | ~60 lines (Stage 1 §2) | **Must exist.** |
| `convex/notifications.ts` | ~290 lines (Stage 1+2 additions) | Must export `getPreferences`, `updatePreference`, `notifyDispatch`. |
| `lib/notifications/eventLabels.ts` | ~35 lines (Stage 3 §1) | **Must exist.** |
| `hooks/use-notification-preferences.ts` | ~65 lines (Stage 3 §2) | **Must exist.** |
| `components/settings/notifications-tab-shell.tsx` | ~45 lines (Stage 3 §3 skeleton) | **Must exist.** Stage 4 replaces its body. |
| `components/settings/notifications-settings.tsx` | 241 lines | Verify with `wc -l`. |
| `app/(dashboard)/settings/notifications/page.tsx` | 14 lines (Stage 3 §3b) | Must already have `<Suspense>` wrapper. |

Confirm all pre-flight files with:

```bash
wc -l \
  convex/lib/notificationEvents.ts \
  lib/notifications/eventLabels.ts \
  hooks/use-notification-preferences.ts \
  components/settings/notifications-tab-shell.tsx \
  components/settings/notifications-settings.tsx \
  app/\(dashboard\)/settings/notifications/page.tsx
```

---

## Library and pattern verification (Stage 0 findings)

The following were confirmed by direct file read during Stage 4 planning — do NOT re-derive:

| Concern | Finding |
| --- | --- |
| Toast import | `import { toast } from "sonner";` — confirmed in 10+ settings components |
| Tabs library | `@base-ui/react/tabs` via `components/ui/tabs.tsx`; controlled with `value` + `onValueChange` |
| Switch props | `checked: boolean`, `onCheckedChange: (checked: boolean) => void`, `disabled: boolean` — confirmed from `csat-settings.tsx:189` |
| Badge `variant` for plan pill | `variant="outline"` with custom Tailwind `className` — matches `csat-settings.tsx` pattern |
| Tooltip | `{ Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }` from `@/components/ui/tooltip`; wraps `@base-ui/react/tooltip` |
| Card components | `Card, CardHeader, CardTitle, CardDescription, CardContent` from `@/components/ui/card` — all exported |
| Label | Standard `<label>` wrapper from `@/components/ui/label` — supports `htmlFor` |
| Separator | `@/components/ui/separator`; default orientation horizontal |
| Skeleton | `@/components/ui/skeleton`; plain `animate-pulse` div |
| Error Boundary | **None exist in the codebase.** Stage 4 introduces the first. Must be a class component. |
| `useT()` signature | `useT(): (en: string, ar: string) => string` — from `@/lib/i18n/context` |
| `TOGGLEABLE_EVENT_TYPES` | Pure `as const` string array — no Node deps — browser-safe to import in client components |

---

## Files Stage 4 touches

| File | Action |
| --- | --- |
| `components/settings/notifications-tab-shell.tsx` | **MODIFIED** — remove placeholder comment + div; add two real imports; wire error boundary + preferences component |
| `components/settings/notifications-preferences.tsx` | **NEW** — main preferences card |
| `components/settings/notifications-preferences-row.tsx` | **NEW** — single event row with two toggles |
| `components/settings/notifications-error-boundary.tsx` | **NEW** — React class Error Boundary |
| `components/settings/notifications-settings.tsx` | **MODIFIED** — import `UserPlus` from lucide; add two badge cases (`conversation_assigned`, `new_assignment`) |
| `app/(dashboard)/settings/notifications/page.tsx` | **VERIFIED ONLY** — Stage 3 already replaced it; Stage 4 confirms it is correct as-is |

**Total: 4 new files + 2 modified files. Anything else in `git status` is a violation.**

---

## Section 1 — Tab shell body (Task A)

### 1a — File location

`components/settings/notifications-tab-shell.tsx`

Stage 3 created this file as a skeleton with a commented-out import and a placeholder `<div>`. Stage 4 fills in the body: removes the comment, adds the two new imports, and replaces the placeholder panel with the error-boundary-wrapped preferences component.

### 1b — Full file body (replace the Stage 3 skeleton entirely)

```tsx
"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NotificationsSettings } from "@/components/settings/notifications-settings";
import { NotificationsPreferences } from "@/components/settings/notifications-preferences";
import { NotificationsErrorBoundary } from "@/components/settings/notifications-error-boundary";
import { useT } from "@/lib/i18n/context";

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
        <NotificationsErrorBoundary>
          <NotificationsPreferences />
        </NotificationsErrorBoundary>
      </TabsContent>
    </Tabs>
  );
}
```

### 1c — Anti-instructions

- **DO NOT** use `localStorage` for tab state — URL (`?tab=`) is the single source of truth.
- **DO NOT** add `key` props to force remount on tab change.
- **DO NOT** add client-side route guards beyond what already exists in the settings layout.
- **DO NOT** add a `<Suspense>` here — `page.tsx` already provides it.
- **DO NOT** wrap the log tab in the error boundary — `NotificationsSettings` does not call queries that can throw at render time.
- **DO NOT** add the `NotificationsErrorBoundary` to the log panel. It wraps preferences only.

---

## Section 2 — Preferences component (Task B)

### 2a — Full file body

New file: `components/settings/notifications-preferences.tsx`

```tsx
"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationsPreferencesRow } from "@/components/settings/notifications-preferences-row";
import { useNotificationPreferences } from "@/hooks/use-notification-preferences";
import { TOGGLEABLE_EVENT_TYPES } from "@/convex/lib/notificationEvents";
import { useT } from "@/lib/i18n/context";

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

function PreferencesLoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 7 }).map((_, i) => (
        <PreferenceRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function NotificationsPreferences() {
  const t = useT();
  const { preferences, plan, isLoading, updatePreference } =
    useNotificationPreferences();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("Notification Preferences", "تفضيلات الإشعارات")}
        </CardTitle>
        <CardDescription>
          {t(
            "Manage how you receive notifications across channels.",
            "إدارة كيفية تلقي الإشعارات عبر القنوات.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <PreferencesLoadingSkeleton />
        ) : preferences === undefined ? null : (
          <>
            {plan === "free" && (
              <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                {t(
                  "Email notifications are available on Starter plans and above. ",
                  "إشعارات البريد الإلكتروني متاحة في باقة Starter وأعلى. ",
                )}
                <Link
                  href="/settings/billing"
                  className="font-medium underline"
                >
                  {t("Upgrade", "ترقية")}
                </Link>
              </div>
            )}
            {TOGGLEABLE_EVENT_TYPES.map((eventType, index) => {
              const pref = preferences.find(
                (p) => p.eventType === eventType,
              );
              if (!pref) return null;
              return (
                <div key={eventType}>
                  <NotificationsPreferencesRow
                    eventType={eventType}
                    inAppEnabled={pref.inAppEnabled}
                    emailEnabled={pref.emailEnabled}
                    isPlanGated={pref.isPlanGated}
                    isEmailGated={pref.isEmailGated}
                    onUpdate={(inApp, email) =>
                      updatePreference(eventType, inApp, email)
                    }
                  />
                  {index < TOGGLEABLE_EVENT_TYPES.length - 1 && (
                    <Separator />
                  )}
                </div>
              );
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

### 2b — Skeleton state JSX (from Stage 3 §4a — copy verbatim)

The `PreferenceRowSkeleton` and `PreferencesLoadingSkeleton` functions above are the exact primitives Stage 3 §4a prescribed. They are private to this file (not exported). Do not move them to a separate file.

### 2c — Free-plan banner JSX

```tsx
{plan === "free" && (
  <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
    {t(
      "Email notifications are available on Starter plans and above. ",
      "إشعارات البريد الإلكتروني متاحة في باقة Starter وأعلى. ",
    )}
    <Link href="/settings/billing" className="font-medium underline">
      {t("Upgrade", "ترقية")}
    </Link>
  </div>
)}
```

The banner renders only when `!isLoading && preferences !== undefined && plan === "free"`. In that branch, `plan` is always defined, so `plan === "free"` is the correct check.

### 2d — Three-way loading guard

The ternary `isLoading ? skeleton : preferences === undefined ? null : rows` is intentional. TypeScript cannot infer that `!isLoading` implies `preferences !== undefined` (the hook's narrowing is implicit). The second branch (`preferences === undefined ? null`) is a structural impossibility at runtime but makes the type checker happy without `!` assertions.

### 2e — Anti-instructions

- **DO NOT** import `EVENT_DEFAULTS` or `GROWTH_PLUS_ONLY_EVENTS` in this file — those are consumed by the hook; the component reads `isPlanGated`/`isEmailGated` from the hook's returned row.
- **DO NOT** add a "Save" button — per-toggle save is a locked decision (α).
- **DO NOT** add an empty-state branch — `getPreferences` always returns all 7 rows (server-side default fill guarantees this).
- **DO NOT** add plan-gating checks inside this component — delegate entirely to `NotificationsPreferencesRow` via `isPlanGated`/`isEmailGated` props.
- **DO NOT** add `"use client"` to `page.tsx` — `NotificationsPreferences` is the boundary; the page stays a Server Component.
- **DO NOT** call `useQuery` or `useMutation` directly in this component — all data goes through `useNotificationPreferences`.
- **DO NOT** iterate over `preferences` array for render order — always iterate over `TOGGLEABLE_EVENT_TYPES` so the UI order matches the canonical definition.

---

## Section 3 — Single row component (Task C)

### 3a — Full file body

New file: `components/settings/notifications-preferences-row.tsx`

```tsx
"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EVENT_LABELS } from "@/lib/notifications/eventLabels";
import { useT } from "@/lib/i18n/context";
import type { ToggleableEventType } from "@/convex/lib/notificationEvents";

type Props = {
  eventType: ToggleableEventType;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  isPlanGated: boolean;
  isEmailGated: boolean;
  onUpdate: (inAppEnabled: boolean, emailEnabled: boolean) => void;
};

export function NotificationsPreferencesRow({
  eventType,
  inAppEnabled,
  emailEnabled,
  isPlanGated,
  isEmailGated,
  onUpdate,
}: Props) {
  const t = useT();
  const label = EVENT_LABELS[eventType];
  const inAppId = `inapp-${eventType}`;
  const emailId = `email-${eventType}`;

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      {/* Label column */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium">
            {t(label.en, label.ar)}
          </span>
          {isPlanGated && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant="outline"
                    className="cursor-help border-primary/30 bg-primary/5 text-[10px] text-primary"
                  >
                    Growth+
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <span>
                    {t(
                      "Available on Growth and above. ",
                      "متاح في باقة Growth وأعلى. ",
                    )}
                  </span>
                  <Link href="/settings/billing" className="underline">
                    {t("Upgrade", "ترقية")}
                  </Link>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t(label.descriptionEn, label.descriptionAr)}
        </p>
      </div>

      {/* Toggle column */}
      <div className="flex shrink-0 items-center gap-6">
        {/* In-app toggle */}
        <div
          className={cn(
            "flex flex-col items-center gap-1",
            isPlanGated && "opacity-50",
          )}
        >
          <Label
            htmlFor={inAppId}
            className="text-xs text-muted-foreground"
          >
            {t("In-app", "داخل التطبيق")}
          </Label>
          <Switch
            id={inAppId}
            checked={inAppEnabled}
            onCheckedChange={(newChecked) =>
              onUpdate(newChecked, emailEnabled)
            }
            disabled={isPlanGated}
          />
        </div>

        {/* Email toggle */}
        <div
          className={cn(
            "flex flex-col items-center gap-1",
            (isPlanGated || isEmailGated) && "opacity-50",
          )}
        >
          <Label
            htmlFor={emailId}
            className="text-xs text-muted-foreground"
          >
            {t("Email", "البريد الإلكتروني")}
          </Label>
          <Switch
            id={emailId}
            checked={emailEnabled}
            onCheckedChange={(newChecked) =>
              onUpdate(inAppEnabled, newChecked)
            }
            disabled={isPlanGated || isEmailGated}
          />
        </div>
      </div>
    </div>
  );
}
```

### 3b — Plan-pill JSX

```tsx
{isPlanGated && (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger>
        <Badge
          variant="outline"
          className="cursor-help border-primary/30 bg-primary/5 text-[10px] text-primary"
        >
          Growth+
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top">
        <span>
          {t("Available on Growth and above. ", "متاح في باقة Growth وأعلى. ")}
        </span>
        <Link href="/settings/billing" className="underline">
          {t("Upgrade", "ترقية")}
        </Link>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)}
```

### 3c — Toggle groups JSX with opacity handling

Label order is **Label above, Switch below** in each column. Because Label comes before Switch in the DOM, `peer-disabled:opacity-70` on Label cannot fire (CSS peer works on later siblings). Instead, apply `opacity-50` on the container `<div>` when disabled:

```tsx
{/* In-app */}
<div className={cn("flex flex-col items-center gap-1", isPlanGated && "opacity-50")}>
  <Label htmlFor={inAppId} className="text-xs text-muted-foreground">
    {t("In-app", "داخل التطبيق")}
  </Label>
  <Switch
    id={inAppId}
    checked={inAppEnabled}
    onCheckedChange={(newChecked) => onUpdate(newChecked, emailEnabled)}
    disabled={isPlanGated}
  />
</div>

{/* Email */}
<div className={cn("flex flex-col items-center gap-1", (isPlanGated || isEmailGated) && "opacity-50")}>
  <Label htmlFor={emailId} className="text-xs text-muted-foreground">
    {t("Email", "البريد الإلكتروني")}
  </Label>
  <Switch
    id={emailId}
    checked={emailEnabled}
    onCheckedChange={(newChecked) => onUpdate(inAppEnabled, newChecked)}
    disabled={isPlanGated || isEmailGated}
  />
</div>
```

The Switch itself has `disabled:opacity-50` in its own styles. The container `opacity-50` additionally fades the Label text.

### 3d — RTL compliance

- `gap-*` utilities are direction-agnostic — no `ms-`/`me-` needed for flex gap.
- `justify-between` on the row correctly places the label area at the text-start and toggles at the text-end in both LTR and RTL (because `flex-row` with `dir="rtl"` reverses the visual order).
- The `min-w-0 flex-1` on the label column prevents text overflow pushing toggles off-screen.
- No `ml-`/`mr-`/`pl-`/`pr-` values used anywhere in this file.

### 3e — Anti-instructions

- **DO NOT** add a 3rd channel column (e.g. SMS) — schema is locked at email + in-app.
- **DO NOT** add `quiet hours`, `digest`, `priority`, or `severity` controls.
- **DO NOT** manage toggle state locally with `useState` — `inAppEnabled`/`emailEnabled` come from the parent via the hook's optimistic update; local state would desync.
- **DO NOT** make `onUpdate` async — the prop type is `void` return. Async bubbles through the hook's `updatePreference` via Promise; the row component doesn't need to await it.
- **DO NOT** call `toast` in this component — error toasting is handled inside `useNotificationPreferences.updatePreference`.
- **DO NOT** use `TooltipTrigger asChild` — the component doesn't accept an `asChild` prop in this codebase's wrapper. The trigger renders as a `<button>` wrapping the `<Badge>` (`<span>`), which is valid HTML.
- **DO NOT** add the tooltip to rows where `isPlanGated === false` — the tooltip renders only when `isPlanGated` is true.

---

## Section 4 — Error Boundary (Task D)

### 4a — Full class component

New file: `components/settings/notifications-error-boundary.tsx`

```tsx
import React from "react";
import { useT } from "@/lib/i18n/context";

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

export class NotificationsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[NotificationsErrorBoundary]", error, info);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <PreferencesErrorFallback onRetry={() => window.location.reload()} />
      );
    }
    return this.props.children;
  }
}
```

Notes:

- `PreferencesErrorFallback` is a functional component (can use hooks). `NotificationsErrorBoundary` is the class that catches errors and renders the fallback. This is the correct pattern: React Error Boundaries must be class components; the fallback can be functional.
- `console.error("[NotificationsErrorBoundary]", ...)` matches the bracketed prefix convention established in the codebase (e.g. `[ECHO_DEDUP]`, `[SET_WAMID]`).
- `window.location.reload()` as the retry action is per Stage 3 §4b's prescription.
- This is the **first** Error Boundary in the codebase. No existing pattern to compare against — no grep results returned for `componentDidCatch` or `ErrorBoundary` in `components/`.

### 4b — Wrapping pattern in tab shell

The boundary wraps the preferences panel only — confirmed in Section 1's tab shell:

```tsx
<TabsContent value="preferences" className="mt-4">
  <NotificationsErrorBoundary>
    <NotificationsPreferences />
  </NotificationsErrorBoundary>
</TabsContent>
```

The log panel (`<NotificationsSettings />`) does NOT get an error boundary.

### 4c — Anti-instructions

- **DO NOT** convert `NotificationsErrorBoundary` to a functional component — React's Error Boundary API requires `componentDidCatch`, which is class-only.
- **DO NOT** use `react-error-boundary` or any third-party library — it is not installed and adding dependencies requires prior discussion (CLAUDE.md §30.3).
- **DO NOT** add the boundary at the route level (i.e., wrapping `<NotificationsTabShell />` in `page.tsx`) — keep it scoped to the preferences panel only.
- **DO NOT** suppress the `console.error` — observability in production requires the log.
- **DO NOT** add `"use client"` to this file — it contains a class component that does not use hooks directly. The file is already client-side by nature of rendering in a Client Component tree.

---

## Section 5 — Bell badge update (Task E)

### 5a — BEFORE block

The two changes are: (1) add `UserPlus` to the lucide import; (2) add the new badge conditionals.

**BEFORE — line 10** (lucide import):

```tsx
import { AlertTriangle, Clock, Trash2, Bell, CheckCheck } from "lucide-react";
```

**BEFORE — lines 181–208** (type-rendering block, inside the `<div className="flex items-center gap-1.5 flex-wrap">` button content):

```tsx
                  {n.type === "sla_breach" && (
                    <span className="inline-flex items-center gap-1 text-amber-600 text-[10px] font-semibold">
                      <AlertTriangle className="size-3" />
                      {t("SLA Breach", "انتهاك SLA")}
                    </span>
                  )}
                  {n.type === "channel_expiring_soon" && (
                    <span className="inline-flex items-center gap-1 text-amber-600 text-[10px] font-semibold">
                      <Clock className="size-3" />
                      {t("Channel Expiring", "رقم سيُحذف")}
                    </span>
                  )}
                  {n.type === "channel_deleted" && (
                    <span className="inline-flex items-center gap-1 text-destructive text-[10px] font-semibold">
                      <Trash2 className="size-3" />
                      {t("Channel Deleted", "تم حذف الرقم")}
                    </span>
                  )}
                  {n.type === "conversation_transferred" && (
                    <span className="inline-flex items-center gap-1 text-blue-600 text-[10px] font-semibold">
                      ↗ {t("New conversation in your dept", "محادثة جديدة في قسمك")}
                    </span>
                  )}
                  {n.type === "conversation_reopened" && (
                    <span className="inline-flex items-center gap-1 text-yellow-700 text-[10px] font-semibold">
                      ↩ {t("Customer replied to resolved", "أعاد العميل المحادثة")}
                    </span>
                  )}
```

### 5b — AFTER block

**AFTER — line 10** (add `UserPlus`):

```tsx
import { AlertTriangle, Clock, Trash2, Bell, CheckCheck, UserPlus } from "lucide-react";
```

**AFTER — same block with two new cases appended after the last existing conditional**:

```tsx
                  {n.type === "sla_breach" && (
                    <span className="inline-flex items-center gap-1 text-amber-600 text-[10px] font-semibold">
                      <AlertTriangle className="size-3" />
                      {t("SLA Breach", "انتهاك SLA")}
                    </span>
                  )}
                  {n.type === "channel_expiring_soon" && (
                    <span className="inline-flex items-center gap-1 text-amber-600 text-[10px] font-semibold">
                      <Clock className="size-3" />
                      {t("Channel Expiring", "رقم سيُحذف")}
                    </span>
                  )}
                  {n.type === "channel_deleted" && (
                    <span className="inline-flex items-center gap-1 text-destructive text-[10px] font-semibold">
                      <Trash2 className="size-3" />
                      {t("Channel Deleted", "تم حذف الرقم")}
                    </span>
                  )}
                  {n.type === "conversation_transferred" && (
                    <span className="inline-flex items-center gap-1 text-blue-600 text-[10px] font-semibold">
                      ↗ {t("New conversation in your dept", "محادثة جديدة في قسمك")}
                    </span>
                  )}
                  {n.type === "conversation_reopened" && (
                    <span className="inline-flex items-center gap-1 text-yellow-700 text-[10px] font-semibold">
                      ↩ {t("Customer replied to resolved", "أعاد العميل المحادثة")}
                    </span>
                  )}
                  {(n.type === "conversation_assigned" ||
                    n.type === "new_assignment") && (
                    <span className="inline-flex items-center gap-1 text-blue-600 text-[10px] font-semibold">
                      <UserPlus className="size-3" />
                      {t("Assigned to you", "تم التعيين لك")}
                    </span>
                  )}
```

**Design rationale:**
- Both `conversation_assigned` (new, Stage 1 Amendment B) and `new_assignment` (pre-existing schema literal) map to the same badge. Pre-existing rows in the `notifications` table that used `new_assignment` previously rendered with no badge (confirmed by grep — neither literal had a case before Stage 4). This change fixes both.
- Blue color matches `conversation_transferred` — same urgency level.
- `UserPlus` icon is semantically correct for an assignment event.

### 5c — Anti-instructions

- **DO NOT** refactor the existing badge conditionals into a switch or lookup object — the task is surgical: add two cases, leave everything else untouched.
- **DO NOT** split `conversation_assigned` and `new_assignment` into two separate badge conditionals — they share identical label and icon; one combined conditional is correct.
- **DO NOT** add a case for `followup_due`, `csat_received`, `sla_breach`, or any other type not already handled — those are separate concerns.
- **DO NOT** change the existing badge conditionals (color, icon, text) — only add the two new ones.
- **DO NOT** change any other part of `notifications-settings.tsx` — this is the only change Stage 4 makes to this file.

---

## Section 6 — Updated page.tsx wrapper (Task F)

Stage 3 §3b prescribed the replacement of `app/(dashboard)/settings/notifications/page.tsx`. The prescribed content is:

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

**Stage 4 verdict: correct as written. No changes needed.**

Verification:
- `<Suspense>` wrapper ✓ — required because `useSearchParams()` in `NotificationsTabShell` suspends during SSR.
- Fallback JSX ✓ — `h-96` height matches the visual weight of the tab shell.
- Import path ✓ — `@/components/settings/notifications-tab-shell` is the correct alias.
- No `"use client"` directive ✓ — this is a Server Component page; the client boundary is at `NotificationsTabShell`.

If `page.tsx` is not yet at 14 lines (i.e., Stage 3 was not applied), GLM must apply Stage 3's page.tsx change as part of Stage 3 before proceeding with Stage 4.

---

## Verification — what GLM must paste back after Stage 4 application

**All four of the following are required. Skipping any one is a rejection trigger.**

1. **Literal `npx tsc --noEmit` output** — paste exactly. Must be empty with exit 0. Do NOT paraphrase or write "no errors." Paste the actual (possibly empty) stdout/stderr.

2. **`npm run build` final line** — paste the terminal output's last 5 lines (sufficient to confirm the Next.js build succeeded).

3. **Actual diff applied** — `git diff --stat` listing all 6 files touched:
   ```
   components/settings/notifications-tab-shell.tsx
   components/settings/notifications-preferences.tsx       (new)
   components/settings/notifications-preferences-row.tsx   (new)
   components/settings/notifications-error-boundary.tsx    (new)
   components/settings/notifications-settings.tsx
   app/(dashboard)/settings/notifications/page.tsx         (if Stage 3 not yet applied)
   ```

4. **Plain-text confirmation**: "Stage 4 anti-instructions: confirmed none violated."

---

## Stage 4 — completion criteria

- New files created: `notifications-preferences.tsx`, `notifications-preferences-row.tsx`, `notifications-error-boundary.tsx`.
- Modified: `notifications-tab-shell.tsx` (Stage 3 skeleton filled in), `notifications-settings.tsx` (badge only).
- `app/(dashboard)/settings/notifications/page.tsx` is at the Stage 3 prescribed 14-line version (either already applied by Stage 3 or applied here).
- `npx tsc --noEmit` clean (empty stdout, exit 0).
- `npm run build` succeeds.
- No new Convex functions, schema changes, env vars, or `package.json` additions.
- No `PROGRESS.md` / `CLAUDE.md` / `PROJECT_STATE.md` / `AUDIT_REPORT.md` edits.
- Stage 5 (email templates) has no dependency on Stage 4 — can be planned in parallel.

---

## Stage 4 — risk flags

1. **`preferences` TypeScript narrowing** — `preferences: PreferenceRow[] | undefined` from the hook. Inside `!isLoading`, TypeScript does not automatically narrow `preferences` to `PreferenceRow[]` because `isLoading` is derived. The three-way ternary (`isLoading ? skeleton : preferences === undefined ? null : rows`) is the correct pattern — avoids `!` assertions and keeps the type checker satisfied. The `preferences === undefined ? null` branch is a structural impossibility at runtime.

2. **`n.type === "conversation_assigned"` requires Stage 1 Amendment B** — `notifications.type` must include the `conversation_assigned` literal before this badge check compiles. If Stage 1 has not been applied, TypeScript will error on the comparison. Stage 4 must be applied after Stage 1.

3. **First Error Boundary in codebase** — No existing pattern to follow (confirmed by grep). The class component pattern in Section 4 is the only valid approach in React without a third-party library. `getDerivedStateFromError` + `componentDidCatch` are both required; omitting either breaks the boundary.

4. **`TooltipTrigger` renders as `<button>`** — The `Badge` is a `<span>` (from `useRender` with `defaultTagName: "span"`). A `<span>` inside a `<button>` is valid HTML. However, `cursor-help` on the Badge signals to users that hover shows more info. The billing link inside `TooltipContent` opens in a portal — it is clickable, but tooltip may close on mouse-leave before the user can navigate. Acceptable for v1.

5. **Label-above-Switch layout breaks `peer-disabled:opacity-70`** — CSS `peer-disabled` only applies to elements that follow the peer in DOM order. Since Label is above Switch in the DOM, the peer class is ineffective. The fix in Section 3c (container `opacity-50` with `cn()`) is intentional — do not attempt to reorder Label/Switch to fix peer styling, as that changes the visual layout.

6. **`TOGGLEABLE_EVENT_TYPES` import in client component** — `@/convex/lib/notificationEvents` is excluded from Next.js's auto-discovery by `tsconfig.json`'s `exclude: ["convex"]`, but explicit imports still compile. The array is a plain `as const` string literal — no Node.js APIs, no Clerk SDK, no side effects. Bundle risk is negligible (7 string literals). This was pre-validated in Stage 3 Risk Flag 1.

7. **Stage 3 skeleton comment block** — The Stage 3 `notifications-tab-shell.tsx` contains a commented-out import line and a `{/* Stage 4: ... */}` comment. Stage 4 removes both. If GLM leaves either behind, TypeScript will still compile (comments are not errors), but the plan's anti-instructions will be violated.

---

*If you disagree with any decision above, explain before complying with Stage 4.*
