import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { resolveRole, hasMinRole } from "@/lib/shell/role-utils";
import { Breadcrumb } from "@/components/shell/breadcrumb";

export const dynamic = "force-dynamic";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId, orgRole } = await auth();
  if (!userId || !orgId) {
    redirect("/sign-in");
  }

  const role = resolveRole(orgRole ?? undefined);
  if (!hasMinRole(role, "supervisor")) {
    redirect("/inbox");
  }

  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";

  return (
    <>
      <Breadcrumb locale={locale} />
      {children}
    </>
  );
}
