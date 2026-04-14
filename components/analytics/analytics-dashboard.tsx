"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { DateRangePicker, type DateRange } from "./date-range-picker";
import { TeamSummaryCards } from "./team-summary-cards";
import { AgentPerformanceTable } from "./agent-performance-table";
import { VolumeChart } from "./volume-chart";
import { LabelDistributionChart } from "./label-distribution-chart";
import { CustomerLifecycleChart } from "./customer-lifecycle-chart";
import { StageFunnelChart } from "./stage-funnel-chart";
import { ContactActivityTimeline } from "./contact-activity-timeline";

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
    <motion.div 
      className="space-y-6 p-4 md:p-6"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold font-sans tracking-tight text-foreground">
          {locale === "ar" ? "التحليلات" : "Analytics"}
        </h1>
        <DateRangePicker value={dateRange} onChange={setDateRange} locale={locale} />
      </div>

      <TeamSummaryCards dateRange={dateRange} locale={locale} />

      <AgentPerformanceTable dateRange={dateRange} locale={locale} />

      <VolumeChart dateRange={dateRange} locale={locale} />

      <LabelDistributionChart dateRange={dateRange} locale={locale} />

      <div className="grid gap-6 lg:grid-cols-2">
        <CustomerLifecycleChart locale={locale} />
        <StageFunnelChart locale={locale} />
      </div>

      <ContactActivityTimeline locale={locale} />
    </motion.div>
  );
}
