import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId, sessionClaims } = await auth();
  if (!userId || !orgId) {
    redirect("/sign-in");
  }

  const role = (sessionClaims?.org_role as string) ?? "org:agent";
  if (role !== "org:admin" && role !== "admin" && role !== "org:supervisor") {
    redirect("/inbox");
  }

  return <>{children}</>;
}
