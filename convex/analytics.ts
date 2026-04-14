/**
 * @fileoverview Analytics query layer.
 *
 * Public-facing queries that read from the `conversationMetrics` denormalized
 * read-model. All queries enforce tenant-scoping via `getCallerIdentity` and
 * role-gating via `assertAdminOrSupervisor` (except `getMyStats` which is
 * accessible to all authenticated users but returns only the caller's own data).
 */
import { query } from "./_generated/server";
import { v } from "convex/values";
import { getCallerIdentity, assertAdminOrSupervisor, type OrgRole } from "./lib/auth";

export const getTeamSummary = query({
  args: {
    startTs: v.number(),
    endTs: v.number(),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as OrgRole);

    const metrics: Array<{
      firstResponseTimeSeconds?: number;
      messageCount: number;
    }> = [];

    for await (const doc of ctx.db
      .query("conversationMetrics")
      .withIndex("by_tenant_created", (q) =>
        q.eq("tenantId", tenantId).gte("createdAt", args.startTs).lte("createdAt", args.endTs),
      )
    ) {
      metrics.push({
        firstResponseTimeSeconds: doc.firstResponseTimeSeconds,
        messageCount: doc.messageCount,
      });
    }

    const totalConversations = metrics.length;
    const totalMessages = metrics.reduce((sum, m) => sum + m.messageCount, 0);

    const withResponseTime = metrics.filter(
      (m) => m.firstResponseTimeSeconds !== undefined && m.firstResponseTimeSeconds !== null,
    );
    const avgFirstResponseTimeSeconds =
      withResponseTime.length > 0
        ? withResponseTime.reduce((sum, m) => sum + (m.firstResponseTimeSeconds ?? 0), 0) /
          withResponseTime.length
        : null;

    return {
      totalConversations,
      avgFirstResponseTimeSeconds,
      totalMessages,
    };
  },
});

export const getAgentPerformance = query({
  args: {
    startTs: v.number(),
    endTs: v.number(),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as OrgRole);

    // Build a userId → userName lookup from channelMembers
    const nameLookup = new Map<string, string>();
    for await (const member of ctx.db
      .query("channelMembers")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
    ) {
      if (!nameLookup.has(member.userId)) {
        nameLookup.set(member.userId, member.userName);
      }
    }

    const byAgent = new Map<
      string,
      { agentName: string; conversationsHandled: number; responseTimes: number[] }
    >();

    for await (const doc of ctx.db
      .query("conversationMetrics")
      .withIndex("by_tenant_created", (q) =>
        q.eq("tenantId", tenantId).gte("createdAt", args.startTs).lte("createdAt", args.endTs),
      )
    ) {
      const key = doc.assignedAgentId ?? "__unassigned__";
      const existing = byAgent.get(key);
      if (existing) {
        existing.conversationsHandled += 1;
        if (doc.firstResponseTimeSeconds !== undefined && doc.firstResponseTimeSeconds !== null) {
          existing.responseTimes.push(doc.firstResponseTimeSeconds);
        }
      } else {
        // Resolve name: stored name → channelMembers lookup → fallback
        const resolvedName =
          doc.agentName ??
          (key !== "__unassigned__" ? nameLookup.get(key) : undefined) ??
          (key === "__unassigned__" ? "Unassigned" : "Unknown Agent");

        byAgent.set(key, {
          agentName: resolvedName,
          conversationsHandled: 1,
          responseTimes:
            doc.firstResponseTimeSeconds !== undefined && doc.firstResponseTimeSeconds !== null
              ? [doc.firstResponseTimeSeconds]
              : [],
        });
      }
    }

    return Array.from(byAgent.entries()).map(([agentId, data]) => ({
      agentId: agentId === "__unassigned__" ? null : agentId,
      agentName: data.agentName,
      conversationsHandled: data.conversationsHandled,
      avgFirstResponseTimeSeconds:
        data.responseTimes.length > 0
          ? data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length
          : null,
    }));
  },
});

export const getVolumeOverTime = query({
  args: {
    startTs: v.number(),
    endTs: v.number(),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as OrgRole);

    const rangeMs = args.endTs - args.startTs;
    const useWeekly = rangeMs > 60 * 24 * 60 * 60 * 1000;

    const buckets = new Map<string, number>();

    function bucketKey(ts: number): string {
      const d = new Date(ts);
      if (useWeekly) {
        const dayOfWeek = d.getUTCDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + mondayOffset));
        return monday.toISOString().slice(0, 10);
      }
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10);
    }

    for await (const doc of ctx.db
      .query("conversationMetrics")
      .withIndex("by_tenant_created", (q) =>
        q.eq("tenantId", tenantId).gte("createdAt", args.startTs).lte("createdAt", args.endTs),
      )
    ) {
      const key = bucketKey(doc.createdAt);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }

    return Array.from(buckets.entries())
      .map(([bucketLabel, count]) => ({
        bucketLabel,
        bucketStart: new Date(bucketLabel).getTime(),
        count,
      }))
      .sort((a, b) => a.bucketStart - b.bucketStart);
  },
});

export const getMyStats = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);

    const now = new Date();
    const startOfMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);

    let conversationsHandled = 0;
    const responseTimes: number[] = [];

    const isAdminOrSupervisor = orgRole === "org:admin" || orgRole === "admin" || orgRole === "org:supervisor";

    if (isAdminOrSupervisor) {
      for await (const doc of ctx.db
        .query("conversationMetrics")
        .withIndex("by_tenant_created", (q) =>
          q.eq("tenantId", tenantId),
        )
      ) {
        if (doc.createdAt < startOfMonth) continue;
        conversationsHandled += 1;
        if (doc.firstResponseTimeSeconds !== undefined && doc.firstResponseTimeSeconds !== null) {
          responseTimes.push(doc.firstResponseTimeSeconds);
        }
      }
    } else {
      for await (const doc of ctx.db
        .query("conversationMetrics")
        .withIndex("by_tenant_agent", (q) =>
          q.eq("tenantId", tenantId).eq("assignedAgentId", callerId),
        )
      ) {
        if (doc.createdAt < startOfMonth) continue;
        conversationsHandled += 1;
        if (doc.firstResponseTimeSeconds !== undefined && doc.firstResponseTimeSeconds !== null) {
          responseTimes.push(doc.firstResponseTimeSeconds);
        }
      }
    }

    const avgFirstResponseTimeSeconds =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : null;

    return {
      conversationsHandled,
      avgFirstResponseTimeSeconds,
    };
  },
});
