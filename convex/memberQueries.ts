import { query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getCallerRole, assertAdmin, assertAdminOrSupervisor } from "./lib/auth";
import type { Id } from "./_generated/dataModel";

export const getMemberAnalytics = query({
  args: {
    memberId: v.string(),
    startTs: v.optional(v.number()),
    endTs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;

    const metricsStream = ctx.db
      .query("conversationMetrics")
      .withIndex("by_tenant_agent", (q) =>
        q.eq("tenantId", tenantId).eq("assignedAgentId", args.memberId),
      );

    let totalConversations = 0;
    let resolvedCount = 0;
    let totalFirstResponseTime = 0;
    let firstResponseCount = 0;
    let totalCsat = 0;
    let csatCount = 0;
    const channelBreakdown: Record<string, { channelId: Id<"channels">; count: number; resolved: number; csatTotal: number; csatCount: number }> = {};

    for await (const metric of metricsStream) {
      if (args.startTs && metric.createdAt < args.startTs) continue;
      if (args.endTs && metric.createdAt > args.endTs) break;

      totalConversations++;

      if (metric.resolvedAt) {
        resolvedCount++;
      }

      if (metric.firstResponseTimeSeconds != null) {
        totalFirstResponseTime += metric.firstResponseTimeSeconds;
        firstResponseCount++;
      }

      if (metric.csatScore != null) {
        totalCsat += metric.csatScore;
        csatCount++;
      }

      const chKey = metric.channelId;
      if (!channelBreakdown[chKey]) {
        channelBreakdown[chKey] = {
          channelId: chKey,
          count: 0,
          resolved: 0,
          csatTotal: 0,
          csatCount: 0,
        };
      }
      const entry = channelBreakdown[chKey];
      entry.count++;
      if (metric.resolvedAt) entry.resolved++;
      if (metric.csatScore != null) {
        entry.csatTotal += metric.csatScore;
        entry.csatCount++;
      }
    }

    const channelBreakdownArr = await Promise.all(
      Object.values(channelBreakdown).map(async (entry) => {
        const channel = await ctx.db.get(entry.channelId);
        return {
          channelId: entry.channelId,
          channelName: channel ? (channel as { displayName: string }).displayName : null,
          count: entry.count,
          resolved: entry.resolved,
          avgCsat: entry.csatCount > 0 ? entry.csatTotal / entry.csatCount : null,
        };
      }),
    );

    return {
      summary: {
        totalConversations,
        resolvedCount,
        avgFirstResponseTimeSeconds:
          firstResponseCount > 0 ? totalFirstResponseTime / firstResponseCount : null,
        avgCsatScore: csatCount > 0 ? totalCsat / csatCount : null,
      },
      channelBreakdown: channelBreakdownArr,
    };
  },
});

export const getMemberRecentConversations = query({
  args: {
    memberId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdminOrSupervisor(role);

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;

    const limit = args.limit ?? 20;

    const results = await ctx.db
      .query("conversations")
      .withIndex("by_tenant_agent", (q) =>
        q.eq("tenantId", tenantId).eq("assignedAgentId", args.memberId),
      )
      .order("desc")
      .take(limit);

    const enriched = await Promise.all(
      results.map(async (conv) => {
        const contact = await ctx.db.get(conv.contactId);
        return {
          id: conv._id,
          customerName: contact ? (contact as { displayName: string }).displayName ?? (contact as { customName?: string }).customName ?? null : null,
          customerPhone: contact ? (contact as { phone: string }).phone : null,
          status: conv.status,
          assignedAt: conv.assignedAt ?? null,
          lastMessageAt: conv.lastMessageAt,
        };
      }),
    );

    return enriched;
  },
});

export const getMemberAuditLog = query({
  args: {
    memberId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;

    const limit = args.limit ?? 50;

    return await ctx.db
      .query("memberActionLog")
      .withIndex("by_tenant_member", (q) =>
        q.eq("tenantId", tenantId).eq("memberId", args.memberId),
      )
      .order("desc")
      .take(limit);
  },
});

export const getMemberChannelAssignments = internalQuery({
  args: { memberId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const tenantId = identity.orgId as string;

    const assignments = await ctx.db
      .query("channelMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", args.memberId),
      )
      .take(50);

    const results = await Promise.all(
      assignments.map(async (cm) => {
        const ch = await ctx.db.get(cm.channelId);
        return ch ? { id: ch._id, name: (ch as { displayName: string }).displayName } : null;
      }),
    );

    return results.filter((c): c is { id: Id<"channels">; name: string } => c !== null);
  },
});

export const getMemberDeptAssignments = internalQuery({
  args: { memberId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const tenantId = identity.orgId as string;

    const assignments = await ctx.db
      .query("departmentMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", tenantId).eq("userId", args.memberId),
      )
      .take(50);

    const results = await Promise.all(
      assignments.map(async (dm) => {
        const dept = await ctx.db.get(dm.departmentId);
        return dept ? { id: dept._id, name: (dept as { name: string }).name } : null;
      }),
    );

    return results.filter((d): d is { id: Id<"departments">; name: string } => d !== null);
  },
});

export const logMemberAction = internalMutation({
  args: {
    tenantId: v.string(),
    memberId: v.string(),
    action: v.string(),
    details: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("memberActionLog", {
      tenantId: args.tenantId,
      memberId: args.memberId,
      action: args.action,
      details: args.details ?? {},
      timestamp: Date.now(),
    });
  },
});

export const removeMemberFromChannels = internalMutation({
  args: { tenantId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("channelMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", args.userId),
      )
      .collect();

    for (const cm of memberships) {
      await ctx.db.delete(cm._id);
    }
  },
});

export const removeMemberFromDepartments = internalMutation({
  args: { tenantId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("departmentMembers")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", args.userId),
      )
      .collect();

    for (const dm of memberships) {
      await ctx.db.delete(dm._id);
    }
  },
});

export const getAvailableChannels = query({
  args: {},
  handler: async (ctx) => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;

    const channels = await ctx.db
      .query("channels")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .take(100);

    return channels.map((ch: any) => ({
      id: ch._id,
      name: ch.displayName || ch.name || "Unknown",
    }));
  },
});

export const getAvailableDepartments = query({
  args: {},
  handler: async (ctx) => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;

    const departments = await ctx.db
      .query("departments")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .take(100);

    return departments.map((dept: any) => ({
      id: dept._id,
      name: dept.name || "Unknown",
    }));
  },
});

export const addMemberToChannels = internalMutation({
  args: {
    tenantId: v.string(),
    userId: v.string(),
    channelIds: v.array(v.string()),
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    userImageUrl: v.optional(v.string()),
    role: v.union(v.literal("org:supervisor"), v.literal("org:agent")),
    addedBy: v.string(),
  },
  handler: async (ctx, args) => {
    for (const channelId of args.channelIds) {
      await ctx.db.insert("channelMembers", {
        tenantId: args.tenantId,
        channelId: channelId as any,
        userId: args.userId,
        userName: args.userName || "",
        userEmail: args.userEmail || "",
        userImageUrl: args.userImageUrl,
        role: args.role,
        addedBy: args.addedBy,
        createdAt: Date.now(),
      });
    }
  },
});

export const addMemberToDepartments = internalMutation({
  args: {
    tenantId: v.string(),
    userId: v.string(),
    departmentIds: v.array(v.string()),
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    role: v.union(v.literal("org:supervisor"), v.literal("org:agent")),
    addedBy: v.string(),
  },
  handler: async (ctx, args) => {
    for (const departmentId of args.departmentIds) {
      await ctx.db.insert("departmentMembers", {
        tenantId: args.tenantId,
        departmentId: departmentId as any,
        userId: args.userId,
        userName: args.userName || "",
        userEmail: args.userEmail || "",
        role: args.role,
        addedBy: args.addedBy,
        createdAt: Date.now(),
      });
    }
  },
});
