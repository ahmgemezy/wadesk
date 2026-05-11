"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ListCard } from "./list-card";
import { DT } from "@/lib/design-tokens";
import { PlusIcon, ListIcon } from "lucide-react";
import { useState } from "react";
import { CreateListDialog } from "./create-list-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Doc } from "@/convex/_generated/dataModel";

const t = {
  ar: {
    title: "القوائم",
    subtitle: "قوائم مجزأة لاستهداف جهات الاتصال في الحملات",
    newList: "قائمة جديدة",
    empty: "لا توجد قوائم بعد",
    emptyHint: "أنشئ قائمتك الأولى لتقسيم جهات الاتصال واستهدافها في الحملات.",
    emptyAction: "إنشاء قائمة",
  },
  en: {
    title: "Lists",
    subtitle: "Segmented contact lists for targeted broadcasts",
    newList: "New List",
    empty: "No lists yet",
    emptyHint: "Create your first list to segment contacts and target them in broadcast campaigns.",
    emptyAction: "Create a list",
  },
};

export function ListsPage({ locale }: { locale: "ar" | "en" }) {
  const tx = t[locale];
  const lists = useQuery(api.contactLists.listForTenant);
  const [createOpen, setCreateOpen] = useState(false);

  if (lists === undefined) {
    return (
      <div className="p-8 max-w-6xl mx-auto w-full">
        <div className="flex items-start justify-between mb-8">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-4 w-52" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 overflow-y-auto h-full">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className={DT.H1}>{tx.title}</h1>
            <p className={`${DT.MUTED} mt-1`}>{tx.subtitle}</p>
          </div>
          <button type="button" className={DT.BTN_PRIMARY} onClick={() => setCreateOpen(true)}>
            <PlusIcon className="size-4 me-2" />
            {tx.newList}
          </button>
        </div>

        {/* Empty state */}
        {lists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className={`size-14 rounded-2xl ${DT.BG_BLUE_LIGHT} flex items-center justify-center mb-4`}>
              <ListIcon className={`size-6 ${DT.TEXT_BLUE}`} />
            </div>
            <p className={DT.H3}>{tx.empty}</p>
            <p className={`${DT.MUTED} mt-1.5 max-w-xs`}>{tx.emptyHint}</p>
            <button type="button" className={`${DT.BTN_SM_PRIMARY} mt-6`} onClick={() => setCreateOpen(true)}>
              <PlusIcon className="size-4 me-2" />
              {tx.emptyAction}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.map((list) => (
              <ListCardWithStats key={list._id} list={list} locale={locale} />
            ))}
            {/* Add new — always last */}
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="group border-2 border-dashed border-black/[0.12] dark:border-white/[0.10] rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-[#6E6E73] dark:text-white/50 hover:border-[#0071E3]/40 dark:hover:border-[#0A84FF]/40 hover:text-[#0071E3] dark:hover:text-[#0A84FF] transition-all duration-200 min-h-40"
            >
              <div className="size-9 rounded-xl border-2 border-current flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                <PlusIcon className="size-4" />
              </div>
              <span className="text-[14px] font-medium">{tx.newList}</span>
            </button>
          </div>
        )}
      </div>

      <CreateListDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        locale={locale}
      />
    </div>
  );
}

function ListCardWithStats({
  list,
  locale,
}: {
  list: Doc<"contactLists">;
  locale: "ar" | "en";
}) {
  const stats = useQuery(api.contactLists.getStats, { listId: list._id });
  return <ListCard list={list} stats={stats ?? null} locale={locale} />;
}
