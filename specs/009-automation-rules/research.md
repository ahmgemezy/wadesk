# Research: Automation Rules (009)

## 1. Trigger Evaluation — Where and How

**Decision**: Evaluation runs in two places:
- **Immediate triggers** (Keyword, Outside Hours, First Message): evaluated inside a new `internalMutation` called `evaluateAndFireAutomations`, invoked by `http.ts` via `ctx.runMutation(internal.automations.evaluateAndFireAutomations, {...})` immediately after `messages.createInbound` succeeds and is not a duplicate.
- **Timeout trigger** (No-Reply): evaluated by a Convex cron that runs every minute via `crons.ts`, checking all open conversations with an assigned agent whose last inbound message is older than the configured timeout and for which the rule has not already fired this window.

**Rationale**: Immediate triggers need low latency (< 30 s SLA). A post-insert mutation call achieves this without polling. Timeout triggers are inherently time-based and cron is the correct Convex primitive (same pattern as `followUps.processDue`).

**Alternatives considered**:
- Convex `scheduler.runAfter` for no-reply timeout (per-conversation scheduled job) — rejected because it creates one scheduled job per conversation, making it hard to cancel if agent replies or conversation resolves. Cron with "fire once per window" flag on the `RuleFireLog` is simpler and idempotent.

---

## 2. "Human Agent Currently Active" Check

**Decision**: An agent is considered "active" on a conversation if there exists at least one `messages` record where:
- `conversationId` matches
- `direction = "outbound"`
- `isInternalNote = false`
- `authorId` is not null (i.e., sent by a human, not the automation system)

The check is a simple Convex query on the `messages` table using the existing `by_conversation` index. The automation system's messages are distinguishable by a sentinel `authorId` value: `"automation"`.

**Rationale**: This is the least-invasive definition. It does not require a new "agent session" concept and uses existing data. Marking automated messages with `authorId: "automation"` cleanly separates human and bot replies.

**Alternatives considered**:
- A separate `agentActiveUntil` timestamp on conversations — adds complexity and drift risk.
- Checking `conversation.assignedAgentId` only — insufficient; agent could be assigned but never replied.

---

## 3. Priority Order and First-Match-Wins Evaluation

**Decision**: Rules stored with an integer `priority` field (0 = highest). Evaluation fetches all enabled rules for the tenant ordered by `priority` ascending, then iterates and stops at the first match.

The `evaluateAndFireAutomations` internal mutation:
1. Queries all enabled rules for the tenant, ordered by priority.
2. Checks each rule's trigger type in order.
3. On first match: inserts an automated outbound message, schedules `sendWhatsAppMessage.sendMessage` action, writes a `ruleFireLog` entry, and returns.

**Rationale**: Simple linear scan over a bounded list (max 30 rules for Growth, effectively unlimited for Business). Not performance-critical — rule count is small.

---

## 4. Dynamic Variable Interpolation

**Decision**: Implemented in `lib/automationHelpers.ts` as a pure function:

```ts
function interpolateTemplate(
  template: string,
  vars: {
    customer_name?: string;
    business_name: string;
    agent_name?: string;
    current_time: string;
  }
): string
```

Regex-replaces `{{variable_name}}` with resolved values. Fallbacks:
- `{{customer_name}}` → contact `customName ?? displayName ?? "عزيزي العميل"`
- `{{business_name}}` → tenant display name from `tenants` table
- `{{agent_name}}` → assigned agent's name from Clerk user lookup, or `"فريق الدعم"` if unassigned
- `{{current_time}}` → `new Date().toLocaleTimeString("ar-EG", { timeZone: tenantTimezone })`

**Rationale**: Pure function is easy to unit-test and reuse in the preview endpoint. Fallbacks are Arabic-first, consistent with WaDesk's positioning.

---

## 5. Business Hours Storage

**Decision**: A new `businessHours` Convex table (one document per tenant) with fields:
- `tenantId: string`
- `timezone: string` (IANA timezone, e.g., `"Africa/Cairo"`, `"Asia/Riyadh"`)
- `schedule: Record<"sun"|"mon"|"tue"|"wed"|"thu"|"fri"|"sat", { open: string; close: string; enabled: boolean }>` — stored as a Convex `v.any()` object for flexibility
- `createdAt: number`
- `updatedAt: number`

The Outside Hours trigger evaluation uses `new Date()` + `Intl.DateTimeFormat` to determine local day and time for the tenant, then compares against the schedule.

**Rationale**: Business hours are a tenant-level setting shared across features (CSAT, SLA alerts in future phases). Placing them in their own table avoids polluting the `tenants` table and allows the settings page to manage them independently.

**Alternatives considered**:
- Embedding in `tenants` table — rejected to keep the tenants table lean and avoid large document churn on frequent settings updates.

---

## 6. Plan Limit Enforcement

**Decision**: Add `AUTOMATION_RULE_LIMITS` to `convex/lib/planLimits.ts`:

```ts
const AUTOMATION_RULE_LIMITS: Record<Plan, number> = {
  free: 2,
  starter: 10,
  growth: 30,
  business: Infinity,
};
```

The `createRule` mutation: queries current rule count for tenant, compares to limit, throws `ConvexError("PLAN_LIMIT_REACHED")` if at or above limit. Count is performed atomically within the same mutation (Convex serializable transactions).

**Rationale**: Consistent with existing pattern in `planLimits.ts` for agents and channels. Atomic check prevents race-condition over-creation.

---

## 7. Drag-and-Drop Reorder in UI

**Decision**: Use the browser's native HTML5 Drag and Drop API via `@dnd-kit/core` — already a common shadcn/ui companion. **However, per project rules: no new dependencies without asking.** 

**Resolution**: Use CSS-only approach with `onDragStart`/`onDrop` native HTML5 events (no library). This is sufficient for a vertical list of ≤30 items. If drag-and-drop proves too janky with native events, escalate to user to approve `@dnd-kit/core` installation.

The reorder mutation accepts an ordered array of rule IDs and writes their new `priority` values (0…N-1) in a single mutation.

---

## 8. No-Reply Timeout — Cron Approach

**Decision**: Add a `"check-automation-timeouts"` cron running every 1 minute in `crons.ts`. The cron calls `internal.automations.checkNoReplyTimeouts`.

The internal mutation:
1. Queries all enabled no-reply timeout rules across all tenants.
2. For each rule, queries open conversations with an assigned agent where `lastMessageAt` (last inbound) is older than `(now - timeoutMinutes * 60 * 1000)`.
3. Skips conversations where `ruleFireLog` already has a record for this rule + conversation + current timeout window (prevents double-fire).
4. Fires the automated reply for each qualifying conversation.

**Scale concern**: With many tenants this could be a large query. Mitigated by: (a) rule counts are small, (b) `by_tenant_status` index on conversations limits scan to open conversations, (c) Convex mutations have a 1M document read limit which is not a concern at SMB scale.

---

## 9. First-Message Detection

**Decision**: Use the existing `contacts` table. A contact's `firstSeenAt` field is set when the contact is auto-created on their first message. A "first message" trigger fires when `result.isNewConversation === true` AND the contact's `totalConversations` is 1 (or the contact was just created in this same webhook processing cycle).

More precisely: check `contact.firstSeenAt === contact.lastSeenAt` (they were just created) OR `contact.totalConversations === 1`. The `messages.createInbound` mutation already creates the contact if not exists and returns `isNewConversation`. The contact's `totalConversations` is incremented in `createInbound`. So: fire first-message rule when `isNewConversation === true` and `contact.totalConversations === 1` after the insert.

**Rationale**: Reuses existing data without a new "hasEverMessaged" flag. Atomic within the same mutation context.

---

## 10. Hook-In Point in http.ts

**Decision**: After the existing block:

```ts
log("message_inserted", { ... });

// ADD HERE:
if (!result.isDuplicate) {
  await ctx.runMutation(internal.automations.evaluateAndFireAutomations, {
    tenantId: channel.tenantId,
    channelId: channel._id,
    conversationId: result.conversationId,
    messageContent: content,
    isNewConversation: result.isNewConversation,
  });
}
```

This is inserted after the duplicate check and after round-robin assignment (order matters: assign agent first, then evaluate "is agent active?" check).

**Rationale**: Minimal diff to `http.ts`. No rewrite. Matches the spec requirement to hook into existing webhook handling.
