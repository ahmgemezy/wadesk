import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { BottomNav } from "@/components/shell/bottom-nav";
import { resolveRole } from "@/lib/shell/role-utils";
import { filterNavItems } from "@/lib/shell/nav-config";
import type { ResolvedUser } from "@/lib/shell/types";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

function detectLocale(headersList: Headers): "ar" | "en" {
  const lang = headersList.get("accept-language") ?? "";
  if (lang.includes("ar")) return "ar";
  return "en";
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  if (!orgId) {
    redirect("/onboarding");
  }

  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { sessionClaims } = await auth();
  const orgRole = (sessionClaims?.org_role as string) ?? "org:agent";
  const role = resolveRole(orgRole);

  const resolvedUser: ResolvedUser = {
    name: user.fullName ?? user.emailAddresses[0]?.emailAddress ?? "User",
    email: user.emailAddresses[0]?.emailAddress ?? "",
    imageUrl: user.imageUrl,
    role: orgRole as ResolvedUser["role"],
    orgName: (sessionClaims?.org_name as string) ?? "Organization",
  };

  const navItems = filterNavItems(role);

  const headersList = await headers();
  const locale = detectLocale(headersList);

  return (
    <SidebarProvider>
      <AppSidebar user={resolvedUser} navItems={navItems} locale={locale} />
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 px-4 md:hidden">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
        </header>
        <div className="flex-1 pb-16 md:pb-0">
          {children}
        </div>
      </SidebarInset>
      <BottomNav items={navItems} locale={locale} />
    </SidebarProvider>
  );
}
