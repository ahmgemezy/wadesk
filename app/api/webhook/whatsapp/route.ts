import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";

// Verify Meta's HMAC-SHA256 signature on the raw body
function verifySignature(
  payload: string,
  signature: string,
  appSecret: string,
): boolean {
  const expected =
    "sha256=" +
    createHmac("sha256", appSecret).update(payload).digest("hex");
  return expected === signature;
}

// GET — Meta hub verification challenge
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  ) {
    console.log("[WEBHOOK] Hub verification successful");
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn("[WEBHOOK] Hub verification failed — token mismatch");
  return new NextResponse("Forbidden", { status: 403 });
}

// POST — Incoming Meta events
export async function POST(req: NextRequest) {
  // Read raw body first — required for HMAC verification
  const body = await req.text();
  const signature = req.headers.get("x-hub-signature-256") ?? "";
  const appSecret = process.env.WHATSAPP_APP_SECRET ?? "";

  if (!verifySignature(body, signature, appSecret)) {
    console.warn("[WEBHOOK] Signature verification failed");
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Always return 200 immediately — Meta retries on non-200
  const convexSiteUrl = process.env.CONVEX_SITE_URL ?? "";
  const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET ?? "";

  // Fire-and-forget to Convex HTTP action (V2 — handles echoes + coexistence)
  fetch(`${convexSiteUrl}/webhooks/meta`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webhook-secret": webhookSecret,
    },
    body,
  }).catch((err: unknown) => {
    console.error("[WEBHOOK] Failed to forward to Convex:", err);
  });

  return new NextResponse("OK", { status: 200 });
}
