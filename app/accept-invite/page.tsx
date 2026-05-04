import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { fetchAction } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

export default async function AcceptInvitePage() {
  const { userId, getToken } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    redirect("/sign-in");
  }

  try {
    const token = await getToken({ template: "convex" });
    if (token) {
      const clerk = await clerkClient();
      const membershipList = await clerk.users.getOrganizationMembershipList({ userId });
      const memberships = membershipList.data;

      if (memberships.length > 0) {
        const latest = memberships.sort(
          (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0),
        )[0];
        const orgId = latest.organization.id;
        const orgName = latest.organization.name ?? "Organization";
        const email = user.emailAddresses[0]?.emailAddress ?? "";
        const agentName = user.firstName ?? user.username ?? "Agent";

        if (email && orgId) {
          await fetchAction(
            api.actions.notifyEmail.sendWelcomeOnJoin,
            { email, agentName, orgName, tenantId: orgId },
            { token },
          );
        }
      }
    }
  } catch {
    // Welcome email failure must never block the redirect
  }

  redirect("/inbox");
}
