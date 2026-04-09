"use client";

import { useState, useEffect, useCallback } from "react";
import { useAction } from "convex/react";
import { useOrganization, useUser } from "@clerk/nextjs";
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

      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.userId}
            className="border rounded-lg p-3 flex items-center gap-3"
          >
            {member.imageUrl ? (
              <img
                src={member.imageUrl}
                alt=""
                className="size-9 rounded-full"
              />
            ) : (
              <div className="size-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                {(member.name ?? member.email).charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">
                {member.name ?? member.email}
              </div>
              <div className="text-xs text-muted-foreground truncate" dir="ltr">
                {member.email}
              </div>
            </div>

            <Badge variant={roleBadgeVariant(member.role)} className="gap-1">
              {roleIcon(member.role)}
              {roleLabel(member.role, t)}
            </Badge>

            {member.status === "pending" && (
              <Badge variant="outline">{t("Pending", "معلق")}</Badge>
            )}

            {isAdmin && member.userId !== currentUserId && (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => handleRemove(member.userId, member.status)}
                  >
                    {t("Remove", "إزالة")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {isSupervisor && member.role === "org:agent" && member.userId !== currentUserId && (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => handleRemove(member.userId, member.status)}
                  >
                    {t("Remove", "إزالة")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}

        {members.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {t("No members found", "لا يوجد أعضاء")}
          </div>
        )}
      </div>

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={fetchMembers}
      />
    </div>
  );
}
