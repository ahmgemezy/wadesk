"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DT } from "@/lib/design-tokens";
import type { DateRange } from "./date-range-picker";

interface AgentPerformanceTableProps {
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

export function AgentPerformanceTable({ dateRange, locale = "ar" }: AgentPerformanceTableProps) {
  const startTs = dateRange.from.getTime();
  const endTs = dateRange.to.getTime();

  const data = useQuery(api.analytics.getAgentPerformance, { startTs, endTs });

  if (!data) {
    return (
      <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.06] p-6">
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.06] p-6">
        <h2 className={`${DT.H3} mb-4 ${locale === "ar" ? "text-right" : ""}`}>
          {locale === "ar" ? "أداء الوكلاء" : "Agent Performance"}
        </h2>
        <p className={`text-center py-4 ${DT.MUTED}`}>
          {locale === "ar" ? "لا توجد بيانات لهذه الفترة" : "No data for this period"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.06] p-6">
      <h2 className={`${DT.H3} mb-4 ${locale === "ar" ? "text-right" : ""}`}>
        {locale === "ar" ? "أداء الوكلاء" : "Agent Performance"}
      </h2>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent border-black/[0.08] dark:border-white/[0.06]">
            <TableHead className={`${DT.SEC} text-start`}>
              {locale === "ar" ? "اسم الوكيل" : "Agent Name"}
            </TableHead>
            <TableHead className={`${DT.SEC} text-center`}>
              {locale === "ar" ? "المحادثات" : "Conversations"}
            </TableHead>
            <TableHead className={`${DT.SEC} text-center`}>
              {locale === "ar" ? "متوسط وقت الرد" : "Avg Response Time"}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((agent) => (
            <TableRow key={agent.agentId ?? "unassigned"} className="border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]">
              <TableCell className={`font-medium text-[14px] ${DT.TEXT_PRIMARY} text-start`}>{agent.agentName}</TableCell>
              <TableCell className={`text-center text-[14px] font-medium ${DT.TEXT_PRIMARY}`}>{agent.conversationsHandled}</TableCell>
              <TableCell className={`text-center ${DT.BODY}`}>
                {formatResponseTime(agent.avgFirstResponseTimeSeconds, locale)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
