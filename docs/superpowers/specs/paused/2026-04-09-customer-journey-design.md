# Customer Journey — Design Spec
*Date: 2026-04-09 | Branch: 008-dashboard-shell*

---

## Overview

The Customer Journey feature adds a sales pipeline layer on top of the existing contacts system. Agents can track where each contact is in the funnel (Lead → Prospect → Customer → Retained / Churned), schedule automated WhatsApp follow-ups, and view a full timeline of every interaction per contact. Supervisors and Admins get org-wide visibility; Agents see only their own contacts.

---

## Architecture

**Approach: Split by domain (Approach B)**

Four focused Convex files, each with one clear job:

| File | Responsibility |
|------|---------------|
| `convex/contacts.ts` | Extended with stage mutations + contactEvents writes |
| `convex/followUps.ts` | Follow-up CRUD + cron handler that calls Meta API |
| `convex/contactEvents.ts` | Timeline event queries + internal create |
| `convex/notifications.ts` | Notification CRUD + bell badge count |
| `convex/crons.ts` | Schedules `followUps:processDue` every 30 minutes |

---

## 1. Schema Changes

### Existing `contacts` table — additions only (no field renames)

Existing field names are preserved in the DB. Queries map them to the spec names in the return layer (e.g. `phone` → `phoneNumber`, `assignedAgentId` → `assignedTo`).

New fields added:
```ts
stage: v.union(
  v.literal("lead"),
  v.literal("prospect"),
  v.literal("customer"),
  v.literal("retained"),
  v.literal("churned"),
), // default: "lead"
stageUpdatedAt: v.optional(v.number()),
stageUpdatedBy: v.optional(v.string()),   // Clerk userId
totalConversations: v.number(),            // default 0
wabaId: v.optional(v.string()),           // populated on first inbound message
```

New indexes:
```ts
.index("by_tenant_stage", ["tenantId", "stage"])
.index("by_tenant_assigned", ["tenantId", "assignedAgentId"])
```

---

### New `followUps` table

```ts
followUps: defineTable({
  tenantId: v.string(),
  contactId: v.id("contacts"),
  phoneNumber: v.string(),         // denormalized for quick lookup
  wabaId: v.string(),
  scheduledAt: v.number(),         // Unix timestamp
  note: v.optional(v.string()),    // internal agent note (not sent to customer)
  whatsappMessage: v.string(),     // message sent to customer
  expectedRevenue: v.optional(v.number()),
  currency: v.optional(v.union(
    v.literal("EGP"),
    v.literal("SAR"),
    v.literal("AED"),
    v.literal("USD"),
  )),
  status: v.union(
    v.literal("pending"),
    v.literal("sent"),
    v.literal("failed"),
    v.literal("cancelled"),
  ),
  attemptCount: v.number(),        // default 0; max 2 (hardcoded)
  createdBy: v.string(),           // Clerk userId
  assignedTo: v.optional(v.string()),
  notifiedAt: v.optional(v.number()),
  sentAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_tenant_status", ["tenantId", "status"])
  .index("by_contact", ["contactId"])
  .index("by_scheduled", ["scheduledAt"])
```

**Attempt logic (hardcoded):**
- `MAX_ATTEMPTS = 2`
- On each failed Meta API call: `attemptCount++`
- When `attemptCount >= MAX_ATTEMPTS`: set `status = "failed"`, auto-churn contact, write `contactEvents` row with `{ expectedRevenue, currency }`

---

### New `contactEvents` table

```ts
contactEvents: defineTable({
  tenantId: v.string(),
  contactId: v.id("contacts"),
  type: v.union(
    v.literal("stage_changed"),
    v.literal("assigned"),
    v.literal("note_updated"),
    v.literal("tags_changed"),
    v.literal("followup_scheduled"),
    v.literal("followup_sent"),
    v.literal("followup_failed"),
    v.literal("conversation_started"),
    v.literal("conversation_resolved"),
    v.literal("lost"),             // auto-churn after max failed follow-up attempts
  ),
  actorId: v.optional(v.string()), // Clerk userId; null for system events
  metadata: v.any(),               // type-specific payload
  createdAt: v.number(),
})
  .index("by_contact", ["contactId", "createdAt"])
  .index("by_tenant", ["tenantId"])
```

**Metadata shapes by event type:**
- `stage_changed`: `{ from: Stage, to: Stage }`
- `assigned`: `{ to: string, by: string }`
- `note_updated`: `{ preview: string }` (first 100 chars)
- `tags_changed`: `{ added: string[], removed: string[] }`
- `followup_scheduled`: `{ scheduledAt: number, assignedTo?: string }`
- `followup_sent`: `{ followUpId: string }`
- `followup_failed`: `{ expectedRevenue?: number, currency?: string, attempts: number }`
- `lost`: `{ expectedRevenue?: number, currency?: string }`
- `conversation_started` / `conversation_resolved`: `{ conversationId: string }`

---

### New `notifications` table

```ts
notifications: defineTable({
  tenantId: v.string(),
  userId: v.string(),              // Clerk userId to notify
  type: v.literal("followup_due"),
  referenceId: v.string(),         // followUpId
  contactName: v.optional(v.string()),
  message: v.string(),
  read: v.boolean(),               // default false
  createdAt: v.number(),
})
  .index("by_user", ["tenantId", "userId", "read"])
```

---

## 2. Convex Backend

### `convex/contacts.ts` — additions

**New mutations:**
- `updateStage({ contactId, stage })` — patches `stage`, `stageUpdatedAt`, `stageUpdatedBy`; writes `stage_changed` event
- `assignContact({ contactId, assignedTo })` — Supervisor/Admin only; patches `assignedAgentId`; writes `assigned` event
- `updateContactDetails({ contactId, displayName?, email?, notes?, tags? })` — patches fields; writes `note_updated` and/or `tags_changed` events

**New/updated queries:**
- `listByOrg({ stage?, assignedTo? })` — filters by `tenantId` from auth context; enforces role visibility:
  - Agent: only contacts where `assignedAgentId === currentUserId`
  - Supervisor/Admin: all contacts in org
  - Supports optional `stage` and `assignedTo` filters
  - Maps DB field names to spec names in return value
- `getById({ contactId })` — single contact with field mapping

**Webhook integration:**
In `convex/http.ts` (existing inbound message handler), after saving the message:
- Call `upsertContact` to ensure contact exists
- Patch `lastSeenAt`, increment `totalConversations`, set `wabaId`
- Write `conversation_started` event if new conversation

---

### `convex/contactEvents.ts` — new file

- `getTimeline({ contactId, paginationOpts })` — paginated, ordered by `createdAt` desc
- `internalCreateEvent({ tenantId, contactId, type, actorId?, metadata })` — internalMutation called by other Convex functions

---

### `convex/followUps.ts` — new file

**Queries:**
- `listByContact({ contactId })` — all follow-ups for a contact
- `listPending({ assignedTo? })` — pending follow-ups for notification panel; Agent sees only where `assignedTo === currentUserId`, Supervisor/Admin see all in org

**Mutations:**
- `create({ contactId, scheduledAt, note?, whatsappMessage, expectedRevenue?, currency?, assignedTo? })` — all roles; writes `followup_scheduled` event
- `cancel({ followUpId })` — sets `status = "cancelled"`; all roles

**Internal mutation:**
- `processDue()` — called by cron every 30 minutes:
  1. Query all `followUps` where `status = "pending"` AND `scheduledAt <= Date.now()`
  2. For each due follow-up:
     - Look up channel by `wabaId`, decrypt `accessToken` (same pattern as `convex/channels.ts`)
     - Call Meta Cloud API to send `whatsappMessage` to `phoneNumber`
     - **Success:** set `status = "sent"`, `sentAt = now`; write `followup_sent` event; create notification for `assignedTo`
     - **Failure:** increment `attemptCount`
       - If `attemptCount < 2`: keep `status = "pending"` (will retry next cron run)
       - If `attemptCount >= 2`: set `status = "failed"`; update contact `stage = "churned"`; write `followup_failed` + `lost` events

---

### `convex/notifications.ts` — new file

- `listForUser()` — unread notifications for current user, ordered by `createdAt` desc
- `getUnreadCount()` — integer count; used for bell badge
- `markRead({ notificationId })` — sets `read = true`
- `markAllRead()` — bulk update all unread for current user

---

### `convex/crons.ts` — new file

```ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "process-due-followups",
  { minutes: 30 },
  internal.followUps.processDue,
);

export default crons;
```

---

## 3. UI Components

### Bell Notification Icon

Location: dashboard header (top-right), alongside existing user avatar.

- Red badge showing `getUnreadCount()` — hidden when 0
- Click opens a dropdown panel (shadcn Popover):
  - List of unread notifications: contact name, message, relative timestamp
  - "Mark all as read" button
  - Click on notification → navigate to `/contacts/[id]` + mark read
- RTL-compatible (badge positioned correctly in both directions)

---

### `components/contacts/ContactSidePanel.tsx`

shadcn `Sheet`, slides from right in LTR / left in RTL.

Sections:
1. **Header** — avatar initials, display name, phone number (always `dir="ltr"`)
2. **Stage** — colored badge + dropdown selector (all roles can change stage)
3. **Assigned agent** — read-only for Agent; editable dropdown for Supervisor/Admin
4. **Tags** — tag pills + inline add (auto-save)
5. **Notes** — textarea (auto-save on blur)
6. **Stats** — Total Conversations, First Contact, Last Contact
7. **Follow-ups** — list of pending follow-ups; "Schedule Follow-up" button (opens FollowUpModal)
8. **Mini timeline** — last 5 events rendered as compact list; "View full profile →" link to `/contacts/[id]`

---

### `components/contacts/FollowUpModal.tsx`

shadcn `Dialog`.

Fields:
- **Date + Time** — date picker + time input (combined)
- **Expected Revenue** — number input + currency select (EGP / SAR / AED / USD)
- **Internal Note** — optional textarea (visible to agents only, never sent)
- **WhatsApp Message** — required textarea (this is what gets sent to customer)
- **Assign to** — dropdown of org agents; defaults to current user

On submit: calls `followUps.create`; closes modal; shows toast confirmation.

---

### `components/contacts/ContactTimeline.tsx`

Full paginated event list. Each event rendered with:
- Icon matching event type (💬 conversation, 🔄 stage, 📅 follow-up, etc.)
- Actor name + relative timestamp
- Event-specific detail (e.g. "Lead → Prospect", message preview, revenue amount)

Used in both the mini timeline (last 5 events) and full profile page (paginated).

---

### `/contacts` page — existing page extended

- **Stage filter tabs** above table: All / Lead / Prospect / Customer / Retained / Churned
- **Assignment-aware visibility** enforced via `listByOrg` query (server-side)
- **Table columns:** Name, Phone, Stage badge, Assigned Agent, Last Contact, Next Follow-up date
- Each row links to `/contacts/[id]`

---

### `/contacts/[id]` page — new

Two-column layout:
- **Left (wider):** `ContactTimeline` (full, paginated)
- **Right:** Contact details card (editable) + Follow-ups list (pending + past)

Header: avatar, name, phone, stage changer, assigned agent display. Back button to `/contacts`.

---

### Inbox Stage Filter

Horizontal filter tabs added above the conversation list:
All / Lead / Prospect / Customer / Retained / Churned

Filtering: join conversation → contact via `contactId`, filter by `contact.stage`.

Role visibility unchanged from existing inbox logic (Agent sees own/unassigned, Supervisor/Admin see all).

---

## 4. Role & Permission Summary

| Action | Agent | Supervisor | Admin |
|--------|:-----:|:----------:|:-----:|
| View contacts | Own only | All in org | All in org |
| Change stage | ✅ | ✅ | ✅ |
| Schedule follow-up | ✅ | ✅ | ✅ |
| Cancel follow-up | ✅ (own) | ✅ | ✅ |
| Assign contact | ❌ | ✅ | ✅ |
| View follow-ups | Own only | All in org | All in org |
| View notifications | Own only | Own only | Own only |
| Filter by stage (Contacts + Inbox) | ✅ | ✅ | ✅ |

---

## 5. Key Decisions

| Decision | Rationale |
|----------|-----------|
| Field names mapped in query layer, not renamed in DB | Avoids migration, preserves existing code |
| `contactEvents` dedicated table | Queryable append-only log; derived approach can't reconstruct note/tag history |
| Cron every 30 min | Conserves Convex free plan function call quota; 15-min avg delay acceptable for sales follow-ups |
| Max 2 attempts hardcoded | Keeps logic simple; agents don't need to configure retry counts |
| Failed follow-ups auto-churn contact | Closes the loop on lost leads; enables lost revenue reporting |
| Expected revenue on follow-up (not contact) | Each follow-up can represent a different deal/opportunity |
| All roles can schedule follow-ups | Agents are closest to the customer; restricting to Supervisor creates bottleneck |

---

## 6. Out of Scope

- Revenue reporting / analytics dashboard (Phase 2)
- Email or SMS follow-up channels
- Follow-up templates library
- CRM pipeline board view (Kanban)
- Customer response tracking (CSAT for follow-ups)
