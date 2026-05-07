"use client";

import { useState, useEffect, useCallback } from "react";
import { useAction } from "convex/react";
import { useOrganization, useUser } from "@/lib/auth-hooks";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { InviteModal } from "./invite-modal";
import { MemberProfileModal } from "@/components/team/member-profile-modal";
import { useT } from "@/lib/i18n/context";
import { MoreHorizontal, Plus, UserPlus, Shield, HeadphonesIcon, Crown } from "lucide-react";

export type OrgRole = "org:admin" | "org:supervisor" | "org:agent";

interface Member {
  userId: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
  role: OrgRole;
  status: "active" | "pending";
  joinedAt: number | null;
  jobTitle: string | null;
  departments: string[];
}

function roleLabel(role: OrgRole, t: (en: string, ar: string) => string): string {
  switch (role) {
    case "org:admin":
      return t("Admin", "مدير");
    case "org:supervisor":
      return t("Supervisor", "مشرف");
    case "org:agent":
      return t("Agent", "وكيل");
  }
}

function roleBadgeVariant(role: OrgRole): "default" | "secondary" | "outline" {
  switch (role) {
    case "org:admin":
      return "default";
    case "org:supervisor":
      return "secondary";
    case "org:agent":
      return "outline";
  }
}

function roleIcon(role: OrgRole) {
  switch (role) {
    case "org:admin":
      return <Crown className="size-3" />;
    case "org:supervisor":
      return <Shield className="size-3" />;
    case "org:agent":
      return <HeadphonesIcon className="size-3" />;
  }
}

export function TeamMemberList() {
  const { organization, membership } = useOrganization();
  const { user } = useUser();
  const orgRole = ((membership as unknown) as Record<string, unknown>)?.role as string | undefined;
  const isSupervisor = orgRole === "org:supervisor";
  const isAdmin = orgRole === "org:admin" || orgRole === "admin";
  const currentUserId = user?.id;
  const t = useT();
  const listMembers = useAction(api.orgMembers.list);
  const changeRole = useAction(api.orgMembers.changeRole);
  const removeMember = useAction(api.orgMembers.removeMember);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [profileMemberId, setProfileMemberId] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const result = await listMembers({});
      setMembers(result as Member[]);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [listMembers]);

  useEffect(() => {
    if (!organization) return;
    void fetchMembers();
  }, [fetchMembers, organization]);

  const handleChangeRole = async (userId: string, newRole: OrgRole) => {
    await changeRole({ targetUserId: userId, newRole });
    await fetchMembers();
  };

  const handleRemove = async (userId: string, status: "active" | "pending") => {
    await removeMember({ targetUserId: userId, status });
    await fetchMembers();
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {t("Team Members", "أعضاء الفريق")}
        </h2>
        <Button onClick={() => setInviteOpen(true)} size="sm">
          <UserPlus className="size-4 ms-1" />
          {t("Invite", "دعوة")}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {members.map((member) => (
          <div
            key={member.userId}
            className="group relative rounded-2xl border bg-card p-5 flex flex-col items-center gap-3 text-center cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            onClick={() => setProfileMemberId(member.userId)}
          >
            {/* Actions menu */}
            {((isAdmin && member.userId !== currentUserId) ||
              (isSupervisor && member.role === "org:agent" && member.userId !== currentUserId)) && (
              <div className="absolute top-3 end-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" size="icon-sm" />}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isAdmin && (
                      <>
                        {member.role !== "org:admin" && (
                          <DropdownMenuItem
                            onClick={() => handleChangeRole(member.userId, "org:admin")}
                          >
                            <Crown className="size-4" />
                            {t("Make Admin", "ترقية لمدير")}
                          </DropdownMenuItem>
                        )}
                        {member.role !== "org:supervisor" && (
                          <DropdownMenuItem
                            onClick={() => handleChangeRole(member.userId, "org:supervisor")}
                          >
                            <Shield className="size-4" />
                            {t("Make Supervisor", "ترقية لمشرف")}
                          </DropdownMenuItem>
                        )}
                        {member.role !== "org:agent" && (
                          <DropdownMenuItem
                            onClick={() => handleChangeRole(member.userId, "org:agent")}
                          >
                            <HeadphonesIcon className="size-4" />
                            {t("Make Agent", "تخفيض لوكيل")}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => handleRemove(member.userId, member.status)}
                    >
                      {t("Remove", "إزالة")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Avatar */}
            <div className="relative mt-1">
              {member.imageUrl ? (
                <img
                  src={member.imageUrl}
                  alt=""
                  className="size-16 rounded-full object-cover ring-2 ring-background shadow-sm"
                />
              ) : (
                <div className="size-16 rounded-full bg-muted flex items-center justify-center text-xl font-semibold text-muted-foreground ring-2 ring-background shadow-sm">
                  {(member.name ?? member.email).charAt(0).toUpperCase()}
                </div>
              )}
              {member.status === "pending" && (
                <span className="absolute -bottom-1 -end-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-medium px-1.5 py-0.5 leading-none">
                  {t("Pending", "معلق")}
                </span>
              )}
            </div>

            {/* Name + email */}
            <div className="min-w-0 w-full">
              <p className="font-semibold text-sm truncate">
                {member.name ?? member.email}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5" dir="ltr">
                {member.email}
              </p>
            </div>

            {/* Role badge */}
            <Badge variant={roleBadgeVariant(member.role)} className="gap-1">
              {roleIcon(member.role)}
              {roleLabel(member.role, t)}
            </Badge>

            {/* Job title & departments */}
            {(member.jobTitle || member.departments.length > 0) && (
              <p className="text-xs text-muted-foreground leading-relaxed w-full truncate border-t pt-3 mt-0.5">
                {[member.jobTitle, member.departments.join(", ")].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        ))}

        {members.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            {t("No members found", "لا يوجد أعضاء")}
          </div>
        )}
      </div>

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={fetchMembers}
      />

      <MemberProfileModal
        memberId={profileMemberId ?? ""}
        open={!!profileMemberId}
        onClose={() => setProfileMemberId(null)}
        onUpdated={fetchMembers}
      />
    </div>
  );
}
