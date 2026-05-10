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
import { getCallerIdentity, assertAdminOrSupervisor, isAdminOrSupervisor, type OrgRole } from "./lib/auth";

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

export const getLabelDistribution = query({
  args: {
    startTs: v.number(),
    endTs: v.number(),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as OrgRole);

    const labelDefs = await ctx.db
      .query("conversationLabels")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    const labelMeta = new Map<string, { color: string; emoji?: string }>();
    for (const ld of labelDefs) {
      labelMeta.set(ld.name, { color: ld.color, emoji: ld.emoji });
    }

    const counts = new Map<string, number>();

    for await (const metric of ctx.db
      .query("conversationMetrics")
      .withIndex("by_tenant_created", (q) =>
        q.eq("tenantId", tenantId).gte("createdAt", args.startTs).lte("createdAt", args.endTs),
      )
    ) {
      const conversation = await ctx.db.get(metric.conversationId);
      if (!conversation) continue;

      for (const labelName of conversation.labels) {
        counts.set(labelName, (counts.get(labelName) ?? 0) + 1);
      }
    }

    const totalLabeled = Array.from(counts.values()).reduce((a, b) => a + b, 0);

    return Array.from(counts.entries())
      .map(([name, count]) => {
        const meta = labelMeta.get(name);
        return {
          name,
          count,
          color: meta?.color ?? "gray",
          emoji: meta?.emoji,
          percentage: totalLabeled > 0 ? Math.round((count / totalLabeled) * 100) : 0,
        };
      })
      .sort((a, b) => b.count - a.count);
  },
});

export const getStageDistribution = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as OrgRole);

    const counts: Record<string, number> = {
      lead: 0,
      prospect: 0,
      customer: 0,
      retained: 0,
      churned: 0,
    };

    for await (const contact of ctx.db
      .query("contacts")
      .withIndex("by_tenant_archived", (q) =>
        q.eq("tenantId", tenantId).eq("isArchived", false)
      )
    ) {
      const stage = contact.stage ?? "lead";
      counts[stage] = (counts[stage] ?? 0) + 1;
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    const distribution = (["lead", "prospect", "customer", "retained", "churned"] as const).map(
      (stage) => ({
        stage,
        count: counts[stage] ?? 0,
        percentage: total > 0 ? Math.round(((counts[stage] ?? 0) / total) * 100) : 0,
      }),
    );

    const funnelOrder = ["lead", "prospect", "customer", "retained"] as const;
    const funnel = funnelOrder.map((stage, i) => {
      const count = counts[stage] ?? 0;
      const prevStage = i === 0 ? null : funnelOrder[i - 1];
      const prevCount = prevStage ? (counts[prevStage] ?? 0) : total;
      const conversionRate = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0;
      return { stage, count, conversionRate };
    });

    return { distribution, funnel, total, churned: counts.churned ?? 0 };
  },
});

export const getContactActivity = query({
  args: {
    contactId: v.id("contacts"),
  },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);

    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.tenantId !== tenantId) return null;

    const events: Array<{
      _id: string;
      type: string;
      actorId?: string;
      metadata: Record<string, unknown>;
      createdAt: number;
    }> = [];

    for await (const event of ctx.db
      .query("contactEvents")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .order("desc")
    ) {
      events.push({
        _id: event._id,
        type: event.type,
        actorId: event.actorId ?? undefined,
        metadata: event.metadata as Record<string, unknown>,
        createdAt: event.createdAt,
      });
    }

    return {
      contact: {
        _id: contact._id,
        displayName: contact.customName ?? contact.displayName,
        phone: contact.phone,
        stage: contact.stage ?? "lead",
      },
      events,
    };
  },
});

export const getContactsByRevenueCurrency = query({
  args: {
    currency: v.string(),
    startTs: v.number(),
    endTs: v.number(),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as OrgRole);

    const results: Array<{
      _id: string;
      displayName: string;
      phone: string;
      spent: number;
      currency: string;
      stage: string | null;
      createdAt: number;
    }> = [];

    for await (const contact of ctx.db
      .query("contacts")
      .withIndex("by_tenant_archived", (q) =>
        q.eq("tenantId", tenantId).eq("isArchived", false),
      )
    ) {
      if (contact.createdAt < args.startTs || contact.createdAt > args.endTs) continue;
      if (contact.spent == null || contact.spent <= 0) continue;
      const contactCurrency = contact.spentCurrency ?? "USD";
      if (contactCurrency !== args.currency) continue;

      results.push({
        _id: contact._id,
        displayName: contact.customName ?? contact.displayName,
        phone: contact.phone,
        spent: contact.spent,
        currency: contactCurrency,
        stage: contact.stage ?? null,
        createdAt: contact.createdAt,
      });
    }

    return results.sort((a, b) => b.spent - a.spent);
  },
});

export const getRevenueByCurrency = query({
  args: {
    startTs: v.number(),
    endTs: v.number(),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as OrgRole);

    const totals: Record<string, number> = {
      EGP: 0,
      SAR: 0,
      AED: 0,
      USD: 0,
    };
    let totalContacts = 0;
    let contactsWithRevenue = 0;

    for await (const contact of ctx.db
      .query("contacts")
      .withIndex("by_tenant_archived", (q) =>
        q.eq("tenantId", tenantId).eq("isArchived", false),
      )
    ) {
      if (contact.createdAt < args.startTs || contact.createdAt > args.endTs) continue;
      totalContacts++;
      if (contact.spent != null && contact.spent > 0) {
        contactsWithRevenue++;
        const currency = contact.spentCurrency ?? "USD";
        totals[currency] = (totals[currency] ?? 0) + contact.spent;
      }
    }

    const breakdown = Object.keys(totals)
      .map((currency) => ({ currency, amount: totals[currency] ?? 0 }))
      .filter((entry) => entry.amount > 0);

    const grandTotalUsd = breakdown.reduce((sum, entry) => {
      // Return raw breakdown per currency — conversion is a UI concern
      return sum + (entry.currency === "USD" ? entry.amount : 0);
    }, 0);

    return { breakdown, totalContacts, contactsWithRevenue, grandTotalUsd };
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

    const callerIsAdminOrSupervisor = isAdminOrSupervisor(orgRole);

    if (callerIsAdminOrSupervisor) {
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
