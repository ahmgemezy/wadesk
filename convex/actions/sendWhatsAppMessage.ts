"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

const BASE = "https://graph.facebook.com/v21.0";

async function markFailed(ctx: { runMutation: Function }, messageId: string, tenantId: string) {
  await ctx.runMutation(internal.messages.updateStatus, {
    messageId: messageId as any,
    status: "failed",
    tenantId,
  });
}

export const sendMessage = internalAction({
  args: {
    messageId: v.id("messages"),
    phoneNumberId: v.string(),
    contactPhone: v.string(),
    content: v.string(),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const response = await fetch(
        `${BASE}/${args.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.META_SYSTEM_USER_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: args.contactPhone,
            type: "text",
            text: { body: args.content },
          }),
        },
      );

      if (!response.ok) {
        await markFailed(ctx, args.messageId, args.tenantId);
        return;
      }

      await ctx.runMutation(internal.messages.updateStatus, {
        messageId: args.messageId,
        status: "delivered",
        tenantId: args.tenantId,
      });
    } catch {
      await markFailed(ctx, args.messageId, args.tenantId);
    }
  },
});

export const sendLocation = internalAction({
  args: {
    messageId: v.id("messages"),
    phoneNumberId: v.string(),
    contactPhone: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    name: v.optional(v.string()),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const body: Record<string, unknown> = {
        messaging_product: "whatsapp",
        to: args.contactPhone,
        type: "location",
        location: {
          latitude: args.latitude,
          longitude: args.longitude,
          ...(args.name ? { name: args.name } : {}),
        },
      };

      const res = await fetch(`${BASE}/${args.phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.META_SYSTEM_USER_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) { await markFailed(ctx, args.messageId, args.tenantId); return; }

      await ctx.runMutation(internal.messages.updateStatus, {
        messageId: args.messageId,
        status: "delivered",
        tenantId: args.tenantId,
      });
    } catch {
      await markFailed(ctx, args.messageId, args.tenantId);
    }
  },
});

export const sendMediaMessage = internalAction({
  args: {
    messageId: v.id("messages"),
    phoneNumberId: v.string(),
    contactPhone: v.string(),
    mediaUrl: v.string(),
    contentType: v.union(
      v.literal("image"),
      v.literal("document"),
      v.literal("audio"),
      v.literal("video"),
    ),
    filename: v.optional(v.string()),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Step 1: Upload media to Meta to get a media_id
      const formData = new FormData();
      const fileRes = await fetch(args.mediaUrl);
      if (!fileRes.ok) { await markFailed(ctx, args.messageId, args.tenantId); return; }
      const blob = await fileRes.blob();
      formData.append("file", blob, args.filename ?? "file");
      formData.append("messaging_product", "whatsapp");

      const uploadRes = await fetch(`${BASE}/${args.phoneNumberId}/media`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.META_SYSTEM_USER_TOKEN}` },
        body: formData,
      });

      if (!uploadRes.ok) { await markFailed(ctx, args.messageId, args.tenantId); return; }
      const { id: mediaId } = await uploadRes.json() as { id: string };

      // Step 2: Send media message
      const typeKey = args.contentType; // "image" | "document" | "audio" | "video"
      const mediaPayload: Record<string, unknown> = { id: mediaId };
      if (args.contentType === "document" && args.filename) {
        mediaPayload.filename = args.filename;
      }

      const sendRes = await fetch(`${BASE}/${args.phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.META_SYSTEM_USER_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: args.contactPhone,
          type: typeKey,
          [typeKey]: mediaPayload,
        }),
      });

      if (!sendRes.ok) { await markFailed(ctx, args.messageId, args.tenantId); return; }

      await ctx.runMutation(internal.messages.updateStatus, {
        messageId: args.messageId,
        status: "delivered",
        tenantId: args.tenantId,
      });
    } catch {
      await markFailed(ctx, args.messageId, args.tenantId);
    }
  },
});
