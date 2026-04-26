"use node";

import { action } from "./_generated/server";
import { clerkClient } from "@clerk/nextjs/server";
import { internal } from "./_generated/api";

interface ClerkMemberInfo {
  userId: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
  clerkRole: string;
}

interface ChannelAssignment {
  channelId: string;
  channelName: string;
  departmentNames: string[];
}

export interface TeamMemberResult {
  userId: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
  role: string;
  channelAssignments: ChannelAssignment[];
}

export const listWithDepartments = action({
  args: {},
  handler: async (ctx): Promise<TeamMemberResult[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const tenantId = identity.orgId as string;
    if (!tenantId) return [];

    const client = await clerkClient();
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: tenantId,
      limit: 100,
    });

    // Build map of all Clerk members
    const clerkMembers = new Map<string, ClerkMemberInfo>(
      memberships.data
        .filter((m) => m.publicUserData?.userId)
        .map((m) => {
          const userId = m.publicUserData!.userId!;
          return [
            userId,
            {
              userId,
              email: (m.publicUserData?.identifier ?? "") as string,
              name: [m.publicUserData?.firstName, m.publicUserData?.lastName]
                .filter(Boolean)
                .join(" ") || null,
              imageUrl: (m.publicUserData?.imageUrl ?? null) as string | null,
              clerkRole: m.role,
            },
          ];
        })
    );

    // Get hierarchical channel→departments data from database
    const userChannelDepts = await ctx.runQuery(
      internal.teamPresenceQueries.getUserChannelsAndDepartments,
      { tenantId }
    );

    // Build result
    const allMembers: TeamMemberResult[] = Array.from(clerkMembers.values()).map((clerkInfo) => {
      const userId = clerkInfo.userId;
      const channelAssignments = userChannelDepts[userId] || [];

      return {
        userId,
        email: clerkInfo.email,
        name: clerkInfo.name,
        imageUrl: clerkInfo.imageUrl,
        role: clerkInfo.clerkRole === "admin" ? "org:admin" : (clerkInfo.clerkRole as string) || "org:agent",
        channelAssignments,
      };
    });

    return allMembers;
  },
});