import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

async function verifySignature(
  body: string,
  signature: string,
  appSecret: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hexMac = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return signature === `sha256=${hexMac}`;
}

export const metaWebhook = httpAction(async (ctx, request) => {
  if (request.method === "GET") {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (
      mode === "subscribe" &&
      token === process.env.META_WEBHOOK_VERIFY_TOKEN
    ) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (request.method === "POST") {
    const body = await request.text();
    const signature = request.headers.get("x-hub-signature-256") ?? "";

    const isValid = await verifySignature(
      body,
      signature,
      process.env.META_APP_SECRET ?? "",
    );
    if (!isValid) {
      return new Response("Forbidden", { status: 403 });
    }

    try {
      const payload = JSON.parse(body);
      const entry = payload.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (messages?.length) {
        const msg = messages[0];
        const phoneNumberId = value.metadata?.phone_number_id;

        const channels = await ctx.runQuery(internal.channels.listByPhoneId, {
          phoneNumberId,
        });
        if (!channels.length) {
          return new Response("OK", { status: 200 });
        }
        const channel = channels[0];

        const messageType = msg.type ?? "text";
        let content = "";
        if (messageType === "text") {
          content = msg.text?.body ?? "";
        } else {
          content = `[Unsupported message type]`;
        }

        const result: { messageId: Id<"messages">; conversationId: Id<"conversations">; isNewConversation: boolean } = await ctx.runMutation(internal.messages.createInbound, {
          tenantId: channel.tenantId,
          channelId: channel._id,
          metaMessageId: msg.id,
          senderPhone: msg.from,
          content,
          contentType: messageType === "text" ? "text" : "unsupported",
          timestamp: Number(msg.timestamp) * 1000,
          senderDisplayName: value.contacts?.[0]?.profile?.name,
        });

        if (channel.assignmentMode === "round_robin" && result.isNewConversation) {
          await ctx.runAction(internal.actions.roundRobin.assignRoundRobin, {
            tenantId: channel.tenantId,
            channelId: channel._id,
            conversationId: result.conversationId,
          });
        }
      }

      const statuses = value?.statuses;
      if (statuses?.length) {
        const status = statuses[0];
        const metaMessageId = status.id;
        const statusValue = status.status as
          | "sent"
          | "delivered"
          | "read"
          | "failed";

        if (["sent", "delivered", "read", "failed"].includes(statusValue)) {
          await ctx.runMutation(internal.messages.updateStatusByMetaId, {
            metaMessageId,
            status: statusValue,
          });
        }
      }
    } catch {
      // swallow errors — always return 200 to Meta
    }

    return new Response("OK", { status: 200 });
  }

  return new Response("Method Not Allowed", { status: 405 });
});

const http = httpRouter();
http.route({
  path: "/meta-webhook",
  method: "GET",
  handler: metaWebhook,
});
http.route({
  path: "/meta-webhook",
  method: "POST",
  handler: metaWebhook,
});

export default http;
