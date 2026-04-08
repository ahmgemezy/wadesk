"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

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
        `https://graph.facebook.com/v21.0/${args.phoneNumberId}/messages`,
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
        await ctx.runMutation(internal.messages.updateStatus, {
          messageId: args.messageId,
          status: "failed",
          tenantId: args.tenantId,
        });
        return;
      }

      await ctx.runMutation(internal.messages.updateStatus, {
        messageId: args.messageId,
        status: "delivered",
        tenantId: args.tenantId,
      });
    } catch {
      await ctx.runMutation(internal.messages.updateStatus, {
        messageId: args.messageId,
        status: "failed",
        tenantId: args.tenantId,
      });
    }
  },
});
