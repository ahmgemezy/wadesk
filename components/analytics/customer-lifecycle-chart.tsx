"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { DT } from "@/lib/design-tokens";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const STAGE_CONFIG: Record<string, { en: string; ar: string; color: string }> = {
  lead:     { en: "Lead",     ar: "عميل محتمل", color: "#0071E3" },
  prospect: { en: "Prospect", ar: "مرشح",       color: "#AF52DE" },
  customer: { en: "Customer", ar: "عميل",       color: "#34C759" },
  retained: { en: "Retained", ar: "عميل دائم", color: "#5AC8FA" },
  churned:  { en: "Churned",  ar: "مفقود",      color: "#FF3B30" },
};

interface CustomerLifecycleChartProps {
  locale?: "ar" | "en";
}

export function CustomerLifecycleChart({ locale = "ar" }: CustomerLifecycleChartProps) {
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
          {locale === "ar" ? "مراحل دورة حياة العملاء" : "Customer Lifecycle Stages"}
        </h2>
        <p className={`text-center py-8 ${DT.MUTED}`}>
          {locale === "ar" ? "لا توجد بيانات" : "No data available"}
        </p>
      </div>
    );
  }

  const chartData = data.distribution.map((d) => ({
    name: STAGE_CONFIG[d.stage]?.[locale === "ar" ? "ar" : "en"] ?? d.stage,
    value: d.count,
    stage: d.stage,
    percentage: d.percentage,
    color: STAGE_CONFIG[d.stage]?.color ?? "#8E8E93",
  }));

  return (
    <div className={`${DT.CARD} p-6`}>
      <h2 className={`${DT.H3} mb-4`}>
        {locale === "ar" ? "مراحل دورة حياة العملاء" : "Customer Lifecycle Stages"}
      </h2>
      <div dir="ltr" className="h-64 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as {
                      name: string;
                      value: number;
                      percentage: number;
                      color: string;
                    };
                    return (
                      <div className="rounded-xl border border-black/[0.08] bg-white/95 backdrop-blur-xl p-3 shadow-xl dark:bg-[#1C1C1E]/95 dark:border-white/[0.08]">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <p className={`text-[13px] font-medium ${DT.TEXT_PRIMARY}`}>{item.name}</p>
                        </div>
                        <p className={`text-[13px] ${DT.TEXT_PRIMARY}`}>
                          {item.value}{" "}
                          <span className="text-[#6E6E73] dark:text-white/50">
                            {locale === "ar" ? "جهة اتصال" : "contacts"} ({item.percentage}%)
                          </span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className={`text-[32px] font-semibold tracking-[-0.5px] ${DT.TEXT_PRIMARY}`}>{data.total}</span>
            <span className={DT.MICRO}>
              {locale === "ar" ? "إجمالي العملاء" : "Total Contacts"}
            </span>
          </div>
        </div>

        <div className={`flex flex-wrap justify-center gap-4 mt-4 pt-4 ${DT.DIVIDER}`}>
          {chartData.map((item) => (
            <div key={item.stage} className={`flex items-center gap-1.5 ${DT.MICRO}`}>
              <span
                className="size-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className={`font-medium ${DT.TEXT_PRIMARY}`}>{item.name}</span>
              <span>
                {item.value} ({item.percentage}%)
              </span>
            </div>
          ))}
        </div>
    </div>
  );
}
