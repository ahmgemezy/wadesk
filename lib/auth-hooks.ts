"use client";

// Auth hooks shim — provides Clerk-compatible hook shapes backed by Better Auth.
// All client components that previously imported from "@clerk/nextjs" now
// import from "@/lib/auth-hooks" instead. The exported API surface mirrors
// Clerk's useAuth, useUser, and useOrganization hooks.

import { authClient } from "@/lib/auth-client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// Better Auth's useSession() returns a session that, with organizationClient,
// includes activeOrganizationId and activeOrganizationRole on the session object.
type BetterAuthUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

type BetterAuthSession = {
  user: BetterAuthUser;
  session: {
    activeOrganizationId?: string | null;
    activeOrganizationRole?: string | null;
  };
};

export type OrgRole = "org:admin" | "org:supervisor" | "org:agent";

// ── useAuth ──────────────────────────────────────────────────────────────────

export function useAuth() {
  const raw = authClient.useSession() as {
    data: BetterAuthSession | null;
    isPending: boolean;
  };

  const userId = raw.data?.user.id ?? null;
  const orgId = raw.data?.session.activeOrganizationId || null;
  const orgRole = (raw.data?.session.activeOrganizationRole || null) as OrgRole | null;

  return {
    isLoaded: !raw.isPending,
    isSignedIn: raw.data !== null,
    userId,
    orgId,
    orgRole,
  };
}

// ── useUser ───────────────────────────────────────────────────────────────────

export function useUser() {
  const raw = authClient.useSession() as {
    data: BetterAuthSession | null;
    isPending: boolean;
  };

  const u = raw.data?.user ?? null;
  const nameParts = u?.name?.split(" ") ?? [];

  return {
    isLoaded: !raw.isPending,
    isSignedIn: u !== null,
    user: u
      ? {
          id: u.id,
          fullName: u.name ?? null,
          firstName: nameParts[0] ?? null,
          lastName: nameParts.slice(1).join(" ") || null,
          emailAddresses: u.email ? [{ emailAddress: u.email }] : [],
          imageUrl: u.image ?? null,
        }
      : null,
  };
}

// ── useOrganization ───────────────────────────────────────────────────────────

interface MemberPublicData {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  identifier: string | null;
  imageUrl: string | null;
}

interface MembershipItem {
  publicUserData: MemberPublicData;
  role: string;
}

export function useOrganization(_opts?: unknown) {
  const raw = authClient.useSession() as {
    data: BetterAuthSession | null;
    isPending: boolean;
  };

  // listActive requires an active org context; returns undefined when
  // unauthenticated or no org (skips the query via the Convex skip pattern).
  const members = useQuery(
    api.orgMembersQueries.listActive,
    raw.data?.session.activeOrganizationId ? {} : "skip",
  );

  const orgId = raw.data?.session.activeOrganizationId || null;
  const orgRole = (raw.data?.session.activeOrganizationRole || null) as OrgRole | null;

  const mappedMembers: MembershipItem[] = (members ?? []).map((m) => {
    const parts = m.name?.split(" ") ?? [];
    return {
      publicUserData: {
        userId: m.userId,
        firstName: parts[0] ?? null,
        lastName: parts.slice(1).join(" ") || null,
        identifier: m.email ?? m.userId,
        imageUrl: m.image ?? null,
      } satisfies MemberPublicData,
      role: m.role,
    };
  });

  return {
    isLoaded: !raw.isPending,
    organization: orgId ? { id: orgId, name: "Organization", slug: null, imageUrl: null } : null,
    membership: orgRole ? { role: orgRole } : null,
    memberships: { data: mappedMembers } as { data: MembershipItem[] },
  };
}
