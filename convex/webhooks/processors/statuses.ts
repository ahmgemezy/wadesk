import type { GenericActionCtx } from "convex/server";
import type { DataModel } from "../../_generated/dataModel";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

type Ctx = GenericActionCtx<DataModel>;

export type MetaStatus = {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: { code: number; title: string; message?: string; error_data?: { details: string } }[];
};

const STATUS_ORDER = ["sent", "delivered", "read", "failed"] as const;

function isForwardProgression(
  current: string | undefined,
  incoming: MetaStatus["status"],
): boolean {
  if (!current) return true;
  // "failed" is always terminal — allow it regardless
  if (incoming === "failed") return true;
  const currentIdx = STATUS_ORDER.indexOf(current as typeof STATUS_ORDER[number]);
  const incomingIdx = STATUS_ORDER.indexOf(incoming);
  return incomingIdx > currentIdx;
}

export async function processStatuses(
  ctx: Ctx,
  channel: { _id: Id<"channels">; tenantId: string },
  statuses: MetaStatus[],
): Promise<void> {
  for (const status of statuses) {
    const validStatuses: MetaStatus["status"][] = ["sent", "delivered", "read", "failed"];
    if (!validStatuses.includes(status.status)) continue;

    // updateStatusByMetaId already guards against regression internally;
    // passing status through directly — the mutation skips if status would regress.
    await ctx.runMutation(internal.messages.updateStatusByMetaId, {
      metaMessageId: status.id,
      status: status.status,
      tenantId: channel.tenantId,
    });
  }
}
