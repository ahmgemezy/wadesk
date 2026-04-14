"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const STAGE_CONFIG: Record<string, { en: string; ar: string; color: string }> = {
  lead:     { en: "Lead",     ar: "عميل محتمل", color: "#3b82f6" },
  prospect: { en: "Prospect", ar: "مرشح",       color: "#a855f7" },
  customer: { en: "Customer", ar: "عميل",       color: "#22c55e" },
  retained: { en: "Retained", ar: "عميل دائم", color: "#10b981" },
  churned:  { en: "Churned",  ar: "مفقود",      color: "#ef4444" },
};

interface CustomerLifecycleChartProps {
  locale?: "ar" | "en";
}

export function CustomerLifecycleChart({ locale = "ar" }: CustomerLifecycleChartProps) {
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
            {locale === "ar" ? "مراحل دورة حياة العملاء" : "Customer Lifecycle Stages"}
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

  const chartData = data.distribution.map((d) => ({
    name: STAGE_CONFIG[d.stage]?.[locale === "ar" ? "ar" : "en"] ?? d.stage,
    value: d.count,
    stage: d.stage,
    percentage: d.percentage,
    color: STAGE_CONFIG[d.stage]?.color ?? "#9ca3af",
  }));

  return (
    <Card className="bg-card/40 backdrop-blur-xl border-border/50 shadow-2xl">
      <CardHeader>
        <CardTitle className="font-sans tracking-tight">
          {locale === "ar" ? "مراحل دورة حياة العملاء" : "Customer Lifecycle Stages"}
        </CardTitle>
      </CardHeader>
      <CardContent>
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
                      <div className="rounded-lg border border-border/50 bg-background/80 backdrop-blur-xl p-3 shadow-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <p className="text-sm font-medium">{item.name}</p>
                        </div>
                        <p className="text-sm text-foreground">
                          {item.value}{" "}
                          <span className="text-muted-foreground">
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
            <span className="text-3xl font-bold tracking-tight font-sans">{data.total}</span>
            <span className="text-xs text-muted-foreground">
              {locale === "ar" ? "إجمالي العملاء" : "Total Contacts"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mt-4 pt-4 border-t border-border/30">
          {chartData.map((item) => (
            <div key={item.stage} className="flex items-center gap-1.5 text-xs">
              <span
                className="size-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium text-foreground/80">{item.name}</span>
              <span className="text-muted-foreground">
                {item.value} ({item.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
