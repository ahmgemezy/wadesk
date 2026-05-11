"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DT } from "@/lib/design-tokens";
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
  const { userId: currentUserId } = useAuth();
  const { user: liveUser } = useUser();
  const role = resolveRole(user.role);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Use live Better Auth data for reactive name/avatar after profile edits
  const effectiveName = liveUser?.fullName ?? liveUser?.firstName ?? user.name;
  const effectiveAvatar = liveUser?.imageUrl ?? user.imageUrl;

  const handleSignOut = async () => {
    setSigningOut(true);
    await authClient.signOut();
    window.location.href = "/";
  };

  return (
    <>
      <MyProfileModal
        open={profileOpen}
        onOpenChange={setProfileOpen}
        currentUser={user}
      />

      <div className="flex flex-col gap-1 p-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:items-center">
        {/* Avatar + info row — clickable to open profile modal */}
        <button
          onClick={() => setProfileOpen(true)}
          className={`flex items-center gap-2 px-2 py-1.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors w-full text-start rounded-xl group-data-[collapsible=icon]:hidden`}
        >
          {effectiveAvatar ? (
            <img
              src={effectiveAvatar}
              alt={effectiveName}
              className="size-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className={`size-8 shrink-0 rounded-full bg-black/4 dark:bg-white/8 flex items-center justify-center text-xs font-semibold ${DT.TEXT_GRAY}`}>
              {effectiveName?.slice(0, 2).toUpperCase() ?? "?"}
            </div>
          )}
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className={`${DT.BODY} font-medium truncate`}>{effectiveName}</span>
              {currentUserId && <PresenceIndicator userId={currentUserId} />}
              <RoleBadge role={role} locale={locale} />
            </div>
            <span className={`${DT.MICRO} truncate`}>
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
              className="size-7 rounded-full object-cover ring-1 ring-black/12 dark:ring-white/12"
            />
          ) : (
            <div className={`size-7 rounded-full bg-black/4 dark:bg-white/8 flex items-center justify-center text-xs font-semibold ${DT.TEXT_GRAY} ring-1 ring-black/12 dark:ring-white/12`}>
              {effectiveName?.slice(0, 2).toUpperCase() ?? "?"}
            </div>
          )}
        </button>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-xl transition-colors w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:w-full disabled:opacity-60 ${DT.MUTED} hover:${DT.BODY}`}
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
