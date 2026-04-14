"use client";

import type { Id, Doc } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MapPinIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCountryFromPhone } from "@/lib/phoneGeo";
import type { ContactViewProps } from "./contact-view-props";
import { type Stage, STAGE_CONFIG, STAGE_TABS } from "./contact-stage-config";

const l = {
  ar: { archivedBadge: "مؤرشف", noTags: "بدون وسوم", viewProfile: "عرض الملف" },
  en: { archivedBadge: "Archived", noTags: "No tags", viewProfile: "View Profile" },
};

interface ContactCardProps {
  contact: Doc<"contacts">;
  isSelected: boolean;
  locale: "ar" | "en";
  onToggle: () => void;
  onClick: (id: Id<"contacts">) => void;
  onViewProfile: (id: Id<"contacts">) => void;
  onUpdateStage?: (id: Id<"contacts">, stage: Stage) => void;
}

function ContactCard({
  contact,
  isSelected,
  locale,
  onToggle,
  onClick,
  onViewProfile,
  onUpdateStage,
}: ContactCardProps) {
  const lbl = l[locale];
  const stage = (contact.stage ?? "lead") as Stage;
  const stageCfg = STAGE_CONFIG[stage];
  const initials = (contact.customName ?? contact.displayName ?? contact.phone)
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const avatarColors = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-amber-600",
    "from-rose-500 to-pink-600",
    "from-indigo-500 to-blue-600",
  ];
  const colorIndex = contact.phone.charCodeAt(contact.phone.length - 1) % avatarColors.length;

  return (
    <div
      onClick={() => onClick(contact._id)}
      className={cn(
        "group relative rounded-xl border bg-card p-4 cursor-pointer",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-primary/30",
        "dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)]",
        "transform-3d",
        isSelected && "border-primary ring-1 ring-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]",
        contact.isArchived && "opacity-60",
      )}
      style={{ perspective: "1000px" }}
    >
      <div
        className="absolute top-3 inset-s-3 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          className={cn(
            "transition-opacity",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        />
      </div>

      <div className="absolute top-3 inset-e-3 flex flex-col items-end gap-1">
        {contact.isArchived && (
          <Badge variant="outline" className="text-xs">
            {lbl.archivedBadge}
          </Badge>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium transition-all hover:ring-2 hover:ring-primary/20",
                  stageCfg.color
                )}
              />
            }
          >
            {locale === "ar" ? stageCfg.ar : stageCfg.en}
          </DropdownMenuTrigger>
          <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
            {STAGE_TABS.filter((t) => t !== "all").map((tab) => {
              const cfg = STAGE_CONFIG[tab as Stage];
              return (
                <DropdownMenuItem
                  key={tab}
                  className="text-xs focus:bg-primary/5 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateStage?.(contact._id, tab as Stage);
                  }}
                >
                  <div className={cn("size-2 rounded-full me-2", cfg.color.replace(/bg-([a-z]+)-100.*/, 'bg-$1-500'))} />
                  {locale === "ar" ? cfg.ar : cfg.en}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-col items-center gap-3 pt-2">
        <div className={cn(
          "size-14 rounded-full bg-linear-to-br flex items-center justify-center text-white font-semibold text-lg shadow-inner",
          avatarColors[colorIndex],
        )}>
          {initials || "?"}
        </div>

        <div className="text-center min-w-0 w-full">
          <p className="font-medium text-sm truncate">
            {contact.customName ?? contact.displayName}
          </p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5" dir="ltr">
            {contact.phone}
          </p>
        </div>
      </div>

      {(() => {
        const geo = getCountryFromPhone(contact.phone);
        const countryIso = geo?.countryIso ?? null;
        const hasLocation = contact.city || countryIso;
        return (
          <div className="mt-3 flex items-center justify-center gap-3 text-xs text-muted-foreground">
            {hasLocation && (
              <span className="flex items-center gap-1 truncate">
                <MapPinIcon className="size-3 shrink-0" />
                {[contact.city, countryIso].filter(Boolean).join(", ")}
              </span>
            )}
            {contact.category && (
              <Badge variant="secondary" className="text-xs font-normal">
                {contact.category}
              </Badge>
            )}
          </div>
        );
      })()}

      <div className="mt-2 flex flex-wrap gap-1 justify-center min-h-5.5">
        {contact.tags.length > 0 ? (
          <>
            {contact.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs font-normal">
                {tag}
              </Badge>
            ))}
            {contact.tags.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{contact.tags.length - 2}
              </Badge>
            )}
          </>
        ) : (
          <span className="text-xs text-muted-foreground/50">{lbl.noTags}</span>
        )}
      </div>

      {contact.spent != null && (
        <div className="mt-2 text-center">
          <span className="text-xs font-medium text-emerald-500">
            ${contact.spent.toLocaleString()}
          </span>
        </div>
      )}

      <div
        className="mt-3 flex justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onViewProfile(contact._id)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <ExternalLinkIcon className="size-3" />
          {lbl.viewProfile}
        </button>
      </div>

      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-linear-to-br from-primary/5 to-transparent" />
    </div>
  );
}

export function ContactCardGrid({
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
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div key={i} variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } }}>
            <Skeleton className="h-48 rounded-xl" />
          </motion.div>
        ))}
      </motion.div>
    );
  }

  if (contacts.length === 0) return null;

  return (
    <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <AnimatePresence mode="popLayout">
        {contacts.map((contact) => (
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            key={contact._id}
          >
            <ContactCard
              contact={contact}
              isSelected={selected.has(contact._id)}
              locale={locale}
              onToggle={() => onToggle(contact._id)}
              onClick={onClick}
              onViewProfile={onViewProfile}
              onUpdateStage={onUpdateStage}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
