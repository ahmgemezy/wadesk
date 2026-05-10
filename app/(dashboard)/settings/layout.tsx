import { getServerAuth } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { resolveRole, hasMinRole } from "@/lib/shell/role-utils";
import { filterNavItems } from "@/lib/shell/nav-config";
import { Breadcrumb } from "@/components/shell/breadcrumb";
import { SettingsSubNav } from "@/components/settings/settings-sub-nav";

export const dynamic = "force-dynamic";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId, orgRole } = await getServerAuth();
  if (!userId || !orgId) {
    redirect("/sign-in");
  }

  const role = resolveRole(orgRole ?? undefined);
  if (!hasMinRole(role, "supervisor")) {
    redirect("/inbox");
  }

  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";

  const navItems = filterNavItems(role);
  const settingsItem = navItems.find((item) => item.href === "/settings");
  const settingsChildren = settingsItem?.children ?? [];
  const adminItem = navItems.find((item) => item.href === "/settings/team");
  const adminChildren = adminItem?.children ?? [];

  return (
    <>
      <Breadcrumb locale={locale} />
      <SettingsSubNav items={settingsChildren} adminItems={adminChildren} locale={locale} />
      {children}
    </>
  );
}
