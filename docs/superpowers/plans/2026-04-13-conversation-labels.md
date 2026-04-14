# Conversation Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow agents to tag conversations with colored labels (e.g. شكوى, مبيعات, VIP) that are filterable in the inbox and tracked in analytics.

**Architecture:** Tenant-defined labels stored in a new `conversationLabels` table. Label names (strings) are stored directly in `conversations.labels[]` — the schema field already exists. A single `api.labels.list` query loads all label metadata (name + color) once per inbox session; the `listConversations` query is updated to return the raw `labels` array. A `LabelPicker` popover in the conversation thread header lets agents add/remove labels. An admin settings page manages available labels.

**Tech Stack:** Convex (backend), Next.js App Router, shadcn/ui, Tailwind CSS v4, `useT()` + `useLocale()` for i18n (RTL-first).

> **IMPORTANT before writing any Convex code:** Read `convex/_generated/ai/guidelines.md` for required patterns. Key rules: always use `getCallerIdentity(ctx)` from `convex/lib/auth.ts` for auth; always filter by `tenantId`; use `internalMutation`/`internalQuery` for private functions; always include arg validators.

---

## File Map

| Action | File |
|---|---|
| Create | `convex/labels.ts` |
| Create | `components/inbox/label-picker.tsx` |
| Create | `components/settings/labels-settings.tsx` |
| Create | `app/(dashboard)/settings/labels/page.tsx` |
| Modify | `convex/schema.ts` — add `conversationLabels` table |
| Modify | `convex/inbox.ts` — return `labels` from `listConversations` |
| Modify | `components/inbox/conversation-list-item.tsx` — show label color dots |
| Modify | `components/inbox/conversation-list.tsx` — add label filter UI |
| Modify | `lib/shell/nav-config.ts` — add Labels link under Settings |

---

## Task 1: Add `conversationLabels` table to schema

**Files:** Modify `convex/schema.ts`

- [ ] **Step 1: Add the table definition**

In `convex/schema.ts`, after the `ruleFireLog` table definition (around line 363) and before the `channelMembers` table, add:

```typescript
  conversationLabels: defineTable({
    tenantId: v.string(),
    name: v.string(),      // display name, used as the identifier stored in conversations.labels[]
    color: v.string(),     // one of: "red" | "green" | "blue" | "yellow" | "purple" | "orange" | "pink" | "gray"
    emoji: v.optional(v.string()),
    createdBy: v.string(), // Clerk user ID
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"]),
```

- [ ] **Step 2: Verify Convex accepts the schema**

Run: `npx convex dev` (keep running in background). Check the terminal — it should say "Schema updated" or similar with no errors. If there's a TypeScript error in schema.ts, fix it before continuing.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(labels): add conversationLabels table to schema"
```

---

## Task 2: Create `convex/labels.ts` — Convex backend

**Files:** Create `convex/labels.ts`

- [ ] **Step 1: Create the file with full content**

```typescript
// convex/labels.ts
// CRUD for tenant-defined conversation labels.
// Labels are stored by name (string) in conversations.labels[].
// This table provides name → color/emoji metadata.

import { v, ConvexError } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCallerIdentity, assertAdminOrSupervisor, assertAdmin, type OrgRole } from "./lib/auth";

// ── List all tenant labels ────────────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId } = await getCallerIdentity(ctx);
    return ctx.db
      .query("conversationLabels")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
  },
});

// ── Create a label (Admin or Supervisor) ──────────────────────────────────────

export const create = mutation({
  args: {
    name: v.string(),
    color: v.string(),
    emoji: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as OrgRole);

    if (!args.name.trim()) throw new ConvexError("NAME_REQUIRED");

    const existing = await ctx.db
      .query("conversationLabels")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    if (existing.some((l) => l.name.toLowerCase() === args.name.trim().toLowerCase())) {
      throw new ConvexError("LABEL_EXISTS");
    }

    return ctx.db.insert("conversationLabels", {
      tenantId,
      name: args.name.trim(),
      color: args.color,
      emoji: args.emoji,
      createdBy: callerId,
      createdAt: Date.now(),
    });
  },
});

// ── Delete a label (Admin only) ────────────────────────────────────────────────
// Also removes the label name from all conversations in this tenant.

export const remove = mutation({
  args: { labelId: v.id("conversationLabels") },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);

    const label = await ctx.db.get(args.labelId);
    if (!label || label.tenantId !== tenantId) throw new ConvexError("NOT_FOUND");

    // Remove label name from all conversations
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    for (const conv of conversations) {
      if (conv.labels.includes(label.name)) {
        await ctx.db.patch(conv._id, {
          labels: conv.labels.filter((n) => n !== label.name),
        });
      }
    }

    await ctx.db.delete(args.labelId);
  },
});

// ── Add a label to a conversation ─────────────────────────────────────────────

export const addToConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    labelName: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    if (conversation.labels.includes(args.labelName)) return; // already present

    await ctx.db.patch(args.conversationId, {
      labels: [...conversation.labels, args.labelName],
    });
  },
});

// ── Remove a label from a conversation ────────────────────────────────────────

export const removeFromConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    labelName: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    await ctx.db.patch(args.conversationId, {
      labels: conversation.labels.filter((n) => n !== args.labelName),
    });
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit` from the project root. Expect zero errors. Fix any type errors before continuing.

- [ ] **Step 3: Commit**

```bash
git add convex/labels.ts
git commit -m "feat(labels): add labels Convex backend (list, create, remove, addToConversation, removeFromConversation)"
```

---

## Task 3: Update `listConversations` to return `labels`

**Files:** Modify `convex/inbox.ts`

The `listConversations` query currently returns a mapped object without the `labels` array. The conversation list needs label names to show colored dots.

- [ ] **Step 1: Add `labels` to the returned object**

In `convex/inbox.ts`, find the `listConversations` query handler. The `rawResult` map block (around line 59-83) builds the return shape. Add `labels: conv.labels` to it:

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
          labels: conv.labels,           // ← ADD THIS LINE
          lastMessagePreview: conv.lastMessagePreview,
          lastMessageAt: conv.lastMessageAt,
          unreadCount: conv.unreadCount,
        };
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`. Fix any type errors.

- [ ] **Step 3: Commit**

```bash
git add convex/inbox.ts
git commit -m "feat(labels): expose labels array in listConversations return shape"
```

---

## Task 4: Create `LabelPicker` component

**Files:** Create `components/inbox/label-picker.tsx`

This is a popover button shown in the conversation thread header. It lists all tenant labels as toggleable checkboxes.

- [ ] **Step 1: Create the file**

```typescript
"use client";

import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

const COLOR_MAP: Record<string, string> = {
  red: "bg-red-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  yellow: "bg-yellow-400",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  gray: "bg-gray-400",
};

interface LabelPickerProps {
  conversationId: string;
  activeLabels: string[]; // label names currently on the conversation
}

export function LabelPicker({ conversationId, activeLabels }: LabelPickerProps) {
  const t = useT();
  const { isAuthenticated } = useConvexAuth();
  const labels = useQuery(api.labels.list, isAuthenticated ? undefined : "skip") ?? [];
  const addLabel = useMutation(api.labels.addToConversation);
  const removeLabel = useMutation(api.labels.removeFromConversation);

  async function toggle(labelName: string) {
    const id = conversationId as Id<"conversations">;
    if (activeLabels.includes(labelName)) {
      await removeLabel({ conversationId: id, labelName });
    } else {
      await addLabel({ conversationId: id, labelName });
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
          <Tag className="size-3.5" />
          {t("Labels", "التصنيفات")}
          {activeLabels.length > 0 && (
            <span className="rounded-full bg-primary/10 text-primary px-1.5 py-0 text-[10px] font-semibold">
              {activeLabels.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1">
        {labels.length === 0 ? (
          <p className="text-xs text-muted-foreground px-2 py-1.5">
            {t("No labels defined yet", "لا توجد تصنيفات بعد")}
          </p>
        ) : (
          labels.map((label) => {
            const isActive = activeLabels.includes(label.name);
            return (
              <button
                key={label._id}
                onClick={() => toggle(label.name)}
                className={cn(
                  "w-full flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent transition-colors",
                  isActive && "bg-accent",
                )}
              >
                <span
                  className={cn(
                    "size-2.5 rounded-full shrink-0",
                    COLOR_MAP[label.color] ?? "bg-gray-400",
                  )}
                />
                <span className="flex-1 text-start truncate">
                  {label.emoji ? `${label.emoji} ` : ""}
                  {label.name}
                </span>
                {isActive && (
                  <span className="text-[10px] text-primary font-semibold">
                    {t("✓", "✓")}
                  </span>
                )}
              </button>
            );
          })
        )}
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/inbox/label-picker.tsx
git commit -m "feat(labels): add LabelPicker popover component"
```

---

## Task 5: Wire `LabelPicker` into the conversation thread

**Files:** Modify `components/inbox/conversation-thread.tsx`

The thread header area needs to show the active labels and the picker button. The `conversationId` is already a prop. The labels for the active conversation need to be queried.

- [ ] **Step 1: Add label query and LabelPicker to the thread**

In `components/inbox/conversation-thread.tsx`, after the existing imports, add:

```typescript
import { LabelPicker } from "./label-picker";
import { useConvexAuth } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
```

Note: `useQuery` and `useConvexAuth` may already be imported. Only add what's missing.

Then find the JSX returned by the component. The thread currently renders messages directly. Add a small header bar above the messages scroll area. Find where the scrollable messages container starts (the `div` with `flex-1 min-h-0 overflow-y-auto`) and insert this BEFORE it:

```tsx
      {/* Labels bar */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b flex-wrap min-h-9">
        {(rawMessages !== undefined) && (
          <>
            <LabelPicker
              conversationId={conversationId}
              activeLabels={activeLabels}
            />
            {activeLabels.map((name) => {
              const meta = (allLabels ?? []).find((l) => l.name === name);
              const colorClass = meta ? (COLOR_MAP[meta.color] ?? "bg-gray-400") : "bg-gray-400";
              return (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-muted"
                >
                  <span className={`size-1.5 rounded-full ${colorClass}`} />
                  {meta?.emoji ? `${meta.emoji} ` : ""}{name}
                </span>
              );
            })}
          </>
        )}
      </div>
```

To make this work, add these queries and constants near the top of the component function body (after the existing `rawMessages` query):

```typescript
  const { isAuthenticated } = useConvexAuth();
  const allLabels = useQuery(api.labels.list, isAuthenticated ? undefined : "skip");
  const activeConv = useQuery(
    api.inbox.getConversation,
    isAuthenticated ? { conversationId: conversationId as Id<"conversations"> } : "skip"
  );
  const activeLabels: string[] = activeConv?.labels ?? [];

  const COLOR_MAP: Record<string, string> = {
    red: "bg-red-500",
    green: "bg-green-500",
    blue: "bg-blue-500",
    yellow: "bg-yellow-400",
    purple: "bg-purple-500",
    orange: "bg-orange-500",
    pink: "bg-pink-500",
    gray: "bg-gray-400",
  };
```

- [ ] **Step 2: Add `getConversation` query to `convex/inbox.ts`**

The `activeConv` query above uses `api.inbox.getConversation`. Add this to `convex/inbox.ts`:

```typescript
export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.tenantId !== tenantId) return null;
    return conv;
  },
});
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`. Fix any type errors.

- [ ] **Step 4: Commit**

```bash
git add components/inbox/conversation-thread.tsx convex/inbox.ts
git commit -m "feat(labels): show active labels + picker in conversation thread header"
```

---

## Task 6: Show label dots in `ConversationListItem`

**Files:** Modify `components/inbox/conversation-list-item.tsx`

The list item needs to show small colored dots for each label on the conversation.

- [ ] **Step 1: Add `labels` to the `ConversationItem` interface**

Find the `ConversationItem` interface in `components/inbox/conversation-list-item.tsx` and add:

```typescript
  labels?: string[];
```

- [ ] **Step 2: Add label dots to the JSX**

Find the area in the list item JSX where `lastMessagePreview` is rendered (usually a `<p>` tag with text-xs/muted styling). Below it, add label dots:

```tsx
          {(conversation.labels ?? []).length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {(conversation.labels ?? []).slice(0, 4).map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground font-medium max-w-[72px] truncate"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
```

- [ ] **Step 3: Pass `labels` from `ConversationList` to each `ConversationListItem`**

In `components/inbox/conversation-list.tsx`, find where `ConversationListItem` is rendered (the `.map()` block). The `conv` object now has `labels` from the updated `listConversations`. Add it to the passed props:

```tsx
              <ConversationListItem
                key={conv.id}
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
                  labels: conv.labels,   // ← ADD THIS
                }}
                isActive={conv.id === activeConversationId}
                onClick={() => onSelect?.(conv.id)}
                onAssignClick={
                  onAssignClick ? () => onAssignClick(conv.id) : undefined
                }
              />
```

- [ ] **Step 4: Commit**

```bash
git add components/inbox/conversation-list-item.tsx components/inbox/conversation-list.tsx
git commit -m "feat(labels): show label chips in conversation list item"
```

---

## Task 7: Add label filter to `ConversationList`

**Files:** Modify `components/inbox/conversation-list.tsx`

Agents need to filter conversations by label. Add a label filter dropdown below the existing stage filter row.

- [ ] **Step 1: Add label query and filter state**

At the top of the `ConversationList` component function body, add:

```typescript
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
  const allLabels = useQuery(api.labels.list, isAuthenticated ? undefined : "skip") ?? [];
```

Make sure `api` is imported from `@/convex/_generated/api`.

- [ ] **Step 2: Apply label filter to the `filtered` array**

After the existing search filter (which produces `filtered`), add:

```typescript
  const labelFiltered = labelFilter
    ? filtered.filter((c) => (c.labels ?? []).includes(labelFilter))
    : filtered;
```

Then replace all uses of `filtered` in the JSX with `labelFiltered`.

- [ ] **Step 3: Add the label filter row to JSX**

After the stage filter row (`{/* Stage filter tabs */}` block) and before the list, add:

```tsx
      {/* Label filter */}
      {allLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2 py-1.5 border-b">
          <button
            onClick={() => setLabelFilter(null)}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all",
              labelFilter === null
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {t("All", "الكل")}
          </button>
          {allLabels.map((label) => (
            <button
              key={label._id}
              onClick={() => setLabelFilter(labelFilter === label.name ? null : label.name)}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all flex items-center gap-1",
                labelFilter === label.name
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {label.emoji && <span>{label.emoji}</span>}
              {label.name}
            </button>
          ))}
        </div>
      )}
```

- [ ] **Step 4: Commit**

```bash
git add components/inbox/conversation-list.tsx
git commit -m "feat(labels): add label filter row in conversation list"
```

---

## Task 8: Settings page — manage labels

**Files:** Create `components/settings/labels-settings.tsx` + `app/(dashboard)/settings/labels/page.tsx`

Admins and supervisors can create labels. Only admins can delete them.

- [ ] **Step 1: Create `components/settings/labels-settings.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";
import { useOrganization } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const COLORS = [
  { value: "red",    bg: "bg-red-500" },
  { value: "green",  bg: "bg-green-500" },
  { value: "blue",   bg: "bg-blue-500" },
  { value: "yellow", bg: "bg-yellow-400" },
  { value: "purple", bg: "bg-purple-500" },
  { value: "orange", bg: "bg-orange-500" },
  { value: "pink",   bg: "bg-pink-500" },
  { value: "gray",   bg: "bg-gray-400" },
];

const DEFAULT_LABELS = [
  { name: "شكوى",       color: "red",    emoji: "⚠️" },
  { name: "استفسار",    color: "blue",   emoji: "❓" },
  { name: "مبيعات",     color: "green",  emoji: "💰" },
  { name: "دعم فني",    color: "purple", emoji: "🔧" },
  { name: "VIP",        color: "yellow", emoji: "⭐" },
];

export function LabelsSettings() {
  const t = useT();
  const { isAuthenticated } = useConvexAuth();
  const { membership } = useOrganization();
  const role = membership?.role as string | undefined;
  const isAdmin = role === "org:admin" || role === "admin";

  const labels = useQuery(api.labels.list, isAuthenticated ? undefined : "skip") ?? [];
  const createLabel = useMutation(api.labels.create);
  const removeLabel = useMutation(api.labels.remove);

  const [name, setName] = useState("");
  const [color, setColor] = useState("blue");
  const [emoji, setEmoji] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createLabel({ name: name.trim(), color, emoji: emoji.trim() || undefined });
      setName("");
      setEmoji("");
      toast.success(t("Label created", "تم إنشاء التصنيف"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("LABEL_EXISTS")) {
        toast.error(t("Label already exists", "التصنيف موجود بالفعل"));
      } else {
        toast.error(t("Failed to create label", "فشل إنشاء التصنيف"));
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleRemove(labelId: Id<"conversationLabels">, labelName: string) {
    if (!confirm(t(`Delete label "${labelName}"? It will be removed from all conversations.`, `حذف التصنيف "${labelName}"؟ سيتم إزالته من كل المحادثات.`))) return;
    try {
      await removeLabel({ labelId });
      toast.success(t("Label deleted", "تم حذف التصنيف"));
    } catch {
      toast.error(t("Failed to delete", "فشل الحذف"));
    }
  }

  async function seedDefaults() {
    for (const def of DEFAULT_LABELS) {
      try {
        await createLabel(def);
      } catch {
        // skip if already exists
      }
    }
    toast.success(t("Default labels added", "تم إضافة التصنيفات الافتراضية"));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("Conversation Labels", "تصنيفات المحادثات")}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("Tag conversations to categorize and filter them.", "صنّف المحادثات لتنظيمها وتصفيتها بسهولة.")}
          </p>
        </div>
        {labels.length === 0 && isAdmin && (
          <Button variant="outline" size="sm" onClick={seedDefaults}>
            {t("Add defaults", "إضافة الافتراضية")}
          </Button>
        )}
      </div>

      {/* Existing labels */}
      <div className="space-y-1.5">
        {labels.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
            {t("No labels yet. Create your first one below.", "لا توجد تصنيفات بعد. أنشئ أول تصنيف أدناه.")}
          </p>
        )}
        {labels.map((label) => (
          <div
            key={label._id}
            className="flex items-center gap-3 rounded-lg border px-3 py-2"
          >
            <span
              className={cn(
                "size-3 rounded-full shrink-0",
                COLORS.find((c) => c.value === label.color)?.bg ?? "bg-gray-400",
              )}
            />
            <span className="flex-1 text-sm">
              {label.emoji ? `${label.emoji} ` : ""}{label.name}
            </span>
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(label._id, label.name)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Create form */}
      <form onSubmit={handleCreate} className="space-y-3 border-t pt-4">
        <h3 className="text-sm font-medium">{t("New Label", "تصنيف جديد")}</h3>
        <div className="flex gap-2">
          <Input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder={t("Emoji (optional)", "رمز (اختياري)")}
            className="w-28 text-center"
            maxLength={2}
          />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("Label name", "اسم التصنيف")}
            className="flex-1"
            required
          />
        </div>
        {/* Color picker */}
        <div className="flex gap-2 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className={cn(
                "size-6 rounded-full transition-all",
                c.bg,
                color === c.value
                  ? "ring-2 ring-offset-2 ring-foreground scale-110"
                  : "opacity-70 hover:opacity-100",
              )}
              aria-label={c.value}
            />
          ))}
        </div>
        <Button type="submit" size="sm" disabled={creating || !name.trim()}>
          <Plus className="size-3.5 me-1.5" />
          {creating ? t("Creating...", "جاري الإنشاء...") : t("Create Label", "إنشاء تصنيف")}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/(dashboard)/settings/labels/page.tsx`**

```typescript
import { LabelsSettings } from "@/components/settings/labels-settings";

export default function LabelsPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <LabelsSettings />
    </div>
  );
}
```

- [ ] **Step 3: Add Labels link to the nav config**

In `lib/shell/nav-config.ts`, add to the `Settings` children array (after the quick-replies entry):

```typescript
      {
        href: "/settings/labels",
        labelAr: "التصنيفات",
        labelEn: "Labels",
        icon: "Tag",
        minRole: "supervisor",
      },
```

- [ ] **Step 4: Register the `Tag` icon in the icon resolver**

In `components/shell/resolve-icon.tsx`, find where icons are registered (the `switch` or `Record` map) and add `Tag` from `lucide-react`. Follow the existing pattern exactly.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`. Fix any errors.

- [ ] **Step 6: Commit**

```bash
git add components/settings/labels-settings.tsx app/(dashboard)/settings/labels/page.tsx lib/shell/nav-config.ts components/shell/resolve-icon.tsx
git commit -m "feat(labels): add labels settings page and nav link"
```

---

## Final Verification Checklist

- [ ] `npx convex dev` is running — no schema errors in console
- [ ] Open the inbox in the browser at `/inbox`
- [ ] Open a conversation — labels bar appears at the top of the thread with a "Labels" button
- [ ] Click "Labels" button — popover opens (says "No labels defined yet" if none created)
- [ ] Go to `/settings/labels` — labels settings page loads
- [ ] Click "Add defaults" — 5 Arabic default labels appear in the list
- [ ] Go back to inbox, open a conversation — click Labels → all 5 labels show in popover
- [ ] Check a label — it appears as a chip in the thread header and as a small badge in the conversation list
- [ ] Label filter row appears in the conversation list — clicking a label filters the list
- [ ] Admin can delete a label from settings; it disappears from all conversations
- [ ] RTL layout looks correct at all screen sizes
