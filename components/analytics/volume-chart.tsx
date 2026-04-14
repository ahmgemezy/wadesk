"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
            {locale === "ar" ? "حجم المحادثات" : "Conversation Volume"}
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
          {locale === "ar" ? "حجم المحادثات" : "Conversation Volume"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div dir="ltr" className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/30" />
              <XAxis
                dataKey="bucketLabel"
                axisLine={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }}
                tickLine={{ stroke: "rgba(255,255,255,0.15)" }}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
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
                  fill: "#6b7280",
                  fontSize: 12,
                  fontWeight: 500
                }}
              />
              <YAxis 
                axisLine={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }}
                tickLine={{ stroke: "rgba(255,255,255,0.15)" }}
                tick={{ fontSize: 11, fill: "#9ca3af" }} 
                allowDecimals={false} 
                width={60}
                label={{ 
                  value: locale === "ar" ? "عدد المحادثات" : "Conversation Volume", 
                  angle: -90, 
                  position: "insideLeft", 
                  offset: 15,
                  fill: "#6b7280",
                  fontSize: 12,
                  fontWeight: 500,
                  style: { textAnchor: "middle" }
                }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border border-border/50 bg-background/80 backdrop-blur-xl p-3 shadow-xl">
                        <p className="text-sm font-medium mb-1.5">{label}</p>
                        <div className="flex items-center gap-2">
                          <div className="size-2.5 rounded-full bg-[#3b82f6] shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                          <p className="text-sm text-foreground">
                            {payload[0].value} <span className="text-muted-foreground">{locale === "ar" ? "محادثات" : "Conversations"}</span>
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
                stroke="#3b82f6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorCount)"
                activeDot={{ r: 6, strokeWidth: 0, fill: "#3b82f6", filter: "drop-shadow(0px 0px 4px rgba(59,130,246,0.8))" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
