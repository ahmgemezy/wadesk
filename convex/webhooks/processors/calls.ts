import type { GenericActionCtx } from "convex/server";
import type { DataModel } from "../../_generated/dataModel";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

type Ctx = GenericActionCtx<DataModel>;

export type MetaCall = {
  from: string;
  id: string;
  timestamp: string;
  status?: string;
};

export async function processCalls(
  ctx: Ctx,
  channel: { _id: Id<"channels">; tenantId: string },
  calls: MetaCall[],
): Promise<void> {
  for (const call of calls) {
    await ctx.runMutation(internal.messages.insertMissedCallEvent, {
      tenantId: channel.tenantId,
      channelId: channel._id,
      callerPhone: call.from,
      callId: call.id,
      timestamp: Number(call.timestamp) * 1000,
    });
  }
}
