import { httpRouter } from "convex/server";
import { paddleWebhook } from "./billing";
import { metaWebhookV2 } from "./webhooks/meta";
import { authComponent, createAuth } from "./auth";

// ── Router ───────────────────────────────────────────────────────────────────

const http = httpRouter();
// Structured webhook endpoint — routes by wabaId, modular processor files
http.route({ path: "/webhooks/meta", method: "GET", handler: metaWebhookV2 });
http.route({ path: "/webhooks/meta", method: "POST", handler: metaWebhookV2 });
http.route({ path: "/paddle-webhook", method: "POST", handler: paddleWebhook });

authComponent.registerRoutes(http, createAuth);

export default http;
