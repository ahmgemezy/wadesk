"use client";

import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { DT } from "@/lib/design-tokens";
import type { DateRange } from "./date-range-picker";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";

function AnimatedCounter({ value, duration = 1 }: { value: number, duration?: number }) {
  const [hasMounted, setHasMounted] = useState(false);
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest).toLocaleString());

  useEffect(() => {
    setHasMounted(true);
    const controls = animate(count, value, { duration, ease: "easeOut" });
    return controls.stop;
  }, [value, count, duration]);

  if (!hasMounted) return <>{value.toLocaleString()}</>;
  return <motion.span>{rounded}</motion.span>;
}

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
  const { isAuthenticated } = useConvexAuth();

  const data = useQuery(api.analytics.getTeamSummary, { startTs, endTs });
  const csatData = useQuery(
    api.csat.getAverageScorePublic,
    isAuthenticated ? { fromTimestamp: startTs } : "skip"
  );

  if (!data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${DT.CARD_SM} p-5`}>
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (data.totalConversations === 0) {
    return (
      <div className={`text-center py-8 ${DT.MUTED}`}>
        {locale === "ar" ? "لا توجد بيانات لهذه الفترة" : "No data for this period"}
      </div>
    );
  }

  const cards: { id: string; label: string; value: string | number; isNumeric: boolean; suffix?: string; subtext?: string }[] = [
    {
      id: "conversations",
      label: locale === "ar" ? "إجمالي المحادثات" : "Total Conversations",
      value: data.totalConversations,
      isNumeric: true,
    },
    {
      id: "responseTime",
      label: locale === "ar" ? "متوسط وقت الرد" : "Avg. First Response Time",
      value: formatResponseTime(data.avgFirstResponseTimeSeconds, locale),
      isNumeric: false,
    },
    {
      id: "messages",
      label: locale === "ar" ? "إجمالي الرسائل" : "Total Messages",
      value: data.totalMessages,
      isNumeric: true,
    },
    {
      id: "csat",
      label: locale === "ar" ? "متوسط تقييم CSAT" : "Avg CSAT Score",
      value: csatData === undefined
        ? "..."
        : csatData === null
          ? (locale === "ar" ? "لا توجد بيانات" : "No data")
          : csatData.average,
      isNumeric: typeof csatData?.average === "number",
      suffix: csatData ? "/ 5" : undefined,
      subtext: csatData
        ? (locale === "ar" ? `من ${csatData.count} تقييم` : `from ${csatData.count} ratings`)
        : undefined,
    },
  ];

  return (
    <motion.div 
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
    >
      {cards.map((card) => (
        <motion.div key={card.id} variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}>
          <div className={`${DT.CARD_SM} overflow-hidden relative p-5`}>
            <div className={`${DT.MICRO} mb-2`}>
              {card.label}
            </div>
            <div className="text-[32px] font-semibold tracking-[-0.5px] text-[#1D1D1F] dark:text-white">
              {card.isNumeric ? <AnimatedCounter value={card.value as number} /> : card.value}
              {card.suffix && (
                <span className={`${DT.MUTED} ms-1`}>{card.suffix}</span>
              )}
            </div>
            {card.subtext && (
              <p className={`${DT.MICRO} mt-1`}>{card.subtext}</p>
            )}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
