import type { GenericActionCtx } from "convex/server";
import type { DataModel } from "../../_generated/dataModel";
import { internal } from "../../_generated/api";

type Ctx = GenericActionCtx<DataModel>;

type TemplateStatusPayload = {
  message_template_id?: number;
  message_template_name?: string;
  message_template_language?: string;
  event?: string; // "APPROVED" | "REJECTED" | "DISABLED" | "FLAGGED"
  reason?: string;
};

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

  if (!tenantId) return;

  const p = payload as TemplateStatusPayload;
  const templateName = p.message_template_name;
  const language = p.message_template_language;
  const event = p.event?.toUpperCase();

  if (!templateName || !event) return;

  // Map Meta event to our status string
  const statusMap: Record<string, string> = {
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    DISABLED: "PAUSED",
    FLAGGED: "FLAGGED",
    PENDING: "PENDING",
  };
  const newStatus = statusMap[event] ?? event;

  const resolvedTenantId = await ctx.runMutation(
    internal.metaTemplates.updateStatusFromWebhook,
    { wabaId, templateName, language, newStatus },
  );

  const effectiveTenantId = resolvedTenantId ?? tenantId;

  if (event === "APPROVED" || event === "REJECTED") {
    const admins = await ctx.runQuery(internal.metaTemplates.getAdminsForTenant, {
      tenantId: effectiveTenantId,
    });

    const message =
      event === "APPROVED"
        ? `Template "${templateName}" has been approved by Meta ✅`
        : `Template "${templateName}" was rejected by Meta ❌${p.reason ? ` — ${p.reason}` : ""}`;

    const type = event === "APPROVED" ? "template_approved" : "template_rejected";

    for (const admin of admins) {
      await ctx.runMutation(internal.metaTemplates.insertNotification, {
        tenantId: effectiveTenantId,
        userId: admin.userId,
        type,
        referenceId: templateName,
        message,
      });
    }
  }
}
