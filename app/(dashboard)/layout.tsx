import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@/convex/_generated/api";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { BottomNav } from "@/components/shell/bottom-nav";
import { resolveRole } from "@/lib/shell/role-utils";
import { filterNavItems } from "@/lib/shell/nav-config";
import type { ResolvedUser } from "@/lib/shell/types";
import { Separator } from "@/components/ui/separator";
import { ClientNotificationBell } from "@/components/shell/client-notification-bell";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ConvexAuthGuard } from "@/components/shell/convex-auth-guard";
import { WelcomeConfetti } from "@/components/shell/welcome-confetti";
import { PaddleProvider } from "@/components/paddle-provider";
import { PastDueBanner } from "@/components/shell/past-due-banner";
import { LocaleSwitcher } from "@/components/shell/locale-switcher";
import { TeamPresenceDropdown } from "@/components/ui/team-presence-dropdown";
import { PresenceInitializer } from "@/components/shell/presence-initializer";
import { PendingAssignmentBootstrap } from "@/components/shell/pending-assignment-bootstrap";
import { SelectedChannelProvider } from "@/lib/hooks/channel-context";

export const dynamic = "force-dynamic";

function detectLocale(cookieLocale: string | undefined): "ar" | "en" {
  if (cookieLocale === "ar" || cookieLocale === "en") return cookieLocale;
  return "ar"; // Arabic-first product — default to RTL when no cookie
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await fetchAuthQuery(
    api.orgMembersQueries.getCurrentUserProfile,
  ).catch(() => null);

  if (!profile) redirect("/sign-in");
  if (!profile.orgId) redirect("/select-org");

  const orgRole = profile.orgRole ?? "org:agent";
  const role = resolveRole(orgRole);

  if (orgRole !== "org:agent") {
    try {
      const state = await fetchAuthQuery(api.onboarding.getState);
      if (!state || !state.completedSteps.includes("workspace_named")) {
        redirect("/onboarding");
      }
    } catch (err: unknown) {
      const data = (err as { data?: string })?.data;
      if (data === "NO_ORG") redirect("/select-org");
      if (data !== "NO_ORG") throw err;
    }
  }

  const resolvedUser: ResolvedUser = {
    name: profile.name ?? profile.email ?? "User",
    email: profile.email ?? "",
    imageUrl: profile.image ?? "",
    role: orgRole as ResolvedUser["role"],
    orgName: profile.orgName ?? "Organization",
  };

  const navItems = filterNavItems(role);

  const cookieStore = await cookies();
  const locale = detectLocale(cookieStore.get("locale")?.value);
  const sidebarCookie = cookieStore.get("sidebar_state")?.value;
  // Default to collapsed when no cookie exists (incognito / first visit)
  const sidebarOpen = sidebarCookie === "true";

  return (
    <SelectedChannelProvider>
    <SidebarProvider defaultOpen={sidebarOpen} className="h-svh overflow-hidden">
      <AppSidebar user={resolvedUser} navItems={navItems} locale={locale} />
      <SidebarInset className="overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 px-4 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <SidebarTrigger className="-ms-1 text-muted-foreground hover:text-foreground" />
          <Separator orientation="vertical" className="h-4 opacity-50" />
          <div className="ms-auto flex items-center gap-1">
            <TeamPresenceDropdown />
            <ThemeToggle />
            <ClientNotificationBell locale={locale} />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto min-h-0 pb-16 md:pb-0">
          <Suspense><WelcomeConfetti /></Suspense>
          <ConvexAuthGuard>
            <PastDueBanner />
            <PresenceInitializer />
            <PendingAssignmentBootstrap />
            {children}
            <PaddleProvider />
          </ConvexAuthGuard>
        </div>
      </SidebarInset>
      <BottomNav items={navItems} locale={locale} />
    </SidebarProvider>
    </SelectedChannelProvider>
  );
}
