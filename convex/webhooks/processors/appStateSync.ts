import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";

/** Processor stub for smb_app_state_sync webhook field (WhatsApp Coexistence)
 * Handles app state changes synced from the WhatsApp Business mobile app
 * (e.g., "business_app" or "cloud_api" state notifications).
 * v1 (Stage 3): Logs only — no state tracking logic yet.
 */
export const processAppStateSync = internalMutation({
  args: {
    tenantId: v.string(),
    channelId: v.id("channels"),
    appState: v.union(v.literal("business_app"), v.literal("cloud_api")),
  },
  handler: async (ctx, args) => {
    // Stub: log event for now
    console.log(JSON.stringify({
      tag: "[WEBHOOK_APP_STATE_SYNC]",
      event: "app_state_sync_received_stub",
      tenantId: args.tenantId,
      channelId: args.channelId,
      appState: args.appState,
    }));

    return { processed: false, reason: "v1_stub_no_logic" };
  },
});
