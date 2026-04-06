import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { resolveRole } from "@/lib/shell/role-utils";

export const dynamic = "force-dynamic";

export default async function ChannelsSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId, orgRole } = await auth();
  if (!userId || !orgId) {
    redirect("/sign-in");
  }

  const role = resolveRole(orgRole ?? undefined);
  if (role !== "admin") {
    redirect("/inbox");
  }

  return <>{children}</>;
}
