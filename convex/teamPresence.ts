"use node";

import { action } from "./_generated/server";
import { clerkClient } from "@clerk/nextjs/server";
import { internal } from "./_generated/api";
import { getCallerIdentity } from "./lib/auth";

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
  jobTitle: string | null;
  channelAssignments: ChannelAssignment[];
}

export const listWithDepartments = action({
  args: {},
  handler: async (ctx): Promise<TeamMemberResult[]> => {
    let tenantId: string;
    try {
      ({ tenantId } = await getCallerIdentity(ctx));
    } catch {
      return [];
    }

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

    // Get hierarchical channel→departments data and member profiles from database
    const [userChannelDepts, metadata] = await Promise.all([
      ctx.runQuery(internal.teamPresenceQueries.getUserChannelsAndDepartments, { tenantId }),
      ctx.runQuery(internal.memberQueries.getAllMemberMetadata, { tenantId }),
    ]);

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
        jobTitle: (metadata as { profiles: Record<string, { jobTitle?: string | null }> }).profiles[userId]?.jobTitle ?? null,
        channelAssignments,
      };
    });

    return allMembers;
  },
});