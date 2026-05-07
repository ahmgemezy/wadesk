"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useAuth, useUser } from "@/lib/auth-hooks";
import { RoleBadge } from "./role-badge";
import { PresenceIndicator } from "@/components/ui/presence-indicator";
import { MyProfileModal } from "./my-profile-modal";
import type { ResolvedUser } from "@/lib/shell/types";
import { resolveRole } from "@/lib/shell/role-utils";

interface UserMenuProps {
  user: ResolvedUser;
  locale: "ar" | "en";
}

export function UserMenu({ user, locale }: UserMenuProps) {
  const router = useRouter();
  const { isSignedIn, userId: currentUserId } = useAuth();
  const { user: liveUser } = useUser();
  const role = resolveRole(user.role);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Use live Better Auth data for reactive name/avatar after profile edits
  const effectiveName = liveUser?.fullName ?? liveUser?.firstName ?? user.name;
  const effectiveAvatar = liveUser?.imageUrl ?? user.imageUrl;

  if (!isSignedIn) return null;

  const handleSignOut = async () => {
    setSigningOut(true);
    await authClient.signOut();
    router.push("/");
  };

  return (
    <>
      <MyProfileModal
        open={profileOpen}
        onOpenChange={setProfileOpen}
        clerkUser={user}
      />

      <div className="flex flex-col gap-1 p-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:items-center">
        {/* Avatar + info row — clickable to open profile modal */}
        <button
          onClick={() => setProfileOpen(true)}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-sidebar-accent transition-colors w-full text-start group-data-[collapsible=icon]:hidden"
        >
          {effectiveAvatar ? (
            <img
              src={effectiveAvatar}
              alt={effectiveName}
              className="size-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="size-8 shrink-0 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
              {effectiveName?.slice(0, 2).toUpperCase() ?? "?"}
            </div>
          )}
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium truncate">{effectiveName}</span>
              {currentUserId && <PresenceIndicator userId={currentUserId} />}
              <RoleBadge role={role} locale={locale} />
            </div>
            <span className="text-xs text-muted-foreground truncate">
              {user.orgName}
            </span>
          </div>
        </button>

        {/* Avatar only when sidebar is collapsed — also opens modal */}
        <button
          onClick={() => setProfileOpen(true)}
          className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:py-1"
        >
          {effectiveAvatar ? (
            <img
              src={effectiveAvatar}
              alt={effectiveName}
              className="size-7 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <div className="size-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground ring-1 ring-border">
              {effectiveName?.slice(0, 2).toUpperCase() ?? "?"}
            </div>
          )}
        </button>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:w-full disabled:opacity-60"
        >
          <LogOut className="size-4 shrink-0 rtl:scale-x-[-1]" />
          <span className="group-data-[collapsible=icon]:hidden">
            {locale === "ar" ? "تسجيل الخروج" : "Sign Out"}
          </span>
        </button>
      </div>
    </>
  );
}
