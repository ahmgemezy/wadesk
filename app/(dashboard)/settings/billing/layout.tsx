import { getServerAuth } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { resolveRole } from "@/lib/shell/role-utils";

export const dynamic = "force-dynamic";

export default async function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId, orgRole } = await getServerAuth();
  if (!userId || !orgId) redirect("/sign-in");

  const role = resolveRole(orgRole ?? undefined);
  if (role !== "admin") redirect("/inbox");

  return <>{children}</>;
}
