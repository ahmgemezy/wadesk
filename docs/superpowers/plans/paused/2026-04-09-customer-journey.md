# Customer Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sales pipeline (stage tracking), follow-up scheduling with automated WhatsApp sends, contact timeline, and in-app notifications to the existing WABDesk inbox.

**Architecture:** Four focused Convex modules (contactEvents, notifications, followUps, crons) plus additions to the existing contacts module. UI adds a side panel, full profile page, follow-up modal, notification bell, and stage filters in both the Contacts page and Inbox. Field names in the DB are preserved — queries map them to the spec names in the return layer.

**Tech Stack:** Convex (queries, mutations, internalAction, cronJobs), Next.js 15 App Router, shadcn/ui (Sheet, Dialog, Popover, Badge, Select), Tailwind CSS v4, Clerk auth, Meta Cloud API (text message send), TypeScript strict.

---

## File Map

| Status | File | Purpose |
|--------|------|---------|
| Modify | `convex/schema.ts` | Add stage/totalConversations/wabaId to contacts; add followUps, contactEvents, notifications tables |
| Modify | `convex/contacts.ts` | Add updateStage, assignContact, listByStage mutations/queries; extend upsertByPhone |
| Create | `convex/contactEvents.ts` | Timeline event log — internalCreateEvent + getTimeline |
| Create | `convex/notifications.ts` | Bell badge count, list, markRead, markAllRead |
| Create | `convex/followUps.ts` | create, cancel, listByContact, listPending, processDue (internalAction), recordFollowUpResult (internalMutation) |
| Create | `convex/crons.ts` | 30-minute cron calling followUps.processDue |
| Create | `components/ui/notification-bell.tsx` | Bell icon + unread badge + dropdown panel |
| Create | `components/contacts/contact-timeline.tsx` | Renders contactEvents list with icons and metadata |
| Create | `components/contacts/follow-up-modal.tsx` | Dialog: date/time, revenue, note, WA message, assign-to |
| Create | `components/contacts/contact-side-panel.tsx` | Sheet: avatar, stage, tags, notes, follow-ups, mini timeline |
| Create | `app/(dashboard)/contacts/[id]/page.tsx` | Full profile: header + two-column layout (timeline + details) |
| Modify | `app/(dashboard)/contacts/page.tsx` | Add stage filter tabs + assignment-aware query |
| Modify | `app/(dashboard)/inbox/page.tsx` | Add stage filter bar above conversation list |
| Modify | `app/(dashboard)/layout.tsx` | Add NotificationBell to header |

---

## Task 1: Schema — Add fields to contacts + 3 new tables

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Add stage fields and indexes to the contacts table**

In `convex/schema.ts`, inside the `contacts` table definition, add after the `createdAt` field:

```typescript
    stage: v.optional(v.union(
      v.literal("lead"),
      v.literal("prospect"),
      v.literal("customer"),
      v.literal("retained"),
      v.literal("churned"),
    )),
    stageUpdatedAt: v.optional(v.number()),
    stageUpdatedBy: v.optional(v.string()),
    totalConversations: v.optional(v.number()),
    wabaId: v.optional(v.string()),
```

Then add two indexes to the contacts table (after the existing `.index("search_by_name", ...)` call):

```typescript
    .index("by_tenant_stage", ["tenantId", "stage"])
    .index("by_tenant_assigned", ["tenantId", "assignedAgentId"])
```

- [ ] **Step 2: Add the followUps table**

After the `contacts` table, add:

```typescript
  followUps: defineTable({
    tenantId: v.string(),
    contactId: v.id("contacts"),
    channelId: v.id("channels"),
    phoneNumber: v.string(),
    scheduledAt: v.number(),
    note: v.optional(v.string()),
    whatsappMessage: v.string(),
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
    attemptCount: v.number(),
    createdBy: v.string(),
    assignedTo: v.optional(v.string()),
    notifiedAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_tenant_status", ["tenantId", "status"])
    .index("by_contact", ["contactId"])
    .index("by_scheduled", ["scheduledAt"]),
```

- [ ] **Step 3: Add the contactEvents table**

```typescript
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
      v.literal("lost"),
    ),
    actorId: v.optional(v.string()),
    metadata: v.any(),
    createdAt: v.number(),
  })
    .index("by_contact", ["contactId", "createdAt"])
    .index("by_tenant", ["tenantId"]),
```

- [ ] **Step 4: Add the notifications table**

```typescript
  notifications: defineTable({
    tenantId: v.string(),
    userId: v.string(),
    type: v.literal("followup_due"),
    referenceId: v.string(),
    contactName: v.optional(v.string()),
    message: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["tenantId", "userId", "read"]),
```

- [ ] **Step 5: Push schema and verify**

```bash
npx convex dev --once
```

Expected: schema deployed with no errors. Check Convex dashboard → Tables to confirm `followUps`, `contactEvents`, `notifications` tables exist.

- [ ] **Step 6: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(customer-journey): add stage/followUps/contactEvents/notifications schema"
```

---

## Task 2: contactEvents Convex module

**Files:**
- Create: `convex/contactEvents.ts`

- [ ] **Step 1: Create the file**

```typescript
import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { getCallerIdentity } from "./lib/auth";

// ── Internal: write a timeline event ─────────────────────────────────────────

export const internalCreate = internalMutation({
  args: {
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
      v.literal("lost"),
    ),
    actorId: v.optional(v.string()),
    metadata: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("contactEvents", {
      tenantId: args.tenantId,
      contactId: args.contactId,
      type: args.type,
      actorId: args.actorId,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});

// ── Public: get paginated timeline for a contact ──────────────────────────────

export const getTimeline = query({
  args: {
    contactId: v.id("contacts"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    // Verify contact belongs to tenant
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.tenantId !== tenantId) {
      return { page: [], isDone: true, continueCursor: "" };
    }
    return ctx.db
      .query("contactEvents")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
```

- [ ] **Step 2: Push and verify**

```bash
npx convex dev --once
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add convex/contactEvents.ts
git commit -m "feat(customer-journey): add contactEvents module"
```

---

## Task 3: notifications Convex module

**Files:**
- Create: `convex/notifications.ts`

- [ ] **Step 1: Create the file**

```typescript
import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getCallerIdentity } from "./lib/auth";

// ── Internal: create a notification ──────────────────────────────────────────

export const internalCreate = internalMutation({
  args: {
    tenantId: v.string(),
    userId: v.string(),
    referenceId: v.string(),
    contactName: v.optional(v.string()),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      tenantId: args.tenantId,
      userId: args.userId,
      type: "followup_due",
      referenceId: args.referenceId,
      contactName: args.contactName,
      message: args.message,
      read: false,
      createdAt: Date.now(),
    });
  },
});

// ── Public queries ────────────────────────────────────────────────────────────

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", callerId).eq("read", false),
      )
      .collect();
    return unread.length;
  },
});

export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    return ctx.db
      .query("notifications")
      .withIndex("by_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", callerId).eq("read", false),
      )
      .order("desc")
      .take(30);
  },
});

// ── Public mutations ──────────────────────────────────────────────────────────

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    const n = await ctx.db.get(args.notificationId);
    if (!n || n.tenantId !== tenantId || n.userId !== callerId) return;
    await ctx.db.patch(args.notificationId, { read: true });
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", callerId).eq("read", false),
      )
      .collect();
    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { read: true })));
  },
});
```

- [ ] **Step 2: Push and verify**

```bash
npx convex dev --once
```

- [ ] **Step 3: Commit**

```bash
git add convex/notifications.ts
git commit -m "feat(customer-journey): add notifications module"
```

---

## Task 4: contacts.ts — stage, assign, listByStage, extend upsertByPhone

**Files:**
- Modify: `convex/contacts.ts`

- [ ] **Step 1: Add imports for internal at the top of the file**

At the top of `convex/contacts.ts`, add `internal` to the existing import:

```typescript
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
```

(The file already imports `query, mutation, internalMutation` — just add `internal` to the server import line and add the api import.)

- [ ] **Step 2: Add updateStage mutation**

Append to `convex/contacts.ts`:

```typescript
export const updateStage = mutation({
  args: {
    contactId: v.id("contacts"),
    stage: v.union(
      v.literal("lead"),
      v.literal("prospect"),
      v.literal("customer"),
      v.literal("retained"),
      v.literal("churned"),
    ),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.tenantId !== tenantId) {
      throw new Error("Contact not found");
    }
    const previousStage = contact.stage ?? "lead";
    await ctx.db.patch(args.contactId, {
      stage: args.stage,
      stageUpdatedAt: Date.now(),
      stageUpdatedBy: callerId,
    });
    await ctx.runMutation(internal.contactEvents.internalCreate, {
      tenantId,
      contactId: args.contactId,
      type: "stage_changed",
      actorId: callerId,
      metadata: { from: previousStage, to: args.stage },
    });
  },
});
```

- [ ] **Step 3: Add assignContact mutation (Supervisor/Admin only)**

```typescript
export const assignContact = mutation({
  args: {
    contactId: v.id("contacts"),
    assignedTo: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    const role = await getCallerRole(ctx);
    assertAdminOrSupervisor(role);
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.tenantId !== tenantId) {
      throw new Error("Contact not found");
    }
    await ctx.db.patch(args.contactId, { assignedAgentId: args.assignedTo });
    await ctx.runMutation(internal.contactEvents.internalCreate, {
      tenantId,
      contactId: args.contactId,
      type: "assigned",
      actorId: callerId,
      metadata: { to: args.assignedTo, by: callerId },
    });
  },
});
```

- [ ] **Step 4: Add listByStage query (role-aware)**

```typescript
export const listByStage = query({
  args: {
    stage: v.optional(v.union(
      v.literal("lead"),
      v.literal("prospect"),
      v.literal("customer"),
      v.literal("retained"),
      v.literal("churned"),
    )),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);

    let contacts;
    if (args.stage) {
      contacts = await ctx.db
        .query("contacts")
        .withIndex("by_tenant_stage", (q) =>
          q.eq("tenantId", tenantId).eq("stage", args.stage!),
        )
        .filter((q) => q.eq(q.field("isArchived"), false))
        .collect();
    } else {
      contacts = await ctx.db
        .query("contacts")
        .withIndex("by_tenant_archived", (q) =>
          q.eq("tenantId", tenantId).eq("isArchived", false),
        )
        .collect();
    }

    // Role-based visibility: Agent sees only own contacts
    if (orgRole === "org:agent") {
      contacts = contacts.filter((c) => c.assignedAgentId === callerId);
    }

    // Map DB field names to spec names
    return contacts.map((c) => ({
      id: c._id,
      phoneNumber: c.phone,
      displayName: c.displayName,
      customName: c.customName,
      tags: c.tags,
      notes: c.notes,
      assignedTo: c.assignedAgentId,
      stage: c.stage ?? "lead",
      stageUpdatedAt: c.stageUpdatedAt,
      totalConversations: c.totalConversations ?? 0,
      firstContactAt: c.firstSeenAt,
      lastContactAt: c.lastSeenAt,
      isArchived: c.isArchived,
      source: c.source,
      wabaId: c.wabaId,
      createdAt: c.createdAt,
    }));
  },
});
```

- [ ] **Step 5: Extend upsertByPhone to track wabaId and totalConversations**

Find the existing `upsertByPhone` internalMutation and replace it with:

```typescript
export const upsertByPhone = internalMutation({
  args: {
    tenantId: v.string(),
    phone: v.string(),
    displayName: v.optional(v.string()),
    wabaId: v.optional(v.string()),
    incrementConversations: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_tenant_phone", (q) =>
        q.eq("tenantId", args.tenantId).eq("phone", args.phone),
      )
      .first();

    if (existing) {
      const patch: Record<string, unknown> = {
        lastSeenAt: Date.now(),
        displayName: args.displayName ?? existing.displayName,
      };
      if (args.wabaId) patch.wabaId = args.wabaId;
      if (args.incrementConversations) {
        patch.totalConversations = (existing.totalConversations ?? 0) + 1;
      }
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return ctx.db.insert("contacts", {
      tenantId: args.tenantId,
      phone: args.phone,
      displayName: args.displayName ?? args.phone,
      tags: [],
      source: "auto",
      isArchived: false,
      stage: "lead",
      totalConversations: args.incrementConversations ? 1 : 0,
      wabaId: args.wabaId,
      firstSeenAt: Date.now(),
      lastSeenAt: Date.now(),
      createdAt: Date.now(),
    });
  },
});
```

- [ ] **Step 6: Push and verify**

```bash
npx convex dev --once
```

Expected: no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add convex/contacts.ts
git commit -m "feat(customer-journey): add updateStage, assignContact, listByStage; extend upsertByPhone"
```

---

## Task 5: followUps Convex module

**Files:**
- Create: `convex/followUps.ts`

- [ ] **Step 1: Create the file with CRUD and list queries**

```typescript
import { v } from "convex/values";
import { query, mutation, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCallerIdentity, getCallerRole } from "./lib/auth";
import { decrypt } from "./lib/encryption";

const MAX_ATTEMPTS = 2;

// ── Queries ───────────────────────────────────────────────────────────────────

export const listByContact = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.tenantId !== tenantId) return [];
    return ctx.db
      .query("followUps")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .order("desc")
      .collect();
  },
});

export const listPending = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    const all = await ctx.db
      .query("followUps")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "pending"),
      )
      .order("asc")
      .collect();

    if (orgRole === "org:agent") {
      return all.filter((f) => f.assignedTo === callerId);
    }
    return all;
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    contactId: v.id("contacts"),
    channelId: v.id("channels"),
    scheduledAt: v.number(),
    note: v.optional(v.string()),
    whatsappMessage: v.string(),
    expectedRevenue: v.optional(v.number()),
    currency: v.optional(v.union(
      v.literal("EGP"),
      v.literal("SAR"),
      v.literal("AED"),
      v.literal("USD"),
    )),
    assignedTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.tenantId !== tenantId) {
      throw new Error("Contact not found");
    }
    const followUpId = await ctx.db.insert("followUps", {
      tenantId,
      contactId: args.contactId,
      channelId: args.channelId,
      phoneNumber: contact.phone,
      scheduledAt: args.scheduledAt,
      note: args.note,
      whatsappMessage: args.whatsappMessage,
      expectedRevenue: args.expectedRevenue,
      currency: args.currency,
      status: "pending",
      attemptCount: 0,
      createdBy: callerId,
      assignedTo: args.assignedTo ?? callerId,
      createdAt: Date.now(),
    });
    await ctx.runMutation(internal.contactEvents.internalCreate, {
      tenantId,
      contactId: args.contactId,
      type: "followup_scheduled",
      actorId: callerId,
      metadata: {
        scheduledAt: args.scheduledAt,
        assignedTo: args.assignedTo ?? callerId,
        expectedRevenue: args.expectedRevenue,
        currency: args.currency,
      },
    });
    return followUpId;
  },
});

export const cancel = mutation({
  args: { followUpId: v.id("followUps") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const followUp = await ctx.db.get(args.followUpId);
    if (!followUp || followUp.tenantId !== tenantId) {
      throw new Error("Follow-up not found");
    }
    if (followUp.status !== "pending") {
      throw new Error("Can only cancel pending follow-ups");
    }
    await ctx.db.patch(args.followUpId, { status: "cancelled" });
  },
});

// ── Internal: record result after send attempt ────────────────────────────────

export const recordFollowUpResult = internalMutation({
  args: {
    followUpId: v.id("followUps"),
    success: v.boolean(),
  },
  handler: async (ctx, args) => {
    const followUp = await ctx.db.get(args.followUpId);
    if (!followUp) return;

    const contact = await ctx.db.get(followUp.contactId);
    const contactName = contact?.displayName ?? contact?.phone ?? "Customer";

    if (args.success) {
      await ctx.db.patch(args.followUpId, {
        status: "sent",
        sentAt: Date.now(),
      });
      await ctx.runMutation(internal.contactEvents.internalCreate, {
        tenantId: followUp.tenantId,
        contactId: followUp.contactId,
        type: "followup_sent",
        actorId: undefined,
        metadata: { followUpId: args.followUpId },
      });
      // Notify assigned agent
      if (followUp.assignedTo) {
        await ctx.runMutation(internal.notifications.internalCreate, {
          tenantId: followUp.tenantId,
          userId: followUp.assignedTo,
          referenceId: args.followUpId,
          contactName,
          message: `تم إرسال المتابعة إلى ${contactName}`,
        });
      }
    } else {
      const newAttemptCount = followUp.attemptCount + 1;
      if (newAttemptCount >= MAX_ATTEMPTS) {
        // Max attempts reached — mark failed and churn contact
        await ctx.db.patch(args.followUpId, {
          status: "failed",
          attemptCount: newAttemptCount,
        });
        // Auto-churn the contact
        if (contact) {
          await ctx.db.patch(followUp.contactId, {
            stage: "churned",
            stageUpdatedAt: Date.now(),
          });
        }
        await ctx.runMutation(internal.contactEvents.internalCreate, {
          tenantId: followUp.tenantId,
          contactId: followUp.contactId,
          type: "followup_failed",
          actorId: undefined,
          metadata: {
            expectedRevenue: followUp.expectedRevenue,
            currency: followUp.currency,
            attempts: newAttemptCount,
          },
        });
        await ctx.runMutation(internal.contactEvents.internalCreate, {
          tenantId: followUp.tenantId,
          contactId: followUp.contactId,
          type: "lost",
          actorId: undefined,
          metadata: {
            expectedRevenue: followUp.expectedRevenue,
            currency: followUp.currency,
          },
        });
        // Notify assigned agent about failure
        if (followUp.assignedTo) {
          await ctx.runMutation(internal.notifications.internalCreate, {
            tenantId: followUp.tenantId,
            userId: followUp.assignedTo,
            referenceId: args.followUpId,
            contactName,
            message: `فشل إرسال المتابعة إلى ${contactName} بعد ${MAX_ATTEMPTS} محاولات`,
          });
        }
      } else {
        // Still have attempts left — increment count, keep pending for next cron run
        await ctx.db.patch(args.followUpId, { attemptCount: newAttemptCount });
      }
    }
  },
});

// ── Internal action: process due follow-ups (called by cron) ─────────────────

export const processDue = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Fetch all pending follow-ups that are due
    // We query by scheduledAt using a filter — Convex doesn't support range on
    // a secondary-only index, so we collect pending ones and filter in memory.
    const pending = await ctx.runQuery(internal.followUps._listDue, { now });

    for (const followUp of pending) {
      // Look up channel to get access token and phoneNumberId
      const channel = await ctx.runQuery(internal.channels.getById, {
        channelId: followUp.channelId,
      });

      if (!channel || !channel.accessToken) {
        console.warn(`[FOLLOWUP] No channel/token for followUp ${followUp._id}`);
        await ctx.runMutation(internal.followUps.recordFollowUpResult, {
          followUpId: followUp._id,
          success: false,
        });
        continue;
      }

      let accessToken: string;
      try {
        accessToken = await decrypt(channel.accessToken);
      } catch {
        console.warn(`[FOLLOWUP] Failed to decrypt token for channel ${channel._id}`);
        await ctx.runMutation(internal.followUps.recordFollowUpResult, {
          followUpId: followUp._id,
          success: false,
        });
        continue;
      }

      // Send WhatsApp text message via Meta Cloud API
      const apiVersion = process.env.WHATSAPP_API_VERSION ?? "v19.0";
      const url = `https://graph.facebook.com/${apiVersion}/${channel.phoneNumberId}/messages`;

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: followUp.phoneNumber,
            type: "text",
            text: { body: followUp.whatsappMessage },
          }),
        });

        const success = res.ok;
        if (!success) {
          const errText = await res.text();
          console.warn(`[FOLLOWUP] Meta API error for ${followUp._id}: ${errText}`);
        }

        await ctx.runMutation(internal.followUps.recordFollowUpResult, {
          followUpId: followUp._id,
          success,
        });
      } catch (err) {
        console.warn(`[FOLLOWUP] Fetch error for ${followUp._id}:`, err);
        await ctx.runMutation(internal.followUps.recordFollowUpResult, {
          followUpId: followUp._id,
          success: false,
        });
      }
    }
  },
});

// Internal query used by processDue action
export const _listDue = internalMutation({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    // internalMutation used here for DB access from action
    // Returns pending follow-ups scheduled at or before now
    const pending = await ctx.db
      .query("followUps")
      .withIndex("by_scheduled", (q) => q.lte("scheduledAt", args.now))
      .collect();
    return pending.filter((f) => f.status === "pending");
  },
});
```

> **Note:** `_listDue` uses `internalMutation` instead of `internalQuery` because actions can call mutations but reading inside an action still requires `ctx.runQuery`. Replace `internalMutation` with `internalQuery` for `_listDue` since it only reads data:

- [ ] **Step 2: Fix _listDue to be an internalQuery**

Change `_listDue` to use `internalQuery` (it only reads):

```typescript
import { query, mutation, internalMutation, internalAction, internalQuery } from "./_generated/server";

// ...

export const _listDue = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("followUps")
      .withIndex("by_scheduled", (q) => q.lte("scheduledAt", args.now))
      .collect();
    return pending.filter((f) => f.status === "pending");
  },
});
```

And update the `processDue` action to use `ctx.runQuery`:

```typescript
const pending = await ctx.runQuery(internal.followUps._listDue, { now });
```

- [ ] **Step 3: Add getById internalQuery to channels.ts**

The `processDue` action needs `internal.channels.getById`. Check if it exists — it does at line 50 of `convex/channels.ts`. Verify it accepts `{ channelId: v.id("channels") }` and returns the full channel doc including `accessToken` and `phoneNumberId`.

Open `convex/channels.ts` and verify/add:

```typescript
export const getById = internalQuery({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.channelId);
  },
});
```

- [ ] **Step 4: Push and verify**

```bash
npx convex dev --once
```

Expected: no TypeScript errors. The `internal.followUps` and `internal.channels.getById` references must all resolve.

- [ ] **Step 5: Commit**

```bash
git add convex/followUps.ts convex/channels.ts
git commit -m "feat(customer-journey): add followUps module with processDue action"
```

---

## Task 6: crons.ts — 30-minute schedule

**Files:**
- Create: `convex/crons.ts`

- [ ] **Step 1: Create crons.ts**

```typescript
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

- [ ] **Step 2: Push and verify**

```bash
npx convex dev --once
```

Expected: no errors. Check Convex dashboard → Scheduled Functions to see `process-due-followups` listed.

- [ ] **Step 3: Commit**

```bash
git add convex/crons.ts
git commit -m "feat(customer-journey): add 30-minute cron for follow-up processing"
```

---

## Task 7: NotificationBell UI component

**Files:**
- Create: `components/ui/notification-bell.tsx`
- Modify: `app/(dashboard)/layout.tsx`

- [ ] **Step 1: Create the notification bell component**

```typescript
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export function NotificationBell({ locale }: { locale: "ar" | "en" }) {
  const router = useRouter();
  const unreadCount = useQuery(api.notifications.getUnreadCount) ?? 0;
  const notifications = useQuery(api.notifications.listForUser) ?? [];
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);

  const isRtl = locale === "ar";

  async function handleNotificationClick(
    notificationId: Id<"notifications">,
    referenceId: string,
  ) {
    await markRead({ notificationId });
    // referenceId is followUpId — navigate to the contact profile
    // We look up contactId from the followUp later; for now navigate to contacts list
    router.push(`/contacts`);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 end-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={isRtl ? "start" : "end"}
        className="w-80 p-0"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-semibold text-sm">
            {isRtl ? "الإشعارات" : "Notifications"}
          </span>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {isRtl ? "تحديد الكل كمقروء" : "Mark all read"}
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {isRtl ? "لا توجد إشعارات" : "No notifications"}
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n._id}
                onClick={() => handleNotificationClick(n._id, n.referenceId)}
                className={cn(
                  "w-full text-start px-4 py-3 hover:bg-muted transition-colors border-b last:border-b-0",
                  !n.read && "bg-blue-50 dark:bg-blue-950/20",
                )}
              >
                <p className="text-sm font-medium">{n.contactName ?? "—"}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {n.message}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), {
                    addSuffix: true,
                    locale: isRtl ? ar : undefined,
                  })}
                </p>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Install date-fns if not already installed**

```bash
npm list date-fns 2>/dev/null | grep date-fns || npm install date-fns
```

- [ ] **Step 3: Add NotificationBell to the dashboard layout header**

In `app/(dashboard)/layout.tsx`, the header currently renders:

```tsx
<header className="flex h-12 shrink-0 items-center gap-2 px-4 border-b">
  <SidebarTrigger className="-ms-1" />
  <Separator orientation="vertical" className="h-4" />
</header>
```

Replace with:

```tsx
import { NotificationBell } from "@/components/ui/notification-bell";

// ...

<header className="flex h-12 shrink-0 items-center gap-2 px-4 border-b">
  <SidebarTrigger className="-ms-1" />
  <Separator orientation="vertical" className="h-4" />
  <div className="ms-auto">
    <NotificationBell locale={locale} />
  </div>
</header>
```

Note: `layout.tsx` is a Server Component. `NotificationBell` is a Client Component — the import is fine since Next.js handles the boundary automatically.

- [ ] **Step 4: Push and verify (dev server)**

```bash
npm run dev
```

Open the dashboard. The bell icon should appear in the top-right of the header. With no notifications, the badge should be hidden.

- [ ] **Step 5: Commit**

```bash
git add components/ui/notification-bell.tsx app/(dashboard)/layout.tsx
git commit -m "feat(customer-journey): add NotificationBell to dashboard header"
```

---

## Task 8: ContactTimeline component

**Files:**
- Create: `components/contacts/contact-timeline.tsx`

- [ ] **Step 1: Create the component**

```typescript
"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import {
  MessageCircle,
  CheckCircle,
  RefreshCw,
  CalendarClock,
  CheckCheck,
  FileText,
  Tag,
  UserCheck,
  TrendingDown,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EventType =
  | "stage_changed"
  | "assigned"
  | "note_updated"
  | "tags_changed"
  | "followup_scheduled"
  | "followup_sent"
  | "followup_failed"
  | "conversation_started"
  | "conversation_resolved"
  | "lost";

interface ContactEvent {
  _id: Id<"contactEvents">;
  type: EventType;
  actorId?: string;
  metadata: Record<string, unknown>;
  createdAt: number;
}

interface Props {
  events: ContactEvent[];
  locale: "ar" | "en";
  compact?: boolean; // true = mini timeline (last 5, no pagination)
}

const EVENT_ICONS: Record<EventType, React.ElementType> = {
  conversation_started: MessageCircle,
  conversation_resolved: CheckCircle,
  stage_changed: RefreshCw,
  followup_scheduled: CalendarClock,
  followup_sent: CheckCheck,
  followup_failed: XCircle,
  note_updated: FileText,
  tags_changed: Tag,
  assigned: UserCheck,
  lost: TrendingDown,
};

const EVENT_COLORS: Record<EventType, string> = {
  conversation_started: "text-blue-500",
  conversation_resolved: "text-green-500",
  stage_changed: "text-purple-500",
  followup_scheduled: "text-amber-500",
  followup_sent: "text-green-500",
  followup_failed: "text-red-500",
  note_updated: "text-gray-500",
  tags_changed: "text-gray-500",
  assigned: "text-blue-500",
  lost: "text-red-600",
};

function eventLabel(event: ContactEvent, locale: "ar" | "en"): string {
  const isAr = locale === "ar";
  const meta = event.metadata as Record<string, string | number | undefined>;
  switch (event.type) {
    case "stage_changed":
      return isAr
        ? `تغيرت المرحلة من ${meta.from} إلى ${meta.to}`
        : `Stage changed from ${meta.from} to ${meta.to}`;
    case "assigned":
      return isAr ? "تم تعيين العميل لوكيل" : "Contact assigned to agent";
    case "note_updated":
      return isAr ? "تم تحديث الملاحظة" : "Note updated";
    case "tags_changed":
      return isAr ? "تم تحديث التصنيفات" : "Tags updated";
    case "followup_scheduled": {
      const date = meta.scheduledAt
        ? new Date(meta.scheduledAt as number).toLocaleDateString(
            isAr ? "ar-EG" : "en-US",
          )
        : "";
      return isAr ? `تمت جدولة متابعة بتاريخ ${date}` : `Follow-up scheduled for ${date}`;
    }
    case "followup_sent":
      return isAr ? "تم إرسال رسالة المتابعة" : "Follow-up message sent";
    case "followup_failed":
      return isAr
        ? `فشل إرسال المتابعة بعد ${meta.attempts} محاولات`
        : `Follow-up failed after ${meta.attempts} attempts`;
    case "lost": {
      const rev = meta.expectedRevenue
        ? ` (${meta.expectedRevenue} ${meta.currency ?? ""})`
        : "";
      return isAr
        ? `تم تصنيف العميل كمفقود${rev}`
        : `Contact marked as lost${rev}`;
    }
    case "conversation_started":
      return isAr ? "بدأت محادثة جديدة" : "New conversation started";
    case "conversation_resolved":
      return isAr ? "تم إغلاق المحادثة" : "Conversation resolved";
    default:
      return event.type;
  }
}

export function ContactTimeline({ events, locale, compact = false }: Props) {
  const isRtl = locale === "ar";
  const displayed = compact ? events.slice(0, 5) : events;

  if (displayed.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        {isRtl ? "لا توجد أحداث بعد" : "No events yet"}
      </p>
    );
  }

  return (
    <ol className={cn("relative", isRtl ? "border-r border-muted me-3" : "border-l border-muted ms-3")}>
      {displayed.map((event) => {
        const Icon = EVENT_ICONS[event.type] ?? MessageCircle;
        const colorClass = EVENT_COLORS[event.type] ?? "text-gray-500";
        return (
          <li
            key={event._id}
            className={cn(
              "mb-6 relative",
              isRtl ? "pe-6" : "ps-6",
            )}
          >
            <span
              className={cn(
                "absolute flex items-center justify-center w-6 h-6 rounded-full bg-background border",
                isRtl ? "-end-3" : "-start-3",
                colorClass,
              )}
            >
              <Icon className="w-3 h-3" />
            </span>
            <p className="text-sm font-medium">{eventLabel(event, locale)}</p>
            <time className="block text-xs text-muted-foreground mt-0.5">
              {formatDistanceToNow(new Date(event.createdAt), {
                addSuffix: true,
                locale: isRtl ? ar : undefined,
              })}
            </time>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/contacts/contact-timeline.tsx
git commit -m "feat(customer-journey): add ContactTimeline component"
```

---

## Task 9: FollowUpModal component

**Files:**
- Create: `components/contacts/follow-up-modal.tsx`

- [ ] **Step 1: Create the component**

```typescript
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useOrganization } from "@clerk/nextjs";

interface Props {
  open: boolean;
  onClose: () => void;
  contactId: Id<"contacts">;
  channelId: Id<"channels">;
  locale: "ar" | "en";
}

const CURRENCIES = ["EGP", "SAR", "AED", "USD"] as const;
type Currency = (typeof CURRENCIES)[number];

export function FollowUpModal({ open, onClose, contactId, channelId, locale }: Props) {
  const isRtl = locale === "ar";
  const { memberships } = useOrganization({ memberships: { infinite: true } });
  const createFollowUp = useMutation(api.followUps.create);

  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [revenue, setRevenue] = useState("");
  const [currency, setCurrency] = useState<Currency>("EGP");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const agents =
    memberships?.data?.map((m) => ({
      id: m.publicUserData?.userId ?? "",
      name: `${m.publicUserData?.firstName ?? ""} ${m.publicUserData?.lastName ?? ""}`.trim(),
    })) ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduledDate || !message.trim()) return;

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).getTime();
    if (isNaN(scheduledAt)) {
      toast.error(isRtl ? "تاريخ غير صالح" : "Invalid date");
      return;
    }

    setLoading(true);
    try {
      await createFollowUp({
        contactId,
        channelId,
        scheduledAt,
        note: note.trim() || undefined,
        whatsappMessage: message.trim(),
        expectedRevenue: revenue ? Number(revenue) : undefined,
        currency: revenue ? currency : undefined,
        assignedTo: assignedTo || undefined,
      });
      toast.success(isRtl ? "تمت جدولة المتابعة" : "Follow-up scheduled");
      onClose();
      // Reset form
      setScheduledDate("");
      setScheduledTime("09:00");
      setNote("");
      setMessage("");
      setRevenue("");
      setAssignedTo("");
    } catch {
      toast.error(isRtl ? "حدث خطأ، حاول مرة أخرى" : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir={isRtl ? "rtl" : "ltr"} className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isRtl ? "جدولة متابعة" : "Schedule Follow-up"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{isRtl ? "التاريخ" : "Date"}</Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>{isRtl ? "الوقت" : "Time"}</Label>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Expected Revenue */}
          <div className="space-y-1">
            <Label>{isRtl ? "الإيراد المتوقع (اختياري)" : "Expected Revenue (optional)"}</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                className="flex-1"
              />
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Internal Note */}
          <div className="space-y-1">
            <Label>{isRtl ? "ملاحظة داخلية (اختياري)" : "Internal Note (optional)"}</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={isRtl ? "ملاحظة للوكيل فقط..." : "Note for agent only..."}
            />
          </div>

          {/* WhatsApp Message */}
          <div className="space-y-1">
            <Label>{isRtl ? "رسالة واتساب *" : "WhatsApp Message *"}</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              required
              placeholder={isRtl ? "الرسالة التي ستُرسل للعميل..." : "Message to send to customer..."}
            />
          </div>

          {/* Assign To */}
          <div className="space-y-1">
            <Label>{isRtl ? "تعيين إلى" : "Assign to"}</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder={isRtl ? "الوكيل الحالي" : "Current user (default)"} />
              </SelectTrigger>
              <SelectContent>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? isRtl ? "جاري الحفظ..." : "Saving..."
                : isRtl ? "جدولة" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/contacts/follow-up-modal.tsx
git commit -m "feat(customer-journey): add FollowUpModal component"
```

---

## Task 10: ContactSidePanel component

**Files:**
- Create: `components/contacts/contact-side-panel.tsx`

- [ ] **Step 1: Create the component**

```typescript
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { CalendarClock, ExternalLink } from "lucide-react";
import Link from "next/link";
import { ContactTimeline } from "@/components/contacts/contact-timeline";
import { FollowUpModal } from "@/components/contacts/follow-up-modal";
import { toast } from "sonner";
import { usePaginatedQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";

type Stage = "lead" | "prospect" | "customer" | "retained" | "churned";

const STAGE_LABELS: Record<Stage, { ar: string; en: string; color: string }> = {
  lead: { ar: "عميل محتمل", en: "Lead", color: "bg-gray-100 text-gray-700" },
  prospect: { ar: "مهتم", en: "Prospect", color: "bg-blue-100 text-blue-700" },
  customer: { ar: "عميل", en: "Customer", color: "bg-green-100 text-green-700" },
  retained: { ar: "عميل وفي", en: "Retained", color: "bg-purple-100 text-purple-700" },
  churned: { ar: "خسرناه", en: "Churned", color: "bg-red-100 text-red-700" },
};

interface Props {
  contactId: Id<"contacts"> | null;
  channelId: Id<"channels"> | null;
  open: boolean;
  onClose: () => void;
  locale: "ar" | "en";
}

export function ContactSidePanel({ contactId, channelId, open, onClose, locale }: Props) {
  const isRtl = locale === "ar";
  const { user } = useUser();

  const contact = useQuery(
    api.contacts.getById,
    contactId ? { contactId } : "skip",
  );

  const followUps = useQuery(
    api.followUps.listByContact,
    contactId ? { contactId } : "skip",
  ) ?? [];

  const { results: events } = usePaginatedQuery(
    api.contactEvents.getTimeline,
    contactId ? { contactId } : "skip",
    { initialNumItems: 5 },
  );

  const updateStage = useMutation(api.contacts.updateStage);
  const updateContact = useMutation(api.contacts.update);

  const [notes, setNotes] = useState<string>("");
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);

  // Initialize notes from contact when loaded
  if (contact?.contact && !notesLoaded) {
    setNotes(contact.contact.notes ?? "");
    setNotesLoaded(true);
  }

  async function handleStageChange(stage: Stage) {
    if (!contactId) return;
    try {
      await updateStage({ contactId, stage });
    } catch {
      toast.error(isRtl ? "فشل تغيير المرحلة" : "Failed to update stage");
    }
  }

  async function handleNotesSave() {
    if (!contactId) return;
    try {
      await updateContact({ contactId, notes: notes.trim() || undefined });
      toast.success(isRtl ? "تم حفظ الملاحظة" : "Note saved");
    } catch {
      toast.error(isRtl ? "فشل الحفظ" : "Failed to save");
    }
  }

  const c = contact?.contact;
  const stage = (c?.stage ?? "lead") as Stage;
  const stageInfo = STAGE_LABELS[stage];
  const initials = (c?.displayName ?? c?.phone ?? "?")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const pendingFollowUps = followUps.filter((f) => f.status === "pending");

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side={isRtl ? "left" : "right"}
          className="w-80 overflow-y-auto"
          dir={isRtl ? "rtl" : "ltr"}
        >
          {!c ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              {isRtl ? "جاري التحميل..." : "Loading..."}
            </div>
          ) : (
            <>
              <SheetHeader className="mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <SheetTitle className="text-base leading-tight truncate">
                      {c.customName ?? c.displayName}
                    </SheetTitle>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono" dir="ltr">
                      {c.phone}
                    </p>
                  </div>
                </div>
              </SheetHeader>

              {/* Stage selector */}
              <div className="space-y-1.5 mb-4">
                <p className="text-xs font-medium text-muted-foreground">
                  {isRtl ? "المرحلة" : "Stage"}
                </p>
                <Select value={stage} onValueChange={handleStageChange}>
                  <SelectTrigger className="h-8">
                    <SelectValue>
                      <Badge className={stageInfo.color}>
                        {isRtl ? stageInfo.ar : stageInfo.en}
                      </Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STAGE_LABELS) as Stage[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        <Badge className={STAGE_LABELS[s].color}>
                          {isRtl ? STAGE_LABELS[s].ar : STAGE_LABELS[s].en}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="my-3" />

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4 text-center">
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-lg font-bold">{contact.conversationCount}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {isRtl ? "محادثات" : "Conversations"}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-lg font-bold">{pendingFollowUps.length}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {isRtl ? "متابعات قادمة" : "Pending follow-ups"}
                  </p>
                </div>
              </div>

              <Separator className="my-3" />

              {/* Notes */}
              <div className="space-y-1.5 mb-4">
                <p className="text-xs font-medium text-muted-foreground">
                  {isRtl ? "ملاحظات" : "Notes"}
                </p>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={handleNotesSave}
                  rows={3}
                  placeholder={isRtl ? "أضف ملاحظة..." : "Add a note..."}
                  className="text-sm resize-none"
                />
              </div>

              <Separator className="my-3" />

              {/* Follow-ups */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    {isRtl ? "المتابعات" : "Follow-ups"}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => setFollowUpOpen(true)}
                    disabled={!channelId}
                  >
                    <CalendarClock className="h-3 w-3" />
                    {isRtl ? "جدولة" : "Schedule"}
                  </Button>
                </div>
                {pendingFollowUps.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {isRtl ? "لا توجد متابعات" : "No pending follow-ups"}
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {pendingFollowUps.slice(0, 3).map((f) => (
                      <li key={f._id} className="text-xs bg-muted/50 rounded p-2">
                        <p className="font-medium">
                          {new Date(f.scheduledAt).toLocaleDateString(
                            isRtl ? "ar-EG" : "en-US",
                            { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
                          )}
                        </p>
                        <p className="text-muted-foreground truncate mt-0.5">
                          {f.whatsappMessage}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Separator className="my-3" />

              {/* Mini Timeline */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    {isRtl ? "آخر الأحداث" : "Recent Activity"}
                  </p>
                  {contactId && (
                    <Link
                      href={`/contacts/${contactId}`}
                      className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                      onClick={onClose}
                    >
                      {isRtl ? "عرض الملف الكامل" : "Full profile"}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
                <ContactTimeline events={events as Parameters<typeof ContactTimeline>[0]["events"]} locale={locale} compact />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {contactId && channelId && (
        <FollowUpModal
          open={followUpOpen}
          onClose={() => setFollowUpOpen(false)}
          contactId={contactId}
          channelId={channelId}
          locale={locale}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/contacts/contact-side-panel.tsx
git commit -m "feat(customer-journey): add ContactSidePanel component"
```

---

## Task 11: Contact full profile page

**Files:**
- Create: `app/(dashboard)/contacts/[id]/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ContactTimeline } from "@/components/contacts/contact-timeline";
import { FollowUpModal } from "@/components/contacts/follow-up-modal";
import { ArrowRight, ArrowLeft, CalendarClock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Stage = "lead" | "prospect" | "customer" | "retained" | "churned";

const STAGE_LABELS: Record<Stage, { ar: string; en: string; color: string }> = {
  lead: { ar: "عميل محتمل", en: "Lead", color: "bg-gray-100 text-gray-700" },
  prospect: { ar: "مهتم", en: "Prospect", color: "bg-blue-100 text-blue-700" },
  customer: { ar: "عميل", en: "Customer", color: "bg-green-100 text-green-700" },
  retained: { ar: "عميل وفي", en: "Retained", color: "bg-purple-100 text-purple-700" },
  churned: { ar: "خسرناه", en: "Churned", color: "bg-red-100 text-red-700" },
};

export default function ContactProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const contactId = id as Id<"contacts">;
  const locale: "ar" | "en" = "ar"; // TODO: pull from cookie/context
  const isRtl = locale === "ar";

  const contact = useQuery(api.contacts.getById, { contactId });
  const followUps = useQuery(api.followUps.listByContact, { contactId }) ?? [];
  const channels = useQuery(api.channels.listForTenant) ?? [];

  const { results: events, loadMore, status } = usePaginatedQuery(
    api.contactEvents.getTimeline,
    { contactId },
    { initialNumItems: 20 },
  );

  const [followUpOpen, setFollowUpOpen] = useState(false);

  const c = contact?.contact;
  if (!c) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        {isRtl ? "جاري التحميل..." : "Loading..."}
      </div>
    );
  }

  const stage = (c.stage ?? "lead") as Stage;
  const stageInfo = STAGE_LABELS[stage];
  const initials = (c.displayName ?? c.phone)
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const pendingFollowUps = followUps.filter((f) => f.status === "pending");
  const pastFollowUps = followUps.filter((f) => f.status !== "pending");
  const firstChannel = channels[0];

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="h-full overflow-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b px-6 py-4 z-10">
        <div className="flex items-center gap-4">
          <Link href="/contacts">
            <Button variant="ghost" size="icon">
              {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            </Button>
          </Link>
          <Avatar className="h-10 w-10">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{c.customName ?? c.displayName}</h1>
            <p className="text-sm text-muted-foreground font-mono" dir="ltr">{c.phone}</p>
          </div>
          <Badge className={stageInfo.color}>
            {isRtl ? stageInfo.ar : stageInfo.en}
          </Badge>
          {firstChannel && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFollowUpOpen(true)}
              className="gap-2"
            >
              <CalendarClock className="h-4 w-4" />
              {isRtl ? "جدولة متابعة" : "Schedule Follow-up"}
            </Button>
          )}
        </div>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* Left: Full Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            {isRtl ? "سجل الأحداث" : "Activity Timeline"}
          </h2>
          <ContactTimeline
            events={events as Parameters<typeof ContactTimeline>[0]["events"]}
            locale={locale}
          />
          {status === "CanLoadMore" && (
            <Button variant="outline" size="sm" onClick={() => loadMore(20)}>
              {isRtl ? "تحميل المزيد" : "Load more"}
            </Button>
          )}
        </div>

        {/* Right: Details + Follow-ups */}
        <div className="space-y-6">
          {/* Contact details */}
          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="font-semibold text-sm">
              {isRtl ? "تفاصيل العميل" : "Contact Details"}
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{isRtl ? "أول تواصل" : "First contact"}</dt>
                <dd>{new Date(c.firstSeenAt).toLocaleDateString(isRtl ? "ar-EG" : "en-US")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{isRtl ? "آخر تواصل" : "Last contact"}</dt>
                <dd>{new Date(c.lastSeenAt).toLocaleDateString(isRtl ? "ar-EG" : "en-US")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{isRtl ? "المحادثات" : "Conversations"}</dt>
                <dd>{contact.conversationCount}</dd>
              </div>
              {c.notes && (
                <div className="pt-2 border-t">
                  <dt className="text-muted-foreground mb-1">{isRtl ? "ملاحظات" : "Notes"}</dt>
                  <dd className="text-xs bg-muted/50 rounded p-2">{c.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Pending Follow-ups */}
          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="font-semibold text-sm">
              {isRtl ? "المتابعات القادمة" : "Upcoming Follow-ups"}
            </h2>
            {pendingFollowUps.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {isRtl ? "لا توجد متابعات" : "No pending follow-ups"}
              </p>
            ) : (
              <ul className="space-y-2">
                {pendingFollowUps.map((f) => (
                  <li key={f._id} className="text-xs bg-muted/50 rounded p-2 space-y-1">
                    <p className="font-medium">
                      {new Date(f.scheduledAt).toLocaleString(
                        isRtl ? "ar-EG" : "en-US",
                        { dateStyle: "medium", timeStyle: "short" },
                      )}
                    </p>
                    <p className="text-muted-foreground line-clamp-2">{f.whatsappMessage}</p>
                    {f.expectedRevenue && (
                      <p className="font-semibold text-green-600">
                        {f.expectedRevenue} {f.currency}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Past Follow-ups */}
          {pastFollowUps.length > 0 && (
            <div className="rounded-lg border p-4 space-y-3">
              <h2 className="font-semibold text-sm text-muted-foreground">
                {isRtl ? "المتابعات السابقة" : "Past Follow-ups"}
              </h2>
              <ul className="space-y-2">
                {pastFollowUps.map((f) => (
                  <li key={f._id} className="text-xs rounded p-2 space-y-1 opacity-60">
                    <div className="flex items-center gap-1">
                      <Badge variant={f.status === "sent" ? "default" : "destructive"} className="text-[10px] h-4">
                        {f.status}
                      </Badge>
                      <span>
                        {new Date(f.scheduledAt).toLocaleDateString(isRtl ? "ar-EG" : "en-US")}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {firstChannel && (
        <FollowUpModal
          open={followUpOpen}
          onClose={() => setFollowUpOpen(false)}
          contactId={contactId}
          channelId={firstChannel._id}
          locale={locale}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/contacts/[id]/page.tsx"
git commit -m "feat(customer-journey): add contact full profile page"
```

---

## Task 12: Contacts page — stage filter + assignment-aware

**Files:**
- Modify: `app/(dashboard)/contacts/page.tsx`
- Modify: `components/contacts/contact-list.tsx`

- [ ] **Step 1: Add stage filter tabs to contact-list.tsx**

Open `components/contacts/contact-list.tsx` and read the current implementation. Then add a stage filter state and tabs above the existing table/list:

At the top of the component, add:

```typescript
const [stageFilter, setStageFilter] = useState<string | undefined>(undefined);
```

And query using `listByStage` from Convex when filtering:

```typescript
const filteredContacts = useQuery(api.contacts.listByStage, {
  stage: stageFilter as "lead" | "prospect" | "customer" | "retained" | "churned" | undefined,
});
```

Add stage filter tabs above the contact list (after the search bar):

```tsx
type Stage = "lead" | "prospect" | "customer" | "retained" | "churned";

const STAGES: { value: Stage; ar: string; en: string }[] = [
  { value: "lead", ar: "عملاء محتملون", en: "Leads" },
  { value: "prospect", ar: "مهتمون", en: "Prospects" },
  { value: "customer", ar: "عملاء", en: "Customers" },
  { value: "retained", ar: "عملاء وفيون", en: "Retained" },
  { value: "churned", ar: "خسرناهم", en: "Churned" },
];

// Render tabs:
<div className="flex gap-1 mb-3 overflow-x-auto pb-1">
  <button
    onClick={() => setStageFilter(undefined)}
    className={cn(
      "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
      !stageFilter
        ? "bg-primary text-primary-foreground"
        : "bg-muted text-muted-foreground hover:bg-muted/80",
    )}
  >
    {locale === "ar" ? "الكل" : "All"}
  </button>
  {STAGES.map((s) => (
    <button
      key={s.value}
      onClick={() => setStageFilter(s.value)}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
        stageFilter === s.value
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80",
      )}
    >
      {locale === "ar" ? s.ar : s.en}
    </button>
  ))}
</div>
```

For each contact row, add a stage badge and link to `/contacts/[id]`.

- [ ] **Step 2: Commit**

```bash
git add components/contacts/contact-list.tsx
git commit -m "feat(customer-journey): add stage filter and profile links to contacts list"
```

---

## Task 13: Inbox stage filter

**Files:**
- Modify: `app/(dashboard)/inbox/page.tsx`
- Modify: `convex/inbox.ts`

- [ ] **Step 1: Add stageFilter state to inbox page**

In `app/(dashboard)/inbox/page.tsx`, add:

```typescript
const [stageFilter, setStageFilter] = useState<string | undefined>(undefined);
```

Pass `stageFilter` to `listConversations`:

```typescript
const convList = useQuery(api.inbox.listConversations, {
  filter: "all",
  stageFilter: stageFilter as "lead" | "prospect" | "customer" | "retained" | "churned" | undefined,
});
```

- [ ] **Step 2: Add stage filter tabs above the ConversationList**

Above the `<ConversationList>` component, render the same tab pattern as Task 12:

```tsx
type Stage = "lead" | "prospect" | "customer" | "retained" | "churned";

const STAGES: { value: Stage; label: string }[] = [
  { value: "lead", label: t("stage.lead") },
  { value: "prospect", label: t("stage.prospect") },
  { value: "customer", label: t("stage.customer") },
  { value: "retained", label: t("stage.retained") },
  { value: "churned", label: t("stage.churned") },
];

<div className="flex gap-1 px-3 py-2 border-b overflow-x-auto">
  <button
    onClick={() => setStageFilter(undefined)}
    className={cn(
      "px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap",
      !stageFilter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
    )}
  >
    {t("filter.all")}
  </button>
  {STAGES.map((s) => (
    <button
      key={s.value}
      onClick={() => setStageFilter(s.value)}
      className={cn(
        "px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap",
        stageFilter === s.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
      )}
    >
      {s.label}
    </button>
  ))}
</div>
```

- [ ] **Step 3: Update listConversations in convex/inbox.ts to accept stageFilter**

In `convex/inbox.ts`, extend `listConversations` args and handler:

```typescript
// Add to args:
stageFilter: v.optional(v.union(
  v.literal("lead"),
  v.literal("prospect"),
  v.literal("customer"),
  v.literal("retained"),
  v.literal("churned"),
)),

// In handler, after fetching conversations, join with contact stage:
if (args.stageFilter) {
  const filtered = [];
  for (const conv of conversations) {
    const contact = await ctx.db.get(conv.contactId);
    if (contact && (contact.stage ?? "lead") === args.stageFilter) {
      filtered.push(conv);
    }
  }
  conversations = filtered;
}
```

- [ ] **Step 4: Push and verify**

```bash
npx convex dev --once
npm run dev
```

Open the inbox. Stage filter tabs should appear above the conversation list. Selecting a stage should filter conversations by their contact's stage.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/inbox/page.tsx" convex/inbox.ts
git commit -m "feat(customer-journey): add stage filter to inbox"
```

---

## Task 14: Webhook — extend upsertByPhone call

**Files:**
- Modify: `convex/http.ts`

- [ ] **Step 1: Pass wabaId and incrementConversations to upsertByPhone**

In `convex/http.ts`, find the call to `internal.contacts.upsertByPhone` inside the webhook handler. It currently looks like:

```typescript
await ctx.runMutation(internal.contacts.upsertByPhone, {
  tenantId: channel.tenantId,
  phone: from,
  displayName: profileName,
});
```

Replace with:

```typescript
await ctx.runMutation(internal.contacts.upsertByPhone, {
  tenantId: channel.tenantId,
  phone: from,
  displayName: profileName,
  wabaId: channel.wabaId,
  incrementConversations: isNewConversation, // pass true only for new conversations
});
```

Where `isNewConversation` is a boolean you already have in scope from whether a new conversation doc was created. Check the existing handler logic and wire it accordingly.

- [ ] **Step 2: Push and verify**

```bash
npx convex dev --once
```

- [ ] **Step 3: Commit**

```bash
git add convex/http.ts
git commit -m "feat(customer-journey): pass wabaId + incrementConversations to upsertByPhone in webhook"
```

---

## Task 15: Update PROGRESS.md

- [ ] **Step 1: Update PROGRESS.md**

Add the following entry under **Completed**:

```markdown
### Customer Journey
- **Status:** Done
- **Branch:** 008-dashboard-shell
- **What was built:** Stage pipeline (lead/prospect/customer/retained/churned), follow-up scheduling with 30-min cron + Meta API send, max 2 attempts before auto-churn, contact timeline, notification bell, ContactSidePanel, FollowUpModal, full contact profile page, stage filter in Contacts and Inbox
- **Key additions:**
  - `followUps` table — with attemptCount, expectedRevenue, channelId
  - `contactEvents` table — append-only timeline log
  - `notifications` table — in-app bell notifications
  - `convex/crons.ts` — 30-min cronJob
  - `convex/followUps.ts` — processDue internalAction + recordFollowUpResult internalMutation
  - `components/ui/notification-bell.tsx`
  - `components/contacts/contact-side-panel.tsx`
  - `components/contacts/follow-up-modal.tsx`
  - `components/contacts/contact-timeline.tsx`
  - `app/(dashboard)/contacts/[id]/page.tsx`
```

- [ ] **Step 2: Commit**

```bash
git add PROGRESS.md
git commit -m "chore: update PROGRESS.md — Customer Journey done"
```
