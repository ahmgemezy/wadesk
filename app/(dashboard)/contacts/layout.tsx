import { getServerAuth } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { resolveRole } from "@/lib/shell/role-utils";
import { hasMinRole } from "@/lib/shell/role-utils";

export const dynamic = "force-dynamic";

export default async function ContactsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId, orgRole } = await getServerAuth();
  if (!userId || !orgId) redirect("/sign-in");

  const role = resolveRole(orgRole ?? undefined);
  if (!hasMinRole(role, "agent")) redirect("/inbox");

  return <>{children}</>;
}
