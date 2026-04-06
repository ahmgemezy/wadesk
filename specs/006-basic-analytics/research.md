# Research: Basic Analytics

## 1. Metric Computation Strategy: On-Demand vs. Pre-Computed

**Decision**: Introduce a new `conversationMetrics` table populated by internal mutations — NOT pure on-demand query-time computation.

**Rationale**: The spec suggests on-demand computation from `conversations` and `messages` tables. However, Convex has no SQL-style JOIN operations. Computing first response time at query time for a 30-day window requires:
1. Fetching all conversations for the tenant in the date range (potentially 500–2,000 docs)
2. For each conversation, fetching all its messages to find the first outbound non-note message
3. Aggregating across all results in a single Convex query function

This is O(conversations × messages) document reads per analytics query — unacceptable for the SC-001 requirement of < 5 seconds. Convex also has per-query execution time limits.

**Resolution**: Write a `conversationMetrics` record when:
- The first outbound (non-internal-note) message is sent to a conversation → captures `firstResponseAt` and `firstResponseTimeSeconds`
- A conversation status changes to `resolved` → captures `resolvedAt`

The analytics queries then read only the `conversationMetrics` table (one document per conversation, indexed by `tenantId` + `createdAt`) — O(conversations) reads, no secondary message lookups.

**Alternatives considered**: Pure on-demand — rejected (performance). External analytics DB (Mixpanel, PostHog) — overkill for Phase 1 and adds external dependency. Pre-aggregated daily snapshots — adds complexity; conversationMetrics per-conversation is simpler and sufficient.

---

## 2. Chart Library

**Decision**: Use [Recharts](https://recharts.org/) for the conversation volume chart.

**Rationale**: Recharts is the standard chart library in the shadcn/ui ecosystem. shadcn/ui's `chart` component is built on Recharts. It supports responsive containers, RTL-compatible axis labeling, custom tooltips, and dark mode theming via CSS variables — all required here.

**Alternatives considered**: Chart.js — heavier, more configuration; Tremor charts — opinionated and harder to style; native SVG — time-consuming for Phase 1.

**RTL note**: Recharts renders SVG. For RTL layout, the chart container uses `dir="ltr"` (SVG/canvas charts are not RTL-aware), but Arabic labels are applied to axis ticks and tooltips. The containing card uses RTL for the title and controls.

---

## 3. Plan Gate Enforcement

**Decision**: Check `tenant.plan` in the analytics server component (`app/(dashboard)/analytics/layout.tsx`) via `fetchQuery(api.tenants.getForCaller)`. If plan is `free` or `starter`, render a teaser/upgrade prompt instead of data.

**Rationale**: Server-side plan gating prevents any analytics data from reaching the client on gated plans — not just UI hiding. The teaser renders a blurred/locked screenshot with an "Upgrade to Growth" CTA.

**Alternatives considered**: Client-side plan check — rejected (data would still be fetched and just hidden). Convex query throwing an error on restricted plans — too aggressive; teaser UX is better than an error page.

---

## 4. Timezone Handling

**Decision**: Use UTC for all date bucketing in Phase 1. Display dates in UTC with a "(UTC)" label in the analytics UI.

**Rationale**: The spec mentions using the tenant's connected channel country timezone (UTC+2 for Egypt, UTC+3 for Saudi). Implementing this correctly requires storing the timezone on the tenant/channel and applying it in every analytics query. For Phase 1, UTC avoids this complexity while keeping the data accurate. The error is at most a few hours at midnight boundaries — acceptable for daily/weekly aggregation.

**Future**: Phase 2 can add `timezone` field to `tenants` table and apply offset in analytics queries.

**Alternatives considered**: Browser local timezone — inconsistent across agents in different timezones; full timezone support now — over-engineering for Phase 1.

---

## 5. Former Agent Name Snapshot

**Decision**: Store `agentName: v.string()` as a snapshot field in `conversationMetrics`. When writing the metric, resolve the agent's display name from Clerk at write time and store it.

**Rationale**: When an agent leaves a tenant, their Clerk org membership is revoked. Querying Clerk for their name at analytics read time would fail. Storing the name snapshot at write time ensures historical data always shows the agent's name — displayed as "[Former Agent]" in the UI if the current Clerk org lookup returns no match.

**Alternatives considered**: Always resolve from Clerk at read time — fails for removed agents. Store `agentId` only and fall back to "[Former Agent]" — loses the actual name. Store a separate `agentNames` table — unnecessary indirection.

---

## 6. Index Strategy for Date Range Queries

**Decision**: Add `.index("by_tenant_created", ["tenantId", "createdAt"])` to the `conversationMetrics` table (and ensure `conversations` has similar indexing for volume chart queries that need to count by day/week).

**Rationale**: Convex index range queries support `.gte()` / `.lte()` on the last field in the index. `by_tenant_created` allows efficient filtering: `q.eq("tenantId", id).gte("createdAt", startTs).lte("createdAt", endTs)`. Without this, every analytics query would require a full table scan filtered in memory.

**Volume chart source**: The `getVolumeOverTime` query reads from `conversationMetrics` (one record per conversation, contains `createdAt`) — not the `conversations` table directly. This keeps all analytics queries against a single indexed table.
