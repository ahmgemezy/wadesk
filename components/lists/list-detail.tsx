"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DT } from "@/lib/design-tokens";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRightIcon, MegaphoneIcon, PencilIcon, UserIcon } from "lucide-react";
import { CreateListDialog } from "@/components/lists/create-list-dialog";
import { ContactSidePanel } from "@/components/contacts/contact-side-panel";

const STAGE_COLORS: Record<string, string> = {
  lead: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  prospect: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  customer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  retained: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  churned: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
  unknown: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const STAGE_LABELS: Record<string, { ar: string; en: string }> = {
  lead: { ar: "عميل محتمل", en: "Lead" },
  prospect: { ar: "مرشح", en: "Prospect" },
  customer: { ar: "عميل", en: "Customer" },
  retained: { ar: "عميل دائم", en: "Retained" },
  churned: { ar: "مفقود", en: "Churned" },
  unknown: { ar: "غير محدد", en: "Unknown" },
};

const t = {
  ar: {
    back: "العودة للقوائم",
    send: "إرسال حملة",
    edit: "تعديل",
    total: "إجمالي جهات الاتصال",
    countryBreakdown: "توزيع حسب الدولة",
    cityBreakdown: "توزيع حسب المدينة",
    tagDistribution: "توزيع الوسوم",
    other: "أخرى",
    noData: "لا توجد بيانات",
    contacts: "جهة اتصال",
    contactsSection: "جهات الاتصال في هذه القائمة",
    phone: "رقم الهاتف",
    name: "الاسم",
    stage: "المرحلة",
    noContacts: "لا توجد جهات اتصال تطابق فلاتر هذه القائمة.",
  },
  en: {
    back: "Back to Lists",
    send: "Send Campaign",
    edit: "Edit",
    total: "Total Contacts",
    countryBreakdown: "Breakdown by Country",
    cityBreakdown: "Breakdown by City",
    tagDistribution: "Tag Distribution",
    other: "Other",
    noData: "No data",
    contacts: "contacts",
    contactsSection: "Contacts in this list",
    phone: "Phone",
    name: "Name",
    stage: "Stage",
    noContacts: "No contacts match this list's filters.",
  },
};

type Props = {
  listId: Id<"contactLists">;
  locale: "ar" | "en";
};

export function ListDetail({ listId, locale }: Props) {
  const tx = t[locale];
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<Id<"contacts"> | null>(null);
  const list = useQuery(api.contactLists.getById, { listId });
  const stats = useQuery(api.contactLists.getStats, { listId });
  const contactsResult = useQuery(api.contactLists.getMatchingContacts, {
    listId,
    paginationOpts: { numItems: 100, cursor: null },
  });

  if (list === undefined || stats === undefined) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-96" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="p-6 text-muted-foreground">
        {locale === "ar" ? "القائمة غير موجودة" : "List not found"}
      </div>
    );
  }

  const filterSummary = [
    list.filters.countries?.length
      ? `${locale === "ar" ? "الدولة" : "Country"}: ${list.filters.countries.join(", ")}`
      : null,
    list.filters.cities?.length
      ? `${locale === "ar" ? "المدينة" : "City"}: ${list.filters.cities.join(", ")}`
      : null,
    list.filters.stages?.length
      ? `${locale === "ar" ? "المرحلة" : "Stage"}: ${list.filters.stages.map((s) => STAGE_LABELS[s]?.[locale] ?? s).join(", ")}`
      : null,
    list.filters.tags?.length
      ? `${locale === "ar" ? "الوسوم" : "Tags"}: ${list.filters.tags.join(", ")}`
      : null,
  ].filter(Boolean).join(" • ");

  const topCountries = stats
    ? Object.entries(stats.countryBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    : [];
  const countryMax = topCountries[0]?.[1] ?? 1;

  const topTags = stats
    ? [...stats.tagBreakdown].sort((a, b) => b.count - a.count).slice(0, 8).map(({ tag, count }) => [tag, count] as [string, number])
    : [];

  const stageEntries = stats
    ? Object.entries(stats.stageBreakdown).filter(([s]) => s !== "unknown").sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl mx-auto">
      <div>
        <button
          type="button"
          onClick={() => router.push("/lists")}
          className={`${DT.MUTED} ${DT.MUTED_HOVER} flex items-center gap-1 mb-3`}
        >
          <ArrowRightIcon className="size-3 rotate-180" />
          {tx.back}
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className={DT.H2}>{list.name}</h1>
            {filterSummary && (
              <p className={`${DT.MUTED} mt-1`}>{filterSummary}</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button type="button" className={DT.BTN_SM} onClick={() => setEditOpen(true)}>
              <PencilIcon className="size-4 me-1" />
              {tx.edit}
            </button>
            <button
              type="button"
              className={DT.BTN_SM_PRIMARY}
              onClick={() => router.push(`/broadcasts/new?listId=${listId}`)}
            >
              <MegaphoneIcon className="size-4 me-1" />
              {tx.send}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`${DT.CARD_SM} p-4 text-center`}>
          <div className={`text-[24px] font-semibold ${DT.TEXT_BLUE}`}>{stats?.total ?? "—"}</div>
          <div className={`${DT.MICRO} mt-1`}>{tx.total}</div>
        </div>
        {stageEntries.slice(0, 3).map(([stage, count]) => (
          <div
            key={stage}
            className={`rounded-2xl p-4 text-center ${STAGE_COLORS[stage] ?? STAGE_COLORS.unknown}`}
          >
            <div className="text-[24px] font-semibold">{count}</div>
            <div className="text-[11px] mt-1">{STAGE_LABELS[stage]?.[locale] ?? stage}</div>
          </div>
        ))}
      </div>

      {(topCountries.length > 0 || topTags.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {topCountries.length > 0 && (
            <div className={`${DT.CARD} p-5`}>
              <h2 className={`${DT.H3} mb-4`}>{tx.countryBreakdown}</h2>
              <div className="flex flex-col gap-3">
                {topCountries.map(([country, count]) => (
                  <div key={country} className="flex items-center justify-between gap-3">
                    <span className={`${DT.BODY} min-w-12`}>{country}</span>
                    <div className="flex-1 h-2 bg-black/[0.06] dark:bg-white/[0.08] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${DT.BG_BLUE} rounded-full`}
                        style={{ width: `${(count / countryMax) * 100}%` }}
                      />
                    </div>
                    <span className={`${DT.BODY} font-semibold w-6 text-end`}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {topTags.length > 0 && (
            <div className={`${DT.CARD} p-5`}>
              <h2 className={`${DT.H3} mb-4`}>{tx.tagDistribution}</h2>
              <div className="flex flex-wrap gap-2">
                {topTags.map(([tag, count]) => (
                  <span
                    key={tag}
                    className={DT.BADGE_NEUTRAL}
                  >
                    {tag} <strong className="ms-1">{count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contacts list */}
      <div className={`${DT.CARD} overflow-hidden`}>
        <div className={`px-5 py-4 ${DT.DIVIDER} flex items-center gap-2`}>
          <UserIcon className="size-4 text-[#6E6E73] dark:text-white/50" />
          <h2 className={DT.H3}>{tx.contactsSection}</h2>
          {contactsResult && (
            <span className={`ms-auto ${DT.MICRO}`}>
              {contactsResult.page.length}{" "}
              {locale === "ar" ? "جهة اتصال" : "contacts"}
            </span>
          )}
        </div>

        {contactsResult === undefined ? (
          <div className="flex flex-col divide-y divide-black/[0.06] dark:divide-white/[0.06]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <Skeleton className="size-8 rounded-full shrink-0" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-28 ms-auto" />
              </div>
            ))}
          </div>
        ) : contactsResult.page.length === 0 ? (
          <div className={`px-5 py-10 text-center ${DT.MUTED}`}>
            {tx.noContacts}
          </div>
        ) : (
          <div className="p-2 flex flex-col gap-0.5">
            {contactsResult.page.map((contact) => (
              <div
                key={contact._id}
                className={DT.LIST_ITEM}
                onClick={() => setSelectedContactId(contact._id)}
              >
                <div className={`size-8 rounded-full ${DT.BG_BLUE_LIGHT} ${DT.TEXT_BLUE} flex items-center justify-center shrink-0 text-[14px] font-semibold`}>
                  {(contact.displayName ?? contact.phone)[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`${DT.BODY} font-medium truncate`}>{contact.displayName ?? contact.phone}</p>
                  <p className={DT.MICRO} dir="ltr">{contact.phone}</p>
                </div>
                {contact.stage && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${STAGE_COLORS[contact.stage] ?? STAGE_COLORS.unknown}`}
                  >
                    {STAGE_LABELS[contact.stage]?.[locale] ?? contact.stage}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ContactSidePanel
        contactId={selectedContactId}
        channelId={null}
        open={selectedContactId !== null}
        onClose={() => setSelectedContactId(null)}
        locale={locale}
      />

      {list && (
        <CreateListDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          locale={locale}
          initialData={{
            listId,
            name: list.name,
            description: list.description,
            filters: list.filters,
          }}
        />
      )}
    </div>
  );
}
