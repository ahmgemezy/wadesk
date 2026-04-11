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
    <Card>
      <CardHeader>
        <CardTitle>
          {locale === "ar" ? "حجم المحادثات" : "Conversation Volume"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div dir="ltr" className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="bucketLabel"
                tick={{ fontSize: 12 }}
                tickFormatter={(val: string) => val.slice(5)}
              />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                labelFormatter={(label) => String(label)}
                formatter={(value) => [Number(value), locale === "ar" ? "محادثات" : "Conversations"]}
              />
              <Bar
                dataKey="count"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
