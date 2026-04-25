import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCallerIdentity, getCallerRole, assertAdminOrSupervisor } from "./lib/auth";
import { paginationOptsValidator } from "convex/server";
import { getCountryFromPhone } from "../lib/phoneGeo";

async function enrichWithConversationCount<T extends { _id: import("./_generated/dataModel").Id<"contacts">; totalConversations?: number }>(
  ctx: { db: import("./_generated/server").DatabaseReader },
  contacts: T[]
): Promise<T[]> {
  return Promise.all(
    contacts.map(async (contact) => {
      const convs = await ctx.db
        .query("conversations")
        .withIndex("by_contact", (q) => q.eq("contactId", contact._id))
        .collect();
      return { ...contact, totalConversations: convs.length };
    })
  );
}

export const listForTenant = query({
  args: {
    paginationOpts: paginationOptsValidator,
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const result = args.includeArchived
      ? await ctx.db
          .query("contacts")
          .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
          .order("desc")
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("contacts")
          .withIndex("by_tenant_archived", (q) =>
            q.eq("tenantId", tenantId).eq("isArchived", false),
          )
          .order("desc")
          .paginate(args.paginationOpts);
    const enriched = await enrichWithConversationCount(ctx, result.page);
    return { ...result, page: enriched };
  },
});

export const search = query({
  args: {
    query: v.string(),
    includeArchived: v.optional(v.boolean()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const isPhoneQuery = /^[\d+]/.test(args.query);

    if (isPhoneQuery) {
      const results = await ctx.db
        .query("contacts")
        .withIndex("by_tenant_phone", (q) =>
          q.eq("tenantId", tenantId),
        )
        .order("desc")
        .paginate(args.paginationOpts);

      const prefix = args.query;
      const filtered = results.page.filter((c) => {
        if (!args.includeArchived && c.isArchived) return false;
        return c.phone.startsWith(prefix);
      });
      return { ...results, page: filtered };
    }

    const results = await ctx.db
      .query("contacts")
      .withSearchIndex("search_by_name", (q) =>
        q.search("displayName", args.query).eq("tenantId", tenantId),
      )
      .paginate(args.paginationOpts);

    const filtered = args.includeArchived
      ? results.page
      : results.page.filter((c) => !c.isArchived);
    const enriched = await enrichWithConversationCount(ctx, filtered);
    return { ...results, page: enriched };
  },
});

export const getById = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.tenantId !== tenantId) {
      return null;
    }

    let conversationCount = 0;
    for await (const _ of ctx.db
      .query("conversations")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
    ) {
      conversationCount++;
    }

    return { contact, conversationCount };
  },
});

export const update = mutation({
  args: {
    contactId: v.id("contacts"),
    customName: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    assignedAgentId: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    spent: v.optional(v.number()),
    spentCurrency: v.optional(v.union(
      v.literal("EGP"),
      v.literal("SAR"),
      v.literal("AED"),
      v.literal("USD"),
    )),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.tenantId !== tenantId) {
      throw new Error("Contact not found");
    }

    const patch: Record<string, unknown> = {};
    if (args.customName !== undefined) patch.customName = args.customName;
    if (args.tags !== undefined) patch.tags = args.tags;
    if (args.notes !== undefined) patch.notes = args.notes || undefined;
    if (args.assignedAgentId !== undefined) patch.assignedAgentId = args.assignedAgentId;
    if (args.country !== undefined) patch.country = args.country || undefined;
    if (args.city !== undefined) patch.city = args.city || undefined;
    if (args.spent !== undefined) patch.spent = args.spent;
    if (args.spentCurrency !== undefined) patch.spentCurrency = args.spentCurrency;
    if (args.category !== undefined) patch.category = args.category || undefined;

    await ctx.db.patch(args.contactId, patch);

    // Fire tags_changed event when tags are explicitly updated
    if (args.tags !== undefined) {
      await ctx.runMutation(internal.contactEvents.internalCreate, {
        tenantId,
        contactId: args.contactId,
        type: "tags_changed",
        actorId: callerId,
        metadata: { tags: args.tags },
      });
    }
  },
});

export const archive = mutation({
  args: {
    contactId: v.id("contacts"),
    archive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdminOrSupervisor(role);
    const { tenantId } = await getCallerIdentity(ctx);
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.tenantId !== tenantId) {
      throw new Error("Contact not found");
    }
    await ctx.db.patch(args.contactId, { isArchived: args.archive });
  },
});

export const create = mutation({
  args: {
    phone: v.string(),
    customName: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    spent: v.optional(v.number()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const role = await getCallerRole(ctx);
    assertAdminOrSupervisor(role);

    const phone = args.phone.startsWith("+") ? args.phone : `+${args.phone}`;

    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_tenant_phone", (q) =>
        q.eq("tenantId", tenantId).eq("phone", phone),
      )
      .first();

    if (existing) {
      return { error: "duplicate" as const, existingId: existing._id };
    }

    const geoCountry = args.country ?? getCountryFromPhone(phone)?.countryIso ?? undefined;

    return ctx.db.insert("contacts", {
      tenantId,
      phone,
      displayName: args.customName ?? phone,
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
  },
});

export const upsertByPhone = internalMutation({
  args: {
    tenantId: v.string(),
    phone: v.string(),
    displayName: v.optional(v.string()),
    wabaId: v.optional(v.string()),
    incrementConversations: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Normalize to E.164: Meta often sends numbers without the leading "+"
    const phone = args.phone.startsWith("+") ? args.phone : `+${args.phone}`;

    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_tenant_phone", (q) =>
        q.eq("tenantId", args.tenantId).eq("phone", phone),
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

    const autoCountry = getCountryFromPhone(phone)?.countryIso ?? undefined;

    return ctx.db.insert("contacts", {
      tenantId: args.tenantId,
      phone,
      displayName: args.displayName ?? phone,
      tags: [],
      source: "auto",
      isArchived: false,
      stage: "lead",
      country: autoCountry,
      totalConversations: args.incrementConversations ? 1 : 0,
      wabaId: args.wabaId,
      firstSeenAt: Date.now(),
      lastSeenAt: Date.now(),
      createdAt: Date.now(),
    });
  },
});

const stageValidator = v.union(
  v.literal("lead"),
  v.literal("prospect"),
  v.literal("customer"),
  v.literal("retained"),
  v.literal("churned"),
);

export const updateStage = mutation({
  args: {
    contactId: v.id("contacts"),
    stage: stageValidator,
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

export const listByStage = query({
  args: {
    stage: v.optional(stageValidator),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);

    let contacts;
    if (args.stage) {
      if (args.stage === "lead") {
        contacts = await ctx.db
          .query("contacts")
          .withIndex("by_tenant_archived", (q) =>
            q.eq("tenantId", tenantId).eq("isArchived", false)
          )
          .filter((q) => 
            q.or(
              q.eq(q.field("stage"), "lead"), 
              q.eq(q.field("stage"), undefined)
            )
          )
          .take(500);
      } else {
        contacts = await ctx.db
          .query("contacts")
          .withIndex("by_tenant_stage", (q) =>
            q.eq("tenantId", tenantId).eq("stage", args.stage!),
          )
          .filter((q) => q.eq(q.field("isArchived"), false))
          .take(500);
      }
    } else {
      contacts = await ctx.db
        .query("contacts")
        .withIndex("by_tenant_archived", (q) =>
          q.eq("tenantId", tenantId).eq("isArchived", false),
        )
        .take(500);
    }

    // Role-based visibility: Agent sees only own contacts
    const filtered =
      orgRole === "org:agent"
        ? contacts.filter((c) => c.assignedAgentId === callerId)
        : contacts;

    return filtered;
  },
});

export const backfillCountries = mutation({
  args: {},
  handler: async (ctx) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_tenant_archived", (q) =>
        q.eq("tenantId", tenantId).eq("isArchived", false),
      )
      .collect();

    let updated = 0;
    for (const c of contacts) {
      if (!c.country) {
        const geo = getCountryFromPhone(c.phone);
        if (geo) {
          await ctx.db.patch(c._id, { country: geo.countryIso.toUpperCase() });
          updated++;
        }
      }
    }
    return { updated };
  },
});
