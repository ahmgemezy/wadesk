"use client";

import { useState } from "react";
import { DateRangePicker, type DateRange } from "./date-range-picker";
import { TeamSummaryCards } from "./team-summary-cards";
import { AgentPerformanceTable } from "./agent-performance-table";
import { VolumeChart } from "./volume-chart";

interface AnalyticsDashboardProps {
  locale?: "ar" | "en";
}

export function AnalyticsDashboard({ locale = "ar" }: AnalyticsDashboardProps) {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from, to };
  });

  return (
    <div className="space-y-6 p-4 md:p-6" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">
          {locale === "ar" ? "التحليلات" : "Analytics"}
        </h1>
        <DateRangePicker value={dateRange} onChange={setDateRange} locale={locale} />
      </div>

      <TeamSummaryCards dateRange={dateRange} locale={locale} />

      <AgentPerformanceTable dateRange={dateRange} locale={locale} />

      <VolumeChart dateRange={dateRange} locale={locale} />
    </div>
  );
}
