import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getCallerIdentity, getCallerRole, assertAdminOrSupervisor } from "./lib/auth";
import { paginationOptsValidator } from "convex/server";

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
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole);

    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_tenant_phone", (q) =>
        q.eq("tenantId", tenantId).eq("phone", args.phone),
      )
      .first();

    if (existing) {
      return { error: "duplicate" as const, existingId: existing._id };
    }

    return ctx.db.insert("contacts", {
      tenantId,
      phone: args.phone,
      displayName: args.customName ?? args.phone,
      customName: args.customName,
      tags: args.tags ?? [],
      notes: args.notes,
      country: args.country,
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_tenant_phone", (q) =>
        q.eq("tenantId", args.tenantId).eq("phone", args.phone),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastSeenAt: Date.now(),
        displayName: args.displayName ?? existing.displayName,
      });
      return existing._id;
    }

    return ctx.db.insert("contacts", {
      tenantId: args.tenantId,
      phone: args.phone,
      displayName: args.displayName ?? args.phone,
      tags: [],
      source: "auto",
      isArchived: false,
      firstSeenAt: Date.now(),
      lastSeenAt: Date.now(),
      createdAt: Date.now(),
    });
  },
});
