// convex/orgMembersQueries.ts
//
// Lightweight queries for organization member data, used by client-side hooks.
//
// This file exists separately from convex/orgMembers.ts because the latter has
// "use node" at the top (required by Node-only operations like the Meta WhatsApp
// API and auth.api.* HTTP calls). Convex's runtime rules prohibit query and
// mutation declarations in "use node" files. See docs.convex.dev/functions/runtimes.
//
// When operations in convex/orgMembers.ts no longer require Node runtime
// (post-launch cleanup), this file can be merged back. Phase 2 cleanup task.

import { query } from "./_generated/server";
import { v } from "convex/values";
import { getCallerIdentity } from "./lib/auth";
import { components } from "./_generated/api";

/**
 * Lightweight query for the auth-hooks shim's useOrganization().memberships.
 *
 * Returns ALL active members of the caller's tenant in a flat shape suitable
 * for client-side rendering. Does NOT include pending invitations (use
 * convex/orgMembers.ts:list for that — different consumer, different shape).
 *
 * Access control: caller must be authenticated and have an active org context.
 * Any authenticated member of an org can read the org's member list — this is
 * intentional. The shim's consumers (transfer picker, agent picker, etc.)
 * render for all roles, not just admins.
 *
 * Used by:
 *   - lib/auth-hooks.ts:useOrganization (Stage 2d Phase 1)
 */
export const listActive = query({
  args: {},
  returns: v.array(
    v.object({
      memberId: v.string(),
      userId: v.string(),
      name: v.union(v.string(), v.null()),
      email: v.union(v.string(), v.null()),
      image: v.union(v.string(), v.null()),
      role: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const { tenantId } = await getCallerIdentity(ctx);

    const members = await ctx.runQuery(
      components.betterAuth.orgQueries.listOrgMembers,
      { organizationId: tenantId },
    );

    const users = await Promise.all(
      members.map((m) =>
        ctx.runQuery(components.betterAuth.orgQueries.findUserById, {
          userId: m.userId,
        }),
      ),
    );

    return members.map(
      (m, i: number) => ({
        memberId: m.id,
        userId: m.userId,
        name: users[i]?.name ?? null,
        email: users[i]?.email ?? null,
        image: users[i]?.image ?? null,
        role: m.role,
      }),
    );
  },
});

// Returns the current user's profile for server-side layouts.
// Returns null when unauthenticated. Returns orgId: null when authenticated
// but no active org (user needs to select or create one).
export const getCurrentUserProfile = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      userId: v.string(),
      orgId: v.union(v.string(), v.null()),
      orgRole: v.union(v.string(), v.null()),
      name: v.union(v.string(), v.null()),
      email: v.union(v.string(), v.null()),
      image: v.union(v.string(), v.null()),
      orgName: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const userId = identity.subject;
    const orgId = (identity.orgId as string | undefined) || null;
    const orgRole = (identity.orgRole as string | undefined) || null;

    const user = await ctx.runQuery(components.betterAuth.orgQueries.findUserById, {
      userId,
    });

    let orgName: string | null = null;
    if (orgId) {
      const org = await ctx.runQuery(
        components.betterAuth.orgQueries.findOrg,
        { orgId },
      );
      orgName = org?.name ?? null;
    }

    return {
      userId,
      orgId,
      orgRole,
      name: user?.name ?? null,
      email: user?.email ?? null,
      image: user?.image ?? null,
      orgName,
    };
  },
});
