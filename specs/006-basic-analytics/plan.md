# Implementation Plan: Basic Analytics

**Branch**: `006-basic-analytics` | **Date**: 2026-04-06 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/006-basic-analytics/spec.md`

## Summary

Analytics dashboard for admins and supervisors: team performance summary (total conversations, avg first response time, total messages), per-agent breakdown table, conversation volume chart. Agents see a personal stats view (own metrics only). Gated behind Growth plan and above — Free/Starter tenants see an upgrade teaser.

The core design decision: introduce a `conversationMetrics` denormalized read-model table (one record per conversation). Written by internal mutations triggered from the existing message/conversation pipeline. All analytics queries read only this table, avoiding expensive cross-table aggregation in Convex (which has no SQL joins).

## Technical Context

**Language/Version**: TypeScript (strict, no `any`) — Next.js 15 App Router  
**Primary Dependencies**: Convex (DB + serverless), Clerk (auth/roles), shadcn/ui, Tailwind CSS v4, Recharts (charts via shadcn/ui chart component), Lucide React  
**Storage**: Convex — new `conversationMetrics` table (denormalized read-model); existing `conversations` and `messages` tables unchanged  
**Testing**: Manual testing with real conversation data  
**Target Platform**: Web (Vercel), responsive (mobile + desktop)  
**Project Type**: Web application feature (analytics dashboard module)  
**Performance Goals**: SC-001 — dashboard loads in < 5 seconds for any range up to 90 days  
**Constraints**: Growth plan and above only; max 365-day range; UTC timezone for Phase 1; no CSAT/SLA/label analytics (deferred); no CSV export (separate feature per §17)  
**Scale/Scope**: Per-tenant analytics; role-gated (admin/supervisor vs agent)

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| **RTL Gate** | ✅ PASS | Analytics cards, tables, date picker must be RTL-first. Chart container uses `dir="ltr"` (SVG not RTL-aware) but chart title, labels, and enclosing card are RTL. All Arabic metric labels included. |
| **Tenant Scope Gate** | ✅ PASS | All `conversationMetrics` queries filter by `tenantId` from `getCallerIdentity`. Cross-tenant access is architecturally impossible via the index. |
| **Real-Time Gate** | ✅ PASS | All analytics queries use `useQuery` (Convex subscriptions). Dashboard updates live when new conversations/messages arrive. |
| **Security Gate** | ✅ N/A | No Meta API interaction in analytics. Agent-only access enforced via `assertAdminOrSupervisor` in team queries; `getMyStats` returns only caller's own data. |
| **Schema Gate** | ✅ PASS | New `conversationMetrics` table includes `tenantId` and `channelId` from first schema definition. |
| **Simplicity Gate** | ✅ PASS | No new onboarding steps. Analytics is a read-only dashboard accessed from sidebar nav. |

## Project Structure

### Documentation (this feature)

```text
specs/006-basic-analytics/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/
│   └── convex-api.md    ← Convex function contracts
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code (affected paths)

```text
convex/
├── schema.ts                        ← add conversationMetrics table
├── conversationMetrics.ts           ← new: create, recordFirstResponse, recordResolution, incrementMessageCount (all internalMutation)
├── analytics.ts                     ← new: getTeamSummary, getAgentPerformance, getVolumeOverTime, getMyStats (queries)
├── messages.ts                      ← call conversationMetrics.recordFirstResponse + incrementMessageCount on new outbound message
└── conversations.ts                 ← call conversationMetrics.create on new conversation; recordResolution on status → "resolved"

app/(dashboard)/
├── analytics/
│   ├── layout.tsx                   ← server component; reads tenant.plan; renders teaser if free/starter
│   └── page.tsx                     ← server component; renders <AnalyticsDashboard locale={locale} />
└── my-stats/
    └── page.tsx                     ← agent-accessible page; renders <AgentMyStats />

components/analytics/
├── analytics-dashboard.tsx          ← orchestrator client component; date range state
├── team-summary-cards.tsx           ← 3 metric cards
├── agent-performance-table.tsx      ← per-agent breakdown table
├── volume-chart.tsx                 ← Recharts bar chart
├── date-range-picker.tsx            ← preset + custom date range selector
├── agent-my-stats.tsx               ← personal stats for agents
└── analytics-upsell-teaser.tsx      ← locked teaser for free/starter
```

### Pipeline Integration (existing files modified)

When a new outbound non-internal-note message is sent:
- `convex/messages.ts` calls `ctx.scheduler.runAfter(0, internal.conversationMetrics.recordFirstResponse, ...)` and `internal.conversationMetrics.incrementMessageCount`

When a new conversation is created:
- `convex/conversations.ts` calls `ctx.scheduler.runAfter(0, internal.conversationMetrics.create, ...)`

When conversation status changes to "resolved":
- `convex/conversations.ts` calls `ctx.scheduler.runAfter(0, internal.conversationMetrics.recordResolution, ...)`

## Key Design Decisions

### Denormalized `conversationMetrics` read-model
Convex has no SQL joins. Computing first response time by joining `conversations` to `messages` at query time is O(N×M) document reads — unacceptable at scale. A denormalized `conversationMetrics` record (written at event time, read at analytics time) keeps analytics queries O(N) and within Convex's execution limits.

### Internal mutations via `ctx.scheduler`
`conversationMetrics` mutations are `internalMutation` — not callable from the client. They're triggered from `messages.ts` and `conversations.ts` using `ctx.scheduler.runAfter(0, ...)` to avoid blocking the main mutation response.

### Former agent name snapshot
`agentName` is snapshotted at resolution time. When an agent leaves the org, their Clerk membership is revoked. All historical records retain the name; the UI shows it as-is (with a visual indicator that the agent is no longer active, if desired).

### Recharts with `dir="ltr"` container
SVG-based chart libraries are not RTL-aware. The `<VolumeChart>` wrapper uses `dir="ltr"` to prevent mirrored axis rendering. The card title and date range picker outside the chart use standard RTL.

### Agents cannot access team analytics
`getTeamSummary`, `getAgentPerformance`, and `getVolumeOverTime` enforce `assertAdminOrSupervisor`. Direct URL access by an agent to `/analytics` returns a "Permission denied" rendered by the layout server component.

## Complexity Tracking

No constitution violations requiring justification.
