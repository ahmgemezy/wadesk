# Feature Specification: Basic Analytics

**Feature Branch**: `006-basic-analytics`
**Created**: 2026-04-02
**Status**: Draft
**Input**: User description: "Basic analytics dashboard — admins and supervisors see key metrics: total conversations handled, average first response time, agent performance (conversations handled per agent, average response time per agent), and conversation volume over time. Data covers the last 30 days by default with date range filter."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Admin views team performance overview (Priority: P1)

An admin opens the Analytics section and immediately sees a summary of the team's performance for
the last 30 days: total conversations handled, average first response time, and total messages
sent. They can change the date range to the last 7 days or a custom period. The numbers update
to reflect the selected range.

**Why this priority**: The admin needs to know whether their team is keeping up with volume and
responding within acceptable times. This is the single most-checked view.

**Independent Test**: Open Analytics → verify summary numbers appear for the last 30 days → change
range to last 7 days → verify numbers update.

**Acceptance Scenarios**:

1. **Given** an admin opens Analytics, **When** the dashboard loads,
   **Then** they see: total conversations, average first response time, and total messages sent
   for the default period (last 30 days).
2. **Given** the admin changes the date range to "Last 7 days", **When** the filter applies,
   **Then** all metrics update to reflect only the selected period.
3. **Given** there are no conversations in the selected period, **When** the dashboard loads,
   **Then** metrics show zero with a "No data for this period" message — not an error.

---

### User Story 2 — Admin reviews individual agent performance (Priority: P2)

An admin needs to compare agents — who handled the most conversations and who has the fastest
response time. They see a per-agent breakdown table showing each agent's conversation count and
average first response time for the selected period.

**Why this priority**: Identifying top performers and agents who need support is a core
management function. Without per-agent data, the team overview is not actionable.

**Independent Test**: With multiple agents having handled conversations, open Analytics → Agent
Performance table → verify each agent's row shows their conversation count and average response
time for the selected period.

**Acceptance Scenarios**:

1. **Given** multiple agents have handled conversations, **When** the admin views Agent Performance,
   **Then** each agent has a row showing their name, conversations handled, and average first
   response time for the selected period.
2. **Given** an agent handled zero conversations in the period, **When** the table loads,
   **Then** they still appear in the table with zero counts (not hidden).
3. **Given** the admin is a Supervisor, **When** they view Agent Performance,
   **Then** they see the same data as an Admin (Supervisors have full analytics access).

---

### User Story 3 — Admin views conversation volume over time (Priority: P3)

The admin sees a bar or line chart showing how many conversations arrived each day (or each
week for longer periods) within the selected date range. This helps them spot busy days,
seasonal patterns, and staffing needs.

**Why this priority**: Volume trend is the second most important operational metric after team
performance. It informs hiring and scheduling decisions.

**Independent Test**: Open Analytics → view volume chart → verify bars/lines represent daily
conversation counts → change range to 7 days vs 30 days → verify granularity adjusts.

**Acceptance Scenarios**:

1. **Given** conversations exist over multiple days, **When** the admin views the volume chart,
   **Then** each data point represents one day's conversation count for the selected range.
2. **Given** the admin selects a range longer than 60 days, **When** the chart loads,
   **Then** data is grouped by week (not day) to keep the chart readable.
3. **Given** the admin hovers over a data point, **When** they inspect it,
   **Then** they see the exact count and date/week label.

---

### User Story 4 — Agent views their own performance stats (Priority: P4)

An agent (without admin access) opens their personal stats page and sees their own conversation
count and average response time for the current month. They cannot see other agents' stats or
the team overview.

**Why this priority**: Agents benefit from self-awareness of their performance. This also reduces
pressure on supervisors to manually share individual stats.

**Independent Test**: Log in as Agent → open My Stats → verify only own metrics visible → verify
team summary and other agents' stats are not accessible.

**Acceptance Scenarios**:

1. **Given** an agent opens My Stats, **When** the page loads,
   **Then** they see their own: conversations handled, average first response time for the
   current month.
2. **Given** an agent tries to access the full Analytics dashboard URL directly,
   **When** the page loads, **Then** they see a "Permission denied" message.

---

### Edge Cases

- What happens when a conversation has no agent reply (only inbound messages)?
  First response time is recorded as null/blank for that conversation — not included in the average.
- What happens when the date range is very large (e.g., 1 year)?
  Data is grouped by month; if data volume would cause slow loading, a maximum range of 365 days is enforced with a clear message.
- What happens when an agent is removed from the team?
  Their historical stats remain visible in the analytics table as "[Former Agent]" — no data is deleted.
- What happens at the start of a new month with no historical data yet?
  Charts and tables show zero values with empty states — no errors.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Admins and Supervisors MUST be able to view a team performance summary: total conversations handled, average first response time, total messages sent.
- **FR-002**: All metrics MUST be filterable by date range with presets: Last 7 days, Last 30 days, Last 90 days, and a custom date picker.
- **FR-003**: Admins and Supervisors MUST be able to view a per-agent performance table: conversations handled and average first response time per agent for the selected period.
- **FR-004**: Removed agents MUST still appear in historical analytics as "[Former Agent]" — their data is preserved.
- **FR-005**: Admins and Supervisors MUST be able to view a conversation volume chart showing count over time (daily for ≤60 days, weekly for >60 days).
- **FR-006**: Agents MUST be able to view their own performance stats (conversation count, average response time) for the current month only.
- **FR-007**: Agents MUST NOT be able to view other agents' stats or the full team analytics dashboard.
- **FR-008**: First response time is defined as: time from conversation creation to first outbound message by any agent (not counting internal notes).
- **FR-009**: Analytics data MUST be scoped to the tenant — no cross-tenant data visible under any circumstances.
- **FR-010**: The analytics dashboard MUST be accessible on the Growth plan and above. Free and Starter tenants see a teaser with an upgrade prompt.

### Key Entities

- **ConversationMetric**: A pre-computed or on-demand summary per conversation. Attributes: conversationId, tenantId, assignedAgentId, createdAt, firstResponseAt, firstResponseTimeSeconds, resolvedAt, messageCount.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The analytics dashboard loads and displays data within 5 seconds for any date range up to 90 days.
- **SC-002**: First response time calculation is accurate to within 1 minute for all conversations.
- **SC-003**: Agents cannot access any analytics data beyond their own stats — enforced at the data layer with 100% accuracy.
- **SC-004**: Admins report that analytics gives them enough data to make staffing decisions within the first month of use (qualitative target for onboarding feedback).

## Assumptions

- Analytics are computed from existing `conversations` and `messages` data — no separate event tracking system required for Phase 1.
- First response time is computed at query time for the selected date range (not pre-aggregated in Phase 1; pre-aggregation deferred if performance requires it).
- Analytics are available on Growth plan and above; Free and Starter plans see a locked teaser.
- Advanced analytics (CSAT scores, SLA breach rates, label breakdowns, conversation resolution time) are deferred to a later feature; this spec covers only the basic metrics listed.
- The date range maximum is 365 days; data older than 365 days is still stored but not surfaced in the basic analytics UI.
- Export of analytics to CSV/PDF is defined in CLAUDE.md §17 (Data Portability) and is treated as a separate feature.
- Timezone for date grouping follows the tenant's primary connected channel's country (Egypt: UTC+2, Saudi/UAE: UTC+3); defaults to UTC if not determinable.
