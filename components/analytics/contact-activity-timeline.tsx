"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContactTimeline } from "@/components/contacts/contact-timeline";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";

const STAGE_BADGE: Record<string, { en: string; ar: string; cls: string }> = {
  lead:     { en: "Lead",     ar: "عميل محتمل", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  prospect: { en: "Prospect", ar: "مرشح",       cls: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  customer: { en: "Customer", ar: "عميل",       cls: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  retained: { en: "Retained", ar: "عميل دائم", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  churned:  { en: "Churned",  ar: "مفقود",      cls: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
};

interface ContactActivityTimelineProps {
  locale?: "ar" | "en";
}

export function ContactActivityTimeline({ locale = "ar" }: ContactActivityTimelineProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<Id<"contacts"> | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchResults = useQuery(
    api.contacts.search,
    searchQuery.trim().length >= 2
      ? { query: searchQuery.trim(), paginationOpts: { numItems: 10, cursor: null } }
      : "skip",
  );

  const activity = useQuery(
    api.analytics.getContactActivity,
    selectedContactId ? { contactId: selectedContactId } : "skip",
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const results = searchResults?.page ?? [];

  return (
    <Card className="bg-card/40 backdrop-blur-xl border-border/50 shadow-2xl">
      <CardHeader>
        <CardTitle className="font-sans tracking-tight">
          {locale === "ar" ? "النشاط الزمني لجهة الاتصال" : "Contact Activity Timeline"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="relative mb-4">
          <div className="relative">
            <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
                if (selectedContactId) setSelectedContactId(null);
              }}
              onFocus={() => { if (searchQuery.trim().length >= 2) setShowDropdown(true); }}
              placeholder={locale === "ar" ? "ابحث عن جهة اتصال..." : "Search for a contact..."}
              className="ps-9"
            />
          </div>

          {showDropdown && results.length > 0 && (
            <div className="absolute z-50 mt-1 w-full rounded-lg border border-border/50 bg-background/95 backdrop-blur-xl shadow-xl max-h-60 overflow-y-auto">
              {results.map((contact) => {
                const stage = contact.stage ?? "lead";
                const badge = STAGE_BADGE[stage];
                return (
                  <button
                    key={contact._id}
                    onClick={() => {
                      setSelectedContactId(contact._id as Id<"contacts">);
                      setSearchQuery(contact.customName ?? contact.displayName);
                      setShowDropdown(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors",
                      selectedContactId === contact._id && "bg-accent",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate font-medium">
                        {contact.customName ?? contact.displayName}
                      </span>
                      <span className="text-muted-foreground text-xs truncate">
                        {contact.phone}
                      </span>
                    </div>
                    {badge && (
                      <span className={cn("shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium", badge.cls)}>
                        {badge[locale === "ar" ? "ar" : "en"]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {!selectedContactId && (
          <p className="text-muted-foreground text-center py-8 text-sm">
            {locale === "ar"
              ? "اختر جهة اتصال لعرض نشاطها الزمني"
              : "Select a contact to view their activity timeline"}
          </p>
        )}

        {selectedContactId && !activity && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 items-start">
                <Skeleton className="size-4 rounded-full shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedContactId && activity && (
          <div>
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border/30">
              <div className="flex items-center justify-center size-10 rounded-full bg-muted text-sm font-bold">
                {(activity.contact.displayName ?? "?")[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{activity.contact.displayName}</p>
                <p className="text-xs text-muted-foreground font-mono" dir="ltr">
                  {activity.contact.phone}
                </p>
              </div>
              {STAGE_BADGE[activity.contact.stage] && (
                <span
                  className={cn(
                    "shrink-0 text-[11px] px-2 py-0.5 rounded-full font-medium",
                    STAGE_BADGE[activity.contact.stage].cls,
                  )}
                >
                  {STAGE_BADGE[activity.contact.stage][locale === "ar" ? "ar" : "en"]}
                </span>
              )}
            </div>

            {activity.events.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 text-sm">
                {locale === "ar" ? "لا توجد أحداث" : "No events yet"}
              </p>
            ) : (
              <ContactTimeline events={activity.events as any} locale={locale} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
