# STAGE 2d Phase 2 — Auth Pages Rebuild + Org Components + Accept-Invite

**Planning only — no installs, no source-file modifications. All diffs applied in Stage 3.**

> This document plans the rebuild of 5 auth pages and 2 navigation components, replacing Clerk's hosted UI components with custom HTML driven by `authClient` from `@convex-dev/better-auth@0.12.2`. Visual fidelity to existing Clerk-rendered UI is the constraint; no redesign. Expected deliverable: ~1500–2500 lines of code (7 files: 6 rewrites + 1 new).

---

## §0. Phase 2 Design Philosophy

### What Phase 2 is

Phase 2 rebuilds the user-facing auth surface: 5 pages (`sign-in`, `sign-up`, `select-org`, `accept-invite` NEW, `join`), 1 navigation component (`user-menu`), and 1 onboarding form component (`step-workspace-name`). Every component replaces a Clerk-rendered surface with custom HTML/Tailwind driven by Better Auth's `authClient`.

The visual design (glassmorphism, Apple-blue `#0071E3`, font stack, shadow depth) is **preserved exactly** from current `appearance` props. This is fidelity-matching, not redesign.

**Why now?** After Phase 2, every auth page in WabDesk is owned code — not Clerk-rendered. This is the keystone of the migration's user-facing commitment. Sessions, role management, and org membership still use Better Auth server-side (Stage 2a–2c), but the UI is now transparent.

### What Phase 2 is NOT

- **Not a redesign.** The Apple/glassmorphism aesthetic is preserved via inline styles and Tailwind utilities matching current `appearance` object values.
- **Not a feature expansion.** No passkeys, no magic links, no SMS — only email/password + Google + Facebook (current Clerk auth methods).
- **Not a polish phase.** Loading states, error refinement, accessibility audit — all post-launch iteration. Phase 2 ships "good enough to launch."
- **Not the last word.** Auth pages will be refined as real users surface UX gaps. Per CLAUDE.md §30.1 decision-making is intentional; over-engineering is deferred.

---

## §1. Mandatory Discovery Phase

### §1.1 Existing Files — Verbatim Reads

#### §1.1.1 `app/(auth)/sign-in/[[...sign-in]]/page.tsx` — CURRENT (77 lines)

```typescript
import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WABDesk - Sign In",
};

const appearance = {
  variables: {
    colorPrimary: "#0071E3",
    colorDanger: "#FF3B30",
    colorNeutral: "#6E6E73",
    colorBackground: "#FFFFFF",
    colorText: "#1D1D1F",
    colorTextSecondary: "#6E6E73",
    colorInputBackground: "rgba(0, 0, 0, 0.04)",
    colorInputText: "#1D1D1F",
    borderRadius: "12px",
    fontSize: "15px",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
  },
  elements: {
    card: {
      background: "rgba(255, 255, 255, 0.88)",
      backdropFilter: "blur(24px) saturate(180%)",
      WebkitBackdropFilter: "blur(24px) saturate(180%)",
      border: "1px solid rgba(0, 0, 0, 0.08)",
      borderRadius: "22px",
      boxShadow:
        "0 2px 6px rgba(0,0,0,0.04), 0 10px 30px rgba(0,0,0,0.08), 0 30px 60px rgba(0,0,0,0.06)",
    },
    rootBox: "w-full",
    headerTitle: {
      color: "#1D1D1F",
      fontSize: "22px",
      fontWeight: "600",
      letterSpacing: "-0.4px",
    },
    headerSubtitle: {
      color: "#6E6E73",
      fontSize: "15px",
    },
    formFieldLabel: {
      color: "#1D1D1F",
      fontSize: "13px",
      fontWeight: "500",
    },
    dividerText: { color: "#6E6E73" },
    dividerLine: { backgroundColor: "rgba(0, 0, 0, 0.10)" },
    footerActionText: { color: "#6E6E73" },
    identityPreviewText: { color: "#1D1D1F" },
    badge: {
      backgroundColor: "rgba(0, 0, 0, 0.05)",
      color: "#6E6E73",
      border: "1px solid rgba(0, 0, 0, 0.08)",
    },
    badgeText: { color: "#6E6E73" },
    formButtonPrimary:
      "bg-[#0071E3] hover:bg-[#0077ED] active:bg-[#006CD1] transition-colors font-normal rounded-full text-white",
    footerActionLink: "text-[#0071E3] hover:text-[#0077ED] font-normal",
    socialButtonsBlockButton__google:
      "!bg-black/[0.04] hover:!bg-black/[0.09] active:!bg-black/[0.12] !border !border-black/[0.12] !text-[#1D1D1F] !rounded-xl transition-colors duration-150",
    socialButtonsBlockButtonText__google: { color: "#1D1D1F" },
    socialButtonsBlockButton__facebook:
      "!bg-[#1877F2] hover:!bg-[#166FE5] active:!bg-[#1558D0] !text-white !border-0 !rounded-xl transition-colors duration-150",
    socialButtonsBlockButtonText__facebook: { color: "#ffffff" },
  },
} as const;

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center w-full">
      <SignIn fallbackRedirectUrl="/inbox" signUpUrl="/sign-up" appearance={appearance} />
    </div>
  );
}
```

#### §1.1.2 `app/(auth)/sign-up/[[...sign-up]]/page.tsx` — CURRENT (77 lines)

```typescript
import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WABDesk - Sign Up",
};

const appearance = {
  variables: {
    colorPrimary: "#0071E3",
    colorDanger: "#FF3B30",
    colorNeutral: "#6E6E73",
    colorBackground: "#FFFFFF",
    colorText: "#1D1D1F",
    colorTextSecondary: "#6E6E73",
    colorInputBackground: "rgba(0, 0, 0, 0.04)",
    colorInputText: "#1D1D1F",
    borderRadius: "12px",
    fontSize: "15px",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
  },
  elements: {
    card: {
      background: "rgba(255, 255, 255, 0.88)",
      backdropFilter: "blur(24px) saturate(180%)",
      WebkitBackdropFilter: "blur(24px) saturate(180%)",
      border: "1px solid rgba(0, 0, 0, 0.08)",
      borderRadius: "22px",
      boxShadow:
        "0 2px 6px rgba(0,0,0,0.04), 0 10px 30px rgba(0,0,0,0.08), 0 30px 60px rgba(0,0,0,0.06)",
    },
    rootBox: "w-full",
    headerTitle: {
      color: "#1D1D1F",
      fontSize: "22px",
      fontWeight: "600",
      letterSpacing: "-0.4px",
    },
    headerSubtitle: {
      color: "#6E6E73",
      fontSize: "15px",
    },
    formFieldLabel: {
      color: "#1D1D1F",
      fontSize: "13px",
      fontWeight: "500",
    },
    dividerText: { color: "#6E6E73" },
    dividerLine: { backgroundColor: "rgba(0, 0, 0, 0.10)" },
    footerActionText: { color: "#6E6E73" },
    identityPreviewText: { color: "#1D1D1F" },
    badge: {
      backgroundColor: "rgba(0, 0, 0, 0.05)",
      color: "#6E6E73",
      border: "1px solid rgba(0, 0, 0, 0.08)",
    },
    badgeText: { color: "#6E6E73" },
    formButtonPrimary:
      "bg-[#0071E3] hover:bg-[#0077ED] active:bg-[#006CD1] transition-colors font-normal rounded-full text-white",
    footerActionLink: "text-[#0071E3] hover:text-[#0077ED] font-normal",
    socialButtonsBlockButton__google:
      "!bg-black/[0.04] hover:!bg-black/[0.09] active:!bg-black/[0.12] !border !border-black/[0.12] !text-[#1D1D1F] !rounded-xl transition-colors duration-150",
    socialButtonsBlockButtonText__google: { color: "#1D1D1F" },
    socialButtonsBlockButton__facebook:
      "!bg-[#1877F2] hover:!bg-[#166FE5] active:!bg-[#1558D0] !text-white !border-0 !rounded-xl transition-colors duration-150",
    socialButtonsBlockButtonText__facebook: { color: "#ffffff" },
  },
} as const;

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center w-full">
      <SignUp fallbackRedirectUrl="/onboarding" signInUrl="/sign-in" appearance={appearance} />
    </div>
  );
}
```

#### §1.1.3 `app/select-org/page.tsx` — CURRENT (15 lines)

```typescript
"use client";

import { OrganizationList } from "@clerk/nextjs";

export default function SelectOrgPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <OrganizationList
        hidePersonal
        afterSelectOrganizationUrl="/inbox"
        afterCreateOrganizationUrl="/onboarding"
      />
    </div>
  );
}
```

#### §1.1.4 `app/join/[token]/page.tsx` — CURRENT (101 lines)

```typescript
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SignIn } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const { isLoaded, isSignedIn, orgId } = useAuth();
  const token = params.token as string;

  const validateAndJoin = useAction(api.actions.validateInvite.validateAndJoin);

  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  const handleJoin = async () => {
    setJoining(true);
    setError(null);
    try {
      const result = await validateAndJoin({ token });
      setJoined(true);
      setTimeout(() => router.push("/inbox"), 1500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("INVITE_INVALID")) {
        setError("الدعوة منتهية أو غير صالحة / Invite expired or invalid");
      } else if (msg.includes("PLAN_LIMIT")) {
        setError("تم بلوغ الحد الأقصى لعدد الأعضاء / Plan member limit reached");
      } else if (msg.includes("ALREADY_MEMBER")) {
        router.push("/inbox");
      } else {
        setError(msg);
      }
    } finally {
      setJoining(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <AlertTriangle className="size-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">{error}</h1>
          <p className="text-sm text-muted-foreground">
            تواصل مع المسؤول / Contact your organization admin
          </p>
        </div>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <h1 className="text-xl font-bold">تم الانضمام! / Joined!</h1>
          <p className="text-sm text-muted-foreground">جارٍ التحويل... / Redirecting...</p>
        </div>
      </div>
    );
  }

  if (isLoaded && isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <h1 className="text-xl font-bold">انضم إلى الفريق / Join Team</h1>
          <p className="text-sm text-muted-foreground">
            اضغط للانضمام / Click to join
          </p>
          <Button onClick={handleJoin} disabled={joining} className="w-full">
            {joining ? "جارٍ الانضمام... / Joining..." : "انضمام / Join"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-sm w-full space-y-4">
        <h1 className="text-xl font-bold text-center">
          انضم إلى الفريق / Join the Team
        </h1>
        <p className="text-sm text-muted-foreground text-center">
          سجّل أو سجّل دخولك للانضمام / Sign up or sign in to join
        </p>
        <SignIn />
      </div>
    </div>
  );
}
```

#### §1.1.5 `components/shell/user-menu.tsx` — CURRENT (108 lines)

```typescript
"use client";

import { useState } from "react";
import { SignOutButton, OrganizationSwitcher, useAuth, useUser } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { RoleBadge } from "./role-badge";
import { PresenceIndicator } from "@/components/ui/presence-indicator";
import { MyProfileModal } from "./my-profile-modal";
import type { ResolvedUser } from "@/lib/shell/types";
import { resolveRole } from "@/lib/shell/role-utils";

interface UserMenuProps {
  user: ResolvedUser;
  locale: "ar" | "en";
}

export function UserMenu({ user, locale }: UserMenuProps) {
  const { isSignedIn, userId: currentUserId } = useAuth();
  const { user: liveUser } = useUser();
  const role = resolveRole(user.role);
  const [profileOpen, setProfileOpen] = useState(false);

  // Use live Clerk data for reactive name/avatar after profile edits
  const effectiveName = liveUser?.fullName ?? liveUser?.firstName ?? user.name;
  const effectiveAvatar = liveUser?.imageUrl ?? user.imageUrl;

  if (!isSignedIn) return null;

  return (
    <>
      <MyProfileModal
        open={profileOpen}
        onOpenChange={setProfileOpen}
        clerkUser={user}
      />

      <div className="flex flex-col gap-1 p-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:items-center">
        {/* Avatar + info row — clickable to open profile modal */}
        <button
          onClick={() => setProfileOpen(true)}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-sidebar-accent transition-colors w-full text-start group-data-[collapsible=icon]:hidden"
        >
          {effectiveAvatar ? (
            <img
              src={effectiveAvatar}
              alt={effectiveName}
              className="size-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="size-8 shrink-0 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
              {effectiveName?.slice(0, 2).toUpperCase() ?? "?"}
            </div>
          )}
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium truncate">{effectiveName}</span>
              {currentUserId && <PresenceIndicator userId={currentUserId} />}
              <RoleBadge role={role} locale={locale} />
            </div>
            <span className="text-xs text-muted-foreground truncate">
              {user.orgName}
            </span>
          </div>
        </button>

        {/* Avatar only when sidebar is collapsed — also opens modal */}
        <button
          onClick={() => setProfileOpen(true)}
          className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:py-1"
        >
          {effectiveAvatar ? (
            <img
              src={effectiveAvatar}
              alt={effectiveName}
              className="size-7 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <div className="size-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground ring-1 ring-border">
              {effectiveName?.slice(0, 2).toUpperCase() ?? "?"}
            </div>
          )}
        </button>

        <div className="group-data-[collapsible=icon]:hidden">
          <OrganizationSwitcher
            afterSelectOrganizationUrl="/inbox"
            appearance={{
              elements: {
                rootBox: "w-full",
                organizationSwitcherTrigger:
                  "w-full justify-start rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
              },
            }}
          />
        </div>

        <SignOutButton redirectUrl="/">
          <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:w-full">
            <LogOut className="size-4 shrink-0 rtl:scale-x-[-1]" />
            <span className="group-data-[collapsible=icon]:hidden">
              {locale === "ar" ? "تسجيل الخروج" : "Sign Out"}
            </span>
          </button>
        </SignOutButton>
      </div>
    </>
  );
}
```

#### §1.1.6 `components/onboarding/step-workspace-name.tsx` — CURRENT (28 lines)

```typescript
"use client";

import { useEffect } from "react";
import { CreateOrganization } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function StepWorkspaceName() {
  const { orgId } = useAuth();
  const ensureCreated = useMutation(api.onboarding.ensureCreated);

  useEffect(() => {
    if (orgId) {
      ensureCreated({});
    }
  }, [orgId, ensureCreated]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">سمّي مساحة العمل</h2>
        <p className="text-muted-foreground mt-1">Choose a name for your workspace</p>
      </div>
      <CreateOrganization afterCreateOrganizationUrl="/onboarding" />
    </div>
  );
}
```

#### §1.1.7 `app/accept-invite/[invitationId]/page.tsx` — NEW (does not exist)

Confirmed: this file does not exist in the current codebase. Phase 2 creates it to handle the Better Auth invitation acceptance flow (Stage 2c.2 Path B pattern).

---

### §1.2 Design Tokens — Extracted from `appearance` Props

All tokens are identical across `sign-in/page.tsx` and `sign-up/page.tsx`. Extracted from the `appearance` object:

| Token | Value | Source (line) |
|-------|-------|---------------|
| **Colors** | | |
| Primary | `#0071E3` (Apple blue) | `colorPrimary` (sign-in:10) |
| Primary hover | `#0077ED` | `formButtonPrimary` hover (sign-in:60) |
| Primary active | `#006CD1` | `formButtonPrimary` active (sign-in:60) |
| Primary text | `#FFFFFF` | `formButtonPrimary` text (sign-in:60) |
| Card background | `rgba(255, 255, 255, 0.88)` | `elements.card.background` (sign-in:25) |
| Card border | `rgba(0, 0, 0, 0.08)` | `elements.card.border` (sign-in:28) |
| Divider line | `rgba(0, 0, 0, 0.10)` | `dividerLine.backgroundColor` (sign-in:50) |
| Input background | `rgba(0, 0, 0, 0.04)` | `colorInputBackground` (sign-in:16) |
| Input border (focus) | `#0071E3` (same as primary) | `colorPrimary` (sign-in:10) — Clerk applies this for focus ring |
| Input border (default) | Not set in `appearance` props — Clerk default | Phase 3: verify visually; planned value `rgba(0,0,0,0.10)` to match divider |
| Text primary | `#1D1D1F` | `colorText` (sign-in:14) |
| Text secondary | `#6E6E73` | `colorTextSecondary` (sign-in:15) |
| Error red | `#FF3B30` | `colorDanger` (sign-in:11) |
| Google button background | `rgba(0, 0, 0, 0.04)` | `socialButtonsBlockButton__google` (sign-in:63) |
| Google button hover | `rgba(0, 0, 0, 0.09)` | `socialButtonsBlockButton__google` (sign-in:63) |
| Google button text | `#1D1D1F` | `socialButtonsBlockButtonText__google` (sign-in:64) |
| Facebook button background | `#1877F2` | `socialButtonsBlockButton__facebook` (sign-in:66) |
| Facebook button hover | `#166FE5` | `socialButtonsBlockButton__facebook` (sign-in:66) |
| Facebook button text | `#FFFFFF` | `socialButtonsBlockButtonText__facebook` (sign-in:67) |
| Badge background | `rgba(0, 0, 0, 0.05)` | `badge.backgroundColor` (sign-in:54) |
| **Typography** | | |
| Font family (English) | `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif` | `fontFamily` (sign-in:20) |
| Font family (Arabic) | Not specified in current files; inferred as **Cairo/Tajawal** per CLAUDE.md §4 | CLAUDE.md rule |
| Font size (body) | `15px` | `fontSize` (sign-in:19) |
| Font size (heading) | `22px` | `headerTitle.fontSize` (sign-in:36) |
| Font size (label) | `13px` | `formFieldLabel.fontSize` (sign-in:46) |
| Font weight (heading) | `600` | `headerTitle.fontWeight` (sign-in:37) |
| Font weight (label) | `500` | `formFieldLabel.fontWeight` (sign-in:47) |
| Letter spacing (heading) | `-0.4px` | `headerTitle.letterSpacing` (sign-in:38) |
| **Sizing** | | |
| Card border radius | `22px` | `elements.card.borderRadius` (sign-in:29) |
| Input border radius | `12px` | `borderRadius` (sign-in:18) — applied to form fields |
| Button border radius | `full` (rounded pill) | `formButtonPrimary` (sign-in:60) |
| Card padding | Not set in `appearance` props — Clerk default | Phase 3: verify visually; planned value `2rem` (32px) — adjust during apply |
| Card max width | Not set in `appearance` props — Clerk default | Phase 3: verify visually; planned value `420px` — adjust during apply |
| **Effects** | | |
| Card backdrop blur | `blur(24px)` | `elements.card.backdropFilter` (sign-in:26) |
| Card saturation boost | `saturate(180%)` | `elements.card.backdropFilter` (sign-in:26) |
| Card shadow | `0 2px 6px rgba(0,0,0,0.04), 0 10px 30px rgba(0,0,0,0.08), 0 30px 60px rgba(0,0,0,0.06)` | `elements.card.boxShadow` (sign-in:30) |
| Transition speed | `duration-150` | `socialButtonsBlockButton__google` (sign-in:63) |

---

### §1.3 Per-Page `authClient` Method Requirements

Each page requires specific Better Auth client methods. Assume `authClient` is available from `lib/auth-client.ts` (Stage 2a §5.4):

| Page | Methods Required | Signature (from Better Auth docs) | Notes |
|------|------------------|----------------------------------|-------|
| **sign-in** | `authClient.signIn.email()` | `signIn.email({ email, password, callbackURL? })` | Returns `{ ok: boolean; error?: { code: string; message: string }; data?: SessionData }` |
| | `authClient.signIn.social()` | `signIn.social({ provider: string; callbackURL? })` | provider = "google" \| "facebook" |
| **sign-up** | `authClient.signUp.email()` | `signUp.email({ email, password, name, callbackURL? })` | Returns same shape as signIn |
| | `authClient.signIn.social()` | Same as sign-in | OAuth redirects for new users; auto-creates account |
| **select-org** | `authClient.useListOrganizations()` | React hook returning `{ organizations: Organization[] }` | Also: `useSession()` to verify auth state |
| | `authClient.organization.create()` | `organization.create({ name, slug })` | Returns `Organization \| null` |
| | `authClient.organization.setActive()` | `organization.setActive({ organizationId })` | Sets active org in session; returns success boolean |
| **accept-invite** | `authClient.useSession()` | Hook returning `{ session: Session \| null; status: "loading" \| "authenticated" \| "unauthenticated" }` | Required for auth check |
| | `authClient.organization.getInvitation()` (TBD) | Signature TBD — may not exist; see OQ-2d1 | If exists: fetch invitation details by ID |
| | `authClient.organization.acceptInvitation()` | `organization.acceptInvitation({ invitationId })` | Returns success boolean |
| | `authClient.organization.rejectInvitation()` (TBD) | Signature TBD; may not exist; see OQ-2d2 | If exists: decline an invitation |
| **join** | `authClient.useSession()` (shim via phase 1) | Hook returning session state | Phase 1's shim wraps Better Auth's hook |
| | `useAction()` (Convex) | Existing pattern | Calls `api.actions.validateInvite.validateAndJoin` — unchanged from current |
| **user-menu** | `authClient.signOut()` | `signOut({ callbackURL? })` | Logs out user; redirect via `callbackURL` or returns control |
| | `authClient.useListOrganizations()` | Same as select-org | Render org switcher dropdown |
| | `authClient.organization.setActive()` | Same as select-org | Change active org |
| **step-workspace-name** | `authClient.organization.create()` | Same as select-org | Create workspace during onboarding |

---

### §1.4 Post-Action Redirect Targets

Each form submission maps to a defined success path:

| Action | Success Redirect | Source / Rationale |
|--------|------------------|-------------------|
| Sign-in (existing user) | `/inbox` OR `redirectTo` query param if present | `fallbackRedirectUrl="/inbox"` (sign-in:74); honor `?redirectTo=` for accept-invite flow (D8) |
| Sign-up (new user) | `/onboarding` | `fallbackRedirectUrl="/onboarding"` (sign-up:74) |
| Sign-in before accept-invite | Back to `/accept-invite/[invitationId]` (preserve via redirectTo) | D8 pattern: sign-in?redirectTo=/accept-invite/[id] → sign-in success → redirect to /accept-invite/[id] |
| Select existing org | `/inbox` | `afterSelectOrganizationUrl="/inbox"` (select-org:10) |
| Create new org (select-org) | `/onboarding` | `afterCreateOrganizationUrl="/onboarding"` (select-org:11) |
| Accept invitation | `/inbox` | Standard org-set success → inbox (assume Better Auth auto-sets active org) |
| Reject invitation | `/sign-in` OR `/select-org` if user has other orgs | TBD per discovery; see OQ-2d3 |
| Sign out | `/sign-in` OR `/` | `redirectUrl="/"` (user-menu:97); Phase 2 choice: TBD per OQ-2d4 |
| Create workspace (onboarding) | Next onboarding step (via callback) | `afterCreateOrganizationUrl="/onboarding"` (step-workspace-name:25) |

**D8 Redirect Pattern (locked):** Unauthenticated users visiting `/accept-invite/[id]` redirect to `/sign-in?redirectTo=/accept-invite/[id]`. After successful sign-in via `callbackURL: "/accept-invite/[id]"`, the user lands back on the accept-invite page with session restored, ready to call `acceptInvitation`.

---

### §1.5 Internationalization + RTL Handling

**Verified: `lib/i18n/` directory exists** (`lib/i18n/context.tsx` — confirmed by `ls lib/i18n/`).

#### §1.5.1 Actual i18n system — `lib/i18n/context.tsx` verbatim

```typescript
"use client";
import { createContext, useContext } from "react";
type Locale = "ar" | "en";
const LocaleContext = createContext<Locale>("ar");
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}
export function useLocale(): Locale { return useContext(LocaleContext); }
/** Returns a translation function: t("English text", "النص العربي") */
export function useT() {
  const locale = useLocale();
  return (en: string, ar: string): string => (locale === "en" ? en : ar);
}
export function useTranslatedLabel() { /* … system label translations … */ }
```

**Signatures (verified):**
- `useT()` — call with no args; returns `(en: string, ar: string) => string`
- Call site pattern: `const t = useT(); t("Sign In", "تسجيل الدخول")`
- `useLocale()` — returns `"ar" | "en"`, defaults to `"ar"` (Arabic-first)

#### §1.5.2 Locale detection mechanism

Locale is set **server-side in `app/layout.tsx`**:
```typescript
const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar"; // defaults to "ar"
```

Then passed to `<LocaleProvider locale={locale}>` (app/layout.tsx:61).

#### §1.5.3 LocaleProvider mount point

`LocaleProvider` is in `app/layout.tsx` at line 61, inside the `<body>`, wrapping ALL routes:
```tsx
<ConvexClientProvider>
  <LocaleProvider locale={locale}>       ← wraps EVERYTHING
    <ThemeProvider>{children}</ThemeProvider>
  </LocaleProvider>
</ConvexClientProvider>
```

**Phase 2 pages in `app/(auth)/...` are wrapped by this `LocaleProvider`.** Auth pages can call `useT()` and `useLocale()` freely — the context is available.

#### §1.5.4 Arabic font

`app/layout.tsx` loads **IBM Plex Sans Arabic** (not Cairo/Tajawal) via `next/font/google`:
```typescript
const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
});
```

Applied via `body className={`${inter.variable} ${ibmPlexArabic.variable} antialiased`}`.

All Phase 2 pages use the existing `--font-arabic` / `--font-inter` CSS variable pair — no new font loading needed.

#### §1.5.5 Pattern correction — all Phase 2 pages must use `useT()`

The `"عربي / English"` slash-separated pattern found in `join/[token]/page.tsx:34,92` is **legacy** (pre-`useT()` code that hasn't been updated). It is NOT the current codebase convention.

Phase 2 pages use `useT()` exclusively:
```typescript
// CORRECT (Phase 2 pattern)
const t = useT();
return <h1>{t("Sign In", "تسجيل الدخول")}</h1>;

// WRONG (legacy pattern — do not use in Phase 2)
return <h1>تسجيل الدخول / Sign In</h1>;
```

#### §1.5.6 RTL handling

- `app/layout.tsx` sets `dir={dir}` on `<html>` server-side (dir is `"rtl"` when locale is `"ar"`)
- Directional icons: `rtl:scale-x-[-1]` (existing pattern from user-menu.tsx:99)
- Phone number inputs: `dir="ltr"` inside RTL layout (per CLAUDE.md §4)
- Auth pages do NOT set their own `dir` — they inherit from the root `<html>` tag

**OQ-2d6 (locale detection) — CLOSED.** No longer an open question.

---

### §1.6 OAuth Provider Configuration Verification

**Stage 2a §5.1 planned `convex/auth.ts`** with social provider configuration:

```typescript
// Expected (from Stage 2a planning):
export const auth = betterAuth({
  // ... base config
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    },
  },
});
```

**Status:** `convex/auth.ts` does not exist yet (Stage 2a is planning-only). However, per Stage 2a planning, the env vars `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET` are assumed to be set in `.env.local` before Stage 3 apply.

**Phase 2 pages' responsibility:** Simply call `authClient.signIn.social({ provider: "google" })` and `authClient.signIn.social({ provider: "facebook" })`. No provider config needed at the page level — Better Auth's client library handles routing to the server-side auth handler.

---

### §1.7 Phase 2 Scope Confirmation

**In scope for Phase 2 (7 files):**

1. `app/(auth)/sign-in/[[...sign-in]]/page.tsx` — REWRITE (custom form)
2. `app/(auth)/sign-up/[[...sign-up]]/page.tsx` — REWRITE (custom form)
3. `app/select-org/page.tsx` — REWRITE (minimal `<OrganizationList>` rebuild per D5=B)
4. `app/join/[token]/page.tsx` — REWRITE (`<SignIn>` JSX replacement)
5. `app/accept-invite/[invitationId]/page.tsx` — CREATE (NEW file for invitation flow)
6. `components/shell/user-menu.tsx` — REWRITE (`<SignOutButton>` + `<OrganizationSwitcher>` replacements)
7. `components/onboarding/step-workspace-name.tsx` — REWRITE (`<CreateOrganization>` → custom form)

**NOT in scope for Phase 2 (deferred to Phase 3):**

- `components/convex-client-provider.tsx` — provider swap (`<ConvexProviderWithClerk>` → `<ConvexBetterAuthProvider>`)
- `components/clerk-provider-with-locale.tsx` — DELETE
- `app/(dashboard)/layout.tsx` — `isAuthenticated()` guard
- `lib/shell/role-utils.ts` — Q8 supervisor branch fix
- UI deletion of avatar/ban controls (D2 Option B)
- All 28 files Phase 1 modified (import lines only; bodies untouched)

---

### §1.8 Hook Source Per Phase 2 File

Canonical reference for which hook import each Phase 2 file uses. Established from:
- **OQ-2d7 (CLOSED):** `lib/auth-client.ts` uses `createAuthClient` from `"better-auth/react"` with `convexClient()` + `organizationClient()` plugins — Stage 2a §5.4 (lines 1058–1095)
- **OQ-2d8 (CLOSED):** `lib/auth-hooks.ts` exports `useAuth()`, `useUser()`, `useOrganization()` in Clerk-compatible shape — Phase 1 §2.5 (lines 331–412)

| File | Auth Hook Source | Why |
|------|-----------------|-----|
| `app/(auth)/sign-in/[[...sign-in]]/page.tsx` | **Native** — no session hook needed; uses `authClient.signIn.email()` + `authClient.signIn.social()` | Net-new logic; unauthenticated page; no Clerk legacy |
| `app/(auth)/sign-up/[[...sign-up]]/page.tsx` | **Native** — no session hook needed; uses `authClient.signUp.email()` + `authClient.signIn.social()` | Net-new logic; unauthenticated page; no Clerk legacy |
| `app/select-org/page.tsx` | **Native** — `authClient.useSession()`, `authClient.useListOrganizations()`, `authClient.organization.create()`, `authClient.organization.setActive()` | Full rewrite; no reason to use shim in net-new code |
| `app/accept-invite/[invitationId]/page.tsx` | **Native** — `authClient.useSession()`, `authClient.organization.getInvitation()`, `authClient.organization.acceptInvitation()`, `authClient.organization.rejectInvitation()` | Brand-new file; no Clerk legacy whatsoever |
| `app/join/[token]/page.tsx` | **Shim** — `useAuth()` from `@/lib/auth-hooks` | Phase 1 already changed this import from `@clerk/nextjs`; keep consistent with the 28 other files that use the shim |
| `components/shell/user-menu.tsx` | **Mix** — `useAuth()` + `useUser()` from `@/lib/auth-hooks` for avatar/name/role display; `authClient.signOut()`, `authClient.useListOrganizations()`, `authClient.organization.setActive()` from `@/lib/auth-client` for new behaviors | User-display logic mirrors 28+ other shim call sites; org-switcher and signOut are net-new code using native API |
| `components/onboarding/step-workspace-name.tsx` | **Mix** — `useAuth()` from `@/lib/auth-hooks` for `orgId` check; `authClient.organization.create()` from `@/lib/auth-client` for new form | Phase 1 changed the `orgId` import path; `organization.create()` is new behavior |

**Rule:** Phase 2 files rewrite the behavior of every page above. Where Phase 1 already changed an import from `@clerk/nextjs` → `@/lib/auth-hooks`, Phase 2 keeps that import for any code path that maps to `{ isLoaded, isSignedIn, userId, orgId }`. Net-new code paths (org creation, invitation acceptance, signOut callback, org switching) use native `authClient` directly. Voluntarily using the shim in brand-new code accrues tech debt the shim's own header comment warns against.

---

## §2. Design Tokens — Consolidated

### §2.1 Token Catalog

All Phase 2 pages share a single design token vocabulary extracted from current `appearance` props:

All values below are extracted from the `appearance` props in §1.1.1/§1.1.2. Tokens marked **[verify Phase 3]** are Clerk internals not set in `appearance` — planned reasonable defaults, adjust visually during apply. **No `style=` props in Phase 2 — all tokens expressed as Tailwind arbitrary values.**

```typescript
// Design tokens — shared across all Phase 2 pages
// ALL are Tailwind class strings (arbitrary values where needed), NOT inline style objects.
const tokens = {
  // Colors — traced to appearance.variables or appearance.elements in sign-in:10–68
  primary: "#0071E3",                          // colorPrimary (sign-in:10)
  primaryHover: "#0077ED",                     // formButtonPrimary hover (sign-in:60)
  primaryActive: "#006CD1",                    // formButtonPrimary active (sign-in:60)
  text: "#1D1D1F",                             // colorText (sign-in:14)
  textSecondary: "#6E6E73",                    // colorTextSecondary (sign-in:15)
  danger: "#FF3B30",                           // colorDanger (sign-in:11)

  // Surfaces — traced to appearance.elements.card in sign-in:24–32
  cardBg: "rgba(255, 255, 255, 0.88)",         // card.background (sign-in:25)
  cardBorder: "rgba(0, 0, 0, 0.08)",           // card.border (sign-in:28) → used as ring/border color
  inputBg: "rgba(0, 0, 0, 0.04)",             // colorInputBackground (sign-in:16)
  dividerLine: "rgba(0, 0, 0, 0.10)",         // dividerLine.backgroundColor (sign-in:50)

  // Input border default: NOT in appearance props (Clerk internal).
  // Phase 3 apply planned value: rgba(0,0,0,0.10) — verify visually. [verify Phase 3]
  inputBorderDefault: "rgba(0, 0, 0, 0.10)",

  // Social buttons — traced to appearance.elements in sign-in:63–67
  googleBg: "rgba(0, 0, 0, 0.04)",            // socialButtonsBlockButton__google (sign-in:63)
  googleHover: "rgba(0, 0, 0, 0.09)",         // socialButtonsBlockButton__google hover (sign-in:63)
  googleText: "#1D1D1F",                       // socialButtonsBlockButtonText__google (sign-in:64)
  facebookBg: "#1877F2",                       // socialButtonsBlockButton__facebook (sign-in:66)
  facebookHover: "#166FE5",                    // socialButtonsBlockButton__facebook hover (sign-in:66)
  facebookText: "#FFFFFF",                     // socialButtonsBlockButtonText__facebook (sign-in:67)

  // Typography — traced to appearance.variables / appearance.elements in sign-in:19–48
  fontEnglish: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif", // fontFamily (sign-in:20)
  // Arabic: use existing --font-arabic CSS var (IBM Plex Sans Arabic, loaded in app/layout.tsx) — NOT Cairo/Tajawal
  headingFontSize: "22px",                     // headerTitle.fontSize (sign-in:36)
  headingFontWeight: "600",                    // headerTitle.fontWeight (sign-in:37)
  headingLetterSpacing: "-0.4px",              // headerTitle.letterSpacing (sign-in:38)
  bodyFontSize: "15px",                        // fontSize (sign-in:19)
  labelFontSize: "13px",                       // formFieldLabel.fontSize (sign-in:46)

  // Sizing — card.borderRadius + variables.borderRadius from sign-in:18,29
  cardBorderRadius: "22px",                    // card.borderRadius (sign-in:29)
  inputBorderRadius: "12px",                   // borderRadius variable (sign-in:18)
  // Card padding: NOT in appearance props (Clerk internal). Planned: 2rem. [verify Phase 3]
  cardPadding: "2rem",
  // Card max-width: NOT in appearance props (Clerk internal). Planned: 420px. [verify Phase 3]
  cardMaxWidth: "420px",

  // Effects — from card element in sign-in:26–31
  cardBackdropFilter: "blur(24px) saturate(180%)",    // card.backdropFilter (sign-in:26)
  cardShadow: "0 2px 6px rgba(0,0,0,0.04), 0 10px 30px rgba(0,0,0,0.08), 0 30px 60px rgba(0,0,0,0.06)", // card.boxShadow (sign-in:30)
  transitionDuration: "150",                   // duration-150 on social buttons (sign-in:63)
};
```

**Tailwind usage pattern:** Every token maps to a Tailwind class:
```
tokens.primary       → bg-[#0071E3], text-[#0071E3], border-[#0071E3]
tokens.cardBg        → bg-[rgba(255,255,255,0.88)]
tokens.cardShadow    → shadow-[0_2px_6px_rgba(0,0,0,0.04),...]
tokens.cardBorderRadius → rounded-[22px]
tokens.cardBackdropFilter → backdrop-blur-[24px] [--tw-backdrop-saturate:saturate(180%)]
```

No `style={{ ... }}` props. If a Tailwind arbitrary value becomes excessively long (e.g., multi-layer shadow), extract to `globals.css` as a CSS variable: `--shadow-auth-card: 0 2px 6px ...` then use `shadow-[var(--shadow-auth-card)]`.

### §2.2 Token Usage Strategy — Tailwind-Only Commitment

**Hard constraint:** All styling must be Tailwind classes. No `style={{ ... }}` prop objects. This is required by CLAUDE.md project conventions and is enforced in Phase 2.

**Decision:** Token constants are **defined at the TOP of each page** to keep code co-located. Where a token is used only once, inline the Tailwind class directly.

**Pattern:**
- Tokens that recur 3+ times in a page → `const tokens = { ... }` at module scope, values are **Tailwind class strings**, not CSS values
- Single-use tokens → Tailwind arbitrary-value classes directly (`bg-[#0071E3]`, `rounded-[22px]`, etc.)

**Example token usage (correct):**
```tsx
// tokens defined at module scope
const cardCls = "bg-[rgba(255,255,255,0.88)] backdrop-blur-[24px] [--tw-backdrop-saturate:saturate(180%)] rounded-[22px] shadow-[0_2px_6px_rgba(0,0,0,0.04),0_10px_30px_rgba(0,0,0,0.08)]";

// Used in JSX:
<div className={cardCls}>...</div>

// Single-use: inline directly
<button className="bg-[#0071E3] hover:bg-[#0077ED] active:bg-[#006CD1] text-white rounded-full ...">
```

**Exception for very long shadow values:** Define in `globals.css` as:
```css
:root { --shadow-auth-card: 0 2px 6px rgba(0,0,0,0.04), 0 10px 30px rgba(0,0,0,0.08), 0 30px 60px rgba(0,0,0,0.06); }
```
Then use `shadow-[var(--shadow-auth-card)]` in Tailwind. This avoids 80-char class strings while staying Tailwind-only.

### §2.3 Bilingual String Reference

Strings are **not stored in a dictionary**. They are passed inline at each `t("English", "عربي")` call site. This matches the existing codebase convention established in `lib/i18n/context.tsx` (no separate locale files).

The table below is a reference only — it shows what strings Phase 2 pages will need. During Phase 3 apply, each string is written directly at its call site:

| Used in | English | Arabic |
|---------|---------|--------|
| sign-in heading | "Sign In" | "تسجيل الدخول" |
| sign-up heading | "Create Account" | "إنشاء حساب" |
| email input label | "Email" | "البريد الإلكتروني" |
| password input label | "Password" | "كلمة المرور" |
| name input label | "Full Name" | "الاسم الكامل" |
| Google button | "Continue with Google" | "تسجيل الدخول بـ Google" |
| Facebook button | "Continue with Facebook" | "تسجيل الدخول بـ Facebook" |
| divider | "or" | "أو" |
| no-account link | "Don't have an account?" | "ليس لديك حساب؟" |
| have-account link | "Already have an account?" | "لديك حساب بالفعل؟" |
| accept-invite heading | "Accept Invitation" | "قبول الدعوة" |
| accept-invite body | "invited you to join" | "يدعوك للانضمام إلى" |
| accept button | "Accept" | "قبول" |
| reject button | "Reject" | "رفض" |
| select-org heading | "Choose a Workspace" | "اختر مساحة العمل" |
| create-new-org heading | "Create New Workspace" | "أنشئ مساحة عمل جديدة" |
| workspace name label | "Workspace Name" | "اسم مساحة العمل" |
| sign out | "Sign Out" | "تسجيل الخروج" |
| join heading | "Join Team" | "انضم إلى الفريق" |
| generic loading | "Loading..." | "جارٍ التحميل..." |
| generic error | "Something went wrong" | "حدث خطأ ما" |

**Usage pattern:**
```tsx
import { useT } from "@/lib/i18n/context";
const t = useT();
<h1 className="...">{t("Sign In", "تسجيل الدخول")}</h1>
```

---

## §3. Per-Page Deliverable — Structural Outline

Each section below outlines the rebuild requirements for one of the 7 files. Full code will be provided in Phase 3 apply.

### §3.1 `app/(auth)/sign-in/[[...sign-in]]/page.tsx` — REWRITE

**Estimated lines:** 200–280  
**Directive:** `"use client"` required (form state management)

#### §3.1.1 Component Structure

```
SignInPage
├── useState(email, password, error, isPending)
├── useState(selectedProvider, isSubmittingOAuth)
├── useSearchParams() to read ?redirectTo
├── onSubmitEmail() → authClient.signIn.email()
├── onClickGoogle() → authClient.signIn.social({ provider: "google" })
├── onClickFacebook() → authClient.signIn.social({ provider: "facebook" })
└── UI layout
    ├── Background (gradient implied)
    ├── Glassmorphism card (tokens.colors.cardBg, tokens.effects.cardShadow)
    ├── Heading (t("Sign In", "تسجيل الدخول"))
    ├── Social buttons row (Google + Facebook)
    ├── "or" divider
    ├── Email input
    ├── Password input
    ├── (no "Forgot password?" — A1 decision: removed for v1; not an inert link)
    ├── Primary button (t("Sign In", "تسجيل الدخول"))
    ├── Error display (if any)
    └── Link to "/sign-up" with t("Don't have an account?", "ليس لديك حساب؟")
```

#### §3.1.2 Key Behaviors

- **Form validation:** Email (required + format check), password (required, min 8 chars per Better Auth default)
- **OAuth flow:** On Google/Facebook click, call `authClient.signIn.social()` with `callbackURL` = `redirectTo` query param or `/inbox`
- **Error handling:** Display error message in card below submit button (Tailwind `text-[#FF3B30]` — danger token)
- **Loading state:** Button disabled, text → `t("Signing in...", "جارٍ التسجيل...")` while `isPending`
- **Success:** Better Auth redirects via `callbackURL`; page doesn't handle redirect explicitly
- **"Forgot password?" link:** Removed for v1 (A1 decision). Better Auth's `requestPasswordReset` endpoint exists but adding a forgot-password page is out of Phase 2 scope. Post-launch addition only.

#### §3.1.3 Edge Cases

| Scenario | Behavior | Status |
|----------|----------|--------|
| Invalid credentials | Show error from Better Auth; focus email field | Planned |
| Network failure | Show generic error; retry available | Planned |
| Account doesn't exist | Better Auth returns error; user prompts to sign up | Planned |
| OAuth redirect failure | Redirect back to sign-in with error in URL; display it | TBD per OQ-2d5 |
| Email/password length violations | Client-side + server-side validation | Planned |

#### §3.1.4 Imports Required

```typescript
"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Metadata } from "next"; // Server-side only
// authClient — assumes Stage 2a's lib/auth-client.ts exists
import { authClient } from "@/lib/auth-client";
// UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Icons
import { Mail, Lock, Chrome, Facebook } from "lucide-react";
```

---

### §3.2 `app/(auth)/sign-up/[[...sign-up]]/page.tsx` — REWRITE

**Estimated lines:** 220–300  
**Directive:** `"use client"` required

#### §3.2.1 Component Structure

Same as sign-in (§3.1) plus:
- `useState(name)` — required field
- Name input field **above** email (UX pattern from current Clerk form)
- Heading "إنشاء حساب / Create Account"
- Link to sign-in at bottom: "لديك حساب بالفعل؟ ... / Already have an account?"
- On success: redirect to `/onboarding` (no `redirectTo` override for sign-up)

#### §3.2.2 Password Validation

Better Auth's default is 8 chars min. Display:  
_"كلمة المرور يجب أن تكون 8 أحرف على الأقل / Password must be at least 8 characters"_

#### §3.2.3 Form Order

1. Full name input
2. Email input
3. Password input
4. Social buttons (Google + Facebook)
5. Create Account button

---

### §3.3 `app/select-org/page.tsx` — REWRITE (Minimal D5=B)

**Estimated lines:** 120–180  
**Directive:** `"use client"` required

#### §3.3.1 Component Structure

```
SelectOrgPage
├── useSession() → check auth state
├── useListOrganizations() → fetch org list
├── useState(newOrgName)
├── onSelectOrg(orgId) → organization.setActive + router.push("/inbox")
├── onCreateOrg(name) → organization.create({ name, slug: slugify(name) }) + router.push("/onboarding")
└── UI layout
    ├── Heading "اختر مساحة العمل / Choose a Workspace"
    ├── Existing organizations section (if any)
    │  └── For each org: card with name + click handler + "Enter" button
    ├── Separator
    ├── Create new section
    │  ├── Heading "أنشئ مساحة عمل جديدة / Or Create a New Workspace"
    │  ├── Name input
    │  └── Create button
    └── Empty state (if no orgs): hide existing section, show only create section
```

#### §3.3.2 Minimal Constraints (D5=B)

- NO member avatars
- NO role badges
- NO recent activity
- NO search/filter
- Member count optional (only if available without N+1 queries)
- Just org name + click to enter/create

#### §3.3.3 Slugify Helper

Calls `slugify(name)` from `lib/utils.ts` (Stage 2c.1 §3 planned). Signature:

```typescript
export function slugify(input: string): string {
  // Convert to lowercase, strip special chars, trim
  // If result is empty (e.g., Arabic-only input), generate random suffix
  // Returns alphanumeric slug safe for URL
}
```

---

### §3.4 `app/accept-invite/[invitationId]/page.tsx` — CREATE (NEW)

**Estimated lines:** 250–350  
**Directive:** `"use client"` required

#### §3.4.1 Flow States

Page has a state machine with transitions:

```
loading
  ├─ isPending = true from authClient.useSession()
  └─ Show spinner + t("Loading...", "جارٍ التحميل...")

unauthenticated
  ├─ data = null, isPending = false
  ├─ Action: router.replace("/sign-in?redirectTo=/accept-invite/[invitationId]")
  └─ D8 pattern — redirect to unified sign-in, return here after auth

ready
  ├─ data is non-null session + invitation fetched + not expired
  ├─ Display: {invitation.inviterEmail} t("invited you to join", "يدعوك للانضمام إلى") {invitation.organizationName}
  ├─ Actions: [Accept] [Reject] buttons
  └─ Both actions use t() for labels

accepting
  ├─ User clicked Accept
  └─ Accept button disabled, text → t("Accepting...", "جارٍ القبول...")

accepted
  ├─ acceptInvitation() succeeded
  ├─ Display: t("Invitation accepted!", "تم قبول الدعوة!")
  └─ router.push("/inbox") after 1.5s

error
  ├─ Display: error message + [Go to Inbox] or [Sign Out] button
  └─ Sub-states:
     ├─ email_mismatch: session email ≠ invitation.email
     ├─ expired: invitation.status === "expired" OR new Date() > invitation.expiresAt
     ├─ not_found: getInvitation returns error (null/404)
     └─ generic: acceptInvitation/rejectInvitation API error
```

#### §3.4.2 Session Check Pattern (D8) — Corrected

`useSession()` is a **React hook** (function call) per verified `dist/client/react/index.d.mts:17`:

```typescript
// CORRECT: Better Auth React pattern
const { data: session, isPending } = authClient.useSession();

if (isPending) { /* loading state */ }
if (!session) { /* unauthenticated — redirect */ }
// if session → fetch invitation, display UI
```

**Not:** `const { session, status } = useSession()` — that was the incorrect invented shape. Better Auth uses `{ data, isPending, error }` not `{ session, status }`.

#### §3.4.3 Verified API Shapes (from `better-auth@~1.6.9` type files)

**`authClient.organization.getInvitation({ id })`** — verified from `crud-invites.d.mts:631–768`:

```typescript
// Input (query param): { id: string }
// Return (actual type — all fields verified):
{
  id: string;
  organizationId: string;
  email: string;           // the invited email address
  role: "admin" | "member" | "owner";
  status: "pending" | "accepted" | "rejected" | "canceled" | "expired";
  inviterId: string;       // inviter's userId — NOT their name
  expiresAt: Date;
  createdAt: Date;
  organizationName: string;  // denormalized — from org record
  organizationSlug: string;  // denormalized — from org record
  inviterEmail: string;      // denormalized — from inviter's user record
  // NO inviterName field exists in this return type
}
```

**OQ-2d1 CLOSED.** `getInvitation` exists and returns `inviterEmail` (not `inviterName`). UI uses `inviterEmail` to identify inviter.

**`authClient.organization.acceptInvitation({ invitationId })`** — verified from `crud-invites.d.mts:230–374`:
```typescript
// Input: { invitationId: string }
// Return: { invitation: InvitationRow; member: { id, organizationId, userId, role, createdAt } }
```

**`authClient.organization.rejectInvitation({ invitationId })`** — verified from `crud-invites.d.mts:375–498`:
```typescript
// Input: { invitationId: string }
// Return: { invitation: InvitationRow | null; member: null }
```

**OQ-2d2 CLOSED.** `rejectInvitation` exists. Both blockers B2 and B4 resolved.

Display template — uses `inviterEmail` (not name):
```
{invitation.inviterEmail}
t("invited you to join", "يدعوك للانضمام إلى")
{invitation.organizationName}

[Accept]  [Reject]
```

#### §3.4.4 Email-Mismatch Error Handling

If `session.user.email !== invitation.email` (case-insensitive):

```tsx
<p>{t("This invitation was sent to", "هذه الدعوة مرسلة إلى")} {invitation.email}.</p>
<p>{t("You're signed in as", "أنت مسجّل دخول بـ")} {session.user.email}.</p>
<p>{t("Sign out and try again.", "سجّل الخروج وحاول مجدداً.")}</p>
<Button onClick={() => authClient.signOut()}>
  {t("Sign Out", "تسجيل الخروج")}
</Button>
```

#### §3.4.5 Imports & Dependencies

```typescript
"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { authClient } from "@/lib/auth-client"; // Stage 2a — provides useSession() + organization.*
import { useT } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
```

Note: `useSession()` comes from `authClient.useSession()` (Better Auth React client), not from Phase 1's auth-hooks shim. The shim (`lib/auth-hooks.ts`) provides backward-compatible `useAuth()` for files that need Clerk's `isSignedIn` / `orgId` shape — `accept-invite` uses the Better Auth native API directly.

---

### §3.5 `app/join/[token]/page.tsx` — REWRITE

**Estimated lines:** 150–220  
**Directive:** `"use client"` required

#### §3.5.1 Decision: Redirect vs Inline (§0.1 — Option (a) chosen)

**Chosen: Redirect to `/sign-in?redirectTo=/join/[token]`**

Rationale: Reuses the custom sign-in form from §3.1. Single auth surface across the app.

Flow:
```
/join/[token]
└─ isSignedIn?
   ├─ No → redirect to /sign-in?redirectTo=/join/[token]
   └─ Yes → Show "Validating..." + call validateAndJoin action
     ├─ Success → redirect to /inbox
     └─ Error → display error (token invalid, plan limit, etc.)
```

#### §3.5.2 Current Behavior Preserved

Current `join/[token]/page.tsx` already has:
- Auth check via `useAuth()`
- `validateAndJoin` action call
- Error states (INVITE_INVALID, PLAN_LIMIT, ALREADY_MEMBER)
- Success state ("Joined! Redirecting...")

Phase 2 **replaces the `<SignIn>` JSX at the bottom** with a redirect to the unified sign-in page, but keeps the rest of the logic intact.

#### §3.5.3 Key Changes

| Current | Phase 2 |
|---------|---------|
| `import { SignIn } from "@clerk/nextjs"` | Remove (no longer needed) |
| Renders `<SignIn>` when not signed in | Redirect to `/sign-in?redirectTo=/join/[token]` |
| Uses Clerk's `useAuth()` | Uses Phase 1's shim `useAuth()` (same import, different provider) |

All other behavior (error displays, success message, validateAndJoin call) stays the same.

#### §3.5.4 Imports Required

```typescript
"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-hooks"; // Phase 1 shim — Clerk-compatible { isLoaded, isSignedIn, orgId }
import { useT } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
```

Note: `useAuth()` from the Phase 1 shim (`@/lib/auth-hooks`) — Phase 1 already changed this from `@clerk/nextjs`. Phase 2 keeps it. The shim returns `{ isLoaded, isSignedIn, orgId }`, matching the existing call sites. No `authClient` import needed: all new behavior in this file is the redirect pattern (router.replace) and the existing `validateAndJoin` action call, neither of which needs the native client.

---

### §3.6 `components/shell/user-menu.tsx` — REWRITE

**Estimated lines:** 150–220  
**Directive:** `"use client"` required

#### §3.6.1 Preserved Behavior

Keep all existing functionality:
- Avatar display (with fallback initials)
- User name + org name display
- Presence indicator
- Role badge
- Profile modal trigger (button click → `setProfileOpen(true)`)
- Collapsed sidebar variant (avatar-only)

#### §3.6.2 `<OrganizationSwitcher>` Rebuild (D5=B)

Replace Clerk's `<OrganizationSwitcher>` with custom dropdown:

```
Dropdown
├─ Trigger: Current org name + chevron
├─ Content:
│  ├─ Each org from useListOrganizations()
│  │  └─ Click → organization.setActive(orgId) + router.push("/inbox")
│  ├─ Separator
│  └─ "Create new workspace" link → /select-org
└─ Minimal: NO member avatars, NO activity, NO "Settings" link (A2: removed — route unconfirmed)
```

Use shadcn/ui's `DropdownMenu` component (existing in the codebase).

#### §3.6.3 `<SignOutButton>` Rebuild



Replace Clerk's `<SignOutButton>` with custom button:

OQ-2d4 resolution: Better Auth's `signOut` accepts `{ fetchOptions: { onSuccess: fn } }` for post-logout callbacks. Use manual redirect as the safe fallback:

```typescript
<button
  onClick={async () => {
    await authClient.signOut({
      fetchOptions: { onSuccess: () => router.push("/sign-in") },
    });
  }}
  className={/* existing classes */}
>
  <LogOut className="size-4 shrink-0 rtl:scale-x-[-1]" />
  <span className="group-data-[collapsible=icon]:hidden">
    {t("Sign Out", "تسجيل الخروج")}
  </span>
</button>
```

#### §3.6.4 Imports Required

```typescript
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
// Shim — for avatar/name/role display (Phase 1 already changed these from @clerk/nextjs)
import { useAuth, useUser } from "@/lib/auth-hooks";
// Native — for new behaviors that didn't exist in the Clerk version
import { authClient } from "@/lib/auth-client";
import { useT } from "@/lib/i18n/context";
import { LogOut, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoleBadge } from "./role-badge";
import { PresenceIndicator } from "@/components/ui/presence-indicator";
import { MyProfileModal } from "./my-profile-modal";
import type { ResolvedUser } from "@/lib/shell/types";
import { resolveRole } from "@/lib/shell/role-utils";
```

Note: `useAuth()` and `useUser()` from the Phase 1 shim cover user identity and role display — consistent with 28+ other files that use the shim for the same purpose. `authClient` from native covers `signOut` (new, with `fetchOptions.onSuccess` callback), `useListOrganizations()` (new org switcher dropdown), and `organization.setActive()` (org switch action). Both imports coexist — each covers what the other doesn't.

---

### §3.7 `components/onboarding/step-workspace-name.tsx` — REWRITE

**Estimated lines:** 120–180  
**Directive:** `"use client"` required

#### §3.7.1 Replace `<CreateOrganization>`

Current component renders Clerk's `<CreateOrganization>` component. Phase 2 replaces with custom form:

```
StepWorkspaceName
├─ useState(name, error, isCreating)
├─ onSubmit → organization.create({ name, slug: slugify(name) })
├─ On success → nextStep() callback (existing prop or hardcoded redirect)
└─ UI
   ├─ Heading "سمّي مساحة العمل / Name Your Workspace"
   ├─ Description text
   ├─ Name input
   ├─ Create button (disabled while isCreating)
   ├─ Error display
   └─ (Optional) "Back" button to previous step
```

#### §3.7.2 Slug Generation

Calls `slugify(name)` from `lib/utils.ts`. Handles:
- Empty string after stripping special chars (Arabic-only names) → random UUID suffix
- Collision with existing slug (unlikely in v1) → TBD error handling

#### §3.7.3 Integration with Onboarding Flow

Current `step-workspace-name.tsx` has:
```typescript
useEffect(() => {
  if (orgId) {
    ensureCreated({});
  }
}, [orgId, ensureCreated]);
```

Phase 2 keeps this logic (ensures onboarding state is recorded after org creation).

#### §3.7.4 Imports Required

```typescript
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-hooks"; // Phase 1 shim — for orgId check in useEffect
import { authClient } from "@/lib/auth-client"; // native — for organization.create()
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useT } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
```

Note: `useAuth()` from the shim covers `orgId` (used in the existing `useEffect` → `ensureCreated` pattern that Phase 2 preserves — Phase 1 already changed this import from `@clerk/nextjs`). `authClient.organization.create()` covers the new custom form. The existing `useMutation(api.onboarding.ensureCreated)` call is unchanged.

---

## §4. Files NOT in Scope

Phase 2 does **NOT** touch these files (deferred to Phase 3):

- `components/convex-client-provider.tsx` — Phase 3 swaps provider
- `components/clerk-provider-with-locale.tsx` — Phase 3 deletes
- `app/(dashboard)/layout.tsx` — Phase 3 adds auth guard
- `lib/shell/role-utils.ts` — Phase 3 fixes Q8 supervisor branch
- UI deletion of avatar/ban controls (D2 Option B) — Phase 3
- All 28 files Phase 1 modified (import-only changes; bodies untouched by Phase 2)

If discovery surfaces a file that Phase 2 should modify, it will be flagged in §6 as a new open question. Do NOT silently expand scope.

---

## §5. Dependency Chain & Prerequisites

Phase 2 planning assumes these files exist or are created in Stage 3 apply:

| Prerequisite | Source | Status | Required for Phase 2 |
|--------------|--------|--------|----------------------|
| `lib/auth-client.ts` | Stage 2a §5.4 (lines 1058–1095) — `createAuthClient` from `"better-auth/react"` with `convexClient()` + `organizationClient()` plugins | Planned (not yet created) | All 7 pages |
| `lib/auth-hooks.ts` (shim) | Phase 1 §2.5 (lines 331–412) — exports `useAuth()`, `useUser()`, `useOrganization()` in Clerk-compatible shape | Planned (not yet created) | `join/[token]`, `user-menu`, `step-workspace-name` |
| `lib/utils.ts:slugify` | Stage 2c.1 §3 | Planned (not yet created) | `select-org`, `step-workspace-name`, `user-menu` |
| `convex/auth.ts` | Stage 2a §5.1 | Planned (not yet created) | OAuth provider config (server-side only) |
| `convex/emails/templates/invitation.tsx` | Stage 2c.2 | Planned (not yet created) | Invitation email (deferred to Phase 3) |
| `.env.local` with OAuth secrets | User config | TBD | OAuth social buttons |

**Critical:** None of these files exist in the current codebase. Phase 2 planning assumes they will be created in Stage 3 apply (per the stage gates in Stage 2a/2b/2c docs).

---

## §6. Open Questions — Updated After Review

Issues discovered during discovery, with status updated from B1–B4 + A1–A4 corrections + OQ-2d7/2d8 closures.

### CLOSED OQs (all resolved — no remaining hard blockers)

| OQ | Resolution |
|----|-----------|
| **OQ-2d1** `getInvitation` method signature | **CLOSED.** Verified in `dist/plugins/organization/routes/crud-invites.d.mts:631`. Returns `{ id, organizationId, email, role, status, inviterId, expiresAt, createdAt, organizationName, organizationSlug, inviterEmail }`. |
| **OQ-2d2** `rejectInvitation` method exists | **CLOSED.** Verified in `crud-invites.d.mts:375`. Takes `{ invitationId }`, returns `{ invitation: InvitationRow \| null, member: null }`. |
| **OQ-2d4** `signOut()` redirect pattern | **CLOSED.** Use `fetchOptions.onSuccess` callback: `authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/sign-in") } })`. |
| **OQ-2d6** Locale detection mechanism | **CLOSED.** Cookie `"locale"` (defaults to `"ar"`) set in `app/layout.tsx`. `LocaleProvider` wraps all routes. Use `useT()` from `@/lib/i18n/context`. |
| **OQ-2d7** Stage 2a's `lib/auth-client.ts` — exact create pattern | **CLOSED.** Stage 2a §5.4 (lines 1058–1095) specifies `createAuthClient` from `"better-auth/react"` with `convexClient()` and `organizationClient()` plugins. Phase 2 calls `authClient.useSession()` from this client. See §1.8 for per-file hook source mapping. |
| **OQ-2d8** Phase 1's auth-hooks shim — hook name | **CLOSED.** Phase 1 §2.5 (lines 331–412) exports `useAuth()`, `useUser()`, `useOrganization()` in Clerk-compatible shape (all three internally call `authClient.useSession()` + `authClient.useActiveOrganization()`). Phase 2 shim-using files import `useAuth()` from `@/lib/auth-hooks`. See §1.8 for per-file mapping. |

---

### OPEN: Soft flags (resolve during apply, not blocking)

### OQ-2d3: Post-reject navigation

**Question:** After rejecting an invitation, where should the user land?

**Candidates:** `/select-org` (if user has existing orgs) else `/sign-in`.

**Recommendation:** Check `useListOrganizations()` result; if non-empty → `/select-org`, else → `/sign-in`.

---

### OQ-2d5: OAuth redirect error URL pattern

**Question:** If OAuth redirect fails, does Better Auth return to sign-in page with an error query param?

**Impact:** Sign-in page error display for OAuth failures.

**Recommendation:** Test during Phase 3 apply. Display generic error if URL contains `?error=`.

---

### OQ-2d9: `useListOrganizations()` — return type

**Question:** Exact return type of `authClient.useListOrganizations()` — nanostores atom or React hook?

**Impact:** `select-org` and `user-menu` need correct call pattern.

**Expected (from react client pattern, same as useSession):**
```typescript
const { data: orgs, isPending } = authClient.useListOrganizations();
// OR (if different pattern):
const orgs = useStore(authClient.useListOrganizations);
```

**Recommendation:** Verify in Phase 3 apply against `@convex-dev/better-auth` client types.

---

### OQ-2d10: `organization.create()` — sets active org?

**Question:** Does `authClient.organization.create()` automatically call `setActive()` for the creator?

**Impact:** `select-org` and `step-workspace-name` may not need a separate `setActive()` call after `create()`.

**Recommendation:** Verify in Phase 3 apply. If not auto-set, add `organization.setActive({ organizationId: created.id })` after `create()`.

---

## §7. Phase 3 Application Order

Phase 2's 7 files can be applied in Stage 3 in any order relative to each other, with these dependencies:

- **Must be applied BEFORE Phase 2 files:**
  - Stage 2a complete (includes `lib/auth-client.ts`, `convex/auth.ts`)
  - Phase 1 complete (includes `lib/auth-hooks.ts` shim)
  - Stage 2c.1 complete (includes `lib/utils.ts:slugify`)

- **Internal Phase 2 dependencies:** None. The 7 files don't import from each other.

- **After Phase 2, before Phase 3 proper:**
  - All 7 files in this document are applied
  - TypeScript baseline passes (`npx tsc --noEmit`)
  - All Stage 2a/2b/2c/2d Phase 1 + Phase 2 diffs are staged and ready for merge

- **Phase 3 follows Phase 2:**
  - Provider swap (`<ConvexProviderWithClerk>` → `<ConvexBetterAuthProvider>`)
  - Delete `components/clerk-provider-with-locale.tsx`
  - Add auth guard to `app/(dashboard)/layout.tsx`
  - Fix `lib/shell/role-utils.ts` Q8 supervisor branch
  - Delete avatar/ban UI per D2 Option B

---

## §8. Constraints & Rejection Triggers

### Hard Rejection Triggers (do NOT use in Phase 3 apply)

1. **Compressed deliverable.** STAGE_2D_PHASE_2.md must be complete with all discovery in §1 and all structural outlines in §3. Chat reply may abbreviate keystones; the file cannot.
2. **Source file modifications.** Only STAGE_2D_PHASE_2.md and PROGRESS.md are writable in this phase.
3. **Skipped discovery.** No file rewrites in §3 without verbatim reads in §1.
4. **Inferring tokens.** §2 must trace every token to a line in the current `appearance` props. "Looks like" is rejected; "extracted from sign-in:N" is acceptable.
5. **Out-of-scope changes.** Phase 3 files appearing in Phase 2 output = rejection.
6. **Re-litigating D4/D5/D6/D7/D8.** All locked per initial prompt.
7. **`while-I-was-there` reformatting.** No style changes to unchanged code blocks (CLAUDE.md §30.3).
8. **Inventing `authClient` methods.** Every method must be documented in Better Auth v1.6.9 or Stage 2a/2c docs. Guessing = rejection.
9. **`any` types.** TypeScript strict.
10. **Placeholder code.** No "TODO:" functions, no fake returns, no mock data at apply time.

### Soft Flags (raise but don't block Phase 3)

- If Better Auth's actual API differs from expected signatures, document the actual API and use it
- If current code uses patterns Phase 2 should preserve (specific error messages, transition animations), capture in discovery and replicate
- If fonts (Cairo/Tajawal) aren't loaded yet, flag it — don't silently add to `next/font`

---

## §9. Phase 3 Preview (Context Only)

After Phase 2 closes, Phase 3 (the apply stage) will rewrite all 7 files using the structural outlines above, plus handle:

- Provider swap in `components/convex-client-provider.tsx` (`<ConvexProviderWithClerk>` → Better Auth provider)
- Delete `components/clerk-provider-with-locale.tsx`
- Add `isAuthenticated()` server-side auth guard to `app/(dashboard)/layout.tsx` (paired with middleware deletion from Stage 2b)
- Fix `lib/shell/role-utils.ts` Q8 supervisor permission branch (1-line change)
- Delete UI for avatar uploads (D2 Option B) — affected files: profile modal, settings/team-member-list, etc.
- Delete UI for member ban/unban controls (D2) — affected files: settings/team-member-list, member-profile/manage-tab, etc.

After Phase 3 completes, all 6 days of migration (Stages 2a–2d) are applied to the codebase, and Clerk imports are eliminated entirely (verify with `grep -rn "@clerk" app components lib`).

**A4 Phase 3 audit item:** Audit `convex/actions/validateInvite.ts:validateAndJoin` for `ctx.auth.getUserIdentity()` calls. The Clerk + Convex integration populates `ctx.auth` via Clerk's JWT. Under Better Auth + `@convex-dev/better-auth`, `ctx.auth` is populated differently. If `getUserIdentity()` no longer returns the same user shape (particularly `subject` / `tokenIdentifier`), the action must be updated to accept `userId` from the client instead. This is a Phase 3 blocker if `validateAndJoin` relies on `ctx.auth.getUserIdentity()` for auth-user resolution.

---

## Summary

Phase 2 plans the rebuild of **5 auth pages + 2 nav components** (7 files total), replacing Clerk's hosted UI with custom HTML driven by Better Auth's `authClient`. Visual fidelity to existing design is the constraint. Discovery uncovered 10 open questions about Better Auth's exact API and post-apply integration, all flagged in §6 for Phase 3 clarification. Expected deliverable: ~1500–2500 lines of code spread across the 7 files.

**Status:** Planning complete. Ready for Phase 3 apply (after Stage 2a/2b/2c/2d Phase 1 + OQ resolution).
