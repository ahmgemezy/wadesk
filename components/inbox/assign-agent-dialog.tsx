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

export function AssignAgentDialog({
  conversationId,
  currentAssigneeId,
}: {
  conversationId: string;
  currentAssigneeId?: string;
}) {
  const assign = useMutation(api.conversations.assign);
  const { isLoaded, membership, memberships } = useOrganization({ memberships: true });

  const orgRole = (membership as any)?.role as string | undefined;
  const canAssign = orgRole === "org:admin" || orgRole === "admin" || orgRole === "org:supervisor";

  if (!isLoaded || !canAssign) return null;

  const memberList = memberships?.data ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="outline" size="sm">
          تعيين / Assign
        </Button>
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
          إلغاء التعيين / Unassign
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
