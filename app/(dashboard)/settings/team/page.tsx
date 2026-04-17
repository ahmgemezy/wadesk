import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { resolveRole } from "@/lib/shell/role-utils";
import { TeamMemberList } from "@/components/settings/team-member-list";
import { InviteLinks } from "@/components/settings/invite-links";
import { SettingsPageLayout } from "@/components/settings/settings-page-layout";

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

  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const t = (en: string, ar: string) => locale === "en" ? en : ar;

  return (
    <SettingsPageLayout
      title={t("Team Settings", "إعدادات الفريق")}
      description={t("Manage team members and roles", "إدارة أعضاء الفريق والأدوار")}
    >
      <div className="space-y-10">
        <TeamMemberList />
        <div className="border-t pt-8">
          <InviteLinks />
        </div>
      </div>
    </SettingsPageLayout>
  );
}
