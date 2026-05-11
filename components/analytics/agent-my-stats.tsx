"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { DT } from "@/lib/design-tokens";

interface AgentMyStatsProps {
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

export function AgentMyStats({ locale = "ar" }: AgentMyStatsProps) {
  const data = useQuery(api.analytics.getMyStats, {});

  const cards = data
    ? [
        {
          label: locale === "ar" ? "محادثاتي هذا الشهر" : "My Conversations This Month",
          value: data.conversationsHandled.toLocaleString(),
        },
        {
          label: locale === "ar" ? "متوسط وقت الرد" : "Avg. First Response Time",
          value: formatResponseTime(data.avgFirstResponseTimeSeconds, locale),
        },
      ]
    : [];

  if (!data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 p-4 md:p-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className={`${DT.CARD_SM} p-5`}>
            <Skeleton className="h-4 w-32 mb-3" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 p-4 md:p-6">
      {cards.map((card) => (
        <div key={card.label} className={`${DT.CARD_SM} p-5`}>
          <div className={`${DT.MICRO} mb-2`}>
            {card.label}
          </div>
          <div className={`text-[32px] font-semibold tracking-[-0.5px] ${DT.TEXT_PRIMARY}`}>{card.value}</div>
        </div>
      ))}
    </div>
  );
}
