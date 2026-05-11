"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { DT } from "@/lib/design-tokens";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { DateRange } from "./date-range-picker";
import { useTranslatedLabel } from "@/lib/i18n/context";

// Map legacy semantic color names → Apple palette equivalents so existing
// data flowing through still renders with a consistent token-driven palette.
const COLOR_HEX: Record<string, string> = {
  red: "#FF3B30",
  green: "#34C759",
  blue: "#0071E3",
  yellow: "#FF9500",
  purple: "#AF52DE",
  orange: "#FF9500",
  pink: "#FF3B30",
  gray: "#8E8E93",
};

interface LabelDistributionChartProps {
  dateRange: DateRange;
  locale?: "ar" | "en";
}

export function LabelDistributionChart({ dateRange, locale = "ar" }: LabelDistributionChartProps) {
  const startTs = dateRange.from.getTime();
  const endTs = dateRange.to.getTime();

  const data = useQuery(api.analytics.getLabelDistribution, { startTs, endTs });
  const translateLabel = useTranslatedLabel();

  if (!data) {
    return (
      <div className={`${DT.CARD} p-6`}>
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`${DT.CARD} p-6`}>
        <h2 className={`${DT.H3} mb-4`}>
          {locale === "ar" ? "توزيع التصنيفات" : "Label Distribution"}
        </h2>
        <p className={`text-center py-8 ${DT.MUTED}`}>
          {locale === "ar" ? "لا توجد بيانات لهذه الفترة" : "No data for this period"}
        </p>
      </div>
    );
  }

  return (
    <div className={`${DT.CARD} p-6`}>
      <h2 className={`${DT.H3} mb-4`}>
        {locale === "ar" ? "توزيع التصنيفات" : "Label Distribution"}
      </h2>
      <div dir="ltr" className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <defs>
                {data.map((entry, index) => {
                  const fill = COLOR_HEX[entry.color] ?? DT.CHART_COLORS[index % DT.CHART_COLORS.length];
                  return (
                    <linearGradient
                      key={`gradient-${index}`}
                      id={`barGradient-${index}`}
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor={fill} stopOpacity={0.85} />
                      <stop offset="100%" stopColor={fill} stopOpacity={0.45} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                className="stroke-black/[0.06] dark:stroke-white/[0.06]"
              />
              <XAxis
                type="number"
                axisLine={{ stroke: "rgba(127,127,127,0.15)", strokeWidth: 1 }}
                tickLine={{ stroke: "rgba(127,127,127,0.15)" }}
                tick={{ fontSize: 11, fill: "#6E6E73" }}
                allowDecimals={false}
                width={50}
              />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={{ stroke: "rgba(127,127,127,0.15)", strokeWidth: 1 }}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#6E6E73" }}
                width={100}
                tickFormatter={(val: string) => translateLabel(val)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as {
                      name: string;
                      count: number;
                      percentage: number;
                      emoji?: string;
                      color: string;
                    };
                    const dot = COLOR_HEX[item.color] ?? DT.CHART_COLORS[0];
                    return (
                      <div className="rounded-xl border border-black/[0.08] bg-white/95 backdrop-blur-xl p-3 shadow-xl dark:bg-[#1C1C1E]/95 dark:border-white/[0.08]">
                        <p className={`text-[13px] font-medium mb-1.5 ${DT.TEXT_PRIMARY}`}>
                          {item.emoji ? `${item.emoji} ` : ""}
                          {translateLabel(item.name)}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="size-2.5 rounded-full" style={{ backgroundColor: dot }} />
                          <p className={`text-[13px] ${DT.TEXT_PRIMARY}`}>
                            {item.count}{" "}
                            <span className="text-[#6E6E73] dark:text-white/50">
                              {locale === "ar" ? "محادثات" : "conversations"}
                            </span>
                            <span className="text-[#6E6E73] dark:text-white/50 ms-1">
                              ({item.percentage}%)
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="count"
                radius={[0, 6, 6, 0]}
                barSize={28}
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`url(#barGradient-${index})`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={`flex flex-wrap gap-3 mt-4 pt-4 ${DT.DIVIDER}`}>
          {data.map((item, index) => (
            <div key={item.name} className={`flex items-center gap-1.5 ${DT.MICRO}`}>
              <span
                className="size-2.5 rounded-full shrink-0"
                style={{ backgroundColor: COLOR_HEX[item.color] ?? DT.CHART_COLORS[index % DT.CHART_COLORS.length] }}
              />
              <span className={`font-medium ${DT.TEXT_PRIMARY}`}>
                {item.emoji ? `${item.emoji} ` : ""}
                {translateLabel(item.name)}
              </span>
              <span>{item.count}</span>
            </div>
          ))}
        </div>
    </div>
  );
}
