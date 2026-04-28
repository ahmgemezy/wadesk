"use node";

import { internalAction, internalMutation } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "../_generated/api";

const BASE = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION ?? "v25.0"}`;

export const sendInviteViaWhatsApp = internalAction({
  args: {
    tenantId: v.string(),
    phoneNumber: v.string(),
    inviteLink: v.string(),
    orgName: v.string(),
    role: v.union(v.literal("org:agent"), v.literal("org:supervisor")),
  },
  handler: async (ctx, args) => {
    const roleText = args.role === "org:supervisor" ? "مشرف" : "وكيل";
    const message = `مرحباً!\n\n` +
      `لقد تم دعوتك للانضمام إلى فريق ${args.orgName} على WABDesk كـ${roleText}.\n\n` +
      `انقر على الرابط التالي للانضمام:\n${args.inviteLink}\n\n` +
      `إذا كان الرابط لا يعمل، انسخه والصقه في المتصفح.\n\n` +
      `شكراً لتعاملكم معنا 🐪`;

    const accessToken = process.env.META_SYSTEM_USER_TOKEN;
    if (!accessToken) {
      throw new ConvexError("META_TOKEN_NOT_CONFIGURED");
    }
    
    const res = await fetch(`${BASE}/me/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: args.phoneNumber,
        type: "text",
        text: { body: message },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new ConvexError(`WHATSAPP_SEND_FAILED: ${err}`);
    }

    return { ok: true };
  },
});