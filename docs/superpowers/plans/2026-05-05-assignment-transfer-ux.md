# Assignment & Transfer UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the confusing Claim/Assign/Transfer trio with a single unified تحويل button, show ownership at a glance in the conversation list, explain the locked reply box, and track every agent's effort in a `conversationParticipants` table for analytics.

**Architecture:** A new `TransferPicker` popover replaces `AssignAgentDialog`, `ClaimButton`, and the within-channel tab of `TransferDialog`. The forward-to-branch tab is extracted into its own `ForwardToBranchDialog`. A `conversationParticipants` Convex table records one row per agent per assignment stint; helpers in `convex/lib/participants.ts` are called from every assignment/claim/transfer mutation and from the message send path.

**Tech Stack:** Next.js 15 App Router, Convex mutations/queries, Clerk `useOrganization`, shadcn/ui Popover + Button + Textarea, Tailwind CSS, `sonner` toasts.

> **Before writing any Convex code:** Read `convex/_generated/ai/guidelines.md` — it contains rules that override training-data assumptions about Convex APIs.

---

## File Map

| Status | File | What changes |
|---|---|---|
| Modify | `convex/schema.ts` | Add `conversationParticipants` table |
| Create | `convex/lib/participants.ts` | Stint open/close/increment helpers |
| Modify | `convex/conversations.ts` | Wire stints + `agentJobTitle` in eventData for `assign`, `claim`, `transferWithinChannel` |
| Modify | `convex/messages.ts` | Wire stint open on first-reply auto-assign; increment messageCount on agent send |
| Modify | `convex/memberQueries.ts` | Add public `getJobTitlesByTenant` query |
| Create | `components/inbox/transfer-picker.tsx` | Unified تحويل popover (replaces 3 components) |
| Create | `components/inbox/forward-to-branch-dialog.tsx` | Extracted from transfer-dialog.tsx |
| Delete | `components/inbox/assign-agent-dialog.tsx` | Replaced by TransferPicker |
| Delete | `components/inbox/claim-button.tsx` | Replaced by TransferPicker + locked banner |
| Delete | `components/inbox/transfer-dialog.tsx` | Replaced by TransferPicker + ForwardToBranchDialog |
| Modify | `app/(dashboard)/inbox/page.tsx` | Replace old dialog imports with TransferPicker |
| Modify | `components/inbox/conversation-list.tsx` | Pass `assignedAgentJobTitle` to list items |
| Modify | `components/inbox/conversation-list-item.tsx` | Colored left border + job title row |
| Modify | `components/inbox/message-input.tsx` | Locked-state banner with "خذها أنت" button |
| Modify | `components/inbox/message-bubble.tsx` | Plain Arabic system event labels + `agentJobTitle` in type |

---

## Task 1: Schema — Add `conversationParticipants` table

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Add the table definition**

Open `convex/schema.ts`. Immediately before the closing `});` of the schema export, add:

```typescript
  conversationParticipants: defineTable({
    tenantId: v.string(),
    conversationId: v.id("conversations"),
    agentId: v.string(),
    departmentId: v.optional(v.id("departments")),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    messageCount: v.number(),
    firstReplyAt: v.optional(v.number()),
  })
    .index("by_tenant_agent", ["tenantId", "agentId"])
    .index("by_tenant_conversation", ["tenantId", "conversationId"]),
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 3: Push schema to Convex**

```bash
npx convex dev --once
```

Expected: `Schema updated.` (or similar success message — no error).

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(schema): add conversationParticipants table for multi-agent analytics"
```

---

## Task 2: Participant helpers

**Files:**
- Create: `convex/lib/participants.ts`

- [ ] **Step 1: Create the helpers file**

```typescript
// convex/lib/participants.ts
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function openParticipantStint(
  ctx: MutationCtx,
  {
    tenantId,
    conversationId,
    agentId,
    departmentId,
  }: {
    tenantId: string;
    conversationId: Id<"conversations">;
    agentId: string;
    departmentId?: Id<"departments">;
  },
) {
  await ctx.db.insert("conversationParticipants", {
    tenantId,
    conversationId,
    agentId,
    departmentId,
    startedAt: Date.now(),
    messageCount: 0,
  });
}

export async function closeActiveParticipantStint(
  ctx: MutationCtx,
  {
    tenantId,
    conversationId,
  }: { tenantId: string; conversationId: Id<"conversations"> },
) {
  const rows = await ctx.db
    .query("conversationParticipants")
    .withIndex("by_tenant_conversation", (q) =>
      q.eq("tenantId", tenantId).eq("conversationId", conversationId),
    )
    .collect();
  const active = rows.find((r) => r.endedAt === undefined);
  if (active) {
    await ctx.db.patch(active._id, { endedAt: Date.now() });
  }
}

export async function incrementParticipantMessageCount(
  ctx: MutationCtx,
  {
    tenantId,
    conversationId,
    agentId,
  }: { tenantId: string; conversationId: Id<"conversations">; agentId: string },
) {
  const rows = await ctx.db
    .query("conversationParticipants")
    .withIndex("by_tenant_conversation", (q) =>
      q.eq("tenantId", tenantId).eq("conversationId", conversationId),
    )
    .collect();
  const active = rows.find((r) => r.agentId === agentId && r.endedAt === undefined);
  if (!active) return;
  await ctx.db.patch(active._id, {
    messageCount: active.messageCount + 1,
    firstReplyAt: active.firstReplyAt ?? Date.now(),
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add convex/lib/participants.ts
git commit -m "feat(convex): add participant stint helpers for conversation analytics"
```

---

## Task 3: Wire participant stints + agentJobTitle into conversations.ts

**Files:**
- Modify: `convex/conversations.ts`

This task touches three mutations: `assign`, `claim`, and `transferWithinChannel`. Make each change independently and run `tsc` at the end.

- [ ] **Step 1: Add imports at the top of `convex/conversations.ts`**

Find the existing imports block and add:

```typescript
import {
  closeActiveParticipantStint,
  incrementParticipantMessageCount,
  openParticipantStint,
} from "./lib/participants";
```

- [ ] **Step 2: Update the `assign` mutation args**

Find the `assign` mutation's `args` object. It currently has:
```typescript
args: {
  conversationId: v.id("conversations"),
  agentId: v.optional(v.string()),
  agentName: v.optional(v.string()),
},
```

Change to:
```typescript
args: {
  conversationId: v.id("conversations"),
  agentId: v.optional(v.string()),
  agentName: v.optional(v.string()),
  agentJobTitle: v.optional(v.string()),
},
```

- [ ] **Step 3: Wire stints and jobTitle into the `assign` handler**

Inside the `assign` handler, find the line that patches the conversation (it sets `assignedAgentId`). **Before** that patch, add:

```typescript
    // Close the previous agent's stint if there was one
    if (conversation.assignedAgentId) {
      await closeActiveParticipantStint(ctx, { tenantId, conversationId: args.conversationId });
    }
```

**After** the `ctx.db.patch(...)` call that sets `assignedAgentId`, add:

```typescript
    // Open a new stint for the newly assigned agent
    if (args.agentId) {
      await openParticipantStint(ctx, {
        tenantId,
        conversationId: args.conversationId,
        agentId: args.agentId,
        departmentId: conversation.departmentId,
      });
    }
```

Then find the `ctx.db.insert("messages", { ... eventData: { actorName: ..., agentName: ... } ... })` call inside `assign` and add `agentJobTitle: args.agentJobTitle` to the `eventData` object:

```typescript
      eventData: {
        actorName: assignActorName,
        agentName: args.agentName ?? args.agentId,
        agentJobTitle: args.agentJobTitle,
      },
```

- [ ] **Step 4: Wire stints and jobTitle into the `claim` handler**

Inside `claim`, find the `ctx.db.patch(...)` call that sets `assignedAgentId: callerId`. **After** it, add:

```typescript
    await openParticipantStint(ctx, {
      tenantId,
      conversationId: args.conversationId,
      agentId: callerId,
      departmentId: conversation.departmentId,
    });
```

Then look up the caller's job title from `memberProfiles` before the `ctx.db.insert("messages", ...)` call:

```typescript
    const callerProfile = await ctx.db
      .query("memberProfiles")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", callerId),
      )
      .first();
```

Then add `agentJobTitle: callerProfile?.jobTitle` to the `eventData` in the system event insert:

```typescript
      eventData: {
        actorName: callerName,
        agentName: callerName,
        agentJobTitle: callerProfile?.jobTitle,
      },
```

- [ ] **Step 5: Wire stints and jobTitle into `transferWithinChannel`**

Inside `transferWithinChannel`, find the `ctx.db.patch(...)` call that sets `departmentId`. **Before** it, add:

```typescript
    // Close the previous agent's stint
    if (conversation.assignedAgentId) {
      await closeActiveParticipantStint(ctx, { tenantId, conversationId: args.conversationId });
    }
```

**After** the patch, add:

```typescript
    // Open a new stint if a specific agent was assigned
    if (args.assignAgentId) {
      await openParticipantStint(ctx, {
        tenantId,
        conversationId: args.conversationId,
        agentId: args.assignAgentId,
        departmentId: args.targetDepartmentId,
      });
    }
```

Then find the existing block that resolves `agentName` for the event (it queries `departmentMembers`). After that resolution, add a profile lookup for job title:

```typescript
    let agentJobTitle: string | undefined;
    if (args.assignAgentId) {
      const agentProfile = await ctx.db
        .query("memberProfiles")
        .withIndex("by_tenant_user", (q) =>
          q.eq("tenantId", tenantId).eq("userId", args.assignAgentId!),
        )
        .first();
      agentJobTitle = agentProfile?.jobTitle ?? undefined;
    }
```

Then add `agentJobTitle` to the `eventData` of the system event insert:

```typescript
      eventData: {
        actorName,
        fromDept: fromName,
        toDept: toName,
        agentName,
        agentJobTitle,
      },
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add convex/conversations.ts
git commit -m "feat(convex): wire participant stints and agentJobTitle into assign/claim/transfer mutations"
```

---

## Task 4: Wire participant stints into messages.ts (send path)

**Files:**
- Modify: `convex/messages.ts`

The `sendMessage` mutation (the one that handles regular outbound text) has two responsibilities here:
1. Auto-assign on first reply → open a participant stint
2. Every agent message sent → increment messageCount

- [ ] **Step 1: Add imports at the top of `convex/messages.ts`**

```typescript
import {
  incrementParticipantMessageCount,
  openParticipantStint,
} from "./lib/participants";
```

- [ ] **Step 2: Wire first-reply auto-assign into a participant stint**

Inside `sendMessage`, find this existing block:

```typescript
    let assignedAgentId = conversation.assignedAgentId;
    if (
      !assignedAgentId &&
      channel.assignmentMode === "first_reply"
    ) {
      assignedAgentId = callerId;
    }

    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
      lastMessagePreview: args.content.slice(0, 100),
      assignedAgentId,
      ...
    });
```

After the `ctx.db.patch(...)` call, add:

```typescript
    // Open a participant stint when first-reply auto-assign triggers
    if (!conversation.assignedAgentId && assignedAgentId === callerId) {
      await openParticipantStint(ctx, {
        tenantId,
        conversationId: args.conversationId,
        agentId: callerId,
        departmentId: conversation.departmentId,
      });
    }
```

- [ ] **Step 3: Increment messageCount after every outbound agent message**

Inside `sendMessage`, find the `await ctx.db.insert("messages", { ... })` call that inserts the outbound message (the non-internal one, `isInternalNote: false`). Immediately after it, add:

```typescript
    await incrementParticipantMessageCount(ctx, {
      tenantId,
      conversationId: args.conversationId,
      agentId: callerId,
    });
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add convex/messages.ts
git commit -m "feat(convex): track participant message count and first-reply stint in sendMessage"
```

---

## Task 5: Add `getJobTitlesByTenant` query to memberQueries.ts

**Files:**
- Modify: `convex/memberQueries.ts`

The frontend `TransferPicker` and `ConversationList` need a map of `userId → jobTitle` for the current tenant.

- [ ] **Step 1: Add the query**

Open `convex/memberQueries.ts`. Find the existing `getMemberProfile` export and add this new public query **after** it:

```typescript
export const getJobTitlesByTenant = query({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    const profiles = await ctx.db
      .query("memberProfiles")
      .withIndex("by_tenant_user", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    const map: Record<string, string | undefined> = {};
    for (const p of profiles) {
      map[p.userId] = p.jobTitle ?? undefined;
    }
    return map;
  },
});
```

Make sure `query` is in the imports at the top of the file (it should already be there).

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add convex/memberQueries.ts
git commit -m "feat(convex): add getJobTitlesByTenant public query"
```

---

## Task 6: Build `TransferPicker` component

**Files:**
- Create: `components/inbox/transfer-picker.tsx`

This component replaces `AssignAgentDialog`, `ClaimButton`, and the within-branch tab of `TransferDialog`.

- [ ] **Step 1: Create the component**

```typescript
// components/inbox/transfer-picker.tsx
"use client";

import { useState } from "react";
import { useOrganization, useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";
import { ForwardToBranchDialog } from "./forward-to-branch-dialog";

interface TransferPickerProps {
  conversationId: Id<"conversations">;
  channelId: Id<"channels">;
  currentAssigneeId?: string;
  currentDepartmentId?: Id<"departments">;
}

export function TransferPicker({
  conversationId,
  channelId,
  currentAssigneeId,
  currentDepartmentId,
}: TransferPickerProps) {
  const t = useT();
  const { user } = useUser();
  const { memberships, organization } = useOrganization({ memberships: true });
  const { isAuthenticated } = useConvexAuth();

  const [open, setOpen] = useState(false);
  const [pendingDeptId, setPendingDeptId] = useState<Id<"departments"> | null>(null);
  const [note, setNote] = useState("");
  const [forwardOpen, setForwardOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const assign = useMutation(api.conversations.assign);
  const claim = useMutation(api.conversations.claim);
  const transfer = useMutation(api.conversations.transferWithinChannel);

  const tenantId = organization?.id;
  const jobTitles = useQuery(
    api.memberQueries.getJobTitlesByTenant,
    isAuthenticated && tenantId ? { tenantId } : "skip",
  );
  const departments = useQuery(
    api.departments.listForTransfer,
    isAuthenticated
      ? { channelId, excludeDepartmentId: currentDepartmentId }
      : "skip",
  );

  const handleClose = (next: boolean) => {
    setOpen(next);
    if (!next) setPendingDeptId(null);
  };

  const handleTakeIt = async () => {
    try {
      await claim({ conversationId });
      setOpen(false);
      toast.success(t("Conversation claimed", "تم استلام المحادثة"));
    } catch {
      toast.error(t("Failed", "فشل"));
    }
  };

  const handleAssignToAgent = async (agentId: string, agentName: string) => {
    const agentJobTitle = jobTitles?.[agentId];
    try {
      await assign({ conversationId, agentId, agentName, agentJobTitle });
      setOpen(false);
      toast.success(t("Conversation assigned", "تم التعيين"));
    } catch {
      toast.error(t("Failed", "فشل"));
    }
  };

  const handleConfirmDeptTransfer = async () => {
    if (!pendingDeptId) return;
    setSubmitting(true);
    try {
      await transfer({
        conversationId,
        targetDepartmentId: pendingDeptId,
        internalNote: note.trim() || undefined,
      });
      setOpen(false);
      setPendingDeptId(null);
      toast.success(t("Conversation transferred", "تم التحويل"));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("AGENT_NOT_IN_DEPARTMENT")) {
        toast.error(t("Agent not in department", "العضو لم يعد ضمن هذه الإدارة"));
      } else {
        toast.error(t("Transfer failed", "فشل التحويل"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const members = memberships?.data ?? [];

  return (
    <>
      <Popover open={open} onOpenChange={handleClose}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline">
            {t("Transfer", "تحويل")} ↗
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-0 max-h-[420px] overflow-y-auto">
          {pendingDeptId ? (
            <div className="p-3 space-y-3">
              <p className="text-sm font-medium">
                {t("Internal note (optional)", "ملاحظة داخلية (اختياري)")}
              </p>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder={t(
                  "e.g. Answer and transfer back to me",
                  "مثال: أجب وأعد التحويل لي",
                )}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPendingDeptId(null)}
                  disabled={submitting}
                >
                  {t("Back", "رجوع")}
                </Button>
                <Button size="sm" disabled={submitting} onClick={handleConfirmDeptTransfer}>
                  {submitting && <Loader2 className="size-3 animate-spin me-1" />}
                  {t("Transfer", "تحويل")}
                </Button>
              </div>
            </div>
          ) : (
            <div>
              {/* ── Team members ── */}
              <div className="px-3 pt-3 pb-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                {t("Team members", "أعضاء الفريق")}
              </div>

              {/* Take it yourself */}
              <button
                className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-accent text-start"
                onClick={handleTakeIt}
              >
                <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-semibold shrink-0">
                  {(user?.firstName?.[0] ?? user?.emailAddresses?.[0]?.emailAddress?.[0] ?? "?").toUpperCase()}
                </div>
                <span className="text-sm font-medium">{t("Take it yourself", "خذها أنت")}</span>
              </button>

              {/* Other members */}
              {members.map((m) => {
                const uid = m.publicUserData?.userId ?? "";
                if (uid === user?.id) return null;
                const name =
                  [m.publicUserData?.firstName, m.publicUserData?.lastName]
                    .filter(Boolean)
                    .join(" ") ||
                  m.publicUserData?.identifier ||
                  uid;
                const jobTitle = jobTitles?.[uid];
                const isCurrent = uid === currentAssigneeId;
                return (
                  <button
                    key={uid}
                    className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-accent text-start"
                    onClick={() => handleAssignToAgent(uid, name)}
                  >
                    <div className="size-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold shrink-0">
                      {name[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate flex items-center gap-1">
                        {name}
                        {isCurrent && (
                          <span className="text-[10px] text-muted-foreground">✓</span>
                        )}
                      </div>
                      {jobTitle && (
                        <div className="text-[10px] text-muted-foreground truncate">
                          {jobTitle}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* ── Departments ── */}
              {departments && departments.length > 0 && (
                <>
                  <div className="px-3 pt-3 pb-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wide border-t mt-1">
                    {t("Departments", "الأقسام")}
                  </div>
                  {departments.map((d) => (
                    <button
                      key={d._id}
                      className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-accent text-start"
                      onClick={() => setPendingDeptId(d._id as Id<"departments">)}
                    >
                      <span className="text-base leading-none">🏢</span>
                      <span className="text-sm truncate">{d.name}</span>
                    </button>
                  ))}
                </>
              )}

              {/* ── Forward to another number (destructive) ── */}
              <div className="border-t mt-1 pb-1">
                <button
                  className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-destructive/10 text-start"
                  onClick={() => {
                    setOpen(false);
                    setForwardOpen(true);
                  }}
                >
                  <span className="text-base leading-none">📲</span>
                  <span className="flex-1 text-sm text-destructive">
                    {t("Send to another number", "إرسال لرقم آخر")}
                  </span>
                  <span className="text-[10px] bg-destructive/15 text-destructive px-1.5 py-0.5 rounded shrink-0">
                    {t("closes", "يُغلق المحادثة")}
                  </span>
                </button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <ForwardToBranchDialog
        conversationId={conversationId as unknown as string}
        channelId={channelId as unknown as string}
        open={forwardOpen}
        onOpenChange={setForwardOpen}
      />
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output. (ForwardToBranchDialog doesn't exist yet — if tsc errors on the import, add `// @ts-expect-error` temporarily and remove it in Task 7.)

- [ ] **Step 3: Commit**

```bash
git add components/inbox/transfer-picker.tsx
git commit -m "feat(inbox): add unified TransferPicker component"
```

---

## Task 7: Extract `ForwardToBranchDialog`

**Files:**
- Create: `components/inbox/forward-to-branch-dialog.tsx`

Extract the `ForwardToBranchPanel` from `transfer-dialog.tsx` into a standalone dialog component.

- [ ] **Step 1: Create the dialog**

```typescript
// components/inbox/forward-to-branch-dialog.tsx
"use client";

import { useState } from "react";
import { useAction, useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";

interface ForwardToBranchDialogProps {
  conversationId: string;
  channelId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ForwardToBranchDialog({
  conversationId,
  channelId,
  open,
  onOpenChange,
}: ForwardToBranchDialogProps) {
  const t = useT();
  const { isAuthenticated } = useConvexAuth();
  const [targetChannelId, setTargetChannelId] = useState("");
  const [targetDeptId, setTargetDeptId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const channels = useQuery(
    api.channels.listOtherChannelsForForward,
    isAuthenticated ? { excludeChannelId: channelId as Id<"channels"> } : "skip",
  );
  const departments = useQuery(
    api.departments.listForTransfer,
    isAuthenticated && targetChannelId
      ? { channelId: targetChannelId as Id<"channels">, excludeDepartmentId: undefined }
      : "skip",
  );
  const preview = useQuery(
    api.conversations.previewForwardMessage,
    isAuthenticated && targetChannelId
      ? {
          conversationId: conversationId as Id<"conversations">,
          targetChannelId: targetChannelId as Id<"channels">,
        }
      : "skip",
  );

  const forward = useAction(api.conversations.forwardToBranch);

  const handleSubmit = async () => {
    if (!targetChannelId) return;
    setSubmitting(true);
    try {
      await forward({
        conversationId: conversationId as Id<"conversations">,
        targetChannelId: targetChannelId as Id<"channels">,
        targetDepartmentId: (targetDeptId || undefined) as Id<"departments"> | undefined,
      });
      toast.success(t("Conversation forwarded", "تم تحويل المحادثة"));
      onOpenChange(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("OUTSIDE_24H_WINDOW")) {
        toast.error(
          t(
            "Outside the 24h window — ask the customer to message first",
            "خارج نافذة 24 ساعة — اطلب من العميل المراسلة أولاً",
          ),
        );
      } else if (msg.includes("TARGET_CHANNEL_INACTIVE")) {
        toast.error(
          t("That branch isn't connected right now", "هذا الفرع غير متصل حاليا"),
        );
      } else if (msg.includes("CONVERSATION_NOT_OPEN")) {
        toast.error(t("Conversation is not open", "المحادثة ليست مفتوحة"));
      } else {
        toast.error(t("Forward failed", "فشل التحويل"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Send to another number", "إرسال لرقم آخر")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <label className="text-sm font-medium">{t("Target branch", "الفرع المستهدف")}</label>
            {channels === undefined ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : channels.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("No other branches", "لا توجد فروع أخرى")}
              </p>
            ) : (
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={targetChannelId}
                onChange={(e) => {
                  setTargetChannelId(e.target.value);
                  setTargetDeptId("");
                }}
              >
                <option value="">{t("Select…", "اختر…")}</option>
                {channels.map((c: { _id: string; displayName?: string; displayPhone?: string }) => (
                  <option key={c._id} value={c._id}>
                    {c.displayName} {c.displayPhone ?? ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              {t("Target department (optional)", "إدارة مستهدفة (اختياري)")}
            </label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
              value={targetDeptId}
              onChange={(e) => setTargetDeptId(e.target.value)}
              disabled={!targetChannelId || departments === undefined}
            >
              <option value="">{t("— none —", "— بدون —")}</option>
              {(departments ?? []).map((d: { _id: string; name: string }) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {preview && (
            <div className="space-y-1">
              <label className="text-sm font-medium">
                {t(
                  "Message that will be sent to the customer",
                  "الرسالة التي سيتم إرسالها للعميل",
                )}
              </label>
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                {preview}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t("Cancel", "إلغاء")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={submitting || !targetChannelId}
            >
              {submitting && <Loader2 className="size-4 animate-spin me-2" />}
              {t("Forward and close", "أرسل وأغلق المحادثة")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/inbox/forward-to-branch-dialog.tsx
git commit -m "feat(inbox): extract ForwardToBranchDialog from transfer-dialog"
```

---

## Task 8: Wire TransferPicker into inbox page, remove old components

**Files:**
- Modify: `app/(dashboard)/inbox/page.tsx`
- Delete: `components/inbox/assign-agent-dialog.tsx`
- Delete: `components/inbox/claim-button.tsx`
- Delete: `components/inbox/transfer-dialog.tsx`

- [ ] **Step 1: Update inbox/page.tsx imports**

Remove these import lines:
```typescript
import { AssignAgentDialog } from "@/components/inbox/assign-agent-dialog";
import { TransferDialog } from "@/components/inbox/transfer-dialog";
```

Add:
```typescript
import { TransferPicker } from "@/components/inbox/transfer-picker";
```

Also remove the `ClaimButton` import if it is imported there:
```typescript
// remove: import { ClaimButton } from "@/components/inbox/claim-button";
```

- [ ] **Step 2: Replace the Controls block in inbox/page.tsx**

Find this block (around line 194–212):
```tsx
{/* Controls */}
{selectedConversation?.status !== "forwarded" && (
  <>
    {selectedConversation?.channelId && (
      <TransferDialog
        conversationId={selectedId}
        channelId={selectedConversation.channelId}
        currentDepartmentId={selectedConversation.departmentId}
      />
    )}
    <StatusSelector conversationId={selectedId} />
    <AssignAgentDialog
      conversationId={selectedId}
      currentAssigneeId={selectedConversation?.assignedAgentId ?? undefined}
    />
  </>
)}
```

Replace with:
```tsx
{/* Controls */}
{selectedConversation?.status !== "forwarded" && selectedConversation?.channelId && (
  <>
    <StatusSelector conversationId={selectedId} />
    <TransferPicker
      conversationId={selectedId as Id<"conversations">}
      channelId={selectedConversation.channelId as Id<"channels">}
      currentAssigneeId={selectedConversation.assignedAgentId ?? undefined}
      currentDepartmentId={selectedConversation.departmentId as Id<"departments"> | undefined}
    />
  </>
)}
```

- [ ] **Step 3: Remove the ClaimButton render**

Find the `<ClaimButton ... />` render in `inbox/page.tsx` (around line 183–192) and delete it entirely.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output (there may be errors about the deleted files — proceed to Step 5).

- [ ] **Step 5: Delete the replaced components**

```bash
rm components/inbox/assign-agent-dialog.tsx
rm components/inbox/claim-button.tsx
rm components/inbox/transfer-dialog.tsx
```

- [ ] **Step 6: Verify TypeScript compiles clean after deletions**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add -u
git add app/(dashboard)/inbox/page.tsx components/inbox/transfer-picker.tsx
git commit -m "feat(inbox): replace Claim/Assign/Transfer with unified TransferPicker"
```

---

## Task 9: Conversation list — colored border + job title

**Files:**
- Modify: `components/inbox/conversation-list.tsx`
- Modify: `components/inbox/conversation-list-item.tsx`

- [ ] **Step 1: Add `assignedAgentJobTitle` to `ConversationItem` interface**

Open `components/inbox/conversation-list-item.tsx`. Find the `ConversationItem` interface and add:

```typescript
  assignedAgentJobTitle?: string;
```

- [ ] **Step 2: Add colored left border to the list item**

Inside `ConversationListItem`, find the outermost container `<div>` or `<button>` that wraps each item. It currently has some className. Add a dynamic border-start class based on assignment state.

First, add `useUser` import at the top:
```typescript
import { useUser } from "@clerk/nextjs";
```

Then inside the component:
```typescript
const { user } = useUser();
const borderClass =
  !conversation.assignedAgentId
    ? "border-s-2 border-s-amber-500"
    : conversation.assignedAgentId === user?.id
      ? "border-s-2 border-s-violet-500"
      : "border-s-2 border-s-green-600";
```

Add `borderClass` to the item container's className.

- [ ] **Step 3: Replace the agent name display with name + job title**

Find this existing block (around line 274–278):
```tsx
{conversation.assignedAgentName && (
  <span className="text-[10px] text-muted-foreground truncate">
    {conversation.assignedAgentName}
  </span>
)}
```

Replace with:
```tsx
{conversation.assignedAgentId ? (
  <span className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
    {conversation.assignedAgentName && (
      <span className="truncate">{conversation.assignedAgentName}</span>
    )}
    {conversation.assignedAgentJobTitle && (
      <>
        <span className="opacity-40">·</span>
        <span className="truncate">{conversation.assignedAgentJobTitle}</span>
      </>
    )}
  </span>
) : conversation.departmentName ? (
  <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 truncate">
    <span>⚠</span>
    <span>{conversation.departmentName}</span>
  </span>
) : null}
```

- [ ] **Step 4: Pass `assignedAgentJobTitle` from conversation-list.tsx**

Open `components/inbox/conversation-list.tsx`. Find where `useQuery(api.memberQueries.getJobTitlesByTenant, ...)` should be added. Add it next to the existing `memberNames` map:

```typescript
  const { organization } = useOrganization();
  const tenantId = organization?.id;
  const jobTitles = useQuery(
    api.memberQueries.getJobTitlesByTenant,
    isAuthenticated && tenantId ? { tenantId } : "skip",
  );
```

Then in the `<ConversationListItem>` render block, add the new prop after `assignedAgentName`:
```tsx
assignedAgentJobTitle: conv.assignedAgentId
  ? (jobTitles?.[conv.assignedAgentId] ?? undefined)
  : undefined,
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add components/inbox/conversation-list-item.tsx components/inbox/conversation-list.tsx
git commit -m "feat(inbox): show ownership with colored border and job title in conversation list"
```

---

## Task 10: Locked reply box — explanation banner with claim button

**Files:**
- Modify: `components/inbox/message-input.tsx`

- [ ] **Step 1: Add useMutation import and claim state**

Open `components/inbox/message-input.tsx`. Add `useMutation` to the convex/react import if not already present. Add the following inside the component function body, near the top:

```typescript
  const claimMutation = useMutation(api.conversations.claim);
  const [claiming, setClaiming] = useState(false);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await claimMutation({ conversationId: args.conversationId as Id<"conversations"> });
    } catch {
      // claim failure is non-critical — the isLocked prop will update reactively
    } finally {
      setClaiming(false);
    }
  };
```

(Add the necessary `Id` import from `@/convex/_generated/dataModel` if not already present.)

- [ ] **Step 2: Replace the locked-state return**

Find the existing locked-state early return (around line 288–294):
```typescript
  if (isLocked && !isPrivileged) {
    return (
      <div className="border-t bg-muted/40 px-4 py-3 ...">
        {t("Claim this conversation first to reply", "استلم المحادثة أولاً للرد")}
      </div>
    );
  }
```

Replace the inner content with:
```tsx
  if (isLocked && !isPrivileged) {
    return (
      <div className="border-t px-4 py-2.5 flex items-center justify-between gap-3 bg-amber-500/10 border-amber-500/30">
        <span className="text-sm text-amber-700 dark:text-amber-400">
          ⚠️{" "}
          {t(
            "Conversation unassigned — you cannot reply",
            "المحادثة غير معينة — لا يمكن الرد",
          )}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={handleClaim}
          disabled={claiming}
        >
          {claiming && <Loader2 className="size-3 animate-spin me-1" />}
          {t("Take it", "خذها أنت")}
        </Button>
      </div>
    );
  }
```

Add `Loader2` to the lucide-react import if not already there. Add `Button` import from `@/components/ui/button` if not already there.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add components/inbox/message-input.tsx
git commit -m "feat(inbox): locked reply box now explains why and offers one-tap claim"
```

---

## Task 11: Update system event labels in message-bubble.tsx

**Files:**
- Modify: `components/inbox/message-bubble.tsx`

- [ ] **Step 1: Add `agentJobTitle` to the `eventData` type**

Find the `Message` type definition. The `eventData` field currently is:
```typescript
  eventData?: {
    actorName?: string;
    fromDept?: string;
    toDept?: string;
    agentName?: string;
    csatScore?: number;
    targetBranchName?: string;
    targetDeptName?: string;
  };
```

Add `agentJobTitle`:
```typescript
  eventData?: {
    actorName?: string;
    fromDept?: string;
    toDept?: string;
    agentName?: string;
    agentJobTitle?: string;
    csatScore?: number;
    targetBranchName?: string;
    targetDeptName?: string;
  };
```

- [ ] **Step 2: Update the Arabic label block**

Find the Arabic `if (isAr)` block (around line 238–257). Replace the `agent_assigned`, `agent_unassigned`, `transfer_within_channel`, and `forward_to_branch` cases with:

```typescript
    if (eventType === "transfer_department")
      label = `${actor} نقل إلى ${toDept}`;
    else if (eventType === "agent_assigned") {
      const titleSuffix = eventData?.agentJobTitle ? ` · ${eventData.agentJobTitle}` : "";
      label = `تم تعيين المحادثة لـ ${agent}${titleSuffix}`;
    } else if (eventType === "agent_unassigned")
      label = "تم إلغاء تعيين المحادثة";
    else if (eventType === "resolved")
      label = `${actor} أغلق المحادثة`;
    else if (eventType === "reopened")
      label = "أُعيد فتح المحادثة";
    else if (eventType === "csat_received")
      label = `${stars} العميل قيّم ${csatScore}/5`;
    else if (eventType === "transfer_within_channel")
      label = `تم تحويل المحادثة إلى ${toDept}`;
    else if (eventType === "forward_to_branch")
      label = "تم إرسال المحادثة إلى رقم آخر — تم إغلاقها.";
```

- [ ] **Step 3: Update the English label block**

Find the English `else` block (around line 258–277). Replace the same four event types:

```typescript
    if (eventType === "transfer_department")
      label = `${actor} transferred to ${toDept}`;
    else if (eventType === "agent_assigned") {
      const titleSuffix = eventData?.agentJobTitle ? ` · ${eventData.agentJobTitle}` : "";
      label = `Conversation assigned to ${agent}${titleSuffix}`;
    } else if (eventType === "agent_unassigned")
      label = "Conversation unassigned";
    else if (eventType === "resolved")
      label = `${actor} resolved this`;
    else if (eventType === "reopened")
      label = "Conversation reopened";
    else if (eventType === "csat_received")
      label = `${stars} Customer rated ${csatScore}/5`;
    else if (eventType === "transfer_within_channel")
      label = `Conversation transferred to ${toDept}`;
    else if (eventType === "forward_to_branch")
      label = "Conversation forwarded to another number — closed.";
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add components/inbox/message-bubble.tsx
git commit -m "feat(inbox): plain Arabic/English system event labels with job title suffix"
```

---

## Self-Review Checklist

- [x] **Spec § Unified تحويل button** → Task 6 (TransferPicker) + Task 8 (wiring)
- [x] **Spec § Claim replaced by "خذها أنت"** → Task 6 (TransferPicker) + Task 8 (claim-button.tsx deleted) + Task 10 (locked banner)
- [x] **Spec § Departments + agents in one picker** → Task 6 (TransferPicker sections)
- [x] **Spec § إرسال لرقم آخر destructive** → Task 7 (ForwardToBranchDialog) + Task 6 (red section in picker)
- [x] **Spec § Conversation list ownership border + job title** → Task 9
- [x] **Spec § Locked reply box banner** → Task 10
- [x] **Spec § System events plain Arabic** → Task 11
- [x] **Spec § conversationParticipants table** → Task 1
- [x] **Spec § Participant stints on assign/claim/transfer** → Tasks 2, 3
- [x] **Spec § Increment messageCount on send** → Task 4
- [x] **Spec § getJobTitlesByTenant query** → Task 5
- [x] **Round-trip transfer** → Works natively: sender's conversation disappears (Task 8), receiver picks sender by name in TransferPicker → notification, full history preserved (existing notification logic unchanged)
- [x] **No placeholders** — all code blocks are complete
- [x] **Type consistency** — `openParticipantStint`/`closeActiveParticipantStint`/`incrementParticipantMessageCount` defined in Task 2 and used exactly in Tasks 3, 4
