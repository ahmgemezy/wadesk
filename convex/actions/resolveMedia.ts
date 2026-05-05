"use node";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { decrypt } from "../lib/encryption";

const TAG = "[RESOLVE_MEDIA]";

async function fetchMetaMediaUrl(
  mediaId: string,
  token: string,
  apiVersion: string,
): Promise<{ url: string; mimeType?: string } | null> {
  const res = await fetch(`https://graph.facebook.com/${apiVersion}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { url?: string; mime_type?: string };
  if (!data.url) return null;
  return { url: data.url, mimeType: data.mime_type };
}

export const resolveInboundMedia = internalAction({
  args: {
    messageId: v.id("messages"),
    mediaId: v.string(),
    channelId: v.id("channels"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Build ordered token list: channel token first, then system user tokens
    const channel = await ctx.runQuery(internal.messages.getChannelInternal, {
      channelId: args.channelId,
      tenantId: args.tenantId,
    });

    const tokens: string[] = [];
    if (channel?.accessToken) {
      try {
        const decrypted = await decrypt(channel.accessToken);
        if (decrypted) tokens.push(decrypted);
      } catch {
        // decryption failed — skip channel token
      }
    }
    const sysToken = process.env.WHATSAPP_API_TOKEN ?? process.env.META_SYSTEM_USER_TOKEN;
    if (sysToken) tokens.push(sysToken);

    if (tokens.length === 0) {
      console.warn(JSON.stringify({ tag: TAG, event: "no_token", channelId: args.channelId }));
      return;
    }

    const apiVersion = process.env.WHATSAPP_API_VERSION ?? "v25.0";

    // 2. Resolve media ID → signed download URL, trying each token in order
    let signedUrl: string | null = null;
    let usedToken: string | null = null;
    for (const token of tokens) {
      const result = await fetchMetaMediaUrl(args.mediaId, token, apiVersion);
      if (result) {
        signedUrl = result.url;
        usedToken = token;
        break;
      }
    }

    if (!signedUrl || !usedToken) {
      console.warn(JSON.stringify({ tag: TAG, event: "meta_resolve_failed", mediaId: args.mediaId, triedTokens: tokens.length }));
      return;
    }

    // 3. Download binary from Meta's signed URL
    const binaryRes = await fetch(signedUrl, {
      headers: { Authorization: `Bearer ${usedToken}` },
    });
    if (!binaryRes.ok) {
      console.warn(JSON.stringify({ tag: TAG, event: "download_failed", status: binaryRes.status, mediaId: args.mediaId }));
      return;
    }

    // 4. Store in Convex storage
    const blob = await binaryRes.blob();
    const storageId = await ctx.storage.store(blob);
    const storageUrl = await ctx.storage.getUrl(storageId);
    if (!storageUrl) {
      console.warn(JSON.stringify({ tag: TAG, event: "storage_url_null", messageId: args.messageId }));
      return;
    }

    // 5. Patch message with real Convex storage URL
    await ctx.runMutation(internal.messages.updateMediaUrl, {
      messageId: args.messageId,
      mediaUrl: storageUrl,
    });

    console.log(JSON.stringify({ tag: TAG, event: "resolved", messageId: args.messageId }));
  },
});
