# Assignment & Transfer UX Redesign

**Date:** 2026-05-05  
**Status:** Approved — ready for implementation planning  
**Branch:** feat/013-departments

---

## Problem Statement

The current inbox has three separate controls for routing conversations (Claim, Assign, Transfer) plus a two-tab Transfer dialog ("within branch" / "forward to branch") that uses inconsistent English terminology. Agents are confused about which action to use, conversation ownership is hard to read at a glance in the list, and the locked reply box gives no explanation.

---

## Design Decisions

### 1. Unified "تحويل" Button

Replace the three separate controls — Claim button, Assign dropdown, and Transfer dialog — with a single **تحويل ↗** button in the conversation thread header.

**تحويل** was chosen over إحالة and إسناد because it is the most widely understood word in Arabic call-center and WhatsApp support contexts across Egypt, Saudi Arabia, and UAE.

The button opens a single popover picker with three sections:

```
أعضاء الفريق
─────────────
  [avatar] خذها أنت          ← replaces the Claim button
  [avatar] Sara Ahmed
  [avatar] Khaled Mohamed
  ...

الأقسام
─────────────
  🏢 المبيعات
  🏢 الدعم الفني
  ...

─────────────
  📲 إرسال لرقم آخر    [يُغلق المحادثة]   ← red, destructive label
```

Rules:
- "خذها أنت" assigns the conversation to the current user (replaces Claim).
- Selecting an agent assigns directly to them.
- Selecting a department moves the conversation to that department with no agent assigned (lands in "غير معين" queue).
- "إرسال لرقم آخر" is visually separated at the bottom, colored red, and labeled "يُغلق المحادثة" — it is a rare destructive action and must not appear alongside everyday routing options.

### 2. Conversation List — Ownership at a Glance

Each conversation list item shows ownership state via:
- **Colored left border** indicating assignment state
- **Agent name + job title** (from `memberProfiles.jobTitle`) below the message preview

| State | Border color | Label |
|---|---|---|
| Assigned to me | Purple `#7c3aed` | `[avatar] أنت · [jobTitle]` |
| Assigned to another agent | Green `#059669` | `[avatar] [agentName] · [jobTitle]` |
| Unassigned | Amber `#f59e0b` | `⚠ غير معين · [deptName]` |

If an agent has no `jobTitle` set, only the name is shown (no fallback text).

### 3. Locked Reply Box — Explains Itself

When a conversation is unassigned (reply input locked), replace the silent grey box with:

```
┌─────────────────────────────────────────────────────┐
│ ⚠️ المحادثة غير معينة — لا يمكن الرد   [ خذها أنت ] │
└─────────────────────────────────────────────────────┘
[greyed out message input below]
```

"خذها أنت" button claims the conversation inline — no navigation required.

### 4. System Event Messages — Plain Arabic

System events in the conversation timeline are displayed in readable Arabic, not raw event type strings.

| Event type | Display text |
|---|---|
| `agent_assigned` | `تم تعيين المحادثة لـ [agentName] · [jobTitle]` |
| `agent_unassigned` | `تم إلغاء تعيين المحادثة` |
| `transfer_within_channel` | `تم تحويل المحادثة إلى قسم [deptName]` |
| `forward_to_branch` | `تم إرسال المحادثة إلى رقم آخر` |

---

## Post-Transfer Navigation

### Scenario 1 — Transferred to a Specific Agent

1. Sender: conversation disappears from their queue immediately.
2. Receiver: in-app notification bell appears: "تم تعيين محادثة لك — [customerName] · بواسطة [senderName]" with an "افتح ↗" button.
3. Conversation appears at the top of the receiver's queue, labeled "محوّل إليك من [senderName]".

### Scenario 2 — Transferred to a Department (No Agent Specified)

1. Sender: conversation disappears from their queue immediately.
2. All members of the target department receive a notification: "محادثة جديدة في القسم — [customerName] · بانتظار التعيين".
3. Conversation appears in the department's "غير معين" section with an inline "خذها" button — first member to click claims it.

### Scenario 3 — Forward to Another Number (Destructive)

1. A WhatsApp message is sent to the customer pointing them to the new number.
2. Conversation on the current number is set to `status: "forwarded"` — read-only, replies disabled.
3. A new independent conversation is created on the target branch.

### Sender View After Transfer

Conversation **disappears immediately** from the sender's queue (Option A). The conversation timeline already contains a system event recording who transferred to whom and when — the sender has a full audit trail if they search for it. No undo option, no read-only ghost in the queue.

### Temporary / Round-Trip Transfer

When a transfer is temporary (e.g. Sales → Technical → Sales):
- Sender can attach an **internal note** at transfer time (e.g. "بعد الإجابة حوّله رجع لي").
- The receiving agent sees the note and transfers back by picking the original agent by name from the تحويل picker.
- The original agent receives a notification and the conversation reappears at the top of their queue with full history intact.
- No "follow / monitor" feature for the sender while the conversation is with another agent — they wait for the notification.

---

## Analytics — Multi-Agent Effort Tracking

### Problem

A conversation that transfers between agents (Sales → Technical → Sales) must credit each agent's individual effort in the analytics dashboard. The current schema only tracks `assignedAgentId` (current owner) and `previousAgentId` — insufficient for multi-participant performance reporting.

### Solution: `conversationParticipants` Table

Add a new Convex table that records one row per agent per assignment stint:

```typescript
conversationParticipants: defineTable({
  tenantId: v.string(),
  conversationId: v.id("conversations"),
  agentId: v.string(),
  departmentId: v.optional(v.id("departments")),
  startedAt: v.number(),
  endedAt: v.optional(v.number()),       // null while active
  messageCount: v.number(),              // agent messages sent during this stint
  firstReplyAt: v.optional(v.number()),  // for response time calculation
})
  .index("by_tenant_agent", ["tenantId", "agentId"])
  .index("by_tenant_conversation", ["tenantId", "conversationId"])
```

**Write logic:**
- On every assignment (via تحويل picker or claim): open a new participant row (`endedAt: null`).
- On every unassignment / transfer away: close the active row (`endedAt: Date.now()`).
- On every agent message sent: increment `messageCount` on the active row; set `firstReplyAt` if not yet set.

**Analytics this unlocks per agent:**
- Conversations handled (as primary or participant)
- Average first response time per stint
- Average handle time per stint
- Messages sent per conversation
- Transfers out / transfers in count

---

## Out of Scope

- "Following / مُتابَعة" list — sender monitoring a conversation while it's with another agent. Not needed in v1.
- Undo transfer — no 5-second undo toast. Disappears immediately.
- Auto-assignment via Round Robin on تحويل picker — Round Robin is a channel-level setting, not a manual transfer option.

---

## Files Affected (High Level)

| Area | Change |
|---|---|
| `convex/schema.ts` | Add `conversationParticipants` table |
| `convex/conversations.ts` | Update `assign`, `transferWithinChannel`, `claim`, `forwardToBranch` to write participant rows |
| `convex/inbox.ts` | Update first-reply auto-assign to write participant row |
| `components/inbox/assign-agent-dialog.tsx` | Replace with unified تحويل picker |
| `components/inbox/transfer-dialog.tsx` | Fold into unified picker; "إرسال لرقم آخر" becomes bottom section |
| `components/inbox/claim-button.tsx` | Remove — replaced by "خذها أنت" in picker and locked-input banner |
| `components/inbox/conversation-list-item.tsx` | Add colored left border + agent name + job title |
| `components/inbox/message-input.tsx` | Add locked-state banner with "خذها أنت" inline button |
| `components/inbox/message-bubble.tsx` | Update system event rendering to plain Arabic strings |
| `convex/messages.ts` | On agent message send: increment `messageCount` + set `firstReplyAt` on active participant row |
