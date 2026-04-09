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
import { useT } from "@/lib/i18n/context";

export function StatusSelector({
  conversationId,
}: {
  conversationId: string;
}) {
  const t = useT();
  const setStatus = useMutation(api.conversations.setStatus);

  const statuses = [
    { value: "open" as const, label: t("Open", "مفتوح") },
    { value: "pending" as const, label: t("Pending", "معلق") },
    { value: "resolved" as const, label: t("Resolved", "مغلق") },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        {t("Change Status", "تغيير الحالة")}
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
