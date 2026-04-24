import type { GenericActionCtx } from "convex/server";
import type { DataModel } from "../../_generated/dataModel";
import { internal } from "../../_generated/api";

type Ctx = GenericActionCtx<DataModel>;

/**
 * Template status update processor — stub.
 * Full template management (approval/rejection tracking) is deferred.
 * Events are logged to webhook_events for debugging.
 */
export async function processTemplates(
  ctx: Ctx,
  tenantId: string | undefined,
  wabaId: string,
  payload: unknown,
): Promise<void> {
  await ctx.runMutation(internal.webhookEvents.insert, {
    tenantId,
    wabaId,
    eventType: "template_status",
    payload,
  });
}
