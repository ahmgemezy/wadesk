"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useOrganization, useUser } from "@/lib/auth-hooks";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DT } from "@/lib/design-tokens";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Shield, HeadphonesIcon, UserPlus, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";

interface OrgMember {
  userId: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
  role: "org:admin" | "org:supervisor" | "org:agent";
  status: "active" | "pending";
}

type DeptRole = "org:supervisor" | "org:agent";

interface Props {
  departmentId: Id<"departments">;
}

export function DepartmentMembers({ departmentId }: Props) {
  const t = useT();
  const { membership } = useOrganization();
  const { user } = useUser();
  const orgRole = ((membership as unknown) as Record<string, unknown>)?.role as string | undefined;
  const isAdmin = orgRole === "org:admin" || orgRole === "admin";
  const currentUserId = user?.id;

  const members = useQuery(api.departmentMembers.listForDepartment, { departmentId });
  const addMember = useMutation(api.departmentMembers.addMember);
  const removeMember = useMutation(api.departmentMembers.removeMember);
  const listOrgMembers = useAction(api.orgMembers.list);

  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const canManage = isAdmin;

  const fetchOrgMembers = useCallback(async () => {
    try {
      const result = await listOrgMembers({});
      setOrgMembers(result as OrgMember[]);
    } catch {
      setOrgMembers([]);
      toast.error(t("Failed to load team members", "فشل تحميل أعضاء الفريق"));
    }
  }, [listOrgMembers]);

  useEffect(() => {
    if (canManage && addOpen) {
      void fetchOrgMembers();
    }
  }, [canManage, addOpen, fetchOrgMembers]);

  if (members === undefined) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const memberUserIds = new Set(members.map((m) => m.userId));

  const eligibleToAdd = orgMembers.filter((m) => {
    if (memberUserIds.has(m.userId)) return false;
    if (m.role === "org:admin") return false;
    if (m.status !== "active") return false;
    if (!isAdmin && m.role !== "org:agent") return false;
    return true;
  });

  const supervisors = members.filter((m) => m.role === "org:supervisor");
  const agents = members.filter((m) => m.role === "org:agent");

  const handleAdd = async (orgMember: OrgMember) => {
    const deptRole = orgMember.role as DeptRole;
    try {
      await addMember({
        departmentId,
        userId: orgMember.userId,
        userName: orgMember.name ?? orgMember.email,
        userEmail: orgMember.email,
        userImageUrl: orgMember.imageUrl ?? undefined,
        role: deptRole,
      });
      toast.success(t("Member added", "تم إضافة العضو"));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("FORBIDDEN")) {
        toast.error(t("You don't have permission to add this member", "ليس لديك صلاحية لإضافة هذا العضو"));
      } else {
        toast.error(t("Failed to add member", "فشل إضافة العضو"));
      }
    }
  };

  const handleRemove = async (userId: string) => {
    setRemoving(userId);
    try {
      await removeMember({ departmentId, userId });
      toast.success(t("Member removed", "تم إزالة العضو"));
    } catch {
      toast.error(t("Failed to remove member", "فشل إزالة العضو"));
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={DT.H3}>
          {t("Department Members", "أعضاء الإدارة")}
        </h3>
        {canManage && (
          <Popover open={addOpen} onOpenChange={setAddOpen}>
            <PopoverTrigger className={DT.BTN_OUTLINE}>
              <UserPlus className="size-4 me-1.5" />
              {t("Add Member", "إضافة عضو")}
              <ChevronDown className="size-3 ms-1 opacity-50" />
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <Command>
                <CommandInput placeholder={t("Search members…", "بحث عن أعضاء…")} />
                <CommandList>
                  <CommandEmpty>
                    {t("No eligible members found", "لا يوجد أعضاء متاحون")}
                  </CommandEmpty>
                  {eligibleToAdd.length > 0 && (
                    <CommandGroup>
                      {eligibleToAdd.map((m) => {
                        const deptRole = m.role as DeptRole;
                        return (
                          <CommandItem
                            key={m.userId}
                            className="flex items-center gap-2 cursor-pointer"
                            onSelect={() => {
                              handleAdd(m);
                              setAddOpen(false);
                            }}
                          >
                            {m.imageUrl ? (
                              <img src={m.imageUrl} alt="" className="size-7 rounded-full shrink-0" />
                            ) : (
                              <div className="size-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                                {(m.name ?? m.email).charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{m.name ?? m.email}</div>
                              <div className="text-xs text-muted-foreground truncate" dir="ltr">{m.email}</div>
                            </div>
                            <Badge variant={deptRole === "org:supervisor" ? "secondary" : "outline"} className="shrink-0 gap-1 text-[10px] px-1.5">
                              {deptRole === "org:supervisor" ? (
                                <Shield className="size-3" />
                              ) : (
                                <HeadphonesIcon className="size-3" />
                              )}
                              {deptRole === "org:supervisor" ? t("Supervisor", "مشرف") : t("Agent", "وكيل")}
                            </Badge>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          {t("No members assigned to this department yet.", "لا يوجد أعضاء مضافون لهذه الإدارة بعد.")}
        </p>
      ) : (
        <div className="space-y-3">
          {supervisors.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Shield className="size-3" />
                {t("Supervisors", "المشرفون")}
              </p>
              {supervisors.map((m) => (
                <MemberRow
                  key={m.userId}
                  member={m}
                  canRemove={canManage && isAdmin}
                  isRemoving={removing === m.userId}
                  isSelf={m.userId === currentUserId}
                  onRemove={() => handleRemove(m.userId)}
                  t={t}
                />
              ))}
            </div>
          )}

          {agents.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <HeadphonesIcon className="size-3" />
                {t("Agents", "الوكلاء")}
              </p>
              {agents.map((m) => (
                <MemberRow
                  key={m.userId}
                  member={m}
                  canRemove={canManage}
                  isRemoving={removing === m.userId}
                  isSelf={m.userId === currentUserId}
                  onRemove={() => handleRemove(m.userId)}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface MemberRowProps {
  member: {
    userId: string;
    userName?: string;
    userEmail?: string;
    userImageUrl?: string;
    role: "org:supervisor" | "org:agent";
  };
  canRemove: boolean;
  isRemoving: boolean;
  isSelf: boolean;
  onRemove: () => void;
  t: (en: string, ar: string) => string;
}

function MemberRow({ member, canRemove, isRemoving, isSelf, onRemove, t }: MemberRowProps) {
  const displayName = member.userName ?? member.userEmail ?? member.userId;
  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
      {member.userImageUrl ? (
        <img src={member.userImageUrl} alt="" className="size-8 rounded-full shrink-0" />
      ) : (
        <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
          {displayName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {displayName}
          {isSelf && (
            <span className="ms-1.5 text-xs text-muted-foreground">
              ({t("you", "أنت")})
            </span>
          )}
        </div>
        {member.userEmail && (
          <div className="text-xs text-muted-foreground truncate" dir="ltr">
            {member.userEmail}
          </div>
        )}
      </div>
      <Badge variant={member.role === "org:supervisor" ? "secondary" : "outline"} className="shrink-0 gap-1">
        {member.role === "org:supervisor" ? (
          <Shield className="size-3" />
        ) : (
          <HeadphonesIcon className="size-3" />
        )}
        {member.role === "org:supervisor" ? t("Supervisor", "مشرف") : t("Agent", "وكيل")}
      </Badge>
      {canRemove && !isSelf && (
        <button
          className={`${DT.BTN_ICON} text-muted-foreground hover:text-destructive shrink-0`}
          disabled={isRemoving}
          onClick={onRemove}
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
