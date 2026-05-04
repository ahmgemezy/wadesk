"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useOrganization } from "@clerk/nextjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/context";
import { UserIcon } from "lucide-react";

export function AssignAgentDialog({
  conversationId,
  currentAssigneeId,
}: {
  conversationId: string;
  currentAssigneeId?: string;
}) {
  const t = useT();
  const assign = useMutation(api.conversations.assign);
  const { isLoaded, membership, memberships } = useOrganization({ memberships: true });

  const orgRole = (membership as any)?.role as string | undefined;
  const canAssign = orgRole === "org:admin" || orgRole === "admin" || orgRole === "org:supervisor";

  if (!isLoaded || !canAssign) return null;

  const memberList = memberships?.data ?? [];
  const assignedUser = memberList.find((m) => m.publicUserData?.userId === currentAssigneeId)?.publicUserData;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
        <UserIcon className="h-4 w-4" />
        {assignedUser ? assignedUser.firstName : t("Assign", "تعيين")}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {memberList.map((m) => {
          const userId = m.publicUserData?.userId;
          const name =
            m.publicUserData?.firstName ??
            m.publicUserData?.identifier ??
            userId ??
            "Agent";

          return (
            <DropdownMenuItem
              key={userId}
              onClick={() =>
                assign({
                  conversationId: conversationId as Id<"conversations">,
                  agentId: userId ?? undefined,
                  agentName: name,
                })
              }
            >
              {name}
              {currentAssigneeId === userId && " ✓"}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            assign({
              conversationId: conversationId as Id<"conversations">,
              agentId: undefined,
            })
          }
        >
          {t("Unassign", "إلغاء التعيين")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
