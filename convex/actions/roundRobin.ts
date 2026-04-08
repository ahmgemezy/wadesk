"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { clerkClient } from "@clerk/nextjs/server";

export const assignRoundRobin = internalAction({
  args: {
    tenantId: v.string(),
    channelId: v.id("channels"),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const channel = await ctx.runQuery(internal.channels.getById, {
      channelId: args.channelId,
      tenantId: args.tenantId,
    });

    if (!channel || channel.assignmentMode !== "round_robin") return;

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

    const idx = channel.roundRobinIndex % activeMembers.length;
    const assignedAgentId = activeMembers[idx].publicUserData?.userId;

    if (assignedAgentId) {
      await ctx.runMutation(internal.conversations.assignInternal, {
        conversationId: args.conversationId,
        agentId: assignedAgentId,
        tenantId: args.tenantId,
      });
    }

    await ctx.runMutation(internal.channels.incrementRoundRobinIndex, {
      channelId: args.channelId,
      tenantId: args.tenantId,
    });
  },
});
