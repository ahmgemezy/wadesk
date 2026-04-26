"use client";

import { useState, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { useOrganization } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/lib/i18n/context";
import { Circle } from "lucide-react";

type StatusType = "online" | "away" | "offline";

interface ChannelAssignment {
  channelId: string;
  channelName: string;
  departmentNames: string[];
}

interface TeamMember {
  userId: string;
  name: string | null;
  email: string;
  imageUrl: string | null;
  role: string;
  channelAssignments: ChannelAssignment[];
}

export function TeamPresenceDropdown() {
  const t = useT();
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const listMembers = useAction(api.teamPresence.listWithDepartments);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<StatusType | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (orgId && menuOpen) {
      setLoading(true);
      listMembers({})
        .then(setMembers)
        .catch(() => setMembers([]))
        .finally(() => setLoading(false));
    }
  }, [orgId, listMembers, menuOpen]);

  const onlineUsers = useQuery(api.presence.listOnline, { tenantId: orgId ?? undefined }) ?? [];

  const getStatus = (userId: string): StatusType => {
    const user = onlineUsers.find((u) => u.userId === userId);
    if (user) return user.status as StatusType;
    return "offline";
  };

  const statusCounts = {
    online: members.filter((m) => getStatus(m.userId) === "online").length,
    away: members.filter((m) => getStatus(m.userId) === "away").length,
    offline: members.filter((m) => getStatus(m.userId) === "offline").length,
  };

  const filteredMembers = selectedStatus
    ? members.filter((m) => getStatus(m.userId) === selectedStatus)
    : members;

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger>
        <div className="flex items-center gap-2 cursor-pointer hover:bg-accent rounded-md px-2 py-1">
          <Circle className="size-3 fill-green-500 text-green-500" />
          <Circle className="size-3 fill-amber-500 text-amber-500" />
          <Circle className="size-3 fill-gray-400 text-gray-400" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex items-center gap-2">
              <span>{t("Team Presence", "حالة الفريق")}</span>
              <div className="ms-auto flex gap-2 text-xs">
                <span className="flex items-center gap-1">
                  <Circle className="size-2 fill-green-500 text-green-500" />
                  {statusCounts.online}
                </span>
                <span className="flex items-center gap-1">
                  <Circle className="size-2 fill-amber-500 text-amber-500" />
                  {statusCounts.away}
                </span>
                <span className="flex items-center gap-1">
                  <Circle className="size-2 fill-gray-400 text-gray-400" />
                  {statusCounts.offline}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        
        <button
          type="button"
          onClick={() => setSelectedStatus(null)}
          className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm outline-hidden select-none focus:bg-accent ${selectedStatus === null ? "bg-accent" : ""}`}
        >
          <div className="flex items-center gap-2">
            <Circle className="size-3 fill-gray-500 text-gray-500" />
            <span className="flex-1 text-start">{t("All Members", "كل الأعضاء")}</span>
          </div>
          <span className="text-muted-foreground">{members.length}</span>
        </button>
        
        <button
          type="button"
          onClick={() => setSelectedStatus("online")}
          className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm outline-hidden select-none focus:bg-accent ${selectedStatus === "online" ? "bg-accent" : ""}`}
        >
          <div className="flex items-center gap-2">
            <Circle className="size-4 fill-green-500 text-green-500" />
            <span className="flex-1 text-start">{t("Online", "متصل")}</span>
          </div>
          <span className="text-muted-foreground">{statusCounts.online}</span>
        </button>
        
        <button
          type="button"
          onClick={() => setSelectedStatus("away")}
          className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm outline-hidden select-none focus:bg-accent ${selectedStatus === "away" ? "bg-accent" : ""}`}
        >
          <div className="flex items-center gap-2">
            <Circle className="size-4 fill-amber-500 text-amber-500" />
            <span className="flex-1 text-start">{t("Away", "بعيد")}</span>
          </div>
          <span className="text-muted-foreground">{statusCounts.away}</span>
        </button>
        
        <button
          type="button"
          onClick={() => setSelectedStatus("offline")}
          className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm outline-hidden select-none focus:bg-accent ${selectedStatus === "offline" ? "bg-accent" : ""}`}
        >
          <div className="flex items-center gap-2">
            <Circle className="size-4 fill-gray-400 text-gray-400" />
            <span className="flex-1 text-start">{t("Offline", "غير متصل")}</span>
          </div>
          <span className="text-muted-foreground">{statusCounts.offline}</span>
        </button>
        
        <DropdownMenuSeparator />
        
        <div className="max-h-64 overflow-y-auto">
          {filteredMembers.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">
              {t("No members", "لا يوجد أعضاء")}
            </div>
          ) : (
            filteredMembers.map((member) => {
              const status = getStatus(member.userId);
              return (
                <div key={member.userId} className="flex items-center gap-2 rounded-md px-2 py-1.5">
                  <div className="relative shrink-0">
                    {member.imageUrl ? (
                      <img
                        src={member.imageUrl}
                        alt=""
                        className="size-8 rounded-full"
                      />
                    ) : (
                      <div className="size-8 rounded-full bg-muted flex items-center justify-center text-sm">
                        {(member.name ?? member.email).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <Circle
                      className={`absolute -bottom-0.5 -end-0.5 size-2.5 rounded-full border-2 border-background ${
                        status === "online"
                          ? "fill-green-500 text-green-500"
                          : status === "away"
                          ? "fill-amber-500 text-amber-500"
                          : "fill-gray-400 text-gray-400"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {member.name ?? member.userId}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>
                        {member.role === "org:admin" ? t("Admin", "مدير") :
                         member.role === "org:supervisor" ? t("Supervisor", "مشرف") :
                         t("Agent", "وكيل")}
                      </div>
                      {member.channelAssignments.length > 0 && (
                        <div className="space-y-0.5">
                          {member.channelAssignments.map((assignment) => (
                            <div key={assignment.channelId} className="text-xs">
                              <span className="font-medium text-foreground">
                                {assignment.channelName}
                              </span>
                              {assignment.departmentNames.length > 0 && (
                                <span className="text-muted-foreground">
                                  : {assignment.departmentNames.join(", ")}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}