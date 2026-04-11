"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DateRange } from "./date-range-picker";

interface TeamSummaryCardsProps {
  dateRange: DateRange;
  locale?: "ar" | "en";
}

function formatResponseTime(seconds: number | null, locale: "ar" | "en"): string {
  if (seconds === null) return "—";
  if (seconds < 60) {
    return locale === "ar"
      ? `${Math.round(seconds)} ثانية`
      : `${Math.round(seconds)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) {
    return locale === "ar"
      ? `${mins} د ${secs} ث`
      : `${mins}m ${secs}s`;
  }
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return locale === "ar"
    ? `${hours} س ${remainMins} د`
    : `${hours}h ${remainMins}m`;
}

export function TeamSummaryCards({ dateRange, locale = "ar" }: TeamSummaryCardsProps) {
  const startTs = dateRange.from.getTime();
  const endTs = dateRange.to.getTime();

  const data = useQuery(api.analytics.getTeamSummary, { startTs, endTs });

  if (!data) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (data.totalConversations === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {locale === "ar" ? "لا توجد بيانات لهذه الفترة" : "No data for this period"}
      </div>
    );
  }

  const cards = [
    {
      label: locale === "ar" ? "إجمالي المحادثات" : "Total Conversations",
      value: data.totalConversations.toLocaleString(),
    },
    {
      label: locale === "ar" ? "متوسط وقت الرد" : "Avg. First Response Time",
      value: formatResponseTime(data.avgFirstResponseTimeSeconds, locale),
    },
    {
      label: locale === "ar" ? "إجمالي الرسائل" : "Total Messages",
      value: data.totalMessages.toLocaleString(),
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
