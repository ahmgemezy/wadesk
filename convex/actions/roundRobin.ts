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

    if (agentIds.length === 0) {
      // Fallback: use all org members
      const allMembers = await ctx.runQuery(
        components.betterAuth.orgQueries.listOrgMembers,
        { organizationId: args.tenantId },
      );
      const sortedMembers = allMembers.sort((a, b) => a.userId.localeCompare(b.userId));

      if (sortedMembers.length === 0) return;

      const idx = (department.roundRobinIndex ?? 0) % sortedMembers.length;
      const agentMember = sortedMembers[idx];
      const assignedAgentId = agentMember.userId as string;
      const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "user",
        where: [{ field: "id", value: assignedAgentId }],
      });
      const agentName = (user?.name as string | null) ?? assignedAgentId;

      if (assignedAgentId) {
        await ctx.runMutation(internal.conversations.assignInternal, {
          conversationId: args.conversationId,
          agentId: assignedAgentId,
          tenantId: args.tenantId,
          assignmentType: "round_robin",
          agentName,
        });
      }
    } else {
      // Assign to next department member in rotation
      const sortedIds = [...agentIds].sort();
      const idx = (department.roundRobinIndex ?? 0) % sortedIds.length;
      const assignedAgentId = sortedIds[idx];
      const matchedMember = deptMembers.find((m) => m.userId === assignedAgentId);
      const agentName = matchedMember?.userName ?? assignedAgentId;

      await ctx.runMutation(internal.conversations.assignInternal, {
        conversationId: args.conversationId,
        agentId: assignedAgentId,
        tenantId: args.tenantId,
        assignmentType: "round_robin",
        agentName,
      });
    }

    // Increment the department's round-robin index
    await ctx.runMutation(internal.departments.incrementRoundRobinIndex, {
      departmentId,
      tenantId: args.tenantId,
    });
  },
});
