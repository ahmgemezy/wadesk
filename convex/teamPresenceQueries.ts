import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

interface ChannelDepartments {
  channelId: string;
  channelName: string;
  departmentNames: string[];
}

export const getUserChannelsAndDepartments = internalQuery({
  args: { tenantId: v.string() },
  handler: async (
    ctx,
    args
  ): Promise<Record<string, ChannelDepartments[]>> => {
    // Get all active channels for this tenant (exclude disconnected)
    const channels = (await ctx.db
      .query("channels")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect())
      .filter(c => c.status !== "disconnected" && c.status !== "reconnect_required");

    // Create map of channel ID to name
    const channelIdToName = new Map(
      channels.map((c) => [c._id, c.displayName])
    );

    // Get all departments for this tenant, scoped by channelId
    const departments = await ctx.db
      .query("departments")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Create map of department ID to { name, channelId }
    const deptIdToInfo = new Map(
      departments.map((d) => [d._id, { name: d.name, channelId: d.channelId }])
    );

    // Get all channel members
    const channelMembers = await ctx.db
      .query("channelMembers")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Get all department members
    const deptMembers = await ctx.db
      .query("departmentMembers")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Build hierarchical structure: userId -> channel -> departments
    const userChannelDepts = new Map<
      string,
      Map<string, Set<string>>
    >();

    // Process channel members to establish which channels each user belongs to
    for (const cm of channelMembers) {
      if (channelIdToName.has(cm.channelId)) {
        if (!userChannelDepts.has(cm.userId)) {
          userChannelDepts.set(cm.userId, new Map());
        }
        const userChannels = userChannelDepts.get(cm.userId)!;
        if (!userChannels.has(cm.channelId)) {
          userChannels.set(cm.channelId, new Set());
        }
      }
    }

    // Process department members to populate departments per channel per user
    for (const dm of deptMembers) {
      const deptInfo = deptIdToInfo.get(dm.departmentId);
      if (deptInfo && deptInfo.channelId) {
        if (!userChannelDepts.has(dm.userId)) {
          userChannelDepts.set(dm.userId, new Map());
        }
        const userChannels = userChannelDepts.get(dm.userId)!;
        const { channelId, name: deptName } = deptInfo;

        if (!userChannels.has(channelId)) {
          userChannels.set(channelId, new Set());
        }
        userChannels.get(channelId)!.add(deptName);
      }
    }

    // Transform to final structure: userId -> array of { channelId, channelName, departments }
    const result: Record<string, ChannelDepartments[]> = {};

    for (const [userId, channelMap] of userChannelDepts.entries()) {
      result[userId] = Array.from(channelMap.entries()).map(([channelId, depts]) => ({
        channelId,
        channelName: channelIdToName.get(channelId) || "Unknown",
        departmentNames: Array.from(depts).sort(),
      }));
    }

    return result;
  },
});