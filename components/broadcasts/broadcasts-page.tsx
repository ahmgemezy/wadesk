"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { PlusIcon, MegaphoneIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sending: "bg-blue-100 text-blue-700",
  sent: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
};

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  draft: { ar: "مسودة", en: "Draft" },
  sending: { ar: "جاري الإرسال", en: "Sending" },
  sent: { ar: "تم الإرسال", en: "Sent" },
  failed: { ar: "فشل", en: "Failed" },
};

const t = {
  ar: {
    title: "الحملات",
    new: "حملة جديدة",
    empty: "لا توجد حملات بعد",
    emptyHint: "أنشئ حملتك الأولى لإرسال رسائل جماعية",
    recipients: "مستلم",
  },
  en: {
    title: "Broadcasts",
    new: "New Campaign",
    empty: "No broadcasts yet",
    emptyHint: "Create your first campaign to send bulk messages",
    recipients: "recipients",
  },
};

export function BroadcastsPage({ locale }: { locale: "ar" | "en" }) {
  const tx = t[locale];
  const router = useRouter();
  const broadcasts = useQuery(api.broadcasts.listForTenant);

  if (broadcasts === undefined) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">{tx.title}</h1>
        <Button size="sm" onClick={() => router.push("/broadcasts/new")}>
          <PlusIcon className="size-4 me-1" />
          {tx.new}
        </Button>
      </div>

      {broadcasts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MegaphoneIcon className="size-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{tx.empty}</p>
          <p className="text-sm text-muted-foreground mt-1">{tx.emptyHint}</p>
          <Button className="mt-4" onClick={() => router.push("/broadcasts/new")}>
            <PlusIcon className="size-4 me-1" />
            {tx.new}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {broadcasts.map((b) => (
            <div
              key={b._id}
              className="bg-card border rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-sm">{b.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {b.recipientCount} {tx.recipients} •{" "}
                  {new Date(b.createdAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB")}
                </div>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[b.status] ?? ""}`}
              >
                {STATUS_LABELS[b.status]?.[locale] ?? b.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
