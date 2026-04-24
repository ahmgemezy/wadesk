import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { verifyMetaSignature } from "./verify";
import { processMessages } from "./processors/messages";
import { processStatuses } from "./processors/statuses";
import { processTemplates } from "./processors/templates";
import type { MetaMessage } from "./processors/messages";
import type { MetaStatus } from "./processors/statuses";

// ── Structured logger ────────────────────────────────────────────────────────

function log(event: string, details: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ tag: "[WEBHOOK-V2]", event, ...details }));
}

function warn(event: string, details: Record<string, unknown> = {}) {
  console.warn(JSON.stringify({ tag: "[WEBHOOK-V2]", event, ...details }));
}

// ── Meta webhook HTTP action ─────────────────────────────────────────────────

export const metaWebhookV2 = httpAction(async (ctx, request) => {
  // ── GET: hub verification ──────────────────────────────────────────────────
  if (request.method === "GET") {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
      log("hub_verification_success");
      return new Response(challenge, { status: 200 });
    }

    warn("hub_verification_failed");
    return new Response("Forbidden", { status: 403 });
  }

  // ── POST: incoming events ─────────────────────────────────────────────────
  if (request.method === "POST") {
    // Step 1: read raw body BEFORE any JSON parse — HMAC needs exact bytes
    const rawBody = await request.text();

    // Step 2: verify HMAC-SHA256 signature
    const signature = request.headers.get("x-hub-signature-256");
    const appSecret = process.env.META_APP_SECRET ?? "";

    const isValid = await verifyMetaSignature(rawBody, signature, appSecret);
    if (!isValid) {
      warn("signature_verification_failed");
      return new Response("Unauthorized", { status: 401 });
    }

    // Step 3: parse JSON only after signature passes
    let payload: {
      entry?: {
        id: string;
        changes?: {
          field: string;
          value?: {
            metadata?: { phone_number_id: string; display_phone_number: string };
            contacts?: { profile: { name: string }; wa_id: string }[];
            messages?: MetaMessage[];
            statuses?: MetaStatus[];
          };
        }[];
      }[];
    };

    try {
      payload = JSON.parse(rawBody);
    } catch {
      warn("json_parse_failed");
      return new Response("Bad Request", { status: 400 });
    }

    // Step 4: route by wabaId (entry.id)
    for (const entry of payload.entry ?? []) {
      const wabaId = entry.id;

      const channel = await ctx.runQuery(internal.channels.getByWabaId, { wabaId });

      if (!channel) {
        warn("unknown_waba_id", { wabaId });
        // Log for debugging but never 404 — Meta must get 200
        await ctx.runMutation(internal.webhookEvents.insert, {
          tenantId: undefined,
          wabaId,
          eventType: "unknown_waba",
          payload: entry,
        });
        continue;
      }

      for (const change of entry.changes ?? []) {
        try {
          const value = change.value;

          log("processing_change", {
            tenantId: channel.tenantId,
            wabaId,
            field: change.field,
            messageCount: value?.messages?.length ?? 0,
            statusCount: value?.statuses?.length ?? 0,
          });

          switch (change.field) {
            case "messages":
              await processMessages(
                ctx,
                channel,
                value?.messages ?? [],
                value?.contacts ?? [],
              );
              await processStatuses(
                ctx,
                channel,
                value?.statuses ?? [],
              );
              break;

            case "message_template_status_update":
              await processTemplates(ctx, channel.tenantId, wabaId, value);
              break;

            case "account_update":
              // Log account updates for observability; no DB changes needed in v1
              log("account_update", { tenantId: channel.tenantId, wabaId, payload: value });
              break;

            default:
              log("unhandled_field", { field: change.field, wabaId });
          }
        } catch (err) {
          // Per-change error isolation — one bad change must not abort the batch
          warn("change_processing_error", {
            tenantId: channel.tenantId,
            wabaId,
            field: change.field,
            error: String(err),
          });
          await ctx.runMutation(internal.webhookEvents.insert, {
            tenantId: channel.tenantId,
            wabaId,
            eventType: change.field ?? "unknown",
            payload: change.value,
            error: String(err),
          });
        }
      }
    }

    // Always 200 after processing — Meta retries on non-200
    return new Response("OK", { status: 200 });
  }

  return new Response("Method Not Allowed", { status: 405 });
});
