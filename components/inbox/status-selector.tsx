"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function StatusSelector({
  conversationId,
}: {
  conversationId: string;
}) {
  const setStatus = useMutation(api.conversations.setStatus);

  const statuses = [
    { value: "open" as const, label: "مفتوح / Open" },
    { value: "pending" as const, label: "معلق / Pending" },
    { value: "resolved" as const, label: "مغلق / Resolved" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="outline" size="sm">
          تغيير الحالة / Change Status
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {statuses.map((s) => (
          <DropdownMenuItem
            key={s.value}
            onClick={() =>
              setStatus({
                conversationId: conversationId as Id<"conversations">,
                status: s.value,
              })
            }
          >
            {s.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
