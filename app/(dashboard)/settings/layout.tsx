import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { resolveRole, hasMinRole } from "@/lib/shell/role-utils";
import { Breadcrumb } from "@/components/shell/breadcrumb";

export const dynamic = "force-dynamic";

function detectLocale(headersList: Headers): "ar" | "en" {
  const lang = headersList.get("accept-language") ?? "";
  if (lang.includes("ar")) return "ar";
  return "en";
}

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId, sessionClaims } = await auth();
  if (!userId || !orgId) {
    redirect("/sign-in");
  }

  const role = resolveRole(sessionClaims?.org_role as string | undefined);
  if (!hasMinRole(role, "supervisor")) {
    redirect("/inbox");
  }

  const headersList = await headers();
  const locale = detectLocale(headersList);

  return (
    <>
      <Breadcrumb locale={locale} />
      {children}
    </>
  );
}
