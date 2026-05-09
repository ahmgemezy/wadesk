"use node";

import { v, ConvexError } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCallerRole, assertAdmin } from "./lib/auth";

function getApiToken(): string {
  const token = process.env.WHATSAPP_API_TOKEN ?? process.env.META_SYSTEM_USER_TOKEN;
  if (!token) throw new ConvexError({ code: "NO_TOKEN", message: "WHATSAPP_API_TOKEN is not configured" });
  return token;
}

const META_API_BASE = "https://graph.facebook.com/v25.0";

async function assertAdminAndGetTenantId(ctx: Parameters<typeof getCallerRole>[0]) {
  const role = await getCallerRole(ctx);
  assertAdmin(role);
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.orgId) throw new ConvexError("NO_ORG");
  return identity.orgId as string;
}

export const getProfile = action({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const tenantId = await assertAdminAndGetTenantId(ctx);

    const channel = await ctx.runQuery(internal.channels.getById, {
      channelId: args.channelId,
      tenantId,
    });
    if (!channel) throw new ConvexError({ code: "NOT_FOUND", message: "Channel not found" });
    const token = getApiToken();

    const res = await fetch(
      `${META_API_BASE}/${channel.phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const text = await res.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
    } catch {
      throw new ConvexError({
        code: "META_API_ERROR",
        message: "Meta API returned an unexpected response",
      });
    }
    if (!res.ok) {
      console.error("[WA_PROFILE] GET failed:", data);
      const errorMessage = (data?.error as Record<string, string>)?.message ?? "Unknown error";
      const errorCode = (data?.error as Record<string, number>)?.code;
      // 190 = OAuthException (expired/invalid token)
      const isExpired = errorCode === 190 || /session has expired|invalid.*token|token.*expired/i.test(errorMessage);
      throw new ConvexError({
        code: isExpired ? "TOKEN_EXPIRED" : "META_API_ERROR",
        message: errorMessage,
      });
    }

    // Cache the profile picture URL on the channel document so the broadcast
    // modal preview can show it without a live Meta API call.
    const profilePictureUrl = (data as Record<string, unknown>)?.profile_picture_url;
    if (typeof profilePictureUrl === "string" && profilePictureUrl) {
      await ctx.runMutation(internal.channels.setProfilePictureUrl, {
        channelId: args.channelId,
        profilePictureUrl,
      });
    }

    return data;
  },
});

export const updateProfile = action({
  args: {
    channelId: v.id("channels"),
    data: v.object({
      description: v.optional(v.string()),
      address: v.optional(v.string()),
      email: v.optional(v.string()),
      websites: v.optional(v.array(v.string())),
      vertical: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const tenantId = await assertAdminAndGetTenantId(ctx);

    const channel = await ctx.runQuery(internal.channels.getById, {
      channelId: args.channelId,
      tenantId,
    });
    if (!channel) throw new ConvexError({ code: "NOT_FOUND", message: "Channel not found" });
    const token = getApiToken();

    const res = await fetch(
      `${META_API_BASE}/${channel.phoneNumberId}/whatsapp_business_profile`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args.data),
      }
    );
    const text = await res.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
    } catch {
      throw new ConvexError({
        code: "META_API_ERROR",
        message: "Meta API returned an unexpected response",
      });
    }
    if (!res.ok) {
      console.error("[WA_PROFILE] UPDATE failed:", data);
      throw new ConvexError({
        code: "META_API_ERROR",
        message: (data?.error as Record<string, string>)?.message ?? "Unknown error",
      });
    }
    return { success: true, data };
  },
});

export const uploadProfilePhoto = action({
  args: {
    channelId: v.id("channels"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const tenantId = await assertAdminAndGetTenantId(ctx);

    const channel = await ctx.runQuery(internal.channels.getById, {
      channelId: args.channelId,
      tenantId,
    });
    if (!channel) throw new ConvexError({ code: "NOT_FOUND", message: "Channel not found" });
    const token = getApiToken();

    const blob = await ctx.storage.get(args.storageId);
    if (!blob) throw new ConvexError("FILE_NOT_FOUND");

    const appId = process.env.META_APP_ID;
    if (!appId) throw new ConvexError({ code: "CONFIG_ERROR", message: "META_APP_ID is not configured" });

    const mimeType = blob.type || "image/jpeg";
    const fileBuffer = Buffer.from(await blob.arrayBuffer());

    // Step 1: Create a resumable upload session
    const sessionRes = await fetch(
      `${META_API_BASE}/${appId}/uploads?file_name=profile.jpg&file_length=${fileBuffer.length}&file_type=${encodeURIComponent(mimeType)}`,
      {
        method: "POST",
        headers: { Authorization: `OAuth ${token}` },
      }
    );
    const sessionData = (await sessionRes.json()) as { id?: string; error?: { message?: string } };
    if (!sessionRes.ok || !sessionData.id) {
      console.error("[WA_PROFILE] Upload session failed:", sessionData);
      throw new ConvexError({
        code: "META_API_ERROR",
        message: sessionData.error?.message ?? "Failed to create upload session",
      });
    }

    // Step 2: Upload the raw file bytes to the session
    const uploadRes = await fetch(
      `${META_API_BASE}/${sessionData.id}`,
      {
        method: "POST",
        headers: {
          Authorization: `OAuth ${token}`,
          file_offset: "0",
        },
        body: fileBuffer,
      }
    );
    const uploadData = (await uploadRes.json()) as { h?: string; error?: { message?: string } };
    if (!uploadRes.ok || !uploadData.h) {
      console.error("[WA_PROFILE] File upload failed:", uploadData);
      throw new ConvexError({
        code: "META_API_ERROR",
        message: uploadData.error?.message ?? "File upload failed",
      });
    }

    // Step 3: Set the profile picture using the returned handle
    const setPhotoRes = await fetch(
      `${META_API_BASE}/${channel.phoneNumberId}/whatsapp_business_profile`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          profile_picture_handle: uploadData.h,
        }),
      }
    );
    const setPhotoData = await setPhotoRes.json();
    if (!setPhotoRes.ok) {
      console.error("[WA_PROFILE] Set photo failed:", setPhotoData);
      throw new ConvexError({
        code: "META_API_ERROR",
        message: (setPhotoData as { error?: { message?: string } }).error?.message ?? "Set photo failed",
      });
    }
    return { success: true };
  },
});
