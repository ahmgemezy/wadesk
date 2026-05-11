import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internal } from "./_generated/api";
import { getCallerIdentity, assertAdmin, type OrgRole } from "./lib/auth";
import { assertCatalogAllowed } from "./lib/planLimits";

// ─── Catalog CRUD ─────────────────────────────────────────────────────────────

export const listCatalogs = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) return [];
    return ctx.db
      .query("catalogs")
      .withIndex("by_channel", q => q.eq("channelId", args.channelId))
      .order("asc")
      .collect();
  },
});

export const addCatalog = mutation({
  args: {
    channelId: v.id("channels"),
    metaCatalogId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId)
      throw new ConvexError({ message: "NOT_FOUND" });
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", q => q.eq("tenantId", tenantId))
      .unique();
    if (!tenant) throw new ConvexError({ message: "TENANT_NOT_FOUND" });
    assertCatalogAllowed(tenant.plan);
    const existing = await ctx.db
      .query("catalogs")
      .withIndex("by_channel_meta", q =>
        q.eq("channelId", args.channelId).eq("metaCatalogId", args.metaCatalogId.trim()),
      )
      .first();
    if (existing) throw new ConvexError({ message: "CATALOG_ALREADY_ADDED" });
    return ctx.db.insert("catalogs", {
      tenantId,
      channelId: args.channelId,
      metaCatalogId: args.metaCatalogId.trim(),
      name: args.name.trim(),
      createdAt: Date.now(),
    });
  },
});

export const removeCatalog = mutation({
  args: { catalogDocId: v.id("catalogs") },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);
    const catalog = await ctx.db.get(args.catalogDocId);
    if (!catalog || catalog.tenantId !== tenantId)
      throw new ConvexError({ message: "NOT_FOUND" });
    // Remove all products for this catalog (manual + synced)
    const products = await ctx.db
      .query("catalogProducts")
      .withIndex("by_channel_catalog", q =>
        q.eq("channelId", catalog.channelId).eq("catalogId", catalog.metaCatalogId),
      )
      .take(5000);
    for (const p of products) {
      await ctx.db.delete(p._id);
    }
    await ctx.db.delete(args.catalogDocId);
  },
});

export const renameCatalog = mutation({
  args: { catalogDocId: v.id("catalogs"), name: v.string() },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);
    const catalog = await ctx.db.get(args.catalogDocId);
    if (!catalog || catalog.tenantId !== tenantId)
      throw new ConvexError({ message: "NOT_FOUND" });
    await ctx.db.patch(args.catalogDocId, { name: args.name.trim() });
  },
});

// ─── Queries ──────────────────────────────────────────────────────────────────

// Used by catalog-browser.tsx (inbox product picker) — returns all products for a channel
export const listProducts = query({
  args: {
    channelId: v.id("channels"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId)
      throw new ConvexError({ message: "NOT_FOUND" });
    return ctx.db
      .query("catalogProducts")
      .withIndex("by_channel", q => q.eq("channelId", args.channelId))
      .order("asc")
      .paginate(args.paginationOpts);
  },
});

// Used by catalog-browser.tsx — returns all products for a channel across all catalogs
export const searchProducts = query({
  args: { channelId: v.id("channels"), q: v.string() },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId)
      throw new ConvexError({ message: "NOT_FOUND" });
    if (!args.q.trim()) {
      return ctx.db
        .query("catalogProducts")
        .withIndex("by_channel", q => q.eq("channelId", args.channelId))
        .take(50);
    }
    return ctx.db
      .query("catalogProducts")
      .withSearchIndex("search_by_name", q =>
        q.search("name", args.q).eq("tenantId", tenantId),
      )
      .take(50);
  },
});

// Used by catalog settings UI — scoped to a specific catalog doc
export const searchCatalogProducts = query({
  args: { catalogDocId: v.id("catalogs"), q: v.string() },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const catalog = await ctx.db.get(args.catalogDocId);
    if (!catalog || catalog.tenantId !== tenantId)
      throw new ConvexError({ message: "NOT_FOUND" });
    if (!args.q.trim()) {
      return ctx.db
        .query("catalogProducts")
        .withIndex("by_channel_catalog", q =>
          q.eq("channelId", catalog.channelId).eq("catalogId", catalog.metaCatalogId),
        )
        .take(50);
    }
    // Full-text search across tenant; filter down to this catalog post-search
    const results = await ctx.db
      .query("catalogProducts")
      .withSearchIndex("search_by_name", q =>
        q.search("name", args.q).eq("tenantId", tenantId),
      )
      .take(100);
    return results.filter(p => p.catalogId === catalog.metaCatalogId);
  },
});

// Used by catalog-browser.tsx (backward compat) — returns status for the channel overall
export const getSyncStatus = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) return null;
    const firstCatalog = await ctx.db
      .query("catalogs")
      .withIndex("by_channel", q => q.eq("channelId", args.channelId))
      .first();
    const catalogIdStr = firstCatalog?.metaCatalogId ?? channel.catalogId ?? null;
    if (!catalogIdStr) return { catalogId: null, lastSyncedAt: null, productCount: 0 };
    // Bounded at 10000 — SMB catalogs are far smaller in practice
    const all = await ctx.db
      .query("catalogProducts")
      .withIndex("by_channel", q => q.eq("channelId", args.channelId))
      .take(10000);
    return {
      catalogId: catalogIdStr,
      lastSyncedAt: firstCatalog?.lastSyncedAt ?? (all[0]?.syncedAt ?? null),
      productCount: all.length,
    };
  },
});

// Used by catalog settings UI — status for one specific catalog
export const getSyncStatusForCatalog = query({
  args: { catalogDocId: v.id("catalogs") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const catalog = await ctx.db.get(args.catalogDocId);
    if (!catalog || catalog.tenantId !== tenantId) return null;
    const products = await ctx.db
      .query("catalogProducts")
      .withIndex("by_channel_catalog", q =>
        q.eq("channelId", catalog.channelId).eq("catalogId", catalog.metaCatalogId),
      )
      .take(10000);
    return {
      lastSyncedAt: catalog.lastSyncedAt ?? null,
      productCount: products.length,
    };
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

// Kept for backward compat — sets channels.catalogId (used by metaCatalogActions legacy path)
export const updateChannelCatalog = mutation({
  args: {
    channelId: v.id("channels"),
    catalogId: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId)
      throw new ConvexError({ message: "NOT_FOUND" });
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", q => q.eq("tenantId", tenantId))
      .unique();
    if (!tenant) throw new ConvexError({ message: "TENANT_NOT_FOUND" });
    assertCatalogAllowed(tenant.plan);
    await ctx.db.patch(args.channelId, { catalogId: args.catalogId });
  },
});

// Trigger sync for the entire channel (legacy — kept for backward compat with old cron path)
export const triggerManualSync = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId)
      throw new ConvexError({ message: "NOT_FOUND" });
    if (!channel.catalogId)
      throw new ConvexError({ message: "CATALOG_NOT_CONFIGURED" });
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", q => q.eq("tenantId", tenantId))
      .unique();
    if (!tenant) throw new ConvexError({ message: "TENANT_NOT_FOUND" });
    assertCatalogAllowed(tenant.plan);
    await ctx.scheduler.runAfter(0, internal.actions.syncCatalog.syncChannelCatalog, {
      channelId: args.channelId,
    });
  },
});

// Trigger sync for a specific catalog doc — used by the new multi-catalog UI
export const triggerCatalogSync = mutation({
  args: { catalogDocId: v.id("catalogs") },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);
    const catalog = await ctx.db.get(args.catalogDocId);
    if (!catalog || catalog.tenantId !== tenantId)
      throw new ConvexError({ message: "NOT_FOUND" });
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", q => q.eq("tenantId", tenantId))
      .unique();
    if (!tenant) throw new ConvexError({ message: "TENANT_NOT_FOUND" });
    assertCatalogAllowed(tenant.plan);
    await ctx.scheduler.runAfter(0, internal.actions.syncCatalog.syncOneCatalog, {
      catalogDocId: args.catalogDocId,
    });
  },
});

// ─── Internal Mutations ───────────────────────────────────────────────────────

// Legacy: clears all non-manual products for a channel (kept for backward compat)
export const clearChannelProducts = internalMutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    // SMB catalogs are small; 5000 cap is safe for Convex transaction limits
    const existing = await ctx.db
      .query("catalogProducts")
      .withIndex("by_channel", q => q.eq("channelId", args.channelId))
      .take(5000);
    for (const product of existing) {
      if (product.source !== "manual") {
        await ctx.db.delete(product._id);
      }
    }
  },
});

// Clears only non-manual products for a specific catalog (used by syncOneCatalog)
export const clearCatalogProducts = internalMutation({
  args: { channelId: v.id("channels"), metaCatalogId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("catalogProducts")
      .withIndex("by_channel_catalog", q =>
        q.eq("channelId", args.channelId).eq("catalogId", args.metaCatalogId),
      )
      .take(5000);
    for (const product of existing) {
      if (product.source !== "manual") {
        await ctx.db.delete(product._id);
      }
    }
  },
});

export const insertProductBatch = internalMutation({
  args: {
    tenantId: v.string(),
    channelId: v.id("channels"),
    catalogId: v.string(),
    products: v.array(v.object({
      retailerId: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      price: v.optional(v.string()),
      currency: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      availability: v.optional(v.string()),
      salePrice: v.optional(v.string()),
      salePriceEffectiveDate: v.optional(v.string()),
      additionalImages: v.optional(v.array(v.string())),
      videoUrl: v.optional(v.string()),
      customLabels: v.optional(v.array(v.string())),
      customNumbers: v.optional(v.array(v.string())),
    })),
    syncedAt: v.number(),
  },
  handler: async (ctx, args) => {
    for (const product of args.products) {
      await ctx.db.insert("catalogProducts", {
        tenantId: args.tenantId,
        channelId: args.channelId,
        catalogId: args.catalogId,
        retailerId: product.retailerId,
        name: product.name,
        description: product.description,
        price: product.price,
        currency: product.currency,
        imageUrl: product.imageUrl,
        availability: product.availability,
        salePrice: product.salePrice,
        salePriceEffectiveDate: product.salePriceEffectiveDate,
        additionalImages: product.additionalImages,
        videoUrl: product.videoUrl,
        customLabels: product.customLabels,
        customNumbers: product.customNumbers,
        syncedAt: args.syncedAt,
      });
    }
  },
});

export const updateCatalogLastSync = internalMutation({
  args: { catalogDocId: v.id("catalogs"), syncedAt: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.catalogDocId, { lastSyncedAt: args.syncedAt });
  },
});

export const getProductInternal = internalQuery({
  args: { productId: v.id("catalogProducts") },
  handler: async (ctx, args) => ctx.db.get(args.productId),
});

// Image upload helpers — stores image in Convex file storage and returns the served URL
export const generateProductImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getCallerIdentity(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const resolveProductImageUrl = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await getCallerIdentity(ctx);
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new ConvexError({ message: "STORAGE_URL_NOT_FOUND" });
    return url;
  },
});

// Caches the result of a setCommerceSettings Meta API call on the channel doc
export const updateChannelCommerceSettings = internalMutation({
  args: {
    channelId: v.id("channels"),
    catalogId: v.optional(v.string()),
    isCatalogVisible: v.optional(v.boolean()),
    isCartEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {};
    if (args.catalogId !== undefined) patch.catalogId = args.catalogId;
    if (args.isCatalogVisible !== undefined) patch.isCatalogVisible = args.isCatalogVisible;
    if (args.isCartEnabled !== undefined) patch.isCartEnabled = args.isCartEnabled;
    if (Object.keys(patch).length > 0) await ctx.db.patch(args.channelId, patch);
  },
});

export const getCatalogInternal = internalQuery({
  args: { catalogDocId: v.id("catalogs") },
  handler: async (ctx, args) => ctx.db.get(args.catalogDocId),
});

// Used by syncAllCatalogs cron — replaces listChannelsWithCatalog for the new sync path
export const listAllActiveCatalogs = internalQuery({
  args: {},
  handler: async (ctx) => {
    const catalogs = await ctx.db.query("catalogs").take(2000);
    const result = [];
    for (const catalog of catalogs) {
      const channel = await ctx.db.get(catalog.channelId);
      if (channel?.status === "active") result.push(catalog);
    }
    return result;
  },
});

// ─── Product CRUD ─────────────────────────────────────────────────────────────

export const createProduct = mutation({
  args: {
    catalogDocId: v.id("catalogs"),
    retailerId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.optional(v.string()),
    currency: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    availability: v.optional(v.string()),
    condition: v.optional(v.string()),
    brand: v.optional(v.string()),
    productUrl: v.optional(v.string()),
    salePrice: v.optional(v.string()),
    salePriceEffectiveDate: v.optional(v.string()),
    additionalImages: v.optional(v.array(v.string())),
    videoUrl: v.optional(v.string()),
    itemGroupId: v.optional(v.string()),
    color: v.optional(v.string()),
    size: v.optional(v.string()),
    material: v.optional(v.string()),
    pattern: v.optional(v.string()),
    gender: v.optional(v.string()),
    ageGroup: v.optional(v.string()),
    customLabels: v.optional(v.array(v.string())),
    customNumbers: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);
    const catalog = await ctx.db.get(args.catalogDocId);
    if (!catalog || catalog.tenantId !== tenantId)
      throw new ConvexError({ message: "NOT_FOUND" });
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", q => q.eq("tenantId", tenantId))
      .unique();
    if (!tenant) throw new ConvexError({ message: "TENANT_NOT_FOUND" });
    assertCatalogAllowed(tenant.plan);
    const existing = await ctx.db
      .query("catalogProducts")
      .withIndex("by_channel_retailer", q =>
        q.eq("channelId", catalog.channelId).eq("retailerId", args.retailerId),
      )
      .first();
    if (existing) throw new ConvexError({ message: "RETAILER_ID_EXISTS" });
    await ctx.db.insert("catalogProducts", {
      tenantId,
      channelId: catalog.channelId,
      catalogId: catalog.metaCatalogId,
      retailerId: args.retailerId,
      name: args.name,
      description: args.description,
      price: args.price,
      currency: args.currency,
      imageUrl: args.imageUrl,
      availability: args.availability,
      condition: args.condition,
      brand: args.brand,
      productUrl: args.productUrl,
      salePrice: args.salePrice,
      salePriceEffectiveDate: args.salePriceEffectiveDate,
      additionalImages: args.additionalImages,
      videoUrl: args.videoUrl,
      itemGroupId: args.itemGroupId,
      color: args.color,
      size: args.size,
      material: args.material,
      pattern: args.pattern,
      gender: args.gender,
      ageGroup: args.ageGroup,
      customLabels: args.customLabels,
      customNumbers: args.customNumbers,
      syncedAt: Date.now(),
      source: "manual",
    });
  },
});

export const updateProduct = mutation({
  args: {
    productId: v.id("catalogProducts"),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.optional(v.string()),
    currency: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    availability: v.optional(v.string()),
    condition: v.optional(v.string()),
    brand: v.optional(v.string()),
    productUrl: v.optional(v.string()),
    salePrice: v.optional(v.string()),
    salePriceEffectiveDate: v.optional(v.string()),
    additionalImages: v.optional(v.array(v.string())),
    videoUrl: v.optional(v.string()),
    itemGroupId: v.optional(v.string()),
    color: v.optional(v.string()),
    size: v.optional(v.string()),
    material: v.optional(v.string()),
    pattern: v.optional(v.string()),
    gender: v.optional(v.string()),
    ageGroup: v.optional(v.string()),
    customLabels: v.optional(v.array(v.string())),
    customNumbers: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);
    const { productId, ...fields } = args;
    const product = await ctx.db.get(productId);
    if (!product || product.tenantId !== tenantId)
      throw new ConvexError({ message: "NOT_FOUND" });
    await ctx.db.patch(productId, {
      name: fields.name,
      description: fields.description,
      price: fields.price,
      currency: fields.currency,
      imageUrl: fields.imageUrl,
      availability: fields.availability,
      condition: fields.condition,
      brand: fields.brand,
      productUrl: fields.productUrl,
      salePrice: fields.salePrice,
      salePriceEffectiveDate: fields.salePriceEffectiveDate,
      additionalImages: fields.additionalImages,
      videoUrl: fields.videoUrl,
      itemGroupId: fields.itemGroupId,
      color: fields.color,
      size: fields.size,
      material: fields.material,
      pattern: fields.pattern,
      gender: fields.gender,
      ageGroup: fields.ageGroup,
      customLabels: fields.customLabels,
      customNumbers: fields.customNumbers,
    });
  },
});

export const deleteProduct = mutation({
  args: { productId: v.id("catalogProducts") },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);
    const product = await ctx.db.get(args.productId);
    if (!product || product.tenantId !== tenantId)
      throw new ConvexError({ message: "NOT_FOUND" });
    await ctx.db.delete(args.productId);
  },
});
