/**
 * Test webhook script — sends a fake Meta payload to the local Next.js
 * webhook endpoint with a valid HMAC-SHA256 signature.
 *
 * Usage:
 *   npx tsx scripts/test-webhook.ts
 *   npx tsx scripts/test-webhook.ts --type status
 *   npx tsx scripts/test-webhook.ts --url http://localhost:3000/api/webhook/whatsapp
 */

import { createHmac } from "crypto";

// ── Config ────────────────────────────────────────────────────────────────────

const WEBHOOK_URL =
  process.argv.find((a) => a.startsWith("--url="))?.split("=")[1] ??
  "http://localhost:3000/api/webhook/whatsapp";

const APP_SECRET = process.env.WHATSAPP_APP_SECRET ?? "test-secret";

const PHONE_NUMBER_ID =
  process.env.TEST_PHONE_NUMBER_ID ?? "123456789012345";

const TEST_TYPE =
  process.argv.find((a) => a.startsWith("--type="))?.split("=")[1] ??
  (process.argv.includes("--type") ? process.argv[process.argv.indexOf("--type") + 1] : "text");

// ── Payloads ──────────────────────────────────────────────────────────────────

const WAMID = `wamid.test_${Date.now()}`;

const textMessagePayload = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "WABA_TEST_ID",
      changes: [
        {
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "1234567890",
              phone_number_id: PHONE_NUMBER_ID,
            },
            contacts: [
              {
                profile: { name: "Ahmed Test" },
                wa_id: "201001234567",
              },
            ],
            messages: [
              {
                id: WAMID,
                from: "201001234567",
                timestamp: String(Math.floor(Date.now() / 1000)),
                type: "text",
                text: { body: "مرحبا، أريد الاستفسار عن منتجاتكم" },
              },
            ],
          },
          field: "messages",
        },
      ],
    },
  ],
};

const statusPayload = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "WABA_TEST_ID",
      changes: [
        {
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "1234567890",
              phone_number_id: PHONE_NUMBER_ID,
            },
            statuses: [
              {
                id: "wamid.existing_message_id",
                status: "delivered",
                timestamp: String(Math.floor(Date.now() / 1000)),
                recipient_id: "201001234567",
              },
            ],
          },
          field: "messages",
        },
      ],
    },
  ],
};

// ── Run ───────────────────────────────────────────────────────────────────────

async function main() {
  const payload = TEST_TYPE === "status" ? statusPayload : textMessagePayload;
  const body = JSON.stringify(payload);

  const signature =
    "sha256=" + createHmac("sha256", APP_SECRET).update(body).digest("hex");

  console.log(`\nSending ${TEST_TYPE} webhook to ${WEBHOOK_URL}`);
  console.log(`WAMID: ${WAMID}`);
  console.log(`Signature: ${signature.slice(0, 30)}...`);

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hub-signature-256": signature,
    },
    body,
  });

  console.log(`\nResponse: ${res.status} ${res.statusText}`);
  const text = await res.text();
  if (text) console.log(`Body: ${text}`);

  if (res.status === 200) {
    console.log("\n✓ Webhook accepted. Check Convex dashboard for inserted message.");
  } else {
    console.error("\n✗ Webhook rejected. Check WHATSAPP_APP_SECRET in .env.local");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
