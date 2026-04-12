import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCallerIdentity, getCallerRole, assertAdminOrSupervisor } from "./lib/auth";
import { paginationOptsValidator } from "convex/server";
import { getCountryFromPhone } from "../lib/phoneGeo";

export const listForTenant = query({
  args: {
    paginationOpts: paginationOptsValidator,
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    if (args.includeArchived) {
      return ctx.db
        .query("contacts")
        .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return ctx.db
      .query("contacts")
      .withIndex("by_tenant_archived", (q) =>
        q.eq("tenantId", tenantId).eq("isArchived", false),
      )
      .order("desc")
      .paginate(args.paginationOpts);
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

    if (args.includeArchived) return results;

    const filtered = results.page.filter((c) => !c.isArchived);
    return { ...results, page: filtered };
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
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.tenantId !== tenantId) {
      throw new Error("Contact not found");
    }

    const patch: Record<string, unknown> = {};
    if (args.customName !== undefined) patch.customName = args.customName;
    if (args.tags !== undefined) patch.tags = args.tags;
    if (args.notes !== undefined) patch.notes = args.notes;
    if (args.assignedAgentId !== undefined) patch.assignedAgentId = args.assignedAgentId;
    if (args.country !== undefined) patch.country = args.country;
    if (args.city !== undefined) patch.city = args.city;
    if (args.spent !== undefined) patch.spent = args.spent;
    if (args.category !== undefined) patch.category = args.category;

    await ctx.db.patch(args.contactId, patch);
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

    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_tenant_phone", (q) =>
        q.eq("tenantId", tenantId).eq("phone", args.phone),
      )
      .first();

    if (existing) {
      return { error: "duplicate" as const, existingId: existing._id };
    }

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
