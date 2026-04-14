# SLA Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flag conversations where no agent has replied within a configurable time threshold. Show a visual ⚠️ warning in the inbox for breached conversations. Notify channel supervisors via in-app notification. Allow admins to set the SLA threshold per channel (department).

**Architecture:**
- Two new optional fields are added to `conversations`: `lastInboundAt` (updated every time an inbound message arrives) and `slaBreachedAt` (set when breach is detected, cleared when agent replies).
- One new optional field is added to `channels`: `slaThresholdMinutes`.
- The `notifications.type` union is extended with `"sla_breach"`.
- A new `convex/sla.ts` file has one export: `checkBreaches` internalMutation, called by cron every 5 minutes.
- `messages.ts` `createInbound` is updated to set `lastInboundAt`.
- `messages.ts` `sendReply` and `inbox.ts` `sendMessage` are updated to clear `slaBreachedAt`.
- The `listConversations` query is updated to return `slaBreachedAt`.
- The `ConversationListItem` shows a ⚠️ badge when `slaBreachedAt` is set.
- The channel settings page gets a numeric SLA threshold input (admin-only, Growth+).

**Plan availability:** Basic SLA alerts on Growth and above (per CLAUDE.md §21). Free and Starter: settings UI disabled with upgrade prompt.

**Tech Stack:** Convex (backend), Next.js App Router, shadcn/ui, Tailwind CSS v4, `useT()` for i18n.

> **IMPORTANT before writing any Convex code:** Read `convex/_generated/ai/guidelines.md`. Key rules: use `getCallerIdentity(ctx)` from `convex/lib/auth.ts`; always include arg validators; `internalMutation` can both read and write (it's a transaction); never call `ctx.db` from an `internalAction`.

---

## File Map

| Action | File |
|---|---|
| Create | `convex/sla.ts` |
| Modify | `convex/schema.ts` — 2 fields on `conversations`, 1 on `channels`, extend `notifications.type` |
| Modify | `convex/messages.ts` — set `lastInboundAt` in `createInbound`; clear `slaBreachedAt` in `sendReply` |
| Modify | `convex/inbox.ts` — clear `slaBreachedAt` in `sendMessage`; return `slaBreachedAt` from `listConversations` |
| Modify | `convex/crons.ts` — register SLA check cron |
| Modify | `components/inbox/conversation-list-item.tsx` — show ⚠️ badge |
| Modify | `components/inbox/conversation-list.tsx` — pass `slaBreachedAt` to list item |
| Modify | `app/(dashboard)/settings/channels/[channelId]/page.tsx` — add SLA threshold input |
| Modify | `convex/channels.ts` — add `updateSlaThreshold` mutation |

---

## Task 1: Schema changes

**Files:** Modify `convex/schema.ts`

- [ ] **Step 1: Add two optional fields to `conversations`**

Find the `conversations` table definition. It currently ends with `createdAt: v.number()`. Add two optional fields:

```typescript
  conversations: defineTable({
    tenantId: v.string(),
    channelId: v.id("channels"),
    contactId: v.id("contacts"),
    assignedAgentId: v.optional(v.string()),
    status: v.union(
      v.literal("open"),
      v.literal("pending"),
      v.literal("resolved"),
    ),
    labels: v.array(v.string()),
    lastMessageAt: v.number(),
    lastMessagePreview: v.string(),
    unreadCount: v.number(),
    createdAt: v.number(),
    lastInboundAt: v.optional(v.number()),   // ← ADD: timestamp of latest inbound message
    slaBreachedAt: v.optional(v.number()),   // ← ADD: set when breach detected; cleared on agent reply
  })
```

Keep all existing `.index(...)` calls unchanged.

- [ ] **Step 2: Add optional `slaThresholdMinutes` to `channels`**

Find the `channels` table definition. Add one optional field:

```typescript
    slaThresholdMinutes: v.optional(v.number()),   // ← ADD: 0 or undefined = SLA disabled for this channel
```

Add it before `createdAt: v.number()` in the channels table. Keep all existing indexes unchanged.

- [ ] **Step 3: Extend `notifications.type` to include `"sla_breach"`**

Find the `notifications` table. Change:

```typescript
    type: v.literal("followup_due"),
```

to:

```typescript
    type: v.union(v.literal("followup_due"), v.literal("sla_breach")),
```

This is backward-compatible — existing docs with `type: "followup_due"` still match the union validator.

- [ ] **Step 4: Verify Convex accepts the schema**

Run: `npx convex dev` (keep running in background). Check console — expect "Schema updated" with no errors.

- [ ] **Step 5: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(sla): add lastInboundAt, slaBreachedAt to conversations; slaThresholdMinutes to channels; extend notifications type"
```

---

## Task 2: Create `convex/sla.ts`

**Files:** Create `convex/sla.ts`

This file has two exports: `checkBreaches` (internalMutation, called by cron) and `updateChannelSlaThreshold` (mutation, called by admin in channel settings).

- [ ] **Step 1: Create the file**

```typescript
// convex/sla.ts
// SLA (Service Level Agreement) breach detection.
//
// checkBreaches: scans open conversations every 5 minutes. If a conversation
// has an unanswered inbound message older than the channel's SLA threshold,
// it marks the conversation as breached and sends in-app notifications to
// channel supervisors.
//
// Breach is cleared automatically when an agent sends a reply
// (handled in messages.ts sendReply and inbox.ts sendMessage).

import { v, ConvexError } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";
import { getCallerIdentity, assertAdmin, type OrgRole } from "./lib/auth";
import { internal } from "./_generated/api";

// ── Check breaches (called by cron every 5 minutes) ──────────────────────────

export const checkBreaches = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get all channels that have SLA configured
    const allChannels = await ctx.db.query("channels").collect();
    const slaChannels = allChannels.filter(
      (c) => c.slaThresholdMinutes != null && (c.slaThresholdMinutes ?? 0) > 0,
    );

    for (const channel of slaChannels) {
      const thresholdMs = (channel.slaThresholdMinutes ?? 0) * 60 * 1000;

      // Get open (non-resolved) conversations in this channel
      const conversations = await ctx.db
        .query("conversations")
        .withIndex("by_tenant_channel", (q) =>
          q.eq("tenantId", channel.tenantId).eq("channelId", channel._id),
        )
        .filter((q) => q.neq(q.field("status"), "resolved"))
        .collect();

      for (const conv of conversations) {
        // Skip if already breached
        if (conv.slaBreachedAt !== undefined) continue;

        // Skip if no inbound message tracked yet
        if (!conv.lastInboundAt) continue;

        // Check if elapsed time since last inbound > threshold
        const elapsed = now - conv.lastInboundAt;
        if (elapsed <= thresholdMs) continue;

        // Mark as breached
        await ctx.db.patch(conv._id, { slaBreachedAt: now });

        // Notify channel supervisors
        const supervisors = await ctx.db
          .query("channelMembers")
          .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
          .filter((q) => q.eq(q.field("role"), "org:supervisor"))
          .collect();

        const contact = await ctx.db.get(conv.contactId);
        const contactName = contact?.customName ?? contact?.displayName ?? contact?.phone ?? "";

        for (const supervisor of supervisors) {
          await ctx.db.insert("notifications", {
            tenantId: channel.tenantId,
            userId: supervisor.userId,
            type: "sla_breach",
            referenceId: conv._id,
            contactName,
            message: `SLA breach: no reply to ${contactName} for over ${channel.slaThresholdMinutes} minutes`,
            read: false,
            createdAt: now,
          });
        }
      }
    }
  },
});

// ── Update SLA threshold for a channel (Admin only) ──────────────────────────

export const updateChannelSlaThreshold = mutation({
  args: {
    channelId: v.id("channels"),
    thresholdMinutes: v.optional(v.number()), // undefined or 0 = disabled
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);

    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    const threshold = args.thresholdMinutes;
    await ctx.db.patch(args.channelId, {
      slaThresholdMinutes: threshold && threshold > 0 ? threshold : undefined,
    });
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`. Fix any type errors. Common issue: `by_tenant_channel` index expects two equality conditions — make sure `channelId` in the filter is passed correctly.

- [ ] **Step 3: Commit**

```bash
git add convex/sla.ts
git commit -m "feat(sla): add SLA checkBreaches internalMutation and updateChannelSlaThreshold mutation"
```

---

## Task 3: Register SLA cron job

**Files:** Modify `convex/crons.ts`

- [ ] **Step 1: Add the SLA cron**

`convex/crons.ts` currently has two intervals. Add a third:

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "process-due-followups",
  { minutes: 30 },
  internal.followUps.processDue,
);

crons.interval(
  "check-automation-timeouts",
  { minutes: 1 },
  internal.automations.checkNoReplyTimeouts,
);

crons.interval(
  "check-sla-breaches",      // ← ADD THIS
  { minutes: 5 },
  internal.sla.checkBreaches,
);

export default crons;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`.

- [ ] **Step 3: Commit**

```bash
git add convex/crons.ts
git commit -m "feat(sla): register 5-minute SLA breach check cron"
```

---

## Task 4: Track `lastInboundAt` in `createInbound`

**Files:** Modify `convex/messages.ts`

Every inbound message should update `conversations.lastInboundAt`. This is used by `checkBreaches` to determine if an agent has replied since the last customer message.

- [ ] **Step 1: Update `createInbound` to set `lastInboundAt`**

In `convex/messages.ts`, find the `createInbound` internalMutation. Inside the handler, find where the existing conversation is patched for an existing conversation (the `else` branch around line 227):

```typescript
    } else {
      const patch: Record<string, unknown> = {
        lastMessageAt: args.timestamp,
        lastMessagePreview: args.content.slice(0, 100),
        unreadCount: (conversation.unreadCount ?? 0) + 1,
      };
      if (conversation.status === "resolved") {
        patch.status = "open";
      }
      await ctx.db.patch(conversation._id, patch);
    }
```

Change this to also set `lastInboundAt`:

```typescript
    } else {
      const patch: Record<string, unknown> = {
        lastMessageAt: args.timestamp,
        lastMessagePreview: args.content.slice(0, 100),
        unreadCount: (conversation.unreadCount ?? 0) + 1,
        lastInboundAt: args.timestamp,    // ← ADD: track last inbound for SLA
      };
      if (conversation.status === "resolved") {
        patch.status = "open";
        patch.slaBreachedAt = undefined;  // ← ADD: clear breach when conversation reopens
      }
      await ctx.db.patch(conversation._id, patch);
    }
```

Also, for new conversations (the `if (!conversation)` branch, line ~208), the `ctx.db.insert("conversations", {...})` call should include `lastInboundAt`:

```typescript
      const conversationId = await ctx.db.insert("conversations", {
        tenantId: args.tenantId,
        channelId: args.channelId,
        contactId,
        status: "open",
        labels: [],
        lastMessageAt: args.timestamp,
        lastMessagePreview: args.content.slice(0, 100),
        unreadCount: 1,
        createdAt: args.timestamp,
        lastInboundAt: args.timestamp,    // ← ADD
        ...(args.assignedAgentId ? { assignedAgentId: args.assignedAgentId } : {}),
      });
```

- [ ] **Step 2: Commit**

```bash
git add convex/messages.ts
git commit -m "feat(sla): track lastInboundAt in createInbound; clear slaBreachedAt on reopen"
```

---

## Task 5: Clear SLA breach when agent replies

**Files:** Modify `convex/messages.ts` and `convex/inbox.ts`

When an agent sends a reply, the SLA breach is considered resolved. Clear `slaBreachedAt`.

- [ ] **Step 1: Clear breach in `messages.ts` `sendReply`**

In `convex/messages.ts`, find `sendReply` mutation. After the line that inserts the message and BEFORE the `ctx.db.patch` for the conversation, add:

```typescript
    // Clear SLA breach (if any) when agent sends a reply
    if (conversation.slaBreachedAt !== undefined) {
      await ctx.db.patch(args.conversationId, { slaBreachedAt: undefined });
    }
```

If there's already a `ctx.db.patch` call that updates `lastMessageAt`, `lastMessagePreview`, `unreadCount`, combine them:

```typescript
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
      lastMessagePreview: args.content.slice(0, 80),
      unreadCount: 0,
      ...(conversation.slaBreachedAt !== undefined ? { slaBreachedAt: undefined } : {}),
    });
```

- [ ] **Step 2: Clear breach in `inbox.ts` `sendMessage`**

In `convex/inbox.ts`, find `sendMessage` mutation. This is the UI-facing send function (used by the inbox message input). After inserting the message, find the `if (!isNote)` block that patches the conversation. Update it to also clear the breach:

```typescript
    if (!isNote) {
      const conv = await ctx.db.get(args.conversationId);
      await ctx.db.patch(args.conversationId, {
        lastMessageAt: now,
        lastMessagePreview: args.content.slice(0, 80),
        unreadCount: 0,
        ...(conv?.slaBreachedAt !== undefined ? { slaBreachedAt: undefined } : {}),
      });
    }
```

Note: `inbox.sendMessage` only saves to DB (it doesn't call Meta API — that's done in `messages.sendReply`). Check which one the UI actually calls. If the UI calls `messages.sendReply`, only that one needs the fix. If the UI calls `inbox.sendMessage`, only that one needs the fix. To be safe, add it to both.

- [ ] **Step 3: Commit**

```bash
git add convex/messages.ts convex/inbox.ts
git commit -m "feat(sla): clear slaBreachedAt when agent sends a reply"
```

---

## Task 6: Return `slaBreachedAt` from `listConversations`

**Files:** Modify `convex/inbox.ts`

The conversation list needs to know which conversations are breached to show the badge.

- [ ] **Step 1: Add `slaBreachedAt` to the returned object shape**

In `convex/inbox.ts`, find the `listConversations` query. In the `rawResult` map block, add `slaBreachedAt` to the returned object:

```typescript
        return {
          id: conv._id as string,
          contactId: conv.contactId as string,
          contactName: name || undefined,
          contactPhone: contact?.phone,
          contactAvatarInitials: initials,
          contactStage: (contact?.stage ?? "lead") as string,
          assignedAgentId: conv.assignedAgentId,
          status: conv.status,
          labels: conv.labels,
          slaBreachedAt: conv.slaBreachedAt,      // ← ADD THIS
          lastMessagePreview: conv.lastMessagePreview,
          lastMessageAt: conv.lastMessageAt,
          unreadCount: conv.unreadCount,
        };
```

- [ ] **Step 2: Commit**

```bash
git add convex/inbox.ts
git commit -m "feat(sla): expose slaBreachedAt in listConversations return shape"
```

---

## Task 7: Show SLA breach badge in `ConversationListItem`

**Files:** Modify `components/inbox/conversation-list-item.tsx` and `components/inbox/conversation-list.tsx`

- [ ] **Step 1: Add `slaBreachedAt` to the `ConversationItem` interface**

In `components/inbox/conversation-list-item.tsx`, find the `ConversationItem` interface and add:

```typescript
  slaBreachedAt?: number;
```

- [ ] **Step 2: Import `AlertTriangle` icon**

At the top of the file, add `AlertTriangle` to the lucide-react import:

```typescript
import { MailOpen, MailCheck, AlertTriangle } from "lucide-react";
```

- [ ] **Step 3: Add the breach badge to JSX**

In the list item JSX, find where the contact name / preview text is rendered. Add the breach indicator near the timestamp or contact name. A good location is next to the last-message timestamp. Show it as a small amber warning icon with a tooltip-like title:

```tsx
          {conversation.slaBreachedAt && (
            <span
              title={t("SLA breach — no reply yet", "انتهاك SLA — لم يتم الرد بعد")}
              className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-semibold shrink-0"
            >
              <AlertTriangle className="size-2.5" />
              SLA
            </span>
          )}
```

Place this in the row where the status and assignment info is shown — specifically in the same flex row as the timestamp so it doesn't push other content down.

- [ ] **Step 4: Pass `slaBreachedAt` from `ConversationList` to each `ConversationListItem`**

In `components/inbox/conversation-list.tsx`, find the `.map()` block that renders `ConversationListItem`. Add `slaBreachedAt` to the passed conversation object:

```tsx
                  conversation={{
                    _id: conv.id,
                    contactName: conv.contactName,
                    contactPhone: conv.contactPhone,
                    contactAvatarInitials: conv.contactAvatarInitials,
                    assignedAgentId: conv.assignedAgentId,
                    lastMessagePreview: conv.lastMessagePreview,
                    lastMessageAt: conv.lastMessageAt,
                    status: conv.status,
                    unreadCount: conv.unreadCount,
                    labels: conv.labels,
                    slaBreachedAt: conv.slaBreachedAt,   // ← ADD THIS
                  }}
```

- [ ] **Step 5: Commit**

```bash
git add components/inbox/conversation-list-item.tsx components/inbox/conversation-list.tsx
git commit -m "feat(sla): show SLA breach badge in conversation list item"
```

---

## Task 8: SLA threshold config in channel settings

**Files:** Modify `app/(dashboard)/settings/channels/[channelId]/page.tsx` and `convex/channels.ts`

Admins can set the SLA threshold (in minutes) per channel. Setting it to 0 or leaving it empty disables SLA for that channel.

- [ ] **Step 1: Add `updateSlaThreshold` mutation to `convex/channels.ts`**

Open `convex/channels.ts` and add this mutation at the end of the file:

```typescript
export const updateSlaThreshold = mutation({
  args: {
    channelId: v.id("channels"),
    thresholdMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);

    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    await ctx.db.patch(args.channelId, {
      slaThresholdMinutes:
        args.thresholdMinutes && args.thresholdMinutes > 0
          ? args.thresholdMinutes
          : undefined,
    });
  },
});
```

Make sure `getCallerIdentity`, `assertAdmin`, and `ConvexError` are already imported in this file. If not, add the imports following the existing pattern in the file.

- [ ] **Step 2: Add the SLA threshold section to channel settings page**

In `app/(dashboard)/settings/channels/[channelId]/page.tsx`, add these imports at the top (after existing imports):

```typescript
import { useState } from "react";  // likely already imported
```

Add state for SLA configuration:

```typescript
  const updateSlaThreshold = useMutation(api.sla.updateChannelSlaThreshold);
  const [slaMinutes, setSlaMinutes] = useState<string>(
    channel?.slaThresholdMinutes ? String(channel.slaThresholdMinutes) : ""
  );
  const [savingSla, setSavingSla] = useState(false);
```

Note: `channel` is already loaded via `useQuery(api.channels.get, ...)`. When `channel` loads, sync `slaMinutes`. Add a `useEffect`:

```typescript
  useEffect(() => {
    if (channel) {
      setSlaMinutes(channel.slaThresholdMinutes ? String(channel.slaThresholdMinutes) : "");
    }
  }, [channel?.slaThresholdMinutes]);
```

Add the SLA section to the JSX, after the `AssignmentModeSelect` section and before the DepartmentMembers section:

```tsx
      {/* SLA threshold */}
      <div className="space-y-2 border-t pt-6">
        <h3 className="text-sm font-medium">{t("SLA Threshold", "حد SLA")}</h3>
        <p className="text-xs text-muted-foreground">
          {t(
            "Flag conversations with no agent reply after this many minutes. Leave empty to disable.",
            "علّم المحادثات التي لم يتم الرد عليها خلال هذه الدقائق. اتركه فارغاً للتعطيل.",
          )}
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={1440}
            placeholder={t("e.g. 10", "مثال: 10")}
            value={slaMinutes}
            onChange={(e) => setSlaMinutes(e.target.value)}
            className="w-32"
          />
          <span className="text-sm text-muted-foreground">
            {t("minutes", "دقيقة")}
          </span>
          <Button
            size="sm"
            disabled={savingSla}
            onClick={async () => {
              setSavingSla(true);
              try {
                const parsed = parseInt(slaMinutes);
                await updateSlaThreshold({
                  channelId,
                  thresholdMinutes: isNaN(parsed) || parsed <= 0 ? undefined : parsed,
                });
                toast.success(t("SLA threshold saved", "تم حفظ حد SLA"));
              } catch {
                toast.error(t("Failed to save SLA threshold", "فشل حفظ حد SLA"));
              } finally {
                setSavingSla(false);
              }
            }}
          >
            {savingSla ? t("Saving...", "جاري الحفظ...") : t("Save", "حفظ")}
          </Button>
          {slaMinutes && (
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                setSlaMinutes("");
                await updateSlaThreshold({ channelId, thresholdMinutes: undefined });
                toast.success(t("SLA disabled", "تم تعطيل SLA"));
              }}
            >
              {t("Disable", "تعطيل")}
            </Button>
          )}
        </div>
      </div>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`. Fix any errors. Common issue: `useEffect` may not be imported yet — add it to the React import.

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/settings/channels/[channelId]/page.tsx convex/channels.ts
git commit -m "feat(sla): add SLA threshold config to channel settings page"
```

---

## Task 9: Update notification bell for SLA breach type

**Files:** Modify `components/ui/notification-bell.tsx`

The notification bell currently renders all notifications the same way (contact name + message). SLA breach notifications should navigate to the inbox (not contacts).

- [ ] **Step 1: Update click handler to route by notification type**

In `components/ui/notification-bell.tsx`, find `handleNotificationClick`. Currently it always routes to `/contacts`. Change it to route to `/inbox` for SLA breach notifications:

```typescript
  function handleNotificationClick(notificationId: Id<"notifications">, type: string, referenceId: string) {
    try {
      markRead({ notificationId });
      if (type === "sla_breach") {
        router.push(`/inbox/${referenceId}`);
      } else {
        router.push(`/contacts`);
      }
    } catch {
      // Silently ignore errors
    }
  }
```

- [ ] **Step 2: Pass `type` and `referenceId` to the click handler in JSX**

Find the `<button>` inside the `notifications.map()`. Update the `onClick`:

```tsx
                onClick={() => handleNotificationClick(n._id, n.type, n.referenceId)}
```

- [ ] **Step 3: Add a visual distinction for SLA breach notifications**

In the notification item, show a different icon for SLA breaches. Add before the `<p>` with `n.contactName`:

```tsx
                {n.type === "sla_breach" && (
                  <span className="inline-flex items-center gap-1 text-amber-600 text-[10px] font-semibold mb-0.5">
                    <AlertTriangle className="size-3" />
                    {isRtl ? "انتهاك SLA" : "SLA Breach"}
                  </span>
                )}
```

Import `AlertTriangle` from `lucide-react` at the top of the file.

- [ ] **Step 4: Commit**

```bash
git add components/ui/notification-bell.tsx
git commit -m "feat(sla): handle SLA breach notification type in bell (route to inbox, amber icon)"
```

---

## Final Verification Checklist

- [ ] `npx convex dev` running — no schema errors in console
- [ ] Go to `/settings/channels` → click a channel → SLA threshold section appears
- [ ] Enter "2" in the SLA threshold field and save — success toast
- [ ] Open any conversation in the inbox and do NOT reply
- [ ] Wait 2 minutes (or temporarily trigger the cron manually via Convex dashboard: Run → `internal.sla.checkBreaches`)
- [ ] Refresh the inbox — breached conversation shows amber ⚠️ SLA badge in the list
- [ ] Send a reply in the breached conversation — the ⚠️ badge disappears
- [ ] Check notification bell — SLA breach notification appears for channel supervisors
- [ ] Clicking the SLA notification navigates to `/inbox/[conversationId]`
- [ ] Set threshold to empty/0 and save — SLA is disabled for that channel; no more breach badges
- [ ] RTL layout looks correct (amber badge appears on correct side)
