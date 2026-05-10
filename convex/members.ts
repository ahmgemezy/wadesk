"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getCallerIdentity, getCallerRole, assertAdmin, assertAdminOrSupervisor, type OrgRole } from "./lib/auth";
import { internal, components } from "./_generated/api";
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
    assertAdminOrSupervisor(role);

    const { tenantId } = await getCallerIdentity(ctx);

    const targetMember = await ctx.runQuery(
      components.betterAuth.orgQueries.findOrgMember,
      { userId: args.memberId, organizationId: tenantId },
    );

    if (!targetMember) return null;

    const user = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", value: args.memberId }],
    })) as { id: string; name: string | null; email: string | null; image: string | null } | null;

    if (!user) return null;

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

    return {
      firstName: null,
      lastName: null,
      name: user.name,
      email: user.email,
      imageUrl: user.image,
      role: targetMember.role as OrgRole,
      joinedAt: new Date(targetMember.createdAt as Date | number).getTime(),
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

    const targetMember = await ctx.runQuery(
      components.betterAuth.orgQueries.findOrgMember,
      { userId: args.memberId, organizationId: tenantId },
    );

    if (!targetMember) throw new ConvexError("MEMBER_NOT_FOUND");

    await ctx.runMutation(
      components.betterAuth.orgMutations.updateMemberRole,
      { memberId: targetMember.id, role: args.newRole },
    );

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

    const targetMember = await ctx.runQuery(
      components.betterAuth.orgQueries.findOrgMember,
      { userId: args.memberId, organizationId: tenantId },
    );

    if (!targetMember) throw new ConvexError("MEMBER_NOT_FOUND");

    await ctx.runMutation(
      components.betterAuth.orgMutations.deleteMember,
      { memberId: targetMember.id },
    );

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
    assertAdminOrSupervisor(role);

    const { tenantId, callerId } = await getCallerIdentity(ctx);

    const targetMember = await ctx.runQuery(
      components.betterAuth.orgQueries.findOrgMember,
      { userId: args.memberId, organizationId: tenantId },
    );

    if (!targetMember) throw new ConvexError("MEMBER_NOT_FOUND");

    const user = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", value: args.memberId }],
    })) as { name?: string | null; email?: string | null; image?: string | null } | null;

    const memberRole = targetMember.role as OrgRole;
    const nonAdminRole = memberRole === "org:admin" ? "org:supervisor" : (memberRole as "org:supervisor" | "org:agent");

    const oldChannels = await ctx.runQuery(internal.memberQueries.getMemberChannelAssignments, {
      memberId: args.memberId,
    });
    const oldChannelIds = oldChannels.map((ch) => ch.id);

    await ctx.runMutation(internal.memberQueries.removeMemberFromChannels, {
      tenantId,
      userId: args.memberId,
    });

    await ctx.runMutation(internal.memberQueries.addMemberToChannels, {
      tenantId,
      userId: args.memberId,
      channelIds: args.channelIds,
      userName: (user?.name as string | null) ?? args.memberId,
      userEmail: (user?.email as string) ?? "",
      userImageUrl: (user?.image as string | null) ?? undefined,
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
    assertAdminOrSupervisor(role);

    const { tenantId, callerId } = await getCallerIdentity(ctx);

    const targetMember = await ctx.runQuery(
      components.betterAuth.orgQueries.findOrgMember,
      { userId: args.memberId, organizationId: tenantId },
    );

    if (!targetMember) throw new ConvexError("MEMBER_NOT_FOUND");

    const user = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", value: args.memberId }],
    })) as { name?: string | null; email?: string | null } | null;

    const memberRole = targetMember.role as OrgRole;
    const nonAdminRole = memberRole === "org:admin" ? "org:supervisor" : (memberRole as "org:supervisor" | "org:agent");

    const oldDepartments = await ctx.runQuery(internal.memberQueries.getMemberDeptAssignments, {
      memberId: args.memberId,
    });
    const oldDepartmentIds = oldDepartments.map((dept) => dept.id);

    await ctx.runMutation(internal.memberQueries.removeMemberFromDepartments, {
      tenantId,
      userId: args.memberId,
    });

    await ctx.runMutation(internal.memberQueries.addMemberToDepartments, {
      tenantId,
      userId: args.memberId,
      departmentIds: args.departmentIds,
      userName: (user?.name as string | null) ?? args.memberId,
      userEmail: (user?.email as string) ?? "",
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
    assertAdminOrSupervisor(role);

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
    assertAdminOrSupervisor(role);

    const { tenantId } = await getCallerIdentity(ctx);

    const fullName = [args.firstName, args.lastName].filter(Boolean).join(" ");
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: args.memberId }],
        update: { name: fullName },
      },
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

    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: args.memberId }],
        update: { image: storageUrl },
      },
    });

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
    if (!args.url.startsWith("https://")) {
      throw new Error("Avatar URL must use HTTPS");
    }

    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const { tenantId } = await getCallerIdentity(ctx);

    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: args.memberId }],
        update: { image: args.url },
      },
    });

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

    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: args.memberId }],
        update: { image: null },
      },
    });

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

    const targetMember = await ctx.runQuery(
      components.betterAuth.orgQueries.findOrgMember,
      { userId: args.memberId, organizationId: tenantId },
    );

    if (!targetMember) throw new ConvexError("MEMBER_NOT_FOUND");

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

    const targetMember = await ctx.runQuery(
      components.betterAuth.orgQueries.findOrgMember,
      { userId: args.memberId, organizationId: tenantId },
    );

    if (!targetMember) throw new ConvexError("MEMBER_NOT_FOUND");

    await ctx.runMutation(internal.memberQueries.logMemberAction, {
      tenantId,
      memberId: args.memberId,
      action: "enabled_account",
      details: {},
    });

    return { success: true };
  },
});
