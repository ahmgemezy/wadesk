"use client";

import { useRouter } from "next/navigation";
import type { Doc } from "@/convex/_generated/dataModel";

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

type Props = {
  list: Doc<"contactLists">;
  stats: {
    total: number;
    stageBreakdown: Record<string, number>;
  } | null;
  locale: "ar" | "en";
};

export function ListCard({ list, stats, locale }: Props) {
  const router = useRouter();

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
  ]
    .filter(Boolean)
    .join(" • ");

  const topStages = stats
    ? Object.entries(stats.stageBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
    : [];

  return (
    <button
      type="button"
      onClick={() => router.push(`/lists/${list._id}`)}
      className="w-full text-start bg-card border rounded-xl p-4 hover:border-primary/50 hover:shadow-sm transition-all flex flex-col gap-3"
    >
      <div>
        <div className="font-semibold text-sm">{list.name}</div>
        {filterSummary && (
          <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {filterSummary}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-primary">
          {stats?.total ?? "—"}
        </span>
        <span className="text-xs text-muted-foreground">
          {locale === "ar" ? "جهة اتصال" : "contacts"}
        </span>
      </div>

      {topStages.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {topStages.map(([stage, count]) => (
            <span
              key={stage}
              className={`text-xs px-2 py-0.5 rounded-full ${STAGE_COLORS[stage] ?? STAGE_COLORS.unknown}`}
            >
              {STAGE_LABELS[stage]?.[locale] ?? stage} {count}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
