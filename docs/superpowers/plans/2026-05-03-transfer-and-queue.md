# Transfer Flow & Queue Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace today's department-only transfer dialog with a tabbed within-branch / forward-to-branch flow, add a tenant-editable forward template, add audit fields and a `forwarded` status, and replace the inbox sidebar's flat list with a Channel→Department queue tree scoped per role.

**Architecture:** Convex schema gets two additive changes (extra `status` literal + audit fields on `conversations`, two new `eventType` literals on `messages`, `forwardMessageTemplates` on `tenants`). One mutation replaces `transferToDepartment` (`transferWithinChannel`); one new action handles cross-branch forward (`forwardToBranch` + paired internal helpers). A new `inbox.queueCounts` query feeds a new `inbox-queue-tree` sidebar component. The existing `transfer-department-dialog.tsx` is replaced by `transfer-dialog.tsx` (tabs); existing `assign-agent-dialog.tsx` and inbound-message reopen logic are unchanged except for skipping `forwarded` conversations.

**Tech Stack:** Next.js 15 (App Router), Convex (queries / mutations / actions), Clerk auth, shadcn/ui, Tailwind v4, TypeScript strict.

**Spec:** `docs/superpowers/specs/2026-05-03-transfer-and-queue-design.md`

---

## Task 1: Schema additions

**Files:**
- Modify: `convex/schema.ts:159-202` (conversations) — extend `status` union, add forward audit fields
- Modify: `convex/schema.ts:245-252` (messages eventType union) — add two new literals
- Modify: `convex/schema.ts:5-20` (tenants) — add `forwardMessageTemplates` optional field

- [ ] **Step 1: Extend `conversations.status` union**

In `convex/schema.ts`, find the `conversations` table (line 159). Replace the existing `status` field with:

```ts
status: v.union(
  v.literal("open"),
  v.literal("pending"),
  v.literal("resolved"),
  v.literal("forwarded"),
),
```

- [ ] **Step 2: Add forward audit fields to `conversations`**

In the same `conversations` table, after the existing `mergedInto` / `mergedAt` / `totalMergedCount` lines and before `hasFollowUp`, add:

```ts
forwardedToChannelId: v.optional(v.id("channels")),
forwardedToDepartmentId: v.optional(v.id("departments")),
forwardedAt: v.optional(v.number()),
forwardedBy: v.optional(v.string()),
```

- [ ] **Step 3: Extend `messages.eventType` union**

Find the `eventType` field in the `messages` table (line 245). Add two literals to the union (keep existing literals so legacy rows still parse):

```ts
eventType: v.optional(v.union(
  v.literal("transfer_department"),       // legacy — kept for read compat
  v.literal("transfer_within_channel"),   // NEW
  v.literal("forward_to_branch"),         // NEW
  v.literal("agent_assigned"),
  v.literal("agent_unassigned"),
  v.literal("resolved"),
  v.literal("reopened"),
  v.literal("csat_received"),
)),
```

- [ ] **Step 4: Extend `messages.eventData` to carry forward fields**

Replace the `eventData` object in the `messages` table (line 253) with:

```ts
eventData: v.optional(v.object({
  actorName: v.optional(v.string()),
  fromDept: v.optional(v.string()),
  toDept: v.optional(v.string()),
  agentName: v.optional(v.string()),
  csatScore: v.optional(v.number()),
  targetBranchName: v.optional(v.string()),
  targetBranchNumber: v.optional(v.string()),
  targetDeptName: v.optional(v.string()),
})),
```

- [ ] **Step 5: Add `forwardMessageTemplates` to tenants table**

Find the `tenants` table (line 5). Add the field before the closing `})`:

```ts
forwardMessageTemplates: v.optional(v.object({
  ar: v.string(),
  en: v.string(),
})),
```

- [ ] **Step 6: Run Convex dev to apply schema**

Run: `npx convex dev --once`
Expected: Schema validation passes, no errors.

If you see "would orphan" errors for existing rows, double-check that all NEW fields are wrapped in `v.optional(...)` — none of them should be required.

- [ ] **Step 7: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(schema): add forwarded status, forward audit fields, forward template"
```

---

## Task 2: `transferWithinChannel` mutation (replaces `transferToDepartment`)

**Files:**
- Modify: `convex/conversations.ts:512-600` — replace existing `transferToDepartment` export with `transferWithinChannel`
- Modify: `app/(dashboard)/inbox/page.tsx` — no change yet; the dialog component still references the old name (will be replaced in Task 5)

The new mutation supports an optional `assignAgentId` (assign within the same call) and `internalNote` (insert as internal note message after the system event). It also relaxes the role check to allow Agents who have access to the conversation.

- [ ] **Step 1: Locate the existing `transferToDepartment` export**

In `convex/conversations.ts`, find the export starting at line 512. Read lines 512-600 to confirm the current shape (validation, system event insert, notifications loop).

- [ ] **Step 2: Add the access predicate helper**

At the top of `convex/conversations.ts` (after the existing `isAdminOrSupervisor` helper near line 8), add:

```ts
async function callerHasConversationAccess(
  ctx: { db: any; },
  conversation: { tenantId: string; assignedAgentId?: string; departmentId?: import("./_generated/dataModel").Id<"departments"> },
  callerId: string,
  orgRole: string,
): Promise<boolean> {
  if (isAdminOrSupervisor(orgRole)) return true;
  if (conversation.assignedAgentId === callerId) return true;
  if (!conversation.assignedAgentId && conversation.departmentId) {
    const member = await ctx.db
      .query("departmentMembers")
      .withIndex("by_department", (q: any) =>
        q.eq("departmentId", conversation.departmentId)
      )
      .filter((q: any) => q.eq(q.field("userId"), callerId))
      .first();
    return !!member;
  }
  return false;
}
```

(Keep the `any` only if the codebase already uses it for ctx — otherwise use the proper `QueryCtx` / `MutationCtx` types. Check the file's existing imports near line 1-10 and match the style.)

- [ ] **Step 3: Replace the export with `transferWithinChannel`**

Delete the entire existing `transferToDepartment` export (lines 512-600 in current file) and replace with:

```ts
export const transferWithinChannel = mutation({
  args: {
    conversationId: v.id("conversations"),
    targetDepartmentId: v.id("departments"),
    assignAgentId: v.optional(v.string()),
    internalNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    if (!(await callerHasConversationAccess(ctx, conversation, callerId, orgRole))) {
      throw new ConvexError("FORBIDDEN");
    }

    const targetDept = await ctx.db.get(args.targetDepartmentId);
    if (!targetDept || targetDept.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }
    if (targetDept.isArchived) {
      throw new ConvexError("DEPARTMENT_ARCHIVED");
    }
    if (!targetDept.channelId || targetDept.channelId !== conversation.channelId) {
      throw new ConvexError("CROSS_CHANNEL_USE_FORWARD");
    }
    if (targetDept._id === conversation.departmentId && !args.assignAgentId) {
      throw new ConvexError("NO_OP_TRANSFER");
    }

    if (args.assignAgentId) {
      const member = await ctx.db
        .query("departmentMembers")
        .withIndex("by_department", (q) => q.eq("departmentId", args.targetDepartmentId))
        .filter((q) => q.eq(q.field("userId"), args.assignAgentId!))
        .first();
      if (!member) {
        throw new ConvexError("AGENT_NOT_IN_DEPARTMENT");
      }
    }

    const oldDept = conversation.departmentId
      ? await ctx.db.get(conversation.departmentId)
      : null;

    const now = Date.now();
    await ctx.db.patch(args.conversationId, {
      departmentId: args.targetDepartmentId,
      departmentAssignedAt: now,
      departmentAssignedBy: callerId,
      ...(args.assignAgentId
        ? {
            assignedAgentId: args.assignAgentId,
            assignedAt: now,
            assignmentType: "manual" as const,
            previousAgentId: conversation.assignedAgentId,
          }
        : {}),
    });

    const identity = await ctx.auth.getUserIdentity();
    const actorName = identity?.name ?? identity?.email ?? "Someone";
    const fromName = oldDept?.name ?? "Unassigned";
    const toName = targetDept.name;

    let agentName: string | undefined;
    if (args.assignAgentId) {
      const profile = await ctx.db
        .query("memberProfiles")
        .withIndex("by_tenant_user", (q) =>
          q.eq("tenantId", tenantId).eq("userId", args.assignAgentId!)
        )
        .first();
      agentName = profile?.displayName ?? undefined;
    }

    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      tenantId,
      direction: "outbound",
      content: "",
      contentType: "system_event",
      eventType: "transfer_within_channel",
      eventData: { actorName, fromDept: fromName, toDept: toName, agentName },
      isInternalNote: false,
      authorId: callerId,
      status: "sent",
      timestamp: now,
      createdAt: now,
    });

    if (args.internalNote && args.internalNote.trim().length > 0) {
      await ctx.db.insert("messages", {
        conversationId: args.conversationId,
        tenantId,
        direction: "outbound",
        content: args.internalNote.trim(),
        contentType: "text",
        isInternalNote: true,
        authorId: callerId,
        status: "sent",
        timestamp: now + 1,
        createdAt: now + 1,
      });
    }

    const deptMembers = await ctx.db
      .query("departmentMembers")
      .withIndex("by_department", (q) => q.eq("departmentId", args.targetDepartmentId))
      .collect();

    const memberIds = deptMembers.map((m) => m.userId);
    const supervisorIds: string[] = (targetDept as any).supervisors ?? [];
    const recipients = [...new Set([...memberIds, ...supervisorIds])].filter(
      (id) => id !== callerId && id !== args.assignAgentId,
    );

    const contact = await ctx.db.get(conversation.contactId);
    const contactName = contact?.customName ?? contact?.displayName ?? "";

    await Promise.all(
      recipients.map((userId) =>
        ctx.db.insert("notifications", {
          tenantId,
          userId,
          type: "conversation_transferred",
          referenceId: args.conversationId,
          contactName,
          message: `${contactName} was transferred to ${toName} by ${actorName}`,
          read: false,
          createdAt: now,
        })
      )
    );

    if (args.assignAgentId) {
      await ctx.db.insert("notifications", {
        tenantId,
        userId: args.assignAgentId,
        type: "new_assignment",
        referenceId: args.conversationId,
        contactName,
        message: `${contactName} was assigned to you by ${actorName}`,
        read: false,
        createdAt: now,
      });
    }
  },
});
```

(If `memberProfiles.by_tenant_user` index name differs, grep `convex/schema.ts` for `memberProfiles` and adjust.)

- [ ] **Step 4: Verify no callers reference the old name**

Run: `grep -rn "transferToDepartment" convex/ components/ app/`
Expected: Only matches inside the design doc / spec. If there are any code references, they'll be fixed in Task 5 (UI). Note their locations now.

- [ ] **Step 5: Run Convex typecheck**

Run: `npx convex dev --once`
Expected: No type errors. Schema unchanged from Task 1.

- [ ] **Step 6: Commit**

```bash
git add convex/conversations.ts
git commit -m "feat(convex): replace transferToDepartment with transferWithinChannel"
```

---

## Task 3: `forwardToBranch` action + helpers

**Files:**
- Modify: `convex/conversations.ts` — add `_validateForward` (internal query), `_finalizeForward` (internal mutation), `forwardToBranch` (action)
- Modify: `convex/lib/tenants.ts` — add `getForwardTemplates` internal query (used by the action)

- [ ] **Step 1: Add `getForwardTemplates` internal query**

In `convex/lib/tenants.ts`, after the existing `getEmailLocale` export, add:

```ts
export const getForwardTemplates = internalQuery({
  args: { tenantId: v.string() },
  handler: async (ctx, args): Promise<{ ar: string; en: string }> => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();
    return tenant?.forwardMessageTemplates ?? {
      ar: "للحصول على خدمة أفضل، تواصل مع فرع {{branchName}} على {{branchNumber}}",
      en: "For better service, please contact our {{branchName}} branch at {{branchNumber}}",
    };
  },
});
```

- [ ] **Step 2: Add `_validateForward` internal query in `conversations.ts`**

Append to `convex/conversations.ts` (after the new `transferWithinChannel`):

```ts
export const _validateForward = internalQuery({
  args: {
    conversationId: v.id("conversations"),
    targetChannelId: v.id("channels"),
    targetDepartmentId: v.optional(v.id("departments")),
    callerId: v.string(),
    orgRole: v.string(),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== args.tenantId) {
      throw new ConvexError("NOT_FOUND");
    }
    if (conversation.status === "resolved" || conversation.status === "forwarded") {
      throw new ConvexError("CONVERSATION_NOT_OPEN");
    }
    if (
      !(await callerHasConversationAccess(ctx, conversation, args.callerId, args.orgRole))
    ) {
      throw new ConvexError("FORBIDDEN");
    }

    const sourceChannel = await ctx.db.get(conversation.channelId);
    if (!sourceChannel) throw new ConvexError("CHANNEL_NOT_FOUND");

    const targetChannel = await ctx.db.get(args.targetChannelId);
    if (!targetChannel || targetChannel.tenantId !== args.tenantId) {
      throw new ConvexError("NOT_FOUND");
    }
    if (targetChannel._id === sourceChannel._id) {
      throw new ConvexError("CROSS_CHANNEL_USE_TRANSFER");
    }
    if (targetChannel.status !== undefined && targetChannel.status !== "active") {
      throw new ConvexError("TARGET_CHANNEL_INACTIVE");
    }

    let targetDeptName: string | undefined;
    if (args.targetDepartmentId) {
      const dept = await ctx.db.get(args.targetDepartmentId);
      if (!dept || dept.tenantId !== args.tenantId) throw new ConvexError("NOT_FOUND");
      if (dept.channelId !== args.targetChannelId) {
        throw new ConvexError("DEPARTMENT_NOT_IN_TARGET_CHANNEL");
      }
      if (dept.isArchived) throw new ConvexError("DEPARTMENT_ARCHIVED");
      targetDeptName = dept.name;
    }

    const now = Date.now();
    const lastInbound = conversation.lastInboundAt ?? 0;
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    if (now - lastInbound >= TWENTY_FOUR_HOURS_MS) {
      throw new ConvexError("OUTSIDE_24H_WINDOW");
    }

    const contact = await ctx.db.get(conversation.contactId);

    return {
      sourceChannelId: sourceChannel._id,
      sourcePhoneNumberId: sourceChannel.phoneNumberId,
      contactPhone: contact?.phone ?? "",
      contactName: contact?.customName ?? contact?.displayName ?? "",
      targetBranchName: targetChannel.displayName,
      targetBranchNumber: targetChannel.displayPhone ?? "",
      targetDeptName,
    };
  },
});
```

- [ ] **Step 3: Add `_finalizeForward` internal mutation**

Append to `convex/conversations.ts`:

```ts
export const _finalizeForward = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    targetChannelId: v.id("channels"),
    targetDepartmentId: v.optional(v.id("departments")),
    callerId: v.string(),
    actorName: v.string(),
    targetBranchName: v.string(),
    targetBranchNumber: v.string(),
    targetDeptName: v.optional(v.string()),
    renderedText: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.conversationId, {
      status: "forwarded",
      forwardedToChannelId: args.targetChannelId,
      forwardedToDepartmentId: args.targetDepartmentId,
      forwardedAt: now,
      forwardedBy: args.callerId,
      assignedAgentId: undefined,
      departmentId: undefined,
    });

    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      tenantId: (await ctx.db.get(args.conversationId))!.tenantId,
      direction: "outbound",
      content: "",
      contentType: "system_event",
      eventType: "forward_to_branch",
      eventData: {
        actorName: args.actorName,
        targetBranchName: args.targetBranchName,
        targetBranchNumber: args.targetBranchNumber,
        targetDeptName: args.targetDeptName,
      },
      isInternalNote: false,
      authorId: args.callerId,
      status: "sent",
      timestamp: now,
      createdAt: now,
    });
  },
});
```

- [ ] **Step 4: Add the `forwardToBranch` action**

Add the `action` import to the top of `convex/conversations.ts` if not already there:

```ts
import { query, mutation, internalMutation, internalQuery, action } from "./_generated/server";
```

Append the action:

```ts
export const forwardToBranch = action({
  args: {
    conversationId: v.id("conversations"),
    targetChannelId: v.id("channels"),
    targetDepartmentId: v.optional(v.id("departments")),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    const identity = await ctx.auth.getUserIdentity();
    const actorName = identity?.name ?? identity?.email ?? "Someone";

    const ctxData = await ctx.runQuery(internal.conversations._validateForward, {
      conversationId: args.conversationId,
      targetChannelId: args.targetChannelId,
      targetDepartmentId: args.targetDepartmentId,
      callerId,
      orgRole,
      tenantId,
    });

    const templates = await ctx.runQuery(internal.lib.tenants.getForwardTemplates, {
      tenantId,
    });

    const conversation = await ctx.runQuery(internal.conversations.getInternal, {
      conversationId: args.conversationId,
    });
    const lang: "ar" | "en" =
      conversation && (conversation as any).contactLanguage === "en" ? "en" : "ar";

    const formattedNumber = ctxData.targetBranchNumber
      ? (ctxData.targetBranchNumber.startsWith("+")
          ? ctxData.targetBranchNumber
          : `+${ctxData.targetBranchNumber}`)
      : "";

    const renderedText = templates[lang]
      .replaceAll("{{branchName}}", ctxData.targetBranchName)
      .replaceAll("{{branchNumber}}", formattedNumber);

    const messageId = await ctx.runMutation(internal.messages.createOutboundForward, {
      conversationId: args.conversationId,
      tenantId,
      content: renderedText,
      authorId: callerId,
    });

    try {
      await ctx.runAction(internal.actions.sendWhatsAppMessage.sendMessage, {
        messageId,
        phoneNumberId: ctxData.sourcePhoneNumberId,
        contactPhone: ctxData.contactPhone,
        content: renderedText,
        tenantId,
      });
    } catch (e) {
      await ctx.runMutation(internal.messages.markFailed, {
        messageId,
        reason: e instanceof Error ? e.message : "Forward send failed",
      });
      throw new ConvexError("FORWARD_SEND_FAILED");
    }

    await ctx.runMutation(internal.conversations._finalizeForward, {
      conversationId: args.conversationId,
      targetChannelId: args.targetChannelId,
      targetDepartmentId: args.targetDepartmentId,
      callerId,
      actorName,
      targetBranchName: ctxData.targetBranchName,
      targetBranchNumber: formattedNumber,
      targetDeptName: ctxData.targetDeptName,
      renderedText,
    });
  },
});
```

- [ ] **Step 5: Add `messages.createOutboundForward` and `messages.markFailed` internal mutations**

In `convex/messages.ts`, append:

```ts
export const createOutboundForward = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    tenantId: v.string(),
    content: v.string(),
    authorId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      tenantId: args.tenantId,
      direction: "outbound",
      content: args.content,
      contentType: "text",
      isInternalNote: false,
      authorId: args.authorId,
      status: "sending",
      timestamp: now,
      createdAt: now,
    });
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
      lastMessagePreview: args.content.slice(0, 100),
    });
    return messageId;
  },
});

export const markFailed = internalMutation({
  args: { messageId: v.id("messages"), reason: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      status: "failed",
      failureReason: args.reason,
    });
  },
});
```

- [ ] **Step 6: Run Convex typecheck**

Run: `npx convex dev --once`
Expected: No type errors. If you see errors about `internal.conversations.getInternal` not existing or having a different shape, grep `convex/conversations.ts` for `getInternal` (line 429) and pass the right args. The action only uses it to read the conversation if needed for language preference; if the codebase has no per-contact language, simplify by hardcoding `lang = "ar"` and remove the call.

- [ ] **Step 7: Commit**

```bash
git add convex/conversations.ts convex/lib/tenants.ts convex/messages.ts
git commit -m "feat(convex): add forwardToBranch action + paired helpers"
```

---

## Task 4: Inbound-message reopen rule skips `forwarded`

**Files:**
- Modify: `convex/messages.ts:226-237` — extend the reopen-window check

The current code only treats `status === "resolved"` as eligible for the 24h reopen rule. We need to make sure `status === "forwarded"` is **never** reopened — a fresh conversation must be created instead.

- [ ] **Step 1: Find the reopen check**

Open `convex/messages.ts` around line 226-237. Confirm the current shape:

```ts
if (conversation && conversation.status === "resolved") {
  const channel = await ctx.db.get(args.channelId);
  const windowHours = channel?.reopenWindowHours ?? 24;
  const windowMs = windowHours * 60 * 60 * 1000;
  const resolvedTime = conversation.resolvedAt ?? conversation.lastMessageAt;
  if (args.timestamp - resolvedTime >= windowMs) {
    conversation = null;
  }
}
```

- [ ] **Step 2: Add a separate check for `forwarded`**

Immediately after the resolved-check block, add:

```ts
if (conversation && conversation.status === "forwarded") {
  // Forwarded conversations are terminal — always start a fresh conversation
  // when the customer messages back on the original channel.
  conversation = null;
}
```

Then in the existing `else` branch (line 270 area, where `wasResolved` is computed), update it to also skip the reopen patch if somehow a forwarded conversation survives the null-out (defensive — should not happen given Step 2):

Find:
```ts
const wasResolved = conversation.status === "resolved";
```

No change needed — the early-null guarantees we won't get here for forwarded.

- [ ] **Step 3: Run typecheck**

Run: `npx convex dev --once`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add convex/messages.ts
git commit -m "feat(inbound): forwarded conversations always create fresh thread on reopen"
```

---

## Task 5: New `transfer-dialog.tsx` component (replaces old)

**Files:**
- Create: `components/inbox/transfer-dialog.tsx`
- Delete: `components/inbox/transfer-department-dialog.tsx`
- Modify: `app/(dashboard)/inbox/page.tsx:14, 187-192` — import and usage

The new dialog has two tabs: "Within branch" and "Forward to branch". Both tabs share the same trigger button.

- [ ] **Step 1: Inspect the existing assign-agent-dialog for prior art**

Run: `cat components/inbox/assign-agent-dialog.tsx | head -80`
Note the patterns it uses for the dialog open state, useQuery skip pattern, and toast messages.

- [ ] **Step 2: Verify tabs primitive availability**

Run: `ls components/ui/tabs.tsx`
Expected: file exists. If not: run `npx shadcn@latest add tabs` and commit the new primitive separately before continuing.

- [ ] **Step 3: Create the new dialog**

Create `components/inbox/transfer-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";

interface Props {
  conversationId: string;
  channelId: string;
  currentDepartmentId?: string;
}

export function TransferDialog({ conversationId, channelId, currentDepartmentId }: Props) {
  const t = useT();
  const { isAuthenticated } = useConvexAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"within" | "forward">("within");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" title={t("Transfer", "نقل")} />}>
        <ArrowRightLeft className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Transfer", "نقل")}</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "within" | "forward")}>
          <TabsList className="w-full">
            <TabsTrigger value="within" className="flex-1">
              {t("Within branch", "داخل الفرع")}
            </TabsTrigger>
            <TabsTrigger value="forward" className="flex-1">
              {t("Forward to branch", "تحويل لفرع آخر")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="within">
            <WithinBranchPanel
              conversationId={conversationId}
              channelId={channelId}
              currentDepartmentId={currentDepartmentId}
              isAuthenticated={isAuthenticated}
              onDone={() => setOpen(false)}
            />
          </TabsContent>
          <TabsContent value="forward">
            <ForwardToBranchPanel
              conversationId={conversationId}
              channelId={channelId}
              isAuthenticated={isAuthenticated}
              onDone={() => setOpen(false)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function WithinBranchPanel({
  conversationId,
  channelId,
  currentDepartmentId,
  isAuthenticated,
  onDone,
}: {
  conversationId: string;
  channelId: string;
  currentDepartmentId?: string;
  isAuthenticated: boolean;
  onDone: () => void;
}) {
  const t = useT();
  const [deptId, setDeptId] = useState<string | "">("");
  const [agentId, setAgentId] = useState<string | "any">("any");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const departments = useQuery(
    api.departments.listForTransfer,
    isAuthenticated
      ? {
          channelId: channelId as Id<"channels">,
          excludeDepartmentId: currentDepartmentId as Id<"departments"> | undefined,
        }
      : "skip"
  );

  const agents = useQuery(
    api.departmentMembers.listForDepartment,
    isAuthenticated && deptId
      ? { departmentId: deptId as Id<"departments"> }
      : "skip"
  );

  const transfer = useMutation(api.conversations.transferWithinChannel);

  const submit = async () => {
    if (!deptId) return;
    setSubmitting(true);
    try {
      await transfer({
        conversationId: conversationId as Id<"conversations">,
        targetDepartmentId: deptId as Id<"departments">,
        assignAgentId: agentId === "any" ? undefined : agentId,
        internalNote: note.trim() || undefined,
      });
      toast.success(t("Conversation transferred", "تم نقل المحادثة"));
      onDone();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("AGENT_NOT_IN_DEPARTMENT")) {
        toast.error(t("Selected agent is no longer in this department", "العضو لم يعد ضمن هذه الإدارة"));
      } else if (msg.includes("DEPARTMENT_ARCHIVED")) {
        toast.error(t("Department is archived", "الإدارة مؤرشفة"));
      } else if (msg.includes("CROSS_CHANNEL_USE_FORWARD")) {
        toast.error(t("Use Forward to send to another branch", "استخدم التحويل لفرع آخر"));
      } else {
        toast.error(t("Transfer failed", "فشل نقل المحادثة"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 pt-3">
      <div className="space-y-1">
        <label className="text-sm font-medium">{t("Department", "الإدارة")}</label>
        {departments === undefined ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={deptId}
            onChange={(e) => {
              setDeptId(e.target.value);
              setAgentId("any");
            }}
          >
            <option value="">{t("Select…", "اختر…")}</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
                {d.isDefault ? ` (${t("Default", "افتراضية")})` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">
          {t("Agent in department (optional)", "موظف داخل الإدارة (اختياري)")}
        </label>
        <select
          className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          disabled={!deptId || agents === undefined}
        >
          <option value="any">{t("Any agent — keep unassigned", "أي موظف — اتركها بدون تعيين")}</option>
          {(agents ?? []).map((a) => (
            <option key={a.userId} value={a.userId}>
              {a.displayName ?? a.userId}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">
          {t("Note for the receiving team (optional)", "ملاحظة للفريق المستلم (اختياري)")}
        </label>
        <textarea
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onDone} disabled={submitting}>
          {t("Cancel", "إلغاء")}
        </Button>
        <Button onClick={submit} disabled={submitting || !deptId}>
          {submitting && <Loader2 className="size-4 animate-spin me-2" />}
          {t("Transfer", "نقل")}
        </Button>
      </div>
    </div>
  );
}

function ForwardToBranchPanel({
  conversationId,
  channelId,
  isAuthenticated,
  onDone,
}: {
  conversationId: string;
  channelId: string;
  isAuthenticated: boolean;
  onDone: () => void;
}) {
  const t = useT();
  const [targetChannelId, setTargetChannelId] = useState<string | "">("");
  const [targetDeptId, setTargetDeptId] = useState<string | "">("");
  const [submitting, setSubmitting] = useState(false);

  const channels = useQuery(
    api.channels.listOtherChannelsForForward,
    isAuthenticated ? { excludeChannelId: channelId as Id<"channels"> } : "skip"
  );

  const departments = useQuery(
    api.departments.listForTransfer,
    isAuthenticated && targetChannelId
      ? { channelId: targetChannelId as Id<"channels">, excludeDepartmentId: undefined }
      : "skip"
  );

  const preview = useQuery(
    api.conversations.previewForwardMessage,
    isAuthenticated && targetChannelId
      ? {
          conversationId: conversationId as Id<"conversations">,
          targetChannelId: targetChannelId as Id<"channels">,
        }
      : "skip"
  );

  const forward = useAction(api.conversations.forwardToBranch);

  const submit = async () => {
    if (!targetChannelId) return;
    setSubmitting(true);
    try {
      await forward({
        conversationId: conversationId as Id<"conversations">,
        targetChannelId: targetChannelId as Id<"channels">,
        targetDepartmentId: (targetDeptId || undefined) as Id<"departments"> | undefined,
      });
      toast.success(t("Conversation forwarded", "تم تحويل المحادثة"));
      onDone();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("OUTSIDE_24H_WINDOW")) {
        toast.error(t("Outside the 24h window — ask the customer to message first", "خارج نافذة 24 ساعة — اطلب من العميل المراسلة أولاً"));
      } else if (msg.includes("TARGET_CHANNEL_INACTIVE")) {
        toast.error(t("That branch isn't connected right now", "هذا الفرع غير متصل حاليا"));
      } else if (msg.includes("CONVERSATION_NOT_OPEN")) {
        toast.error(t("Conversation is not open", "المحادثة ليست مفتوحة"));
      } else {
        toast.error(t("Forward failed", "فشل التحويل"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 pt-3">
      <div className="space-y-1">
        <label className="text-sm font-medium">{t("Target branch", "الفرع المستهدف")}</label>
        {channels === undefined ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : channels.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("No other branches", "لا توجد فروع أخرى")}</p>
        ) : (
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={targetChannelId}
            onChange={(e) => {
              setTargetChannelId(e.target.value);
              setTargetDeptId("");
            }}
          >
            <option value="">{t("Select…", "اختر…")}</option>
            {channels.map((c) => (
              <option key={c._id} value={c._id}>
                {c.displayName} <span dir="ltr">{c.displayPhone ?? ""}</span>
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">
          {t("Target department (optional)", "إدارة مستهدفة (اختياري)")}
        </label>
        <select
          className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
          value={targetDeptId}
          onChange={(e) => setTargetDeptId(e.target.value)}
          disabled={!targetChannelId || departments === undefined}
        >
          <option value="">{t("— none —", "— بدون —")}</option>
          {(departments ?? []).map((d) => (
            <option key={d._id} value={d._id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {preview && (
        <div className="space-y-1">
          <label className="text-sm font-medium">
            {t("Message that will be sent to the customer", "الرسالة التي سيتم إرسالها للعميل")}
          </label>
          <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
            {preview}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {t(
          "After forwarding, this conversation will be closed and marked as Forwarded.",
          "بعد التحويل ستُغلق المحادثة وتُحفظ كمحوَّلة."
        )}
      </p>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onDone} disabled={submitting}>
          {t("Cancel", "إلغاء")}
        </Button>
        <Button onClick={submit} disabled={submitting || !targetChannelId || !preview}>
          {submitting && <Loader2 className="size-4 animate-spin me-2" />}
          {t("Forward & Close", "تحويل وإغلاق")}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add the supporting Convex queries**

Add to `convex/channels.ts` (find the file and append):

```ts
export const listOtherChannelsForForward = query({
  args: { excludeChannelId: v.id("channels") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const all = await ctx.db
      .query("channels")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
    return all
      .filter(
        (c) => c._id !== args.excludeChannelId && (c.status === "active" || c.status === undefined),
      )
      .map((c) => ({ _id: c._id, displayName: c.displayName, displayPhone: c.displayPhone }));
  },
});
```

(If `getCallerIdentity` isn't imported in `channels.ts`, add `import { getCallerIdentity } from "./lib/auth";` at the top.)

Add to `convex/departmentMembers.ts`:

```ts
export const listForDepartment = query({
  args: { departmentId: v.id("departments") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const dept = await ctx.db.get(args.departmentId);
    if (!dept || dept.tenantId !== tenantId) return [];
    const members = await ctx.db
      .query("departmentMembers")
      .withIndex("by_department", (q) => q.eq("departmentId", args.departmentId))
      .collect();
    const profiles = await Promise.all(
      members.map((m) =>
        ctx.db
          .query("memberProfiles")
          .withIndex("by_tenant_user", (q) =>
            q.eq("tenantId", tenantId).eq("userId", m.userId)
          )
          .first()
      )
    );
    return members.map((m, i) => ({
      userId: m.userId,
      displayName: profiles[i]?.displayName ?? null,
    }));
  },
});
```

(If `memberProfiles.by_tenant_user` doesn't exist, grep schema for the actual index name and adjust. If `memberProfiles` doesn't exist, just return `displayName: null` and let the UI fall back to `userId`.)

Add `previewForwardMessage` query to `convex/conversations.ts`:

```ts
export const previewForwardMessage = query({
  args: {
    conversationId: v.id("conversations"),
    targetChannelId: v.id("channels"),
  },
  handler: async (ctx, args): Promise<string | null> => {
    const { tenantId } = await getCallerIdentity(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) return null;
    const target = await ctx.db.get(args.targetChannelId);
    if (!target || target.tenantId !== tenantId) return null;
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .first();
    const templates = tenant?.forwardMessageTemplates ?? {
      ar: "للحصول على خدمة أفضل، تواصل مع فرع {{branchName}} على {{branchNumber}}",
      en: "For better service, please contact our {{branchName}} branch at {{branchNumber}}",
    };
    const lang: "ar" | "en" = "ar"; // contact-language is out of scope for this plan; see spec §10
    const number = target.displayPhone
      ? (target.displayPhone.startsWith("+") ? target.displayPhone : `+${target.displayPhone}`)
      : "";
    return templates[lang]
      .replaceAll("{{branchName}}", target.displayName)
      .replaceAll("{{branchNumber}}", number);
  },
});
```

- [ ] **Step 5: Replace the dialog import in the inbox page**

In `app/(dashboard)/inbox/page.tsx`:

Change line 14 from:
```tsx
import { TransferDepartmentDialog } from "@/components/inbox/transfer-department-dialog";
```
to:
```tsx
import { TransferDialog } from "@/components/inbox/transfer-dialog";
```

Change lines 187-192 from:
```tsx
{selectedConversation?.channelId && (
  <TransferDepartmentDialog
    conversationId={selectedId}
    channelId={selectedConversation.channelId}
    currentDepartmentId={selectedConversation.departmentId}
  />
)}
```
to:
```tsx
{selectedConversation?.channelId && (
  <TransferDialog
    conversationId={selectedId}
    channelId={selectedConversation.channelId}
    currentDepartmentId={selectedConversation.departmentId}
  />
)}
```

- [ ] **Step 6: Delete the old dialog file**

```bash
git rm components/inbox/transfer-department-dialog.tsx
```

- [ ] **Step 7: Verify no other callers**

Run: `grep -rn "TransferDepartmentDialog\|transfer-department-dialog" .`
Expected: Only matches in spec / plan / git history. If a code reference remains, update it to `TransferDialog` / `transfer-dialog`.

- [ ] **Step 8: Run typecheck**

Run: `npx tsc --noEmit && npx convex dev --once`
Expected: No errors.

- [ ] **Step 9: Manual smoke test**

Run the dev server: `npm run dev` and `npx convex dev` in another terminal.
- Open a conversation, click the Transfer icon button → dialog opens with Within / Forward tabs.
- Within tab: pick a department, optionally pick an agent, optionally add a note → Transfer → toast appears, dialog closes, activity pill shows in thread.
- Forward tab: pick a target branch, see the rendered preview, click Forward & Close → toast, dialog closes, conversation status flips to forwarded, customer-visible message appears in thread.

- [ ] **Step 10: Commit**

```bash
git add components/inbox/transfer-dialog.tsx convex/channels.ts convex/departmentMembers.ts convex/conversations.ts app/\(dashboard\)/inbox/page.tsx
git commit -m "feat(inbox): tabbed transfer dialog (within branch + forward to branch)"
```

---

## Task 6: Forwarded conversation read-only state in thread + composer

**Files:**
- Modify: `components/inbox/conversation-thread.tsx` — render forwarded banner
- Modify: `components/inbox/message-input.tsx` — disable input when status is forwarded

- [ ] **Step 1: Add the forwarded banner in conversation thread**

In `components/inbox/conversation-thread.tsx`, locate where the message thread renders (above the message-input). Add a banner that appears when `conversation.status === "forwarded"`:

```tsx
{conversation?.status === "forwarded" && (
  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
    {t(
      "This conversation was forwarded to another branch — replies are disabled.",
      "تم تحويل هذه المحادثة لفرع آخر — الردود معطلة."
    )}
  </div>
)}
```

Add `useT` import if not already present.

- [ ] **Step 2: Disable composer input on forwarded status**

In `components/inbox/message-input.tsx`, find the props interface and add `disabledReason?: string`. In the textarea / send button, add a `disabled` based on a new prop `isForwarded?: boolean` and render a small inline hint when set.

In `conversation-thread.tsx`, pass `isForwarded={conversation?.status === "forwarded"}` to `<MessageInput>`.

- [ ] **Step 3: Hide Transfer / Assign / Status buttons when forwarded**

In `app/(dashboard)/inbox/page.tsx`, wrap the toolbar block (around lines 186-201) with:

```tsx
{selectedConversation?.status !== "forwarded" && (
  <>
    {/* existing TransferDialog, StatusSelector, AssignAgentDialog … */}
  </>
)}
```

Keep the Internal Note button (if separate) outside this guard so agents can still record context.

- [ ] **Step 4: Run typecheck and smoke test**

Run: `npx tsc --noEmit`
Expected: No errors.

In dev: open a forwarded conversation, confirm banner shows, composer disabled, transfer/assign/status buttons hidden.

- [ ] **Step 5: Commit**

```bash
git add components/inbox/conversation-thread.tsx components/inbox/message-input.tsx app/\(dashboard\)/inbox/page.tsx
git commit -m "feat(inbox): forwarded conversations are read-only in thread view"
```

---

## Task 7: Activity-pill renderer accepts new event types

**Files:**
- Modify: `components/inbox/message-bubble.tsx` (or wherever system events render — find via grep)

- [ ] **Step 1: Find the activity-pill renderer**

Run: `grep -n "transfer_department\|eventType\|system_event" components/inbox/message-bubble.tsx`
Note the lines and the existing render function for `transfer_department`.

- [ ] **Step 2: Add cases for the new event types**

Where the renderer switches on `eventType`, add:

```tsx
case "transfer_within_channel": {
  const { actorName, fromDept, toDept, agentName } = m.eventData ?? {};
  const dest = agentName ? `${toDept} / ${agentName}` : toDept;
  return t(
    `${actorName} transferred this to ${dest}`,
    `${actorName} نقل المحادثة إلى ${dest}`
  );
}
case "forward_to_branch": {
  const { actorName, targetBranchName, targetDeptName } = m.eventData ?? {};
  const dest = targetDeptName ? `${targetBranchName} / ${targetDeptName}` : targetBranchName;
  return t(
    `${actorName} forwarded this to ${dest} — conversation closed.`,
    `${actorName} حول المحادثة إلى ${dest} — تم إغلاقها.`
  );
}
```

Keep the existing `transfer_department` case for legacy rows — no removal.

- [ ] **Step 3: Smoke test**

Trigger one of each type (manual transfer, forward) and confirm the pills render correctly in both Arabic and English.

- [ ] **Step 4: Commit**

```bash
git add components/inbox/message-bubble.tsx
git commit -m "feat(inbox): render activity pills for transfer_within_channel and forward_to_branch"
```

---

## Task 8: Forward template settings card

**Files:**
- Modify: `convex/lib/tenants.ts` — add `updateForwardTemplate` mutation + `getForwardTemplatesPublic` query
- Modify or Create: `components/settings/general-settings.tsx` — add the Forward message card
- Verify: `app/(dashboard)/settings/page.tsx` already renders the general settings component

- [ ] **Step 1: Add the public query and mutation**

In `convex/lib/tenants.ts`, append:

```ts
export const getForwardTemplatesPublic = query({
  args: {},
  handler: async (ctx): Promise<{ ar: string; en: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.orgId) {
      return {
        ar: "للحصول على خدمة أفضل، تواصل مع فرع {{branchName}} على {{branchNumber}}",
        en: "For better service, please contact our {{branchName}} branch at {{branchNumber}}",
      };
    }
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", identity.orgId as string))
      .first();
    return tenant?.forwardMessageTemplates ?? {
      ar: "للحصول على خدمة أفضل، تواصل مع فرع {{branchName}} على {{branchNumber}}",
      en: "For better service, please contact our {{branchName}} branch at {{branchNumber}}",
    };
  },
});

export const updateForwardTemplate = mutation({
  args: { ar: v.string(), en: v.string() },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as import("./auth").OrgRole);

    const required = ["{{branchName}}", "{{branchNumber}}"];
    const missing: string[] = [];
    for (const v of required) {
      if (!args.ar.includes(v) || !args.en.includes(v)) missing.push(v);
    }
    if (missing.length > 0) {
      throw new ConvexError(`MISSING_TEMPLATE_VARIABLES:${missing.join(",")}`);
    }

    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .first();
    if (!tenant) throw new ConvexError("TENANT_NOT_FOUND");

    await ctx.db.patch(tenant._id, {
      forwardMessageTemplates: { ar: args.ar, en: args.en },
    });
  },
});
```

- [ ] **Step 2: Add the settings card**

Find the existing general settings component — likely `components/settings/general-settings.tsx` or `app/(dashboard)/settings/page.tsx`. Run: `ls components/settings/ && cat app/\(dashboard\)/settings/page.tsx | head -40`.

Add a card after existing cards:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";

export function ForwardTemplateCard() {
  const t = useT();
  const data = useQuery(api.lib.tenants.getForwardTemplatesPublic);
  const update = useMutation(api.lib.tenants.updateForwardTemplate);
  const [ar, setAr] = useState("");
  const [en, setEn] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setAr(data.ar);
      setEn(data.en);
    }
  }, [data]);

  const required = ["{{branchName}}", "{{branchNumber}}"];
  const missingAr = required.filter((v) => !ar.includes(v));
  const missingEn = required.filter((v) => !en.includes(v));
  const valid = missingAr.length === 0 && missingEn.length === 0;
  const dirty = !!data && (ar !== data.ar || en !== data.en);

  const save = async () => {
    setSaving(true);
    try {
      await update({ ar, en });
      toast.success(t("Saved", "تم الحفظ"));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("MISSING_TEMPLATE_VARIABLES")) {
        toast.error(t("Both languages must include all variables", "يجب أن تحتوي كلتا اللغتين على المتغيرات"));
      } else {
        toast.error(t("Save failed", "فشل الحفظ"));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <div>
        <h3 className="text-base font-semibold">
          {t("Forward message", "رسالة التحويل")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t(
            "Sent to the customer when an agent forwards their conversation to another branch.",
            "تُرسل للعميل عندما يقوم الموظف بتحويل محادثته لفرع آخر."
          )}
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t("Arabic", "العربية")}</label>
        <textarea
          dir="rtl"
          rows={2}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={ar}
          onChange={(e) => setAr(e.target.value)}
        />
        {missingAr.length > 0 && (
          <p className="text-xs text-destructive">
            {t("Missing variables: ", "متغيرات ناقصة: ")}
            {missingAr.join(" ")}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t("English", "الإنجليزية")}</label>
        <textarea
          dir="ltr"
          rows={2}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={en}
          onChange={(e) => setEn(e.target.value)}
        />
        {missingEn.length > 0 && (
          <p className="text-xs text-destructive">
            {t("Missing variables: ", "متغيرات ناقصة: ")}
            {missingEn.join(" ")}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {t("Variables:", "المتغيرات:")} <code dir="ltr">{"{{branchName}}"}</code>{" "}
          <code dir="ltr">{"{{branchNumber}}"}</code>
        </span>
        <div className="ms-auto">
          <Button onClick={save} disabled={!valid || !dirty || saving}>
            {saving && <Loader2 className="size-4 animate-spin me-2" />}
            {t("Save", "حفظ")}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire the card into the settings page**

In whichever settings page hosts general settings (find via `grep -rn "GeneralSettings\|general-settings" app/`), import and render `<ForwardTemplateCard />` near other tenant-level settings.

- [ ] **Step 4: Smoke test**

In dev: navigate to Settings → General. See the new card with current template (or default). Edit, save, reload — value persists. Try saving with a missing variable → inline error and toast.

- [ ] **Step 5: Commit**

```bash
git add convex/lib/tenants.ts components/settings/
git commit -m "feat(settings): forward message template editor (admin only)"
```

---

## Task 9: `inbox.queueCounts` query

**Files:**
- Modify: `convex/inbox.ts` — add `queueCounts` query

- [ ] **Step 1: Inspect current `inbox.ts`**

Run: `cat convex/inbox.ts | head -60`
Note the existing exports and patterns (auth helper, scoping by role).

- [ ] **Step 2: Add the query**

Append to `convex/inbox.ts`:

```ts
export const queueCounts = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    const isAdmin = orgRole === "org:admin" || orgRole === "admin";
    const isSupervisor = orgRole === "org:supervisor";
    const isPrivileged = isAdmin || isSupervisor;

    const allChannels = await ctx.db
      .query("channels")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    const channelMemberships = await ctx.db
      .query("channelMembers")
      .withIndex("by_user", (q) => q.eq("userId", callerId))
      .collect();
    const myChannelIds = new Set(channelMemberships.map((m) => m.channelId));

    const visibleChannels = isAdmin
      ? allChannels
      : allChannels.filter((c) => myChannelIds.has(c._id));

    const allDepts = await ctx.db
      .query("departments")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    const myDeptMemberships = await ctx.db
      .query("departmentMembers")
      .withIndex("by_user", (q) => q.eq("userId", callerId))
      .collect();
    const myDeptIds = new Set(myDeptMemberships.map((m) => m.departmentId));

    const allOpen = await ctx.db
      .query("conversations")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .filter((q) =>
        q.or(q.eq(q.field("status"), "open"), q.eq(q.field("status"), "pending"))
      )
      .collect();

    const visible = (c: typeof allOpen[number]): boolean => {
      if (isPrivileged) return true;
      if (c.assignedAgentId === callerId) return true;
      if (!c.assignedAgentId && c.departmentId && myDeptIds.has(c.departmentId)) return true;
      return false;
    };

    const channelsResult = visibleChannels.map((channel) => {
      const inChannel = allOpen.filter((c) => c.channelId === channel._id && visible(c));
      const unassigned = inChannel.filter((c) => !c.departmentId).length;

      const channelDepts = allDepts.filter(
        (d) =>
          d.channelId === channel._id &&
          !d.isArchived &&
          (isPrivileged || myDeptIds.has(d._id))
      );

      const departments = channelDepts.map((d) => {
        const inDept = inChannel.filter((c) => c.departmentId === d._id);
        return {
          _id: d._id,
          name: d.name,
          total: inDept.length,
          unassignedInDept: inDept.filter((c) => !c.assignedAgentId).length,
          mineInDept: inDept.filter((c) => c.assignedAgentId === callerId).length,
        };
      });

      return {
        _id: channel._id,
        displayName: channel.displayName,
        total: inChannel.length,
        unassigned,
        departments,
      };
    });

    const mine = allOpen.filter((c) => c.assignedAgentId === callerId).length;

    const mentions = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", callerId))
      .filter((q) => q.eq(q.field("read"), false))
      .filter((q) => q.eq(q.field("type"), "mention"))
      .collect();

    const forwardedAll = await ctx.db
      .query("conversations")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "forwarded")
      )
      .collect();
    const resolvedAll = await ctx.db
      .query("conversations")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "resolved")
      )
      .collect();

    const forwarded = isPrivileged
      ? forwardedAll.length
      : forwardedAll.filter((c) =>
          c.assignedAgentId === callerId ||
          (c.departmentId && myDeptIds.has(c.departmentId))
        ).length;
    const resolved = isPrivileged
      ? resolvedAll.length
      : resolvedAll.filter((c) =>
          c.assignedAgentId === callerId ||
          (c.departmentId && myDeptIds.has(c.departmentId))
        ).length;

    return {
      mine,
      mentions: mentions.length,
      channels: channelsResult,
      forwarded,
      resolved,
    };
  },
});
```

(If `channelMembers.by_user` index doesn't exist, grep schema and adjust to whatever the right index is. Same for `departmentMembers.by_user`.)

- [ ] **Step 3: Run typecheck**

Run: `npx convex dev --once`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add convex/inbox.ts
git commit -m "feat(convex): inbox.queueCounts query for sidebar tree"
```

---

## Task 10: Sidebar queue tree component

**Files:**
- Create: `components/inbox/inbox-queue-tree.tsx`
- Modify: `app/(dashboard)/inbox/page.tsx` — replace whatever sits in the left rail with the tree
- Modify: `components/inbox/conversation-list.tsx` — read scope from URL search params

- [ ] **Step 1: Inspect current sidebar usage**

Run: `grep -n "ConversationList\|filter\|status=" app/\(dashboard\)/inbox/page.tsx | head -20`
Note where the conversation list is rendered and what props it takes.

- [ ] **Step 2: Create the tree component**

Create `components/inbox/inbox-queue-tree.tsx`:

```tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ChevronDown, ChevronRight, Inbox, AtSign, Building2, Folder } from "lucide-react";
import { useT } from "@/lib/i18n/context";

function Count({ n }: { n: number }) {
  return (
    <span className="ms-auto text-xs tabular-nums text-muted-foreground">
      {n > 0 ? n : "—"}
    </span>
  );
}

export function InboxQueueTree() {
  const t = useT();
  const data = useQuery(api.inbox.queueCounts);
  const params = useSearchParams();
  const scope = params.get("scope") ?? "mine";

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("wabdesk:queue-tree:expanded") ?? "{}");
    } catch {
      return {};
    }
  });
  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("wabdesk:queue-tree:expanded", JSON.stringify(next));
      return next;
    });
  };

  const isActive = (s: string) => scope === s;
  const linkClass = (s: string) =>
    `flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted ${
      isActive(s) ? "bg-muted font-medium" : ""
    }`;

  if (!data) {
    return <div className="p-3 text-sm text-muted-foreground">{t("Loading…", "جارٍ التحميل…")}</div>;
  }

  return (
    <nav className="flex flex-col gap-0.5 p-2 text-sm">
      <Link href="/inbox?scope=mine" className={linkClass("mine")}>
        <Inbox className="size-4" />
        <span>{t("Mine", "محادثاتي")}</span>
        <Count n={data.mine} />
      </Link>
      <Link href="/inbox?scope=mentions" className={linkClass("mentions")}>
        <AtSign className="size-4" />
        <span>{t("Mentions", "الإشارات لي")}</span>
        <Count n={data.mentions} />
      </Link>

      <div className="my-2 border-t border-border" />

      {data.channels.map((c) => {
        const channelKey = `ch:${c._id}`;
        const open = expanded[channelKey] ?? false;
        return (
          <div key={c._id}>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              onClick={() => toggle(channelKey)}
            >
              {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              <Building2 className="size-4" />
              <span className="font-medium">{c.displayName}</span>
              <Count n={c.total} />
            </button>
            {open && (
              <div className="ms-6 flex flex-col gap-0.5">
                <Link
                  href={`/inbox?scope=channel:${c._id}:unassigned`}
                  className={linkClass(`channel:${c._id}:unassigned`)}
                >
                  <span>{t("Unassigned", "بدون تعيين")}</span>
                  <Count n={c.unassigned} />
                </Link>
                {c.departments.map((d) => {
                  const deptKey = `dept:${d._id}`;
                  const dOpen = expanded[deptKey] ?? false;
                  return (
                    <div key={d._id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                        onClick={() => toggle(deptKey)}
                      >
                        {dOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                        <Folder className="size-4" />
                        <span>{d.name}</span>
                        <Count n={d.total} />
                      </button>
                      {dOpen && (
                        <div className="ms-6 flex flex-col gap-0.5">
                          <Link
                            href={`/inbox?scope=dept:${d._id}:unassigned`}
                            className={linkClass(`dept:${d._id}:unassigned`)}
                          >
                            <span>{t("Unassigned in dept", "بدون تعيين بالإدارة")}</span>
                            <Count n={d.unassignedInDept} />
                          </Link>
                          <Link
                            href={`/inbox?scope=dept:${d._id}:mine`}
                            className={linkClass(`dept:${d._id}:mine`)}
                          >
                            <span>{t("Mine in dept", "محادثاتي بالإدارة")}</span>
                            <Count n={d.mineInDept} />
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="my-2 border-t border-border" />

      <Link href="/inbox?scope=forwarded" className={linkClass("forwarded")}>
        <span>{t("Forwarded", "محوَّلة")}</span>
        <Count n={data.forwarded} />
      </Link>
      <Link href="/inbox?scope=resolved" className={linkClass("resolved")}>
        <span>{t("Resolved", "محلولة")}</span>
        <Count n={data.resolved} />
      </Link>
    </nav>
  );
}
```

- [ ] **Step 3: Replace the inbox sidebar with the tree**

In `app/(dashboard)/inbox/page.tsx`, find the left rail / filter section (likely near the top of the JSX). Replace whatever filter list currently lives there with `<InboxQueueTree />`. Add the import:

```tsx
import { InboxQueueTree } from "@/components/inbox/inbox-queue-tree";
```

Keep the search box if it's separate from the filter list.

- [ ] **Step 4: Update `conversation-list.tsx` to read scope from URL**

In `components/inbox/conversation-list.tsx`, read `?scope=` via `useSearchParams()` and translate the scope into a Convex query filter:

```tsx
const params = useSearchParams();
const scope = params.get("scope") ?? "mine";

// Parse scope to filter args:
//   "mine"                               → { filter: "mine" }
//   "mentions"                           → { filter: "mentions" }
//   "channel:<id>:unassigned"            → { channelId, unassigned: true }
//   "dept:<id>:unassigned"               → { departmentId, unassignedInDept: true }
//   "dept:<id>:mine"                     → { departmentId, mineInDept: true }
//   "forwarded"                          → { status: "forwarded" }
//   "resolved"                           → { status: "resolved" }
```

If the existing `listForCaller` query doesn't accept these args, extend it (add optional args, branch on them in the handler). If extending feels heavy, add a new dedicated `inbox.listByScope` query that takes a `scope` string and parses server-side.

- [ ] **Step 5: Run typecheck and smoke test**

Run: `npx tsc --noEmit && npx convex dev --once`
Expected: No errors.

In dev:
- Reload the inbox. Tree appears with Mine / Mentions / each channel collapsed by default / Forwarded / Resolved.
- Counts match expectation against the DB.
- Click "Mine" → conversation list filters to my conversations. URL shows `?scope=mine`.
- Click a department's "Unassigned in dept" → list filters to that.
- As a non-admin, log in (or simulate by editing roles): only own channels/departments visible.
- Forwarded conversations appear under Forwarded; cannot reply.

- [ ] **Step 6: Commit**

```bash
git add components/inbox/inbox-queue-tree.tsx components/inbox/conversation-list.tsx app/\(dashboard\)/inbox/page.tsx convex/inbox.ts
git commit -m "feat(inbox): channel→department queue tree sidebar with URL-driven scope"
```

---

## Task 11: End-to-end manual verification

- [ ] **Step 1: Tenant with two channels and two departments per channel**

Set up (if not already): two channels (e.g. store-1, store-2), each with at least Sales and Support departments. Multiple agents, at least one shared between two channels.

- [ ] **Step 2: Within-branch transfer flow**

- Open a store-1 conversation as Admin → Transfer → Within branch → pick Support → optionally pick agent → Transfer.
- Confirm: activity pill, conversation moves into Support's queue, target agent (if any) gets notification.
- Repeat as Agent (one with conversation access): same outcome.
- Try as Agent without access → Transfer button hidden / mutation rejects.

- [ ] **Step 3: Cross-branch forward flow (in 24h window)**

- Customer messages store-1. Open conversation. Transfer → Forward to branch → store-2 → preview shows correct text → Forward & Close.
- Confirm: customer receives the redirect message via store-1's number; conversation status = forwarded; banner appears in thread; composer disabled; appears under Forwarded in sidebar.

- [ ] **Step 4: Cross-branch forward (outside 24h window)**

- Find or fake an old conversation (lastInboundAt > 24h ago). Try to forward → toast: "Outside the 24h window".
- Conversation untouched.

- [ ] **Step 5: Customer messages back after forward**

- Have customer send another message to store-1's number. Confirm a new conversation is created (not the forwarded one being reopened).

- [ ] **Step 6: Queue tree role scoping**

- Log in as Admin → see all channels and all departments.
- Log in as Supervisor (member of store-1 only) → see only store-1's channel branch.
- Log in as Agent (member of store-1's Support only) → see only store-1 with Support node; no Sales node visible.

- [ ] **Step 7: Forward template editing**

- As Admin, Settings → General → Forward message → edit AR text → save → reload → persists.
- Try removing `{{branchNumber}}` from EN → save fails with inline error.

- [ ] **Step 8: Arabic + English UI sweep**

- Toggle UI language → confirm dialog, queue tree, banner, settings card all render correctly in RTL/LTR.

- [ ] **Step 9: Commit verification notes (optional)**

If any defects were found and fixed in this task, commit the fix with `fix(transfer-and-queue): <description>`.

---

## Out of scope (per spec §10)

- Cross-branch handoff tracking with auto-linking
- Forward-specific Meta-approved templates for outside-24h cases
- Round-robin distribution within a department on transfer
- Bulk transfer / bulk forward
- Per-channel forward templates
- Real-time online/offline awareness in the agent picker
