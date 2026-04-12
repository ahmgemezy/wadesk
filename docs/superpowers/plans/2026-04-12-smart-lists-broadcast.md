# Smart Lists & Broadcast Campaigns — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build dynamic smart contact lists filtered by country/city/stage/tags, with a 3-step broadcast wizard to send Meta WhatsApp templates to a list audience.

**Architecture:** Hybrid — filter rules stored in a new `contactLists` table, evaluated live via in-memory post-filtering for display, and snapshotted into `broadcasts.recipientSnapshot` at send time. Phone-to-country auto-detection uses `libphonenumber-js` (already installed) on contact create/import.

**Tech Stack:** Convex (mutations, queries, actions), Next.js 15 App Router, shadcn/ui, Tailwind CSS v4, `libphonenumber-js`, Meta Graph API v21.0

---

## File Map

**Create:**
- `lib/phoneGeo.ts` — phone prefix → ISO country code + display name
- `convex/contactLists.ts` — CRUD + live filter query + stats query
- `convex/broadcasts.ts` — create mutation + send action + fetchTemplates action
- `app/(dashboard)/lists/page.tsx` — server component
- `app/(dashboard)/lists/[id]/page.tsx` — server component
- `app/(dashboard)/broadcasts/page.tsx` — server component
- `components/lists/lists-page.tsx` — client, card grid
- `components/lists/list-card.tsx` — single list card
- `components/lists/create-list-dialog.tsx` — side-panel filter builder + live preview
- `components/lists/list-detail.tsx` — detail with stats breakdown
- `components/broadcasts/broadcasts-page.tsx` — client, broadcast list
- `components/broadcasts/create-broadcast-wizard.tsx` — 3-step wizard

**Modify:**
- `convex/schema.ts` — add `contactLists` and `broadcasts` tables
- `convex/lib/planLimits.ts` — add list limits and broadcast access check
- `convex/contacts.ts` — auto-derive `country` from phone in `create` mutation
- `convex/contactsImportHelpers.ts` — auto-derive `country` from phone in `importBatchChunk`
- `lib/shell/nav-config.ts` — add Lists and Broadcasts nav entries

---

## Task 1: Schema — Add `contactLists` and `broadcasts` Tables

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Add contactLists table to schema**

Open `convex/schema.ts`. After the `contacts` table definition (after the `.searchIndex(...)` line, before `conversations`), add:

```typescript
  contactLists: defineTable({
    tenantId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    filters: v.object({
      countries: v.optional(v.array(v.string())),
      cities: v.optional(v.array(v.string())),
      stages: v.optional(v.array(v.union(
        v.literal("lead"),
        v.literal("prospect"),
        v.literal("customer"),
        v.literal("retained"),
        v.literal("churned"),
      ))),
      tags: v.optional(v.array(v.string())),
    }),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"]),
```

- [ ] **Step 2: Add broadcasts table to schema**

In the same file, after the `contactLists` table definition, add:

```typescript
  broadcasts: defineTable({
    tenantId: v.string(),
    name: v.string(),
    listId: v.id("contactLists"),
    channelId: v.id("channels"),
    templateName: v.string(),
    templateLanguage: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("failed"),
    ),
    recipientSnapshot: v.array(v.id("contacts")),
    recipientCount: v.number(),
    sentCount: v.optional(v.number()),
    failedCount: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_status", ["tenantId", "status"]),
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If errors appear, they will reference missing generated types — run `npx convex dev` in a separate terminal to regenerate `_generated/` types first.

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(schema): add contactLists and broadcasts tables"
```

---

## Task 2: Plan Limits — List Limits and Broadcast Access

**Files:**
- Modify: `convex/lib/planLimits.ts`

- [ ] **Step 1: Add list limits and broadcast access to planLimits.ts**

Open `convex/lib/planLimits.ts`. Add the following at the end of the file:

```typescript
const LIST_LIMITS: Record<Plan, number> = {
  free: 3,
  starter: 10,
  growth: Infinity,
  business: Infinity,
};

export function assertListLimitNotReached(
  currentCount: number,
  plan: Plan,
): void {
  const limit = LIST_LIMITS[plan] ?? LIST_LIMITS.free;
  if (currentCount >= limit) {
    throw new ConvexError({
      message: "PLAN_LIMIT_REACHED",
      data: { plan, limit, feature: "contactLists" },
    });
  }
}

export function assertBroadcastsAllowed(plan: Plan): void {
  if (plan === "free") {
    throw new ConvexError({
      message: "PLAN_LIMIT_REACHED",
      data: { reason: "Broadcasts are not available on the Free plan. Upgrade to Starter or above." },
    });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add convex/lib/planLimits.ts
git commit -m "feat(planLimits): add list limits and broadcast access check"
```

---

## Task 3: Phone Geo Utility

**Files:**
- Create: `lib/phoneGeo.ts`

- [ ] **Step 1: Create lib/phoneGeo.ts**

```typescript
import { parsePhoneNumber, ParseError } from "libphonenumber-js";

const COUNTRY_NAMES: Record<string, { ar: string; en: string }> = {
  EG: { ar: "مصر", en: "Egypt" },
  SA: { ar: "السعودية", en: "Saudi Arabia" },
  AE: { ar: "الإمارات", en: "UAE" },
  KW: { ar: "الكويت", en: "Kuwait" },
  QA: { ar: "قطر", en: "Qatar" },
  BH: { ar: "البحرين", en: "Bahrain" },
  OM: { ar: "عُمان", en: "Oman" },
  JO: { ar: "الأردن", en: "Jordan" },
  LB: { ar: "لبنان", en: "Lebanon" },
  MA: { ar: "المغرب", en: "Morocco" },
  DZ: { ar: "الجزائر", en: "Algeria" },
  TN: { ar: "تونس", en: "Tunisia" },
  IQ: { ar: "العراق", en: "Iraq" },
  LY: { ar: "ليبيا", en: "Libya" },
  SD: { ar: "السودان", en: "Sudan" },
  TR: { ar: "تركيا", en: "Turkey" },
  US: { ar: "الولايات المتحدة", en: "United States" },
  GB: { ar: "المملكة المتحدة", en: "United Kingdom" },
  DE: { ar: "ألمانيا", en: "Germany" },
  FR: { ar: "فرنسا", en: "France" },
};

export type GeoResult = {
  countryIso: string;
  countryAr: string;
  countryEn: string;
};

/**
 * Derives country from an E.164 phone number (e.g. "+201012345678" → EG).
 * Returns null if the phone is unparseable or country is unknown.
 */
export function getCountryFromPhone(phone: string): GeoResult | null {
  try {
    const parsed = parsePhoneNumber(phone);
    if (!parsed || !parsed.country) return null;
    const iso = parsed.country;
    const names = COUNTRY_NAMES[iso];
    return {
      countryIso: iso,
      countryAr: names?.ar ?? iso,
      countryEn: names?.en ?? iso,
    };
  } catch (e) {
    if (e instanceof ParseError) return null;
    return null;
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/phoneGeo.ts
git commit -m "feat(lib): add phone-to-country geo utility"
```

---

## Task 4: Wire PhoneGeo into Contact Create and Import

**Files:**
- Modify: `convex/contacts.ts`
- Modify: `convex/contactsImportHelpers.ts`

- [ ] **Step 1: Update contacts.ts create mutation**

Open `convex/contacts.ts`. In the `create` mutation handler, find the `ctx.db.insert("contacts", { ... })` call and change it to auto-derive country from the phone number when not provided by the caller:

Add this import at the top of the file (after existing imports):

```typescript
import { getCountryFromPhone } from "../lib/phoneGeo";
```

Find the `return ctx.db.insert("contacts", {` block inside the `create` handler and replace the `country: args.country,` line so country falls back to geo-detection:

```typescript
    const geoCountry = args.country ?? getCountryFromPhone(args.phone)?.countryIso ?? undefined;

    return ctx.db.insert("contacts", {
      tenantId,
      phone: args.phone,
      displayName: args.customName ?? args.phone,
      customName: args.customName,
      tags: args.tags ?? [],
      notes: args.notes,
      country: geoCountry,
      city: args.city,
      spent: args.spent,
      category: args.category,
      source: "manual",
      isArchived: false,
      firstSeenAt: Date.now(),
      lastSeenAt: Date.now(),
      createdAt: Date.now(),
    });
```

- [ ] **Step 2: Update contactsImportHelpers.ts importBatchChunk**

Open `convex/contactsImportHelpers.ts`. Add the import at the top:

```typescript
import { getCountryFromPhone } from "../lib/phoneGeo";
```

Find the `await ctx.db.insert("contacts", {` block and add country auto-detection:

```typescript
      const geoCountry = getCountryFromPhone(row.phone)?.countryIso ?? undefined;

      await ctx.db.insert("contacts", {
        tenantId: args.tenantId,
        phone: row.phone,
        displayName: row.name ?? row.phone,
        customName: row.name,
        tags: row.tags ?? [],
        notes: row.notes,
        country: geoCountry,
        source: "import",
        isArchived: false,
        firstSeenAt: Date.now(),
        lastSeenAt: Date.now(),
        createdAt: Date.now(),
      });
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add convex/contacts.ts convex/contactsImportHelpers.ts
git commit -m "feat(contacts): auto-detect country from phone on create and import"
```

---

## Task 5: contactLists Convex Functions

**Files:**
- Create: `convex/contactLists.ts`

- [ ] **Step 1: Create convex/contactLists.ts**

```typescript
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import {
  getCallerIdentity,
  getCallerRole,
  assertAdminOrSupervisor,
  assertAdmin,
} from "./lib/auth";
import { assertListLimitNotReached } from "./lib/planLimits";
import type { Doc } from "./_generated/dataModel";

type Stage = "lead" | "prospect" | "customer" | "retained" | "churned";

type ListFilters = {
  countries?: string[];
  cities?: string[];
  stages?: Stage[];
  tags?: string[];
};

/**
 * Returns true if a contact matches the given filter rules.
 * AND across filter types, OR within each type.
 */
function contactMatchesFilters(
  contact: Doc<"contacts">,
  filters: ListFilters,
): boolean {
  if (filters.countries && filters.countries.length > 0) {
    if (!contact.country || !filters.countries.includes(contact.country)) {
      return false;
    }
  }
  if (filters.cities && filters.cities.length > 0) {
    if (!contact.city || !filters.cities.includes(contact.city)) {
      return false;
    }
  }
  if (filters.stages && filters.stages.length > 0) {
    if (!contact.stage || !filters.stages.includes(contact.stage as Stage)) {
      return false;
    }
  }
  if (filters.tags && filters.tags.length > 0) {
    const hasMatchingTag = filters.tags.some((tag) =>
      contact.tags.includes(tag),
    );
    if (!hasMatchingTag) return false;
  }
  return true;
}

export const listForTenant = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId } = await getCallerIdentity(ctx);
    return ctx.db
      .query("contactLists")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { listId: v.id("contactLists") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const list = await ctx.db.get(args.listId);
    if (!list || list.tenantId !== tenantId) return null;
    return list;
  },
});

export const getMatchingContacts = query({
  args: {
    listId: v.id("contactLists"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const list = await ctx.db.get(args.listId);
    if (!list || list.tenantId !== tenantId) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    // Fetch all non-archived tenant contacts, post-filter in memory
    const allContacts = await ctx.db
      .query("contacts")
      .withIndex("by_tenant_archived", (q) =>
        q.eq("tenantId", tenantId).eq("isArchived", false),
      )
      .collect();

    const matching = allContacts.filter((c) =>
      contactMatchesFilters(c, list.filters),
    );

    // Manual pagination
    const { numItems, cursor } = args.paginationOpts;
    const startIndex = cursor ? parseInt(cursor, 10) : 0;
    const page = matching.slice(startIndex, startIndex + numItems);
    const nextCursor = startIndex + numItems < matching.length
      ? String(startIndex + numItems)
      : null;

    return {
      page,
      isDone: nextCursor === null,
      continueCursor: nextCursor ?? "",
    };
  },
});

export const getStats = query({
  args: { listId: v.id("contactLists") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const list = await ctx.db.get(args.listId);
    if (!list || list.tenantId !== tenantId) return null;

    const allContacts = await ctx.db
      .query("contacts")
      .withIndex("by_tenant_archived", (q) =>
        q.eq("tenantId", tenantId).eq("isArchived", false),
      )
      .collect();

    const matching = allContacts.filter((c) =>
      contactMatchesFilters(c, list.filters),
    );

    const stageBreakdown: Record<string, number> = {};
    const cityBreakdown: Record<string, number> = {};
    const tagBreakdown: Record<string, number> = {};

    for (const contact of matching) {
      // Stage
      const stage = contact.stage ?? "unknown";
      stageBreakdown[stage] = (stageBreakdown[stage] ?? 0) + 1;

      // City
      const city = contact.city ?? "unknown";
      cityBreakdown[city] = (cityBreakdown[city] ?? 0) + 1;

      // Tags
      for (const tag of contact.tags) {
        tagBreakdown[tag] = (tagBreakdown[tag] ?? 0) + 1;
      }
    }

    return {
      total: matching.length,
      stageBreakdown,
      cityBreakdown,
      tagBreakdown,
    };
  },
});

// Preview count only — used by create dialog live preview
export const previewCount = query({
  args: {
    filters: v.object({
      countries: v.optional(v.array(v.string())),
      cities: v.optional(v.array(v.string())),
      stages: v.optional(v.array(v.union(
        v.literal("lead"),
        v.literal("prospect"),
        v.literal("customer"),
        v.literal("retained"),
        v.literal("churned"),
      ))),
      tags: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);

    const allContacts = await ctx.db
      .query("contacts")
      .withIndex("by_tenant_archived", (q) =>
        q.eq("tenantId", tenantId).eq("isArchived", false),
      )
      .collect();

    const matching = allContacts.filter((c) =>
      contactMatchesFilters(c, args.filters),
    );

    const stageBreakdown: Record<string, number> = {};
    for (const contact of matching) {
      const stage = contact.stage ?? "unknown";
      stageBreakdown[stage] = (stageBreakdown[stage] ?? 0) + 1;
    }

    return { count: matching.length, stageBreakdown };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    filters: v.object({
      countries: v.optional(v.array(v.string())),
      cities: v.optional(v.array(v.string())),
      stages: v.optional(v.array(v.union(
        v.literal("lead"),
        v.literal("prospect"),
        v.literal("customer"),
        v.literal("retained"),
        v.literal("churned"),
      ))),
      tags: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    const role = await getCallerRole(ctx);
    assertAdminOrSupervisor(role);

    // Enforce plan limits
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_org_id", (q) => q.eq("orgId", tenantId))
      .first();
    const plan = (tenant?.plan ?? "free") as import("./lib/planLimits").Plan;

    const currentCount = await ctx.db
      .query("contactLists")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect()
      .then((r) => r.length);

    assertListLimitNotReached(currentCount, plan);

    const now = Date.now();
    return ctx.db.insert("contactLists", {
      tenantId,
      name: args.name,
      description: args.description,
      filters: args.filters,
      createdBy: callerId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    listId: v.id("contactLists"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    filters: v.optional(v.object({
      countries: v.optional(v.array(v.string())),
      cities: v.optional(v.array(v.string())),
      stages: v.optional(v.array(v.union(
        v.literal("lead"),
        v.literal("prospect"),
        v.literal("customer"),
        v.literal("retained"),
        v.literal("churned"),
      ))),
      tags: v.optional(v.array(v.string())),
    })),
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const role = await getCallerRole(ctx);
    assertAdminOrSupervisor(role);

    const list = await ctx.db.get(args.listId);
    if (!list || list.tenantId !== tenantId) {
      throw new Error("List not found");
    }

    const patch: Partial<Doc<"contactLists">> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.description !== undefined) patch.description = args.description;
    if (args.filters !== undefined) patch.filters = args.filters;

    await ctx.db.patch(args.listId, patch);
  },
});

export const remove = mutation({
  args: { listId: v.id("contactLists") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const list = await ctx.db.get(args.listId);
    if (!list || list.tenantId !== tenantId) {
      throw new Error("List not found");
    }

    await ctx.db.delete(args.listId);
  },
});
```

- [ ] **Step 2: Check for tenants table index name**

The `create` mutation queries the `tenants` table. Verify the correct index name by checking `convex/schema.ts` for the tenants table definition. If the index is named differently than `by_org_id`, update the query accordingly.

Run:
```bash
grep -n "tenants\|by_org_id\|orgId" convex/schema.ts | head -20
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add convex/contactLists.ts
git commit -m "feat(convex): add contactLists queries and mutations"
```

---

## Task 6: Broadcasts Convex Functions

**Files:**
- Create: `convex/broadcasts.ts`

- [ ] **Step 1: Create convex/broadcasts.ts**

```typescript
"use node";

import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { ConvexError } from "convex/values";
import { internal, api } from "./_generated/api";
import {
  getCallerIdentity,
  getCallerRole,
  assertAdminOrSupervisor,
} from "./lib/auth";
import { assertBroadcastsAllowed } from "./lib/planLimits";
import type { Doc } from "./_generated/dataModel";

const META_BASE = "https://graph.facebook.com/v21.0";

export const listForTenant = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId } = await getCallerIdentity(ctx);
    return ctx.db
      .query("broadcasts")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    listId: v.id("contactLists"),
    channelId: v.id("channels"),
    templateName: v.string(),
    templateLanguage: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    const role = await getCallerRole(ctx);
    assertAdminOrSupervisor(role);

    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_org_id", (q) => q.eq("orgId", tenantId))
      .first();
    const plan = (tenant?.plan ?? "free") as import("./lib/planLimits").Plan;
    assertBroadcastsAllowed(plan);

    // Validate list belongs to tenant
    const list = await ctx.db.get(args.listId);
    if (!list || list.tenantId !== tenantId) {
      throw new ConvexError("List not found");
    }

    // Validate channel belongs to tenant
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) {
      throw new ConvexError("Channel not found");
    }

    const now = Date.now();
    return ctx.db.insert("broadcasts", {
      tenantId,
      name: args.name,
      listId: args.listId,
      channelId: args.channelId,
      templateName: args.templateName,
      templateLanguage: args.templateLanguage,
      status: "draft",
      recipientSnapshot: [],
      recipientCount: 0,
      createdBy: callerId,
      createdAt: now,
    });
  },
});

export const send = action({
  args: { broadcastId: v.id("broadcasts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHORIZED");
    if (!identity.orgId) throw new ConvexError("NO_ORG");
    const tenantId = identity.orgId;

    // Load broadcast
    const broadcast = await ctx.runQuery(internal.broadcasts.getByIdInternal, {
      broadcastId: args.broadcastId,
      tenantId,
    });
    if (!broadcast) throw new ConvexError("Broadcast not found");
    if (broadcast.status !== "draft") {
      throw new ConvexError("Broadcast already sent or in progress");
    }

    // Load channel for phoneNumberId and token
    const channel = await ctx.runQuery(internal.broadcasts.getChannelInternal, {
      channelId: broadcast.channelId,
      tenantId,
    });
    if (!channel) throw new ConvexError("Channel not found");

    // Snapshot matching contacts from list
    const list = await ctx.runQuery(internal.broadcasts.getListInternal, {
      listId: broadcast.listId,
      tenantId,
    });
    if (!list) throw new ConvexError("List not found");

    const allContacts: Doc<"contacts">[] = await ctx.runQuery(
      internal.broadcasts.getContactsForList,
      { tenantId, filters: list.filters },
    );

    const recipientSnapshot = allContacts.map((c) => c._id);

    // Mark as sending + store snapshot
    await ctx.runMutation(internal.broadcasts.updateStatus, {
      broadcastId: args.broadcastId,
      status: "sending",
      recipientSnapshot,
      recipientCount: recipientSnapshot.length,
    });

    const token = process.env.META_SYSTEM_USER_TOKEN;
    if (!token) throw new ConvexError("META_SYSTEM_USER_TOKEN not set");

    let sentCount = 0;
    let failedCount = 0;

    for (const contact of allContacts) {
      try {
        const res = await fetch(
          `${META_BASE}/${channel.phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: contact.phone,
              type: "template",
              template: {
                name: broadcast.templateName,
                language: { code: broadcast.templateLanguage },
              },
            }),
          },
        );

        if (res.ok) {
          sentCount++;
        } else {
          failedCount++;
        }
      } catch {
        failedCount++;
      }
    }

    await ctx.runMutation(internal.broadcasts.updateStatus, {
      broadcastId: args.broadcastId,
      status: failedCount === allContacts.length && allContacts.length > 0
        ? "failed"
        : "sent",
      recipientSnapshot,
      recipientCount: recipientSnapshot.length,
      sentCount,
      failedCount,
      sentAt: Date.now(),
    });
  },
});

// Fetch approved templates for a channel's WABA from Meta
export const fetchTemplates = action({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHORIZED");
    if (!identity.orgId) throw new ConvexError("NO_ORG");
    const tenantId = identity.orgId;

    const channel = await ctx.runQuery(internal.broadcasts.getChannelInternal, {
      channelId: args.channelId,
      tenantId,
    });
    if (!channel) throw new ConvexError("Channel not found");

    const token = process.env.META_SYSTEM_USER_TOKEN;
    if (!token) throw new ConvexError("META_SYSTEM_USER_TOKEN not set");

    const res = await fetch(
      `${META_BASE}/${channel.wabaId}/message_templates?fields=name,language,status,components&limit=100`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!res.ok) {
      throw new ConvexError("Failed to fetch templates from Meta");
    }

    const data = await res.json() as {
      data: Array<{
        name: string;
        language: string;
        status: string;
        components: unknown[];
      }>;
    };

    // Return only APPROVED templates
    return data.data.filter((t) => t.status === "APPROVED");
  },
});
```

- [ ] **Step 2: Add internal queries/mutations to broadcasts.ts**

Append these internal helpers at the end of `convex/broadcasts.ts`:

```typescript
import { internalQuery, internalMutation } from "./_generated/server";

export const getByIdInternal = internalQuery({
  args: { broadcastId: v.id("broadcasts"), tenantId: v.string() },
  handler: async (ctx, args) => {
    const broadcast = await ctx.db.get(args.broadcastId);
    if (!broadcast || broadcast.tenantId !== args.tenantId) return null;
    return broadcast;
  },
});

export const getChannelInternal = internalQuery({
  args: { channelId: v.id("channels"), tenantId: v.string() },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== args.tenantId) return null;
    return channel;
  },
});

export const getListInternal = internalQuery({
  args: { listId: v.id("contactLists"), tenantId: v.string() },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list || list.tenantId !== args.tenantId) return null;
    return list;
  },
});

export const getContactsForList = internalQuery({
  args: {
    tenantId: v.string(),
    filters: v.object({
      countries: v.optional(v.array(v.string())),
      cities: v.optional(v.array(v.string())),
      stages: v.optional(v.array(v.union(
        v.literal("lead"),
        v.literal("prospect"),
        v.literal("customer"),
        v.literal("retained"),
        v.literal("churned"),
      ))),
      tags: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const allContacts = await ctx.db
      .query("contacts")
      .withIndex("by_tenant_archived", (q) =>
        q.eq("tenantId", args.tenantId).eq("isArchived", false),
      )
      .collect();

    return allContacts.filter((contact) => {
      if (args.filters.countries && args.filters.countries.length > 0) {
        if (!contact.country || !args.filters.countries.includes(contact.country)) return false;
      }
      if (args.filters.cities && args.filters.cities.length > 0) {
        if (!contact.city || !args.filters.cities.includes(contact.city)) return false;
      }
      if (args.filters.stages && args.filters.stages.length > 0) {
        if (!contact.stage || !args.filters.stages.includes(contact.stage as "lead" | "prospect" | "customer" | "retained" | "churned")) return false;
      }
      if (args.filters.tags && args.filters.tags.length > 0) {
        if (!args.filters.tags.some((tag) => contact.tags.includes(tag))) return false;
      }
      return true;
    });
  },
});

export const updateStatus = internalMutation({
  args: {
    broadcastId: v.id("broadcasts"),
    status: v.union(
      v.literal("draft"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("failed"),
    ),
    recipientSnapshot: v.array(v.id("contacts")),
    recipientCount: v.number(),
    sentCount: v.optional(v.number()),
    failedCount: v.optional(v.number()),
    sentAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {
      status: args.status,
      recipientSnapshot: args.recipientSnapshot,
      recipientCount: args.recipientCount,
    };
    if (args.sentCount !== undefined) patch.sentCount = args.sentCount;
    if (args.failedCount !== undefined) patch.failedCount = args.failedCount;
    if (args.sentAt !== undefined) patch.sentAt = args.sentAt;
    await ctx.db.patch(args.broadcastId, patch);
  },
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add convex/broadcasts.ts
git commit -m "feat(convex): add broadcasts queries, mutations, and send action"
```

---

## Task 7: Navigation — Add Lists and Broadcasts

**Files:**
- Modify: `lib/shell/nav-config.ts`

- [ ] **Step 1: Add Lists and Broadcasts nav items**

Open `lib/shell/nav-config.ts`. After the Contacts entry (around line 13), insert two new items:

```typescript
  {
    href: "/contacts",
    labelAr: "جهات الاتصال",
    labelEn: "Contacts",
    icon: "Contact2",
    minRole: "agent",
  },
  {
    href: "/lists",
    labelAr: "القوائم",
    labelEn: "Lists",
    icon: "List",
    minRole: "supervisor",
  },
  {
    href: "/broadcasts",
    labelAr: "الحملات",
    labelEn: "Broadcasts",
    icon: "Megaphone",
    minRole: "supervisor",
  },
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If `List` or `Megaphone` icons are not in the NavItem icon type, check `lib/shell/types.ts` and add them to the icon union.

- [ ] **Step 3: Commit**

```bash
git add lib/shell/nav-config.ts
git commit -m "feat(nav): add Lists and Broadcasts navigation items"
```

---

## Task 8: Lists Page — Card Grid

**Files:**
- Create: `app/(dashboard)/lists/page.tsx`
- Create: `components/lists/list-card.tsx`
- Create: `components/lists/lists-page.tsx`

- [ ] **Step 1: Create app/(dashboard)/lists/page.tsx**

```typescript
import { cookies } from "next/headers";
import { ListsPage } from "@/components/lists/lists-page";

export const dynamic = "force-dynamic";

export default async function ListsRoute() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div dir={dir} className="h-full flex flex-col">
      <ListsPage locale={locale} />
    </div>
  );
}
```

- [ ] **Step 2: Create components/lists/list-card.tsx**

```typescript
"use client";

import { useRouter } from "next/navigation";
import type { Doc } from "@/convex/_generated/dataModel";

const STAGE_COLORS: Record<string, string> = {
  lead: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  prospect: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  customer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  retained: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  churned: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
  unknown: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const STAGE_LABELS: Record<string, { ar: string; en: string }> = {
  lead: { ar: "عميل محتمل", en: "Lead" },
  prospect: { ar: "مرشح", en: "Prospect" },
  customer: { ar: "عميل", en: "Customer" },
  retained: { ar: "عميل دائم", en: "Retained" },
  churned: { ar: "مفقود", en: "Churned" },
  unknown: { ar: "غير محدد", en: "Unknown" },
};

type Props = {
  list: Doc<"contactLists">;
  stats: {
    total: number;
    stageBreakdown: Record<string, number>;
  } | null;
  locale: "ar" | "en";
};

export function ListCard({ list, stats, locale }: Props) {
  const router = useRouter();

  const filterSummary = [
    list.filters.countries?.length
      ? `${locale === "ar" ? "الدولة" : "Country"}: ${list.filters.countries.join(", ")}`
      : null,
    list.filters.cities?.length
      ? `${locale === "ar" ? "المدينة" : "City"}: ${list.filters.cities.join(", ")}`
      : null,
    list.filters.stages?.length
      ? `${locale === "ar" ? "المرحلة" : "Stage"}: ${list.filters.stages.map((s) => STAGE_LABELS[s]?.[locale] ?? s).join(", ")}`
      : null,
    list.filters.tags?.length
      ? `${locale === "ar" ? "الوسوم" : "Tags"}: ${list.filters.tags.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join(" • ");

  const topStages = stats
    ? Object.entries(stats.stageBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
    : [];

  return (
    <button
      type="button"
      onClick={() => router.push(`/lists/${list._id}`)}
      className="w-full text-start bg-card border rounded-xl p-4 hover:border-primary/50 hover:shadow-sm transition-all flex flex-col gap-3"
    >
      <div>
        <div className="font-semibold text-sm">{list.name}</div>
        {filterSummary && (
          <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {filterSummary}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-primary">
          {stats?.total ?? "—"}
        </span>
        <span className="text-xs text-muted-foreground">
          {locale === "ar" ? "جهة اتصال" : "contacts"}
        </span>
      </div>

      {topStages.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {topStages.map(([stage, count]) => (
            <span
              key={stage}
              className={`text-xs px-2 py-0.5 rounded-full ${STAGE_COLORS[stage] ?? STAGE_COLORS.unknown}`}
            >
              {STAGE_LABELS[stage]?.[locale] ?? stage} {count}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
```

- [ ] **Step 3: Create components/lists/lists-page.tsx**

```typescript
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ListCard } from "./list-card";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { CreateListDialog } from "./create-list-dialog";
import { Skeleton } from "@/components/ui/skeleton";

const t = {
  ar: {
    title: "القوائم",
    newList: "قائمة جديدة",
    empty: "لا توجد قوائم بعد",
    emptyHint: "أنشئ قائمتك الأولى لتقسيم جهات الاتصال",
  },
  en: {
    title: "Lists",
    newList: "New List",
    empty: "No lists yet",
    emptyHint: "Create your first list to segment contacts",
  },
};

type StatsMap = Record<string, { total: number; stageBreakdown: Record<string, number> } | null>;

export function ListsPage({ locale }: { locale: "ar" | "en" }) {
  const tx = t[locale];
  const lists = useQuery(api.contactLists.listForTenant);
  const [createOpen, setCreateOpen] = useState(false);

  // We can't call useQuery in a loop, so stats are fetched per-card in ListCard
  // by passing listId to a separate query component pattern.
  // Instead, fetch a batch stats approach via individual ListCardWithStats.

  if (lists === undefined) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">{tx.title}</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <PlusIcon className="size-4 me-1" />
          {tx.newList}
        </Button>
      </div>

      {lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground">{tx.empty}</p>
          <p className="text-sm text-muted-foreground mt-1">{tx.emptyHint}</p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
            <PlusIcon className="size-4 me-1" />
            {tx.newList}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((list) => (
            <ListCardWithStats key={list._id} list={list} locale={locale} />
          ))}
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="border-2 border-dashed rounded-xl p-4 flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors text-sm"
          >
            <PlusIcon className="size-4 me-1" />
            {tx.newList}
          </button>
        </div>
      )}

      <CreateListDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        locale={locale}
      />
    </div>
  );
}

// Inner component that fetches its own stats — avoids calling hooks in a loop
function ListCardWithStats({
  list,
  locale,
}: {
  list: { _id: string; name: string; description?: string; filters: { countries?: string[]; cities?: string[]; stages?: Array<"lead" | "prospect" | "customer" | "retained" | "churned">; tags?: string[] }; createdBy: string; createdAt: number; updatedAt: number; tenantId: string };
  locale: "ar" | "en";
}) {
  const stats = useQuery(api.contactLists.getStats, {
    listId: list._id as Parameters<typeof api.contactLists.getStats>[0]["listId"],
  });

  return (
    <ListCard
      list={list as Parameters<typeof ListCard>[0]["list"]}
      stats={stats ?? null}
      locale={locale}
    />
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/lists/page.tsx components/lists/list-card.tsx components/lists/lists-page.tsx
git commit -m "feat(lists): add lists page with card grid layout"
```

---

## Task 9: Create List Dialog — Side Panel with Live Preview

**Files:**
- Create: `components/lists/create-list-dialog.tsx`

- [ ] **Step 1: Create components/lists/create-list-dialog.tsx**

```typescript
"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { XIcon } from "lucide-react";

type Stage = "lead" | "prospect" | "customer" | "retained" | "churned";

const STAGES: Stage[] = ["lead", "prospect", "customer", "retained", "churned"];

const STAGE_LABELS: Record<Stage, { ar: string; en: string }> = {
  lead: { ar: "عميل محتمل", en: "Lead" },
  prospect: { ar: "مرشح", en: "Prospect" },
  customer: { ar: "عميل", en: "Customer" },
  retained: { ar: "عميل دائم", en: "Retained" },
  churned: { ar: "مفقود", en: "Churned" },
};

const STAGE_COLORS: Record<Stage, string> = {
  lead: "bg-slate-100 text-slate-700",
  prospect: "bg-blue-100 text-blue-700",
  customer: "bg-emerald-100 text-emerald-700",
  retained: "bg-violet-100 text-violet-700",
  churned: "bg-rose-100 text-rose-700",
};

// Common countries for the GCC + MENA market
const COMMON_COUNTRIES = [
  { iso: "EG", ar: "مصر", en: "Egypt" },
  { iso: "SA", ar: "السعودية", en: "Saudi Arabia" },
  { iso: "AE", ar: "الإمارات", en: "UAE" },
  { iso: "KW", ar: "الكويت", en: "Kuwait" },
  { iso: "QA", ar: "قطر", en: "Qatar" },
  { iso: "BH", ar: "البحرين", en: "Bahrain" },
  { iso: "OM", ar: "عُمان", en: "Oman" },
  { iso: "JO", ar: "الأردن", en: "Jordan" },
  { iso: "LB", ar: "لبنان", en: "Lebanon" },
];

const t = {
  ar: {
    title: "إنشاء قائمة جديدة",
    namePlaceholder: "اسم القائمة...",
    descriptionPlaceholder: "وصف اختياري...",
    filters: "الفلاتر",
    country: "الدولة",
    city: "المدينة",
    stage: "المرحلة",
    tags: "الوسوم",
    cityPlaceholder: "اكتب مدينة واضغط Enter...",
    tagPlaceholder: "اكتب وسماً واضغط Enter...",
    preview: "معاينة النتائج",
    contacts: "جهة اتصال مطابقة",
    save: "حفظ القائمة",
    cancel: "إلغاء",
    nameRequired: "الاسم مطلوب",
    saving: "جاري الحفظ...",
  },
  en: {
    title: "Create New List",
    namePlaceholder: "List name...",
    descriptionPlaceholder: "Optional description...",
    filters: "Filters",
    country: "Country",
    city: "City",
    stage: "Stage",
    tags: "Tags",
    cityPlaceholder: "Type a city and press Enter...",
    tagPlaceholder: "Type a tag and press Enter...",
    preview: "Live Preview",
    contacts: "matching contacts",
    save: "Save List",
    cancel: "Cancel",
    nameRequired: "Name is required",
    saving: "Saving...",
  },
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: "ar" | "en";
};

export function CreateListDialog({ open, onOpenChange, locale }: Props) {
  const tx = t[locale];
  const createList = useMutation(api.contactLists.create);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [cityInput, setCityInput] = useState("");
  const [selectedStages, setSelectedStages] = useState<Stage[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);

  const filters = useMemo(
    () => ({
      countries: selectedCountries.length > 0 ? selectedCountries : undefined,
      cities: cities.length > 0 ? cities : undefined,
      stages: selectedStages.length > 0 ? selectedStages : undefined,
      tags: tags.length > 0 ? tags : undefined,
    }),
    [selectedCountries, cities, selectedStages, tags],
  );

  const preview = useQuery(api.contactLists.previewCount, { filters });

  function toggleCountry(iso: string) {
    setSelectedCountries((prev) =>
      prev.includes(iso) ? prev.filter((c) => c !== iso) : [...prev, iso],
    );
  }

  function toggleStage(stage: Stage) {
    setSelectedStages((prev) =>
      prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage],
    );
  }

  function addCity(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && cityInput.trim()) {
      e.preventDefault();
      const val = cityInput.trim();
      if (!cities.includes(val)) setCities((prev) => [...prev, val]);
      setCityInput("");
    }
  }

  function addTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const val = tagInput.trim();
      if (!tags.includes(val)) setTags((prev) => [...prev, val]);
      setTagInput("");
    }
  }

  function reset() {
    setName("");
    setDescription("");
    setSelectedCountries([]);
    setCities([]);
    setCityInput("");
    setSelectedStages([]);
    setTags([]);
    setTagInput("");
    setNameError(false);
  }

  async function handleSave() {
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    setSaving(true);
    try {
      await createList({
        name: name.trim(),
        description: description.trim() || undefined,
        filters,
      });
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const topStages = preview
    ? Object.entries(preview.stageBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
    : [];

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <SheetContent
        side={locale === "ar" ? "right" : "left"}
        className="w-full sm:max-w-2xl flex flex-col gap-0 p-0"
        dir={locale === "ar" ? "rtl" : "ltr"}
      >
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{tx.title}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto flex flex-col sm:flex-row">
          {/* Left — Filters */}
          <div className="flex-1 p-6 flex flex-col gap-5 border-e">
            {/* Name */}
            <div>
              <Input
                placeholder={tx.namePlaceholder}
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError(false); }}
                className={nameError ? "border-destructive" : ""}
              />
              {nameError && (
                <p className="text-xs text-destructive mt-1">{tx.nameRequired}</p>
              )}
            </div>

            {/* Description */}
            <Input
              placeholder={tx.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            {/* Country filter */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                {tx.country}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_COUNTRIES.map((c) => (
                  <button
                    key={c.iso}
                    type="button"
                    onClick={() => toggleCountry(c.iso)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      selectedCountries.includes(c.iso)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {c[locale]}
                  </button>
                ))}
              </div>
            </div>

            {/* City filter */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                {tx.city}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {cities.map((city) => (
                  <Badge key={city} variant="secondary" className="gap-1">
                    {city}
                    <button type="button" onClick={() => setCities((prev) => prev.filter((c) => c !== city))}>
                      <XIcon className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                placeholder={tx.cityPlaceholder}
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onKeyDown={addCity}
              />
            </div>

            {/* Stage filter */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                {tx.stage}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {STAGES.map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => toggleStage(stage)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      selectedStages.includes(stage)
                        ? `${STAGE_COLORS[stage]} border-transparent`
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {STAGE_LABELS[stage][locale]}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags filter */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                {tx.tags}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button type="button" onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}>
                      <XIcon className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                placeholder={tx.tagPlaceholder}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={addTag}
              />
            </div>
          </div>

          {/* Right — Live Preview */}
          <div className="w-full sm:w-56 p-6 bg-muted/30 flex flex-col gap-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {tx.preview}
            </p>
            <div>
              <div className="text-3xl font-bold text-primary">
                {preview === undefined ? "—" : preview.count}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{tx.contacts}</div>
            </div>
            {topStages.length > 0 && (
              <div className="flex flex-col gap-2">
                {topStages.map(([stage, count]) => (
                  <div key={stage} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {STAGE_LABELS[stage as Stage]?.[locale] ?? stage}
                    </span>
                    <span className="text-xs font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
            {tx.cancel}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? tx.saving : tx.save}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/lists/create-list-dialog.tsx
git commit -m "feat(lists): add create list dialog with live preview"
```

---

## Task 10: List Detail Page

**Files:**
- Create: `app/(dashboard)/lists/[id]/page.tsx`
- Create: `components/lists/list-detail.tsx`

- [ ] **Step 1: Create app/(dashboard)/lists/[id]/page.tsx**

```typescript
import { cookies } from "next/headers";
import { ListDetail } from "@/components/lists/list-detail";
import type { Id } from "@/convex/_generated/dataModel";

export const dynamic = "force-dynamic";

export default async function ListDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div dir={dir} className="h-full overflow-y-auto">
      <ListDetail listId={id as Id<"contactLists">} locale={locale} />
    </div>
  );
}
```

- [ ] **Step 2: Create components/lists/list-detail.tsx**

```typescript
"use client";

import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRightIcon, MegaphoneIcon, PencilIcon } from "lucide-react";

const STAGE_COLORS: Record<string, string> = {
  lead: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  prospect: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  customer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  retained: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  churned: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
  unknown: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const STAGE_LABELS: Record<string, { ar: string; en: string }> = {
  lead: { ar: "عميل محتمل", en: "Lead" },
  prospect: { ar: "مرشح", en: "Prospect" },
  customer: { ar: "عميل", en: "Customer" },
  retained: { ar: "عميل دائم", en: "Retained" },
  churned: { ar: "مفقود", en: "Churned" },
  unknown: { ar: "غير محدد", en: "Unknown" },
};

const t = {
  ar: {
    back: "العودة للقوائم",
    send: "إرسال حملة",
    edit: "تعديل",
    total: "إجمالي جهات الاتصال",
    cityBreakdown: "توزيع حسب المدينة",
    tagDistribution: "توزيع الوسوم",
    other: "أخرى",
    noData: "لا توجد بيانات",
    contacts: "جهة اتصال",
  },
  en: {
    back: "Back to Lists",
    send: "Send Campaign",
    edit: "Edit",
    total: "Total Contacts",
    cityBreakdown: "Breakdown by City",
    tagDistribution: "Tag Distribution",
    other: "Other",
    noData: "No data",
    contacts: "contacts",
  },
};

type Props = {
  listId: Id<"contactLists">;
  locale: "ar" | "en";
};

export function ListDetail({ listId, locale }: Props) {
  const tx = t[locale];
  const router = useRouter();
  const list = useQuery(api.contactLists.getById, { listId });
  const stats = useQuery(api.contactLists.getStats, { listId });

  if (list === undefined || stats === undefined) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-96" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="p-6 text-muted-foreground">
        {locale === "ar" ? "القائمة غير موجودة" : "List not found"}
      </div>
    );
  }

  const filterSummary = [
    list.filters.countries?.length
      ? `${locale === "ar" ? "الدولة" : "Country"}: ${list.filters.countries.join(", ")}`
      : null,
    list.filters.cities?.length
      ? `${locale === "ar" ? "المدينة" : "City"}: ${list.filters.cities.join(", ")}`
      : null,
    list.filters.stages?.length
      ? `${locale === "ar" ? "المرحلة" : "Stage"}: ${list.filters.stages.map((s) => STAGE_LABELS[s]?.[locale] ?? s).join(", ")}`
      : null,
    list.filters.tags?.length
      ? `${locale === "ar" ? "الوسوم" : "Tags"}: ${list.filters.tags.join(", ")}`
      : null,
  ].filter(Boolean).join(" • ");

  const topCities = stats
    ? Object.entries(stats.cityBreakdown)
        .filter(([city]) => city !== "unknown")
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];
  const cityMax = topCities[0]?.[1] ?? 1;

  const topTags = stats
    ? Object.entries(stats.tagBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 8)
    : [];

  const stageEntries = stats
    ? Object.entries(stats.stageBreakdown).filter(([s]) => s !== "unknown").sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <button
          type="button"
          onClick={() => router.push("/lists")}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3"
        >
          <ArrowRightIcon className="size-3 rotate-180" />
          {tx.back}
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">{list.name}</h1>
            {filterSummary && (
              <p className="text-sm text-muted-foreground mt-1">{filterSummary}</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm">
              <PencilIcon className="size-4 me-1" />
              {tx.edit}
            </Button>
            <Button
              size="sm"
              onClick={() => router.push(`/broadcasts/new?listId=${listId}`)}
            >
              <MegaphoneIcon className="size-4 me-1" />
              {tx.send}
            </Button>
          </div>
        </div>
      </div>

      {/* Stat boxes — total + per stage */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-primary">{stats?.total ?? "—"}</div>
          <div className="text-xs text-muted-foreground mt-1">{tx.total}</div>
        </div>
        {stageEntries.slice(0, 3).map(([stage, count]) => (
          <div
            key={stage}
            className={`rounded-xl p-4 text-center ${STAGE_COLORS[stage] ?? STAGE_COLORS.unknown}`}
          >
            <div className="text-2xl font-bold">{count}</div>
            <div className="text-xs mt-1">{STAGE_LABELS[stage]?.[locale] ?? stage}</div>
          </div>
        ))}
      </div>

      {/* City breakdown */}
      {topCities.length > 0 && (
        <div className="bg-card border rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">{tx.cityBreakdown}</h2>
          <div className="flex flex-col gap-3">
            {topCities.map(([city, count]) => (
              <div key={city} className="flex items-center justify-between gap-3">
                <span className="text-sm min-w-20">{city}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${(count / cityMax) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold w-8 text-end">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tag distribution */}
      {topTags.length > 0 && (
        <div className="bg-card border rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">{tx.tagDistribution}</h2>
          <div className="flex flex-wrap gap-2">
            {topTags.map(([tag, count]) => (
              <span
                key={tag}
                className="bg-muted text-muted-foreground text-xs px-3 py-1.5 rounded-full"
              >
                {tag} <strong className="text-foreground">{count}</strong>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/lists/[id]/page.tsx components/lists/list-detail.tsx
git commit -m "feat(lists): add list detail page with stats breakdown"
```

---

## Task 11: Broadcasts Page and Create Wizard

**Files:**
- Create: `app/(dashboard)/broadcasts/page.tsx`
- Create: `app/(dashboard)/broadcasts/new/page.tsx`
- Create: `components/broadcasts/broadcasts-page.tsx`
- Create: `components/broadcasts/create-broadcast-wizard.tsx`

- [ ] **Step 1: Create app/(dashboard)/broadcasts/page.tsx**

```typescript
import { cookies } from "next/headers";
import { BroadcastsPage } from "@/components/broadcasts/broadcasts-page";

export const dynamic = "force-dynamic";

export default async function BroadcastsRoute() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div dir={dir} className="h-full overflow-y-auto">
      <BroadcastsPage locale={locale} />
    </div>
  );
}
```

- [ ] **Step 2: Create app/(dashboard)/broadcasts/new/page.tsx**

```typescript
import { cookies } from "next/headers";
import { CreateBroadcastWizard } from "@/components/broadcasts/create-broadcast-wizard";
import type { Id } from "@/convex/_generated/dataModel";

export const dynamic = "force-dynamic";

export default async function NewBroadcastRoute({
  searchParams,
}: {
  searchParams: Promise<{ listId?: string }>;
}) {
  const { listId } = await searchParams;
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div dir={dir} className="h-full overflow-y-auto">
      <CreateBroadcastWizard
        locale={locale}
        initialListId={listId as Id<"contactLists"> | undefined}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create components/broadcasts/broadcasts-page.tsx**

```typescript
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { PlusIcon, MegaphoneIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sending: "bg-blue-100 text-blue-700",
  sent: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
};

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  draft: { ar: "مسودة", en: "Draft" },
  sending: { ar: "جاري الإرسال", en: "Sending" },
  sent: { ar: "تم الإرسال", en: "Sent" },
  failed: { ar: "فشل", en: "Failed" },
};

const t = {
  ar: {
    title: "الحملات",
    new: "حملة جديدة",
    empty: "لا توجد حملات بعد",
    emptyHint: "أنشئ حملتك الأولى لإرسال رسائل جماعية",
    recipients: "مستلم",
  },
  en: {
    title: "Broadcasts",
    new: "New Campaign",
    empty: "No broadcasts yet",
    emptyHint: "Create your first campaign to send bulk messages",
    recipients: "recipients",
  },
};

export function BroadcastsPage({ locale }: { locale: "ar" | "en" }) {
  const tx = t[locale];
  const router = useRouter();
  const broadcasts = useQuery(api.broadcasts.listForTenant);

  if (broadcasts === undefined) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">{tx.title}</h1>
        <Button size="sm" onClick={() => router.push("/broadcasts/new")}>
          <PlusIcon className="size-4 me-1" />
          {tx.new}
        </Button>
      </div>

      {broadcasts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MegaphoneIcon className="size-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{tx.empty}</p>
          <p className="text-sm text-muted-foreground mt-1">{tx.emptyHint}</p>
          <Button className="mt-4" onClick={() => router.push("/broadcasts/new")}>
            <PlusIcon className="size-4 me-1" />
            {tx.new}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {broadcasts.map((b) => (
            <div
              key={b._id}
              className="bg-card border rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-sm">{b.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {b.recipientCount} {tx.recipients} •{" "}
                  {new Date(b.createdAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB")}
                </div>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[b.status] ?? ""}`}
              >
                {STATUS_LABELS[b.status]?.[locale] ?? b.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create components/broadcasts/create-broadcast-wizard.tsx**

```typescript
"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckIcon, MegaphoneIcon } from "lucide-react";

const t = {
  ar: {
    title: "إنشاء حملة جديدة",
    step1: "الجمهور",
    step2: "الرسالة",
    step3: "مراجعة وإرسال",
    selectList: "اختر القائمة",
    selectChannel: "اختر رقم WhatsApp",
    selectTemplate: "اختر قالب الرسالة",
    campaignName: "اسم الحملة",
    campaignNamePlaceholder: "مثال: عرض رمضان 2026",
    contacts: "جهة اتصال",
    approved: "معتمد",
    next: "التالي",
    back: "السابق",
    send: "إرسال الحملة",
    sending: "جاري الإرسال...",
    noTemplates: "لا توجد قوالب معتمدة لهذا الرقم",
    loadingTemplates: "جاري تحميل القوالب...",
    summary: "ملخص الحملة",
    audience: "الجمهور",
    message: "القالب",
    channel: "رقم الإرسال",
    warning: "⚠️ تُرسل الحملات عبر قوالب WhatsApp المعتمدة من Meta فقط.",
    success: "تم إرسال الحملة بنجاح!",
    nameRequired: "اسم الحملة مطلوب",
  },
  en: {
    title: "New Broadcast Campaign",
    step1: "Audience",
    step2: "Message",
    step3: "Review & Send",
    selectList: "Select a list",
    selectChannel: "Select WhatsApp number",
    selectTemplate: "Select message template",
    campaignName: "Campaign name",
    campaignNamePlaceholder: "e.g. Ramadan Offer 2026",
    contacts: "contacts",
    approved: "Approved",
    next: "Next",
    back: "Back",
    send: "Send Campaign",
    sending: "Sending...",
    noTemplates: "No approved templates for this number",
    loadingTemplates: "Loading templates...",
    summary: "Campaign Summary",
    audience: "Audience",
    message: "Template",
    channel: "Sending from",
    warning: "⚠️ Broadcasts use Meta-approved WhatsApp templates only.",
    success: "Campaign sent successfully!",
    nameRequired: "Campaign name is required",
  },
};

type Template = {
  name: string;
  language: string;
  status: string;
  components: unknown[];
};

type Props = {
  locale: "ar" | "en";
  initialListId?: Id<"contactLists">;
};

export function CreateBroadcastWizard({ locale, initialListId }: Props) {
  const tx = t[locale];
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState(false);
  const [selectedListId, setSelectedListId] = useState<Id<"contactLists"> | undefined>(initialListId);
  const [selectedChannelId, setSelectedChannelId] = useState<Id<"channels"> | undefined>();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const lists = useQuery(api.contactLists.listForTenant);
  const channels = useQuery(api.channels.listForTenant);
  const selectedListStats = useQuery(
    api.contactLists.getStats,
    selectedListId ? { listId: selectedListId } : "skip",
  );

  const createBroadcast = useMutation(api.broadcasts.create);
  const sendBroadcast = useAction(api.broadcasts.send);
  const fetchTemplates = useAction(api.broadcasts.fetchTemplates);

  async function handleChannelSelect(channelId: Id<"channels">) {
    setSelectedChannelId(channelId);
    setSelectedTemplate(null);
    setTemplates([]);
    setLoadingTemplates(true);
    try {
      const result = await fetchTemplates({ channelId });
      setTemplates(result as Template[]);
    } catch {
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  }

  async function handleSend() {
    if (!name.trim()) { setNameError(true); return; }
    if (!selectedListId || !selectedChannelId || !selectedTemplate) return;

    setSending(true);
    try {
      const broadcastId = await createBroadcast({
        name: name.trim(),
        listId: selectedListId,
        channelId: selectedChannelId,
        templateName: selectedTemplate.name,
        templateLanguage: selectedTemplate.language,
      });
      await sendBroadcast({ broadcastId });
      setDone(true);
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-20 text-center gap-4">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <CheckIcon className="size-6" />
        </div>
        <p className="text-lg font-semibold">{tx.success}</p>
        <Button onClick={() => router.push("/broadcasts")}>{locale === "ar" ? "عرض الحملات" : "View Broadcasts"}</Button>
      </div>
    );
  }

  // Step indicator
  const steps = [tx.step1, tx.step2, tx.step3];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-6">{tx.title}</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((label, i) => {
          const idx = i + 1;
          const active = step === idx;
          const done = step > idx;
          return (
            <div key={idx} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : done
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <CheckIcon className="size-3.5" /> : idx}
              </div>
              <span
                className={`text-sm ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}
              >
                {label}
              </span>
              {i < steps.length - 1 && (
                <div className="flex-1 h-px bg-border w-8 mx-1" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1 — Audience */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">{tx.campaignName}</label>
            <Input
              placeholder={tx.campaignNamePlaceholder}
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(false); }}
              className={nameError ? "border-destructive" : ""}
            />
            {nameError && <p className="text-xs text-destructive mt-1">{tx.nameRequired}</p>}
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">{tx.selectList}</label>
            {lists === undefined ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="flex flex-col gap-2">
                {lists.map((list) => (
                  <button
                    key={list._id}
                    type="button"
                    onClick={() => setSelectedListId(list._id)}
                    className={`text-start p-3 rounded-lg border transition-colors ${
                      selectedListId === list._id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="text-sm font-medium">{list.name}</div>
                  </button>
                ))}
              </div>
            )}
            {selectedListStats && (
              <p className="text-xs text-muted-foreground mt-2">
                {selectedListStats.total} {tx.contacts}
              </p>
            )}
          </div>
          <div className="flex justify-end mt-2">
            <Button
              onClick={() => setStep(2)}
              disabled={!selectedListId || !name.trim()}
            >
              {tx.next}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 — Message */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">{tx.selectChannel}</label>
            {channels === undefined ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="flex flex-col gap-2">
                {channels.map((channel) => (
                  <button
                    key={channel._id}
                    type="button"
                    onClick={() => handleChannelSelect(channel._id)}
                    className={`text-start p-3 rounded-lg border transition-colors ${
                      selectedChannelId === channel._id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="text-sm font-medium">{channel.displayName}</div>
                    <div className="text-xs text-muted-foreground">{channel.phoneNumber}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedChannelId && (
            <div>
              <label className="text-sm font-medium mb-2 block">{tx.selectTemplate}</label>
              {loadingTemplates ? (
                <p className="text-sm text-muted-foreground">{tx.loadingTemplates}</p>
              ) : templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tx.noTemplates}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {templates.map((tpl) => (
                    <button
                      key={`${tpl.name}-${tpl.language}`}
                      type="button"
                      onClick={() => setSelectedTemplate(tpl)}
                      className={`text-start p-3 rounded-lg border transition-colors ${
                        selectedTemplate?.name === tpl.name
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="text-sm font-medium">{tpl.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {tpl.language} • {tx.approved}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            {tx.warning}
          </div>

          <div className="flex justify-between mt-2">
            <Button variant="outline" onClick={() => setStep(1)}>{tx.back}</Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!selectedChannelId || !selectedTemplate}
            >
              {tx.next}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — Review & Send */}
      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div className="bg-card border rounded-xl p-5 flex flex-col gap-3">
            <h2 className="text-sm font-semibold">{tx.summary}</h2>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{tx.audience}</span>
              <span className="font-medium">
                {lists?.find((l) => l._id === selectedListId)?.name ?? "—"}{" "}
                ({selectedListStats?.total ?? "—"} {tx.contacts})
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{tx.message}</span>
              <span className="font-medium">{selectedTemplate?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{tx.channel}</span>
              <span className="font-medium">
                {channels?.find((c) => c._id === selectedChannelId)?.displayName ?? "—"}
              </span>
            </div>
          </div>

          <div className="flex justify-between mt-2">
            <Button variant="outline" onClick={() => setStep(2)}>{tx.back}</Button>
            <Button onClick={handleSend} disabled={sending}>
              <MegaphoneIcon className="size-4 me-1" />
              {sending ? tx.sending : tx.send}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Check channels query name**

The wizard uses `api.channels.listForTenant`. Verify the correct export name:

```bash
grep -n "^export const" convex/channels.ts | head -10
```

If the query is named differently, update the import in `create-broadcast-wizard.tsx`.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/(dashboard)/broadcasts/ components/broadcasts/
git commit -m "feat(broadcasts): add broadcasts page and create campaign wizard"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Country auto-detection from phone (Tasks 3, 4)
- ✅ `contactLists` table (Task 1)
- ✅ `broadcasts` table (Task 1)
- ✅ Filter logic: AND across types, OR within tags (Task 5 — `contactMatchesFilters`)
- ✅ Plan limits enforced (Task 2, enforced in Tasks 5 + 6)
- ✅ Permissions enforced server-side (assertAdminOrSupervisor in mutations)
- ✅ Lists page — card grid (Task 8)
- ✅ Create list dialog — side panel + live preview (Task 9)
- ✅ List detail — stats + city breakdown + tag distribution (Task 10)
- ✅ Broadcasts — 3-step wizard (Task 11)
- ✅ "إرسال حملة" button links to `/broadcasts/new?listId=...` (Task 10)
- ✅ Nav items added (Task 7)
- ✅ RTL support (dir, side panel opens from right for AR locale)
- ✅ Meta template constraint documented in wizard UI

**Placeholder scan:** No TBDs or incomplete steps found.

**Type consistency:** `contactMatchesFilters`, `Stage`, `ListFilters` defined in Task 5 and consistent with schema defined in Task 1. `updateStatus` internal mutation args match schema fields. `getContactsForList` filter validator mirrors `contactLists.filters` shape.

**One manual check needed (Step 5 Task 6):** `api.channels.listForTenant` — confirm exact export name before running the wizard.
