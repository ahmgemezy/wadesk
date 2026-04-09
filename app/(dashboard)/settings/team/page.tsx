import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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

  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const t = (en: string, ar: string) => locale === "en" ? en : ar;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        {t("Team Settings", "إعدادات الفريق")}
      </h1>
      <TeamMemberList />
    </div>
  );
}
