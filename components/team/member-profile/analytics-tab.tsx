"use client";

import { useT } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Clock, Star, MessageSquare, CheckCircle2 } from "lucide-react";

type TimeRange = "week" | "month" | "90days" | "alltime";

const TIME_RANGES = [
  { value: "week" as const, labelEn: "Week", labelAr: "أسبوع" },
  { value: "month" as const, labelEn: "Month", labelAr: "شهر" },
  { value: "90days" as const, labelEn: "90 Days", labelAr: "90 يوم" },
  { value: "alltime" as const, labelEn: "All-time", labelAr: "كل الأوقات" },
];

type AnalyticsSummary = {
  totalConversations: number;
  resolvedCount: number;
  avgFirstResponseTimeSeconds: number | null;
  avgCsatScore: number | null;
};

type ChannelBreakdown = {
  channelId: string;
  channelName: string | null;
  count: number;
  resolved: number;
  avgCsat: number | null;
};

type AnalyticsTabProps = {
  analytics: { summary: AnalyticsSummary; channelBreakdown: ChannelBreakdown[] } | undefined;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
};

export function AnalyticsTab({ analytics, timeRange, setTimeRange }: AnalyticsTabProps) {
  const t = useT();

  if (!analytics) return <AnalyticsSkeleton />;

  const s = analytics.summary;
  const responseTime = s.avgFirstResponseTimeSeconds != null
    ? (s.avgFirstResponseTimeSeconds / 60).toFixed(1)
    : "—";
  const csat = s.avgCsatScore != null ? s.avgCsatScore.toFixed(1) : "—";
  const resolutionRate =
    s.totalConversations > 0
      ? ((s.resolvedCount / s.totalConversations) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      <div className="flex gap-1.5">
        {TIME_RANGES.map((tr) => (
          <Button
            key={tr.value}
            variant={timeRange === tr.value ? "default" : "outline"}
            size="xs"
            onClick={() => setTimeRange(tr.value)}
          >
            {t(tr.labelEn, tr.labelAr)}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          label={t("Avg Response Time", "متوسط وقت الاستجابة")}
          value={`${responseTime} ${t("min", "د")}`}
          icon={<Clock className="size-5 text-muted-foreground" />}
        />
        <MetricCard
          label={t("CSAT Score", "درجة رضا العملاء")}
          value={`${csat} / 5`}
          icon={<Star className="size-5 text-muted-foreground" />}
        />
        <MetricCard
          label={t("Total Conversations", "إجمالي المحادثات")}
          value={String(s.totalConversations)}
          icon={<MessageSquare className="size-5 text-muted-foreground" />}
        />
        <MetricCard
          label={t("Resolution Rate", "نسبة الحل")}
          value={`${resolutionRate}%`}
          sub={`${s.resolvedCount} / ${s.totalConversations}`}
          icon={<CheckCircle2 className="size-5 text-muted-foreground" />}
        />
      </div>

      <section>
        <h3 className="mb-3 text-sm font-medium">
          {t("Channel Breakdown", "تفصيل القنوات")}
        </h3>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted text-start text-xs font-medium text-muted-foreground">
                <th className="px-3 py-2">{t("Channel", "القناة")}</th>
                <th className="px-3 py-2 text-end">{t("Volume", "الحجم")}</th>
                <th className="px-3 py-2 text-end">{t("Resolved", "تم الحل")}</th>
                <th className="px-3 py-2 text-end">{t("CSAT", "الرضا")}</th>
              </tr>
            </thead>
            <tbody>
              {analytics.channelBreakdown.map((ch) => {
                const resolvedPct =
                  ch.count > 0 ? ((ch.resolved / ch.count) * 100).toFixed(0) : "0";
                return (
                  <tr key={ch.channelId} className="border-b last:border-b-0 hover:bg-muted/50">
                    <td className="px-3 py-2 font-medium">{ch.channelName}</td>
                    <td className="px-3 py-2 text-end tabular-nums">{ch.count}</td>
                    <td className="px-3 py-2 text-end tabular-nums">
                      {ch.resolved} ({resolvedPct}%)
                    </td>
                    <td className="px-3 py-2 text-end tabular-nums">
                      {ch.avgCsat != null ? ch.avgCsat.toFixed(1) : "—"}
                    </td>
                  </tr>
                );
              })}
              {analytics.channelBreakdown.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                    {t("No data", "لا توجد بيانات")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-6 w-16 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-40 rounded-lg bg-muted" />
      </div>
    </div>
  );
}
