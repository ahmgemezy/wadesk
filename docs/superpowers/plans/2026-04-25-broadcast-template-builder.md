# Broadcast Template Builder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins build Meta-approved broadcast templates (with image/video headers, body variables, and URL buttons) entirely inside WABDesk, without ever touching Meta Business Manager.

**Architecture:** New `broadcastTemplates` Convex table (separate from quick-reply `messageTemplates` and synced `metaTemplates`). A Convex action POSTs the template to Meta for approval; a cron action polls Meta every 30 min to sync status. Approved templates appear as a new source in the Broadcasts wizard alongside existing synced `metaTemplates`.

**Tech Stack:** Next.js 15 (App Router), Convex (mutations + actions + crons), shadcn/ui, Tailwind CSS, Meta Graph API v25.0, existing `decrypt` helper from `convex/lib/encryption.ts`.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `convex/schema.ts` | Modify | Add `broadcastTemplates` table |
| `convex/lib/planLimits.ts` | Modify | Add broadcast template plan limits |
| `convex/broadcastTemplates.ts` | Create | list, create, update, remove, submit, syncStatus, internal helpers |
| `convex/crons.ts` | Modify | Add 30-min cron for syncStatus |
| `components/broadcasts/broadcast-template-card.tsx` | Create | Card with status badge, check-status button, lock states |
| `components/broadcasts/broadcast-template-builder.tsx` | Create | Create/edit dialog: form + live WhatsApp preview |
| `components/broadcasts/broadcast-templates-tab.tsx` | Create | Grid of cards, empty state, plan banner |
| `components/settings/templates-settings.tsx` | Modify | Add "Broadcast Templates" third tab |
| `components/broadcasts/create-broadcast-wizard.tsx` | Modify | Source picker, media override, dynamic URL suffix |

---

## Task 1: Schema — Add `broadcastTemplates` table

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Add the table definition**

Open `convex/schema.ts`. After the `messageTemplates` table definition (around line 465), insert:

```typescript
  broadcastTemplates: defineTable({
    tenantId: v.string(),
    channelId: v.id("channels"),

    // Meta identity
    name: v.string(),
    title: v.string(),
    language: v.string(),
    category: v.union(v.literal("MARKETING"), v.literal("UTILITY")),

    // Header
    headerType: v.union(
      v.literal("NONE"),
      v.literal("TEXT"),
      v.literal("IMAGE"),
      v.literal("VIDEO"),
      v.literal("DOCUMENT"),
    ),
    headerText: v.optional(v.string()),
    headerMediaUrl: v.optional(v.string()),

    // Body
    body: v.string(),
    variables: v.array(v.string()),

    // Footer
    footer: v.optional(v.string()),

    // Buttons
    buttons: v.optional(v.array(v.object({
      type: v.union(v.literal("URL"), v.literal("PHONE_NUMBER"), v.literal("QUICK_REPLY")),
      text: v.string(),
      value: v.string(),
      isDynamic: v.optional(v.boolean()),
    }))),

    // Meta approval lifecycle
    metaStatus: v.union(
      v.literal("draft"),
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("paused"),
    ),
    metaTemplateId: v.optional(v.string()),
    metaRejectionReason: v.optional(v.string()),
    metaSubmittedAt: v.optional(v.number()),

    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_channel", ["channelId"])
    .index("by_tenant_status", ["tenantId", "metaStatus"]),
```

- [ ] **Step 2: Verify schema compiles**

```bash
npx convex dev --once 2>&1 | tail -5
```

Expected: no type errors, Convex schema accepted.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(broadcast-templates): add broadcastTemplates table to schema"
```

---

## Task 2: Plan Limits

**Files:**
- Modify: `convex/lib/planLimits.ts`

- [ ] **Step 1: Add broadcast template limits**

At the end of `convex/lib/planLimits.ts`, append:

```typescript
const BROADCAST_TEMPLATE_LIMITS: Record<Plan, number> = {
  free: 2,
  starter: 6,
  growth: 20,
  business: Infinity,
};

export function assertBroadcastTemplateLimitNotReached(
  currentCount: number,
  plan: Plan,
): void {
  const limit = BROADCAST_TEMPLATE_LIMITS[plan] ?? BROADCAST_TEMPLATE_LIMITS.free;
  if (currentCount >= limit) {
    throw new ConvexError({
      message: "PLAN_LIMIT_REACHED",
      data: { plan, limit, feature: "broadcastTemplates" },
    });
  }
}

export function getBroadcastTemplateLimit(plan: Plan): number {
  return BROADCAST_TEMPLATE_LIMITS[plan] ?? BROADCAST_TEMPLATE_LIMITS.free;
}
```

- [ ] **Step 2: Commit**

```bash
git add convex/lib/planLimits.ts
git commit -m "feat(broadcast-templates): add broadcast template plan limits"
```

---

## Task 3: Convex CRUD — list, create, update, remove

**Files:**
- Create: `convex/broadcastTemplates.ts`

- [ ] **Step 1: Create the file with list, create, update, remove**

```typescript
// convex/broadcastTemplates.ts
import { v } from "convex/values";
import { query, mutation, action, internalQuery, internalMutation, internalAction } from "./_generated/server";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getCallerIdentity, getCallerRole, assertAdminOrSupervisor } from "./lib/auth";
import {
  assertBroadcastTemplateLimitNotReached,
  getBroadcastTemplateLimit,
  type Plan,
} from "./lib/planLimits";

const META_BASE = "https://graph.facebook.com/v25.0";

function extractVariables(body: string): string[] {
  const matches = body.matchAll(/\{\{(\w+)\}\}/g);
  return [...new Set([...matches].map((m) => m[1].toLowerCase()))];
}

// ── Public query ──────────────────────────────────────────────────────────────

export const list = query({
  args: { metaStatus: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);

    if (args.metaStatus) {
      return ctx.db
        .query("broadcastTemplates")
        .withIndex("by_tenant_status", (q) =>
          q.eq("tenantId", tenantId).eq("metaStatus", args.metaStatus as "draft" | "pending" | "approved" | "rejected" | "paused"),
        )
        .order("desc")
        .collect();
    }

    return ctx.db
      .query("broadcastTemplates")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .order("desc")
      .collect();
  },
});

export const getLimitInfo = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const plan: Plan = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId });
    const all = await ctx.db
      .query("broadcastTemplates")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
    return { count: all.length, limit: getBroadcastTemplateLimit(plan), plan };
  },
});

// ── Public mutations ──────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    channelId: v.id("channels"),
    name: v.string(),
    title: v.string(),
    language: v.string(),
    category: v.union(v.literal("MARKETING"), v.literal("UTILITY")),
    headerType: v.union(
      v.literal("NONE"), v.literal("TEXT"),
      v.literal("IMAGE"), v.literal("VIDEO"), v.literal("DOCUMENT"),
    ),
    headerText: v.optional(v.string()),
    headerMediaUrl: v.optional(v.string()),
    body: v.string(),
    footer: v.optional(v.string()),
    buttons: v.optional(v.array(v.object({
      type: v.union(v.literal("URL"), v.literal("PHONE_NUMBER"), v.literal("QUICK_REPLY")),
      text: v.string(),
      value: v.string(),
      isDynamic: v.optional(v.boolean()),
    }))),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as Parameters<typeof assertAdminOrSupervisor>[0]);

    // Verify channel belongs to tenant
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) throw new ConvexError("CHANNEL_NOT_FOUND");

    const plan: Plan = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId });
    const existing = await ctx.db
      .query("broadcastTemplates")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
    assertBroadcastTemplateLimitNotReached(existing.length, plan);

    return ctx.db.insert("broadcastTemplates", {
      tenantId,
      channelId: args.channelId,
      name: args.name,
      title: args.title,
      language: args.language,
      category: args.category,
      headerType: args.headerType,
      headerText: args.headerText,
      headerMediaUrl: args.headerMediaUrl,
      body: args.body,
      variables: extractVariables(args.body),
      footer: args.footer,
      buttons: args.buttons,
      metaStatus: "draft",
      createdBy: callerId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("broadcastTemplates"),
    channelId: v.optional(v.id("channels")),
    name: v.optional(v.string()),
    title: v.optional(v.string()),
    language: v.optional(v.string()),
    category: v.optional(v.union(v.literal("MARKETING"), v.literal("UTILITY"))),
    headerType: v.optional(v.union(
      v.literal("NONE"), v.literal("TEXT"),
      v.literal("IMAGE"), v.literal("VIDEO"), v.literal("DOCUMENT"),
    )),
    headerText: v.optional(v.string()),
    headerMediaUrl: v.optional(v.string()),
    body: v.optional(v.string()),
    footer: v.optional(v.string()),
    buttons: v.optional(v.array(v.object({
      type: v.union(v.literal("URL"), v.literal("PHONE_NUMBER"), v.literal("QUICK_REPLY")),
      text: v.string(),
      value: v.string(),
      isDynamic: v.optional(v.boolean()),
    }))),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as Parameters<typeof assertAdminOrSupervisor>[0]);

    const tpl = await ctx.db.get(args.id);
    if (!tpl || tpl.tenantId !== tenantId) throw new ConvexError("NOT_FOUND");
    if (tpl.metaStatus === "pending" || tpl.metaStatus === "approved") {
      throw new ConvexError("TEMPLATE_LOCKED");
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.channelId !== undefined) patch.channelId = args.channelId;
    if (args.name !== undefined) patch.name = args.name;
    if (args.title !== undefined) patch.title = args.title;
    if (args.language !== undefined) patch.language = args.language;
    if (args.category !== undefined) patch.category = args.category;
    if (args.headerType !== undefined) patch.headerType = args.headerType;
    if (args.headerText !== undefined) patch.headerText = args.headerText;
    if (args.headerMediaUrl !== undefined) patch.headerMediaUrl = args.headerMediaUrl;
    if (args.footer !== undefined) patch.footer = args.footer;
    if (args.buttons !== undefined) patch.buttons = args.buttons;
    if (args.body !== undefined) {
      patch.body = args.body;
      patch.variables = extractVariables(args.body);
    }

    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("broadcastTemplates") },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as Parameters<typeof assertAdminOrSupervisor>[0]);

    const tpl = await ctx.db.get(args.id);
    if (!tpl || tpl.tenantId !== tenantId) throw new ConvexError("NOT_FOUND");
    if (tpl.metaStatus === "pending" || tpl.metaStatus === "approved") {
      throw new ConvexError("TEMPLATE_LOCKED");
    }

    await ctx.db.delete(args.id);
  },
});

// ── Internal helpers (defined below Task 4) ───────────────────────────────────
```

- [ ] **Step 2: Verify Convex compiles**

```bash
npx convex dev --once 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add convex/broadcastTemplates.ts
git commit -m "feat(broadcast-templates): add list/create/update/remove Convex functions"
```

---

## Task 4: Convex Actions — submit + syncStatus + cron

**Files:**
- Modify: `convex/broadcastTemplates.ts` (append to the file from Task 3)
- Modify: `convex/crons.ts`

- [ ] **Step 1: Append internal helpers + submit + syncStatus to `convex/broadcastTemplates.ts`**

```typescript
// ── Internal helper ───────────────────────────────────────────────────────────

export const getTemplateInternal = internalQuery({
  args: { id: v.id("broadcastTemplates"), tenantId: v.string() },
  handler: async (ctx, args) => {
    const tpl = await ctx.db.get(args.id);
    if (!tpl || tpl.tenantId !== args.tenantId) return null;
    return tpl;
  },
});

export const getChannelInternal = internalQuery({
  args: { channelId: v.id("channels"), tenantId: v.string() },
  handler: async (ctx, args) => {
    const ch = await ctx.db.get(args.channelId);
    if (!ch || ch.tenantId !== args.tenantId) return null;
    return ch;
  },
});

export const patchStatusInternal = internalMutation({
  args: {
    id: v.id("broadcastTemplates"),
    metaStatus: v.union(
      v.literal("draft"), v.literal("pending"), v.literal("approved"),
      v.literal("rejected"), v.literal("paused"),
    ),
    metaTemplateId: v.optional(v.string()),
    metaRejectionReason: v.optional(v.string()),
    metaSubmittedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {
      metaStatus: args.metaStatus,
      updatedAt: Date.now(),
    };
    if (args.metaTemplateId !== undefined) patch.metaTemplateId = args.metaTemplateId;
    if (args.metaRejectionReason !== undefined) patch.metaRejectionReason = args.metaRejectionReason;
    if (args.metaSubmittedAt !== undefined) patch.metaSubmittedAt = args.metaSubmittedAt;
    await ctx.db.patch(args.id, patch);
  },
});

export const listPendingInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Returns all pending broadcast templates across all tenants for cron sync
    return ctx.db
      .query("broadcastTemplates")
      .filter((q) => q.eq(q.field("metaStatus"), "pending"))
      .collect();
  },
});

// ── submit action ─────────────────────────────────────────────────────────────

function buildMetaComponents(tpl: {
  headerType: string;
  headerText?: string;
  body: string;
  variables: string[];
  footer?: string;
  buttons?: Array<{
    type: string;
    text: string;
    value: string;
    isDynamic?: boolean;
  }>;
}): unknown[] {
  const components: unknown[] = [];

  // Header
  if (tpl.headerType !== "NONE") {
    if (tpl.headerType === "TEXT") {
      components.push({ type: "HEADER", format: "TEXT", text: tpl.headerText ?? "" });
    } else {
      // IMAGE, VIDEO, DOCUMENT — no example needed; media provided at send time
      components.push({ type: "HEADER", format: tpl.headerType });
    }
  }

  // Body — map named {{variable}} to positional {{1}}, {{2}} …
  let metaBody = tpl.body;
  const varExamples: string[] = [];
  tpl.variables.forEach((varName, idx) => {
    metaBody = metaBody.replaceAll(`{{${varName}}}`, `{{${idx + 1}}}`);
    varExamples.push(`example_${varName}`);
  });
  const bodyComp: Record<string, unknown> = { type: "BODY", text: metaBody };
  if (varExamples.length > 0) {
    bodyComp.example = { body_text: [varExamples] };
  }
  components.push(bodyComp);

  // Footer
  if (tpl.footer) {
    components.push({ type: "FOOTER", text: tpl.footer });
  }

  // Buttons
  if (tpl.buttons && tpl.buttons.length > 0) {
    const metaButtons = tpl.buttons.map((btn) => {
      if (btn.type === "URL") {
        const url = btn.isDynamic ? `${btn.value}{{1}}` : btn.value;
        const btnObj: Record<string, unknown> = { type: "URL", text: btn.text, url };
        if (btn.isDynamic) btnObj.example = ["example-suffix"];
        return btnObj;
      }
      if (btn.type === "PHONE_NUMBER") {
        return { type: "PHONE_NUMBER", text: btn.text, phone_number: btn.value };
      }
      return { type: "QUICK_REPLY", text: btn.text };
    });
    components.push({ type: "BUTTONS", buttons: metaButtons });
  }

  return components;
}

export const submit = action({
  args: { id: v.id("broadcastTemplates") },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdminOrSupervisor(role);

    const identity = await ctx.auth.getUserIdentity();
    const tenantId = identity!.orgId as string;

    const tpl = await ctx.runQuery(internal.broadcastTemplates.getTemplateInternal, {
      id: args.id,
      tenantId,
    });
    if (!tpl) throw new ConvexError("NOT_FOUND");
    if (tpl.metaStatus !== "draft" && tpl.metaStatus !== "rejected") {
      throw new ConvexError("TEMPLATE_LOCKED");
    }

    const channel = await ctx.runQuery(internal.broadcastTemplates.getChannelInternal, {
      channelId: tpl.channelId,
      tenantId,
    });
    if (!channel) throw new ConvexError("CHANNEL_NOT_FOUND");

    const { decrypt } = await import("./lib/encryption");
    const token = channel.accessToken ? await decrypt(channel.accessToken) : null;
    if (!token) throw new ConvexError("CHANNEL_TOKEN_MISSING");

    const components = buildMetaComponents(tpl);

    const res = await fetch(`${META_BASE}/${channel.wabaId}/message_templates`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: tpl.name,
        language: tpl.language,
        category: tpl.category,
        components,
      }),
    });

    const data = await res.json() as { id?: string; error?: { message: string } };

    if (!res.ok || data.error) {
      const errMsg = data.error?.message ?? `HTTP ${res.status}`;
      throw new ConvexError(`Meta API error: ${errMsg}`);
    }

    await ctx.runMutation(internal.broadcastTemplates.patchStatusInternal, {
      id: args.id,
      metaStatus: "pending",
      metaTemplateId: data.id,
      metaSubmittedAt: Date.now(),
    });

    return { success: true };
  },
});

// ── syncStatus action ─────────────────────────────────────────────────────────

export const syncStatus = action({
  args: { id: v.id("broadcastTemplates") },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdminOrSupervisor(role);

    const identity = await ctx.auth.getUserIdentity();
    const tenantId = identity!.orgId as string;

    const tpl = await ctx.runQuery(internal.broadcastTemplates.getTemplateInternal, {
      id: args.id,
      tenantId,
    });
    if (!tpl || tpl.metaStatus !== "pending") return;

    await ctx.runAction(internal.broadcastTemplates.syncStatusInternal, { id: args.id });
  },
});

export const syncStatusInternal = internalAction({
  args: { id: v.id("broadcastTemplates") },
  handler: async (ctx, args) => {
    const tpl = await ctx.runQuery(internal.broadcastTemplates.getTemplateByIdInternal, {
      id: args.id,
    });
    if (!tpl || tpl.metaStatus !== "pending") return;

    const channel = await ctx.runQuery(internal.broadcastTemplates.getChannelInternal, {
      channelId: tpl.channelId,
      tenantId: tpl.tenantId,
    });
    if (!channel) return;

    const { decrypt } = await import("./lib/encryption");
    const token = channel.accessToken ? await decrypt(channel.accessToken) : null;
    if (!token) return;

    const res = await fetch(
      `${META_BASE}/${channel.wabaId}/message_templates?name=${encodeURIComponent(tpl.name)}&fields=status,rejected_reason`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) return;

    const data = await res.json() as {
      data?: Array<{ status: string; rejected_reason?: string }>;
    };
    const entry = data.data?.[0];
    if (!entry) return;

    const newStatus = entry.status.toLowerCase() as "approved" | "rejected" | "paused" | "pending";
    if (newStatus === tpl.metaStatus) return; // no change

    await ctx.runMutation(internal.broadcastTemplates.patchStatusInternal, {
      id: args.id,
      metaStatus: newStatus,
      metaRejectionReason: entry.rejected_reason,
    });

    // Notify creator on approval
    if (newStatus === "approved") {
      await ctx.runMutation(internal.notifications.internalCreate, {
        tenantId: tpl.tenantId,
        userId: tpl.createdBy,
        referenceId: tpl._id,
        message: `Template "${tpl.title}" was approved by Meta and is ready to use in Broadcasts.`,
      });
    }
  },
});

export const getTemplateByIdInternal = internalQuery({
  args: { id: v.id("broadcastTemplates") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

// ── Cron handler ──────────────────────────────────────────────────────────────

export const syncAllPendingInternal = internalAction({
  args: {},
  handler: async (ctx) => {
    const pending = await ctx.runQuery(internal.broadcastTemplates.listPendingInternal, {});
    for (const tpl of pending) {
      await ctx.runAction(internal.broadcastTemplates.syncStatusInternal, { id: tpl._id });
    }
  },
});
```

- [ ] **Step 2: Add cron in `convex/crons.ts`**

Append before `export default crons;`:

```typescript
crons.interval(
  "sync-pending-broadcast-templates",
  { minutes: 30 },
  internal.broadcastTemplates.syncAllPendingInternal,
);
```

Also add the import at the top if not already present — `internal` is already imported in `crons.ts`.

- [ ] **Step 3: Verify Convex compiles**

```bash
npx convex dev --once 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add convex/broadcastTemplates.ts convex/crons.ts
git commit -m "feat(broadcast-templates): add submit/syncStatus actions and cron"
```

---

## Task 5: `broadcast-template-card.tsx`

**Files:**
- Create: `components/broadcasts/broadcast-template-card.tsx`

- [ ] **Step 1: Create the card component**

```typescript
"use client";

import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PencilIcon, Trash2Icon, RefreshCwIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useT } from "@/lib/i18n/context";

type BroadcastTemplate = {
  _id: Id<"broadcastTemplates">;
  title: string;
  language: string;
  category: "MARKETING" | "UTILITY";
  headerType: "NONE" | "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
  metaStatus: "draft" | "pending" | "approved" | "rejected" | "paused";
  metaRejectionReason?: string;
};

const STATUS_CONFIG = {
  draft:    { label: "Draft",          labelAr: "مسودة",            className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  pending:  { label: "Pending Review", labelAr: "قيد المراجعة",     className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  approved: { label: "Approved",       labelAr: "معتمد",            className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  rejected: { label: "Rejected",       labelAr: "مرفوض",            className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  paused:   { label: "Paused",         labelAr: "موقوف",            className: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
};

const HEADER_ICONS: Record<string, string> = {
  NONE: "—", TEXT: "T", IMAGE: "🖼", VIDEO: "🎬", DOCUMENT: "📄",
};

interface Props {
  template: BroadcastTemplate;
  onEdit: (id: Id<"broadcastTemplates">) => void;
}

export function BroadcastTemplateCard({ template, onEdit }: Props) {
  const t = useT();
  const remove = useMutation(api.broadcastTemplates.remove);
  const syncStatus = useAction(api.broadcastTemplates.syncStatus);
  const [syncing, setSyncing] = useState(false);
  const [removing, setRemoving] = useState(false);

  const isLocked = template.metaStatus === "pending" || template.metaStatus === "approved";
  const status = STATUS_CONFIG[template.metaStatus];

  async function handleDelete() {
    setRemoving(true);
    try {
      await remove({ id: template._id });
      toast.success(t("Template deleted", "تم حذف القالب"));
    } catch {
      toast.error(t("Failed to delete", "فشل الحذف"));
    } finally {
      setRemoving(false);
    }
  }

  async function handleCheckStatus() {
    setSyncing(true);
    try {
      await syncStatus({ id: template._id });
      toast.success(t("Status updated", "تم تحديث الحالة"));
    } catch {
      toast.error(t("Failed to check status", "فشل التحقق من الحالة"));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <TooltipProvider>
      <Card className="relative group overflow-hidden flex flex-col">
        {/* Action buttons */}
        <div className="absolute top-2 inset-e-2 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
          {template.metaStatus === "pending" && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleCheckStatus}
              disabled={syncing}
              title={t("Check approval status", "تحقق من حالة الموافقة")}
            >
              {syncing
                ? <Loader2Icon className="size-3.5 animate-spin" />
                : <RefreshCwIcon className="size-3.5" />
              }
            </Button>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onEdit(template._id)}
                  disabled={isLocked}
                >
                  <PencilIcon className="size-3.5" />
                </Button>
              </span>
            </TooltipTrigger>
            {isLocked && (
              <TooltipContent>
                {template.metaStatus === "pending"
                  ? t("Template is pending Meta review", "القالب قيد مراجعة ميتا")
                  : t("Approved templates cannot be edited", "لا يمكن تعديل القوالب المعتمدة")}
              </TooltipContent>
            )}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleDelete}
                  disabled={isLocked || removing}
                >
                  {removing
                    ? <Loader2Icon className="size-3.5 animate-spin" />
                    : <Trash2Icon className="size-3.5" />
                  }
                </Button>
              </span>
            </TooltipTrigger>
            {isLocked && (
              <TooltipContent>
                {t("Cannot delete while pending or approved", "لا يمكن الحذف أثناء المراجعة أو الاعتماد")}
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        <CardHeader className="pb-2 pe-16 space-y-0 text-start">
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status.className}`}>
              {t(status.label, status.labelAr)}
            </span>
            <Badge variant="outline" className="text-[10px] uppercase">
              {template.language}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {HEADER_ICONS[template.headerType]} {template.headerType}
            </Badge>
          </div>
          <CardTitle className="text-base font-semibold leading-tight line-clamp-1">
            {template.title}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {template.category}
          </p>
        </CardHeader>

        {template.metaStatus === "rejected" && template.metaRejectionReason && (
          <CardContent className="pt-0">
            <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2 text-xs text-red-700 dark:text-red-400">
              {template.metaRejectionReason}
            </div>
          </CardContent>
        )}
      </Card>
    </TooltipProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/broadcasts/broadcast-template-card.tsx
git commit -m "feat(broadcast-templates): add BroadcastTemplateCard component"
```

---

## Task 6: `broadcast-template-builder.tsx` — Form + Live Preview Dialog

**Files:**
- Create: `components/broadcasts/broadcast-template-builder.tsx`

- [ ] **Step 1: Create the builder dialog**

```typescript
"use client";

import { useState, useEffect } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2Icon, PlusIcon, Trash2Icon, SendIcon } from "lucide-react";
import { WhatsAppTemplatePreview } from "@/components/broadcasts/whatsapp-template-preview";
import type { TemplateComponent } from "@/components/broadcasts/whatsapp-template-preview";
import { useT } from "@/lib/i18n/context";

type HeaderType = "NONE" | "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
type ButtonType = "URL" | "PHONE_NUMBER" | "QUICK_REPLY";
type Category = "MARKETING" | "UTILITY";

interface BtnField {
  type: ButtonType;
  text: string;
  value: string;
  isDynamic: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  editingId?: Id<"broadcastTemplates"> | null;
  initialData?: {
    channelId: Id<"channels">;
    name: string;
    title: string;
    language: string;
    category: Category;
    headerType: HeaderType;
    headerText?: string;
    headerMediaUrl?: string;
    body: string;
    footer?: string;
    buttons?: BtnField[];
    metaStatus: string;
  } | null;
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function extractVariables(body: string): string[] {
  const matches = body.matchAll(/\{\{(\w+)\}\}/g);
  return [...new Set([...matches].map((m) => m[1].toLowerCase()))];
}

const HEADER_OPTIONS: { value: HeaderType; label: string; labelAr: string }[] = [
  { value: "NONE",     label: "None",     labelAr: "بدون" },
  { value: "TEXT",     label: "Text",     labelAr: "نص" },
  { value: "IMAGE",    label: "Image",    labelAr: "صورة" },
  { value: "VIDEO",    label: "Video",    labelAr: "فيديو" },
  { value: "DOCUMENT", label: "Document", labelAr: "مستند" },
];

export function BroadcastTemplateBuilder({ open, onClose, editingId, initialData }: Props) {
  const t = useT();
  const channels = useQuery(api.channels.list);

  const create = useMutation(api.broadcastTemplates.create);
  const update = useMutation(api.broadcastTemplates.update);
  const submit = useAction(api.broadcastTemplates.submit);

  const [channelId, setChannelId] = useState<Id<"channels"> | "">("");
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [category, setCategory] = useState<Category>("MARKETING");
  const [headerType, setHeaderType] = useState<HeaderType>("NONE");
  const [headerText, setHeaderText] = useState("");
  const [headerMediaUrl, setHeaderMediaUrl] = useState("");
  const [body, setBody] = useState("");
  const [footer, setFooter] = useState("");
  const [showFooter, setShowFooter] = useState(false);
  const [buttons, setButtons] = useState<BtnField[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isLocked = initialData?.metaStatus === "pending" || initialData?.metaStatus === "approved";

  useEffect(() => {
    if (open) {
      if (initialData) {
        setChannelId(initialData.channelId);
        setTitle(initialData.title);
        setName(initialData.name);
        setLanguage(initialData.language as "ar" | "en");
        setCategory(initialData.category);
        setHeaderType(initialData.headerType);
        setHeaderText(initialData.headerText ?? "");
        setHeaderMediaUrl(initialData.headerMediaUrl ?? "");
        setBody(initialData.body);
        setFooter(initialData.footer ?? "");
        setShowFooter(!!initialData.footer);
        setButtons(initialData.buttons ?? []);
      } else {
        setChannelId("");
        setTitle(""); setName(""); setLanguage("ar"); setCategory("MARKETING");
        setHeaderType("NONE"); setHeaderText(""); setHeaderMediaUrl("");
        setBody(""); setFooter(""); setShowFooter(false); setButtons([]);
      }
    }
  }, [open, initialData]);

  // Auto-generate Meta name from title
  function handleTitleChange(v: string) {
    setTitle(v);
    if (!editingId) setName(slugify(v));
  }

  const detectedVars = extractVariables(body);

  // Build live preview components
  const previewComponents: TemplateComponent[] = [];
  if (headerType !== "NONE") {
    previewComponents.push({
      type: "HEADER",
      format: headerType,
      text: headerType === "TEXT" ? headerText : undefined,
    });
  }
  if (body) previewComponents.push({ type: "BODY", text: body });
  if (footer) previewComponents.push({ type: "FOOTER", text: footer });
  if (buttons.length > 0) {
    previewComponents.push({
      type: "BUTTONS",
      buttons: buttons.map((b) => ({
        type: b.type as "URL" | "PHONE_NUMBER" | "QUICK_REPLY",
        text: b.text,
        url: b.type === "URL" ? b.value : undefined,
        phone_number: b.type === "PHONE_NUMBER" ? b.value : undefined,
      })),
    });
  }

  function addButton() {
    if (buttons.length >= 3) return;
    setButtons((prev) => [...prev, { type: "URL", text: "", value: "", isDynamic: false }]);
  }

  function updateButton(idx: number, patch: Partial<BtnField>) {
    setButtons((prev) => prev.map((b, i) => i === idx ? { ...b, ...patch } : b));
  }

  function removeButton(idx: number) {
    setButtons((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!title.trim() || !body.trim() || !channelId) return;
    setSaving(true);
    try {
      const payload = {
        channelId: channelId as Id<"channels">,
        name: name.trim(),
        title: title.trim(),
        language,
        category,
        headerType,
        headerText: headerType === "TEXT" ? headerText : undefined,
        headerMediaUrl: ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType) ? headerMediaUrl || undefined : undefined,
        body: body.trim(),
        footer: showFooter && footer.trim() ? footer.trim() : undefined,
        buttons: buttons.length > 0 ? buttons : undefined,
      };

      if (editingId) {
        await update({ id: editingId, ...payload });
        toast.success(t("Template saved", "تم حفظ القالب"));
      } else {
        await create(payload);
        toast.success(t("Template created", "تم إنشاء القالب"));
      }
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg.includes("PLAN_LIMIT") ? t("Plan limit reached", "وصلت لحد الخطة") : t("Failed to save", "فشل الحفظ"));
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitToMeta() {
    if (!editingId) return;
    setSubmitting(true);
    try {
      await submit({ id: editingId });
      toast.success(t("Submitted to Meta for review", "تم الإرسال لميتا للمراجعة"));
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg.replace("ConvexError: Meta API error: ", ""));
    } finally {
      setSubmitting(false);
    }
  }

  const canSave = !isLocked && !!title.trim() && !!body.trim() && !!channelId;
  const canSubmitToMeta = editingId && !isLocked && !!title.trim() && !!body.trim() && !!channelId;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingId
              ? t("Edit Broadcast Template", "تعديل قالب الحملة")
              : t("New Broadcast Template", "قالب حملة جديد")}
          </DialogTitle>
        </DialogHeader>

        {isLocked && (
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            {initialData?.metaStatus === "pending"
              ? t("This template is pending Meta review and cannot be edited.", "هذا القالب قيد مراجعة ميتا ولا يمكن تعديله.")
              : t("Approved templates cannot be edited.", "لا يمكن تعديل القوالب المعتمدة.")}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ── Left: Form ── */}
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>{t("Display Title", "العنوان")}</Label>
                <Input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder={t("e.g. Product Showcase", "مثال: عرض المنتج")}
                  dir="auto"
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("Template Name (Meta slug)", "اسم القالب (Meta)")}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value.replace(/[^a-z0-9_]/g, ""))}
                  placeholder="product_showcase_ar"
                  dir="ltr"
                  disabled={isLocked}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {t("Lowercase letters, numbers, underscores only", "أحرف صغيرة وأرقام وشرطة سفلية فقط")}
                </p>
              </div>
              <div className="space-y-1">
                <Label>{t("Channel", "القناة")}</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value as Id<"channels">)}
                  disabled={isLocked}
                >
                  <option value="">{t("Select a channel…", "اختر قناة...")}</option>
                  {channels?.map((ch) => (
                    <option key={ch._id} value={ch._id}>{ch.displayName ?? ch.phoneNumberId}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Label>{t("Language", "اللغة")}</Label>
                  <div className="flex gap-2">
                    {(["ar", "en"] as const).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        disabled={isLocked}
                        onClick={() => setLanguage(lang)}
                        className={`flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors ${
                          language === lang
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background hover:bg-muted"
                        }`}
                      >
                        {lang === "ar" ? "العربية" : "English"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <Label>{t("Category", "الفئة")}</Label>
                  <div className="flex gap-2">
                    {(["MARKETING", "UTILITY"] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        disabled={isLocked}
                        onClick={() => setCategory(cat)}
                        className={`flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors ${
                          category === cat
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background hover:bg-muted"
                        }`}
                      >
                        {cat === "MARKETING" ? t("Marketing", "تسويق") : t("Utility", "خدمي")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="space-y-2">
              <Label>{t("Header", "الترويسة")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {HEADER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isLocked}
                    onClick={() => setHeaderType(opt.value)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      headerType === opt.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-muted-foreground"
                    }`}
                  >
                    {t(opt.label, opt.labelAr)}
                  </button>
                ))}
              </div>
              {headerType === "TEXT" && (
                <Input
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  placeholder={t("Header text…", "نص الترويسة...")}
                  dir="auto"
                  disabled={isLocked}
                />
              )}
              {["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType) && (
                <div className="space-y-1">
                  <Input
                    value={headerMediaUrl}
                    onChange={(e) => setHeaderMediaUrl(e.target.value)}
                    placeholder="https://cdn.example.com/image.jpg"
                    dir="ltr"
                    disabled={isLocked}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("Default media URL — agents can override when sending a broadcast", "رابط الوسائط الافتراضي — يمكن للوكلاء تغييره عند إرسال الحملة")}
                  </p>
                </div>
              )}
            </div>

            {/* Body */}
            <div className="space-y-1">
              <Label>{t("Body", "النص")}</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t("Hello {{name}}, your order {{order_id}} is ready!", "أهلاً {{name}}، طلبك {{order_id}} جاهز!")}
                className="min-h-[120px] resize-none"
                dir="auto"
                disabled={isLocked}
              />
              {detectedVars.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {detectedVars.map((v) => (
                    <Badge key={v} variant="secondary" className="text-xs">{`{{${v}}}`}</Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="space-y-2">
              {!showFooter ? (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setShowFooter(true)}
                  disabled={isLocked}
                >
                  + {t("Add Footer", "إضافة تذييل")}
                </button>
              ) : (
                <div className="space-y-1">
                  <Label>{t("Footer", "التذييل")}</Label>
                  <Input
                    value={footer}
                    onChange={(e) => setFooter(e.target.value)}
                    maxLength={60}
                    placeholder={t("e.g. Thank you for your business", "مثال: شكراً لتعاملك معنا")}
                    dir="auto"
                    disabled={isLocked}
                  />
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="space-y-2">
              {buttons.length > 0 && (
                <div className="space-y-2">
                  <Label>{t("Buttons", "الأزرار")}</Label>
                  {buttons.map((btn, idx) => (
                    <div key={idx} className="border rounded-md p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <select
                          className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                          value={btn.type}
                          onChange={(e) => updateButton(idx, { type: e.target.value as ButtonType, isDynamic: false })}
                          disabled={isLocked}
                        >
                          <option value="URL">URL</option>
                          <option value="PHONE_NUMBER">{t("Phone", "هاتف")}</option>
                          <option value="QUICK_REPLY">{t("Quick Reply", "رد سريع")}</option>
                        </select>
                        <Input
                          className="flex-1 h-7 text-xs"
                          value={btn.text}
                          onChange={(e) => updateButton(idx, { text: e.target.value })}
                          placeholder={t("Button label", "نص الزر")}
                          dir="auto"
                          disabled={isLocked}
                        />
                        <button type="button" onClick={() => removeButton(idx)} disabled={isLocked}>
                          <Trash2Icon className="size-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                      {btn.type !== "QUICK_REPLY" && (
                        <Input
                          className="text-xs"
                          value={btn.value}
                          onChange={(e) => updateButton(idx, { value: e.target.value })}
                          placeholder={btn.type === "URL" ? "https://shop.com/" : "+201234567890"}
                          dir="ltr"
                          disabled={isLocked}
                        />
                      )}
                      {btn.type === "URL" && (
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`dynamic-${idx}`}
                            checked={btn.isDynamic}
                            onCheckedChange={(v) => updateButton(idx, { isDynamic: v })}
                            disabled={isLocked}
                          />
                          <Label htmlFor={`dynamic-${idx}`} className="text-xs cursor-pointer">
                            {t("Dynamic suffix {{1}}", "لاحقة متغيرة {{1}}")}
                          </Label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!isLocked && buttons.length < 3 && (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                  onClick={addButton}
                >
                  <PlusIcon className="size-3" />
                  {t("Add Button", "إضافة زر")}
                </button>
              )}
            </div>
          </div>

          {/* ── Right: Live Preview ── */}
          <div className="flex flex-col items-center justify-start pt-2">
            <p className="text-xs text-muted-foreground mb-3">
              {t("Live Preview", "معاينة مباشرة")}
            </p>
            <WhatsAppTemplatePreview
              name={name || "template_name"}
              components={previewComponents}
            />
          </div>
        </div>

        {/* Action bar */}
        <div className="flex justify-between items-center pt-4 border-t mt-2">
          <Button variant="outline" onClick={onClose}>
            {t("Cancel", "إلغاء")}
          </Button>
          <div className="flex gap-2">
            {canSubmitToMeta && (
              <Button
                variant="outline"
                onClick={handleSubmitToMeta}
                disabled={submitting || saving}
              >
                {submitting && <Loader2Icon className="size-4 me-2 animate-spin" />}
                <SendIcon className="size-4 me-2" />
                {t("Submit to Meta", "إرسال لميتا")}
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!canSave || saving || submitting}
            >
              {saving && <Loader2Icon className="size-4 me-2 animate-spin" />}
              {t("Save as Draft", "حفظ كمسودة")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Fix any type errors before continuing.

- [ ] **Step 3: Commit**

```bash
git add components/broadcasts/broadcast-template-builder.tsx
git commit -m "feat(broadcast-templates): add BroadcastTemplateBuilder dialog with live preview"
```

---

## Task 7: `broadcast-templates-tab.tsx` — Grid + Empty State + Plan Banner

**Files:**
- Create: `components/broadcasts/broadcast-templates-tab.tsx`

- [ ] **Step 1: Create the tab**

```typescript
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PlusIcon } from "lucide-react";
import { BroadcastTemplateCard } from "@/components/broadcasts/broadcast-template-card";
import { BroadcastTemplateBuilder } from "@/components/broadcasts/broadcast-template-builder";
import { useT } from "@/lib/i18n/context";

export function BroadcastTemplatesTab() {
  const t = useT();
  const templates = useQuery(api.broadcastTemplates.list, {});
  const limitInfo = useQuery(api.broadcastTemplates.getLimitInfo, {});

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"broadcastTemplates"> | null>(null);

  const editingTemplate = templates?.find((t) => t._id === editingId) ?? null;

  function openCreate() {
    setEditingId(null);
    setBuilderOpen(true);
  }

  function openEdit(id: Id<"broadcastTemplates">) {
    setEditingId(id);
    setBuilderOpen(true);
  }

  const atLimit = limitInfo
    ? limitInfo.limit !== Infinity && limitInfo.count >= limitInfo.limit
    : false;

  return (
    <div className="space-y-4">
      {/* Plan banner */}
      {limitInfo && limitInfo.limit !== Infinity && (
        <div className={`rounded-lg px-4 py-3 text-sm border ${
          atLimit
            ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
            : "bg-muted/50 border-border text-muted-foreground"
        }`}>
          {atLimit
            ? t(
                `You've used all ${limitInfo.limit} broadcast templates on your plan. Upgrade to add more.`,
                `لقد استخدمت جميع القوالب الـ${limitInfo.limit} في خطتك. قم بالترقية لإضافة المزيد.`,
              )
            : t(
                `${limitInfo.count} / ${limitInfo.limit} broadcast templates used`,
                `${limitInfo.count} / ${limitInfo.limit} قالب بث مستخدم`,
              )}
        </div>
      )}

      <div className="flex items-center justify-end">
        <Button onClick={openCreate} disabled={atLimit}>
          <PlusIcon className="size-4 me-2" />
          {t("Add Broadcast Template", "إضافة قالب حملة")}
        </Button>
      </div>

      {templates === undefined ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed bg-muted/30">
          <h3 className="text-lg font-medium">
            {t("No Broadcast Templates Yet", "لا توجد قوالب حملات بعد")}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            {t(
              "Create a template with an image, video, or document header and URL buttons — then submit it to Meta for approval.",
              "أنشئ قالبًا بترويسة صورة أو فيديو وأزرار روابط، ثم أرسله لميتا للموافقة.",
            )}
          </p>
          <Button variant="outline" onClick={openCreate}>
            <PlusIcon className="size-4 me-2" />
            {t("Create your first broadcast template", "أنشئ أول قالب حملة")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <BroadcastTemplateCard
              key={tpl._id}
              template={tpl}
              onEdit={openEdit}
            />
          ))}
        </div>
      )}

      <BroadcastTemplateBuilder
        open={builderOpen}
        onClose={() => { setBuilderOpen(false); setEditingId(null); }}
        editingId={editingId}
        initialData={editingTemplate ? {
          channelId: editingTemplate.channelId,
          name: editingTemplate.name,
          title: editingTemplate.title,
          language: editingTemplate.language,
          category: editingTemplate.category,
          headerType: editingTemplate.headerType,
          headerText: editingTemplate.headerText,
          headerMediaUrl: editingTemplate.headerMediaUrl,
          body: editingTemplate.body,
          footer: editingTemplate.footer,
          buttons: editingTemplate.buttons as Array<{
            type: "URL" | "PHONE_NUMBER" | "QUICK_REPLY";
            text: string;
            value: string;
            isDynamic: boolean;
          }> | undefined,
          metaStatus: editingTemplate.metaStatus,
        } : null}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/broadcasts/broadcast-templates-tab.tsx
git commit -m "feat(broadcast-templates): add BroadcastTemplatesTab with grid and empty state"
```

---

## Task 8: Wire into `templates-settings.tsx`

**Files:**
- Modify: `components/settings/templates-settings.tsx`

- [ ] **Step 1: Add import at top of file**

After the existing imports in `components/settings/templates-settings.tsx`, add:

```typescript
import { BroadcastTemplatesTab } from "@/components/broadcasts/broadcast-templates-tab";
```

- [ ] **Step 2: Add the third tab trigger**

In the `<TabsList>` (currently has "my-templates" and "library"), add:

```tsx
<TabsTrigger value="broadcast-templates">
  📢 {t("Broadcast Templates", "قوالب الحملات")}
</TabsTrigger>
```

- [ ] **Step 3: Add the third tab content**

After the closing `</TabsContent>` of the "library" tab, add:

```tsx
<TabsContent value="broadcast-templates">
  <BroadcastTemplatesTab />
</TabsContent>
```

- [ ] **Step 4: Verify no type errors**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add components/settings/templates-settings.tsx
git commit -m "feat(broadcast-templates): add Broadcast Templates tab to templates settings"
```

---

## Task 9: Wire Approved Templates into Broadcasts Wizard

**Files:**
- Modify: `components/broadcasts/create-broadcast-wizard.tsx`

- [ ] **Step 1: Read the current wizard structure**

Read `components/broadcasts/create-broadcast-wizard.tsx` to locate:
- The step where the user picks a Meta template (look for `metaTemplates` or `listForChannel`)
- The state variables for the selected template
- Where variable fill-in fields are rendered

- [ ] **Step 2: Add broadcast templates query and state**

Near the top of the wizard component (alongside existing `useQuery` calls), add:

```typescript
const approvedBroadcastTemplates = useQuery(api.broadcastTemplates.list, { metaStatus: "approved" });

// New state for broadcast template source picker
const [templateSource, setTemplateSource] = useState<"meta" | "broadcast">("meta");
const [selectedBroadcastTemplateId, setSelectedBroadcastTemplateId] = useState<Id<"broadcastTemplates"> | null>(null);
const [mediaUrlOverride, setMediaUrlOverride] = useState("");
const [urlSuffixes, setUrlSuffixes] = useState<Record<string, string>>({});
```

- [ ] **Step 3: Add source picker UI in the template selection step**

In the template selection step, before the existing template list, add:

```tsx
{/* Source picker */}
<div className="flex gap-2 mb-4">
  <button
    type="button"
    onClick={() => setTemplateSource("meta")}
    className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${
      templateSource === "meta"
        ? "border-primary bg-primary text-primary-foreground"
        : "border-input bg-background hover:bg-muted"
    }`}
  >
    {t("Meta Templates (synced)", "قوالب ميتا (متزامنة)")}
  </button>
  <button
    type="button"
    onClick={() => setTemplateSource("broadcast")}
    className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${
      templateSource === "broadcast"
        ? "border-primary bg-primary text-primary-foreground"
        : "border-input bg-background hover:bg-muted"
    }`}
  >
    📢 {t("Broadcast Templates (WABDesk)", "قوالب الحملات (WABDesk)")}
  </button>
</div>

{/* Broadcast templates list */}
{templateSource === "broadcast" && (
  <div className="space-y-2">
    {!approvedBroadcastTemplates?.length ? (
      <p className="text-sm text-muted-foreground text-center py-8">
        {t(
          "No approved broadcast templates yet. Go to Settings → Templates → Broadcast Templates to create one.",
          "لا توجد قوالب حملات معتمدة بعد. اذهب إلى الإعدادات → القوالب → قوالب الحملات لإنشاء واحد.",
        )}
      </p>
    ) : (
      approvedBroadcastTemplates.map((tpl) => (
        <button
          key={tpl._id}
          type="button"
          onClick={() => {
            setSelectedBroadcastTemplateId(tpl._id);
            setMediaUrlOverride(tpl.headerMediaUrl ?? "");
            setUrlSuffixes({});
          }}
          className={`w-full text-start rounded-lg border p-3 transition-colors ${
            selectedBroadcastTemplateId === tpl._id
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground"
          }`}
        >
          <div className="font-medium text-sm">{tpl.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {tpl.language.toUpperCase()} · {tpl.category} · {tpl.headerType}
          </div>
        </button>
      ))
    )}
  </div>
)}
```

- [ ] **Step 4: Add media override and dynamic URL suffix fields**

Below the broadcast template selection, add:

```tsx
{templateSource === "broadcast" && selectedBroadcastTemplateId && (() => {
  const tpl = approvedBroadcastTemplates?.find((t) => t._id === selectedBroadcastTemplateId);
  if (!tpl) return null;
  const hasDynamicBtn = tpl.buttons?.some((b) => b.isDynamic);
  const hasMedia = ["IMAGE", "VIDEO", "DOCUMENT"].includes(tpl.headerType);

  return (
    <div className="space-y-3 mt-4 border-t pt-4">
      {hasMedia && (
        <div className="space-y-1">
          <label className="text-sm font-medium">
            {t("Media URL", "رابط الوسائط")}
          </label>
          <Input
            value={mediaUrlOverride}
            onChange={(e) => setMediaUrlOverride(e.target.value)}
            placeholder="https://cdn.example.com/product.jpg"
            dir="ltr"
          />
          <p className="text-xs text-muted-foreground">
            {t("Leave unchanged to use the template default", "اتركه كما هو لاستخدام الافتراضي")}
          </p>
        </div>
      )}
      {hasDynamicBtn && tpl.buttons?.filter((b) => b.isDynamic).map((btn, idx) => (
        <div key={idx} className="space-y-1">
          <label className="text-sm font-medium">
            {t(`URL suffix for "${btn.text}"`, `لاحقة رابط "${btn.text}"`)}
          </label>
          <Input
            value={urlSuffixes[btn.text] ?? ""}
            onChange={(e) => setUrlSuffixes((prev) => ({ ...prev, [btn.text]: e.target.value }))}
            placeholder="bags/leather-tote"
            dir="ltr"
          />
          <p className="text-xs text-muted-foreground">
            {t("Final URL:", "الرابط النهائي:")} {btn.value}{urlSuffixes[btn.text] ?? ""}
          </p>
        </div>
      ))}
    </div>
  );
})()}
```

- [ ] **Step 5: Verify no type errors**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Fix any type errors.

- [ ] **Step 6: Commit**

```bash
git add components/broadcasts/create-broadcast-wizard.tsx
git commit -m "feat(broadcast-templates): wire approved templates into broadcast wizard"
```

---

## Task 10: Manual QA Checklist

Start the dev server and verify end-to-end:

```bash
npm run dev
```

- [ ] Navigate to **Settings → Templates → Broadcast Templates** — tab appears
- [ ] Click "Add Broadcast Template" — builder dialog opens
- [ ] Fill in title, name auto-generates as slug, channel selector shows connected channels
- [ ] Select header type IMAGE — URL input appears with helper text
- [ ] Type body with `{{name}}` — variable badge appears below; preview updates in real time
- [ ] Add a URL button with dynamic suffix toggle — preview shows button
- [ ] Click "Save as Draft" — card appears in grid with "Draft" gray badge
- [ ] Click edit on the draft — form pre-fills with saved data
- [ ] Click "Submit to Meta" — status transitions to "Pending Review" amber badge
- [ ] Card shows "Check Status" button when pending; edit and delete are disabled with tooltip
- [ ] Navigate to **Broadcasts → New** — template source picker appears
- [ ] Select "Broadcast Templates" — approved templates listed (or empty state if none approved yet)
- [ ] Select an approved template with image header — media URL field appears pre-filled
- [ ] Select an approved template with dynamic URL button — suffix field appears with live URL preview
- [ ] Plan limit banner shows correct count / limit in Broadcast Templates tab

---

## Spec Coverage Cross-Check

| Spec requirement | Task |
|---|---|
| `broadcastTemplates` table with all fields | Task 1 |
| Plan limits: Free 2, Starter 6, Growth 20, Business ∞ | Task 2 |
| list, create, update, remove mutations | Task 3 |
| Submit to Meta (POST) | Task 4 |
| syncStatus (GET) + cron every 30 min | Task 4 |
| In-app notification on approval | Task 4 |
| Template card with status badge + check-status button | Task 5 |
| Lock edit/delete when pending/approved | Task 5 |
| Rejection reason shown on card | Task 5 |
| Builder dialog: basic info, header, body, footer, buttons | Task 6 |
| Live WhatsApp preview in builder | Task 6 |
| "Save as Draft" + "Submit to Meta" buttons | Task 6 |
| Read-only mode when pending/approved | Task 6 |
| Grid + empty state + plan banner | Task 7 |
| Third tab in Templates settings | Task 8 |
| Source picker in Broadcasts wizard | Task 9 |
| Media URL override at broadcast time | Task 9 |
| Dynamic URL suffix at broadcast time | Task 9 |
