import { v, ConvexError } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCallerRole, assertAdmin } from "./lib/auth";
import { decrypt } from "./lib/encryption";

const META_API_BASE = "https://graph.facebook.com/v19.0";

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
    if (!channel?.accessToken) throw new ConvexError("NO_TOKEN");
    const token = await decrypt(channel.accessToken);

    const res = await fetch(
      `${META_API_BASE}/${channel.phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const text = await res.text();
    const data = JSON.parse(text);
    if (!res.ok) {
      console.error("[WA_PROFILE] GET failed:", data);
      throw new ConvexError({
        code: "META_API_ERROR",
        message: data?.error?.message ?? "Unknown error",
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
    if (!channel?.accessToken) throw new ConvexError("NO_TOKEN");
    const token = await decrypt(channel.accessToken);

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
    const data = JSON.parse(text);
    if (!res.ok) {
      console.error("[WA_PROFILE] UPDATE failed:", data);
      throw new ConvexError({
        code: "META_API_ERROR",
        message: data?.error?.message ?? "Unknown error",
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
    if (!channel?.accessToken) throw new ConvexError("NO_TOKEN");
    const token = await decrypt(channel.accessToken);

    const blob = await ctx.storage.get(args.storageId);
    if (!blob) throw new ConvexError("FILE_NOT_FOUND");

    const mimeType = blob.type || "image/jpeg";
    const formData = new FormData();
    formData.append("messaging_product", "whatsapp");
    formData.append("file", new File([await blob.arrayBuffer()], "profile.jpg", { type: mimeType }));
    formData.append("type", mimeType);

    const uploadRes = await fetch(
      `${META_API_BASE}/${channel.phoneNumberId}/media`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Content-Type is intentionally omitted — fetch sets it with the boundary for multipart/form-data
        },
        body: formData,
      }
    );
    const uploadData = (await uploadRes.json()) as { id?: string; error?: { message?: string } };
    if (!uploadRes.ok || !uploadData.id) {
      console.error("[WA_PROFILE] Media upload failed:", uploadData);
      throw new ConvexError({
        code: "META_API_ERROR",
        message: uploadData.error?.message ?? "Media upload failed",
      });
    }

    const handle = uploadData.id;
    const setPhotoRes = await fetch(
      `${META_API_BASE}/${channel.phoneNumberId}/whatsapp_business_profile`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile_picture_handle: handle,
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
