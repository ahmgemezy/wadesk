"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { clerkClient } from "@clerk/nextjs/server";
import { getCallerIdentity, getCallerRole, assertAdmin, type OrgRole } from "./lib/auth";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

export const getMemberProfile = action({
  args: { memberId: v.string() },
  handler: async (ctx, args): Promise<null | {
    firstName: string | null;
    lastName: string | null;
    name: string | null;
    email: string | null;
    imageUrl: string | null;
    role: OrgRole;
    joinedAt: number | null;
    phone: string | null;
    jobTitle: string | null;
    bio: string | null;
    channels: { id: string; name: string }[];
    departments: { id: string; name: string }[];
  }> => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const { tenantId } = await getCallerIdentity(ctx);

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

    const [channels, departments, memberProfile] = await Promise.all([
      ctx.runQuery(internal.memberQueries.getMemberChannelAssignments, {
        memberId: args.memberId,
      }),
      ctx.runQuery(internal.memberQueries.getMemberDeptAssignments, {
        memberId: args.memberId,
      }),
      ctx.runQuery(internal.memberQueries.getMemberProfile, {
        tenantId,
        memberId: args.memberId,
      }),
    ]);

    const firstName = member.publicUserData?.firstName ?? null;
    const lastName = member.publicUserData?.lastName ?? null;
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || member.publicUserData?.identifier || null;

    return {
      firstName,
      lastName,
      name: fullName,
      email: member.publicUserData?.identifier ?? null,
      imageUrl: member.publicUserData?.imageUrl ?? null,
      role: (member.role === "admin" ? "org:admin" : member.role) as OrgRole,
      joinedAt: member.createdAt ?? null,
      phone: memberProfile?.phone ?? null,
      jobTitle: memberProfile?.jobTitle ?? null,
      bio: memberProfile?.bio ?? null,
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

    const { tenantId, callerId } = await getCallerIdentity(ctx);

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

    const { tenantId, callerId } = await getCallerIdentity(ctx);

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

    const { tenantId, callerId } = await getCallerIdentity(ctx);

    const client = await clerkClient();
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: tenantId,
      limit: 100,
    });

    const member = memberships.data.find((m) => m.publicUserData?.userId === args.memberId);
    if (!member) {
      throw new ConvexError("MEMBER_NOT_FOUND");
    }

    const oldChannels = await ctx.runQuery(internal.memberQueries.getMemberChannelAssignments, {
      memberId: args.memberId,
    });
    const oldChannelIds = oldChannels.map((ch) => ch.id);

    await ctx.runMutation(internal.memberQueries.removeMemberFromChannels, {
      tenantId,
      userId: args.memberId,
    });

    const memberRole = (member.role === "admin" ? "org:admin" : member.role) as OrgRole;
    const nonAdminRole = memberRole === "org:admin" ? "org:supervisor" : (memberRole as "org:supervisor" | "org:agent");

    await ctx.runMutation(internal.memberQueries.addMemberToChannels, {
      tenantId,
      userId: args.memberId,
      channelIds: args.channelIds,
      userName: member.publicUserData?.firstName || member.publicUserData?.identifier || "Unknown",
      userEmail: member.publicUserData?.identifier || "",
      userImageUrl: member.publicUserData?.imageUrl,
      role: nonAdminRole,
      addedBy: callerId,
    });

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

    const { tenantId, callerId } = await getCallerIdentity(ctx);

    const client = await clerkClient();
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: tenantId,
      limit: 100,
    });

    const member = memberships.data.find((m) => m.publicUserData?.userId === args.memberId);
    if (!member) {
      throw new ConvexError("MEMBER_NOT_FOUND");
    }

    const oldDepartments = await ctx.runQuery(internal.memberQueries.getMemberDeptAssignments, {
      memberId: args.memberId,
    });
    const oldDepartmentIds = oldDepartments.map((dept) => dept.id);

    await ctx.runMutation(internal.memberQueries.removeMemberFromDepartments, {
      tenantId,
      userId: args.memberId,
    });

    const memberRole = (member.role === "admin" ? "org:admin" : member.role) as OrgRole;
    const nonAdminRole = memberRole === "org:admin" ? "org:supervisor" : (memberRole as "org:supervisor" | "org:agent");

    await ctx.runMutation(internal.memberQueries.addMemberToDepartments, {
      tenantId,
      userId: args.memberId,
      departmentIds: args.departmentIds,
      userName: member.publicUserData?.firstName || member.publicUserData?.identifier || "Unknown",
      userEmail: member.publicUserData?.identifier || "",
      role: nonAdminRole,
      addedBy: callerId,
    });

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
    phone: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const { tenantId } = await getCallerIdentity(ctx);

    await ctx.runMutation(internal.memberQueries.updateMemberProfile, {
      tenantId,
      memberId: args.memberId,
      phone: args.phone,
      jobTitle: args.jobTitle,
    });

    const changedFields: Record<string, boolean> = {};
    if (args.phone) changedFields["phone"] = true;
    if (args.jobTitle) changedFields["jobTitle"] = true;

    await ctx.runMutation(internal.memberQueries.logMemberAction, {
      tenantId,
      memberId: args.memberId,
      action: "updated_contact",
      details: { changedFields },
    });

    return { success: true };
  },
});

export const updateMemberDisplayName = action({
  args: {
    memberId: v.string(),
    firstName: v.string(),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const { tenantId } = await getCallerIdentity(ctx);

    const client = await clerkClient();
    await client.users.updateUser(args.memberId, {
      firstName: args.firstName,
      ...(args.lastName !== undefined && { lastName: args.lastName }),
    });

    await ctx.runMutation(internal.memberQueries.logMemberAction, {
      tenantId,
      memberId: args.memberId,
      action: "updated_contact",
      details: { changedFields: { displayName: true } },
    });

    return { success: true };
  },
});

export const updateMemberAvatarFromStorage = action({
  args: {
    memberId: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const { tenantId } = await getCallerIdentity(ctx);

    const storageUrl = await ctx.runMutation(internal.profiles.getStorageUrlInternal, {
      storageId: args.storageId as Id<"_storage">,
    });
    if (!storageUrl) throw new ConvexError("STORAGE_URL_FAILED");

    const res = await fetch(storageUrl);
    if (!res.ok) throw new ConvexError("FETCH_FAILED");
    const blob = await res.blob();

    const client = await clerkClient();
    await client.users.updateUserProfileImage(args.memberId, { file: blob });

    await ctx.runMutation(internal.memberQueries.logMemberAction, {
      tenantId,
      memberId: args.memberId,
      action: "updated_contact",
      details: { changedFields: { avatarUrl: true } },
    });

    return { success: true };
  },
});

export const updateMemberAvatarFromUrl = action({
  args: {
    memberId: v.string(),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const { tenantId } = await getCallerIdentity(ctx);

    const res = await fetch(args.url);
    if (!res.ok) throw new ConvexError("FETCH_FAILED");
    const blob = await res.blob();

    const client = await clerkClient();
    await client.users.updateUserProfileImage(args.memberId, { file: blob });

    await ctx.runMutation(internal.memberQueries.logMemberAction, {
      tenantId,
      memberId: args.memberId,
      action: "updated_contact",
      details: { changedFields: { avatarUrl: true } },
    });

    return { success: true };
  },
});

export const removeMemberAvatar = action({
  args: { memberId: v.string() },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const { tenantId } = await getCallerIdentity(ctx);

    const client = await clerkClient();
    await client.users.deleteUserProfileImage(args.memberId);

    await ctx.runMutation(internal.memberQueries.logMemberAction, {
      tenantId,
      memberId: args.memberId,
      action: "updated_contact",
      details: { changedFields: { avatarUrl: true } },
    });

    return { success: true };
  },
});

export const disableAccount = action({
  args: { memberId: v.string() },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const { tenantId, callerId } = await getCallerIdentity(ctx);

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

    const { tenantId } = await getCallerIdentity(ctx);

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
