# Department Member Assignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins (and supervisors within their channels) to assign org members to specific departments (channels), with a hierarchy view showing supervisors above agents.

**Architecture:** Add a `channelMembers` join table in Convex that maps `(tenantId, channelId, userId, role)`. Expose Convex queries/mutations for listing and managing members. Build a `DepartmentMembers` UI component embedded in the channel settings page. Role enforcement: Admin can manage any channel; Supervisor can only add/remove agents from channels they're already assigned to.

**Tech Stack:** Convex (schema + functions), Next.js App Router, Clerk (`useOrganization` for org member list), shadcn/ui, Tailwind CSS, `useT` i18n hook.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `convex/schema.ts` | Add `channelMembers` table |
| Create | `convex/channelMembers.ts` | CRUD functions: `listForChannel`, `addMember`, `removeMember`, `isMember` |
| Create | `components/settings/department-members.tsx` | Full UI: hierarchy view + add/remove members |
| Modify | `app/(dashboard)/settings/channels/[channelId]/page.tsx` | Embed `<DepartmentMembers>` section |

---

## Task 1: Schema — add `channelMembers` table

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Add the table definition inside `defineSchema`**

In `convex/schema.ts`, add the following table after the `ruleFireLog` table (before the closing `}`):

```typescript
  channelMembers: defineTable({
    tenantId: v.string(),
    channelId: v.id("channels"),
    userId: v.string(),         // Clerk userId
    userName: v.string(),       // display name snapshot (for fast rendering)
    userEmail: v.string(),      // email snapshot
    userImageUrl: v.optional(v.string()),
    role: v.union(v.literal("org:supervisor"), v.literal("org:agent")),
    addedBy: v.string(),        // Clerk userId of who added them
    createdAt: v.number(),
  })
    .index("by_channel", ["channelId"])
    .index("by_tenant", ["tenantId"])
    .index("by_channel_user", ["channelId", "userId"])
    .index("by_tenant_user", ["tenantId", "userId"]),
```

- [ ] **Step 2: Verify schema pushes cleanly**

```bash
npx convex dev --once
```
Expected: `✓ Schema synced` with no errors.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(schema): add channelMembers table for department member assignment"
```

---

## Task 2: Convex functions — `convex/channelMembers.ts`

**Files:**
- Create: `convex/channelMembers.ts`

- [ ] **Step 1: Create the file with all four functions**

```typescript
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCallerIdentity, getCallerRole, assertAdmin } from "./lib/auth";

// ─── Queries ──────────────────────────────────────────────────────────────────

/** List all members assigned to a channel, ordered supervisors first. */
export const listForChannel = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);

    // Verify channel belongs to this tenant
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    const members = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();

    // Supervisors first, then agents, alpha within each group
    const supervisors = members
      .filter((m) => m.role === "org:supervisor")
      .sort((a, b) => a.userName.localeCompare(b.userName));
    const agents = members
      .filter((m) => m.role === "org:agent")
      .sort((a, b) => a.userName.localeCompare(b.userName));

    return [...supervisors, ...agents];
  },
});

/** Check if the calling user is a member of a specific channel. */
export const isCallerMember = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) return false;

    const membership = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", callerId)
      )
      .first();

    return membership !== null;
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

export const addMember = mutation({
  args: {
    channelId: v.id("channels"),
    userId: v.string(),
    userName: v.string(),
    userEmail: v.string(),
    userImageUrl: v.optional(v.string()),
    role: v.union(v.literal("org:supervisor"), v.literal("org:agent")),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    const callerRole = await getCallerRole(ctx);

    // Verify channel belongs to this tenant
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    // Permission checks:
    // - Admin: can add supervisors or agents to any channel
    // - Supervisor: can only add agents (not supervisors), and only to channels they belong to
    if (callerRole === "org:supervisor") {
      if (args.role === "org:supervisor") {
        throw new ConvexError("FORBIDDEN");
      }
      const callerMembership = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel_user", (q) =>
          q.eq("channelId", args.channelId).eq("userId", callerId)
        )
        .first();
      if (!callerMembership) {
        throw new ConvexError("FORBIDDEN");
      }
    } else {
      assertAdmin(callerRole);
    }

    // Idempotent: if already a member, update role
    const existing = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", args.userId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        role: args.role,
        userName: args.userName,
        userEmail: args.userEmail,
        userImageUrl: args.userImageUrl,
        addedBy: callerId,
      });
      return existing._id;
    }

    return ctx.db.insert("channelMembers", {
      tenantId,
      channelId: args.channelId,
      userId: args.userId,
      userName: args.userName,
      userEmail: args.userEmail,
      userImageUrl: args.userImageUrl,
      role: args.role,
      addedBy: callerId,
      createdAt: Date.now(),
    });
  },
});

export const removeMember = mutation({
  args: {
    channelId: v.id("channels"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    const callerRole = await getCallerRole(ctx);

    // Verify channel belongs to this tenant
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    const membership = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", args.userId)
      )
      .first();

    if (!membership) return; // already gone — idempotent

    // Supervisors can only remove agents from their own channels
    if (callerRole === "org:supervisor") {
      if (membership.role === "org:supervisor") {
        throw new ConvexError("FORBIDDEN");
      }
      const callerMembership = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel_user", (q) =>
          q.eq("channelId", args.channelId).eq("userId", callerId)
        )
        .first();
      if (!callerMembership) {
        throw new ConvexError("FORBIDDEN");
      }
    } else {
      assertAdmin(callerRole);
    }

    await ctx.db.delete(membership._id);
  },
});
```

- [ ] **Step 2: Push to Convex and verify no type errors**

```bash
npx convex dev --once
```
Expected: `✓ Functions synced` with no errors.

- [ ] **Step 3: Commit**

```bash
git add convex/channelMembers.ts
git commit -m "feat(convex): add channelMembers queries and mutations"
```

---

## Task 3: UI component — `components/settings/department-members.tsx`

**Files:**
- Create: `components/settings/department-members.tsx`

This component shows:
1. A section header "Department Members"
2. Hierarchy list: Supervisors group → Agents group (each with avatar, name, role badge, remove button)
3. "Add Member" button → inline combobox to pick from org members not yet in this channel

It uses:
- `useQuery(api.channelMembers.listForChannel, { channelId })` for the current member list
- `useMutation(api.channelMembers.addMember)` / `useMutation(api.channelMembers.removeMember)`
- `useAction(api.orgMembers.list)` (already exists) to fetch all org members for the picker
- `useOrganization()` + `useUser()` from Clerk to know the current user's role

- [ ] **Step 1: Create the component**

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useOrganization, useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Shield, HeadphonesIcon, UserPlus, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";

interface OrgMember {
  userId: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
  role: "org:admin" | "org:supervisor" | "org:agent";
  status: "active" | "pending";
}

interface Props {
  channelId: Id<"channels">;
}

export function DepartmentMembers({ channelId }: Props) {
  const t = useT();
  const { membership } = useOrganization();
  const { user } = useUser();
  const orgRole = ((membership as unknown) as Record<string, unknown>)?.role as string | undefined;
  const isAdmin = orgRole === "org:admin" || orgRole === "admin";
  const isSupervisor = orgRole === "org:supervisor";
  const currentUserId = user?.id;

  const members = useQuery(api.channelMembers.listForChannel, { channelId });
  const isCallerMember = useQuery(api.channelMembers.isCallerMember, { channelId });
  const addMember = useMutation(api.channelMembers.addMember);
  const removeMember = useMutation(api.channelMembers.removeMember);
  const listOrgMembers = useAction(api.orgMembers.list);

  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const canManage = isAdmin || (isSupervisor && isCallerMember);

  const fetchOrgMembers = useCallback(async () => {
    try {
      const result = await listOrgMembers({});
      setOrgMembers(result as OrgMember[]);
    } catch {
      setOrgMembers([]);
    }
  }, [listOrgMembers]);

  useEffect(() => {
    if (canManage && addOpen) {
      void fetchOrgMembers();
    }
  }, [canManage, addOpen, fetchOrgMembers]);

  if (members === undefined || isCallerMember === undefined) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const memberUserIds = new Set(members.map((m) => m.userId));

  // Org members eligible to add: not already in channel, not admins (admins see all by default), active
  const eligibleToAdd = orgMembers.filter(
    (m) =>
      !memberUserIds.has(m.userId) &&
      m.role !== "org:admin" &&
      m.status === "active"
  );

  const supervisors = members.filter((m) => m.role === "org:supervisor");
  const agents = members.filter((m) => m.role === "org:agent");

  const handleAdd = async (orgMember: OrgMember, role: "org:supervisor" | "org:agent") => {
    try {
      await addMember({
        channelId,
        userId: orgMember.userId,
        userName: orgMember.name ?? orgMember.email,
        userEmail: orgMember.email,
        userImageUrl: orgMember.imageUrl ?? undefined,
        role,
      });
      setAddOpen(false);
      toast.success(t("Member added", "تم إضافة العضو"));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("FORBIDDEN")) {
        toast.error(t("You don't have permission to add this member", "ليس لديك صلاحية لإضافة هذا العضو"));
      } else {
        toast.error(t("Failed to add member", "فشل إضافة العضو"));
      }
    }
  };

  const handleRemove = async (userId: string) => {
    setRemoving(userId);
    try {
      await removeMember({ channelId, userId });
      toast.success(t("Member removed", "تم إزالة العضو"));
    } catch {
      toast.error(t("Failed to remove member", "فشل إزالة العضو"));
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          {t("Department Members", "أعضاء الإدارة")}
        </h3>
        {canManage && (
          <Popover open={addOpen} onOpenChange={setAddOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline">
                <UserPlus className="size-4 me-1.5" />
                {t("Add Member", "إضافة عضو")}
                <ChevronDown className="size-3 ms-1 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <Command>
                <CommandInput placeholder={t("Search members…", "بحث عن أعضاء…")} />
                <CommandList>
                  <CommandEmpty>
                    {t("No eligible members found", "لا يوجد أعضاء متاحون")}
                  </CommandEmpty>
                  {eligibleToAdd.length > 0 && (
                    <CommandGroup>
                      {eligibleToAdd.map((m) => (
                        <CommandItem key={m.userId} className="flex flex-col items-start gap-1 p-0">
                          <div className="flex items-center gap-2 w-full px-2 py-1.5">
                            {m.imageUrl ? (
                              <img src={m.imageUrl} alt="" className="size-7 rounded-full shrink-0" />
                            ) : (
                              <div className="size-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                                {(m.name ?? m.email).charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{m.name ?? m.email}</div>
                              <div className="text-xs text-muted-foreground truncate" dir="ltr">{m.email}</div>
                            </div>
                          </div>
                          <div className="flex gap-1 px-2 pb-1.5 w-full">
                            {isAdmin && m.role === "org:supervisor" && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-7 text-xs flex-1"
                                onClick={() => handleAdd(m, "org:supervisor")}
                              >
                                <Shield className="size-3 me-1" />
                                {t("As Supervisor", "كمشرف")}
                              </Button>
                            )}
                            {(isAdmin || (isSupervisor && m.role === "org:agent")) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs flex-1"
                                onClick={() => handleAdd(m, "org:agent")}
                              >
                                <HeadphonesIcon className="size-3 me-1" />
                                {t("As Agent", "كوكيل")}
                              </Button>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          {t("No members assigned to this department yet.", "لا يوجد أعضاء مضافون لهذه الإدارة بعد.")}
        </p>
      ) : (
        <div className="space-y-3">
          {/* Supervisors group */}
          {supervisors.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Shield className="size-3" />
                {t("Supervisors", "المشرفون")}
              </p>
              {supervisors.map((m) => (
                <MemberRow
                  key={m.userId}
                  member={m}
                  canRemove={canManage && isAdmin}
                  isRemoving={removing === m.userId}
                  isSelf={m.userId === currentUserId}
                  onRemove={() => handleRemove(m.userId)}
                  t={t}
                />
              ))}
            </div>
          )}

          {/* Agents group */}
          {agents.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <HeadphonesIcon className="size-3" />
                {t("Agents", "الوكلاء")}
              </p>
              {agents.map((m) => (
                <MemberRow
                  key={m.userId}
                  member={m}
                  canRemove={canManage}
                  isRemoving={removing === m.userId}
                  isSelf={m.userId === currentUserId}
                  onRemove={() => handleRemove(m.userId)}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface MemberRowProps {
  member: {
    userId: string;
    userName: string;
    userEmail: string;
    userImageUrl?: string;
    role: "org:supervisor" | "org:agent";
  };
  canRemove: boolean;
  isRemoving: boolean;
  isSelf: boolean;
  onRemove: () => void;
  t: (en: string, ar: string) => string;
}

function MemberRow({ member, canRemove, isRemoving, isSelf, onRemove, t }: MemberRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
      {member.userImageUrl ? (
        <img src={member.userImageUrl} alt="" className="size-8 rounded-full shrink-0" />
      ) : (
        <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
          {member.userName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {member.userName}
          {isSelf && (
            <span className="ms-1.5 text-xs text-muted-foreground">
              ({t("you", "أنت")})
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate" dir="ltr">
          {member.userEmail}
        </div>
      </div>
      <Badge variant={member.role === "org:supervisor" ? "secondary" : "outline"} className="shrink-0 gap-1">
        {member.role === "org:supervisor" ? (
          <Shield className="size-3" />
        ) : (
          <HeadphonesIcon className="size-3" />
        )}
        {member.role === "org:supervisor" ? t("Supervisor", "مشرف") : t("Agent", "وكيل")}
      </Badge>
      {canRemove && !isSelf && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive shrink-0"
          disabled={isRemoving}
          onClick={onRemove}
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Check for TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors related to `department-members.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/settings/department-members.tsx
git commit -m "feat(ui): add DepartmentMembers component with hierarchy view and add/remove"
```

---

## Task 4: Integrate into channel settings page

**Files:**
- Modify: `app/(dashboard)/settings/channels/[channelId]/page.tsx`

- [ ] **Step 1: Add the import**

At the top of `app/(dashboard)/settings/channels/[channelId]/page.tsx`, add:

```typescript
import { DepartmentMembers } from "@/components/settings/department-members";
```

- [ ] **Step 2: Add the section inside the `return` JSX**

After the `<AssignmentModeSelect ... />` block (around line 133), add a divider and the members section:

```tsx
      <div className="border-t pt-6">
        <DepartmentMembers channelId={channelId} />
      </div>
```

So the full JSX inside the outer `<div className="p-6 max-w-2xl mx-auto space-y-6">` becomes:

```tsx
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {t("Department Settings", "إعدادات الإدارة")}
        </h1>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
        >
          <Trash2 className="size-4 me-1" />
          {t("Delete", "حذف")}
        </Button>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">{t("Name", "الاسم")}</h3>
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              disabled={saving}
              className="max-w-sm"
            />
            <Button size="icon-sm" onClick={saveName} disabled={saving || !nameValue.trim()}>
              <Check className="size-4" />
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={cancelEdit} disabled={saving}>
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{channel.displayName}</span>
            <Button size="icon-sm" variant="ghost" onClick={startEdit}>
              <Pencil className="size-3" />
            </Button>
          </div>
        )}
      </div>

      <AssignmentModeSelect
        channelId={channelId}
        currentMode={channel.assignmentMode}
      />

      <div className="border-t pt-6">
        <DepartmentMembers channelId={channelId} />
      </div>
    </div>
```

- [ ] **Step 3: Full TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -40
```
Expected: 0 errors.

- [ ] **Step 4: Start dev server and verify the UI**

```bash
npm run dev
```

Navigate to `http://localhost:3000/settings/channels/<any-channel-id>`. Verify:
1. "Department Members" section appears below Assignment Mode
2. Empty state message shown when no members assigned
3. "Add Member" button shows a searchable combobox of org members
4. Adding a member shows them in the correct group (Supervisors / Agents)
5. Remove (×) button appears for admin on all members, for supervisor only on agents
6. Breadcrumb "Settings › Departments › [Channel Name]" — clicking "Settings" navigates to `/settings`, clicking "Departments" navigates to `/settings/channels`

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/settings/channels/\[channelId\]/page.tsx
git commit -m "feat(settings): embed DepartmentMembers in channel settings page"
```

---

## Self-Review

### Spec coverage check

| Requirement | Covered by |
|---|---|
| Admin assigns supervisors/agents to department | Task 2 `addMember` + Task 3 picker with "As Supervisor" / "As Agent" buttons |
| Supervisor can assign agents to their own channels | Task 2 permission check (`isSupervisor && callerMembership`) |
| Supervisor cannot assign other supervisors | Task 2 `if (args.role === "org:supervisor") throw FORBIDDEN` |
| Hierarchy view (supervisors above agents) | Task 3 `supervisors` group rendered before `agents` group |
| Remove member | Task 2 `removeMember` + Task 3 × button |
| Breadcrumbs navigatable | Already fixed in breadcrumb.tsx before this plan |
| Server-side role enforcement | Task 2 — all checks in Convex mutations, not client-only |
| No cross-tenant data access | Task 2 — every function validates `channel.tenantId === tenantId` |

### Placeholder scan
No TBDs, no "implement later", no "similar to" references — all steps contain actual code.

### Type consistency
- `channelId: Id<"channels">` used consistently across schema, functions, and component props
- `role: "org:supervisor" | "org:agent"` (not `OrgRole` which includes `"org:admin"`) — correct, admins are not added as department members
- `MemberRow` `member` type matches `channelMembers` document shape exactly
