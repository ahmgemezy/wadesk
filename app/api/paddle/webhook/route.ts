import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): boolean {
  const parts = Object.fromEntries(
    signatureHeader.split(";").map((p) => p.split("=") as [string, string])
  );
  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) return false;

  const signed = `${ts}:${rawBody}`;
  const expected = createHmac("sha256", secret).update(signed, "utf8").digest("hex");

  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(h1, "hex"));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get("paddle-signature") ?? "";
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET ?? "";

  if (!verifyPaddleSignature(rawBody, signatureHeader, webhookSecret)) {
    console.warn("[paddle-webhook] Signature verification failed");
    return new NextResponse("Forbidden", { status: 403 });
  }

  const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.replace(
    "convex.cloud",
    "convex.site"
  ) ?? "";
  const internalSecret = process.env.PADDLE_INTERNAL_SECRET ?? "";

  fetch(`${convexSiteUrl}/paddle-webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-paddle-internal-secret": internalSecret,
    },
    body: rawBody,
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable)");
      console.error(`[paddle-webhook] Convex rejected with ${res.status}: ${body}`);
    }
  }).catch((err: unknown) => {
    console.error("[paddle-webhook] Failed to forward to Convex:", err);
  });

  return new NextResponse("OK", { status: 200 });
}
