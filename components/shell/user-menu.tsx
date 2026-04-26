"use client";

import { SignOutButton, OrganizationSwitcher, useAuth } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { RoleBadge } from "./role-badge";
import { PresenceIndicator } from "@/components/ui/presence-indicator";
import type { ResolvedUser } from "@/lib/shell/types";
import { resolveRole } from "@/lib/shell/role-utils";

interface UserMenuProps {
  user: ResolvedUser;
  locale: "ar" | "en";
}

export function UserMenu({ user, locale }: UserMenuProps) {
  const { isSignedIn, userId: currentUserId } = useAuth();
  const role = resolveRole(user.role);

  if (!isSignedIn) return null;

  return (
    <div className="flex flex-col gap-1 p-2 group-data-[collapsible=icon]:items-center">
      {/* Avatar + info row — hidden when collapsed to icon */}
      <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
        {user.imageUrl && (
          <img
            src={user.imageUrl}
            alt={user.name}
            className="size-8 shrink-0 rounded-full"
          />
        )}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">{user.name}</span>
            {currentUserId && <PresenceIndicator userId={currentUserId} />}
            <RoleBadge role={role} locale={locale} />
          </div>
          <span className="text-xs text-muted-foreground truncate">
            {user.orgName}
          </span>
        </div>
      </div>

      {/* Avatar only when collapsed */}
      {user.imageUrl && (
        <img
          src={user.imageUrl}
          alt={user.name}
          className="hidden size-8 shrink-0 rounded-full group-data-[collapsible=icon]:block"
        />
      )}

      <div className="group-data-[collapsible=icon]:hidden">
        <OrganizationSwitcher
          afterSelectOrganizationUrl="/inbox"
          appearance={{
            elements: {
              rootBox: "w-full",
              organizationSwitcherTrigger:
                "w-full justify-start rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
            },
          }}
        />
      </div>

      <SignOutButton redirectUrl="/">
        <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full group-data-[collapsible=icon]:justify-center">
          <LogOut className="size-4 shrink-0 rtl:scale-x-[-1]" />
          <span className="group-data-[collapsible=icon]:hidden">
            {locale === "ar" ? "تسجيل الخروج" : "Sign Out"}
          </span>
        </button>
      </SignOutButton>
    </div>
  );
}
