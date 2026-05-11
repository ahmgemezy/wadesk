"use node";

import { action } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { api, internal } from "../_generated/api";
import { decrypt } from "../lib/encryption";
import { getCallerIdentity, assertAdmin, type OrgRole } from "../lib/auth";

const BASE = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION ?? "v25.0"}`;

/**
 * Creates a new Meta Commerce Manager catalog for the channel's WABA business,
 * then inserts a catalog doc into the catalogs table and links it to the channel.
 *
 * Requires the access token to have catalog_management + business_management permissions.
 */
export const createMetaCatalog = action({
  args: {
    channelId: v.id("channels"),
    catalogName: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);

    const channel = await ctx.runQuery(internal.channels.getById, {
      channelId: args.channelId,
    });
    if (!channel || channel.tenantId !== tenantId)
      throw new ConvexError("NOT_FOUND");

    // In production each channel has its own access token (from Embedded Signup).
    // The system user token is only a dev fallback (no Embedded Signup available).
    const token =
      (channel.accessToken ? await decrypt(channel.accessToken) : "") ||
      process.env.META_SYSTEM_USER_TOKEN ||
      "";
    if (!token) throw new ConvexError("NO_TOKEN");

    // Step 1: Resolve business ID
    // Priority: env override → WABA lookup → /me lookup (system user token fallback)
    let businessId: string | undefined = process.env.META_BUSINESS_ID || undefined;

    if (!businessId) {
      const wabaRes = await fetch(`${BASE}/${channel.wabaId}?fields=business`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const wabaData = (await wabaRes.json()) as {
        business?: { id: string };
        error?: { message: string };
      };
      businessId = wabaData.business?.id;
    }

    if (!businessId) {
      // For system user tokens, /me returns the system user which has a business field
      const meRes = await fetch(`${BASE}/me?fields=business`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = (await meRes.json()) as {
        business?: { id: string };
        error?: { message: string };
      };
      businessId = meData.business?.id;
      if (!businessId) {
        throw new ConvexError(
          meData.error?.message ??
            "Could not resolve Business ID. Set META_BUSINESS_ID in your env vars.",
        );
      }
    }

    // Step 2: Create the catalog in Meta
    const createRes = await fetch(`${BASE}/${businessId}/owned_product_catalogs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: args.catalogName.trim() }),
    });
    const createData = (await createRes.json()) as {
      id?: string;
      error?: { message: string };
    };
    if (!createData.id) {
      throw new ConvexError(
        createData.error?.message ?? "Failed to create catalog in Meta",
      );
    }

    // Step 3: Insert catalog doc into the catalogs table
    await ctx.runMutation(api.catalog.addCatalog, {
      channelId: args.channelId,
      metaCatalogId: createData.id,
      name: args.catalogName.trim(),
    });

    return { catalogId: createData.id };
  },
});

/**
 * Pushes a WABDesk product to its Meta Commerce Manager catalog.
 * Uses the product's own catalogId field (supports multi-catalog).
 */
export const pushProductToMeta = action({
  args: {
    channelId: v.id("channels"),
    productId: v.id("catalogProducts"),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);

    const channel = await ctx.runQuery(internal.channels.getById, {
      channelId: args.channelId,
    });
    if (!channel || channel.tenantId !== tenantId)
      throw new ConvexError("NOT_FOUND");

    const product = await ctx.runQuery(internal.catalog.getProductInternal, {
      productId: args.productId,
    });
    if (!product || product.tenantId !== tenantId)
      throw new ConvexError("PRODUCT_NOT_FOUND");
    if (!product.catalogId)
      throw new ConvexError("CATALOG_NOT_CONFIGURED");

    // In production each channel has its own access token (from Embedded Signup).
    // The system user token is only a dev fallback (no Embedded Signup available).
    const token =
      (channel.accessToken ? await decrypt(channel.accessToken) : "") ||
      process.env.META_SYSTEM_USER_TOKEN ||
      "";
    if (!token) throw new ConvexError("NO_TOKEN");

    const body: Record<string, unknown> = {
      retailer_id: product.retailerId,
      name: product.name,
      availability: product.availability ?? "in stock",
    };
    if (product.description) body.description = product.description;
    if (product.imageUrl) body.image_url = product.imageUrl;
    if (product.price && product.currency) {
      // Meta expects price as integer in the lowest currency unit (e.g. cents)
      body.price = Math.round(parseFloat(product.price) * 100);
      body.currency = product.currency;
    }

    const res = await fetch(`${BASE}/${product.catalogId}/products`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as {
        error?: { message: string };
      };
      throw new ConvexError(
        errData.error?.message ?? `Meta API error ${res.status}`,
      );
    }

    return { success: true };
  },
});
