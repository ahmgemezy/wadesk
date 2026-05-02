"use client";

import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
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
    fullName ?? user?.primaryEmailAddress?.emailAddress ?? undefined;

  const statuses = [
    { value: "open" as const, label: t("Open", "مفتوح"), color: "bg-slate-500" },
    { value: "pending" as const, label: t("Pending", "معلق"), color: "bg-amber-500" },
    { value: "resolved" as const, label: t("Resolved", "مغلق"), color: "bg-emerald-500" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="h-7 text-xs px-2.5 gap-1.5 rounded-full transition-all hover:border-primary/50 focus-visible:ring-1" />
        }
      >
        {t("Status", "الحالة")}
        <ChevronDownIcon className="size-3 text-muted-foreground rtl:-scale-x-100" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {statuses.map((s) => (
          <DropdownMenuItem
            key={s.value}
            className="text-xs cursor-pointer focus:bg-primary/5"
            onClick={() =>
              setStatus({
                conversationId: conversationId as Id<"conversations">,
                status: s.value,
                actorName,
              })
            }
          >
            <div className={`size-2 rounded-full me-2 ${s.color}`} />
            {s.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
