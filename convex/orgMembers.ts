"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { clerkClient } from "@clerk/nextjs/server";
import { getCallerRole, assertAdmin, type OrgRole } from "./lib/auth";
import { assertAgentLimitNotReached } from "./lib/planLimits";
import { assertNotLastAdmin } from "./lib/lastAdmin";
import { internal } from "./_generated/api";

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
    assertAdmin(role);

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;
    const callerId = identity.subject as string;

    const client = await clerkClient();

    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: tenantId,
      limit: 100,
    });
    await assertAgentLimitNotReached(memberships);

    try {
      await client.organizations.createOrganizationInvitation({
        organizationId: tenantId,
        inviterUserId: callerId,
        emailAddress: args.email,
        role: args.role,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/accept-invite`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("already") || msg.includes("member")) {
        throw new ConvexError("ALREADY_MEMBER");
      }
      throw e;
    }
  },
});

export const list = action({
  args: {},
  handler: async (ctx) => {
    const role = await getCallerRole(ctx);
    if (role !== "org:admin" && role !== "org:supervisor") {
      throw new ConvexError("FORBIDDEN");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;

    const client = await clerkClient();

    const [memberships, invitations] = await Promise.all([
      client.organizations.getOrganizationMembershipList({
        organizationId: tenantId,
        limit: 100,
      }),
      client.organizations.getOrganizationInvitationList({
        organizationId: tenantId,
        limit: 100,
      }),
    ]);

    const active = memberships.data.map((m) => ({
      userId: (m.publicUserData?.userId ?? "") as string,
      email: (m.publicUserData?.identifier ?? "") as string,
      name: (m.publicUserData?.firstName ?? null) as string | null,
      imageUrl: (m.publicUserData?.imageUrl ?? null) as string | null,
      role: (m.role === "admin" ? "org:admin" : m.role) as OrgRole,
      status: "active" as const,
      joinedAt: (m.createdAt ?? null) as number | null,
    }));

    const pending = invitations.data
      .filter((inv) => inv.status === "pending")
      .map((inv) => ({
        userId: inv.id as string,
        email: inv.emailAddress as string,
        name: null as string | null,
        imageUrl: null as string | null,
        role: (inv.role === "admin" ? "org:admin" : inv.role) as OrgRole,
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

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;

    const client = await clerkClient();

    if (args.newRole !== "org:admin") {
      const memberships = await client.organizations.getOrganizationMembershipList({
        organizationId: tenantId,
        limit: 100,
      });
      await assertNotLastAdmin(memberships, args.targetUserId);
    }

    await client.organizations.updateOrganizationMembership({
      organizationId: tenantId,
      userId: args.targetUserId,
      role: args.newRole,
    });
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
    assertAdmin(role);

    const e164 = /^\+[1-9]\d{6,14}$/.test(args.phone);
    if (!e164) {
      throw new ConvexError("INVALID_PHONE");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;

    const client = await clerkClient();
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: tenantId,
      limit: 100,
    });
    await assertAgentLimitNotReached(memberships);

    const existingLinks = await ctx.runQuery(internal.inviteLinks.getActiveForTenant, { tenantId });
    let inviteUrl: string;

    if (existingLinks && !existingLinks.revoked && existingLinks.expiresAt > Date.now()) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      inviteUrl = `${baseUrl}/join/${existingLinks.token}`;
    } else {
      const result = await ctx.runMutation(internal.inviteLinks.ensureActive, {
        tenantId,
        createdBy: identity.subject as string,
      });
      inviteUrl = result.url;
    }

    const channels = await ctx.runQuery(internal.channels.listByTenantId, { tenantId });
    const channel = channels?.[0];
    if (!channel) {
      throw new ConvexError({ message: "WHATSAPP_SEND_FAILED", data: { reason: "No WhatsApp channel connected" } });
    }

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${channel.phoneNumberId}/messages`,
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
      const errorBody = await response.text();
      throw new ConvexError({
        message: "WHATSAPP_SEND_FAILED",
        data: { reason: errorBody },
      });
    }
  },
});

export const removeMember = action({
  args: {
    targetUserId: v.string(),
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
    await assertNotLastAdmin(memberships, args.targetUserId);

    await client.organizations.deleteOrganizationMembership({
      organizationId: tenantId,
      userId: args.targetUserId,
    });

    await ctx.runMutation(internal.conversations.unassignAll, {
      agentId: args.targetUserId,
      tenantId,
    });
  },
});
