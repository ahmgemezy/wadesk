import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { resolveRole, hasMinRole } from "@/lib/shell/role-utils";

export const dynamic = "force-dynamic";

export default async function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId, orgRole } = await auth();
  if (!userId || !orgId) redirect("/sign-in");

  const role = resolveRole(orgRole ?? undefined);
  if (!hasMinRole(role, "supervisor")) redirect("/inbox");

  return <>{children}</>;
}
