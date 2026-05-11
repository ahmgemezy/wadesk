"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DT } from "@/lib/design-tokens";
import { PlanGate } from "@/components/ui/plan-gate";
import { usePlan } from "@/lib/hooks/use-plan";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  MegaphoneIcon,
  ClockIcon,
} from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";
import { CreateBroadcastModal } from "./create-broadcast-modal";
import { useSelectedChannel } from "@/lib/hooks/channel-context";

type Broadcast = Doc<"broadcasts">;

const BORDER_COLOR: Record<string, string> = {
  sending: "border-s-blue-500",
  scheduled: "border-s-amber-500",
  sent: "border-s-emerald-500",
  failed: "border-s-rose-500",
  draft: "border-s-slate-300",
};

const STATUS_CONFIG: Record<
  string,
  { label: { ar: string; en: string }; cls: string; dot?: string }
> = {
  sending: {
    label: { ar: "جاري الإرسال", en: "Sending" },
    cls: "bg-blue-50 text-blue-700 border border-blue-200",
    dot: "bg-blue-500 animate-pulse",
  },
  scheduled: {
    label: { ar: "مجدول", en: "Scheduled" },
    cls: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
  },
  sent: {
    label: { ar: "تم الإرسال", en: "Completed" },
    cls: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  failed: {
    label: { ar: "فشل جزئي", en: "Failed (Partial)" },
    cls: "bg-rose-50 text-rose-700 border border-rose-200",
  },
  draft: {
    label: { ar: "مسودة", en: "Draft" },
    cls: "bg-slate-50 text-slate-600 border border-slate-200",
  },
};

function formatMetric(value: number | undefined): string {
  if (value === undefined || value === null) return "--";
  return `${value.toFixed(1)}%`;
}

function formatRelativeTime(scheduledAt: number, locale: "ar" | "en"): string {
  const diff = scheduledAt - Date.now();
  if (diff <= 0) return locale === "ar" ? "الآن" : "Due now";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60)
    return locale === "ar" ? `خلال ${minutes} دقيقة` : `Starts in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)
    return locale === "ar" ? `خلال ${hours} ساعة` : `Starts in ${hours}h`;
  const days = Math.floor(hours / 24);
  return locale === "ar" ? `خلال ${days} يوم` : `Starts in ${days}d`;
}

function StatusBadge({
  status,
  locale,
}: {
  status: string;
  locale: "ar" | "en";
}) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${cfg.cls}`}
    >
      {cfg.dot && (
        <span className={`size-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      )}
      {cfg.label[locale]}
    </span>
  );
}

function ActiveCampaignCard({
  broadcast,
  locale,
}: {
  broadcast: Broadcast;
  locale: "ar" | "en";
}) {
  const progress =
    broadcast.recipientCount > 0
      ? Math.min(
          100,
          (((broadcast.sentCount ?? 0) + (broadcast.failedCount ?? 0)) /
            broadcast.recipientCount) *
            100,
        )
      : 0;

  return (
    <div
      className={`relative bg-card border rounded-xl p-5 border-s-4 ${BORDER_COLOR[broadcast.status] ?? "border-s-slate-300"}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{broadcast.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {broadcast.status === "scheduled" && broadcast.scheduledAt
              ? formatRelativeTime(broadcast.scheduledAt, locale)
              : `${broadcast.recipientCount.toLocaleString()} ${locale === "ar" ? "مستلم" : "recipients"}`}
          </div>
        </div>
        <StatusBadge status={broadcast.status} locale={locale} />
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
          <span>{locale === "ar" ? "التقدم" : "Progress"}</span>
          <span>
            {(broadcast.sentCount ?? 0).toLocaleString()} /{" "}
            {broadcast.recipientCount.toLocaleString()}{" "}
            {locale === "ar" ? "تم" : "sent"}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              broadcast.status === "sending" ? "bg-blue-500" : "bg-amber-400"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t">
        {[
          {
            label: locale === "ar" ? "معدل التسليم" : "Delivery Rate",
            value: formatMetric(broadcast.deliveryRate),
          },
          {
            label: locale === "ar" ? "معدل الفتح" : "Open Rate",
            value: formatMetric(broadcast.openRate),
          },
          {
            label: "CTR",
            value: formatMetric(broadcast.ctr),
          },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
            <div className="text-sm font-semibold tabular-nums">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryTable({
  broadcasts,
  locale,
}: {
  broadcasts: Broadcast[];
  locale: "ar" | "en";
}) {
  if (broadcasts.length === 0) return null;
  return (
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            {[
              locale === "ar" ? "اسم الحملة" : "Campaign Name",
              locale === "ar" ? "الحالة" : "Status",
              locale === "ar" ? "المستلمون" : "Recipients",
              locale === "ar" ? "معدل الفتح" : "Open Rate",
              "CTR",
              locale === "ar" ? "التاريخ" : "Date",
            ].map((col) => (
              <th
                key={col}
                className="text-start text-xs font-medium text-muted-foreground px-4 py-3"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {broadcasts.map((b, idx) => (
            <tr
              key={b._id}
              className={idx < broadcasts.length - 1 ? "border-b" : ""}
            >
              <td className="px-4 py-3 font-medium max-w-50 truncate">
                {b.name}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={b.status} locale={locale} />
              </td>
              <td className="px-4 py-3 tabular-nums text-muted-foreground">
                {b.recipientCount.toLocaleString()}
              </td>
              <td className="px-4 py-3 tabular-nums text-muted-foreground">
                {formatMetric(b.openRate)}
              </td>
              <td className="px-4 py-3 tabular-nums text-muted-foreground">
                {formatMetric(b.ctr)}
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs">
                {new Date(b.createdAt).toLocaleDateString(
                  locale === "ar" ? "ar-EG" : "en-GB",
                  { day: "numeric", month: "short", year: "numeric" },
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const tx = {
  ar: {
    title: "الحملات",
    subtitle: "إدارة ومتابعة حملات الرسائل الجماعية.",
    search: "البحث في الحملات...",
    create: "إنشاء حملة",
    active: "الحملات النشطة",
    history: "السجل الأخير",
    viewAll: "عرض الكل",
    emptyTitle: "لا توجد حملات بعد",
    emptyHint: "أنشئ حملتك الأولى لإرسال رسائل جماعية",
    emptyBtn: "إنشاء أول حملة",
  },
  en: {
    title: "Campaigns",
    subtitle: "Manage and monitor your broadcast campaigns.",
    search: "Search campaigns...",
    create: "Create Campaign",
    active: "Active Campaigns",
    history: "Recent History",
    viewAll: "View All",
    emptyTitle: "No broadcasts yet",
    emptyHint: "Create your first campaign to send bulk messages",
    emptyBtn: "Create first campaign",
  },
};

export function BroadcastsPage({ locale }: { locale: "ar" | "en" }) {
  const t = tx[locale];
  const [modalOpen, setModalOpen] = useState(false);
  const { channelId: selectedChannelId } = useSelectedChannel();
  const broadcasts = useQuery(api.broadcasts.listForTenant, selectedChannelId ? { channelId: selectedChannelId } : {});
  const { atLeast } = usePlan();
  const canBroadcast = atLeast("starter");

  const { active, history } = useMemo(() => {
    const all = broadcasts ?? [];
    return {
      active: all.filter(
        (b) => b.status === "sending" || b.status === "scheduled",
      ),
      history: all.filter(
        (b) => b.status !== "sending" && b.status !== "scheduled",
      ),
    };
  }, [broadcasts]);

  if (broadcasts === undefined) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Plan gate banner */}
        {!canBroadcast && (
          <PlanGate
            requiredPlan="starter"
            featureLabel={locale === "ar" ? "الإشعارات التلقائية" : "Broadcasts"}
            variant="banner"
          />
        )}

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative hidden md:block">
              <SearchIcon className="absolute inset-s-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder={t.search}
                className={`${DT.INPUT} h-9 w-52`}
              />
            </div>
            <button
              className={`${DT.BTN_ICON} size-9 shrink-0 hidden md:flex`}
            >
              <SlidersHorizontalIcon className="size-4" />
            </button>
            <button
              className={`${DT.BTN_SM_PRIMARY} shrink-0 gap-1.5`}
              disabled={!canBroadcast}
              onClick={() => canBroadcast && setModalOpen(true)}
            >
              <PlusIcon className="size-4" />
              {t.create}
            </button>
          </div>
        </div>

        {/* Empty state */}
        {broadcasts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <MegaphoneIcon className="size-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">{t.emptyTitle}</p>
              <p className="text-sm text-muted-foreground mt-1">{t.emptyHint}</p>
            </div>
            <button onClick={() => canBroadcast && setModalOpen(true)} disabled={!canBroadcast} className={`${DT.BTN_PRIMARY} gap-1.5`}>
              <PlusIcon className="size-4" />
              {t.emptyBtn}
            </button>
          </div>
        )}

        {/* Active Campaigns */}
        {active.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold">{t.active}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {active.map((b) => (
                <ActiveCampaignCard key={b._id} broadcast={b} locale={locale} />
              ))}
            </div>
          </section>
        )}

        {/* Recent History */}
        {history.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">{t.history}</h2>
              <button className={`${DT.TEXT_BLUE_INTERACTIVE} text-sm hover:underline`}>
                {t.viewAll}
              </button>
            </div>
            <HistoryTable broadcasts={history} locale={locale} />
          </section>
        )}
      </div>

      <CreateBroadcastModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        locale={locale}
      />
    </>
  );
}
