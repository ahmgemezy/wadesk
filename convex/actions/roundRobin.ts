"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { clerkClient } from "@clerk/nextjs/server";

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
      const client = await clerkClient();
      const memberships = await client.organizations.getOrganizationMembershipList({
        organizationId: args.tenantId,
        limit: 100,
      });
      const activeMembers = memberships.data
        .filter((m) => m.role !== undefined)
        .sort((a, b) =>
          (a.publicUserData?.userId ?? "").localeCompare(b.publicUserData?.userId ?? ""),
        );

      if (activeMembers.length === 0) return;

      const idx = (department.roundRobinIndex ?? 0) % activeMembers.length;
      const agentMember = activeMembers[idx];
      const assignedAgentId = agentMember.publicUserData?.userId;
      const agentName =
        agentMember.publicUserData?.firstName ??
        agentMember.publicUserData?.identifier ??
        assignedAgentId ??
        undefined;

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
