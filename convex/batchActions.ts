import { v, ConvexError } from "convex/values";
import { mutation } from "./_generated/server";
import { getCallerIdentity, assertAdminOrSupervisor, type OrgRole } from "./lib/auth";
import { makeUserMutationKey, makeTenantMutationKey, enforceRateLimit } from "./lib/rateLimit";

export const batchAssign = mutation({
  args: {
    conversationIds: v.array(v.id("conversations")),
    agentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as OrgRole);

    await enforceRateLimit(ctx, makeUserMutationKey(callerId, "batchAssign"), {
      windowMs: 60_000,
      maxRequests: 10,
    });

    if (args.conversationIds.length > 50) {
      throw new ConvexError("BATCH_TOO_LARGE");
    }

    const now = Date.now();
    let updated = 0;

    for (const convId of args.conversationIds) {
      const conv = await ctx.db.get(convId);
      if (!conv || conv.tenantId !== tenantId) continue;

      await ctx.db.patch(convId, {
        assignedAgentId: args.agentId,
        assignedAt: now,
      });
      updated++;
    }

    return { updated };
  },
});

export const batchUpdateStatus = mutation({
  args: {
    conversationIds: v.array(v.id("conversations")),
    status: v.union(v.literal("open"), v.literal("pending"), v.literal("resolved")),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    const isAdminOrSupervisor =
      orgRole === "org:admin" ||
      orgRole === "admin" ||
      orgRole === "org:supervisor";

    await enforceRateLimit(ctx, makeUserMutationKey(callerId, "batchUpdateStatus"), {
      windowMs: 60_000,
      maxRequests: 20,
    });

    if (args.conversationIds.length > 50) {
      throw new ConvexError("BATCH_TOO_LARGE");
    }

    let updated = 0;

    for (const convId of args.conversationIds) {
      const conv = await ctx.db.get(convId);
      if (!conv || conv.tenantId !== tenantId) continue;

      if (!isAdminOrSupervisor && conv.assignedAgentId !== callerId) {
        continue;
      }

      await ctx.db.patch(convId, { status: args.status });
      updated++;
    }

    return { updated };
  },
});

export const batchAddLabel = mutation({
  args: {
    conversationIds: v.array(v.id("conversations")),
    label: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    const isAdminOrSupervisor =
      orgRole === "org:admin" ||
      orgRole === "admin" ||
      orgRole === "org:supervisor";

    if (!isAdminOrSupervisor) {
      throw new ConvexError("FORBIDDEN");
    }

    await enforceRateLimit(ctx, makeUserMutationKey(callerId, "batchAddLabel"), {
      windowMs: 60_000,
      maxRequests: 20,
    });

    if (args.conversationIds.length > 50) {
      throw new ConvexError("BATCH_TOO_LARGE");
    }

    let updated = 0;

    for (const convId of args.conversationIds) {
      const conv = await ctx.db.get(convId);
      if (!conv || conv.tenantId !== tenantId) continue;

      const labels = conv.labels ?? [];
      if (!labels.includes(args.label)) {
        await ctx.db.patch(convId, { labels: [...labels, args.label] });
        updated++;
      }
    }

    return { updated };
  },
});

export const batchRemoveLabel = mutation({
  args: {
    conversationIds: v.array(v.id("conversations")),
    label: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    const isAdminOrSupervisor =
      orgRole === "org:admin" ||
      orgRole === "admin" ||
      orgRole === "org:supervisor";

    if (!isAdminOrSupervisor) {
      throw new ConvexError("FORBIDDEN");
    }

    await enforceRateLimit(ctx, makeUserMutationKey(callerId, "batchRemoveLabel"), {
      windowMs: 60_000,
      maxRequests: 20,
    });

    if (args.conversationIds.length > 50) {
      throw new ConvexError("BATCH_TOO_LARGE");
    }

    let updated = 0;

    for (const convId of args.conversationIds) {
      const conv = await ctx.db.get(convId);
      if (!conv || conv.tenantId !== tenantId) continue;

      const labels = conv.labels ?? [];
      if (labels.includes(args.label)) {
        await ctx.db.patch(convId, { labels: labels.filter((l) => l !== args.label) });
        updated++;
      }
    }

    return { updated };
  },
});

export const batchClose = mutation({
  args: {
    conversationIds: v.array(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);

    const isAdminOrSupervisor =
      orgRole === "org:admin" ||
      orgRole === "admin" ||
      orgRole === "org:supervisor";

    await enforceRateLimit(ctx, makeUserMutationKey(callerId, "batchClose"), {
      windowMs: 60_000,
      maxRequests: 10,
    });

    if (args.conversationIds.length > 50) {
      throw new ConvexError("BATCH_TOO_LARGE");
    }

    let updated = 0;

    for (const convId of args.conversationIds) {
      const conv = await ctx.db.get(convId);
      if (!conv || conv.tenantId !== tenantId) continue;

      if (!isAdminOrSupervisor && conv.assignedAgentId !== callerId) {
        continue;
      }

      await ctx.db.patch(convId, { status: "resolved" });
      updated++;
    }

    return { updated };
  },
});