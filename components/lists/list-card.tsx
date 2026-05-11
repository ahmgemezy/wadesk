"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { DT } from "@/lib/design-tokens";
import { UsersIcon, ChevronLeftIcon, ChevronRightIcon, Trash2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";

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
  const removeList = useMutation(api.contactLists.remove);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await removeList({ listId: list._id });
      toast.success(locale === "ar" ? "تم حذف القائمة" : "List deleted");
    } catch {
      toast.error(locale === "ar" ? "فشل الحذف" : "Failed to delete");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

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
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/lists/${list._id}`)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/lists/${list._id}`); }}
      className={`group w-full text-start ${DT.CARD_SM} p-5 ${DT.BORDER_BLUE_HOVER} transition-all duration-200 flex flex-col gap-4 cursor-pointer`}
    >
      {/* Top row: name + actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className={`${DT.H3} truncate`}>{list.name}</div>
          {list.description && (
            <div className={`${DT.MUTED} mt-0.5 line-clamp-1`}>{list.description}</div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {confirmDelete ? (
            <>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className={`${DT.BTN_SM} ${DT.BG_RED} hover:!bg-[#FF453A] !text-white !border-transparent`}
              >
                {deleting ? "…" : (locale === "ar" ? "تأكيد" : "Delete")}
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
                className={DT.BTN_ICON}
              >
                <XIcon className="size-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                className={`${DT.BTN_ICON} opacity-0 group-hover:opacity-100 hover:!text-[#FF3B30] dark:hover:!text-[#FF453A] transition-all`}
              >
                <Trash2Icon className="size-4" />
              </button>
              <div className={`${DT.TEXT_GRAY} group-hover:${DT.TEXT_BLUE} transition-colors mt-0.5`}>
                {isRTL ? <ChevronLeftIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Contact count */}
      <div className="flex items-end gap-1.5">
        <UsersIcon className="size-4 text-[#6E6E73] dark:text-white/50 mb-0.5" />
        <span className="text-[24px] font-semibold text-[#1D1D1F] dark:text-white leading-none tabular-nums">
          {stats === null ? "—" : stats.total.toLocaleString()}
        </span>
        <span className={`${DT.MICRO} mb-0.5`}>
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
                className={`${DT.BADGE_NEUTRAL} gap-1.5 ${c.bg} ${c.text}`}
              >
                <span className={`size-1.5 rounded-full ${c.dot}`} />
                {STAGE_LABELS[stage]?.[locale] ?? stage}
                <span className="opacity-60">{count}</span>
              </span>
            );
          })}
        </div>
      ) : (
        <div className={DT.MICRO}>{filterLabel}</div>
      )}
    </div>
  );
}
