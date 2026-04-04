"use client";

import { SignOutButton, OrganizationSwitcher } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { RoleBadge } from "./role-badge";
import type { ResolvedUser } from "@/lib/shell/types";
import { resolveRole } from "@/lib/shell/role-utils";

interface UserMenuProps {
  user: ResolvedUser;
  locale: "ar" | "en";
}

export function UserMenu({ user, locale }: UserMenuProps) {
  const role = resolveRole(user.role);

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex items-center gap-2">
        {user.imageUrl && (
          <img
            src={user.imageUrl}
            alt={user.name}
            className="size-8 rounded-full"
          />
        )}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-medium truncate">{user.name}</span>
          <span className="text-xs text-muted-foreground truncate">
            {user.email}
          </span>
        </div>
        <RoleBadge role={role} locale={locale} />
      </div>

      <div className="text-xs text-muted-foreground truncate">
        {user.orgName}
      </div>

      <OrganizationSwitcher
        afterSelectOrganizationUrl="/inbox"
        appearance={{ elements: { rootBox: "w-full" } }}
      />

      <SignOutButton redirectUrl="/">
        <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full">
          <LogOut className="size-4 rtl:scale-x-[-1]" />
          {locale === "ar" ? "تسجيل الخروج" : "Sign Out"}
        </button>
      </SignOutButton>
    </div>
  );
}
