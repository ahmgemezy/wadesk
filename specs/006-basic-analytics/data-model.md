# Data Model: Basic Analytics

## Entities

### conversationMetrics (new table)

A single record per conversation. Written by internal mutations triggered from the message pipeline and conversation status changes. Read by all analytics queries.

| Field | Type | Notes |
|-------|------|-------|
| `tenantId` | `v.string()` | Tenant scope — ALWAYS included |
| `conversationId` | `v.id("conversations")` | Parent conversation |
| `channelId` | `v.id("channels")` | Channel the conversation belongs to |
| `assignedAgentId` | `v.optional(v.string())` | Clerk subject of the assigned agent at resolve time |
| `agentName` | `v.optional(v.string())` | Snapshot of agent display name at write time — preserved if agent leaves |
| `createdAt` | `v.number()` | Unix timestamp — copied from conversation.createdAt |
| `firstResponseAt` | `v.optional(v.number())` | Timestamp of first outbound non-internal-note message |
| `firstResponseTimeSeconds` | `v.optional(v.number())` | `firstResponseAt - createdAt` in seconds; null if no response yet |
| `resolvedAt` | `v.optional(v.number())` | Timestamp when conversation status changed to "resolved" |
| `messageCount` | `v.number()` | Total messages in this conversation (updated on each new message) |

Indexes:
```ts
.index("by_tenant_created", ["tenantId", "createdAt"])
.index("by_tenant_agent", ["tenantId", "assignedAgentId"])
.index("by_conversation", ["conversationId"])
```

---

### No Changes to Existing Tables

`conversations` and `messages` tables are unchanged. `conversationMetrics` is a denormalized read-model derived from them.

---

## Schema Diff (convex/schema.ts)

### Add new table:

```ts
conversationMetrics: defineTable({
  tenantId: v.string(),
  conversationId: v.id("conversations"),
  channelId: v.id("channels"),
  assignedAgentId: v.optional(v.string()),
  agentName: v.optional(v.string()),
  createdAt: v.number(),
  firstResponseAt: v.optional(v.number()),
  firstResponseTimeSeconds: v.optional(v.number()),
  resolvedAt: v.optional(v.number()),
  messageCount: v.number(),
})
  .index("by_tenant_created", ["tenantId", "createdAt"])
  .index("by_tenant_agent", ["tenantId", "assignedAgentId"])
  .index("by_conversation", ["conversationId"]),
```

No changes to existing tables.

---

## Write Triggers

### When to write/update a `conversationMetrics` record

```
[New conversation created in conversations table]
  → internalMutation: insert conversationMetrics{
      tenantId, conversationId, channelId, createdAt,
      messageCount: 0, firstResponseAt: null, resolvedAt: null
    }

[Outbound non-internal-note message sent]
  → if conversationMetrics.firstResponseAt is null:
      internalMutation: patch firstResponseAt, firstResponseTimeSeconds
  → always: internalMutation: patch messageCount += 1

[Conversation status changes to "resolved"]
  → internalMutation: patch resolvedAt, assignedAgentId, agentName (snapshot from Clerk)

[Inbound message received]
  → internalMutation: patch messageCount += 1
```

---

## Analytics Query Logic

### Team Summary (US1)
```
Filter conversationMetrics:
  tenantId = caller.tenantId
  createdAt >= startTs AND createdAt <= endTs

Aggregate:
  totalConversations = count(rows)
  avgFirstResponseTime = avg(firstResponseTimeSeconds) WHERE firstResponseTimeSeconds IS NOT NULL
  totalMessages = sum(messageCount)
```

### Agent Performance (US2)
```
Same filter + group by assignedAgentId:
  conversationsHandled = count per agent
  avgResponseTime = avg(firstResponseTimeSeconds) per agent
  agentName = snapshot from record (fallback: "[Former Agent]")
```

### Volume Over Time (US3)
```
Same filter + group by date bucket:
  if (endTs - startTs) <= 60 days: bucket by day (floor createdAt to day boundary in UTC)
  if (endTs - startTs) > 60 days: bucket by week
```

### My Stats (US4)
```
Filter conversationMetrics:
  tenantId = caller.tenantId
  assignedAgentId = caller.callerId
  createdAt >= startOfCurrentMonth AND createdAt <= now
```

---

## Plan Gate Logic

```
Server component reads tenant.plan via fetchQuery(api.tenants.getForCaller)
  if plan === "free" OR plan === "starter":
    → render <AnalyticsUpsellTeaser> (blurred preview + upgrade CTA)
  else (growth, business):
    → render <AnalyticsDashboard>
```
