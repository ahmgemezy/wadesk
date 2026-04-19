# Team Member Profile Sheet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a clickable profile sheet to the team settings page so admins can view any member's profile and supervisors can view profiles of agents in their shared channels.

**Architecture:** A new Convex action (`getProfile`) handles all data fetching and permission enforcement server-side. A new `MemberProfileSheet` component renders the sheet. The existing `TeamMemberList` component gets `selectedMemberId` state wired to control the sheet.

**Tech Stack:** Convex actions (node runtime), React `useAction`, shadcn/ui `Sheet`, existing `DateRangePicker` from analytics.

---

## File Map

| File | Change |
|---|---|
| `convex/orgMembers.ts` | Add `getProfile` action |
| `components/settings/member-profile-sheet.tsx` | Create — sheet UI component |
| `components/settings/team-member-list.tsx` | Modify — add click handlers + render sheet |

---

### Task 1: Add `getProfile` action to `convex/orgMembers.ts`

**Files:**
- Modify: `convex/orgMembers.ts`

- [ ] **Step 1: Open `convex/orgMembers.ts` and append the `getProfile` action**

Add the following export at the bottom of the file (after the `removeMember` export):

```typescript
export const getProfile = action({
  args: {
    targetUserId: v.string(),
    startTs: v.number(),
    endTs: v.number(),
  },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdminOrSupervisor(role);

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;
    const callerId = identity.subject as string;

    // Supervisor: enforce channel-overlap scoping
    if (role === "org:supervisor") {
      const callerChannels: string[] = await ctx.runQuery(
        internal.channelMembers.getChannelIdsForUser,
        { tenantId, userId: callerId },
      );
      const targetChannels: string[] = await ctx.runQuery(
        internal.channelMembers.getChannelIdsForUser,
        { tenantId, userId: args.targetUserId },
      );
      const shared = callerChannels.some((id) => targetChannels.includes(id));
      if (!shared) throw new ConvexError("FORBIDDEN");
    }

    const client = await clerkClient();

    // 1. Identity from Clerk
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: tenantId,
      limit: 100,
    });
    const membership = memberships.data.find(
      (m) => m.publicUserData?.userId === args.targetUserId,
    );
    if (!membership) throw new ConvexError("MEMBER_NOT_FOUND");

    const identityData = {
      userId: args.targetUserId,
      name: (membership.publicUserData?.firstName ?? null) as string | null,
      email: (membership.publicUserData?.identifier ?? "") as string,
      imageUrl: (membership.publicUserData?.imageUrl ?? null) as string | null,
      role: (membership.role === "admin" ? "org:admin" : membership.role) as string,
      joinedAt: (membership.createdAt ?? null) as number | null,
    };

    // 2. Channel memberships
    const channelDocs: Array<{
      channelId: string;
      displayName: string;
      displayPhone: string | null;
      isActive: boolean;
    }> = await ctx.runQuery(internal.channelMembers.getChannelsForUser, {
      tenantId,
      userId: args.targetUserId,
    });

    // 3. Performance stats
    const stats: {
      conversationsHandled: number;
      avgFirstResponseTimeSeconds: number | null;
      avgCsatScore: number | null;
    } = await ctx.runQuery(internal.channelMembers.getAgentStats, {
      tenantId,
      agentId: args.targetUserId,
      startTs: args.startTs,
      endTs: args.endTs,
    });

    return { identity: identityData, channels: channelDocs, stats };
  },
});
```

- [ ] **Step 2: Create `convex/channelMembers.ts` with the three internal queries**

Create the file `convex/channelMembers.ts`:

```typescript
import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getChannelIdsForUser = internalQuery({
  args: { tenantId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("channelMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", args.userId),
      )
      .collect();
    return rows.map((r) => r.channelId as string);
  },
});

export const getChannelsForUser = internalQuery({
  args: { tenantId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("channelMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", args.userId),
      )
      .collect();

    const results: Array<{
      channelId: string;
      displayName: string;
      displayPhone: string | null;
      isActive: boolean;
    }> = [];

    for (const m of memberships) {
      const channel = await ctx.db.get(m.channelId);
      if (!channel) continue;
      results.push({
        channelId: m.channelId as string,
        displayName: channel.displayName,
        displayPhone: channel.displayPhone ?? null,
        isActive: channel.status === "active",
      });
    }
    return results;
  },
});

export const getAgentStats = internalQuery({
  args: {
    tenantId: v.string(),
    agentId: v.string(),
    startTs: v.number(),
    endTs: v.number(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("conversationMetrics")
      .withIndex("by_tenant_agent", (q) =>
        q.eq("tenantId", args.tenantId).eq("assignedAgentId", args.agentId),
      )
      .filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), args.startTs),
          q.lte(q.field("createdAt"), args.endTs),
        ),
      )
      .collect();

    const conversationsHandled = rows.length;

    const responseTimes = rows
      .map((r) => r.firstResponseTimeSeconds)
      .filter((v): v is number => v !== undefined && v !== null);
    const avgFirstResponseTimeSeconds =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : null;

    const csatScores = rows
      .map((r) => r.csatScore)
      .filter((v): v is number => v !== undefined && v !== null);
    const avgCsatScore =
      csatScores.length > 0
        ? csatScores.reduce((a, b) => a + b, 0) / csatScores.length
        : null;

    return { conversationsHandled, avgFirstResponseTimeSeconds, avgCsatScore };
  },
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If errors appear in `convex/orgMembers.ts` around `internal.channelMembers.*`, ensure `convex/channelMembers.ts` was created and Convex has regenerated types (`npx convex dev` running in background updates `_generated/api.ts` automatically).

- [ ] **Step 4: Commit**

```bash
git add convex/orgMembers.ts convex/channelMembers.ts
git commit -m "feat(team): add getProfile action with channel-scoped supervisor enforcement"
```

---

### Task 2: Create `MemberProfileSheet` component

**Files:**
- Create: `components/settings/member-profile-sheet.tsx`

- [ ] **Step 1: Create the file**

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker, type DateRange } from "@/components/analytics/date-range-picker";
import { useT } from "@/lib/i18n/context";
import { subDays } from "date-fns";
import { Crown, Shield, HeadphonesIcon } from "lucide-react";

type OrgRole = "org:admin" | "org:supervisor" | "org:agent";

interface ProfileData {
  identity: {
    userId: string;
    name: string | null;
    email: string;
    imageUrl: string | null;
    role: string;
    joinedAt: number | null;
  };
  channels: Array<{
    channelId: string;
    displayName: string;
    displayPhone: string | null;
    isActive: boolean;
  }>;
  stats: {
    conversationsHandled: number;
    avgFirstResponseTimeSeconds: number | null;
    avgCsatScore: number | null;
  };
}

interface MemberProfileSheetProps {
  memberId: string | null;
  onClose: () => void;
}

function roleBadge(role: string, t: (en: string, ar: string) => string) {
  switch (role as OrgRole) {
    case "org:admin":
      return (
        <Badge className="gap-1">
          <Crown className="size-3" />
          {t("Admin", "مدير")}
        </Badge>
      );
    case "org:supervisor":
      return (
        <Badge variant="secondary" className="gap-1">
          <Shield className="size-3" />
          {t("Supervisor", "مشرف")}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <HeadphonesIcon className="size-3" />
          {t("Agent", "وكيل")}
        </Badge>
      );
  }
}

function formatResponseTime(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

function formatJoinDate(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function MemberProfileSheet({ memberId, onClose }: MemberProfileSheetProps) {
  const t = useT();
  const getProfile = useAction(api.orgMembers.getProfile);

  const defaultRange: DateRange = {
    from: subDays(new Date(), 30),
    to: new Date(),
  };

  const [dateRange, setDateRange] = useState<DateRange>(defaultRange);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!memberId) return;
    setLoading(true);
    setProfile(null);
    try {
      const data = await getProfile({
        targetUserId: memberId,
        startTs: dateRange.from.getTime(),
        endTs: dateRange.to.getTime(),
      });
      setProfile(data as ProfileData);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [memberId, dateRange, getProfile]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const displayName = profile?.identity.name ?? profile?.identity.email ?? "";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <Sheet open={!!memberId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {/* Header */}
        <SheetHeader className="pb-4 border-b">
          {loading || !profile ? (
            <div className="flex items-center gap-3">
              <Skeleton className="size-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {profile.identity.imageUrl ? (
                <img
                  src={profile.identity.imageUrl}
                  alt=""
                  className="size-12 rounded-full"
                />
              ) : (
                <div className="size-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                  {initial}
                </div>
              )}
              <div>
                <SheetTitle className="text-base">{displayName}</SheetTitle>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {profile.identity.email}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {roleBadge(profile.identity.role, t)}
                  <span className="text-xs text-muted-foreground">
                    {t("Joined", "انضم")} {formatJoinDate(profile.identity.joinedAt)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </SheetHeader>

        <div className="py-5 space-y-6">
          {/* Section 1: Channels */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {t("Assigned Channels", "القنوات المعيّنة")}
            </p>
            {loading ? (
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-7 w-28 rounded-lg" />
                <Skeleton className="h-7 w-36 rounded-lg" />
              </div>
            ) : profile?.channels.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("No channels assigned", "لا توجد قنوات معيّنة")}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile?.channels.map((ch) => (
                  <span
                    key={ch.channelId}
                    className="inline-flex items-center gap-1.5 bg-muted border border-border rounded-lg px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    <span
                      className={`size-1.5 rounded-full ${ch.isActive ? "bg-green-500" : "bg-muted-foreground"}`}
                    />
                    {ch.displayName}
                    {ch.displayPhone && (
                      <span className="text-muted-foreground" dir="ltr">
                        {ch.displayPhone}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Performance Stats */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {t("Performance", "الأداء")}
            </p>
            <div className="mb-4">
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                locale="en"
              />
            </div>
            {loading ? (
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 border border-border rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-foreground">
                    {profile?.stats.conversationsHandled ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("Conversations", "محادثات")}
                  </p>
                </div>
                <div className="bg-muted/50 border border-border rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-foreground">
                    {formatResponseTime(profile?.stats.avgFirstResponseTimeSeconds ?? null)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("Avg Response", "متوسط الرد")}
                  </p>
                </div>
                <div className="bg-muted/50 border border-border rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-amber-500">
                    {profile?.stats.avgCsatScore != null
                      ? `${profile.stats.avgCsatScore.toFixed(1)} ⭐`
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">CSAT</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. Common issue: if `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` are not in `components/ui/sheet.tsx`, check that shadcn/ui sheet component is installed. If missing, run: `npx shadcn@latest add sheet`.

- [ ] **Step 3: Commit**

```bash
git add components/settings/member-profile-sheet.tsx
git commit -m "feat(team): add MemberProfileSheet component"
```

---

### Task 3: Wire the sheet into `TeamMemberList`

**Files:**
- Modify: `components/settings/team-member-list.tsx`

- [ ] **Step 1: Add `selectedMemberId` state and import `MemberProfileSheet`**

At the top of `components/settings/team-member-list.tsx`, add the import:

```typescript
import { MemberProfileSheet } from "./member-profile-sheet";
```

Inside `TeamMemberList`, add state after the existing state declarations:

```typescript
const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
```

- [ ] **Step 2: Make member rows clickable based on role**

Replace the existing member row `<div>` (line 129–219) with the version below. The key changes:
- Admin: every active member row is clickable
- Supervisor: only `org:agent` rows are clickable; others have no interaction styling

```typescript
{members.map((member) => {
  const isClickable =
    member.status === "active" &&
    (isAdmin || (isSupervisor && member.role === "org:agent"));

  return (
    <div
      key={member.userId}
      className={`border rounded-lg p-3 flex items-center gap-3 transition-colors ${
        isClickable
          ? "cursor-pointer hover:bg-muted/50"
          : ""
      }`}
      onClick={
        isClickable
          ? () => setSelectedMemberId(member.userId)
          : undefined
      }
    >
      {member.imageUrl ? (
        <img
          src={member.imageUrl}
          alt=""
          className="size-9 rounded-full"
        />
      ) : (
        <div className="size-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
          {(member.name ?? member.email).charAt(0).toUpperCase()}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">
          {member.name ?? member.email}
        </div>
        <div className="text-xs text-muted-foreground truncate" dir="ltr">
          {member.email}
        </div>
      </div>

      <Badge variant={roleBadgeVariant(member.role)} className="gap-1">
        {roleIcon(member.role)}
        {roleLabel(member.role, t)}
      </Badge>

      {member.status === "pending" && (
        <Badge variant="outline">{t("Pending", "معلق")}</Badge>
      )}

      {isAdmin && member.userId !== currentUserId && (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />} onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {member.role !== "org:admin" && (
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); void handleChangeRole(member.userId, "org:admin"); }}
              >
                <Crown className="size-4" />
                {t("Make Admin", "ترقية لمدير")}
              </DropdownMenuItem>
            )}
            {member.role !== "org:supervisor" && (
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); void handleChangeRole(member.userId, "org:supervisor"); }}
              >
                <Shield className="size-4" />
                {t("Make Supervisor", "ترقية لمشرف")}
              </DropdownMenuItem>
            )}
            {member.role !== "org:agent" && (
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); void handleChangeRole(member.userId, "org:agent"); }}
              >
                <HeadphonesIcon className="size-4" />
                {t("Make Agent", "تخفيض لوكيل")}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={(e) => { e.stopPropagation(); void handleRemove(member.userId, member.status); }}
            >
              {t("Remove", "إزالة")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {isSupervisor && member.role === "org:agent" && member.userId !== currentUserId && (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />} onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              variant="destructive"
              onClick={(e) => { e.stopPropagation(); void handleRemove(member.userId, member.status); }}
            >
              {t("Remove", "إزالة")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
})}
```

- [ ] **Step 3: Render `MemberProfileSheet` at the bottom of the component return**

Inside the `return (...)` of `TeamMemberList`, just before the closing `</div>` of the outermost `space-y-4` div, add:

```typescript
<MemberProfileSheet
  memberId={selectedMemberId}
  onClose={() => setSelectedMemberId(null)}
/>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Manual smoke test**

1. Start the dev server: `npm run dev`
2. Open `http://localhost:3000/settings/team` as an **Admin** user
3. Click any team member row → profile sheet should slide in from the right
4. Verify identity section shows name, email, role badge, join date
5. Verify channels section shows channel chips with green/grey dots
6. Verify performance section shows three stat cards
7. Change the date range → stats should reload
8. Close the sheet (click outside or press Esc)
9. Log in as a **Supervisor** user and repeat:
   - Agent rows → clickable, sheet opens
   - Admin/Supervisor rows → no hover, no sheet
10. Verify TypeScript: `npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add components/settings/team-member-list.tsx
git commit -m "feat(team): wire MemberProfileSheet into TeamMemberList with role-gated click handlers"
```

---

## Done

All three tasks produce working, independently committable changes. The feature is complete when Task 3 Step 5 smoke test passes fully.
