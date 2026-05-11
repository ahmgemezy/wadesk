"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DT } from "@/lib/design-tokens";
import { ContactTimeline } from "@/components/contacts/contact-timeline";

const STAGE_BADGE: Record<string, { en: string; ar: string; cls: string }> = {
  lead:     { en: "Lead",     ar: "عميل محتمل", cls: `${DT.BG_BLUE_TINT} ${DT.TEXT_BLUE}` },
  prospect: { en: "Prospect", ar: "مرشح",       cls: "bg-[#AF52DE]/10 text-[#AF52DE] dark:bg-[#BF5AF2]/15 dark:text-[#BF5AF2]" },
  customer: { en: "Customer", ar: "عميل",       cls: "bg-[#34C759]/10 text-[#34C759] dark:bg-[#30D158]/15 dark:text-[#30D158]" },
  retained: { en: "Retained", ar: "عميل دائم", cls: "bg-[#5AC8FA]/10 text-[#5AC8FA] dark:bg-[#64D2FF]/15 dark:text-[#64D2FF]" },
  churned:  { en: "Churned",  ar: "مفقود",      cls: "bg-[#FF3B30]/10 text-[#FF3B30] dark:bg-[#FF453A]/15 dark:text-[#FF453A]" },
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
    <div className={`${DT.CARD} p-6`}>
      <h2 className={`${DT.H3} mb-4`}>
        {locale === "ar" ? "النشاط الزمني لجهة الاتصال" : "Contact Activity Timeline"}
      </h2>
      <div ref={containerRef} className="relative mb-4">
        <div className="relative">
          <SearchIcon className={`absolute start-3 top-1/2 -translate-y-1/2 size-4 ${DT.TEXT_GRAY}`} />
          <input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
              if (selectedContactId) setSelectedContactId(null);
            }}
            onFocus={() => { if (searchQuery.trim().length >= 2) setShowDropdown(true); }}
            placeholder={locale === "ar" ? "ابحث عن جهة اتصال..." : "Search for a contact..."}
            className={`${DT.INPUT} ps-9`}
          />
        </div>

        {showDropdown && results.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl shadow-xl max-h-60 overflow-y-auto">
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
                    "w-full flex items-center justify-between gap-2 px-3 py-2 text-[13px] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors",
                    selectedContactId === contact._id && "bg-black/[0.06] dark:bg-white/[0.07]",
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`truncate font-medium ${DT.TEXT_PRIMARY}`}>
                      {contact.customName ?? contact.displayName}
                    </span>
                    <span className={`${DT.MICRO} truncate`}>
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
        <p className={`text-center py-8 ${DT.MUTED}`}>
          {locale === "ar"
            ? "اختر جهة اتصال لعرض نشاطها الزمني"
            : "Select a contact to view their activity timeline"}
        </p>
      )}

      {selectedContactId && !activity && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className={`${DT.DOT_GRAY} mt-1.5 shrink-0`} />
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
          <div className={`flex items-center gap-3 mb-4 pb-3 ${DT.DIVIDER}`}>
            <div className={`flex items-center justify-center size-10 rounded-full bg-black/[0.06] dark:bg-white/[0.08] text-[14px] font-semibold ${DT.TEXT_PRIMARY}`}>
              {(activity.contact.displayName ?? "?")[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`${DT.BODY} font-medium truncate`}>{activity.contact.displayName}</p>
              <p className={`${DT.MICRO} font-mono`} dir="ltr">
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
            <p className={`text-center py-6 ${DT.MUTED}`}>
              {locale === "ar" ? "لا توجد أحداث" : "No events yet"}
            </p>
          ) : (
            <ContactTimeline events={activity.events as any} locale={locale} />
          )}
        </div>
      )}
    </div>
  );
}
