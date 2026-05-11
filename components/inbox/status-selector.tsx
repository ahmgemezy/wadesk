"use client";

import { useMutation } from "convex/react";
import { useUser } from "@/lib/auth-hooks";
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
import { ChevronDownIcon } from "lucide-react";
import { DT } from "@/lib/design-tokens";

export function StatusSelector({
  conversationId,
}: {
  conversationId: string;
}) {
  const t = useT();
  const setStatus = useMutation(api.conversations.setStatus);
  const { user } = useUser();
  const fullName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    null;
  const actorName =
    fullName ?? user?.emailAddresses[0]?.emailAddress ?? undefined;

  const statuses = [
    { value: "open" as const, label: t("Open", "مفتوح"), badge: DT.BADGE_GREEN },
    { value: "pending" as const, label: t("Pending", "معلق"), badge: DT.BADGE_AMBER },
    { value: "resolved" as const, label: t("Resolved", "مغلق"), badge: DT.BADGE_NEUTRAL },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className={`h-7 text-xs px-2.5 gap-1.5 rounded-full transition-all ${DT.BTN_SM}`} />
        }
      >
        {t("Status", "الحالة")}
        <ChevronDownIcon className="size-3 text-muted-foreground rtl:-scale-x-100" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className={DT.CARD}>
        {statuses.map((s) => (
          <DropdownMenuItem
            key={s.value}
            className={`text-xs cursor-pointer ${DT.LIST_ITEM_SM}`}
            onClick={() =>
              setStatus({
                conversationId: conversationId as Id<"conversations">,
                status: s.value,
                actorName,
              })
            }
          >
            <span className={`size-2 rounded-full me-2 ${s.badge.split(" ")[0]}`} />
            {s.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
