"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ListCard } from "./list-card";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { CreateListDialog } from "./create-list-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Doc } from "@/convex/_generated/dataModel";

const t = {
  ar: {
    title: "القوائم",
    newList: "قائمة جديدة",
    empty: "لا توجد قوائم بعد",
    emptyHint: "أنشئ قائمتك الأولى لتقسيم جهات الاتصال",
  },
  en: {
    title: "Lists",
    newList: "New List",
    empty: "No lists yet",
    emptyHint: "Create your first list to segment contacts",
  },
};

export function ListsPage({ locale }: { locale: "ar" | "en" }) {
  const tx = t[locale];
  const lists = useQuery(api.contactLists.listForTenant);
  const [createOpen, setCreateOpen] = useState(false);

  if (lists === undefined) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">{tx.title}</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <PlusIcon className="size-4 me-1" />
          {tx.newList}
        </Button>
      </div>

      {lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground">{tx.empty}</p>
          <p className="text-sm text-muted-foreground mt-1">{tx.emptyHint}</p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
            <PlusIcon className="size-4 me-1" />
            {tx.newList}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((list) => (
            <ListCardWithStats key={list._id} list={list} locale={locale} />
          ))}
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="border-2 border-dashed rounded-xl p-4 flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors text-sm"
          >
            <PlusIcon className="size-4 me-1" />
            {tx.newList}
          </button>
        </div>
      )}

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
  const stats = useQuery(api.contactLists.getStats, {
    listId: list._id,
  });

  return (
    <ListCard
      list={list}
      stats={stats ?? null}
      locale={locale}
    />
  );
}
