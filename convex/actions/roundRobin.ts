"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal, components } from "../_generated/api";

export const assignRoundRobin = internalAction({
  args: {
    tenantId: v.string(),
    channelId: v.id("channels"),
    departmentId: v.optional(v.id("departments")),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    // If no departmentId provided, try to get the default department for the channel
    let departmentId = args.departmentId;
    if (!departmentId) {
      const defaultDept = await ctx.runQuery(internal.departments.getDefaultForChannel, {
        channelId: args.channelId,
      });
      if (!defaultDept) return; // No department to assign to
      departmentId = defaultDept._id;
    }

    // Get the department to check assignment mode
    const department = await ctx.runQuery(internal.departments.getInternal, {
      departmentId,
    });

    if (!department || department.assignmentMode !== "round_robin") return;

    // Get department members
    const deptMembers: { userId: string; userName: string }[] =
      await ctx.runQuery(internal.departmentMembers.getMembersForDepartment, {
        departmentId,
      });

    const agentIds = deptMembers.map((m) => m.userId);

    let sortedAgentIds: string[];
    let agentNameMap: Map<string, string>;

    if (agentIds.length === 0) {
      // Fallback: use all org members
      const allMembers = await ctx.runQuery(
        components.betterAuth.orgQueries.listOrgMembers,
        { organizationId: args.tenantId },
      );
      const sortedMembers = allMembers.sort((a, b) => a.userId.localeCompare(b.userId));

      if (sortedMembers.length === 0) return;

      sortedAgentIds = sortedMembers.map((m) => m.userId as string);
      agentNameMap = new Map(sortedMembers.map((m) => [m.userId as string, m.userId as string]));
    } else {
      sortedAgentIds = [...agentIds].sort();
      agentNameMap = new Map(deptMembers.map((m) => [m.userId, m.userName]));
    }

    // Atomically select the next agent and advance the index in one transaction
    const assignedAgentId = await ctx.runMutation(
      internal.departments.selectAndAdvanceRoundRobin,
      { departmentId, tenantId: args.tenantId, sortedAgentIds },
    );

    if (!assignedAgentId) return;

    const agentName = agentNameMap.get(assignedAgentId) ?? assignedAgentId;

    await ctx.runMutation(internal.conversations.assignInternal, {
      conversationId: args.conversationId,
      agentId: assignedAgentId,
      tenantId: args.tenantId,
      assignmentType: "round_robin",
      agentName,
    });
  },
});
