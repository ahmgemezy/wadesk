# Data Model: Multi-Agent Shared Inbox

**Feature**: `001-multi-agent-inbox` | **Date**: 2026-04-02

All tables defined in `convex/schema.ts`. Every table is tenant-scoped.

---

## Table: `channels`

A connected WhatsApp Business number belonging to a tenant.

| Field | Type | Notes |
|-------|------|-------|
| `tenantId` | `string` | Clerk `orgId` — required on all queries |
| `phoneNumberId` | `string` | Meta phone number ID (not the display number) |
| `displayName` | `string` | e.g. "Support Line", "Sales" |
| `wabaId` | `string` | WhatsApp Business Account ID |
| `assignmentMode` | `"first_reply" \| "manual" \| "round_robin"` | Default: `"manual"` |
| `roundRobinIndex` | `number` | Last assigned agent index for round robin rotation |
| `isActive` | `boolean` | False if disconnected/suspended |
| `createdAt` | `number` | Unix timestamp |

**Indexes**:
- `by_tenant`: `[tenantId]`
- `by_tenant_phone`: `[tenantId, phoneNumberId]` — unique constraint for dedup
- `by_phone_number_id`: `[phoneNumberId]` — webhook lookup by Meta phone ID

---

## Table: `contacts`

A customer who has messaged the business. Auto-created on first inbound message.

| Field | Type | Notes |
|-------|------|-------|
| `tenantId` | `string` | Clerk `orgId` |
| `phone` | `string` | E.164 format always (e.g. `+201012345678`) |
| `displayName` | `string` | From WhatsApp profile; fallback to phone number |
| `customName` | `string \| null` | Agent override |
| `tags` | `string[]` | e.g. `["VIP", "مشكلة متكررة"]` |
| `notes` | `string \| null` | Free-text agent notes |
| `source` | `"auto" \| "manual" \| "import"` | How contact was created |
| `firstSeenAt` | `number` | Unix timestamp of first message |
| `lastSeenAt` | `number` | Updated on every inbound message |
| `assignedAgentId` | `string \| null` | Clerk userId of usual handler |
| `createdAt` | `number` | Unix timestamp |

**Indexes**:
- `by_tenant`: `[tenantId]`
- `by_tenant_phone`: `[tenantId, phone]` — enforces one contact per phone per tenant

---

## Table: `conversations`

A thread between a contact and the business on a specific channel.

| Field | Type | Notes |
|-------|------|-------|
| `tenantId` | `string` | Clerk `orgId` |
| `channelId` | `Id<"channels">` | Always scoped to a channel — never null |
| `contactId` | `Id<"contacts">` | The customer in this conversation |
| `assignedAgentId` | `string \| null` | Clerk userId; null = Unassigned |
| `status` | `"open" \| "pending" \| "resolved"` | Default: `"open"` |
| `labels` | `string[]` | Tenant-defined label names |
| `lastMessageAt` | `number` | Updated on every new message; used for inbox sort |
| `lastMessagePreview` | `string` | Truncated preview of last message |
| `unreadCount` | `number` | Messages not yet seen by assigned agent |
| `createdAt` | `number` | Unix timestamp |

**Indexes**:
- `by_tenant`: `[tenantId]`
- `by_tenant_status`: `[tenantId, status]`
- `by_tenant_agent`: `[tenantId, assignedAgentId]`
- `by_tenant_channel`: `[tenantId, channelId]`
- `by_last_message`: `[tenantId, lastMessageAt]` — for inbox sort order

**State transitions**:
```
open ──────────────► pending ──────► resolved
  ▲                                      │
  └──────────────── (new message) ───────┘
```
- `resolved → open`: Automatically triggered when a new inbound message arrives on a resolved conversation

---

## Table: `messages`

An individual message or internal note within a conversation.

| Field | Type | Notes |
|-------|------|-------|
| `conversationId` | `Id<"conversations">` | Parent conversation |
| `tenantId` | `string` | Denormalized for query efficiency |
| `direction` | `"inbound" \| "outbound"` | From customer's perspective |
| `content` | `string` | Message text; `"[Unsupported message type]"` for unknown types |
| `contentType` | `"text" \| "image" \| "audio" \| "video" \| "document" \| "sticker" \| "location" \| "template" \| "unsupported"` | WhatsApp message type |
| `isInternalNote` | `boolean` | If true: visible only to agents, never sent to customer |
| `authorId` | `string \| null` | Clerk userId for outbound/notes; customer phone for inbound |
| `mediaUrl` | `string \| null` | URL for media attachment |
| `metaMessageId` | `string \| null` | Meta's message ID (for dedup + delivery status) |
| `status` | `"sent" \| "delivered" \| "read" \| "failed"` | Required — delivery status |
| `timestamp` | `number` | Unix timestamp |
| `createdAt` | `number` | Unix timestamp |

**Indexes**:
- `by_conversation`: `[conversationId]` — primary access pattern for thread view
- `by_tenant`: `[tenantId]` — for cross-conversation search (Phase 2)
- `by_meta_message_id`: `[metaMessageId]` — deduplication on webhook redelivery

**Internal note visibility rule**: Queries for the conversation thread must filter `isInternalNote = false` for the customer-facing direction check. The Convex query for the agent thread returns ALL messages including notes (filtered in UI with visual distinction).

---

## Table: `quickReplies`

Saved response templates scoped to a tenant.

| Field | Type | Notes |
|-------|------|-------|
| `tenantId` | `string` | Clerk `orgId` |
| `title` | `string` | Short label shown in panel, e.g. "Welcome greeting" |
| `content` | `string` | Full message text; supports Arabic |
| `usageCount` | `number` | Times used; default 0 |
| `category` | `string \| null` | e.g. "Greetings", "Orders", "Complaints" |
| `createdBy` | `string` | Clerk userId of creator |
| `createdAt` | `number` | Unix timestamp |

**Indexes**:
- `by_tenant`: `[tenantId]`
- `by_tenant_category`: `[tenantId, category]`

---

## Entity Relationships

```
channels (1) ──────────── (many) conversations
contacts (1) ──────────── (many) conversations
conversations (1) ──────── (many) messages
tenantId ──────────────── all tables (isolation boundary)
```

---

## Convex Schema (convex/schema.ts)

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  channels: defineTable({
    tenantId: v.string(),
    phoneNumberId: v.string(),
    displayName: v.string(),
    wabaId: v.string(),
    assignmentMode: v.union(
      v.literal("first_reply"),
      v.literal("manual"),
      v.literal("round_robin")
    ),
    roundRobinIndex: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_phone", ["tenantId", "phoneNumberId"])
    .index("by_phone_number_id", ["phoneNumberId"]),

  contacts: defineTable({
    tenantId: v.string(),
    phone: v.string(),
    displayName: v.string(),
    customName: v.optional(v.string()),
    tags: v.array(v.string()),
    notes: v.optional(v.string()),
    source: v.union(v.literal("auto"), v.literal("manual"), v.literal("import")),
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
    assignedAgentId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_phone", ["tenantId", "phone"]),

  conversations: defineTable({
    tenantId: v.string(),
    channelId: v.id("channels"),
    contactId: v.id("contacts"),
    assignedAgentId: v.optional(v.string()),
    status: v.union(
      v.literal("open"),
      v.literal("pending"),
      v.literal("resolved")
    ),
    labels: v.array(v.string()),
    lastMessageAt: v.number(),
    lastMessagePreview: v.string(),
    unreadCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_status", ["tenantId", "status"])
    .index("by_tenant_agent", ["tenantId", "assignedAgentId"])
    .index("by_tenant_channel", ["tenantId", "channelId"])
    .index("by_last_message", ["tenantId", "lastMessageAt"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    tenantId: v.string(),
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    content: v.string(),
    contentType: v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("audio"),
      v.literal("video"),
      v.literal("document"),
      v.literal("sticker"),
      v.literal("location"),
      v.literal("template"),
      v.literal("unsupported")
    ),
    isInternalNote: v.boolean(),
    authorId: v.optional(v.string()),
    mediaUrl: v.optional(v.string()),
    metaMessageId: v.optional(v.string()),
    status: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("read"),
      v.literal("failed")
    ),
    timestamp: v.number(),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_tenant", ["tenantId"])
    .index("by_meta_message_id", ["metaMessageId"]),

  quickReplies: defineTable({
    tenantId: v.string(),
    title: v.string(),
    content: v.string(),
    usageCount: v.number(),
    category: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_category", ["tenantId", "category"]),
});
```
