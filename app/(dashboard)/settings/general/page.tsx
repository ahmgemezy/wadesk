import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SettingsPageLayout } from "@/components/settings/settings-page-layout";
import { GeneralSettings } from "@/components/settings/general-settings";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function GeneralSettingsPage() {
  const { userId, orgId, orgRole } = await auth();
  if (!userId || !orgId) redirect("/sign-in");
  if (orgRole !== "org:admin") redirect("/settings/team");

  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const t = (en: string, ar: string) => (locale === "en" ? en : ar);

  return (
    <SettingsPageLayout
      title={t("General", "عام")}
      description={t("Workspace-level preferences", "تفضيلات مساحة العمل")}
    >
      <GeneralSettings />
    </SettingsPageLayout>
  );
}
