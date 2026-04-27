"use node";

import { clerkClient } from "@clerk/nextjs/server";

export async function getAdminEmails(
  orgId: string,
): Promise<Array<{ userId: string; email: string }>> {
  try {
    const client = await clerkClient();
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100,
    });
    return memberships.data
      .filter((m) => m.role === "org:admin")
      .filter((m) => m.publicUserData?.userId)
      .map((m) => ({
        userId: m.publicUserData!.userId!,
        email: (m.publicUserData?.identifier ?? "") as string,
      }))
      .filter((m) => m.email.length > 0);
  } catch {
    return [];
  }
}

export async function resolveUserEmail(userId: string): Promise<string | null> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return user.emailAddresses[0]?.emailAddress ?? null;
  } catch {
    return null;
  }
}

export async function resolveOrgName(orgId: string): Promise<string> {
  try {
    const client = await clerkClient();
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    return org.name ?? orgId;
  } catch {
    return orgId;
  }
}
