"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { DT } from "@/lib/design-tokens";
import { ArrowDown } from "lucide-react";

const STAGE_CONFIG: Record<string, { en: string; ar: string; color: string }> = {
  lead:     { en: "Lead",     ar: "عميل محتمل", color: "#0071E3" },
  prospect: { en: "Prospect", ar: "مرشح",       color: "#AF52DE" },
  customer: { en: "Customer", ar: "عميل",       color: "#34C759" },
  retained: { en: "Retained", ar: "عميل دائم", color: "#5AC8FA" },
  churned:  { en: "Churned",  ar: "مفقود",      color: "#FF3B30" },
};

interface StageFunnelChartProps {
  locale?: "ar" | "en";
}

export function StageFunnelChart({ locale = "ar" }: StageFunnelChartProps) {
  const data = useQuery(api.analytics.getStageDistribution);

  if (!data) {
    return (
      <div className={`${DT.CARD} p-6`}>
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (data.total === 0) {
    return (
      <div className={`${DT.CARD} p-6`}>
        <h2 className={`${DT.H3} mb-4`}>
          {locale === "ar" ? "قمع التحويل" : "Conversion Funnel"}
        </h2>
        <p className={`text-center py-8 ${DT.MUTED}`}>
          {locale === "ar" ? "لا توجد بيانات" : "No data available"}
        </p>
      </div>
    );
  }

  const maxCount = Math.max(...data.funnel.map((s) => s.count), 1);

  return (
    <div className={`${DT.CARD} p-6`}>
      <h2 className={`${DT.H3} mb-4`}>
        {locale === "ar" ? "قمع التحويل" : "Conversion Funnel"}
      </h2>
      <div className="space-y-2">
          {data.funnel.map((stage, i) => {
            const config = STAGE_CONFIG[stage.stage];
            const widthPct = maxCount > 0 ? Math.max((stage.count / maxCount) * 100, 8) : 8;
            const label = config?.[locale === "ar" ? "ar" : "en"] ?? stage.stage;

            return (
              <div key={stage.stage}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[13px] font-medium ${DT.TEXT_PRIMARY}`}>{label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[13px] font-semibold ${DT.TEXT_PRIMARY}`}>{stage.count}</span>
                    {i > 0 && (
                      <span className={`${DT.MICRO} bg-black/[0.06] dark:bg-white/[0.08] px-1.5 py-0.5 rounded`}>
                        {stage.conversionRate}%
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className="h-10 rounded-lg transition-all duration-500 flex items-center justify-center relative overflow-hidden"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: config?.color ?? "#8E8E93",
                    marginInline: "auto",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0" />
                  <span className="relative text-[12px] font-semibold text-white drop-shadow-sm">
                    {stage.count > 0
                      ? `${Math.round((stage.count / data.total) * 100)}%`
                      : ""}
                  </span>
                </div>

                {i < data.funnel.length - 1 && (
                  <div className={`flex items-center justify-center py-1.5 ${DT.MUTED}`}>
                    <ArrowDown className="size-3.5" />
                    <span className="text-[11px] mx-1">
                      {stage.conversionRate > 0
                        ? `${data.funnel[i + 1].conversionRate}% ${locale === "ar" ? "تحويل" : "conversion"}`
                        : ""}
                    </span>
                    <ArrowDown className="size-3.5" />
                  </div>
                )}
              </div>
            );
          })}

          {data.churned > 0 && (
            <div className={`mt-4 pt-4 ${DT.DIVIDER}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[13px] font-medium flex items-center gap-1.5 ${DT.TEXT_PRIMARY}`}>
                  <span className={`size-2.5 rounded-full ${DT.BG_RED}`} />
                  {STAGE_CONFIG.churned[locale === "ar" ? "ar" : "en"]}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-[13px] font-semibold ${DT.TEXT_RED}`}>{data.churned}</span>
                  <span className={DT.MICRO}>
                    {data.total > 0 ? `${Math.round((data.churned / data.total) * 100)}%` : "0%"}
                  </span>
                </div>
              </div>
              <div
                className="h-8 rounded-lg transition-all duration-500 mx-auto relative overflow-hidden"
                style={{
                  width: `${Math.max((data.churned / maxCount) * 100, 8)}%`,
                  backgroundColor: STAGE_CONFIG.churned.color,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0" />
              </div>
            </div>
          )}
        </div>

        <div className={`mt-4 pt-4 ${DT.DIVIDER}`}>
          <div className="grid grid-cols-2 gap-3">
            <div className={`${DT.CARD_FLAT} p-3`}>
              <p className={DT.MICRO}>
                {locale === "ar" ? "إجمالي العملاء" : "Total Contacts"}
              </p>
              <p className={`text-[17px] font-semibold ${DT.TEXT_PRIMARY}`}>{data.total}</p>
            </div>
            <div className={`${DT.CARD_FLAT} p-3`}>
              <p className={DT.MICRO}>
                {locale === "ar" ? "معدل الاحتفاظ" : "Retention Rate"}
              </p>
              <p className={`text-[17px] font-semibold ${DT.TEXT_PRIMARY}`}>
                {data.total > 0
                  ? `${Math.round(((data.distribution.find((d) => d.stage === "retained")?.count ?? 0) / data.total) * 100)}%`
                  : "0%"}
              </p>
            </div>
          </div>
        </div>
    </div>
  );
}
