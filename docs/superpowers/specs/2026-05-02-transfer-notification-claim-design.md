# Transfer Notification + Conversation Claim — Design Spec

**Date:** 2026-05-02  
**Branch:** feat/013-departments  
**Status:** Approved — ready for implementation  
**Related spec:** `2026-05-02-conversation-activity-pills-design.md`

---

## Problem

When a conversation is transferred to a department, two things are missing:

1. **Notification gap** — agents in the receiving department have no signal that a new conversation landed in their queue. The transfer fires no notification of any kind.
2. **Participation gap** — there is no explicit mechanic for an agent to take ownership of an unassigned conversation in their department queue before replying. The current "First Reply Wins" mode creates a risk of two agents replying simultaneously.

---

## Solution Summary

- **Notification**: insert an in-app bell notification for every member of the receiving department (agents + department supervisors), skipping the actor who did the transfer.
- **Claim**: a new `conversations.claim` mutation + a "Claim" button in the conversation header. The message input is locked until the conversation is claimed.

---

## Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Who gets notified | All department members + supervisors listed in `departments.supervisors` | "C" — full dept awareness |
| Notification channel | In-app bell only | No email noise; agents check app regularly |
| Claim mechanic | Explicit "Claim" button | Prevents double-handling; agent reads context before committing |
| Input lock | Disabled with hint text until claimed | Makes the requirement visible, avoids silent races |
| Supervisor access | Admins and org:supervisors can claim any dept conversation | They have global visibility by design |

---

## Schema Changes

### `notifications` table — add new type

```ts
type: v.union(
  // ... existing types ...
  v.literal("conversation_transferred"),   // NEW
),
```

No other schema changes needed. The `departments.supervisors` array and `departmentMembers` table already provide everything required to resolve recipients.

---

## Backend Changes

### 1. `transferToDepartment` mutation (`convex/conversations.ts`)

After the existing patch + system_event insert, add notification dispatch:

```ts
// 1. Collect recipients
const deptMembers = await ctx.db
  .query("departmentMembers")
  .withIndex("by_department", (q) => q.eq("departmentId", args.targetDepartmentId))
  .collect();

const memberIds = deptMembers.map((m) => m.userId);
const supervisorIds = targetDept.supervisors ?? [];

const recipients = [...new Set([...memberIds, ...supervisorIds])]
  .filter((id) => id !== callerId);  // skip the actor

// 2. Insert one notification per recipient
const contact = await ctx.db.get(conversation.contactId);
const contactName = contact?.customName ?? contact?.displayName ?? "";
const identity = await ctx.auth.getUserIdentity();
const actorName = identity?.name ?? identity?.email ?? "Someone";

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
```

### 2. New `claim` mutation (`convex/conversations.ts`)

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

    // Admins and supervisors can claim any dept conversation
    const isPrivileged = isAdminOrSupervisor(orgRole);

    if (!isPrivileged) {
      // Agents must be a member of the conversation's department
      const membership = await ctx.db
        .query("departmentMembers")
        .withIndex("by_department_user", (q) =>
          q.eq("departmentId", conversation.departmentId!).eq("userId", callerId)
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

    // Insert system_event pill (same pattern as agent_assigned)
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      tenantId,
      direction: "outbound",
      content: "",
      contentType: "system_event",
      eventType: "agent_assigned",
      eventData: { actorName: callerName, agentName: callerName },
      isInternalNote: false,
      status: "sent",
      timestamp: now,
      createdAt: now,
    });
  },
});
```

### 3. `inbox.getConversation` query (`convex/inbox.ts`)

Add `isCurrentUserDeptMember: boolean` to the returned shape:

```ts
let isCurrentUserDeptMember = false;
if (conversation.departmentId) {
  const membership = await ctx.db
    .query("departmentMembers")
    .withIndex("by_department_user", (q) =>
      q.eq("departmentId", conversation.departmentId!).eq("userId", callerId)
    )
    .first();
  isCurrentUserDeptMember = !!membership;
}
// include in return value
```

---

## Frontend Changes

### Conversation header (wherever assign/transfer buttons live)

Show the **Claim** button when:
```ts
conversation.departmentId &&
!conversation.assignedAgentId &&
(isCurrentUserDeptMember || isAdminOrSupervisor)
```

Button label:
- English: `"⚡ Claim"`
- Arabic: `"⚡ استلام"`

On click: call `api.conversations.claim({ conversationId })`. On success the button disappears (conversation is now assigned to the caller).

### `MessageInput` component (`components/inbox/message-input.tsx`)

Add a locked state:

```ts
const isLocked =
  conversation.departmentId &&
  !conversation.assignedAgentId;
```

When `isLocked`:
- Textarea is `disabled`
- Placeholder shows:
  - English: `"Claim this conversation first to reply"`
  - Arabic: `"استلم المحادثة أولاً للرد"`
- Send button is disabled

> **Note:** Only lock for agents. Admins and supervisors bypass the lock (they can reply without claiming — their reply auto-assigns via existing "First Reply Wins" logic, or they can use the Claim button first).

### Notification bell panel

`conversation_transferred` notifications render as:

```
📨 {contactName} transferred to {deptName} by {actorName}
   {relativeTime}                                    [→ open]
```

Clicking the notification (or the "→ open" link) navigates to the conversation and marks it read. Use `referenceId` as the `conversationId`.

---

## Eligibility Matrix

| User role | Can see Claim button | Input locked? | Can claim? |
|---|---|---|---|
| Agent (dept member) | ✅ | ✅ | ✅ |
| Agent (not in dept) | ❌ | ✅ | ❌ (server rejects) |
| Supervisor | ✅ | ❌ | ✅ |
| Admin | ✅ | ❌ | ✅ |

---

## Out of Scope

- WhatsApp / email notification for department transfer (in-app only for v1)
- Notification for direct agent-to-agent transfer (already covered by `newAssignmentEmail`)
- "Unclaim" button — agents who claimed by mistake can ask a supervisor to reassign
- Department queue view as a dedicated inbox section (existing `departmentId` filter in `listConversations` covers this)
