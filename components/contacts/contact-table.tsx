"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCountryFromPhone } from "@/lib/phoneGeo";
import { DT } from "@/lib/design-tokens";
import type { ContactViewProps } from "./contact-view-props";
import { type Stage, STAGE_CONFIG, STAGE_TABS } from "./contact-stage-config";

type SortCol = "name" | "stage" | "location" | "conversations" | "spent" | "lastSeen";
type SortDir = "asc" | "desc";

const l = {
  ar: {
    name: "الاسم",
    stage: "المرحلة",
    location: "الموقع",
    conversations: "محادثات",
    spent: "المصروف",
    lastSeen: "آخر ظهور",
  },
  en: {
    name: "Name",
    stage: "Stage",
    location: "Location",
    conversations: "Conv.",
    spent: "Spent",
    lastSeen: "Last seen",
  },
};

function formatSpent(value: number, locale: "ar" | "en"): string {
  return value.toLocaleString(locale === "ar" ? "ar-EG" : "en-US");
}

function relativeTime(timestamp: number, locale: "ar" | "en"): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return locale === "ar" ? "الآن" : "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return locale === "ar" ? `منذ ${minutes}د` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return locale === "ar" ? `منذ ${hours}س` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return locale === "ar" ? `منذ ${days}ي` : `${days}d ago`;
  const months = Math.floor(days / 30);
  return locale === "ar" ? `منذ ${months}ش` : `${months}mo ago`;
}

export function ContactTable({
  contacts,
  selected,
  locale,
  isLoading,
  onToggle,
  onClick,
  onViewProfile,
  onUpdateStage,
}: ContactViewProps) {
  const [sortCol, setSortCol] = useState<SortCol | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const lbl = l[locale];

  const sortedContacts = useMemo(() => {
    if (!sortCol) return contacts;
    return [...contacts].sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case "name":
          cmp = (a.customName ?? a.displayName ?? "").localeCompare(b.customName ?? b.displayName ?? "");
          break;
        case "stage":
          cmp = (a.stage ?? "lead").localeCompare(b.stage ?? "lead");
          break;
        case "location": {
          const aLoc = a.city ?? a.country ?? "";
          const bLoc = b.city ?? b.country ?? "";
          cmp = aLoc.localeCompare(bLoc);
          break;
        }
        case "conversations":
          cmp = (a.totalConversations ?? 0) - (b.totalConversations ?? 0);
          break;
        case "spent":
          cmp = (a.spent ?? 0) - (b.spent ?? 0);
          break;
        case "lastSeen":
          cmp = (a.lastSeenAt ?? 0) - (b.lastSeenAt ?? 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [contacts, sortCol, sortDir]);

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead />
            <TableHead className="w-24" />
            <TableHead className="w-[90px]" />
            <TableHead className="w-[70px]" />
            <TableHead className="w-20" />
            <TableHead className="w-[90px]" />
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="size-4" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-14" /></TableCell>
              <TableCell><Skeleton className="h-4 w-8" /></TableCell>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-4 w-14" /></TableCell>
              <TableCell><Skeleton className="size-4" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (contacts.length === 0) return null;

  const sortableHeader = (col: SortCol, label: string) => (
    <TableHead
      className={`${DT.SEC} text-start cursor-pointer select-none hover:text-foreground transition-colors`}
      onClick={() => handleSort(col)}
    >
      {label}
      <span className={cn("ms-1", sortCol !== col ? "text-muted-foreground/40" : "text-primary")}>
        {sortCol !== col ? "↕" : sortDir === "asc" ? "↑" : "↓"}
      </span>
    </TableHead>
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10" />
          {sortableHeader("name", lbl.name)}
          {sortableHeader("stage", lbl.stage)}
          {sortableHeader("location", lbl.location)}
          {sortableHeader("conversations", lbl.conversations)}
          {sortableHeader("spent", lbl.spent)}
          {sortableHeader("lastSeen", lbl.lastSeen)}
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedContacts.map((contact) => {
          const stage = (contact.stage ?? "lead") as Stage;
          const stageCfg = STAGE_CONFIG[stage];
          const geo = getCountryFromPhone(contact.phone);
          const countryIso = geo?.countryIso ?? contact.country ?? null;
          const isSelected = selected.has(contact._id);

          return (
            <TableRow
              key={contact._id}
              className={cn("cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02]", isSelected && "bg-primary/5")}
              onClick={() => onClick(contact._id)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggle(contact._id)}
                />
              </TableCell>
              <TableCell>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {contact.customName ?? contact.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono" dir="ltr">
                    {contact.phone}
                  </p>
                </div>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
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
              </TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground truncate">
                  {[contact.city, countryIso].filter(Boolean).join(", ") || "—"}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-xs tabular-nums">
                  {contact.totalConversations ?? 0}
                </span>
              </TableCell>
              <TableCell>
                {contact.spent != null ? (
                  <span className={cn("text-xs font-medium", contact.spent > 0 && "text-emerald-500")}>
                    {formatSpent(contact.spent, locale)}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground">
                  {relativeTime(contact.lastSeenAt, locale)}
                </span>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onViewProfile(contact._id)}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLinkIcon className="size-4" />
                </button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
