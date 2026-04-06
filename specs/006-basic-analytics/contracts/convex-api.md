# Convex API Contracts: Basic Analytics

## convex/analytics.ts — new module

### `analytics.getTeamSummary` (query)

```ts
args: {
  startTs: v.number(),   // Unix timestamp (ms)
  endTs: v.number(),     // Unix timestamp (ms)
}
returns: {
  totalConversations: number,
  avgFirstResponseTimeSeconds: number | null,  // null if no conversations had a response
  totalMessages: number,
}
```

Reads `conversationMetrics` filtered by `tenantId` + `createdAt` range using `by_tenant_created` index.
Roles: org:admin, org:supervisor only (enforced via `assertAdminOrSupervisor`)

---

### `analytics.getAgentPerformance` (query)

```ts
args: {
  startTs: v.number(),
  endTs: v.number(),
}
returns: Array<{
  agentId: string | null,
  agentName: string,          // snapshot or "[Former Agent]" if no longer in org
  conversationsHandled: number,
  avgFirstResponseTimeSeconds: number | null,
}>
```

Same filter as `getTeamSummary`. Groups by `assignedAgentId`. Includes agents with zero conversations in the period by joining against current Clerk org member list (via `ctx.auth` role resolution or a passed-in agents list).

> **Note**: Convex queries cannot call Clerk API directly. The list of current org members must be fetched in the client component and merged with the query result client-side. The query returns only agents who appear in `conversationMetrics` for the period; the client component adds zero-count rows for agents not in the result.

Roles: org:admin, org:supervisor only

---

### `analytics.getVolumeOverTime` (query)

```ts
args: {
  startTs: v.number(),
  endTs: v.number(),
}
returns: Array<{
  bucketLabel: string,   // e.g., "2026-04-01" (day) or "2026-W14" (week)
  bucketStart: number,   // Unix timestamp of bucket start
  count: number,
}>
```

Grouping logic:
- `endTs - startTs <= 60 * 24 * 60 * 60 * 1000` (60 days in ms) → daily buckets
- longer → weekly buckets

All timestamps in UTC.
Roles: org:admin, org:supervisor only

---

### `analytics.getMyStats` (query)

```ts
args: {}  // current month is derived server-side (startOf month in UTC)
returns: {
  conversationsHandled: number,
  avgFirstResponseTimeSeconds: number | null,
}
```

Filters `conversationMetrics` by `tenantId` + `assignedAgentId = callerId` + `createdAt` within current calendar month (UTC).
Roles: all authenticated (agents, supervisors, admins — each sees only their own data)

---

## convex/conversationMetrics.ts — new internal module

### `conversationMetrics.create` (internalMutation)

```ts
args: {
  tenantId: v.string(),
  conversationId: v.id("conversations"),
  channelId: v.id("channels"),
  createdAt: v.number(),
}
```

Called when a new conversation is created. Inserts a `conversationMetrics` record with `messageCount: 0`.

---

### `conversationMetrics.recordFirstResponse` (internalMutation)

```ts
args: {
  conversationId: v.id("conversations"),
  firstResponseAt: v.number(),
}
```

Called when the first outbound non-internal-note message is sent. Checks if `firstResponseAt` is already set (idempotent). Sets `firstResponseAt` and computes `firstResponseTimeSeconds`.

---

### `conversationMetrics.recordResolution` (internalMutation)

```ts
args: {
  conversationId: v.id("conversations"),
  resolvedAt: v.number(),
  assignedAgentId: v.optional(v.string()),
  agentName: v.optional(v.string()),
}
```

Called when conversation status changes to "resolved". Sets `resolvedAt`, `assignedAgentId`, `agentName` snapshot.

---

### `conversationMetrics.incrementMessageCount` (internalMutation)

```ts
args: {
  conversationId: v.id("conversations"),
}
```

Called on every new message (inbound or outbound). Increments `messageCount` by 1.

---

## UI Component Contracts

### `<AnalyticsDashboard />`

Client component. Renders date range picker + three sections: team summary cards, agent performance table, volume chart. Receives `plan` prop from parent server component — if `free`/`starter`, this component is never rendered (parent renders teaser instead).

Props:
```ts
{ locale: "ar" | "en" }
```

### `<TeamSummaryCards dateRange={DateRange} />`

Client component. Uses `useQuery(api.analytics.getTeamSummary, { startTs, endTs })`. Renders 3 metric cards:
- "إجمالي المحادثات" / "Total Conversations"
- "متوسط وقت الرد" / "Avg. First Response Time"
- "إجمالي الرسائل" / "Total Messages"

Loading: skeleton cards. Empty state: "لا توجد بيانات لهذه الفترة" / "No data for this period".

### `<AgentPerformanceTable dateRange={DateRange} orgMembers={OrgMember[]} />`

Client component. Uses `useQuery(api.analytics.getAgentPerformance)`. Merges result with `orgMembers` list to show zero-count rows for agents not in result. Columns: Agent Name, Conversations Handled, Avg Response Time.

### `<VolumeChart dateRange={DateRange} />`

Client component. Uses `useQuery(api.analytics.getVolumeOverTime)`. Renders Recharts `<BarChart>` or `<LineChart>`. Chart container uses `dir="ltr"` (SVG not RTL-aware); card title and controls use RTL. Tooltip shows exact count + date/week label.

### `<DateRangePicker value={DateRange} onChange={...} />`

Client component. Preset buttons: "آخر 7 أيام" / "Last 7 days", "آخر 30 يومًا" / "Last 30 days", "آخر 90 يومًا" / "Last 90 days", custom date picker. Max range: 365 days.

### `<AgentMyStats />`

Client component. Used in agent-accessible stats page. Uses `useQuery(api.analytics.getMyStats)`. Renders 2 cards: own conversation count + own avg response time for current month.

### `<AnalyticsUpsellTeaser />`

Server or client component. Rendered for Free/Starter tenants. Shows blurred/locked analytics preview with CTA: "ترقية إلى Growth للوصول إلى التحليلات" / "Upgrade to Growth for Analytics".
