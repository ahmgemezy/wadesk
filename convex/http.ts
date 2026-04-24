import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { paddleWebhook } from "./billing";
import { metaWebhookV2 } from "./webhooks/meta";

// ── Types ────────────────────────────────────────────────────────────────────

type MetaMessage = {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; caption?: string };
  audio?: { id: string };
  document?: { id: string; filename?: string; caption?: string };
  video?: { id: string; caption?: string };
  sticker?: { id: string };
  location?: { latitude: number; longitude: number; name?: string };
  reaction?: { message_id: string; emoji: string };
  // Interactive replies (button_reply / list_reply) — v16.0+
  interactive?: {
    type: "button_reply" | "list_reply";
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
  // System messages (e.g. user changed phone number) — v16.0+
  system?: { body: string; type: string; wa_id?: string };
};

type MetaStatus = {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  // v16.0+: errors include message + error_data.details in addition to code/title
  errors?: { code: number; title: string; message?: string; error_data?: { details: string } }[];
  // v23.0 and below: conversation object present; removed in v24.0+
  conversation?: { id: string; expiration_timestamp?: string; origin?: { type: string } };
  // v24.0+: pricing.type replaces the deprecated billable field
  pricing?: {
    billable?: boolean;
    pricing_model?: string;
    type?: "regular" | "free_group_customer_service";
    category?: "group_marketing" | "group_utility" | "group_service";
  };
};

type ContentType =
  | "text"
  | "image"
  | "audio"
  | "document"
  | "video"
  | "sticker"
  | "location"
  | "unsupported";

// ── Content parsing ──────────────────────────────────────────────────────────

function parseMessageContent(msg: MetaMessage): {
  content: string;
  contentType: ContentType;
  mediaUrl?: string;
} {
  switch (msg.type) {
    case "text":
      return { content: msg.text?.body ?? "", contentType: "text" };
    case "image":
      return {
        content: msg.image?.caption ?? "[Image]",
        contentType: "image",
        mediaUrl: msg.image?.id,
      };
    case "audio":
      return { content: "[Voice Message]", contentType: "audio" };
    case "document":
      return {
        content: msg.document?.filename ?? msg.document?.caption ?? "[Document]",
        contentType: "document",
        mediaUrl: msg.document?.id,
      };
    case "video":
      return {
        content: msg.video?.caption ?? "[Video]",
        contentType: "video",
        mediaUrl: msg.video?.id,
      };
    case "sticker":
      return { content: "[Sticker]", contentType: "sticker" };
    case "location": {
      const loc = msg.location;
      const label = loc?.name ?? `${loc?.latitude ?? ""},${loc?.longitude ?? ""}`;
      return { content: `[Location: ${label}]`, contentType: "location" };
    }
    case "interactive": {
      const interactive = msg.interactive;
      if (interactive?.type === "button_reply") {
        return { content: interactive.button_reply?.title ?? "[Button Reply]", contentType: "text" };
      }
      if (interactive?.type === "list_reply") {
        return { content: interactive.list_reply?.title ?? "[List Reply]", contentType: "text" };
      }
      return { content: "[Interactive]", contentType: "unsupported" };
    }
    case "system":
      return { content: msg.system?.body ?? "[System Message]", contentType: "unsupported" };
    default:
      return { content: "[Unsupported message type]", contentType: "unsupported" };
  }
}

// ── Structured logger ────────────────────────────────────────────────────────

function log(event: string, details: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ tag: "[WEBHOOK]", event, ...details }));
}

function warn(event: string, details: Record<string, unknown> = {}) {
  console.warn(JSON.stringify({ tag: "[WEBHOOK]", event, ...details }));
}

// ── HTTP action ──────────────────────────────────────────────────────────────

export const metaWebhook = httpAction(async (ctx, request) => {
  // ── GET: hub verification ──────────────────────────────────────────────────
  if (request.method === "GET") {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (
      mode === "subscribe" &&
      token === process.env.META_WEBHOOK_VERIFY_TOKEN
    ) {
      log("hub_verification_success");
      return new Response(challenge, { status: 200 });
    }

    warn("hub_verification_failed");
    return new Response("Forbidden", { status: 403 });
  }

  // ── POST: incoming events ─────────────────────────────────────────────────
  if (request.method === "POST") {
    const body = await request.text();

    // Accept either:
    // 1. Forwarded from Next.js route (x-webhook-secret header)
    // 2. Direct from Meta (x-hub-signature-256 header) — for Convex direct access
    const webhookSecret = request.headers.get("x-webhook-secret");
    const isFromNextjs =
      webhookSecret !== null &&
      webhookSecret === process.env.WHATSAPP_WEBHOOK_SECRET;

    if (!isFromNextjs) {
      // Direct Meta call — verify HMAC
      const signature = request.headers.get("x-hub-signature-256") ?? "";
      const appSecret = process.env.META_APP_SECRET ?? "";

      const isValid = await verifyHmac(body, signature, appSecret);
      if (!isValid) {
        warn("signature_verification_failed");
        return new Response("Forbidden", { status: 403 });
      }
    }

    try {
      const payload = JSON.parse(body) as {
        entry?: {
          id: string;
          changes?: {
            value?: {
              metadata?: { phone_number_id: string; display_phone_number: string };
              contacts?: { profile: { name: string }; wa_id: string }[];
              messages?: MetaMessage[];
              statuses?: MetaStatus[];
            };
          }[];
        }[];
      };

      for (const entry of payload.entry ?? []) {
        for (const change of entry.changes ?? []) {
          const value = change.value;
          if (!value) continue;

          const phoneNumberId = value.metadata?.phone_number_id ?? "";
          log("webhook_received", {
            phoneNumberId,
            messageCount: value.messages?.length ?? 0,
            statusCount: value.statuses?.length ?? 0,
          });

          // Resolve channel
          const channels = await ctx.runQuery(internal.channels.listByPhoneId, {
            phoneNumberId,
          });

          if (!channels.length) {
            warn("unknown_phone_number_id", { phoneNumberId });
            continue;
          }
          const channel = channels[0];

          // ── Process inbound messages ────────────────────────────────────
          for (const msg of value.messages ?? []) {
            // ── Handle incoming reactions ────────────────────────────────
            if (msg.type === "reaction") {
              const reaction = (msg as any).reaction as { message_id: string; emoji: string } | undefined;
              if (reaction) {
                await ctx.runMutation(internal.messages.handleIncomingReaction, {
                  tenantId: channel.tenantId,
                  metaMessageId: reaction.message_id,
                  reactorPhone: msg.from,
                  emoji: reaction.emoji ?? "",
                });
              }
              continue;
            }

            const { content, contentType, mediaUrl } = parseMessageContent(msg);
            const senderName = value.contacts?.[0]?.profile?.name;

            log("processing_message", {
              orgId: channel.tenantId,
              metaMessageId: msg.id,
              type: msg.type,
              contentType,
            });

            // ── Check if this is a CSAT response (single digit 1–5) ──────────
            if (/^[1-5]$/.test(content.trim()) && contentType === "text") {
              const isCsat: boolean = await ctx.runMutation(internal.csat.checkAndRecordResponse, {
                tenantId: channel.tenantId,
                senderPhone: msg.from,
                content: content.trim(),
                channelId: channel._id,
              });
              if (isCsat) {
                log("csat_response_recorded", {
                  orgId: channel.tenantId,
                  senderPhone: msg.from,
                  score: content.trim(),
                });
                continue; // skip creating a new conversation message
              }
            }

            const result: {
              messageId: Id<"messages">;
              conversationId: Id<"conversations">;
              isNewConversation: boolean;
              isDuplicate: boolean;
            } = await ctx.runMutation(internal.messages.createInbound, {
              tenantId: channel.tenantId,
              channelId: channel._id,
              metaMessageId: msg.id,
              senderPhone: msg.from,
              wabaId: phoneNumberId,
              content,
              contentType,
              mediaUrl,
              timestamp: Number(msg.timestamp) * 1000,
              senderDisplayName: senderName,
            });

            if (result.isDuplicate) {
              log("duplicate_message_skipped", {
                orgId: channel.tenantId,
                metaMessageId: msg.id,
              });
              continue;
            }

            log("message_inserted", {
              orgId: channel.tenantId,
              messageId: result.messageId,
              conversationId: result.conversationId,
              isNewConversation: result.isNewConversation,
            });

            if (result.isNewConversation) {
              // Get the conversation to find its department
              const conversation = await ctx.runQuery(internal.conversations.getInternal, {
                conversationId: result.conversationId,
              });

              if (conversation?.departmentId) {
                const department = await ctx.runQuery(internal.departments.getInternal, {
                  departmentId: conversation.departmentId,
                });

                if (department?.assignmentMode === "round_robin") {
                  await ctx.runAction(internal.actions.roundRobin.assignRoundRobin, {
                    tenantId: channel.tenantId,
                    channelId: channel._id,
                    departmentId: conversation.departmentId,
                    conversationId: result.conversationId,
                  });
                }
              }
            }

            await ctx.runMutation(internal.automations.evaluateAndFireAutomations, {
              tenantId: channel.tenantId,
              channelId: channel._id,
              conversationId: result.conversationId,
              messageContent: content,
              isNewConversation: result.isNewConversation,
            });
          }

          // ── Process status updates ──────────────────────────────────────
          for (const status of value.statuses ?? []) {
            const validStatuses = ["sent", "delivered", "read", "failed"] as const;
            if (!validStatuses.includes(status.status)) continue;

            await ctx.runMutation(internal.messages.updateStatusByMetaId, {
              metaMessageId: status.id,
              status: status.status,
              tenantId: channel.tenantId,
            });

            log("status_update_applied", {
              orgId: channel.tenantId,
              metaMessageId: status.id,
              status: status.status,
            });

            if (status.status === "failed" && status.errors?.length) {
              warn("message_delivery_failed", {
                orgId: channel.tenantId,
                metaMessageId: status.id,
                errors: status.errors,
              });
            }
          }
        }
      }
    } catch (err) {
      warn("processing_error", { error: String(err) });
      // Swallow — always return 200 to Meta
    }

    return new Response("OK", { status: 200 });
  }

  return new Response("Method Not Allowed", { status: 405 });
});

// ── HMAC verification (Web Crypto API — works in Convex edge runtime) ────────

async function verifyHmac(
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

// ── Router ───────────────────────────────────────────────────────────────────

const http = httpRouter();
http.route({ path: "/meta-webhook", method: "GET", handler: metaWebhook });
http.route({ path: "/meta-webhook", method: "POST", handler: metaWebhook });
// New structured webhook endpoint — routes by wabaId, modular processor files
http.route({ path: "/webhooks/meta", method: "GET", handler: metaWebhookV2 });
http.route({ path: "/webhooks/meta", method: "POST", handler: metaWebhookV2 });
http.route({ path: "/paddle-webhook", method: "POST", handler: paddleWebhook });

export default http;
