"use client";

import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Tag } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

const COLOR_MAP: Record<string, string> = {
  red: "bg-red-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  yellow: "bg-yellow-400",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  gray: "bg-gray-400",
};

interface LabelPickerProps {
  conversationId: string;
  activeLabels: string[];
}

export function LabelPicker({ conversationId, activeLabels }: LabelPickerProps) {
  const t = useT();
  const { isAuthenticated } = useConvexAuth();
  const labels = useQuery(api.labels.list, isAuthenticated ? undefined : "skip") ?? [];
  const addLabel = useMutation(api.labels.addToConversation);
  const removeLabel = useMutation(api.labels.removeFromConversation);

  async function toggle(labelName: string) {
    const id = conversationId as Id<"conversations">;
    if (activeLabels.includes(labelName)) {
      await removeLabel({ conversationId: id, labelName });
    } else {
      await addLabel({ conversationId: id, labelName });
    }
  }

  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex items-center gap-1.5 h-7 rounded-md px-2.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Tag className="size-3.5" />
        {t("Labels", "التصنيفات")}
        {activeLabels.length > 0 && (
          <span className="rounded-full bg-primary/10 text-primary px-1.5 py-0 text-[10px] font-semibold">
            {activeLabels.length}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1">
        {labels.length === 0 ? (
          <p className="text-xs text-muted-foreground px-2 py-1.5">
            {t("No labels defined yet", "لا توجد تصنيفات بعد")}
          </p>
        ) : (
          labels.map((label) => {
            const isActive = activeLabels.includes(label.name);
            return (
              <button
                key={label._id}
                onClick={() => toggle(label.name)}
                className={cn(
                  "w-full flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent transition-colors",
                  isActive && "bg-accent",
                )}
              >
                <span
                  className={cn(
                    "size-2.5 rounded-full shrink-0",
                    COLOR_MAP[label.color] ?? "bg-gray-400",
                  )}
                />
                <span className="flex-1 text-start truncate">
                  {label.emoji ? `${label.emoji} ` : ""}
                  {label.name}
                </span>
                {isActive && (
                  <span className="text-[10px] text-primary font-semibold">
                    {t("✓", "✓")}
                  </span>
                )}
              </button>
            );
          })
        )}
      </PopoverContent>
    </Popover>
  );
}
