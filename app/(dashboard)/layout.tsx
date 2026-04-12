import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { BottomNav } from "@/components/shell/bottom-nav";
import { resolveRole } from "@/lib/shell/role-utils";
import { filterNavItems } from "@/lib/shell/nav-config";
import type { ResolvedUser } from "@/lib/shell/types";
import { Separator } from "@/components/ui/separator";
import { NotificationBell } from "@/components/ui/notification-bell";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ConvexAuthGuard } from "@/components/shell/convex-auth-guard";

export const dynamic = "force-dynamic";

function detectLocale(headersList: Headers, cookieLocale: string | undefined): "ar" | "en" {
  if (cookieLocale === "ar" || cookieLocale === "en") return cookieLocale;
  const lang = headersList.get("accept-language") ?? "";
  if (lang.includes("ar")) return "ar";
  return "en";
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId, orgRole: clerkOrgRole, getToken } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  if (!orgId) {
    // User is signed in but no active org in session — returning member whose
    // session hasn't activated an org yet. Show org selector.
    redirect("/select-org");
  }

  const user = await currentUser();
  if (!user) redirect("/sign-in");

  let orgName = "Organization";
  try {
    const client = await clerkClient();
    const org = await client.organizations.getOrganization({ organizationId: orgId! });
    orgName = org.name || "Organization";
  } catch {
    // fallback to generic name if Clerk API fails
  }

  const orgRole = clerkOrgRole ?? "org:agent";
  const role = resolveRole(orgRole);

  if (orgRole !== "org:agent") {
    const token = await getToken({ template: "convex" });
    if (token) {
      const state = await fetchQuery(api.onboarding.getState, {}, { token });
      if (!state || !state.completedSteps.includes("onboarding_complete")) {
        redirect("/onboarding");
      }
    }
  }

  const resolvedUser: ResolvedUser = {
    name: user.fullName ?? user.emailAddresses[0]?.emailAddress ?? "User",
    email: user.emailAddresses[0]?.emailAddress ?? "",
    imageUrl: user.imageUrl,
    role: orgRole as ResolvedUser["role"],
    orgName,
  };

  const navItems = filterNavItems(role);

  const headersList = await headers();
  const cookieStore = await cookies();
  const locale = detectLocale(headersList, cookieStore.get("locale")?.value);

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar user={resolvedUser} navItems={navItems} locale={locale} />
      <SidebarInset className="overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 px-4 border-b">
          <SidebarTrigger className="-ms-1" />
          <Separator orientation="vertical" className="h-4" />
          <div className="ms-auto flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell locale={locale} />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto min-h-0 pb-16 md:pb-0">
          <ConvexAuthGuard>
            {children}
          </ConvexAuthGuard>
        </div>
      </SidebarInset>
      <BottomNav items={navItems} locale={locale} />
    </SidebarProvider>
  );
}
