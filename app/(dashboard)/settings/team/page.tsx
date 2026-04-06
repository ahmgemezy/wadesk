import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { resolveRole } from "@/lib/shell/role-utils";
import { TeamMemberList } from "@/components/settings/team-member-list";

export const dynamic = "force-dynamic";

export default async function TeamSettingsPage() {
  const { userId, orgId, orgRole } = await auth();
  if (!userId || !orgId) {
    redirect("/sign-in");
  }

  const role = resolveRole(orgRole ?? undefined);
  if (role !== "admin" && role !== "supervisor") {
    redirect("/inbox");
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        إعدادات الفريق / Team Settings
      </h1>
      <TeamMemberList />
    </div>
  );
}
