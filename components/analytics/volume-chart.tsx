"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { DT } from "@/lib/design-tokens";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DateRange } from "./date-range-picker";

interface VolumeChartProps {
  dateRange: DateRange;
  locale?: "ar" | "en";
}

export function VolumeChart({ dateRange, locale = "ar" }: VolumeChartProps) {
  const startTs = dateRange.from.getTime();
  const endTs = dateRange.to.getTime();

  const data = useQuery(api.analytics.getVolumeOverTime, { startTs, endTs });

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
          {locale === "ar" ? "حجم المحادثات" : "Conversation Volume"}
        </h2>
        <p className={`text-center py-8 ${DT.MUTED}`}>
          {locale === "ar" ? "لا توجد بيانات لهذه الفترة" : "No data for this period"}
        </p>
      </div>
    );
  }

  const accent = DT.CHART_COLORS[0];

  return (
    <div className={`${DT.CARD} ${DT.SHADOW_HOVER_LG} p-6`}>
      <h2 className={`${DT.H3} mb-4`}>
        {locale === "ar" ? "حجم المحادثات" : "Conversation Volume"}
      </h2>
      <div dir="ltr" tabIndex={0} className={`${DT.FOCUS_VISIBLE} h-[250px] sm:h-[300px] lg:h-[350px] w-full`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={accent} stopOpacity={0.4} />
                <stop offset="100%" stopColor={accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-black/[0.06] dark:stroke-white/[0.06]" />
            <XAxis
              dataKey="bucketLabel"
              axisLine={{ stroke: "rgba(127,127,127,0.15)", strokeWidth: 1 }}
              tickLine={{ stroke: "rgba(127,127,127,0.15)" }}
              tick={{ fontSize: 11, fill: "#6E6E73" }}
              tickFormatter={(val: string) => {
                const d = new Date(val + "T00:00:00");
                return d.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric" });
              }}
              dy={5}
              height={50}
              label={{
                value: locale === "ar" ? "التاريخ" : "Date",
                position: "insideBottom",
                offset: -10,
                fill: "#6E6E73",
                fontSize: 12,
                fontWeight: 500
              }}
            />
            <YAxis
              axisLine={{ stroke: "rgba(127,127,127,0.15)", strokeWidth: 1 }}
              tickLine={{ stroke: "rgba(127,127,127,0.15)" }}
              tick={{ fontSize: 11, fill: "#6E6E73" }}
              allowDecimals={false}
              width={60}
              label={{
                value: locale === "ar" ? "عدد المحادثات" : "Conversation Volume",
                angle: -90,
                position: "insideLeft",
                offset: 15,
                fill: "#6E6E73",
                fontSize: 12,
                fontWeight: 500,
                style: { textAnchor: "middle" }
              }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-xl border border-black/[0.08] bg-white/95 backdrop-blur-xl p-3 shadow-xl dark:bg-[#1C1C1E]/95 dark:border-white/[0.08]">
                      <p className={`text-[13px] font-medium mb-1.5 ${DT.TEXT_PRIMARY}`}>{label}</p>
                      <div className="flex items-center gap-2">
                        <div className="size-2.5 rounded-full" style={{ backgroundColor: accent }} />
                        <p className={`text-[13px] ${DT.TEXT_PRIMARY}`}>
                          {payload[0].value} <span className="text-[#6E6E73] dark:text-white/50">{locale === "ar" ? "محادثات" : "Conversations"}</span>
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={accent}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorCount)"
              activeDot={{ r: 6, strokeWidth: 0, fill: accent }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
