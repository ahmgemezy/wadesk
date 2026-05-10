import { query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getCallerIdentity, getCallerRole, assertAdmin, assertAdminOrSupervisor } from "./lib/auth";
import type { Id } from "./_generated/dataModel";

export const getMemberAnalytics = query({
  args: {
    memberId: v.string(),
    startTs: v.optional(v.number()),
    endTs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdminOrSupervisor(role);

    const { tenantId } = await getCallerIdentity(ctx);

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

    const { tenantId } = await getCallerIdentity(ctx);

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
    assertAdminOrSupervisor(role);

    const { tenantId } = await getCallerIdentity(ctx);

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
    const { tenantId } = await getCallerIdentity(ctx);

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
    const { tenantId } = await getCallerIdentity(ctx);

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

export const updateMemberProfile = internalMutation({
  args: {
    tenantId: v.string(),
    memberId: v.string(),
    phone: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("memberProfiles")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", args.memberId),
      )
      .first();

    const updateData: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.phone !== undefined) updateData.phone = args.phone || undefined;
    if (args.jobTitle !== undefined) updateData.jobTitle = args.jobTitle || undefined;
    if (args.bio !== undefined) updateData.bio = args.bio || undefined;

    if (existing) {
      await ctx.db.patch(existing._id, updateData);
    } else {
      await ctx.db.insert("memberProfiles", {
        tenantId: args.tenantId,
        userId: args.memberId,
        phone: args.phone,
        jobTitle: args.jobTitle,
        bio: args.bio,
        updatedAt: Date.now(),
      });
    }
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

export const getAllMemberMetadata = internalQuery({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    const profiles = await ctx.db
      .query("memberProfiles")
      .withIndex("by_tenant_user", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const profileMap: Record<string, { jobTitle?: string | null }> = {};
    for (const p of profiles) {
      profileMap[p.userId] = { jobTitle: p.jobTitle ?? null };
    }

    const deptMembers = await ctx.db
      .query("departmentMembers")
      .withIndex("by_tenant_user", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const uniqueDeptIds = [...new Set(deptMembers.map((dm) => dm.departmentId))];
    const depts = await Promise.all(uniqueDeptIds.map((id) => ctx.db.get(id)));
    const deptNameMap: Record<string, string> = {};
    for (const dept of depts) {
      if (dept) deptNameMap[dept._id] = (dept as { name: string }).name;
    }

    const userDepts: Record<string, string[]> = {};
    for (const dm of deptMembers) {
      if (!userDepts[dm.userId]) userDepts[dm.userId] = [];
      const name = deptNameMap[dm.departmentId];
      if (name) userDepts[dm.userId].push(name);
    }

    return { profiles: profileMap, departments: userDepts };
  },
});

export const getMemberProfile = internalQuery({
  args: {
    tenantId: v.string(),
    memberId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("memberProfiles")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", args.memberId),
      )
      .first();
  },
});

export const getJobTitlesByTenant = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const profiles = await ctx.db
      .query("memberProfiles")
      .withIndex("by_tenant_user", (q) => q.eq("tenantId", tenantId))
      .take(500);
    const map: Record<string, string | undefined> = {};
    for (const p of profiles) {
      map[p.userId] = p.jobTitle ?? undefined;
    }
    return map;
  },
});


export const getAvailableChannels = query({
  args: {},
  handler: async (ctx) => {
    const role = await getCallerRole(ctx);
    assertAdminOrSupervisor(role);

    const { tenantId } = await getCallerIdentity(ctx);

    const channels = await ctx.db
      .query("channels")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .take(100);

    // Include active channels and legacy docs without a status field
    const activeChannels = channels.filter(
      (ch) =>
        ch.status === "active" ||
        ch.isActive === true ||
        (ch.status == null && ch.isActive == null),
    );

    return activeChannels.map((ch) => ({
      id: ch._id,
      name: ch.displayName || "Unknown",
    }));
  },
});

export const getAvailableDepartments = query({
  args: {},
  handler: async (ctx) => {
    const role = await getCallerRole(ctx);
    assertAdminOrSupervisor(role);

    const { tenantId } = await getCallerIdentity(ctx);

    const departments = await ctx.db
      .query("departments")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .take(100);

    return departments.map((dept) => ({
      id: dept._id,
      name: dept.name || "Unknown",
      channelId: dept.channelId ?? null,
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
        channelId: channelId as Id<"channels">,
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
        departmentId: departmentId as Id<"departments">,
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
