"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  MapPinIcon,
  CircleIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  MessageCircleIcon,
} from "lucide-react";

interface CustomerJourneyMapProps {
  contactId: Id<"contacts">;
  locale: "ar" | "en";
}

function getEventIcon(eventType: string) {
  switch (eventType.toLowerCase()) {
    case "account_upgraded":
      return <TrendingUpIcon className="size-4 text-emerald-500" />;
    case "churn_risk_detected":
    case "sla_breach":
      return <AlertTriangleIcon className="size-4 text-amber-500" />;
    case "conversation_started":
    case "support_ticket_opened":
      return <MessageCircleIcon className="size-4 text-primary" />;
    case "onboarding_completed":
      return <MapPinIcon className="size-4 text-indigo-500" />;
    default:
      return <CircleIcon className="size-3 text-muted-foreground" />;
  }
}

export function CustomerJourneyMap({ contactId, locale }: CustomerJourneyMapProps) {
  const journeys = useQuery(api.customerInsights.listJourneys, { contactId });
  const dateLocale = locale === "ar" ? ar : enUS;

  if (journeys === undefined) {
    return (
      <div className="flex justify-center p-8 text-sm text-muted-foreground animate-pulse">
        {locale === "ar" ? "جاري تحميل رحلة العميل..." : "Loading customer journey..."}
      </div>
    );
  }

  if (journeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border bg-muted/20">
        <MapPinIcon className="size-8 text-muted-foreground/50 mb-3" />
        <p className="text-sm font-medium text-foreground">
          {locale === "ar" ? "لا توجد أحداث" : "No journey events yet"}
        </p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          {locale === "ar"
            ? "سيتم تسجيل تفاعلات العميل الهامة هنا تلقائياً."
            : "Significant customer interactions will automatically appear here."}
        </p>
      </div>
    );
  }

  return (
    <div className="relative border-l-2 border-border/60 ml-3 pl-6 space-y-8 pb-4 before:absolute before:inset-y-0 before:-left-[1px] before:w-[2px] before:bg-gradient-to-b before:from-primary/30 before:via-transparent before:to-transparent">
      {journeys.map((event) => (
        <div key={event._id} className="relative group">
          {/* Timeline Node */}
          <span className="absolute -left-[35px] flex size-7 items-center justify-center rounded-full bg-background border shadow-sm ring-4 ring-background transition-transform group-hover:scale-110">
            {getEventIcon(event.eventType)}
          </span>

          {/* Content */}
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-semibold text-foreground">
              {event.eventType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {event.description}
            </p>
            <time className="text-xs text-muted-foreground/80 mt-1 font-medium">
              {formatDistanceToNow(event.timestamp, {
                addSuffix: true,
                locale: dateLocale,
              })}
            </time>
          </div>
        </div>
      ))}
    </div>
  );
}
