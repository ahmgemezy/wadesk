"use node";

import { action, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getCallerRole, getCallerIdentity, assertAdmin, assertAdminOrSupervisor, type OrgRole } from "./lib/auth";
import { assertAgentLimitNotReached, assertSupervisorRoleAllowed } from "./lib/planLimits";
import { assertNotLastAdmin } from "./lib/lastAdmin";
import { internal, components } from "./_generated/api";
import { resolveOrgName } from "./lib/emailHelpers";

function assertSupervisorCanManageTarget(
  callerRole: OrgRole,
  targetRole: string | undefined,
): void {
  if (callerRole === "org:supervisor") {
    if (targetRole !== "org:agent") {
      throw new ConvexError("SUPERVISOR_CAN_ONLY_MANAGE_AGENTS");
    }
  }
}

export const inviteByEmail = action({
  args: {
    email: v.string(),
    role: v.union(
      v.literal("org:admin"),
      v.literal("org:supervisor"),
      v.literal("org:agent"),
    ),
  },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);

    if (role === "org:supervisor") {
      if (args.role !== "org:agent") {
        throw new ConvexError("SUPERVISOR_CAN_ONLY_INVITE_AGENTS");
      }
    } else {
      assertAdmin(role);
    }

    const { tenantId, callerId } = await getCallerIdentity(ctx);

    const members = await ctx.runQuery(
      components.betterAuth.orgQueries.listOrgMembers,
      { organizationId: tenantId },
    );

    const plan = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId });
    assertAgentLimitNotReached(members.length, plan);
    if (args.role === "org:supervisor") assertSupervisorRoleAllowed(plan);

    const existingInvites = await ctx.runQuery(
      components.betterAuth.orgQueries.findPendingInvitationByEmail,
      { organizationId: tenantId, email: args.email },
    );
    if (existingInvites.length > 0) {
      throw new ConvexError("ALREADY_MEMBER");
    }

    const invitation = await ctx.runMutation(
      components.betterAuth.orgMutations.createInvitation,
      {
        organizationId: tenantId,
        email: args.email,
        role: args.role,
        status: "pending",
        inviterId: callerId,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      },
    );

    const inviter = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "id", value: callerId }],
    })) as { id: string; name: string | null } | null;
    const inviterName = inviter?.name ?? "WABDesk";
    const orgName = await resolveOrgName(ctx, tenantId);

    const invitationId = invitation.id;
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/accept-invite/${invitationId}`;

    await ctx.scheduler.runAfter(0, internal.actions.sendEmail.sendEmail, {
      to: args.email,
      templateKey: "invitation",
      locale: "ar",
      variables: {
        orgName,
        inviterName,
        inviteUrl,
      },
    });
  },
});

export const list = action({
  args: {},
  handler: async (ctx) => {
    const role = await getCallerRole(ctx);
    if (role !== "org:admin" && role !== "org:supervisor") {
      throw new ConvexError("FORBIDDEN");
    }

    const { tenantId } = await getCallerIdentity(ctx);

    type MemberMetadata = {
      profiles: Record<string, { jobTitle?: string | null }>;
      departments: Record<string, string[]>;
    };

    const [members, invitations] = await Promise.all([
      ctx.runQuery(components.betterAuth.orgQueries.listOrgMembers, {
        organizationId: tenantId,
      }),
      ctx.runQuery(components.betterAuth.orgQueries.listPendingInvitations, {
        organizationId: tenantId,
      }),
    ]);

    const [memberUsers, metadata] = await Promise.all([
      Promise.all(
        members.map((m) =>
          ctx.runQuery(components.betterAuth.adapter.findOne, {
            model: "user",
            where: [{ field: "id", value: m.userId }],
          }),
        ),
      ),
      ctx.runQuery(internal.memberQueries.getAllMemberMetadata, { tenantId }),
    ]);

    const meta = metadata as MemberMetadata;

    const active = members.map((m, i) => {
      const user = memberUsers[i] as { name?: string | null; email?: string | null; image?: string | null } | null;
      const userId = m.userId;
      return {
        userId,
        email: (user?.email as string | null) ?? "",
        name: (user?.name as string | null) ?? null,
        imageUrl: (user?.image as string | null) ?? null,
        role: m.role as OrgRole,
        status: "active" as const,
        joinedAt: new Date(m.createdAt as Date | number).getTime(),
        jobTitle: (meta.profiles[userId]?.jobTitle ?? null) as string | null,
        departments: (meta.departments[userId] ?? []) as string[],
      };
    });

    const pending = invitations.map((inv) => ({
      userId: inv.id,
      email: inv.email,
      name: null as string | null,
      imageUrl: null as string | null,
      role: inv.role as OrgRole,
      status: "pending" as const,
      joinedAt: null as number | null,
    }));

    return [...active, ...pending];
  },
});

export const changeRole = action({
  args: {
    targetUserId: v.string(),
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

    if (callerId === args.targetUserId) {
      throw new ConvexError("CANNOT_CHANGE_OWN_ROLE");
    }

    if (args.newRole === "org:supervisor") {
      const plan = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId });
      assertSupervisorRoleAllowed(plan);
    }

    if (args.newRole !== "org:admin") {
      const members = await ctx.runQuery(
        components.betterAuth.orgQueries.listOrgMembers,
        { organizationId: tenantId },
      );
      await assertNotLastAdmin(members, args.targetUserId);
    }

    const targetMember = await ctx.runQuery(
      components.betterAuth.orgQueries.findOrgMember,
      { userId: args.targetUserId, organizationId: tenantId },
    );
    if (!targetMember) throw new ConvexError("MEMBER_NOT_FOUND");

    await ctx.runMutation(
      components.betterAuth.orgMutations.updateMemberRole,
      { memberId: targetMember.id, role: args.newRole },
    );
  },
});

export const inviteByWhatsApp = action({
  args: {
    phone: v.string(),
    role: v.union(
      v.literal("org:admin"),
      v.literal("org:supervisor"),
      v.literal("org:agent"),
    ),
  },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);

    if (role === "org:supervisor") {
      if (args.role !== "org:agent") {
        throw new ConvexError("SUPERVISOR_CAN_ONLY_INVITE_AGENTS");
      }
    } else {
      assertAdmin(role);
    }

    const e164 = /^\+[1-9]\d{6,14}$/.test(args.phone);
    if (!e164) {
      throw new ConvexError("INVALID_PHONE");
    }

    const { tenantId, callerId } = await getCallerIdentity(ctx);

    const members = await ctx.runQuery(
      components.betterAuth.orgQueries.listOrgMembers,
      { organizationId: tenantId },
    );
    const plan = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId });
    assertAgentLimitNotReached(members.length, plan);
    if (args.role === "org:supervisor") assertSupervisorRoleAllowed(plan);

    const existingLinks = await ctx.runQuery(internal.inviteLinks.getActiveForTenant, { tenantId });
    let inviteUrl: string;

    if (existingLinks && !existingLinks.revoked && existingLinks.expiresAt > Date.now()) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      inviteUrl = `${baseUrl}/join/${existingLinks.token}`;
    } else {
      const result = await ctx.runMutation(internal.inviteLinks.ensureActive, {
        tenantId,
        createdBy: callerId,
      });
      inviteUrl = result.url;
    }

    const channels = await ctx.runQuery(internal.channels.listByTenantId, { tenantId });
    const channel = channels?.find(c => c.isActive && c.status === "active");
    if (!channel) {
      return { whatsappSent: false, inviteUrl };
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v25.0/${channel.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.META_SYSTEM_USER_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: args.phone,
            type: "template",
            template: {
              name: "agent_invite",
              language: { code: "ar" },
              components: [
                {
                  type: "body",
                  parameters: [{ type: "text", text: inviteUrl }],
                },
              ],
            },
          }),
        },
      );

      if (!response.ok) {
        return { whatsappSent: false, inviteUrl };
      }
    } catch {
      return { whatsappSent: false, inviteUrl };
    }

    return { whatsappSent: true, inviteUrl };
  },
});

export const removeMember = action({
  args: {
    targetUserId: v.string(),
    status: v.union(v.literal("active"), v.literal("pending")),
  },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdminOrSupervisor(role);

    const { tenantId, callerId } = await getCallerIdentity(ctx);

    if (callerId === args.targetUserId) {
      throw new ConvexError("CANNOT_REMOVE_SELF");
    }

    if (args.status === "pending") {
      await ctx.runMutation(
        components.betterAuth.orgMutations.cancelInvitation,
        { invitationId: args.targetUserId },
      );
      return;
    }

    const members = await ctx.runQuery(
      components.betterAuth.orgQueries.listOrgMembers,
      { organizationId: tenantId },
    );
    await assertNotLastAdmin(members, args.targetUserId);

    if (role === "org:supervisor") {
      const target = members.find((m) => m.userId === args.targetUserId);
      assertSupervisorCanManageTarget(role, target?.role);
    }

    const targetMember = members.find((m) => m.userId === args.targetUserId);
    if (!targetMember) throw new ConvexError("MEMBER_NOT_FOUND");

    await ctx.runMutation(
      components.betterAuth.orgMutations.deleteMember,
      { memberId: targetMember.id },
    );

    await ctx.runMutation(internal.conversations.unassignAll, {
      agentId: args.targetUserId,
      tenantId,
    });
  },
});
