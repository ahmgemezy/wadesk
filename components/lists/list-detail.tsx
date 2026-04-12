"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRightIcon, MegaphoneIcon, PencilIcon, UserIcon } from "lucide-react";

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

  const topCities = stats
    ? Object.entries(stats.cityBreakdown)
        .filter(([city]) => city !== "unknown")
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];
  const cityMax = topCities[0]?.[1] ?? 1;

  const topTags = stats
    ? Object.entries(stats.tagBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 8)
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
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3"
        >
          <ArrowRightIcon className="size-3 rotate-180" />
          {tx.back}
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">{list.name}</h1>
            {filterSummary && (
              <p className="text-sm text-muted-foreground mt-1">{filterSummary}</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm">
              <PencilIcon className="size-4 me-1" />
              {tx.edit}
            </Button>
            <Button
              size="sm"
              onClick={() => router.push(`/broadcasts/new?listId=${listId}`)}
            >
              <MegaphoneIcon className="size-4 me-1" />
              {tx.send}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-primary">{stats?.total ?? "—"}</div>
          <div className="text-xs text-muted-foreground mt-1">{tx.total}</div>
        </div>
        {stageEntries.slice(0, 3).map(([stage, count]) => (
          <div
            key={stage}
            className={`rounded-xl p-4 text-center ${STAGE_COLORS[stage] ?? STAGE_COLORS.unknown}`}
          >
            <div className="text-2xl font-bold">{count}</div>
            <div className="text-xs mt-1">{STAGE_LABELS[stage]?.[locale] ?? stage}</div>
          </div>
        ))}
      </div>

      {topCities.length > 0 && (
        <div className="bg-card border rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">{tx.cityBreakdown}</h2>
          <div className="flex flex-col gap-3">
            {topCities.map(([city, count]) => (
              <div key={city} className="flex items-center justify-between gap-3">
                <span className="text-sm min-w-20">{city}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${(count / cityMax) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold w-8 text-end">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {topTags.length > 0 && (
        <div className="bg-card border rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">{tx.tagDistribution}</h2>
          <div className="flex flex-wrap gap-2">
            {topTags.map(([tag, count]) => (
              <span
                key={tag}
                className="bg-muted text-muted-foreground text-xs px-3 py-1.5 rounded-full"
              >
                {tag} <strong className="text-foreground">{count}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Contacts list */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <UserIcon className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">{tx.contactsSection}</h2>
          {contactsResult && (
            <span className="ms-auto text-xs text-muted-foreground">
              {contactsResult.page.length}{" "}
              {locale === "ar" ? "جهة اتصال" : "contacts"}
            </span>
          )}
        </div>

        {contactsResult === undefined ? (
          <div className="flex flex-col divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <Skeleton className="size-8 rounded-full shrink-0" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-28 ms-auto" />
              </div>
            ))}
          </div>
        ) : contactsResult.page.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            {tx.noContacts}
          </div>
        ) : (
          <div className="divide-y">
            {contactsResult.page.map((contact) => (
              <div
                key={contact._id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 cursor-pointer transition-colors"
                onClick={() => router.push(`/contacts/${contact._id}`)}
              >
                <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-sm font-semibold">
                  {(contact.displayName ?? contact.phone)[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{contact.displayName ?? contact.phone}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">{contact.phone}</p>
                </div>
                {contact.stage && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STAGE_COLORS[contact.stage] ?? STAGE_COLORS.unknown}`}
                  >
                    {STAGE_LABELS[contact.stage]?.[locale] ?? contact.stage}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
