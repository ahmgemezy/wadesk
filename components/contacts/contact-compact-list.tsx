"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { DT } from "@/lib/design-tokens";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExternalLinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContactViewProps } from "./contact-view-props";
import { type Stage, STAGE_CONFIG, STAGE_TABS } from "./contact-stage-config";

export function ContactCompactList({
  contacts,
  selected,
  locale,
  isLoading,
  onToggle,
  onClick,
  onViewProfile,
  onUpdateStage,
}: ContactViewProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col divide-y">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-3">
            <Skeleton className="size-7 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (contacts.length === 0) return null;

  const avatarColors = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-amber-600",
    "from-rose-500 to-pink-600",
    "from-indigo-500 to-blue-600",
  ];

  return (
    <div className="flex flex-col divide-y">
      {contacts.map((contact) => {
        const stage = (contact.stage ?? "lead") as Stage;
        const stageCfg = STAGE_CONFIG[stage];
        const isSelected = selected.has(contact._id);
        const initials = (contact.customName ?? contact.displayName ?? contact.phone)
          .split(" ")
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase() ?? "")
          .join("");
        const colorIndex = contact.phone.charCodeAt(contact.phone.length - 1) % avatarColors.length;

        return (
          <div
            key={contact._id}
            onClick={() => onClick(contact._id)}
            className={cn(
              DT.LIST_ITEM,
              isSelected && "bg-primary/5 border-s-2 border-primary",
            )}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggle(contact._id)}
                className={cn(
                  "transition-opacity",
                  isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                )}
              />
            </div>

            <div className={cn(
              "size-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-semibold text-xs shrink-0 shadow-inner",
              avatarColors[colorIndex],
            )}>
              {initials || "?"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {contact.customName ?? contact.displayName}
              </p>
              <p className="text-xs text-muted-foreground font-mono" dir="ltr">
                {contact.phone}
              </p>
            </div>

            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium transition-all hover:ring-2 hover:ring-primary/20",
                        stageCfg.color
                      )}
                    />
                  }
                >
                  {locale === "ar" ? stageCfg.ar : stageCfg.en}
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {STAGE_TABS.filter((t) => t !== "all").map((tab) => {
                    const cfg = STAGE_CONFIG[tab as Stage];
                    return (
                      <DropdownMenuItem
                        key={tab}
                        className="text-xs focus:bg-primary/5 cursor-pointer"
                        onClick={() => onUpdateStage(contact._id, tab as Stage)}
                      >
                        <div className={cn("size-2 rounded-full me-2", cfg.color.replace(/bg-([a-z]+)-100.*/, 'bg-$1-500'))} />
                        {locale === "ar" ? cfg.ar : cfg.en}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-1 shrink-0 max-w-[160px]">
              {contact.tags.slice(0, 2).map((tag) => (
                <span key={tag} className={`${DT.BADGE_NEUTRAL} truncate`}>
                  {tag}
                </span>
              ))}
              {contact.tags.length > 2 && (
                <span className={DT.BADGE_NEUTRAL}>
                  +{contact.tags.length - 2}
                </span>
              )}
            </div>

            <div onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onViewProfile(contact._id)}
                className="text-muted-foreground hover:text-primary transition-colors p-1"
              >
                <ExternalLinkIcon className="size-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
