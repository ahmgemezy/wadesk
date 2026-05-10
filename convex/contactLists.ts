import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCountryFromPhone } from "../lib/phoneGeo";
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

function contactMatchesFilters(
  contact: Doc<"contacts">,
  filters: ListFilters,
): boolean {
  if (filters.countries && filters.countries.length > 0) {
    const detectedCountry = getCountryFromPhone(contact.phone)?.countryIso?.toUpperCase();
    if (!detectedCountry || !filters.countries.map((c) => c.toUpperCase()).includes(detectedCountry)) {
      return false;
    }
  }
  if (filters.cities && filters.cities.length > 0) {
    if (!contact.city || !filters.cities.includes(contact.city)) {
      return false;
    }
  }
  if (filters.stages && filters.stages.length > 0) {
    const effectiveStage = (contact.stage ?? "lead") as Stage;
    if (!filters.stages.includes(effectiveStage)) {
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

export const getAvailableCountries = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_tenant_archived", (q) =>
        q.eq("tenantId", tenantId).eq("isArchived", false),
      )
      .collect();

    const seen = new Set<string>();
    for (const c of contacts) {
      const geo = getCountryFromPhone(c.phone);
      if (geo) seen.add(geo.countryIso.toUpperCase());
    }
    return Array.from(seen).sort();
  },
});

export const getAvailableCities = query({
  args: {
    countries: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_tenant_archived", (q) =>
        q.eq("tenantId", tenantId).eq("isArchived", false),
      )
      .collect();

    const upperCountries = args.countries?.map((c) => c.toUpperCase());

    const seen = new Set<string>();
    for (const c of contacts) {
      if (!c.city) continue;
      if (upperCountries && upperCountries.length > 0) {
        const iso = getCountryFromPhone(c.phone)?.countryIso?.toUpperCase();
        if (!iso || !upperCountries.includes(iso)) continue;
      }
      seen.add(c.city);
    }
    return Array.from(seen).sort();
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

    const allContacts = await ctx.db
      .query("contacts")
      .withIndex("by_tenant_archived", (q) =>
        q.eq("tenantId", tenantId).eq("isArchived", false),
      )
      .collect();

    const labelContactIds =
      list.filters.labels && list.filters.labels.length > 0
        ? await getLabelContactIds(ctx, tenantId, list.filters.labels)
        : null;

    const matching = allContacts.filter((c) => {
      if (labelContactIds !== null && !labelContactIds.has(c._id)) return false;
      return contactMatchesFilters(c, list.filters);
    });

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
    const countryBreakdown: Record<string, number> = {};
    const tagBreakdownMap: Map<string, number> = new Map();

    for (const contact of matching) {
      const stage = contact.stage ?? "lead";
      stageBreakdown[stage] = (stageBreakdown[stage] ?? 0) + 1;

      // Use the same phone-derived ISO code as the filter logic — never contact.country
      const detectedIso = getCountryFromPhone(contact.phone)?.countryIso?.toUpperCase();
      if (detectedIso) {
        countryBreakdown[detectedIso] = (countryBreakdown[detectedIso] ?? 0) + 1;
      }

      for (const tag of contact.tags) {
        tagBreakdownMap.set(tag, (tagBreakdownMap.get(tag) ?? 0) + 1);
      }
    }

    const tagBreakdown = Array.from(tagBreakdownMap.entries()).map(([tag, count]) => ({ tag, count }));

    return {
      total: matching.length,
      stageBreakdown,
      countryBreakdown,
      tagBreakdown,
    };
  },
});

async function getLabelContactIds(
  ctx: { db: import("./_generated/server").DatabaseReader },
  tenantId: string,
  labels: string[],
): Promise<Set<string>> {
  const convs = await ctx.db
    .query("conversations")
    .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
    .collect();
  const ids = new Set<string>();
  for (const c of convs) {
    if (c.labels.some((l: string) => labels.includes(l))) ids.add(c.contactId);
  }
  return ids;
}

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
      labels: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);

    const labelContactIds =
      args.filters.labels && args.filters.labels.length > 0
        ? await getLabelContactIds(ctx, tenantId, args.filters.labels)
        : null;

    const allContacts = await ctx.db
      .query("contacts")
      .withIndex("by_tenant_archived", (q) =>
        q.eq("tenantId", tenantId).eq("isArchived", false),
      )
      .collect();

    const matching = allContacts.filter((c) => {
      if (labelContactIds !== null && !labelContactIds.has(c._id)) return false;
      return contactMatchesFilters(c, args.filters);
    });

    const stageBreakdown: Record<string, number> = {};
    for (const contact of matching) {
      const stage = contact.stage ?? "lead";
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
      labels: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    const role = await getCallerRole(ctx);
    assertAdminOrSupervisor(role);

    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
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
