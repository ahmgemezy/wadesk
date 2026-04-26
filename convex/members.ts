"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { clerkClient } from "@clerk/nextjs/server";
import { getCallerRole, assertAdmin, type OrgRole } from "./lib/auth";
import { internal } from "./_generated/api";

export const getMemberProfile = action({
  args: { memberId: v.string() },
  handler: async (ctx, args): Promise<null | {
    name: string | null;
    email: string | null;
    imageUrl: string | null;
    role: OrgRole;
    joinedAt: number | null;
    channels: { id: string; name: string }[];
    departments: { id: string; name: string }[];
  }> => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;

    const client = await clerkClient();

    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: tenantId,
      limit: 100,
    });

    const member = memberships.data.find(
      (m) => m.publicUserData?.userId === args.memberId,
    );
    if (!member) {
      return null;
    }

    const [channels, departments] = await Promise.all([
      ctx.runQuery(internal.memberQueries.getMemberChannelAssignments, {
        memberId: args.memberId,
      }),
      ctx.runQuery(internal.memberQueries.getMemberDeptAssignments, {
        memberId: args.memberId,
      }),
    ]);

    return {
      name:
        member.publicUserData?.firstName ??
        member.publicUserData?.identifier ??
        null,
      email: member.publicUserData?.identifier ?? null,
      imageUrl: member.publicUserData?.imageUrl ?? null,
      role: (member.role === "admin" ? "org:admin" : member.role) as OrgRole,
      joinedAt: member.createdAt ?? null,
      channels,
      departments,
    };
  },
});

export const updateMemberRole = action({
  args: {
    memberId: v.string(),
    newRole: v.union(
      v.literal("org:admin"),
      v.literal("org:supervisor"),
      v.literal("org:agent"),
    ),
  },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;
    const callerId = identity.subject;

    if (callerId === args.memberId) {
      throw new ConvexError("CANNOT_CHANGE_OWN_ROLE");
    }

    const client = await clerkClient();

    await client.organizations.updateOrganizationMembership({
      organizationId: tenantId,
      userId: args.memberId,
      role: args.newRole,
    });

    await ctx.runMutation(internal.memberQueries.logMemberAction, {
      tenantId,
      memberId: args.memberId,
      action: "role_changed",
      details: { targetRole: args.newRole },
    });

    return { success: true };
  },
});

export const removeMemberFromOrganization = action({
  args: {
    memberId: v.string(),
  },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;
    const callerId = identity.subject;

    if (callerId === args.memberId) {
      throw new ConvexError("CANNOT_REMOVE_SELF");
    }

    await ctx.runMutation(internal.conversations.unassignAll, {
      agentId: args.memberId,
      tenantId,
    });

    await ctx.runMutation(internal.memberQueries.removeMemberFromChannels, {
      tenantId,
      userId: args.memberId,
    });

    await ctx.runMutation(internal.memberQueries.removeMemberFromDepartments, {
      tenantId,
      userId: args.memberId,
    });

    await ctx.runMutation(internal.memberQueries.logMemberAction, {
      tenantId,
      memberId: args.memberId,
      action: "removed",
      details: { targetMemberId: args.memberId },
    });

    const client = await clerkClient();
    await client.organizations.deleteOrganizationMembership({
      organizationId: tenantId,
      userId: args.memberId,
    });

    return { success: true };
  },
});

export const updateMemberChannels = action({
  args: {
    memberId: v.string(),
    channelIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;

    const oldChannels = await ctx.runQuery(internal.memberQueries.getMemberChannelAssignments, {
      memberId: args.memberId,
    });
    const oldChannelIds = oldChannels.map((ch) => ch.id);

    await ctx.runMutation(internal.memberQueries.removeMemberFromChannels, {
      tenantId,
      userId: args.memberId,
    });

    for (const channelId of args.channelIds) {
      await ctx.db.insert("channelMembers", {
        tenantId,
        channelId: channelId as any,
        userId: args.memberId,
      });
    }

    await ctx.runMutation(internal.memberQueries.logMemberAction, {
      tenantId,
      memberId: args.memberId,
      action: "updated_assignments",
      details: {
        changedFields: {
          channel: {
            added: args.channelIds,
            removed: oldChannelIds,
          },
        },
      },
    });

    return { success: true };
  },
});

export const updateMemberDepartments = action({
  args: {
    memberId: v.string(),
    departmentIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;

    const oldDepartments = await ctx.runQuery(internal.memberQueries.getMemberDeptAssignments, {
      memberId: args.memberId,
    });
    const oldDepartmentIds = oldDepartments.map((dept) => dept.id);

    await ctx.runMutation(internal.memberQueries.removeMemberFromDepartments, {
      tenantId,
      userId: args.memberId,
    });

    for (const departmentId of args.departmentIds) {
      await ctx.db.insert("departmentMembers", {
        tenantId,
        departmentId: departmentId as any,
        userId: args.memberId,
      });
    }

    await ctx.runMutation(internal.memberQueries.logMemberAction, {
      tenantId,
      memberId: args.memberId,
      action: "updated_assignments",
      details: {
        changedFields: {
          department: {
            added: args.departmentIds,
            removed: oldDepartmentIds,
          },
        },
      },
    });

    return { success: true };
  },
});

export const updateMemberContact = action({
  args: {
    memberId: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;

    const client = await clerkClient();
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: tenantId,
      limit: 100,
    });

    const member = memberships.data.find(
      (m) => m.publicUserData?.userId === args.memberId,
    );
    if (!member) {
      throw new ConvexError("MEMBER_NOT_FOUND");
    }

    const changedFields: Record<string, boolean> = {};
    if (args.email) changedFields["email"] = true;
    if (args.phone) changedFields["phone"] = true;
    if (args.jobTitle) changedFields["jobTitle"] = true;

    await ctx.runMutation(internal.memberQueries.logMemberAction, {
      tenantId,
      memberId: args.memberId,
      action: "updated_contact",
      details: {
        changedFields,
      },
    });

    return { success: true };
  },
});

export const disableAccount = action({
  args: { memberId: v.string() },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;
    const callerId = identity.subject;

    if (callerId === args.memberId) {
      throw new ConvexError("CANNOT_DISABLE_SELF");
    }

    const client = await clerkClient();
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: tenantId,
      limit: 100,
    });

    const member = memberships.data.find(
      (m) => m.publicUserData?.userId === args.memberId,
    );
    if (!member) {
      throw new ConvexError("MEMBER_NOT_FOUND");
    }

    await ctx.runMutation(internal.conversations.unassignAll, {
      agentId: args.memberId,
      tenantId,
    });

    await ctx.runMutation(internal.memberQueries.logMemberAction, {
      tenantId,
      memberId: args.memberId,
      action: "disabled_account",
      details: {},
    });

    return { success: true };
  },
});

export const enableAccount = action({
  args: { memberId: v.string() },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;

    const client = await clerkClient();
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: tenantId,
      limit: 100,
    });

    const member = memberships.data.find(
      (m) => m.publicUserData?.userId === args.memberId,
    );
    if (!member) {
      throw new ConvexError("MEMBER_NOT_FOUND");
    }

    await ctx.runMutation(internal.memberQueries.logMemberAction, {
      tenantId,
      memberId: args.memberId,
      action: "enabled_account",
      details: {},
    });

    return { success: true };
  },
});
