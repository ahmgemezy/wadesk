"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

const COLOR_HEX: Record<string, string> = {
  red: "#ef4444",
  green: "#22c55e",
  blue: "#3b82f6",
  yellow: "#facc15",
  purple: "#a855f7",
  orange: "#f97316",
  pink: "#ec4899",
  gray: "#9ca3af",
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

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {locale === "ar" ? "توزيع التصنيفات" : "Label Distribution"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            {locale === "ar" ? "لا توجد بيانات لهذه الفترة" : "No data for this period"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/40 backdrop-blur-xl border-border/50 shadow-2xl">
      <CardHeader>
        <CardTitle className="font-sans tracking-tight">
          {locale === "ar" ? "توزيع التصنيفات" : "Label Distribution"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div dir="ltr" className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <defs>
                {data.map((entry, index) => (
                  <linearGradient
                    key={`gradient-${index}`}
                    id={`barGradient-${index}`}
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
                    <stop
                      offset="0%"
                      stopColor={COLOR_HEX[entry.color] ?? "#9ca3af"}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="100%"
                      stopColor={COLOR_HEX[entry.color] ?? "#9ca3af"}
                      stopOpacity={0.4}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                className="stroke-muted/30"
              />
              <XAxis
                type="number"
                axisLine={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }}
                tickLine={{ stroke: "rgba(255,255,255,0.15)" }}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                allowDecimals={false}
                width={50}
              />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#d1d5db" }}
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
                    };
                    return (
                      <div className="rounded-lg border border-border/50 bg-background/80 backdrop-blur-xl p-3 shadow-xl">
                        <p className="text-sm font-medium mb-1.5">
                          {item.emoji ? `${item.emoji} ` : ""}
                          {translateLabel(item.name)}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="size-2.5 rounded-full bg-[#3b82f6] shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                          <p className="text-sm text-foreground">
                            {item.count}{" "}
                            <span className="text-muted-foreground">
                              {locale === "ar" ? "محادثات" : "conversations"}
                            </span>
                            <span className="text-muted-foreground ms-1">
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

        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border/30">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="size-2.5 rounded-full shrink-0"
                style={{ backgroundColor: COLOR_HEX[item.color] ?? "#9ca3af" }}
              />
              <span className="font-medium text-foreground/80">
                {item.emoji ? `${item.emoji} ` : ""}
                {translateLabel(item.name)}
              </span>
              <span>{item.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
