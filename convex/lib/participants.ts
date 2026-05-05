import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function openParticipantStint(
  ctx: MutationCtx,
  {
    tenantId,
    conversationId,
    agentId,
    departmentId,
  }: {
    tenantId: string;
    conversationId: Id<"conversations">;
    agentId: string;
    departmentId?: Id<"departments">;
  },
) {
  await ctx.db.insert("conversationParticipants", {
    tenantId,
    conversationId,
    agentId,
    departmentId,
    startedAt: Date.now(),
    messageCount: 0,
  });
}

export async function closeActiveParticipantStint(
  ctx: MutationCtx,
  {
    tenantId,
    conversationId,
  }: { tenantId: string; conversationId: Id<"conversations"> },
) {
  const rows = await ctx.db
    .query("conversationParticipants")
    .withIndex("by_tenant_conversation", (q) =>
      q.eq("tenantId", tenantId).eq("conversationId", conversationId),
    )
    .collect();
  const active = rows.find((r) => r.endedAt === undefined);
  if (active) {
    await ctx.db.patch(active._id, { endedAt: Date.now() });
  }
}

export async function incrementParticipantMessageCount(
  ctx: MutationCtx,
  {
    tenantId,
    conversationId,
    agentId,
  }: { tenantId: string; conversationId: Id<"conversations">; agentId: string },
) {
  const rows = await ctx.db
    .query("conversationParticipants")
    .withIndex("by_tenant_conversation", (q) =>
      q.eq("tenantId", tenantId).eq("conversationId", conversationId),
    )
    .collect();
  const active = rows.find((r) => r.agentId === agentId && r.endedAt === undefined);
  if (!active) return;
  await ctx.db.patch(active._id, {
    messageCount: active.messageCount + 1,
    firstReplyAt: active.firstReplyAt ?? Date.now(),
  });
}
