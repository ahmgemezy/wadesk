"use node";

import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { action } from "../_generated/server";
import { internal, components } from "../_generated/api";
import { assertAgentLimitNotReached } from "../lib/planLimits";

export const validateAndJoin = action({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHORIZED");
    const userId = identity.subject as string;

    const link = await ctx.runQuery(internal.inviteLinks.getByToken, {
      token: args.token,
    });

    if (!link || link.revoked || link.expiresAt <= Date.now()) {
      throw new ConvexError("INVITE_INVALID");
    }

    const tenantId = link.tenantId as string;

    const members = await ctx.runQuery(
      components.betterAuth.orgQueries.listOrgMembers,
      { organizationId: tenantId },
    );
    const plan = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId });
    assertAgentLimitNotReached(members.length, plan);

    // Check if already a member — same user-facing result as BEFORE's try/catch on duplicate
    const alreadyMember = members.find((m) => m.userId === userId);
    const org = await ctx.runQuery(
      components.betterAuth.orgQueries.findOrg,
      { orgId: tenantId },
    );
    const orgName = org?.name ?? "Organization";
    if (alreadyMember) {
      return { orgId: tenantId, orgName };
    }

    await ctx.runMutation(
      components.betterAuth.orgMutations.createMember,
      {
        userId,
        organizationId: tenantId,
        role: link.defaultRole as string,
        createdAt: Date.now(),
      },
    );

    const userEmail = identity.email ?? "";
    const userName = identity.name ?? userEmail;
    const agentName =
      identity.givenName ?? identity.name?.split(" ")[0] ?? "Agent";

    // Apply channel assignment embedded in the link (WhatsApp invite flow)
    if (link.channelId) {
      const channelRole = (link.defaultRole === "org:supervisor" ? "org:supervisor" : "org:agent") as "org:supervisor" | "org:agent";
      await ctx.runMutation(internal.channelMembers.addMemberInternal, {
        tenantId,
        channelId: link.channelId,
        userId,
        userName,
        userEmail,
        role: channelRole,
      });
      if (link.departmentId) {
        await ctx.runMutation(internal.departmentMembers.addMemberInternal, {
          tenantId,
          departmentId: link.departmentId,
          userId,
          userName,
          userEmail,
          role: channelRole,
        });
      }
    }

    // Apply any email-based pending assignments (email invite flow)
    if (userEmail) {
      await ctx.runAction(internal.pendingChannelAssignments.applyPendingInternal, {});
    }

    if (userEmail) {
      await ctx.runAction(internal.actions.notifyEmail.agentWelcomeEmail, {
        userId,
        email: userEmail,
        agentName,
        orgName,
        tenantId,
      });
    }

    return { orgId: tenantId, orgName };
  },
});
