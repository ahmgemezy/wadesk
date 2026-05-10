"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

const BASE = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION ?? "v25.0"}`;

async function markFailed(ctx: { runMutation: Function }, messageId: string, tenantId: string, reason?: string) {
  await ctx.runMutation(internal.messages.updateStatus, {
    messageId: messageId as any,
    status: "failed",
    tenantId,
    failureReason: reason,
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
            recipient_type: "individual",
            to: args.contactPhone,
            type: "text",
            text: { body: args.content, preview_url: false },
          }),
        },
      );

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        await markFailed(ctx, args.messageId, args.tenantId, errBody);
        return;
      }

      const data = (await response.json()) as { messages?: { id: string }[] };
      const metaId = data.messages?.[0]?.id;
      if (metaId) {
        await ctx.runMutation(internal.messages.setMetaMessageId, {
          messageId: args.messageId,
          metaMessageId: metaId,
          tenantId: args.tenantId,
        });
      }

      await ctx.runMutation(internal.messages.updateStatus, {
        messageId: args.messageId,
        status: "sent",
        tenantId: args.tenantId,
      });
    } catch (err) {
      await markFailed(ctx, args.messageId, args.tenantId, String(err));
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

      const locData = (await res.json()) as { messages?: { id: string }[] };
      const locMetaId = locData.messages?.[0]?.id;
      if (locMetaId) {
        await ctx.runMutation(internal.messages.setMetaMessageId, {
          messageId: args.messageId,
          metaMessageId: locMetaId,
          tenantId: args.tenantId,
        });
      }

      await ctx.runMutation(internal.messages.updateStatus, {
        messageId: args.messageId,
        status: "sent",
        tenantId: args.tenantId,
      });
    } catch {
      await markFailed(ctx, args.messageId, args.tenantId);
    }
  },
});

export const sendQuotedMessage = internalAction({
  args: {
    messageId: v.id("messages"),
    phoneNumberId: v.string(),
    contactPhone: v.string(),
    content: v.string(),
    quotedMetaMessageId: v.string(),
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
            context: { message_id: args.quotedMetaMessageId },
            type: "text",
            text: { body: args.content },
          }),
        },
      );

      if (!response.ok) {
        await markFailed(ctx, args.messageId, args.tenantId);
        return;
      }

      const data = (await response.json()) as { messages?: { id: string }[] };
      const metaId = data.messages?.[0]?.id;
      if (metaId) {
        await ctx.runMutation(internal.messages.setMetaMessageId, {
          messageId: args.messageId,
          metaMessageId: metaId,
          tenantId: args.tenantId,
        });
      }

      await ctx.runMutation(internal.messages.updateStatus, {
        messageId: args.messageId,
        status: "sent",
        tenantId: args.tenantId,
      });
    } catch {
      await markFailed(ctx, args.messageId, args.tenantId);
    }
  },
});

export const deleteWhatsAppMessage = internalAction({
  args: {
    messageId: v.id("messages"),
    phoneNumberId: v.string(),
    metaMessageId: v.string(),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const deleteResponse = await fetch(
        `${BASE}/${args.phoneNumberId}/messages/${args.metaMessageId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${process.env.META_SYSTEM_USER_TOKEN}`,
          },
        },
      );
      if (deleteResponse.ok) {
        await ctx.runMutation(internal.messages.markDeletedInDb, {
          messageId: args.messageId,
          tenantId: args.tenantId,
        });
      }
    } catch {
      // Silent — deletion window may have passed
    }
  },
});

export const sendReaction = internalAction({
  args: {
    phoneNumberId: v.string(),
    contactPhone: v.string(),
    metaMessageId: v.string(),
    emoji: v.string(),
    tenantId: v.string(),
  },
  handler: async (ctx, _args) => {
    try {
      await fetch(
        `${BASE}/${_args.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.META_SYSTEM_USER_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: _args.contactPhone,
            type: "reaction",
            reaction: {
              message_id: _args.metaMessageId,
              emoji: _args.emoji,
            },
          }),
        },
      );
    } catch {
      // Silent
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
    caption: v.optional(v.string()),
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
      if (args.caption && args.contentType !== "audio") {
        mediaPayload.caption = args.caption;
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

      const mediaData = (await sendRes.json()) as { messages?: { id: string }[] };
      const mediaMetaId = mediaData.messages?.[0]?.id;
      if (mediaMetaId) {
        await ctx.runMutation(internal.messages.setMetaMessageId, {
          messageId: args.messageId,
          metaMessageId: mediaMetaId,
          tenantId: args.tenantId,
        });
      }

      await ctx.runMutation(internal.messages.updateStatus, {
        messageId: args.messageId,
        status: "sent",
        tenantId: args.tenantId,
      });
    } catch {
      await markFailed(ctx, args.messageId, args.tenantId);
    }
  },
});
