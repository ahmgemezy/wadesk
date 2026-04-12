"use client";

import { useRouter } from "next/navigation";
import type { Doc } from "@/convex/_generated/dataModel";
import { UsersIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

const STAGE_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  lead:     { dot: "bg-slate-400",   bg: "bg-slate-50 dark:bg-slate-800/60",   text: "text-slate-600 dark:text-slate-300" },
  prospect: { dot: "bg-blue-400",    bg: "bg-blue-50 dark:bg-blue-900/40",     text: "text-blue-700 dark:text-blue-300" },
  customer: { dot: "bg-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300" },
  retained: { dot: "bg-violet-400",  bg: "bg-violet-50 dark:bg-violet-900/40", text: "text-violet-700 dark:text-violet-300" },
  churned:  { dot: "bg-rose-400",    bg: "bg-rose-50 dark:bg-rose-900/40",     text: "text-rose-700 dark:text-rose-300" },
  unknown:  { dot: "bg-gray-300",    bg: "bg-gray-50 dark:bg-gray-800/40",     text: "text-gray-500 dark:text-gray-400" },
};

const STAGE_LABELS: Record<string, { ar: string; en: string }> = {
  lead:     { ar: "عميل محتمل", en: "Lead" },
  prospect: { ar: "مرشح",       en: "Prospect" },
  customer: { ar: "عميل",       en: "Customer" },
  retained: { ar: "دائم",       en: "Retained" },
  churned:  { ar: "مفقود",      en: "Churned" },
  unknown:  { ar: "غير محدد",   en: "Unknown" },
};

type Props = {
  list: Doc<"contactLists">;
  stats: { total: number; stageBreakdown: Record<string, number> } | null;
  locale: "ar" | "en";
};

export function ListCard({ list, stats, locale }: Props) {
  const router = useRouter();
  const isRTL = locale === "ar";

  const topStages = stats
    ? Object.entries(stats.stageBreakdown)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
    : [];

  const filterCount = [
    list.filters.countries?.length,
    list.filters.cities?.length,
    list.filters.stages?.length,
    list.filters.tags?.length,
  ].filter(Boolean).length;

  const filterLabel =
    filterCount === 0
      ? locale === "ar" ? "بدون فلاتر" : "No filters"
      : locale === "ar"
      ? `${filterCount} ${filterCount === 1 ? "فلتر" : "فلاتر"}`
      : `${filterCount} filter${filterCount > 1 ? "s" : ""}`;

  return (
    <button
      type="button"
      onClick={() => router.push(`/lists/${list._id}`)}
      className="group w-full text-start bg-card border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-[0_2px_12px_0_oklch(0.52_0.16_155/0.08)] transition-all duration-200 flex flex-col gap-4"
    >
      {/* Top row: name + chevron */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-foreground truncate">{list.name}</div>
          {list.description && (
            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{list.description}</div>
          )}
        </div>
        <div className="text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5">
          {isRTL ? <ChevronLeftIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
        </div>
      </div>

      {/* Contact count */}
      <div className="flex items-end gap-1.5">
        <UsersIcon className="size-4 text-muted-foreground mb-0.5" />
        <span className="text-2xl font-bold text-foreground leading-none tabular-nums">
          {stats === null ? "—" : stats.total.toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground mb-0.5">
          {locale === "ar" ? "جهة اتصال" : "contacts"}
        </span>
      </div>

      {/* Stage breakdown */}
      {topStages.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {topStages.map(([stage, count]) => {
            const c = STAGE_COLORS[stage] ?? STAGE_COLORS.unknown;
            return (
              <span
                key={stage}
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${c.bg} ${c.text}`}
              >
                <span className={`size-1.5 rounded-full ${c.dot}`} />
                {STAGE_LABELS[stage]?.[locale] ?? stage}
                <span className="opacity-60">{count}</span>
              </span>
            );
          })}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">{filterLabel}</div>
      )}
    </button>
  );
}
