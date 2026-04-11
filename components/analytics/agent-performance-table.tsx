"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
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
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {locale === "ar" ? "أداء الوكلاء" : "Agent Performance"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
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
          {locale === "ar" ? "أداء الوكلاء" : "Agent Performance"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{locale === "ar" ? "اسم الوكيل" : "Agent Name"}</TableHead>
              <TableHead className="text-center">
                {locale === "ar" ? "المحادثات" : "Conversations"}
              </TableHead>
              <TableHead className="text-center">
                {locale === "ar" ? "متوسط وقت الرد" : "Avg Response Time"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((agent) => (
              <TableRow key={agent.agentId ?? "unassigned"}>
                <TableCell className="font-medium">{agent.agentName}</TableCell>
                <TableCell className="text-center">{agent.conversationsHandled}</TableCell>
                <TableCell className="text-center">
                  {formatResponseTime(agent.avgFirstResponseTimeSeconds, locale)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
