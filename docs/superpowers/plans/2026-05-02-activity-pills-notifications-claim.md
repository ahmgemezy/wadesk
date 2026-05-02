# Activity Pills, Transfer Notifications & Claim — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add color-coded system-event pills to the conversation thread for all transfer/assign/status events, fan-out in-app notifications to department members on transfer, and add an explicit Claim button so agents can take ownership of conversations in their department queue before replying.

**Architecture:** Three layered changes — (1) schema adds `system_event` message contentType + `conversation_transferred` notification type, (2) four existing mutations and one new `claim` mutation write structured system-event messages and notifications, (3) frontend renders pills in-thread, locks the input, and surfaces a Claim button.

**Tech Stack:** Convex (mutations, queries, schema), Next.js App Router, React, Tailwind CSS, shadcn/ui, Clerk (org role), `useLocale` / `useT` from `lib/i18n/context`.

**Specs:**
- `docs/superpowers/specs/2026-05-02-conversation-activity-pills-design.md`
- `docs/superpowers/specs/2026-05-02-transfer-notification-claim-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `convex/schema.ts` | Modify | Add `system_event` contentType, `eventType`/`eventData` fields, `conversation_transferred` notification type |
| `convex/conversations.ts` | Modify | Update 4 mutations + add `claim`; update `get` to expose `isCurrentUserDeptMember` |
| `convex/actions/roundRobin.ts` | Modify | Pass `agentName` to `assignInternal` |
| `components/inbox/message-bubble.tsx` | Modify | Add `ConversationEventPill` sub-component + rendering branch |
| `components/inbox/conversation-thread.tsx` | Modify | Extend `MessageItem` type + map new fields |
| `components/inbox/claim-button.tsx` | Create | Self-contained Claim button — calls `conversations.claim` |
| `components/inbox/assign-agent-dialog.tsx` | Modify | Pass `agentName` arg to `conversations.assign` |
| `components/inbox/message-input.tsx` | Modify | Accept `isLocked` + `isPrivileged` props; disable input when locked |
| `app/(dashboard)/inbox/page.tsx` | Modify | Render `ClaimButton`, pass `isLocked`/`isPrivileged` to `MessageInput` |
| `app/(dashboard)/inbox/[id]/page.tsx` | Modify | Same as above for the deep-link route |
| `components/ui/notification-bell.tsx` | Modify | Handle `conversation_transferred` type — icon, label, navigation |

---

## Task 1: Schema — system_event + eventType/eventData + conversation_transferred

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Add `system_event` to the messages `contentType` union**

  In `convex/schema.ts`, find the `contentType` field inside the `messages` table (line ~205). Replace:

  ```ts
  contentType: v.union(
    v.literal("text"),
    v.literal("image"),
    v.literal("document"),
    v.literal("unsupported"),
    v.literal("audio"),
    v.literal("video"),
    v.literal("sticker"),
    v.literal("location"),
    v.literal("template"),
  ),
  ```

  With:

  ```ts
  contentType: v.union(
    v.literal("text"),
    v.literal("image"),
    v.literal("document"),
    v.literal("unsupported"),
    v.literal("audio"),
    v.literal("video"),
    v.literal("sticker"),
    v.literal("location"),
    v.literal("template"),
    v.literal("system_event"),
  ),
  ```

- [ ] **Step 2: Add `eventType` and `eventData` optional fields to the `messages` table**

  Immediately after the `reactions` field (before the closing `})` of the messages table definition), add:

  ```ts
  eventType: v.optional(v.union(
    v.literal("transfer_department"),
    v.literal("agent_assigned"),
    v.literal("agent_unassigned"),
    v.literal("resolved"),
    v.literal("reopened"),
  )),
  eventData: v.optional(v.object({
    actorName: v.optional(v.string()),
    fromDept: v.optional(v.string()),
    toDept: v.optional(v.string()),
    agentName: v.optional(v.string()),
  })),
  ```

- [ ] **Step 3: Add `conversation_transferred` to the `notifications` `type` union**

  In `convex/schema.ts`, find the `notifications` table `type` field (line ~337). Replace:

  ```ts
  type: v.union(
    v.literal("followup_due"),
    v.literal("sla_breach"),
    v.literal("template_approved"),
    v.literal("template_rejected"),
    v.literal("channel_expiring_soon"),
    v.literal("channel_deleted"),
    v.literal("agent_welcome"),
    v.literal("billing_payment_failed"),
    v.literal("billing_subscription_expired"),
  ),
  ```

  With:

  ```ts
  type: v.union(
    v.literal("followup_due"),
    v.literal("sla_breach"),
    v.literal("template_approved"),
    v.literal("template_rejected"),
    v.literal("channel_expiring_soon"),
    v.literal("channel_deleted"),
    v.literal("agent_welcome"),
    v.literal("billing_payment_failed"),
    v.literal("billing_subscription_expired"),
    v.literal("conversation_transferred"),
  ),
  ```

- [ ] **Step 4: Deploy and verify no TypeScript errors**

  Run:
  ```bash
  npx tsc --noEmit
  ```
  Expected: 0 errors.

- [ ] **Step 5: Commit**

  ```bash
  git add convex/schema.ts
  git commit -m "feat: add system_event message type and conversation_transferred notification to schema"
  ```

---

## Task 2: `transferToDepartment` — system_event pill + fan-out notifications

**Files:**
- Modify: `convex/conversations.ts` (the `transferToDepartment` mutation, lines ~393–453)

- [ ] **Step 1: Replace the internal note insert with a system_event insert**

  Find the `await ctx.db.insert("messages", { ... })` call at the bottom of `transferToDepartment`. Replace the entire insert (the block starting with `const fromName = oldDept?.name`) with:

  ```ts
  const identity = await ctx.auth.getUserIdentity();
  const actorName = identity?.name ?? identity?.email ?? "Someone";
  const fromName = oldDept?.name ?? "Unassigned";
  const toName = targetDept.name;

  await ctx.db.insert("messages", {
    conversationId: args.conversationId,
    tenantId,
    direction: "outbound",
    content: "",
    contentType: "system_event",
    eventType: "transfer_department",
    eventData: { actorName, fromDept: fromName, toDept: toName },
    isInternalNote: false,
    authorId: callerId,
    status: "sent",
    timestamp: now,
    createdAt: now,
  });
  ```

- [ ] **Step 2: Add in-app notification fan-out after the message insert**

  Immediately after the message insert, add:

  ```ts
  // Fan-out in-app notifications to all department members + supervisors
  const deptMembers = await ctx.db
    .query("departmentMembers")
    .withIndex("by_department", (q) => q.eq("departmentId", args.targetDepartmentId))
    .collect();

  const memberIds = deptMembers.map((m) => m.userId);
  const supervisorIds: string[] = targetDept.supervisors ?? [];
  const recipients = [...new Set([...memberIds, ...supervisorIds])].filter(
    (id) => id !== callerId,
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
      }),
    ),
  );
  ```

- [ ] **Step 3: Verify TypeScript**

  ```bash
  npx tsc --noEmit
  ```
  Expected: 0 errors.

- [ ] **Step 4: Manual smoke-test**

  Start `npx convex dev` and the Next.js dev server. Transfer a conversation to a different department. In the Convex dashboard → Data → messages, confirm:
  - The new message has `contentType: "system_event"`, `eventType: "transfer_department"`, `eventData.actorName` set, `isInternalNote: false`.
  - The old `contentType: "text"` internal note is **gone** (replaced).

  In Data → notifications, confirm one notification per department member (excluding the actor).

- [ ] **Step 5: Commit**

  ```bash
  git add convex/conversations.ts
  git commit -m "feat: replace transferToDepartment internal note with system_event pill and fan-out notifications"
  ```

---

## Task 3: `assign` mutation — system_event + agentName arg

**Files:**
- Modify: `convex/conversations.ts` (the `assign` mutation, lines ~97–142)
- Modify: `components/inbox/assign-agent-dialog.tsx`

- [ ] **Step 1: Add `agentName` optional arg to `assign`**

  Find the `assign` mutation args definition. Replace:

  ```ts
  args: {
    conversationId: v.id("conversations"),
    agentId: v.optional(v.string()),
  },
  ```

  With:

  ```ts
  args: {
    conversationId: v.id("conversations"),
    agentId: v.optional(v.string()),
    agentName: v.optional(v.string()),
  },
  ```

- [ ] **Step 2: Add system_event insert after the patch in `assign`**

  Find the `await ctx.db.patch(args.conversationId, { ... })` call. After it, add:

  ```ts
  const identity = await ctx.auth.getUserIdentity();
  const actorName = identity?.name ?? identity?.email ?? "Someone";
  const now = Date.now();

  if (args.agentId) {
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      tenantId,
      direction: "outbound",
      content: "",
      contentType: "system_event",
      eventType: "agent_assigned",
      eventData: { actorName, agentName: args.agentName ?? args.agentId },
      isInternalNote: false,
      authorId: callerId,
      status: "sent",
      timestamp: now,
      createdAt: now,
    });
  } else {
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      tenantId,
      direction: "outbound",
      content: "",
      contentType: "system_event",
      eventType: "agent_unassigned",
      eventData: { actorName },
      isInternalNote: false,
      authorId: callerId,
      status: "sent",
      timestamp: now,
      createdAt: now,
    });
  }
  ```

  > **Note:** The `assign` mutation already declares `const { tenantId, orgRole } = await getCallerIdentity(ctx)` — add `callerId` to the destructuring: `const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx)`.

- [ ] **Step 3: Update `AssignAgentDialog` to pass `agentName`**

  In `components/inbox/assign-agent-dialog.tsx`, find the `assign({ ... })` call inside the `memberList.map` block. Replace:

  ```ts
  assign({
    conversationId: conversationId as Id<"conversations">,
    agentId: userId ?? undefined,
  })
  ```

  With:

  ```ts
  assign({
    conversationId: conversationId as Id<"conversations">,
    agentId: userId ?? undefined,
    agentName: name,
  })
  ```

- [ ] **Step 4: Verify TypeScript**

  ```bash
  npx tsc --noEmit
  ```
  Expected: 0 errors.

- [ ] **Step 5: Commit**

  ```bash
  git add convex/conversations.ts components/inbox/assign-agent-dialog.tsx
  git commit -m "feat: add system_event pill on agent assign/unassign"
  ```

---

## Task 4: `assignInternal` + `roundRobin.ts` — system_event for auto-assignment

**Files:**
- Modify: `convex/conversations.ts` (the `assignInternal` internalMutation, lines ~336–378)
- Modify: `convex/actions/roundRobin.ts`

- [ ] **Step 1: Add `agentName` optional arg to `assignInternal`**

  Find the `assignInternal` args definition. Add `agentName`:

  ```ts
  args: {
    conversationId: v.id("conversations"),
    agentId: v.string(),
    tenantId: v.string(),
    assignmentType: v.optional(v.union(
      v.literal("round_robin"),
      v.literal("manual"),
    )),
    agentName: v.optional(v.string()),
  },
  ```

- [ ] **Step 2: Add system_event insert after the patch in `assignInternal`**

  After the `await ctx.db.patch(args.conversationId, { ... })` call in `assignInternal`, add:

  ```ts
  const now = Date.now();
  await ctx.db.insert("messages", {
    conversationId: args.conversationId,
    tenantId: args.tenantId,
    direction: "outbound",
    content: "",
    contentType: "system_event",
    eventType: "agent_assigned",
    eventData: {
      actorName: args.assignmentType === "round_robin" ? "System" : "System",
      agentName: args.agentName ?? args.agentId,
    },
    isInternalNote: false,
    status: "sent",
    timestamp: now,
    createdAt: now,
  });
  ```

- [ ] **Step 3: Pass `agentName` from `roundRobin.ts`**

  In `convex/actions/roundRobin.ts`, find the two `ctx.runMutation(internal.conversations.assignInternal, { ... })` calls.

  For the fallback (all-org-members) branch, update to:
  ```ts
  const agentMember = activeMembers[idx];
  const assignedAgentId = agentMember.publicUserData?.userId;
  const agentName =
    agentMember.publicUserData?.firstName ??
    agentMember.publicUserData?.identifier ??
    assignedAgentId ??
    undefined;

  if (assignedAgentId) {
    await ctx.runMutation(internal.conversations.assignInternal, {
      conversationId: args.conversationId,
      agentId: assignedAgentId,
      tenantId: args.tenantId,
      assignmentType: "round_robin",
      agentName,
    });
  }
  ```

  For the department-members branch, update to:
  ```ts
  const assignedAgentId = sortedIds[idx];
  const matchedMember = deptMembers.find((m) => m.userId === assignedAgentId);
  const agentName = matchedMember?.userName ?? assignedAgentId;

  await ctx.runMutation(internal.conversations.assignInternal, {
    conversationId: args.conversationId,
    agentId: assignedAgentId,
    tenantId: args.tenantId,
    assignmentType: "round_robin",
    agentName,
  });
  ```

  > The `deptMembers` variable is already in scope in `roundRobin.ts` from the earlier query. `departmentMembers.userName` is stored at invite time.

- [ ] **Step 4: Verify TypeScript**

  ```bash
  npx tsc --noEmit
  ```
  Expected: 0 errors.

- [ ] **Step 5: Commit**

  ```bash
  git add convex/conversations.ts convex/actions/roundRobin.ts
  git commit -m "feat: add system_event pill on round-robin auto-assignment"
  ```

---

## Task 5: `setStatus` — system_event pill for resolved / reopened

**Files:**
- Modify: `convex/conversations.ts` (the `setStatus` mutation, lines ~141–195)

- [ ] **Step 1: Add system_event insert at the end of `setStatus`**

  Find `setStatus`. After `await ctx.db.patch(args.conversationId, { status: args.status })`, add a block that fires a system_event only for `resolved` and `open` (reopened). The existing `if (args.status === "resolved")` block stays untouched — add the system_event insert **before** that block:

  ```ts
  // System event pill — only for resolved and open (reopened); pending gets no pill
  if (args.status === "resolved" || args.status === "open") {
    const identity = await ctx.auth.getUserIdentity();
    const actorName = identity?.name ?? identity?.email ?? "Agent";
    const now = Date.now();
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      tenantId,
      direction: "outbound",
      content: "",
      contentType: "system_event",
      eventType: args.status === "resolved" ? "resolved" : "reopened",
      eventData: { actorName },
      isInternalNote: false,
      authorId: callerId,
      status: "sent",
      timestamp: now,
      createdAt: now,
    });
  }
  ```

  > **Note:** `setStatus` already has `const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx)` — `callerId` is already available.

- [ ] **Step 2: Verify TypeScript**

  ```bash
  npx tsc --noEmit
  ```
  Expected: 0 errors.

- [ ] **Step 3: Commit**

  ```bash
  git add convex/conversations.ts
  git commit -m "feat: add system_event pill on conversation resolved/reopened"
  ```

---

## Task 6: `claim` mutation + `conversations.get` with `isCurrentUserDeptMember`

**Files:**
- Modify: `convex/conversations.ts`

- [ ] **Step 1: Add the `claim` mutation to `convex/conversations.ts`**

  Add this export at the end of the file (after `transferToDepartment`):

  ```ts
  export const claim = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
      const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);

      const conversation = await ctx.db.get(args.conversationId);
      if (!conversation || conversation.tenantId !== tenantId) {
        throw new ConvexError("NOT_FOUND");
      }
      if (conversation.assignedAgentId) {
        throw new ConvexError("ALREADY_ASSIGNED");
      }
      if (!conversation.departmentId) {
        throw new ConvexError("NOT_IN_DEPARTMENT_QUEUE");
      }

      if (!isAdminOrSupervisor(orgRole)) {
        const membership = await ctx.db
          .query("departmentMembers")
          .withIndex("by_department_user", (q) =>
            q
              .eq("departmentId", conversation.departmentId as Id<"departments">)
              .eq("userId", callerId),
          )
          .first();
        if (!membership) throw new ConvexError("NOT_DEPARTMENT_MEMBER");
      }

      const now = Date.now();
      const identity = await ctx.auth.getUserIdentity();
      const callerName = identity?.name ?? identity?.email ?? "Agent";

      await ctx.db.patch(args.conversationId, {
        assignedAgentId: callerId,
        assignedAt: now,
        assignmentType: "manual",
        lastMessageAt: now,
      });

      await ctx.db.insert("messages", {
        conversationId: args.conversationId,
        tenantId,
        direction: "outbound",
        content: "",
        contentType: "system_event",
        eventType: "agent_assigned",
        eventData: { actorName: callerName, agentName: callerName },
        isInternalNote: false,
        authorId: callerId,
        status: "sent",
        timestamp: now,
        createdAt: now,
      });
    },
  });
  ```

- [ ] **Step 2: Update `conversations.get` to include `isCurrentUserDeptMember`**

  Find the `get` query (line ~77). Replace the handler:

  ```ts
  export const get = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
      const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);

      const conversation = await ctx.db.get(args.conversationId);
      if (!conversation || conversation.tenantId !== tenantId) return null;

      if (
        !isAdminOrSupervisor(orgRole) &&
        conversation.assignedAgentId !== callerId &&
        conversation.assignedAgentId !== undefined
      ) {
        return null;
      }

      let isCurrentUserDeptMember = false;
      if (conversation.departmentId) {
        const membership = await ctx.db
          .query("departmentMembers")
          .withIndex("by_department_user", (q) =>
            q
              .eq("departmentId", conversation.departmentId as Id<"departments">)
              .eq("userId", callerId),
          )
          .first();
        isCurrentUserDeptMember = !!membership;
      }

      return { ...conversation, isCurrentUserDeptMember };
    },
  });
  ```

- [ ] **Step 3: Verify TypeScript**

  ```bash
  npx tsc --noEmit
  ```
  Expected: 0 errors.

- [ ] **Step 4: Manual smoke-test**

  In Convex dashboard → Functions → `conversations:claim`, invoke it manually with a `conversationId` that has `departmentId` set and `assignedAgentId` unset. Confirm:
  - The conversation patches with your userId as `assignedAgentId`.
  - A `system_event` message with `eventType: "agent_assigned"` appears in the messages table.
  - Calling claim again returns `ALREADY_ASSIGNED`.

- [ ] **Step 5: Commit**

  ```bash
  git add convex/conversations.ts
  git commit -m "feat: add claim mutation and isCurrentUserDeptMember to conversations.get"
  ```

---

## Task 7: `ConversationEventPill` — render system_event in thread

**Files:**
- Modify: `components/inbox/message-bubble.tsx`
- Modify: `components/inbox/conversation-thread.tsx`

- [ ] **Step 1: Extend the `Message` type in `message-bubble.tsx`**

  Find the `type Message = { ... }` declaration (line ~78). Add the two new optional fields:

  ```ts
  type Message = {
    _id: string;
    direction: "inbound" | "outbound";
    content: string;
    contentType: "text" | "image" | "document" | "unsupported" | "audio" | "video" | "sticker" | "location" | "template" | "system_event";
    isInternalNote: boolean;
    authorId: string | undefined;
    source?: "customer" | "api" | "mobile";
    mediaUrl?: string;
    metaMessageId?: string;
    status: "sending" | "sent" | "delivered" | "read" | "failed";
    timestamp: number;
    quotedMessageId?: string;
    deletedAt?: number;
    reactions?: Reaction[];
    eventType?: "transfer_department" | "agent_assigned" | "agent_unassigned" | "resolved" | "reopened";
    eventData?: {
      actorName?: string;
      fromDept?: string;
      toDept?: string;
      agentName?: string;
    };
  };
  ```

- [ ] **Step 2: Add `ConversationEventPill` sub-component to `message-bubble.tsx`**

  Add this function just above the main `MessageBubble` export:

  ```tsx
  function ConversationEventPill({
    message,
    locale,
  }: {
    message: Message;
    locale: "ar" | "en";
  }) {
    const isAr = locale === "ar";
    const { eventType, eventData } = message;

    const config: Record<
      string,
      { pillBg: string; pillText: string; lineBg: string; icon: string }
    > = {
      transfer_department: {
        pillBg: "bg-blue-100 dark:bg-blue-950",
        pillText: "text-blue-700 dark:text-blue-300",
        lineBg: "bg-blue-200 dark:bg-blue-800",
        icon: "↗",
      },
      agent_assigned: {
        pillBg: "bg-purple-100 dark:bg-purple-950",
        pillText: "text-purple-700 dark:text-purple-300",
        lineBg: "bg-purple-200 dark:bg-purple-800",
        icon: "👤",
      },
      agent_unassigned: {
        pillBg: "bg-gray-100 dark:bg-gray-800",
        pillText: "text-gray-600 dark:text-gray-400",
        lineBg: "bg-gray-300 dark:bg-gray-700",
        icon: "👤",
      },
      resolved: {
        pillBg: "bg-green-100 dark:bg-green-950",
        pillText: "text-green-700 dark:text-green-300",
        lineBg: "bg-green-200 dark:bg-green-800",
        icon: "✓",
      },
      reopened: {
        pillBg: "bg-yellow-100 dark:bg-yellow-950",
        pillText: "text-yellow-800 dark:text-yellow-300",
        lineBg: "bg-yellow-200 dark:bg-yellow-800",
        icon: "↩",
      },
    };

    const style = config[eventType ?? ""] ?? config.agent_unassigned;
    const actor = eventData?.actorName ?? (isAr ? "شخص ما" : "Someone");
    const agent = eventData?.agentName ?? "";
    const toDept = eventData?.toDept ?? "";

    let label = "";
    if (isAr) {
      if (eventType === "transfer_department")
        label = `${actor} نقل إلى ${toDept}`;
      else if (eventType === "agent_assigned")
        label = `${actor} أسند إلى ${agent}`;
      else if (eventType === "agent_unassigned")
        label = "تم إلغاء الإسناد";
      else if (eventType === "resolved")
        label = `${actor} أغلق المحادثة`;
      else if (eventType === "reopened")
        label = "أُعيد فتح المحادثة";
    } else {
      if (eventType === "transfer_department")
        label = `${actor} transferred to ${toDept}`;
      else if (eventType === "agent_assigned")
        label = `${actor} assigned to ${agent}`;
      else if (eventType === "agent_unassigned")
        label = "Conversation unassigned";
      else if (eventType === "resolved")
        label = `${actor} resolved this`;
      else if (eventType === "reopened")
        label = "Conversation reopened";
    }

    return (
      <div className="flex items-center gap-2 my-1 px-2">
        <div className={`flex-1 h-px ${style.lineBg}`} />
        <span
          className={`text-[11px] font-medium rounded-full px-3 py-0.5 whitespace-nowrap ${style.pillBg} ${style.pillText}`}
        >
          {style.icon} {label}
        </span>
        <div className={`flex-1 h-px ${style.lineBg}`} />
      </div>
    );
  }
  ```

- [ ] **Step 3: Add the rendering branch in `MessageBubble`**

  Find the main `export function MessageBubble(...)` function. It receives a `message` prop and `locale`. The function body starts with the deleted-message check. Add the system_event branch **first**, before any other check:

  ```tsx
  // System event pill — centered, color-coded, never a bubble
  if (message.contentType === "system_event") {
    return <ConversationEventPill message={message} locale={locale} />;
  }
  ```

  > Place this immediately after the opening brace of the function body, before `const timeStr = ...` or the deleted-message check, whichever comes first.

- [ ] **Step 4: Check that `MessageBubble` receives `locale` prop**

  Search the `MessageBubble` props interface for `locale`. If it's missing, add it:

  ```ts
  export function MessageBubble({
    message,
    locale,
    ...
  }: {
    message: Message;
    locale: "ar" | "en";
    ...
  })
  ```

  Then check how `MessageBubble` is called in `conversation-thread.tsx` — it must pass `locale`.

- [ ] **Step 5: Extend `MessageItem` type in `conversation-thread.tsx`**

  Find `type MessageItem = { ... }` at the top of the file. Add the two new fields:

  ```ts
  type MessageItem = {
    _id: string;
    direction: "inbound" | "outbound";
    content: string;
    contentType?: string;
    isInternalNote: boolean;
    authorId: string | undefined;
    mediaUrl?: string;
    metaMessageId?: string;
    status: "sending" | "sent" | "delivered" | "read" | "failed";
    timestamp: number;
    quotedMessageId?: string;
    deletedAt?: number;
    reactions?: { emoji: string; reactorId: string }[];
    eventType?: string;
    eventData?: {
      actorName?: string;
      fromDept?: string;
      toDept?: string;
      agentName?: string;
    };
  };
  ```

- [ ] **Step 6: Map `eventType` and `eventData` in the `rawMessages.map(...)` call**

  Find the `rawMessages.map((m) => ({ ... }))` block. Add two new fields to the mapping object:

  ```ts
  eventType: (m.eventType as string | undefined) ?? undefined,
  eventData: m.eventData as MessageItem["eventData"] ?? undefined,
  ```

- [ ] **Step 7: Pass the new fields through to `MessageBubble`**

  In the JSX where `<MessageBubble message={...} />` is rendered, ensure the `message` object passed includes `eventType` and `eventData`. Since you're passing the full `MessageItem`, this is automatic as long as the type is correctly mapped.

- [ ] **Step 8: Verify TypeScript**

  ```bash
  npx tsc --noEmit
  ```
  Expected: 0 errors.

- [ ] **Step 9: Manual smoke-test**

  Open a conversation that had a transfer event inserted in Tasks 2–5. Confirm:
  - A centered blue pill reading "X transferred to Support" appears in the thread (not a yellow internal-note bubble).
  - Old internal-note transfers (inserted before this feature) still render as internal notes.

- [ ] **Step 10: Commit**

  ```bash
  git add components/inbox/message-bubble.tsx components/inbox/conversation-thread.tsx
  git commit -m "feat: render system_event messages as centered color-coded pills in conversation thread"
  ```

---

## Task 8: `ClaimButton` component

**Files:**
- Create: `components/inbox/claim-button.tsx`

- [ ] **Step 1: Create `components/inbox/claim-button.tsx`**

  ```tsx
  "use client";

  import { useState } from "react";
  import { useMutation } from "convex/react";
  import { api } from "@/convex/_generated/api";
  import type { Id } from "@/convex/_generated/dataModel";
  import { Button } from "@/components/ui/button";
  import { Loader2, Zap } from "lucide-react";
  import { toast } from "sonner";
  import { useT } from "@/lib/i18n/context";

  interface ClaimButtonProps {
    conversationId: string;
    /** Show only when conversation is in dept queue + unassigned + user is eligible */
    show: boolean;
  }

  export function ClaimButton({ conversationId, show }: ClaimButtonProps) {
    const t = useT();
    const claimMutation = useMutation(api.conversations.claim);
    const [claiming, setClaiming] = useState(false);

    if (!show) return null;

    const handleClaim = async () => {
      setClaiming(true);
      try {
        await claimMutation({
          conversationId: conversationId as Id<"conversations">,
        });
        toast.success(t("Conversation claimed", "تم استلام المحادثة"));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("ALREADY_ASSIGNED")) {
          toast.error(t("Already assigned to another agent", "تم تعيين المحادثة لوكيل آخر"));
        } else if (msg.includes("NOT_DEPARTMENT_MEMBER")) {
          toast.error(t("You are not a member of this department", "لست عضواً في هذه الإدارة"));
        } else {
          toast.error(t("Failed to claim conversation", "فشل استلام المحادثة"));
        }
      } finally {
        setClaiming(false);
      }
    };

    return (
      <Button
        size="sm"
        className="gap-1.5"
        onClick={handleClaim}
        disabled={claiming}
      >
        {claiming ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Zap className="h-3.5 w-3.5" />
        )}
        {t("Claim", "استلام")}
      </Button>
    );
  }
  ```

- [ ] **Step 2: Verify TypeScript**

  ```bash
  npx tsc --noEmit
  ```
  Expected: 0 errors.

- [ ] **Step 3: Commit**

  ```bash
  git add components/inbox/claim-button.tsx
  git commit -m "feat: add ClaimButton component for department queue conversations"
  ```

---

## Task 9: Wire `ClaimButton` + `MessageInput` lock into both inbox pages

**Files:**
- Modify: `components/inbox/message-input.tsx`
- Modify: `app/(dashboard)/inbox/page.tsx`
- Modify: `app/(dashboard)/inbox/[id]/page.tsx`

- [ ] **Step 1: Add `isLocked` and `isPrivileged` props to `MessageInput`**

  In `components/inbox/message-input.tsx`, find the props interface and add two optional props:

  ```ts
  export function MessageInput({
    conversationId,
    onQuickReplyOpen,
    quickReplyContent,
    onQuickReplyConsumed,
    replyTo,
    onClearReply,
    isLocked,
    isPrivileged,
  }: {
    conversationId: string;
    onQuickReplyOpen?: () => void;
    quickReplyContent?: string;
    onQuickReplyConsumed?: () => void;
    replyTo?: { messageId: string; content: string; authorLabel: string } | null;
    onClearReply?: () => void;
    isLocked?: boolean;
    isPrivileged?: boolean;
  })
  ```

- [ ] **Step 2: Render a locked state when `isLocked && !isPrivileged`**

  At the very start of the `MessageInput` JSX return, add a guard. Find where the component returns its main JSX (look for the outer `<div>` that wraps the textarea). Add this early return right before the main return:

  ```tsx
  const t = useT(); // already present

  if (isLocked && !isPrivileged) {
    return (
      <div className="border-t bg-muted/40 px-4 py-3 flex items-center justify-center text-sm text-muted-foreground">
        {t("Claim this conversation first to reply", "استلم المحادثة أولاً للرد")}
      </div>
    );
  }
  ```

- [ ] **Step 3: Wire `ClaimButton` + `isLocked` into `app/(dashboard)/inbox/page.tsx`**

  Add the import at the top:
  ```tsx
  import { ClaimButton } from "@/components/inbox/claim-button";
  ```

  Find `const { isAuthenticated } = useConvexAuth();` and add role detection below it:
  ```tsx
  const { membership } = useOrganization();
  const orgRole = (membership as any)?.role as string | undefined;
  const isPrivileged =
    orgRole === "org:admin" || orgRole === "admin" || orgRole === "org:supervisor";
  ```

  > `useOrganization` is already imported from `@clerk/nextjs` in `assign-agent-dialog.tsx` — add the import to this page too: `import { useOrganization } from "@clerk/nextjs";`

  In the conversation header (where `<TransferDepartmentDialog />` and `<AssignAgentDialog />` live), add `<ClaimButton>` immediately before `<TransferDepartmentDialog>`:

  ```tsx
  <ClaimButton
    conversationId={selectedId}
    show={
      !!selectedConversation?.departmentId &&
      !selectedConversation?.assignedAgentId &&
      (!!selectedConversation?.isCurrentUserDeptMember || isPrivileged)
    }
  />
  ```

  Pass `isLocked` and `isPrivileged` to `<MessageInput>`:
  ```tsx
  <MessageInput
    conversationId={selectedId}
    onQuickReplyOpen={() => setQuickReplyOpen(true)}
    quickReplyContent={quickReplyContent}
    onQuickReplyConsumed={() => setQuickReplyContent("")}
    replyTo={replyTo}
    onClearReply={() => setReplyTo(null)}
    isLocked={!!selectedConversation?.departmentId && !selectedConversation?.assignedAgentId}
    isPrivileged={isPrivileged}
  />
  ```

- [ ] **Step 4: Wire `ClaimButton` + `isLocked` into `app/(dashboard)/inbox/[id]/page.tsx`**

  Add import:
  ```tsx
  import { ClaimButton } from "@/components/inbox/claim-button";
  ```

  The page already has `const { membership } = useOrganization()` and `const isAdmin = ...`. Add a broader `isPrivileged` check:
  ```tsx
  const isPrivileged =
    membership?.role === "org:admin" ||
    membership?.role === "admin" ||
    membership?.role === "org:supervisor";
  ```

  In the header, add `<ClaimButton>` alongside the other action buttons:
  ```tsx
  <ClaimButton
    conversationId={conversationId}
    show={
      !!conversation?.departmentId &&
      !conversation?.assignedAgentId &&
      (!!conversation?.isCurrentUserDeptMember || isPrivileged)
    }
  />
  ```

  Update `<MessageInput>` to pass the lock:
  ```tsx
  <MessageInput
    conversationId={conversationId}
    onQuickReplyOpen={() => setQuickReplyOpen(true)}
    quickReplyContent={quickReplyContent}
    onQuickReplyConsumed={() => setQuickReplyContent("")}
    replyTo={replyTo}
    onClearReply={() => setReplyTo(null)}
    isLocked={!!conversation?.departmentId && !conversation?.assignedAgentId}
    isPrivileged={isPrivileged}
  />
  ```

- [ ] **Step 5: Verify TypeScript**

  ```bash
  npx tsc --noEmit
  ```
  Expected: 0 errors.

- [ ] **Step 6: Manual smoke-test**

  Transfer a conversation to a department. As an agent who is a member of that department:
  - Open the conversation — Claim button is visible, input shows "استلم المحادثة أولاً للرد".
  - Click Claim — button disappears, input unlocks, "تم استلام المحادثة" toast appears.
  - A purple "Agent assigned to {you}" pill appears in the thread.

  As an admin:
  - Claim button is visible, input is NOT locked (can reply immediately).

- [ ] **Step 7: Commit**

  ```bash
  git add components/inbox/message-input.tsx app/\(dashboard\)/inbox/page.tsx app/\(dashboard\)/inbox/\[id\]/page.tsx
  git commit -m "feat: add Claim button and locked input to department queue conversations"
  ```

---

## Task 10: NotificationBell — handle `conversation_transferred`

**Files:**
- Modify: `components/ui/notification-bell.tsx`

- [ ] **Step 1: Add routing for `conversation_transferred` in `handleNotificationClick`**

  Find the `function handleNotificationClick(...)` in `notification-bell.tsx`. Add a branch for the new type:

  ```ts
  function handleNotificationClick(notificationId: Id<"notifications">, type: string, referenceId: string) {
    try {
      markRead({ notificationId });
      if (type === "sla_breach" || type === "conversation_transferred") {
        router.push(`/inbox/${referenceId}`);
      } else if (type === "channel_expiring_soon" || type === "channel_deleted") {
        router.push("/settings/channels");
      } else {
        router.push("/contacts");
      }
    } catch {
      // Silently ignore errors
    }
  }
  ```

- [ ] **Step 2: Add a visual label for `conversation_transferred` in the notification list**

  Inside the `notifications.map((n) => (...))` JSX, add a label block for the new type alongside the existing `sla_breach`, `channel_expiring_soon`, and `channel_deleted` blocks:

  ```tsx
  {n.type === "conversation_transferred" && (
    <span className="inline-flex items-center gap-1 text-blue-600 text-[10px] font-semibold mb-0.5">
      ↗ {isRtl ? "محادثة جديدة في قسمك" : "New conversation in your dept"}
    </span>
  )}
  ```

- [ ] **Step 3: Verify TypeScript**

  ```bash
  npx tsc --noEmit
  ```
  Expected: 0 errors.

- [ ] **Step 4: Manual smoke-test**

  Transfer a conversation to a department. Log in as a different user who is a member of that department. Confirm:
  - Red badge appears on the bell icon.
  - Opening the bell shows a notification with the "↗ New conversation in your dept" label and the contact name.
  - Clicking it navigates to `/inbox/{conversationId}`.

- [ ] **Step 5: Commit**

  ```bash
  git add components/ui/notification-bell.tsx
  git commit -m "feat: handle conversation_transferred notification in bell panel with dept navigation"
  ```

---

## Self-Review Checklist

- [x] **spec: system_event contentType** → Task 1 Step 1
- [x] **spec: eventType + eventData fields** → Task 1 Step 2
- [x] **spec: conversation_transferred notification type** → Task 1 Step 3
- [x] **spec: transferToDepartment replaces internal note with system_event** → Task 2 Step 1
- [x] **spec: transferToDepartment fans out in-app notifications** → Task 2 Step 2
- [x] **spec: assign inserts agent_assigned / agent_unassigned pill** → Task 3
- [x] **spec: assignInternal inserts agent_assigned with actorName="System"** → Task 4
- [x] **spec: setStatus inserts resolved / reopened pill; pending gets no pill** → Task 5
- [x] **spec: claim mutation — eligibility check, patch, system_event** → Task 6 Step 1
- [x] **spec: conversations.get returns isCurrentUserDeptMember** → Task 6 Step 2
- [x] **spec: ConversationEventPill — centered, color-coded, bilingual** → Task 7
- [x] **spec: pill colors (blue/purple/gray/green/amber)** → Task 7 Step 2
- [x] **spec: ClaimButton — visible when dept+unassigned+eligible** → Tasks 8–9
- [x] **spec: MessageInput locked for agents, unlocked for admin/supervisor** → Task 9 Steps 1–2
- [x] **spec: notification bell navigates to conversation on click** → Task 10

No spec requirements are unaccounted for.
