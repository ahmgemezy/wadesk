"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGE_CONFIG: Record<string, { en: string; ar: string; color: string; bgLight: string }> = {
  lead:     { en: "Lead",     ar: "عميل محتمل", color: "#3b82f6", bgLight: "bg-blue-500" },
  prospect: { en: "Prospect", ar: "مرشح",       color: "#a855f7", bgLight: "bg-purple-500" },
  customer: { en: "Customer", ar: "عميل",       color: "#22c55e", bgLight: "bg-green-500" },
  retained: { en: "Retained", ar: "عميل دائم", color: "#10b981", bgLight: "bg-emerald-500" },
  churned:  { en: "Churned",  ar: "مفقود",      color: "#ef4444", bgLight: "bg-red-500" },
};

interface StageFunnelChartProps {
  locale?: "ar" | "en";
}

export function StageFunnelChart({ locale = "ar" }: StageFunnelChartProps) {
  const data = useQuery(api.analytics.getStageDistribution);

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {locale === "ar" ? "قمع التحويل" : "Conversion Funnel"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            {locale === "ar" ? "لا توجد بيانات" : "No data available"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...data.funnel.map((s) => s.count), 1);

  return (
    <Card className="bg-card/40 backdrop-blur-xl border-border/50 shadow-2xl">
      <CardHeader>
        <CardTitle className="font-sans tracking-tight">
          {locale === "ar" ? "قمع التحويل" : "Conversion Funnel"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.funnel.map((stage, i) => {
            const config = STAGE_CONFIG[stage.stage];
            const widthPct = maxCount > 0 ? Math.max((stage.count / maxCount) * 100, 8) : 8;
            const label = config?.[locale === "ar" ? "ar" : "en"] ?? stage.stage;

            return (
              <div key={stage.stage}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{stage.count}</span>
                    {i > 0 && (
                      <span className="text-xs text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                        {stage.conversionRate}%
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className="h-10 rounded-lg transition-all duration-500 flex items-center justify-center relative overflow-hidden"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: config?.color ?? "#9ca3af",
                    marginInline: "auto",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0" />
                  <span className="relative text-xs font-semibold text-white drop-shadow-sm">
                    {stage.count > 0
                      ? `${Math.round((stage.count / data.total) * 100)}%`
                      : ""}
                  </span>
                </div>

                {i < data.funnel.length - 1 && (
                  <div className="flex items-center justify-center py-1.5 text-muted-foreground">
                    <ArrowDown className="size-3.5" />
                    <span className="text-xs mx-1">
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
            <div className="mt-4 pt-4 border-t border-border/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-red-500" />
                  {STAGE_CONFIG.churned[locale === "ar" ? "ar" : "en"]}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-red-500">{data.churned}</span>
                  <span className="text-xs text-muted-foreground">
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

        <div className="mt-4 pt-4 border-t border-border/30">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">
                {locale === "ar" ? "إجمالي العملاء" : "Total Contacts"}
              </p>
              <p className="text-lg font-bold">{data.total}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">
                {locale === "ar" ? "معدل الاحتفاظ" : "Retention Rate"}
              </p>
              <p className="text-lg font-bold">
                {data.total > 0
                  ? `${Math.round(((data.distribution.find((d) => d.stage === "retained")?.count ?? 0) / data.total) * 100)}%`
                  : "0%"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
