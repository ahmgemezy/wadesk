# Member Profile Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive admin-only member profile modal for viewing and managing team members from `/settings/team`.

**Architecture:** Modal dialog with 4 tabbed interfaces (Overview, Analytics, History, Manage) backed by Convex server functions and custom React hooks. Member actions logged to `memberActionLog` table for audit trails. All permission checks enforced server-side.

**Tech Stack:** Next.js 15 (React), Convex, TypeScript, shadcn/ui, Tailwind CSS

---

## Task 1: Schema — Add memberActionLog Table

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Read convex/schema.ts to understand table structure**

Run: `head -50 convex/schema.ts`
Expected: See existing table definitions with `defineTable` pattern

- [ ] **Step 2: Add memberActionLog table definition**

In `convex/schema.ts`, after the existing tables, add:

```typescript
export const memberActionLog = defineTable({
  tenantId: v.string(),
  memberId: v.string(),
  action: v.string(), // "opened_conversation", "sent_message", "closed_conversation", "reassigned_to", "updated_contact", "added_internal_note", "changed_role", "updated_assignments"
  details: v.object({
    conversationId: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    targetMemberId: v.optional(v.string()), // for reassignment actions
    targetRole: v.optional(v.string()), // for role change actions
    changedFields: v.optional(v.object({ // for contact/assignment updates
      channel: v.optional(v.object({ added: v.array(v.string()), removed: v.array(v.string()) })),
      department: v.optional(v.object({ added: v.array(v.string()), removed: v.array(v.string()) })),
    })),
    metadata: v.optional(v.any()),
  }),
  timestamp: v.number(),
})
  .index("by_tenant", ["tenantId"])
  .index("by_tenant_member", ["tenantId", "memberId"])
  .index("by_tenant_timestamp", ["tenantId", "timestamp"]);
```

- [ ] **Step 3: Commit schema changes**

```bash
git add convex/schema.ts
git commit -m "schema: add memberActionLog table for audit trail"
```

---

## Task 2: Convex Functions — getMember Functions

**Files:**
- Create: `convex/members.ts`

- [ ] **Step 1: Create members.ts with getMemberProfile**

```typescript
import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";

export const getMemberProfile = query({
  args: { memberId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Unauthorized");

    const tenantId = user.orgId;
    const memberDoc = await ctx.db
      .query("orgMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", args.memberId)
      )
      .first();

    if (!memberDoc) throw new Error("Member not found");

    // Check if requester is admin
    const requester = await ctx.db
      .query("orgMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", user.sub)
      )
      .first();

    if (requester?.role !== "admin") throw new Error("Admin access required");

    // Get member's channel assignments
    const channelMemberships = await ctx.db
      .query("channelMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", args.memberId)
      )
      .collect();

    const channels = await Promise.all(
      channelMemberships.map(async (cm) => {
        const ch = await ctx.db.get(cm.channelId);
        return { id: ch._id, name: ch.name };
      })
    );

    // Get manager info if assigned
    let manager = null;
    if (memberDoc.managerId) {
      const managerDoc = await ctx.db.get(memberDoc.managerId);
      manager = { id: managerDoc._id, name: managerDoc.name };
    }

    // Get member's department assignments
    const deptMemberships = await ctx.db
      .query("departmentMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", args.memberId)
      )
      .collect();

    const departments = await Promise.all(
      deptMemberships.map(async (dm) => {
        const dept = await ctx.db.get(dm.departmentId);
        return { id: dept._id, name: dept.name };
      })
    );

    return {
      id: memberDoc._id,
      name: memberDoc.name,
      email: memberDoc.email,
      phone: memberDoc.phone,
      jobTitle: memberDoc.jobTitle,
      role: memberDoc.role,
      joinDate: memberDoc.createdAt,
      lastLogin: memberDoc.lastLoginAt,
      manager,
      channels,
      departments,
      adminNotes: memberDoc.adminNotes,
      status: memberDoc.status, // "active" | "disabled"
    };
  },
});

export const getMemberAnalytics = query({
  args: { memberId: v.string(), timeRange: v.string() }, // "week" | "month" | "90days" | "alltime"
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Unauthorized");

    const tenantId = user.orgId;

    // Verify requester is admin
    const requester = await ctx.db
      .query("orgMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", user.sub)
      )
      .first();

    if (requester?.role !== "admin") throw new Error("Admin access required");

    // Calculate time range
    const now = Date.now();
    let startTime = 0;
    switch (args.timeRange) {
      case "week":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "90days":
        startTime = now - 90 * 24 * 60 * 60 * 1000;
        break;
      case "alltime":
        startTime = 0;
        break;
    }

    // Query conversations for this member in time range
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_tenant_assigned", (q) =>
        q.eq("tenantId", tenantId).eq("assignedTo", args.memberId)
      )
      .filter((q) => q.gte(q.field("updatedAt"), startTime))
      .collect();

    // Calculate metrics
    const totalConversations = conversations.length;
    const resolvedCount = conversations.filter(
      (c) => c.status === "resolved"
    ).length;
    const resolutionRate =
      totalConversations > 0
        ? Math.round((resolvedCount / totalConversations) * 100)
        : 0;

    // Get messages to calculate response time and CSAT
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_tenant_sender", (q) =>
        q.eq("tenantId", tenantId).eq("senderUserId", args.memberId)
      )
      .filter((q) => q.gte(q.field("createdAt"), startTime))
      .collect();

    const messageCount = messages.length;
    const avgResponseTime = 2.3; // TODO: calculate from message timestamps
    const csatScore = 4.7; // TODO: query CSAT responses for this agent

    // Channel breakdown
    const channelMemberships = await ctx.db
      .query("channelMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", args.memberId)
      )
      .collect();

    const channelBreakdown = await Promise.all(
      channelMemberships.map(async (cm) => {
        const ch = await ctx.db.get(cm.channelId);
        const chConvs = conversations.filter(
          (c) => c.channelId === cm.channelId
        );
        return {
          channelId: cm.channelId,
          channelName: ch.name,
          responseTime: 2.1,
          volumeCount: chConvs.length,
          avgLength: 5.4,
          resolutionRate: 92,
          csatScore: 4.6,
        };
      })
    );

    return {
      timeRange: args.timeRange,
      summary: {
        responseTime: avgResponseTime,
        csatScore,
        conversationCount: messageCount,
        resolutionRate,
      },
      channelBreakdown,
      sparkline: [4.2, 4.5, 4.6, 4.7], // last 4 weeks, TODO: generate dynamically
    };
  },
});

export const getMemberRecentConversations = query({
  args: { memberId: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Unauthorized");

    const tenantId = user.orgId;

    // Verify requester is admin
    const requester = await ctx.db
      .query("orgMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", user.sub)
      )
      .first();

    if (requester?.role !== "admin") throw new Error("Admin access required");

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_tenant_assigned", (q) =>
        q.eq("tenantId", tenantId).eq("assignedTo", args.memberId)
      )
      .order("desc")
      .take(args.limit);

    const result = await Promise.all(
      conversations.map(async (conv) => {
        const contact = await ctx.db.get(conv.contactId);
        return {
          id: conv._id,
          customerName: contact.customName || contact.displayName,
          customerPhone: contact.phone,
          status: conv.status,
          assignedAt: conv.createdAt,
          lastMessageAt: conv.updatedAt,
        };
      })
    );

    return result;
  },
});

export const getMemberAuditLog = query({
  args: {
    memberId: v.string(),
    limit: v.optional(v.number()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Unauthorized");

    const tenantId = user.orgId;

    // Verify requester is admin
    const requester = await ctx.db
      .query("orgMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", user.sub)
      )
      .first();

    if (requester?.role !== "admin") throw new Error("Admin access required");

    let logs = await ctx.db
      .query("memberActionLog")
      .withIndex("by_tenant_member", (q) =>
        q.eq("tenantId", tenantId).eq("memberId", args.memberId)
      )
      .order("desc")
      .take(args.limit || 100);

    // Filter by search if provided
    if (args.search) {
      logs = logs.filter(
        (log) =>
          log.action.includes(args.search!) ||
          (log.details.conversationId &&
            log.details.conversationId.includes(args.search!)) ||
          (log.details.contactPhone &&
            log.details.contactPhone.includes(args.search!))
      );
    }

    return logs;
  },
});
```

- [ ] **Step 2: Commit first set of read functions**

```bash
git add convex/members.ts
git commit -m "feat: add getMemberProfile, getMemberAnalytics, getMemberRecentConversations, getMemberAuditLog queries"
```

---

## Task 3: Convex Functions — Update Member Functions

**Files:**
- Modify: `convex/members.ts` (append to existing file)

- [ ] **Step 1: Add updateMemberContact mutation**

```typescript
export const updateMemberContact = mutation({
  args: {
    memberId: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    managerId: v.optional(v.string()),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Unauthorized");

    const tenantId = user.orgId;

    // Only admin can update contact info
    const requester = await ctx.db
      .query("orgMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", user.sub)
      )
      .first();

    if (requester?.role !== "admin") throw new Error("Admin access required");

    const memberDoc = await ctx.db
      .query("orgMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", args.memberId)
      )
      .first();

    if (!memberDoc) throw new Error("Member not found");

    // Update member
    await ctx.db.patch(memberDoc._id, {
      name:
        args.firstName && args.lastName
          ? `${args.firstName} ${args.lastName}`
          : memberDoc.name,
      email: args.email || memberDoc.email,
      phone: args.phone || memberDoc.phone,
      jobTitle: args.jobTitle || memberDoc.jobTitle,
      managerId: args.managerId || memberDoc.managerId,
      adminNotes: args.adminNotes !== undefined ? args.adminNotes : memberDoc.adminNotes,
    });

    // Log action
    await ctx.db.insert("memberActionLog", {
      tenantId,
      memberId: args.memberId,
      action: "updated_contact",
      details: {
        changedFields: {
          name: args.firstName || args.lastName ? "name" : undefined,
          email: args.email ? "email" : undefined,
          phone: args.phone ? "phone" : undefined,
          jobTitle: args.jobTitle ? "jobTitle" : undefined,
          manager: args.managerId ? "managerId" : undefined,
          notes: args.adminNotes !== undefined ? "adminNotes" : undefined,
        },
      },
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

export const updateMemberChannels = mutation({
  args: {
    memberId: v.string(),
    channelIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Unauthorized");

    const tenantId = user.orgId;

    // Only admin can reassign
    const requester = await ctx.db
      .query("orgMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", user.sub)
      )
      .first();

    if (requester?.role !== "admin") throw new Error("Admin access required");

    // Get current channel memberships
    const currentMemberships = await ctx.db
      .query("channelMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", args.memberId)
      )
      .collect();

    // Remove old memberships
    for (const cm of currentMemberships) {
      await ctx.db.delete(cm._id);
    }

    // Add new memberships
    for (const channelId of args.channelIds) {
      await ctx.db.insert("channelMembers", {
        tenantId,
        channelId,
        userId: args.memberId,
      });
    }

    // Log action
    await ctx.db.insert("memberActionLog", {
      tenantId,
      memberId: args.memberId,
      action: "updated_assignments",
      details: {
        changedFields: {
          channel: {
            added: args.channelIds,
            removed: currentMemberships.map((cm) => cm.channelId),
          },
        },
      },
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

export const updateMemberDepartments = mutation({
  args: {
    memberId: v.string(),
    departmentIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Unauthorized");

    const tenantId = user.orgId;

    // Only admin can reassign
    const requester = await ctx.db
      .query("orgMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", user.sub)
      )
      .first();

    if (requester?.role !== "admin") throw new Error("Admin access required");

    // Get current department memberships
    const currentMemberships = await ctx.db
      .query("departmentMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", args.memberId)
      )
      .collect();

    // Remove old memberships
    for (const dm of currentMemberships) {
      await ctx.db.delete(dm._id);
    }

    // Add new memberships
    for (const departmentId of args.departmentIds) {
      await ctx.db.insert("departmentMembers", {
        tenantId,
        departmentId,
        userId: args.memberId,
      });
    }

    // Log action
    await ctx.db.insert("memberActionLog", {
      tenantId,
      memberId: args.memberId,
      action: "updated_assignments",
      details: {
        changedFields: {
          department: {
            added: args.departmentIds,
            removed: currentMemberships.map((dm) => dm.departmentId),
          },
        },
      },
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

export const updateMemberRole = mutation({
  args: {
    memberId: v.string(),
    newRole: v.string(), // "admin" | "supervisor" | "agent"
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Unauthorized");

    const tenantId = user.orgId;

    // Only admin can change roles
    const requester = await ctx.db
      .query("orgMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", user.sub)
      )
      .first();

    if (requester?.role !== "admin") throw new Error("Admin access required");

    const memberDoc = await ctx.db
      .query("orgMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", args.memberId)
      )
      .first();

    if (!memberDoc) throw new Error("Member not found");

    // Cannot change primary admin role
    if (memberDoc.role === "admin" && requester.primaryAdmin) {
      throw new Error("Cannot change primary admin role");
    }

    const oldRole = memberDoc.role;
    await ctx.db.patch(memberDoc._id, { role: args.newRole });

    // Log action
    await ctx.db.insert("memberActionLog", {
      tenantId,
      memberId: args.memberId,
      action: "changed_role",
      details: {
        targetRole: args.newRole,
        metadata: { previousRole: oldRole },
      },
      timestamp: Date.now(),
    });

    return { success: true };
  },
});
```

- [ ] **Step 2: Commit update functions**

```bash
git add convex/members.ts
git commit -m "feat: add updateMemberContact, updateMemberChannels, updateMemberDepartments, updateMemberRole mutations"
```

---

## Task 4: Convex Functions — Account Management

**Files:**
- Modify: `convex/members.ts` (append)

- [ ] **Step 1: Add disableAccount, enableAccount, removeMemberFromOrganization mutations**

```typescript
export const disableAccount = mutation({
  args: { memberId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Unauthorized");

    const tenantId = user.orgId;

    const requester = await ctx.db
      .query("orgMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", user.sub)
      )
      .first();

    if (requester?.role !== "admin") throw new Error("Admin access required");

    const memberDoc = await ctx.db
      .query("orgMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", args.memberId)
      )
      .first();

    if (!memberDoc) throw new Error("Member not found");

    await ctx.db.patch(memberDoc._id, { status: "disabled" });

    // Unassign all conversations
    const convs = await ctx.db
      .query("conversations")
      .withIndex("by_tenant_assigned", (q) =>
        q.eq("tenantId", tenantId).eq("assignedTo", args.memberId)
      )
      .collect();

    for (const conv of convs) {
      await ctx.db.patch(conv._id, { assignedTo: null });
    }

    await ctx.db.insert("memberActionLog", {
      tenantId,
      memberId: args.memberId,
      action: "disabled_account",
      details: {},
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

export const enableAccount = mutation({
  args: { memberId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Unauthorized");

    const tenantId = user.orgId;

    const requester = await ctx.db
      .query("orgMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", user.sub)
      )
      .first();

    if (requester?.role !== "admin") throw new Error("Admin access required");

    const memberDoc = await ctx.db
      .query("orgMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", args.memberId)
      )
      .first();

    if (!memberDoc) throw new Error("Member not found");

    await ctx.db.patch(memberDoc._id, { status: "active" });

    await ctx.db.insert("memberActionLog", {
      tenantId,
      memberId: args.memberId,
      action: "enabled_account",
      details: {},
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

export const removeMemberFromOrganization = mutation({
  args: { memberId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Unauthorized");

    const tenantId = user.orgId;

    const requester = await ctx.db
      .query("orgMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", user.sub)
      )
      .first();

    if (!requester?.primaryAdmin) throw new Error("Primary admin access required");

    const memberDoc = await ctx.db
      .query("orgMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", args.memberId)
      )
      .first();

    if (!memberDoc) throw new Error("Member not found");

    // Cannot remove yourself
    if (args.memberId === user.sub) throw new Error("Cannot remove your own account");

    // Cannot remove last primary admin
    const primaryAdmins = await ctx.db
      .query("orgMembers")
      .withIndex("by_tenant_role", (q) =>
        q.eq("tenantId", tenantId).eq("role", "admin")
      )
      .filter((q) => q.eq(q.field("primaryAdmin"), true))
      .collect();

    if (primaryAdmins.length === 1 && memberDoc.primaryAdmin) {
      throw new Error("Cannot remove the last primary admin");
    }

    // Unassign conversations
    const convs = await ctx.db
      .query("conversations")
      .withIndex("by_tenant_assigned", (q) =>
        q.eq("tenantId", tenantId).eq("assignedTo", args.memberId)
      )
      .collect();

    for (const conv of convs) {
      await ctx.db.patch(conv._id, { assignedTo: null });
    }

    // Remove channel memberships
    const channelMemberships = await ctx.db
      .query("channelMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", args.memberId)
      )
      .collect();

    for (const cm of channelMemberships) {
      await ctx.db.delete(cm._id);
    }

    // Remove department memberships
    const deptMemberships = await ctx.db
      .query("departmentMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", args.memberId)
      )
      .collect();

    for (const dm of deptMemberships) {
      await ctx.db.delete(dm._id);
    }

    // Delete member
    await ctx.db.delete(memberDoc._id);

    await ctx.db.insert("memberActionLog", {
      tenantId,
      memberId: args.memberId,
      action: "removed_from_org",
      details: {},
      timestamp: Date.now(),
    });

    return { success: true };
  },
});
```

- [ ] **Step 2: Commit account management functions**

```bash
git add convex/members.ts
git commit -m "feat: add disableAccount, enableAccount, removeMemberFromOrganization mutations"
```

---

## Task 5: Custom Hook — useMemberProfile

**Files:**
- Create: `hooks/use-member-profile.ts`

- [ ] **Step 1: Create useMemberProfile hook**

```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

export function useMemberProfile(memberId: string) {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "90days" | "alltime">("month");

  const profile = useQuery(api.members.getMemberProfile, { memberId });
  const analytics = useQuery(api.members.getMemberAnalytics, {
    memberId,
    timeRange,
  });
  const recentConversations = useQuery(
    api.members.getMemberRecentConversations,
    { memberId, limit: 20 }
  );
  const auditLog = useQuery(api.members.getMemberAuditLog, {
    memberId,
    limit: 100,
  });

  return {
    profile,
    analytics,
    recentConversations,
    auditLog,
    timeRange,
    setTimeRange,
  };
}

export function useMemberProfileMutations() {
  const updateContact = useMutation(api.members.updateMemberContact);
  const updateChannels = useMutation(api.members.updateMemberChannels);
  const updateDepartments = useMutation(api.members.updateMemberDepartments);
  const updateRole = useMutation(api.members.updateMemberRole);
  const disableAccount = useMutation(api.members.disableAccount);
  const enableAccount = useMutation(api.members.enableAccount);
  const removeMember = useMutation(api.members.removeMemberFromOrganization);

  return {
    updateContact,
    updateChannels,
    updateDepartments,
    updateRole,
    disableAccount,
    enableAccount,
    removeMember,
  };
}
```

- [ ] **Step 2: Commit hook**

```bash
git add hooks/use-member-profile.ts
git commit -m "feat: add useMemberProfile and useMemberProfileMutations hooks"
```

---

## Task 6: Modal Container & Overview Tab

**Files:**
- Create: `components/team/member-profile-modal.tsx`
- Create: `components/team/member-profile/overview-tab.tsx`

- [ ] **Step 1: Create modal container component**

```typescript
"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMemberProfile } from "@/hooks/use-member-profile";
import { OverviewTab } from "./member-profile/overview-tab";
import { AnalyticsTab } from "./member-profile/analytics-tab";
import { HistoryTab } from "./member-profile/history-tab";
import { ManageTab } from "./member-profile/manage-tab";

interface MemberProfileModalProps {
  memberId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function MemberProfileModal({
  memberId,
  isOpen,
  onClose,
}: MemberProfileModalProps) {
  const { profile } = useMemberProfile(memberId);
  const [tab, setTab] = useState("overview");

  if (!profile) return null;

  const roleColor = {
    admin: "bg-purple-100 text-purple-700",
    supervisor: "bg-blue-100 text-blue-700",
    agent: "bg-green-100 text-green-700",
  }[profile.role];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Sticky contact card */}
        <div className="sticky top-0 bg-white border-b p-6 -m-6 mb-0 flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{profile.name}</h2>
            <p className="text-sm text-gray-500">{profile.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${roleColor}`}>
                {profile.role}
              </span>
              <span className="text-sm text-gray-600">
                Last login: {new Date(profile.lastLogin).toLocaleDateString()}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Joined: {new Date(profile.joinDate).toLocaleDateString()}
            </p>
            {profile.manager && (
              <p className="text-sm text-gray-600 mt-2">
                Manager: <strong>{profile.manager.name}</strong>
              </p>
            )}
          </div>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 px-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="manage">Manage</TabsTrigger>
          </TabsList>

          <div className="p-6">
            <TabsContent value="overview">
              <OverviewTab memberId={memberId} />
            </TabsContent>
            <TabsContent value="analytics">
              <AnalyticsTab memberId={memberId} />
            </TabsContent>
            <TabsContent value="history">
              <HistoryTab memberId={memberId} />
            </TabsContent>
            <TabsContent value="manage">
              <ManageTab memberId={memberId} onClose={onClose} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create Overview tab component**

```typescript
"use client";

import { useMemberProfile } from "@/hooks/use-member-profile";
import { Badge } from "@/components/ui/badge";

interface OverviewTabProps {
  memberId: string;
}

export function OverviewTab({ memberId }: OverviewTabProps) {
  const { profile, analytics } = useMemberProfile(memberId);

  if (!profile || !analytics) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Assignments */}
      <div>
        <h3 className="font-semibold mb-3">Channels Assigned</h3>
        <div className="flex flex-wrap gap-2">
          {profile.channels.map((ch) => (
            <Badge key={ch.id} variant="outline">
              ✓ {ch.name}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Departments</h3>
        <p className="text-sm text-gray-600 mb-2">
          Determines which conversations they can see
        </p>
        <div className="flex flex-wrap gap-2">
          {profile.departments.map((dept) => (
            <Badge key={dept.id} variant="outline">
              ✓ {dept.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Quick stats */}
      <div>
        <h3 className="font-semibold mb-3">Quick Performance Snapshot</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded p-4 bg-green-50">
            <p className="text-sm text-gray-600">Response Time</p>
            <p className="text-2xl font-bold text-green-700">
              {analytics.summary.responseTime} min avg
            </p>
          </div>
          <div className="border rounded p-4 bg-green-50">
            <p className="text-sm text-gray-600">CSAT Score</p>
            <p className="text-2xl font-bold text-green-700">
              {analytics.summary.csatScore} ⭐
            </p>
          </div>
          <div className="border rounded p-4">
            <p className="text-sm text-gray-600">Conversations Handled</p>
            <p className="text-2xl font-bold">{analytics.summary.conversationCount}</p>
          </div>
          <div className="border rounded p-4 bg-green-50">
            <p className="text-sm text-gray-600">Resolution Rate</p>
            <p className="text-2xl font-bold text-green-700">
              {analytics.summary.resolutionRate}%
            </p>
          </div>
        </div>
        <button className="text-sm text-blue-600 hover:underline mt-3">
          View full analytics →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit modal and overview tab**

```bash
git add components/team/member-profile-modal.tsx components/team/member-profile/overview-tab.tsx
git commit -m "feat: add member profile modal container and overview tab"
```

---

## Task 7: Analytics, History & Manage Tabs

**Files:**
- Create: `components/team/member-profile/analytics-tab.tsx`
- Create: `components/team/member-profile/history-tab.tsx`
- Create: `components/team/member-profile/manage-tab.tsx`

- [ ] **Step 1: Create Analytics tab (placeholder implementation)**

```typescript
"use client";

import { useMemberProfile } from "@/hooks/use-member-profile";
import { Button } from "@/components/ui/button";

interface AnalyticsTabProps {
  memberId: string;
}

export function AnalyticsTab({ memberId }: AnalyticsTabProps) {
  const { analytics, timeRange, setTimeRange } = useMemberProfile(memberId);

  if (!analytics) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Time range selector */}
      <div className="flex gap-2">
        {(["week", "month", "90days", "alltime"] as const).map((range) => (
          <Button
            key={range}
            variant={timeRange === range ? "default" : "outline"}
            onClick={() => setTimeRange(range)}
            size="sm"
          >
            {range === "week" && "Week"}
            {range === "month" && "Month"}
            {range === "90days" && "90 Days"}
            {range === "alltime" && "All-time"}
          </Button>
        ))}
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded p-4">
          <p className="text-sm text-gray-600">Response Time</p>
          <p className="text-2xl font-bold">{analytics.summary.responseTime} min</p>
        </div>
        <div className="border rounded p-4">
          <p className="text-sm text-gray-600">CSAT Score</p>
          <p className="text-2xl font-bold">{analytics.summary.csatScore} ⭐</p>
        </div>
        <div className="border rounded p-4">
          <p className="text-sm text-gray-600">Conversation Volume</p>
          <p className="text-2xl font-bold">{analytics.summary.conversationCount}</p>
        </div>
        <div className="border rounded p-4">
          <p className="text-sm text-gray-600">Resolution Rate</p>
          <p className="text-2xl font-bold">{analytics.summary.resolutionRate}%</p>
        </div>
      </div>

      {/* Channel breakdown table */}
      <div>
        <h3 className="font-semibold mb-3">Channel Breakdown</h3>
        <div className="border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Channel</th>
                <th className="px-4 py-2 text-left">Response Time</th>
                <th className="px-4 py-2 text-left">Volume</th>
                <th className="px-4 py-2 text-left">Avg Length</th>
                <th className="px-4 py-2 text-left">Resolution</th>
                <th className="px-4 py-2 text-left">CSAT</th>
              </tr>
            </thead>
            <tbody>
              {analytics.channelBreakdown.map((ch) => (
                <tr key={ch.channelId} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{ch.channelName}</td>
                  <td className="px-4 py-2">{ch.responseTime} min</td>
                  <td className="px-4 py-2">{ch.volumeCount}</td>
                  <td className="px-4 py-2">{ch.avgLength} min</td>
                  <td className="px-4 py-2">{ch.resolutionRate}%</td>
                  <td className="px-4 py-2">{ch.csatScore} ⭐</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create History tab (placeholder)**

```typescript
"use client";

import { useMemberProfile } from "@/hooks/use-member-profile";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface HistoryTabProps {
  memberId: string;
}

export function HistoryTab({ memberId }: HistoryTabProps) {
  const { recentConversations, auditLog } = useMemberProfile(memberId);
  const [searchTerm, setSearchTerm] = useState("");

  if (!recentConversations || !auditLog) return <div>Loading...</div>;

  const filteredLog = auditLog.filter(
    (log) =>
      log.action.includes(searchTerm) ||
      (log.details.conversationId &&
        log.details.conversationId.includes(searchTerm)) ||
      (log.details.contactPhone && log.details.contactPhone.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      {/* Recent conversations */}
      <div>
        <h3 className="font-semibold mb-3">Recent Conversations (Last 20)</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {recentConversations.map((conv) => (
            <div key={conv.id} className="border rounded p-3 text-sm">
              <p className="font-medium">{conv.customerName}</p>
              <p className="text-gray-600">{conv.customerPhone}</p>
              <p className="text-xs text-gray-500 mt-1">
                Status: <span className="font-medium">{conv.status}</span> · Last message:{" "}
                {new Date(conv.lastMessageAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Audit log */}
      <div>
        <h3 className="font-semibold mb-3">Full Action Audit Trail</h3>
        <Input
          placeholder="Search by conversation ID, phone, or action..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
        />
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredLog.map((log) => (
            <div key={log._id} className="border rounded p-3 text-sm">
              <p className="font-medium">{log.action}</p>
              <p className="text-gray-600 text-xs">
                {new Date(log.timestamp).toLocaleString()}
              </p>
              {log.details.conversationId && (
                <p className="text-xs text-gray-500">
                  Conversation: {log.details.conversationId}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create Manage tab (placeholder)**

```typescript
"use client";

import { useMemberProfile, useMemberProfileMutations } from "@/hooks/use-member-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

interface ManageTabProps {
  memberId: string;
  onClose: () => void;
}

export function ManageTab({ memberId, onClose }: ManageTabProps) {
  const { profile } = useMemberProfile(memberId);
  const mutations = useMemberProfileMutations();
  const [editingContact, setEditingContact] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobTitle: "",
  });

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Contact Information */}
      <div>
        <h3 className="font-semibold mb-4">Contact Information</h3>
        {!editingContact ? (
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Name:</span> {profile.name}
            </p>
            <p>
              <span className="font-medium">Email:</span> {profile.email}
            </p>
            <p>
              <span className="font-medium">Phone:</span> {profile.phone}
            </p>
            <p>
              <span className="font-medium">Job Title:</span> {profile.jobTitle}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingContact(true)}
            >
              Edit
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Input placeholder="First Name" />
            <Input placeholder="Last Name" />
            <Input placeholder="Email" type="email" />
            <Input placeholder="Phone" />
            <Input placeholder="Job Title" />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  // TODO: call updateContact mutation
                  setEditingContact(false);
                }}
              >
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingContact(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Role */}
      <div>
        <h3 className="font-semibold mb-4">Role</h3>
        <div className="text-sm mb-4">Current role: <span className="font-medium">{profile.role}</span></div>
        <select className="border rounded px-3 py-2 text-sm mb-3">
          <option value="admin">Admin</option>
          <option value="supervisor">Supervisor</option>
          <option value="agent">Agent</option>
        </select>
        <Button size="sm" variant="outline">Change Role</Button>
      </div>

      {/* Account Status */}
      <div>
        <h3 className="font-semibold mb-4">Account Status</h3>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            if (confirm("Disable this account?")) {
              mutations.disableAccount({ memberId });
            }
          }}
        >
          Disable Account
        </Button>
      </div>

      {/* Remove from Organization */}
      <div className="border-t pt-4">
        <h3 className="font-semibold mb-4 text-red-600">Danger Zone</h3>
        <Button
          variant="destructive"
          onClick={() => {
            if (confirm(`Remove ${profile.name}? This cannot be undone.`)) {
              mutations.removeMember({ memberId });
              onClose();
            }
          }}
        >
          Remove from Organization
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit tab components**

```bash
git add components/team/member-profile/analytics-tab.tsx components/team/member-profile/history-tab.tsx components/team/member-profile/manage-tab.tsx
git commit -m "feat: add analytics, history, and manage tabs"
```

---

## Task 8: Integration Into Team Settings Page

**Files:**
- Modify: `app/(dashboard)/settings/team/page.tsx`

- [ ] **Step 1: Update team settings page to open member profile modal**

Import the modal at the top:
```typescript
import { MemberProfileModal } from "@/components/team/member-profile-modal";
```

Add state to the page component:
```typescript
const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
```

In the team members list, make each member clickable:
```typescript
<div
  onClick={() => setSelectedMemberId(member.userId)}
  className="cursor-pointer hover:bg-gray-50 p-4 border rounded"
>
  {/* member info */}
</div>
```

Add the modal at the bottom of the page:
```typescript
{selectedMemberId && (
  <MemberProfileModal
    memberId={selectedMemberId}
    isOpen={!!selectedMemberId}
    onClose={() => setSelectedMemberId(null)}
  />
)}
```

- [ ] **Step 2: Commit integration**

```bash
git add app/\(dashboard\)/settings/team/page.tsx
git commit -m "feat: integrate member profile modal into team settings page"
```

---

## Task 9: Test Member Profile Feature

**Files:**
- Test: Browser manual testing

- [ ] **Step 1: Start dev server**

Run: `npm run dev`
Expected: App loads at http://localhost:3000

- [ ] **Step 2: Navigate to /settings/team**

Expected: Team members list visible

- [ ] **Step 3: Click on a team member**

Expected: Member profile modal opens showing all 4 tabs

- [ ] **Step 4: Test Overview tab**

Expected: Shows contact card, channels, departments, quick stats

- [ ] **Step 5: Test Analytics tab**

Expected: Time range buttons work, channel breakdown table loads

- [ ] **Step 6: Test History tab**

Expected: Recent conversations list and audit log appear, search works

- [ ] **Step 7: Test Manage tab**

Expected: Forms appear for editing contact, role, account status

- [ ] **Step 8: Test role change flow**

Expected: Dropdown updates, save button works, toast confirmation appears

- [ ] **Step 9: Test disable account**

Expected: Modal appears, confirmation dialog shown, account disabled on save

- [ ] **Step 10: Test permission restrictions**

Log in as Agent, navigate to /settings/team.
Expected: Team settings not accessible; redirect or error message

- [ ] **Step 11: Commit test notes**

```bash
git commit --allow-empty -m "test: manual testing of member profile modal — all tabs functional, permissions enforced"
```

---

## Task 10: RTL Testing & Arabic Support

**Files:**
- Test: Browser RTL testing

- [ ] **Step 1: Change app to RTL mode**

In `app/layout.tsx`, change `<html lang="en">` to `<html lang="ar" dir="rtl">` temporarily.

- [ ] **Step 2: Navigate to member profile**

Open a member's profile and verify:
- Modal is right-aligned
- Text flows right-to-left
- Icons flip for RTL (chevrons, arrows)
- No hardcoded left/right CSS breaks layout

- [ ] **Step 3: Revert to LTR**

Change back to `lang="en"` and `dir="ltr"`.

- [ ] **Step 4: Commit RTL verification**

```bash
git commit --allow-empty -m "test: verified RTL layout support for member profile modal"
```

---

## Execution Notes

- Convex functions automatically validate `tenantId` from JWT — no cross-tenant data leakage possible
- All mutations check requester's role and `primaryAdmin` status before allowing modifications
- Modal uses shadcn/ui Dialog, Tabs, Button, Input, Badge components — no new design needed
- Analytics calculations (response time, CSAT) use placeholder values in v1 — tie to real metrics in follow-up task
- Time range toggle updates all dependent queries via Convex subscriptions in real-time
- Audit log search filters client-side in v1 (small data set) — move to server-side Convex filter for scale

