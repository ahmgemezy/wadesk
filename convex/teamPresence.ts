"use node";

import { action } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { getCallerIdentity } from "./lib/auth";

interface MemberInfo {
  userId: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
  role: string;
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

    const rawMembers = await ctx.runQuery(
      components.betterAuth.orgQueries.listOrgMembers,
      { organizationId: tenantId },
    );

    const userResults = await Promise.all(
      rawMembers.map((m) =>
        ctx.runQuery(components.betterAuth.orgQueries.findUserById, {
          userId: m.userId,
        }),
      ),
    );
    const users = userResults as Array<{ email: string; name: string; image?: string | null } | null>;

    const memberMap = new Map<string, MemberInfo>(
      rawMembers.map((m, i) => [
        m.userId,
        {
          userId: m.userId,
          email: (users[i]?.email as string) ?? "",
          name: (users[i]?.name as string | null) ?? null,
          imageUrl: (users[i]?.image as string | null) ?? null,
          role: m.role,
        },
      ])
    );

    const [userChannelDepts, metadata] = await Promise.all([
      ctx.runQuery(internal.teamPresenceQueries.getUserChannelsAndDepartments, { tenantId }),
      ctx.runQuery(internal.memberQueries.getAllMemberMetadata, { tenantId }),
    ]);

    const allMembers: TeamMemberResult[] = Array.from(memberMap.values()).map((info) => {
      const userId = info.userId;
      const channelAssignments = (userChannelDepts as Record<string, ChannelAssignment[]>)[userId] || [];

      return {
        userId,
        email: info.email,
        name: info.name,
        imageUrl: info.imageUrl,
        role: info.role,
        jobTitle: (metadata as { profiles: Record<string, { jobTitle?: string | null }> }).profiles[userId]?.jobTitle ?? null,
        channelAssignments,
      };
    });

    return allMembers;
  },
});
