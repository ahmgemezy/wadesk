# Conversation Activity Pills — Design Spec

**Date:** 2026-05-02  
**Branch:** feat/013-departments  
**Status:** Approved — ready for implementation

---

## Problem

When a conversation is transferred to a department, assigned to an agent, or its status changes, there is no distinct visual treatment in the conversation thread. The current code inserts a plain `isInternalNote: true` message for department transfers (styled identically to agent notes), and inserts nothing at all for agent assignment or status changes. Agents have no in-thread record of what happened or who did it.

---

## Solution

Introduce a `system_event` content type for messages. These messages render as **centered event pills** in the conversation thread — a slim horizontal row with a colored label and divider lines on each side (the standard pattern used by WhatsApp and Slack for system notices). Each pill is color-coded by event type and includes the actor's name.

---

## Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Pill style | Centered with divider lines | Industry standard, doesn't interrupt chat flow |
| Color scheme | Color-coded by event type | Instant visual recognition of what happened |
| Pill text | Includes actor name | Accountability — agents can see who did what |
| Actor name storage | Stored at write time in `eventData` | Avoids async Clerk lookups at render time |
| Existing data | No migration | Old transfer internal notes stay as internal notes; only new events get pills |

---

## Schema Changes

**File:** `convex/schema.ts` — `messages` table

Add `v.literal("system_event")` to the `contentType` union:

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
  v.literal("system_event"),   // NEW
),
```

Add two new optional fields to the `messages` table:

```ts
eventType: v.optional(v.union(
  v.literal("transfer_department"),
  v.literal("agent_assigned"),
  v.literal("agent_unassigned"),
  v.literal("resolved"),
  v.literal("reopened"),
)),
eventData: v.optional(v.object({
  actorName: v.optional(v.string()),   // display name of who did the action
  fromDept:  v.optional(v.string()),   // department name (transfer only)
  toDept:    v.optional(v.string()),   // department name (transfer only)
  agentName: v.optional(v.string()),   // display name of target agent (assign only)
})),
```

Names are stored at write time from `ctx.auth.getUserIdentity()?.name`. For automatic system events (round-robin), `actorName` is `"System"`.

---

## Events & Their Pills

| eventType | Color | Icon | English text | Arabic text |
|---|---|---|---|---|
| `transfer_department` | Blue | `↗` | `Ahmed transferred to Support` | `أحمد نقل إلى الدعم` |
| `agent_assigned` | Purple | `👤` | `Ahmed assigned to Sara` | `أحمد أسند إلى سارة` |
| `agent_unassigned` | Gray | `👤` | `Conversation unassigned` | `تم إلغاء الإسناد` |
| `resolved` | Green | `✓` | `Sara resolved this` | `سارة أغلقت المحادثة` |
| `reopened` | Amber | `↩` | `Reopened by system` | `أُعيد فتحها تلقائياً` |

Round-robin auto-assignment uses `agent_assigned` with `actorName = "System"` → renders as `"System assigned to Sara"` / `"النظام أسند إلى سارة"`.

---

## Mutations That Insert System Events

| File | Mutation | Event inserted | Notes |
|---|---|---|---|
| `convex/conversations.ts` | `transferToDepartment` | `transfer_department` | **Replace** existing internal note insert |
| `convex/conversations.ts` | `assign` | `agent_assigned` or `agent_unassigned` | **Add** new insert after patch |
| `convex/conversations.ts` | `assignInternal` | `agent_assigned` | **Add** new insert; actorName = "System" |
| `convex/conversations.ts` | `setStatus` (resolve/reopen) | `resolved` or `reopened` | **Add** new insert after patch; `open` status = `reopened` pill, `resolved` = `resolved` pill, `pending` = no pill |

Each insert follows this shape:
```ts
await ctx.db.insert("messages", {
  conversationId: args.conversationId,
  tenantId,
  direction: "outbound",
  content: "",                     // unused for system_event — rendering uses eventType + eventData
  contentType: "system_event",
  eventType: "transfer_department",
  eventData: { actorName, fromDept, toDept },
  isInternalNote: false,
  status: "sent",
  timestamp: now,
  createdAt: now,
});
```

---

## UI Components

### `MessageBubble` (`components/inbox/message-bubble.tsx`)

Add a new rendering branch **before** the `isInternalNote` check:

```tsx
if (message.contentType === "system_event") {
  return <ConversationEventPill message={message} />;
}
```

`ConversationEventPill` is a small sub-component (can live in the same file or extracted):

- Renders a centered row: `<divider line> <colored pill> <divider line>`
- Pill color determined by `message.eventType`
- Pill text built from `message.eventType` + `message.eventData` using the locale

**Color tokens** (Tailwind classes):

| eventType | Pill bg | Pill text | Line |
|---|---|---|---|
| `transfer_department` | `bg-blue-100` | `text-blue-700` | `bg-blue-200` |
| `agent_assigned` | `bg-purple-100` | `text-purple-700` | `bg-purple-200` |
| `agent_unassigned` | `bg-gray-100` | `text-gray-600` | `bg-gray-300` |
| `resolved` | `bg-green-100` | `text-green-700` | `bg-green-200` |
| `reopened` | `bg-yellow-100` | `text-yellow-800` | `bg-yellow-200` |

### `ConversationThread` (`components/inbox/conversation-thread.tsx`)

Extend the `MessageItem` type:

```ts
type MessageItem = {
  // ... existing fields ...
  eventType?: string;
  eventData?: {
    actorName?: string;
    fromDept?: string;
    toDept?: string;
    agentName?: string;
  };
};
```

Map the new fields from the Convex query result the same way existing fields are mapped.

### `inbox.getMessages` (`convex/inbox.ts`)

Return `eventType` and `eventData` alongside existing message fields so the frontend receives them.

---

## RTL / Arabic

Pills are locale-aware. Arabic text uses the same centered pill layout — no directional changes needed since pills are centered and don't align to start/end. The pill text switches language based on `useLocale()`.

---

## Out of Scope

- Activity log tab / sidebar panel (not needed given pills cover the use case)
- Migration of existing transfer internal notes (they stay as internal notes)
- Filtering/searching by event type
- Showing pills for events triggered before this feature ships
