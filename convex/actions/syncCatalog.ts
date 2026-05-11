"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { decrypt } from "../lib/encryption";
import type { Id } from "../_generated/dataModel";

const BASE = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION ?? "v25.0"}`;
const BATCH_SIZE = 100;

interface MetaProduct {
  id: string;
  retailer_id: string;
  name: string;
  description?: string;
  price?: string;
  currency?: string;
  image_url?: string;
  availability?: string;
}

interface MetaProductsPage {
  data: MetaProduct[];
  paging?: {
    cursors?: { after?: string };
    next?: string;
  };
}

async function fetchAllProducts(catalogId: string, token: string): Promise<MetaProduct[]> {
  const products: MetaProduct[] = [];
  const fields = "retailer_id,name,description,price,currency,image_url,availability";
  let url: string | null = `${BASE}/${catalogId}/products?fields=${fields}&limit=100`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.error(`[CATALOG_SYNC] Meta API error ${res.status} for catalog ${catalogId}`);
      break;
    }
    const page = (await res.json()) as MetaProductsPage;
    products.push(...page.data);
    url = page.paging?.next ?? null;
    if (products.length >= 5000) {
      console.warn(`[CATALOG_SYNC] Catalog ${catalogId} has 5000+ products — truncating`);
      break;
    }
  }
  return products;
}

// Syncs a specific catalog doc (new multi-catalog path)
export const syncOneCatalog = internalAction({
  args: { catalogDocId: v.id("catalogs") },
  handler: async (ctx, args) => {
    const catalog = await ctx.runQuery(internal.catalog.getCatalogInternal, {
      catalogDocId: args.catalogDocId,
    });
    if (!catalog) {
      console.warn(`[CATALOG_SYNC] Catalog doc ${args.catalogDocId} not found — skipping`);
      return;
    }

    const channel = await ctx.runQuery(internal.channels.getById, {
      channelId: catalog.channelId,
    });
    if (!channel) {
      console.warn(`[CATALOG_SYNC] Channel ${catalog.channelId} not found — skipping`);
      return;
    }

    const token = channel.accessToken
      ? await decrypt(channel.accessToken)
      : (process.env.WHATSAPP_API_TOKEN ?? "");

    if (!token) {
      console.error(`[CATALOG_SYNC] No token for channel ${catalog.channelId}`);
      return;
    }

    const products = await fetchAllProducts(catalog.metaCatalogId, token);
    if (products.length === 0) {
      console.log(`[CATALOG_SYNC] No products found for catalog ${catalog.metaCatalogId}`);
      return;
    }

    await ctx.runMutation(internal.catalog.clearCatalogProducts, {
      channelId: catalog.channelId as Id<"channels">,
      metaCatalogId: catalog.metaCatalogId,
    });

    const syncedAt = Date.now();
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE).map(p => ({
        retailerId: p.retailer_id ?? p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        currency: p.currency,
        imageUrl: p.image_url,
        availability: p.availability,
      }));
      await ctx.runMutation(internal.catalog.insertProductBatch, {
        tenantId: catalog.tenantId,
        channelId: catalog.channelId as Id<"channels">,
        catalogId: catalog.metaCatalogId,
        products: batch,
        syncedAt,
      });
    }

    await ctx.runMutation(internal.catalog.updateCatalogLastSync, {
      catalogDocId: args.catalogDocId,
      syncedAt,
    });

    console.log(`[CATALOG_SYNC] Synced ${products.length} products for catalog ${catalog.metaCatalogId}`);
  },
});

// Legacy: syncs by channel.catalogId (kept for backward compat)
export const syncChannelCatalog = internalAction({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const channel = await ctx.runQuery(internal.channels.getById, {
      channelId: args.channelId,
    });
    if (!channel || !channel.catalogId) {
      console.warn(`[CATALOG_SYNC] Channel ${args.channelId} has no catalogId — skipping`);
      return;
    }

    const token = channel.accessToken
      ? await decrypt(channel.accessToken)
      : (process.env.WHATSAPP_API_TOKEN ?? "");

    if (!token) {
      console.error(`[CATALOG_SYNC] No token for channel ${args.channelId}`);
      return;
    }

    const products = await fetchAllProducts(channel.catalogId, token);
    if (products.length === 0) {
      console.log(`[CATALOG_SYNC] No products found for catalog ${channel.catalogId}`);
      return;
    }

    await ctx.runMutation(internal.catalog.clearChannelProducts, {
      channelId: args.channelId as Id<"channels">,
    });

    const syncedAt = Date.now();
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE).map(p => ({
        retailerId: p.retailer_id ?? p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        currency: p.currency,
        imageUrl: p.image_url,
        availability: p.availability,
      }));
      await ctx.runMutation(internal.catalog.insertProductBatch, {
        tenantId: channel.tenantId,
        channelId: args.channelId as Id<"channels">,
        catalogId: channel.catalogId,
        products: batch,
        syncedAt,
      });
    }

    console.log(`[CATALOG_SYNC] Synced ${products.length} products for channel ${args.channelId}`);
  },
});

// Cron entry — iterates all active catalog docs
export const syncAllCatalogs = internalAction({
  args: {},
  handler: async (ctx) => {
    const catalogs = await ctx.runQuery(internal.catalog.listAllActiveCatalogs);
    console.log(`[CATALOG_SYNC] Syncing ${catalogs.length} catalogs`);
    for (const catalog of catalogs) {
      await ctx.runAction(internal.actions.syncCatalog.syncOneCatalog, {
        catalogDocId: catalog._id,
      });
    }
  },
});
