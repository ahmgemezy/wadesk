# Supervisor Department Scoping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scope Supervisors to their assigned departments only — contacts, conversations, and follow-ups outside their departments become invisible to them, enforced server-side in Convex.

**Architecture:** Add a `departments` table (new — does not exist yet in schema), add `departmentId` to `contacts` and `conversations`, create a `getScopedDepartmentIds` permission helper in `convex/lib/permissions.ts`, update all list queries to filter by department when the caller is a Supervisor, create a `usePermissions` React hook for the frontend, and add Admin UI for assigning supervisors to departments.

**Tech Stack:** Convex (schema, queries, mutations), Next.js 15 App Router, shadcn/ui, Clerk (org membership + role), TypeScript (strict)

**Important dependency note:** The spec says "departments table already exists," but it does NOT exist in the current schema (`convex/schema.ts`). This plan creates it from scratch. `followUps` also does not exist and is not in scope — only contacts and conversations are scoped in this plan (add followUps once that feature is built).

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `convex/schema.ts` | Modify | Add `departments` table; add `departmentId` to `contacts` and `conversations` |
| `convex/departments.ts` | Create | CRUD + supervisor assignment mutations + scoped query |
| `convex/lib/permissions.ts` | Create | `getScopedDepartmentIds` helper used by all list queries |
| `convex/contacts.ts` | Modify | Apply department scope to `listForTenant` and `search` |
| `convex/conversations.ts` | Modify | Apply department scope to `listForCaller` |
| `hooks/usePermissions.ts` | Create | React hook exposing role + scopedDepartmentIds to frontend |
| `app/(dashboard)/settings/departments/page.tsx` | Create | Admin UI — list departments + assign supervisors |
| `components/settings/department-supervisor-picker.tsx` | Create | Picker component to add/remove supervisors from a department |

---

### Task 1: Add `departments` table to schema + add `departmentId` to contacts/conversations

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Open and read the current schema**

  Read `convex/schema.ts` — current tables are: `tenants`, `channels`, `contacts`, `conversations`, `messages`, `quickReplies`, `inviteLinks`, `customFields`, `onboardingState`.

- [ ] **Step 2: Add `departments` table, `departmentId` on `contacts`, `departmentId` on `conversations`**

  In `convex/schema.ts`, add the `departments` table definition after `onboardingState`. Also add `departmentId` field to `contacts` and `conversations`.

  **In `contacts` table definition**, add after `createdAt: v.number()`:
  ```ts
  departmentId: v.optional(v.id("departments")),
  ```

  And add index after the existing indexes:
  ```ts
  .index("by_org_department", ["tenantId", "departmentId"])
  ```

  **In `conversations` table definition**, add after `createdAt: v.number()`:
  ```ts
  departmentId: v.optional(v.id("departments")),
  ```

  And add index:
  ```ts
  .index("by_tenant_department", ["tenantId", "departmentId"])
  ```

  **New table** (add after `onboardingState` table):
  ```ts
  departments: defineTable({
    tenantId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    supervisors: v.array(v.string()), // Clerk userIds
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"]),
  ```

- [ ] **Step 3: Run Convex type generation to confirm schema compiles**

  ```bash
  npx convex dev --typecheck-only
  ```

  Expected: no TypeScript errors. If errors appear, fix field ordering — Convex schema fields must match index field names exactly.

- [ ] **Step 4: Commit**

  ```bash
  git add convex/schema.ts
  git commit -m "feat(departments): add departments table and departmentId to contacts/conversations schema"
  ```

---

### Task 2: Create `convex/departments.ts`

**Files:**
- Create: `convex/departments.ts`

- [ ] **Step 1: Create the file with all department mutations and queries**

  ```ts
  import { v } from "convex/values";
  import { ConvexError } from "convex/values";
  import { query, mutation } from "./_generated/server";
  import { getCallerIdentity } from "./lib/auth";

  // ── Queries ─────────────────────────────────────────────────────────────────

  export const list = query({
    args: {},
    handler: async (ctx) => {
      const { tenantId } = await getCallerIdentity(ctx);
      return ctx.db
        .query("departments")
        .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
        .collect();
    },
  });

  export const getDepartmentsForSupervisor = query({
    args: { supervisorUserId: v.string() },
    handler: async (ctx, args) => {
      const { tenantId } = await getCallerIdentity(ctx);
      const all = await ctx.db
        .query("departments")
        .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
        .collect();
      return all.filter((d) => d.supervisors.includes(args.supervisorUserId));
    },
  });

  // ── Mutations ────────────────────────────────────────────────────────────────

  export const create = mutation({
    args: {
      name: v.string(),
      description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
      const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
      if (orgRole !== "org:admin" && orgRole !== "admin") {
        throw new ConvexError("FORBIDDEN");
      }
      return ctx.db.insert("departments", {
        tenantId,
        name: args.name,
        description: args.description,
        supervisors: [],
        createdBy: callerId,
        createdAt: Date.now(),
      });
    },
  });

  export const assignSupervisor = mutation({
    args: {
      departmentId: v.id("departments"),
      supervisorUserId: v.string(),
    },
    handler: async (ctx, args) => {
      const { tenantId, orgRole } = await getCallerIdentity(ctx);
      if (orgRole !== "org:admin" && orgRole !== "admin") {
        throw new ConvexError("FORBIDDEN");
      }
      const dept = await ctx.db.get(args.departmentId);
      if (!dept || dept.tenantId !== tenantId) {
        throw new ConvexError("NOT_FOUND");
      }
      if (!dept.supervisors.includes(args.supervisorUserId)) {
        await ctx.db.patch(args.departmentId, {
          supervisors: [...dept.supervisors, args.supervisorUserId],
        });
      }
    },
  });

  export const removeSupervisor = mutation({
    args: {
      departmentId: v.id("departments"),
      supervisorUserId: v.string(),
    },
    handler: async (ctx, args) => {
      const { tenantId, orgRole } = await getCallerIdentity(ctx);
      if (orgRole !== "org:admin" && orgRole !== "admin") {
        throw new ConvexError("FORBIDDEN");
      }
      const dept = await ctx.db.get(args.departmentId);
      if (!dept || dept.tenantId !== tenantId) {
        throw new ConvexError("NOT_FOUND");
      }
      await ctx.db.patch(args.departmentId, {
        supervisors: dept.supervisors.filter((id) => id !== args.supervisorUserId),
      });
    },
  });

  export const remove = mutation({
    args: { departmentId: v.id("departments") },
    handler: async (ctx, args) => {
      const { tenantId, orgRole } = await getCallerIdentity(ctx);
      if (orgRole !== "org:admin" && orgRole !== "admin") {
        throw new ConvexError("FORBIDDEN");
      }
      const dept = await ctx.db.get(args.departmentId);
      if (!dept || dept.tenantId !== tenantId) {
        throw new ConvexError("NOT_FOUND");
      }
      await ctx.db.delete(args.departmentId);
    },
  });
  ```

- [ ] **Step 2: Run type check**

  ```bash
  npx convex dev --typecheck-only
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add convex/departments.ts
  git commit -m "feat(departments): add departments CRUD + assignSupervisor/removeSupervisor mutations"
  ```

---

### Task 3: Create `convex/lib/permissions.ts` — department scoping helper

**Files:**
- Create: `convex/lib/permissions.ts`

- [ ] **Step 1: Create the permissions helper**

  ```ts
  import type { Id } from "../_generated/dataModel";
  import type { GenericQueryCtx, GenericMutationCtx } from "convex/server";
  import type { DataModel } from "../_generated/dataModel";

  type Ctx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

  /**
   * Returns the list of departmentIds the caller is scoped to, or null if unscoped (admin).
   *
   * - Admin   → null   (sees everything, no department filter)
   * - Supervisor → string[] of departmentIds they supervise (may be empty)
   * - Agent   → null   (agents are scoped by assignedTo, not department)
   */
  export async function getScopedDepartmentIds(
    ctx: Ctx,
    tenantId: string,
    callerId: string,
    orgRole: string,
  ): Promise<Id<"departments">[] | null> {
    if (orgRole === "org:admin" || orgRole === "admin") {
      return null; // no filter
    }

    if (orgRole === "org:supervisor") {
      const departments = await ctx.db
        .query("departments")
        .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
        .collect();
      return departments
        .filter((d) => d.supervisors.includes(callerId))
        .map((d) => d._id);
    }

    // Agent — scoped by assignedTo field, not department
    return null;
  }
  ```

- [ ] **Step 2: Run type check**

  ```bash
  npx convex dev --typecheck-only
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add convex/lib/permissions.ts
  git commit -m "feat(permissions): add getScopedDepartmentIds helper for department-level scoping"
  ```

---

### Task 4: Update `convex/contacts.ts` — apply department scope

**Files:**
- Modify: `convex/contacts.ts`

- [ ] **Step 1: Read the current `listForTenant` and `search` handlers**

  Open `convex/contacts.ts` and locate `listForTenant` and `search` query handlers.

- [ ] **Step 2: Import the permissions helper and update `listForTenant`**

  Add this import at the top of `convex/contacts.ts`:
  ```ts
  import { getScopedDepartmentIds } from "./lib/permissions";
  ```

  Replace the `listForTenant` handler body with:
  ```ts
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    const scopedDeptIds = await getScopedDepartmentIds(ctx, tenantId, callerId, orgRole);

    // Agent: filter by assignedAgentId
    if (orgRole === "org:agent") {
      const all = await ctx.db
        .query("contacts")
        .withIndex("by_tenant_archived", (q) =>
          q.eq("tenantId", tenantId).eq("isArchived", args.includeArchived ? undefined as unknown as boolean : false),
        )
        .order("desc")
        .paginate(args.paginationOpts);
      const filtered = all.page.filter((c) => c.assignedAgentId === callerId);
      return { ...all, page: filtered };
    }

    // Supervisor: filter by their departments
    if (scopedDeptIds !== null && orgRole === "org:supervisor") {
      const deptSet = new Set(scopedDeptIds);
      const base = args.includeArchived
        ? await ctx.db
            .query("contacts")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .order("desc")
            .paginate(args.paginationOpts)
        : await ctx.db
            .query("contacts")
            .withIndex("by_tenant_archived", (q) =>
              q.eq("tenantId", tenantId).eq("isArchived", false),
            )
            .order("desc")
            .paginate(args.paginationOpts);
      const filtered = base.page.filter(
        (c) => c.departmentId !== undefined && deptSet.has(c.departmentId),
      );
      return { ...base, page: filtered };
    }

    // Admin: no department filter
    if (args.includeArchived) {
      return ctx.db
        .query("contacts")
        .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return ctx.db
      .query("contacts")
      .withIndex("by_tenant_archived", (q) =>
        q.eq("tenantId", tenantId).eq("isArchived", false),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
  ```

- [ ] **Step 3: Update the `search` handler similarly**

  In the `search` handler, after `getCallerIdentity`, add:
  ```ts
  const scopedDeptIds = await getScopedDepartmentIds(ctx, tenantId, callerId, orgRole);
  const deptSet = scopedDeptIds !== null ? new Set(scopedDeptIds) : null;
  ```

  Then in both result filtering blocks, add an additional check after the `isArchived` filter:
  ```ts
  // If supervisor-scoped, only return contacts in their departments
  if (deptSet !== null) {
    filtered = filtered.filter(
      (c) => c.departmentId !== undefined && deptSet.has(c.departmentId),
    );
  }
  // If agent-scoped, only return their assigned contacts
  if (orgRole === "org:agent") {
    filtered = filtered.filter((c) => c.assignedAgentId === callerId);
  }
  ```

  Note: the existing `filtered` variable in `search` is declared with `const` — change it to `let filtered` when making it mutable.

- [ ] **Step 4: Run type check**

  ```bash
  npx convex dev --typecheck-only
  ```

  Expected: no TypeScript errors. Fix any `Id` type issues — `deptSet.has(c.departmentId)` needs `c.departmentId` to be `Id<"departments">` which it is from the schema.

- [ ] **Step 5: Commit**

  ```bash
  git add convex/contacts.ts
  git commit -m "feat(permissions): scope contacts list/search by department for supervisors"
  ```

---

### Task 5: Update `convex/conversations.ts` — apply department scope

**Files:**
- Modify: `convex/conversations.ts`

- [ ] **Step 1: Read the current `listForCaller` handler**

  Open `convex/conversations.ts` and locate the `listForCaller` query.

- [ ] **Step 2: Import permissions helper and update `listForCaller`**

  Add import at top:
  ```ts
  import { getScopedDepartmentIds } from "./lib/permissions";
  ```

  In `listForCaller`, after the `const { tenantId, callerId, orgRole }` line, add:
  ```ts
  const scopedDeptIds = await getScopedDepartmentIds(ctx, tenantId, callerId, orgRole);
  ```

  In the `isAdminOrSupervisor` block, replace it with separate blocks:

  ```ts
  if (orgRole === "org:admin" || orgRole === "admin") {
    // Admin: no department filter
    if (args.status) {
      conversations = await ctx.db
        .query("conversations")
        .withIndex("by_tenant_status", (q) =>
          q.eq("tenantId", tenantId).eq("status", args.status!),
        )
        .order("desc")
        .collect();
    } else {
      conversations = await ctx.db
        .query("conversations")
        .withIndex("by_last_message", (q) => q.eq("tenantId", tenantId))
        .order("desc")
        .collect();
    }
  } else if (orgRole === "org:supervisor") {
    // Supervisor: scoped to their departments
    const allConversations = args.status
      ? await ctx.db
          .query("conversations")
          .withIndex("by_tenant_status", (q) =>
            q.eq("tenantId", tenantId).eq("status", args.status!),
          )
          .order("desc")
          .collect()
      : await ctx.db
          .query("conversations")
          .withIndex("by_last_message", (q) => q.eq("tenantId", tenantId))
          .order("desc")
          .collect();

    if (scopedDeptIds !== null) {
      const deptSet = new Set(scopedDeptIds);
      conversations = allConversations.filter(
        (c) => c.departmentId !== undefined && deptSet.has(c.departmentId),
      );
    } else {
      conversations = allConversations;
    }
  } else {
    // Agent: scoped to assigned + unassigned
    const assigned = await ctx.db
      .query("conversations")
      .withIndex("by_tenant_agent", (q) =>
        q.eq("tenantId", tenantId).eq("assignedAgentId", callerId),
      )
      .collect();

    const unassigned = await ctx.db
      .query("conversations")
      .withIndex("by_tenant_agent", (q) =>
        q.eq("tenantId", tenantId).eq("assignedAgentId", undefined),
      )
      .collect();

    conversations = [...assigned, ...unassigned];
    conversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

    if (args.status) {
      conversations = conversations.filter((c) => c.status === args.status);
    }
  }
  ```

  Remove the old `isAdminOrSupervisor` helper function from this file (it's replaced by the explicit role checks above). The `if (args.channelId)` filter at the end stays unchanged.

- [ ] **Step 3: Run type check**

  ```bash
  npx convex dev --typecheck-only
  ```

  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add convex/conversations.ts
  git commit -m "feat(permissions): scope conversations list by department for supervisors"
  ```

---

### Task 6: Create `hooks/usePermissions.ts` frontend hook

**Files:**
- Create: `hooks/usePermissions.ts`

- [ ] **Step 1: Check where hooks live**

  The codebase has `app/use-mobile.ts` — place this in `hooks/usePermissions.ts` (create the `hooks/` directory).

- [ ] **Step 2: Create the hook**

  ```ts
  "use client";

  import { useOrganization, useUser } from "@clerk/nextjs";
  import { useQuery } from "convex/react";
  import { api } from "@/convex/_generated/api";
  import type { Id } from "@/convex/_generated/dataModel";

  export type AppRole = "admin" | "supervisor" | "agent" | null;

  interface UsePermissionsResult {
    role: AppRole;
    isAdmin: boolean;
    isSupervisor: boolean;
    isAgent: boolean;
    /**
     * null  → no department filter (admin or agent — agents are filtered by assignedTo server-side)
     * Id[]  → supervisor is scoped to these department ids (may be empty)
     */
    scopedDepartmentIds: Id<"departments">[] | null;
    canAssignSupervisor: boolean;
    canAssignContact: boolean;
    canViewAllConversations: boolean;
    isLoaded: boolean;
  }

  export function usePermissions(): UsePermissionsResult {
    const { membership, isLoaded: orgLoaded } = useOrganization();
    const { user, isLoaded: userLoaded } = useUser();

    const clerkRole = membership?.role ?? null; // "org:admin" | "org:supervisor" | "org:agent"

    let role: AppRole = null;
    if (clerkRole === "org:admin") role = "admin";
    else if (clerkRole === "org:supervisor") role = "supervisor";
    else if (clerkRole === "org:agent") role = "agent";

    const userId = user?.id ?? "";

    const supervisorDepartments = useQuery(
      api.departments.getDepartmentsForSupervisor,
      role === "supervisor" && userId ? { supervisorUserId: userId } : "skip",
    );

    const scopedDepartmentIds: Id<"departments">[] | null =
      role === "supervisor"
        ? (supervisorDepartments?.map((d) => d._id) ?? [])
        : null;

    return {
      role,
      isAdmin: role === "admin",
      isSupervisor: role === "supervisor",
      isAgent: role === "agent",
      scopedDepartmentIds,
      canAssignSupervisor: role === "admin",
      canAssignContact: role === "admin" || role === "supervisor",
      canViewAllConversations: role === "admin" || role === "supervisor",
      isLoaded: orgLoaded && userLoaded,
    };
  }
  ```

- [ ] **Step 3: Verify `api.departments.getDepartmentsForSupervisor` exists in generated API**

  After Task 2 and running `npx convex dev`, the `_generated/api.ts` file will export `api.departments.getDepartmentsForSupervisor`. If you get a TypeScript error here, run `npx convex dev` once to regenerate types.

- [ ] **Step 4: Commit**

  ```bash
  git add hooks/usePermissions.ts
  git commit -m "feat(permissions): add usePermissions hook with department scoping for supervisors"
  ```

---

### Task 7: Admin UI — Departments settings page

**Files:**
- Create: `app/(dashboard)/settings/departments/page.tsx`
- Create: `components/settings/department-supervisor-picker.tsx`

- [ ] **Step 1: Create the supervisor picker component**

  This component shows current supervisors on a department and lets an Admin add/remove them.

  ```tsx
  "use client";

  import { useState } from "react";
  import { useMutation, useQuery } from "convex/react";
  import { api } from "@/convex/_generated/api";
  import type { Id } from "@/convex/_generated/dataModel";
  import { useOrganization } from "@clerk/nextjs";
  import { Button } from "@/components/ui/button";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
  import { Badge } from "@/components/ui/badge";
  import { X } from "lucide-react";

  interface Props {
    departmentId: Id<"departments">;
    currentSupervisors: string[]; // Clerk userIds
  }

  export function DepartmentSupervisorPicker({ departmentId, currentSupervisors }: Props) {
    const { memberships } = useOrganization({ memberships: { pageSize: 50 } });
    const assignSupervisor = useMutation(api.departments.assignSupervisor);
    const removeSupervisor = useMutation(api.departments.removeSupervisor);
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [loading, setLoading] = useState(false);

    const supervisorMembers = memberships?.data?.filter(
      (m) =>
        m.role === "org:supervisor" &&
        currentSupervisors.includes(m.publicUserData?.userId ?? ""),
    ) ?? [];

    const availableSupervisors = memberships?.data?.filter(
      (m) =>
        m.role === "org:supervisor" &&
        !currentSupervisors.includes(m.publicUserData?.userId ?? ""),
    ) ?? [];

    async function handleAdd() {
      if (!selectedUserId) return;
      setLoading(true);
      try {
        await assignSupervisor({ departmentId, supervisorUserId: selectedUserId });
        setSelectedUserId("");
      } finally {
        setLoading(false);
      }
    }

    async function handleRemove(userId: string) {
      await removeSupervisor({ departmentId, supervisorUserId: userId });
    }

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {supervisorMembers.map((m) => (
            <Badge key={m.publicUserData?.userId} variant="secondary" className="flex items-center gap-1">
              {m.publicUserData?.firstName} {m.publicUserData?.lastName}
              <button
                onClick={() => handleRemove(m.publicUserData?.userId ?? "")}
                className="hover:text-destructive"
                aria-label="إزالة المشرف"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {supervisorMembers.length === 0 && (
            <span className="text-sm text-muted-foreground">لا يوجد مشرفون</span>
          )}
        </div>

        {availableSupervisors.length > 0 && (
          <div className="flex items-center gap-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="إضافة مشرف..." />
              </SelectTrigger>
              <SelectContent>
                {availableSupervisors.map((m) => (
                  <SelectItem key={m.publicUserData?.userId} value={m.publicUserData?.userId ?? ""}>
                    {m.publicUserData?.firstName} {m.publicUserData?.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleAdd} disabled={!selectedUserId || loading}>
              إضافة
            </Button>
          </div>
        )}
      </div>
    );
  }
  ```

- [ ] **Step 2: Create the departments settings page**

  ```tsx
  "use client";

  import { useState } from "react";
  import { useMutation, useQuery } from "convex/react";
  import { api } from "@/convex/_generated/api";
  import { usePermissions } from "@/hooks/usePermissions";
  import { DepartmentSupervisorPicker } from "@/components/settings/department-supervisor-picker";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { Trash2 } from "lucide-react";

  export default function DepartmentsPage() {
    const { isAdmin, isLoaded } = usePermissions();
    const departments = useQuery(api.departments.list);
    const createDepartment = useMutation(api.departments.create);
    const removeDepartment = useMutation(api.departments.remove);
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);

    if (!isLoaded) return null;

    if (!isAdmin) {
      return (
        <div className="p-6 text-center text-muted-foreground" dir="rtl">
          غير مصرح لك بالوصول إلى هذه الصفحة
        </div>
      );
    }

    async function handleCreate() {
      if (!newName.trim()) return;
      setCreating(true);
      try {
        await createDepartment({ name: newName.trim() });
        setNewName("");
      } finally {
        setCreating(false);
      }
    }

    async function handleDelete(departmentId: Parameters<typeof removeDepartment>[0]["departmentId"]) {
      await removeDepartment({ departmentId });
    }

    return (
      <div className="p-6 space-y-6 max-w-2xl" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold">الأقسام</h1>
          <p className="text-muted-foreground text-sm mt-1">
            أنشئ أقساماً وعيّن مشرفين لكل قسم. المشرف يرى فقط جهات الاتصال والمحادثات الخاصة بقسمه.
          </p>
        </div>

        {/* Create new department */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="اسم القسم الجديد..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="max-w-xs"
            dir="rtl"
          />
          <Button onClick={handleCreate} disabled={!newName.trim() || creating}>
            إضافة قسم
          </Button>
        </div>

        {/* Department list */}
        <div className="space-y-4">
          {departments === undefined && (
            <p className="text-muted-foreground text-sm">جاري التحميل...</p>
          )}
          {departments?.length === 0 && (
            <p className="text-muted-foreground text-sm">لا توجد أقسام بعد.</p>
          )}
          {departments?.map((dept) => (
            <Card key={dept._id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{dept.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(dept._id)}
                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                    aria-label="حذف القسم"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {dept.description && (
                  <CardDescription>{dept.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium mb-2">المشرفون</p>
                <DepartmentSupervisorPicker
                  departmentId={dept._id}
                  currentSupervisors={dept.supervisors}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 3: Add Departments link to settings sidebar navigation**

  Find where Settings navigation links are defined (likely in `app/(dashboard)/settings/layout.tsx` or a nav component in `components/`). Add:

  ```tsx
  { href: "/settings/departments", label: "الأقسام" }
  ```

  Check the exact nav component first by reading `app/(dashboard)/settings/layout.tsx`.

- [ ] **Step 4: Run the dev server and verify the page loads**

  ```bash
  npm run dev
  ```

  Navigate to `/settings/departments`. Verify:
  - Page renders with RTL layout
  - Admin can create a department
  - Admin can add a supervisor (must have org members with supervisor role)
  - Admin can remove a supervisor

- [ ] **Step 5: Commit**

  ```bash
  git add app/(dashboard)/settings/departments/page.tsx components/settings/department-supervisor-picker.tsx
  git commit -m "feat(departments): add departments settings page with supervisor assignment UI"
  ```

---

### Task 8: Wire `departmentId` on contact create/update

**Files:**
- Modify: `convex/contacts.ts`

When a contact is created or updated, allow setting a `departmentId`. Without this, all contacts will have `departmentId: undefined` and supervisors will see nothing.

- [ ] **Step 1: Update `create` mutation in `convex/contacts.ts`**

  Find the `create` mutation args and handler. Add `departmentId` to the args:
  ```ts
  departmentId: v.optional(v.id("departments")),
  ```

  And pass it to `ctx.db.insert`:
  ```ts
  departmentId: args.departmentId,
  ```

- [ ] **Step 2: Update `update` mutation in `convex/contacts.ts`**

  Find the `update` mutation args. Add:
  ```ts
  departmentId: v.optional(v.id("departments")),
  ```

  In the handler, include it in the patch object:
  ```ts
  ...(args.departmentId !== undefined && { departmentId: args.departmentId }),
  ```

- [ ] **Step 3: Add `departmentId` field to the contact detail UI**

  In the contact editing UI (wherever contacts are edited — check `app/(dashboard)/contacts/` or `components/contacts/`), add a department selector if the caller `isAdmin` or `isSupervisor`. Use `useQuery(api.departments.list)` to populate the select options.

  Find the relevant component first:
  ```bash
  # Run this in terminal to find the contact edit form
  grep -r "customName\|assignedAgentId" app/ components/ --include="*.tsx" -l
  ```

  Once found, add a `<Select>` for `departmentId` using the departments list.

- [ ] **Step 4: Run type check**

  ```bash
  npx convex dev --typecheck-only
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add convex/contacts.ts
  git commit -m "feat(departments): add departmentId to contact create/update mutations"
  ```

---

### Task 9: Update PROGRESS.md

**Files:**
- Modify: `PROGRESS.md`

- [ ] **Step 1: Add entry to PROGRESS.md**

  Append at the end of PROGRESS.md:

  ```markdown
  ---

  ### Supervisor Department Scoping
  - **Status:** Done
  - **What was built:** Department-level permissions — Supervisors see only contacts/conversations in their assigned departments. Admins see everything. Agents still scoped by assignedTo.
  - **Key additions:**
    - `departments` table in Convex schema (supervisors: string[] of Clerk userIds)
    - `departmentId: optional` on `contacts` and `conversations` tables
    - `convex/departments.ts` — CRUD + assignSupervisor/removeSupervisor/getDepartmentsForSupervisor
    - `convex/lib/permissions.ts` — `getScopedDepartmentIds` helper
    - `hooks/usePermissions.ts` — React hook for role + scopedDepartmentIds
    - `app/(dashboard)/settings/departments/page.tsx` — Admin UI for department management
    - All server-side scoping enforced in Convex queries (contacts + conversations)
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add PROGRESS.md
  git commit -m "docs: update PROGRESS.md — supervisor department scoping complete"
  ```

---

## Self-Review

### Spec Coverage Check

| Spec Section | Covered? | Task |
|---|---|---|
| Add `supervisors` array to `departments` table | ✅ | Task 1 |
| Add `departmentId` to `contacts` | ✅ | Task 1 |
| Add `by_org_department` index on contacts | ✅ | Task 1 |
| Add `departmentId` to `conversations` | ✅ | Task 1 |
| `assignSupervisor` mutation (Admin only) | ✅ | Task 2 |
| `removeSupervisor` mutation (Admin only) | ✅ | Task 2 |
| `getDepartmentsForSupervisor` query | ✅ | Task 2 |
| `convex/lib/permissions.ts` with `getScopedDepartmentIds` | ✅ | Task 3 |
| Admin → null, Supervisor → array, Agent → null | ✅ | Task 3 |
| Update `listByOrg`/contacts list query | ✅ | Task 4 |
| Update conversations list query | ✅ | Task 5 |
| `hooks/usePermissions.ts` with `scopedDepartmentIds` | ✅ | Task 6 |
| Admin UI: assign supervisor to department | ✅ | Task 7 |
| `followUps` scoping | ⚠️ Deferred — followUps table doesn't exist yet |
| PROGRESS.md update | ✅ | Task 9 |

### Placeholder Scan
- No TBD, TODO, or "implement later" found
- All code blocks contain complete implementations
- All file paths are absolute and specific

### Type Consistency
- `Id<"departments">` used consistently in schema, permissions helper, hook, and picker
- `getScopedDepartmentIds` returns `Id<"departments">[] | null` and is consumed as `Set<Id<"departments">>` in queries — consistent
- `api.departments.assignSupervisor` / `removeSupervisor` / `getDepartmentsForSupervisor` are the exact export names from Task 2 and referenced in Task 6 and Task 7 — consistent
- `orgRole` values `"org:admin"`, `"org:supervisor"`, `"org:agent"` match the existing `OrgRole` type in `convex/lib/auth.ts` — consistent
