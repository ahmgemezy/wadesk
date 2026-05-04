# Transfer Flow & Queue Sidebar — Design

**Date:** 2026-05-03
**Author:** Ahmed (with Claude)
**Status:** Spec — pending implementation plan

---

## 1. Problem

Today's transfer flow is too narrow for a multi-branch tenant:

- `transfer-department-dialog.tsx` only lists departments **within the current channel**; cross-channel is hard-blocked at `convex/conversations.ts:537` (`CROSS_CHANNEL_TRANSFER_NOT_ALLOWED`).
- Agent assignment lives in a separate `assign-agent-dialog`, disconnected from department changes.
- The inbox sidebar is a flat conversation list — no way for a Supervisor running multiple branches to see "which department in which branch is overloaded right now".

We need:

1. A transfer dialog that handles **department + agent** routing in one flow.
2. A way to **forward** a conversation to another branch (different WhatsApp number) without breaking WhatsApp's number-bound 24h window.
3. A **sidebar queue tree** organized by `Channel → Department` so people can navigate work by branch and team.

---

## 2. Domain model

```
Tenant
  └── Channel (= branch / store, has its own WhatsApp number)
        └── Department (sales / support / HR / accounting / …)
              └── Members (Clerk users; same user may belong to multiple departments
                           across multiple channels — shared staff)
```

Key invariants:

- A **conversation belongs to exactly one channel** for its lifetime. WhatsApp ties every thread to a (customer, WABA-number) pair; we cannot move threads across numbers.
- Within its channel, a conversation can move freely between departments and assigned agents.
- "Forwarding to another branch" is **not a thread move** — it is a customer-visible redirect message + close.

---

## 3. Schema changes

All edits are additive or value-set extensions; no destructive migrations.

### 3.1 `conversations` table

Extend `status` union:

```ts
status: v.union(
  v.literal("open"),
  v.literal("pending"),
  v.literal("resolved"),
  v.literal("forwarded"),  // NEW
)
```

Add forward audit fields:

```ts
forwardedToChannelId: v.optional(v.id("channels")),
forwardedToDepartmentId: v.optional(v.id("departments")),
forwardedAt: v.optional(v.number()),
forwardedBy: v.optional(v.string()),  // Clerk user id
```

### 3.2 Tenant-level forward template

Single editable template per tenant, with AR + EN. Stored on the existing tenant settings table (or `tenants` table — exact placement determined during implementation by inspecting current schema; no new table required).

```ts
forwardMessageTemplates: v.optional(v.object({
  ar: v.string(),
  en: v.string(),
}))
```

Defaults if unset:

- `ar`: `"للحصول على خدمة أفضل، تواصل مع فرع {{branchName}} على {{branchNumber}}"`
- `en`: `"For better service, please contact our {{branchName}} branch at {{branchNumber}}"`

Variables (server-resolved):

- `{{branchName}}` ← `targetChannel.displayName`
- `{{branchNumber}}` ← formatted `targetChannel.phoneE164` (e.g. `+20 100 234 5678`)

Validation on save: both `ar` and `en` must contain both variables.

### 3.3 New system-event types in `messages`

`eventType` union extended with:

- `"transfer_within_channel"` — replaces today's `"transfer_department"`. Migration: existing rows keep their old value; UI accepts both for one release, then a follow-up renames the historical rows. (For this spec we only emit the new value; backward read compatibility kept in the activity-pill renderer.)
- `"forward_to_branch"` — new.

`eventData` shape:

- `transfer_within_channel`: `{ actorName, fromDept?, toDept, agentName? }`
- `forward_to_branch`: `{ actorName, targetBranchName, targetBranchNumber, targetDeptName? }`

---

## 4. Server functions

All in `convex/conversations.ts` unless noted.

### 4.1 `transferWithinChannel` (mutation)

Replaces the existing `transferToDepartment`. The old export is removed; callers updated in the same change.

```ts
export const transferWithinChannel = mutation({
  args: {
    conversationId: v.id("conversations"),
    targetDepartmentId: v.id("departments"),
    assignAgentId: v.optional(v.string()),    // Clerk user id
    internalNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => { /* ... */ }
})
```

Authorization:

- Resolve `tenantId`, `callerId`, `orgRole` via `getCallerIdentity`.
- Allow if caller has access to the conversation (Admin/Supervisor: yes; Agent: yes if assigned to them OR conversation is unassigned in a department they belong to). Reuse the same access predicate the inbox uses today.

Validation:

- Conversation must exist and belong to caller's tenant.
- `targetDepartment.tenantId === tenantId`, `targetDepartment.isArchived === false`.
- `targetDepartment.channelId === conversation.channelId` — cross-channel rejects with `CROSS_CHANNEL_USE_FORWARD`.
- `targetDepartment._id !== conversation.departmentId` (no-op self-transfer rejects with `NO_OP_TRANSFER`).
- If `assignAgentId` given: must exist in `departmentMembers` for `targetDepartmentId` at mutation time.

Effects:

1. Patch conversation: `departmentId`, `departmentAssignedAt`, `departmentAssignedBy`, and (if `assignAgentId`) `assignedTo`, `assignedAt`, `assignedBy`.
2. Insert `system_event` message with `eventType: "transfer_within_channel"` and event data described in §3.3.
3. If `internalNote` provided: insert an internal-note message immediately after the system event, authored by the caller.
4. Notifications:
   - To all members + supervisors of the target department, except the caller, with `type: "conversation_transferred"` (existing type).
   - If `assignAgentId` is set: send the existing assignment notification path **instead of** the department notification for that user (no duplicates).

### 4.2 `forwardToBranch` (action — must be an action because it calls Meta)

```ts
export const forwardToBranch = action({
  args: {
    conversationId: v.id("conversations"),
    targetChannelId: v.id("channels"),
    targetDepartmentId: v.optional(v.id("departments")),
  },
  handler: async (ctx, args) => { /* ... */ }
})
```

Pairs with two internal helpers in the same file:

- `_validateForward` (internal query) — runs all the validation checks, returns the resolved template + target channel metadata.
- `_finalizeForward` (internal mutation) — patches conversation status and inserts the system event after Meta acks.

Authorization: same access predicate as 4.1, evaluated inside `_validateForward`.

Validation (in `_validateForward`):

- Conversation belongs to caller's tenant; status is `open` or `pending`.
- Target channel belongs to tenant, is `status === "active"`, and `_id !== conversation.channelId`.
- If `targetDepartmentId` given: it belongs to `targetChannelId` and is not archived. (Recorded for audit only — no member notifications fired on the target side, since the forward is customer-visible, not internal.)
- Conversation is **inside the WhatsApp 24h customer-service window**. If not, reject with `OUTSIDE_24H_WINDOW` and surface the existing 24h-warning copy.
- Tenant has a forward template configured (or use default).

Action flow (only Meta send is externally observable; if it fails we abort with no state change):

1. `runQuery(_validateForward, …)` — returns `{ resolvedText, sourceChannelId, targetChannelMeta }`. Template resolved by contact's `preferredLanguage` → tenant default → `ar`. `{{branchName}}` and `{{branchNumber}}` substituted; branch number rendered LTR with a leading `+`.
2. Call the existing send-message action used by agent replies (whatever path `messages.ts` agent reply uses — the same WhatsApp Cloud API call). The message is sent **outbound through the conversation's current channel**, not the target channel.
3. On Meta success: `runMutation(_finalizeForward, …)` to:
   - Patch conversation: `status: "forwarded"`, `forwardedToChannelId`, `forwardedToDepartmentId`, `forwardedAt: Date.now()`, `forwardedBy: callerId`, clear `assignedTo` and `departmentId`.
   - Insert `system_event` message `forward_to_branch` with the event data in §3.3.
4. On Meta failure: throw; conversation state untouched. UI shows error toast and stays on the dialog so the agent can retry.

Reopen interaction: when an inbound WhatsApp message arrives for a conversation whose `status === "forwarded"`, the existing inbound handler **must not reopen** it. Instead, it creates a fresh conversation as if no prior thread existed. The 24h reopen window only applies to `status === "resolved"`.

### 4.3 `inbox.queueCounts` (query)

New query in `convex/inbox.ts`. Single subscription that powers the entire sidebar tree.

```ts
export const queueCounts = query({
  args: {},
  handler: async (ctx) => {
    // returns:
    //   {
    //     mine: number,
    //     mentions: number,
    //     channels: Array<{
    //       _id, displayName, total: number,
    //       unassigned: number,
    //       departments: Array<{
    //         _id, name, total: number,
    //         unassignedInDept: number, mineInDept: number
    //       }>
    //     }>,
    //     forwarded: number,
    //     resolved: number,
    //   }
  },
})
```

Scoping rules (mirror §6 permissions):

- **Admin** — all channels and all departments in the tenant.
- **Supervisor** — channels they are a member of (`channelMembers`); within those, all departments.
- **Agent** — channels they are a member of; within those, only departments they are a member of (`departmentMembers`). `mine` and `mentions` always present. `forwarded` and `resolved` scoped to conversations the agent had access to.

"Total" counts mean **open + pending** conversations in scope (matches the badge logic the inbox uses today). `forwarded` and `resolved` use their literal status.

### 4.4 Settings mutation `tenants.updateForwardTemplate` (Admin only)

```ts
args: {
  ar: v.string(),
  en: v.string(),
}
```

Validates that both contain `{{branchName}}` and `{{branchNumber}}`; rejects with `MISSING_TEMPLATE_VARIABLES` listing what's missing. Stores under `tenant.forwardMessageTemplates`.

---

## 5. UI

### 5.1 Conversation header — buttons

The conversation header keeps the existing one-click "Assign agent" button (component: `assign-agent-dialog.tsx`). It is unchanged.

The existing "Transfer" icon button (currently `transfer-department-dialog.tsx`) is replaced by a new `transfer-dialog.tsx` that contains both within-branch and cross-branch flows in tabs.

### 5.2 Transfer dialog — tabbed

```
┌─ Transfer ─────────────────────────────────────┐
│  [ Within branch ] | [ Forward to branch ]    │
├────────────────────────────────────────────────┤
│  (active tab content)                           │
└────────────────────────────────────────────────┘
```

**Within branch tab:**

- Department select (active, non-archived departments of `conversation.channelId`; current department disabled).
- Agent select (members of the chosen department; default option `Any agent — keep unassigned`).
- Optional internal note textarea ("Add a note for the receiving team").
- Primary button: `Transfer` (calls `transferWithinChannel`).

**Forward to branch tab:**

- Target branch select (other active channels of the tenant). Each option shows `displayName` and the formatted number.
- Optional target department select (departments of the chosen branch; for audit only).
- Read-only **preview** of the message that will be sent to the customer, fully rendered with substitutions in the contact's preferred language.
- Helper text linking to Settings → General → Forward message.
- Banner: "After forwarding, this conversation will be closed and marked as Forwarded."
- Primary button: `Forward & Close` (calls `forwardToBranch`).

Errors surface as toasts:

- `OUTSIDE_24H_WINDOW` → *"Outside the 24h reply window — ask the customer to message first."*
- `TARGET_CHANNEL_INACTIVE` → *"That branch isn't connected right now."*
- `CROSS_CHANNEL_USE_FORWARD` → not user-visible (only fires if a stale id leaks through; logs only).
- `NO_OP_TRANSFER` → *"Pick a different department."*

### 5.3 Sidebar queue tree

New component `inbox-queue-tree.tsx`, mounted in the existing inbox sidebar slot. Subscribes to `inbox.queueCounts`.

Tree shape (counts in parens; "—" rendered when zero):

```
📥 Inbox

  ▸ Mine                       (5)
  ▸ Mentions                   (1)
  ───────────────────────────────
  ▾ store-1                    (24)
      • Unassigned             (4)
      ▾ Sales                  (12)
          • Unassigned in dept (2)
          • Mine in dept       (3)
      ▸ Support                (8)
      ▸ HR                     (—)
  ▸ store-2                    (11)
  ───────────────────────────────
  ▸ Forwarded                  (3)
  ▸ Resolved                   (—)
```

Behaviour:

- Each leaf is a link with a URL-driven scope, e.g. `/inbox?scope=channel:<id>:dept:<id>:mine`. The conversation list to the right reads the scope from the URL and filters accordingly. Selecting a conversation does not change the scope.
- Expansion state persisted per user in `localStorage`.
- Counts are reactive (Convex subscription) — no manual refresh.
- Single channel + single department tenants get a degenerate but readable tree (Mine / Mentions / one department / Forwarded / Resolved).

RTL: tree indentation uses `ms-`/`me-` only. Chevrons flip in RTL.

### 5.4 Forwarded conversations — list + thread view

- A new top-level filter `Forwarded` exists in the sidebar.
- Inside the conversation thread, a forwarded conversation:
  - Shows the activity pill *"Ahmed forwarded this to store-2 / Sales — conversation closed."*.
  - Disables the message input with a banner: *"This conversation was forwarded to store-2 — it can't be replied to."*
  - Hides the Transfer / Assign / Status buttons; only Internal Note remains for record-keeping.

### 5.5 Settings → General → Forward message

New card. Admin-only.

- Two textareas: Arabic, English. Each min-height ~3 lines.
- Below the textareas: a chip row showing the available variables (`{{branchName}}`, `{{branchNumber}}`).
- Save button (disabled until either field changes; enabled validation runs before submit).
- On save: success toast; on validation error from server: inline error pointing at the missing variables.

---

## 6. Permissions matrix

| Action | Admin | Supervisor | Agent (with conversation access) |
|---|:---:|:---:|:---:|
| Within-branch transfer (department + agent) | ✅ | ✅ | ✅ |
| Cross-branch forward | ✅ | ✅ | ✅ |
| Edit forward message template | ✅ | ❌ | ❌ |
| See full sidebar tree | all | their channels | their memberships |

"Conversation access" for Agent = `assignedTo === me` OR (unassigned AND department is one of mine). Same predicate the inbox already enforces.

All checks server-side in Convex; client-side gating is cosmetic only.

---

## 7. Plan gating

| Plan | Within-branch transfer | Cross-branch forward | Multi-branch tree |
|---|:---:|:---:|:---:|
| Free | ✅ | ✅ | trivially short (1 channel max) |
| Starter | ✅ | ✅ | up to 2 channels |
| Growth | ✅ | ✅ | up to 5 channels |
| Business | ✅ | ✅ | unlimited |

No new paywall introduced by this spec. The channel-count caps are existing per CLAUDE.md §10.

---

## 8. i18n

- All new strings routed through `useT(en, ar)`.
- Forward template variables substituted server-side; LTR/RTL handled by wrapping the rendered branch number in `<span dir="ltr">` (existing project pattern).
- Activity pill copy lives in the existing pill renderer; both new event types (`transfer_within_channel`, `forward_to_branch`) get AR + EN strings there.

---

## 9. Edge cases

1. **Conversation moved while another agent has it open.** Convex subscription drops it from their list. If they were composing, the input disables with a transient banner *"This conversation was transferred to Sales"*. Drafts kept in client state.
2. **Forwarding outside 24h window.** Mutation rejects with `OUTSIDE_24H_WINDOW`; conversation untouched.
3. **Target channel disconnected.** Filtered out of the picker; stale-id case rejected with `TARGET_CHANNEL_INACTIVE`.
4. **Selected agent leaves the department mid-transfer.** Re-validated server-side; mutation rejects, dialog refreshes the agent list.
5. **Customer messages back on the original channel after a forward.** Inbound handler does **not** reopen `forwarded` conversations — creates a fresh conversation. The 24h reopen rule applies only to `resolved`.
6. **Customer never messages the target branch.** Forwarded conversation stays as audit history under the Forwarded filter. No follow-up action.
7. **Agent loses last department membership in a channel.** That channel branch disappears from their sidebar on the next subscription tick. Conversations they're still personally assigned to remain visible in `Mine` until reassigned.
8. **Self-transfer / no-op.** Picker disables the current department; backend rejects with `NO_OP_TRANSFER` as a guard.
9. **Forward template missing a variable after manual edit.** Settings save validation rejects; cannot reach the forward path with a malformed template.
10. **Existing `transfer_department` system events in the database.** Activity-pill renderer accepts both `transfer_department` (legacy read) and `transfer_within_channel` (new write). No data migration in this spec.

---

## 10. Out of scope (deferred)

- Cross-branch handoff tracking with auto-linking when the customer eventually messages the target branch (option B from brainstorming Q3).
- Forward-specific Meta-approved template for the outside-24h case.
- Round-robin distribution **within** a department triggered by transfer (i.e., "transfer to Sales, auto-pick the next agent in rotation"). For now `Any agent` means department-only assignment.
- Bulk transfer / bulk forward.
- Per-channel forward templates.
- Real-time presence-aware agent picker (online/offline marker beyond the existing presence indicator).

---

## 11. Files touched (preview — full list in implementation plan)

**Schema / server:**

- `convex/schema.ts` — extend `conversations.status`, add forward audit fields, extend `messages.eventType` union, add `forwardMessageTemplates` to tenant settings.
- `convex/conversations.ts` — replace `transferToDepartment` with `transferWithinChannel`; add `forwardToBranch`.
- `convex/inbox.ts` — add `queueCounts` query.
- `convex/tenants.ts` (or wherever tenant settings live) — add `updateForwardTemplate` mutation.
- `convex/webhooks/processors/messages.ts` — ensure inbound handler skips `forwarded` for the reopen-window logic.

**UI:**

- `components/inbox/transfer-dialog.tsx` — new (replaces `transfer-department-dialog.tsx`).
- `components/inbox/transfer-department-dialog.tsx` — removed; callers updated.
- `components/inbox/conversation-thread.tsx` — wire new dialog; add forwarded-state banner.
- `components/inbox/message-input.tsx` — disabled state for `status === "forwarded"`.
- `components/inbox/inbox-queue-tree.tsx` — new sidebar component.
- `components/inbox/conversation-list.tsx` — read scope from URL, apply filter.
- `components/settings/general-settings.tsx` (or equivalent) — new Forward message card.
- `lib/i18n/strings/*` — new keys.

**Misc:**

- `lib/shell/nav-config.ts` — no change (queue tree replaces internal sidebar contents, not the top-level nav).

---

## 12. Definition of Done

Per CLAUDE.md §23, plus:

- Within-branch transfer, including agent + internal note, works end-to-end for Admin, Supervisor, and Agent (within their access).
- Cross-branch forward delivers the templated message via Meta, marks the conversation `forwarded`, and emits the activity pill.
- Forwarded conversations are read-only in the thread view and excluded from the reopen-window logic.
- Sidebar tree renders correctly for all three roles, with role-scoped visibility, reactive counts, and URL-driven scope selection.
- Settings → Forward message validates and persists AR + EN templates with the required variables.
- All new strings render correctly in Arabic (RTL) and English (LTR).
- All new mutations are tenant-scoped on the server; no cross-tenant access path exists.
- Tested with a real WhatsApp message flow on at least two channels.
