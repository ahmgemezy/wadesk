"use node";

import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { clerkClient } from "@clerk/nextjs/server";
import { assertAgentLimitNotReached } from "../lib/planLimits";
import type { OrgRole } from "../lib/auth";

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

    const client = await clerkClient();

    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: tenantId,
      limit: 100,
    });
    await assertAgentLimitNotReached(memberships);

    try {
      await client.organizations.createOrganizationMembership({
        organizationId: tenantId,
        userId,
        role: "org:agent" as OrgRole,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("already") || msg.includes("member")) {
        throw new ConvexError("ALREADY_MEMBER");
      }
      throw e;
    }

    const org = await client.organizations.getOrganization({
      organizationId: tenantId,
    });

    return { orgId: tenantId, orgName: org.name ?? "Organization" };
  },
});
