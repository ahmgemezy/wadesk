"use client";

import { MessageCircle, CheckCircle, RefreshCw, CalendarClock, CheckCheck, FileText, Tag, UserCheck, TrendingDown, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { DT } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

// Type matching what Convex returns from contactEvents.getTimeline
interface ContactEvent {
  _id: string;
  type:
    | "stage_changed"
    | "assigned"
    | "note_updated"
    | "tags_changed"
    | "followup_scheduled"
    | "followup_sent"
    | "followup_failed"
    | "conversation_started"
    | "conversation_resolved"
    | "lost";
  actorId?: string;
  metadata: Record<string, unknown>;
  createdAt: number;
}

interface Props {
  events: ContactEvent[];
  locale: "ar" | "en";
  compact?: boolean;
}

const EVENT_ICONS: Record<ContactEvent["type"], React.ElementType> = {
  conversation_started: MessageCircle,
  conversation_resolved: CheckCircle,
  stage_changed: RefreshCw,
  followup_scheduled: CalendarClock,
  followup_sent: CheckCheck,
  note_updated: FileText,
  tags_changed: Tag,
  assigned: UserCheck,
  followup_failed: TrendingDown,
  lost: XCircle,
};

const EVENT_COLORS: Record<ContactEvent["type"], string> = {
  conversation_started: "text-blue-500",
  conversation_resolved: "text-green-500",
  stage_changed: "text-purple-500",
  followup_scheduled: "text-amber-500",
  followup_sent: "text-green-500",
  note_updated: "text-gray-500",
  tags_changed: "text-gray-500",
  assigned: "text-blue-500",
  followup_failed: "text-red-500",
  lost: "text-red-500",
};

function eventLabel(event: ContactEvent, locale: "ar" | "en"): string {
  const isAr = locale === "ar";
  const m = event.metadata;
  switch (event.type) {
    case "stage_changed":
      return isAr
        ? `تغيير المرحلة: ${m.from} ← ${m.to}`
        : `Stage changed: ${m.from} → ${m.to}`;
    case "assigned":
      return isAr ? "تم التعيين لوكيل" : "Assigned to agent";
    case "note_updated":
      return isAr
        ? `ملاحظة: ${String(m.preview ?? "").slice(0, 60)}`
        : `Note: ${String(m.preview ?? "").slice(0, 60)}`;
    case "tags_changed":
      return isAr ? "تم تحديث التصنيفات" : "Tags updated";
    case "followup_scheduled":
      return isAr ? "تمت جدولة متابعة" : "Follow-up scheduled";
    case "followup_sent":
      return isAr ? "تم إرسال المتابعة" : "Follow-up sent";
    case "followup_failed":
      return isAr ? "فشل إرسال المتابعة" : "Follow-up failed";
    case "conversation_started":
      return isAr ? "بدأت محادثة" : "Conversation started";
    case "conversation_resolved":
      return isAr ? "تم حل المحادثة" : "Conversation resolved";
    case "lost":
      return isAr ? "فُقد العميل" : "Contact lost";
  }
}

export function ContactTimeline({ events, locale, compact = false }: Props) {
  const isRtl = locale === "ar";
  const dateLocale = isRtl ? ar : enUS;
  const displayed = compact ? events.slice(0, 5) : events;

  if (displayed.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        {isRtl ? "لا توجد أحداث" : "No events yet"}
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {displayed.map((event) => {
        const Icon = EVENT_ICONS[event.type];
        const color = EVENT_COLORS[event.type];
        return (
          <li key={event._id} className="flex gap-3 items-start">
            <span className={cn("mt-0.5 shrink-0", color)}>
              <Icon className={`${DT.MICRO}`} />
            </span>
            <div className="flex-1 min-w-0">
              <p className={DT.MUTED}>{eventLabel(event, locale)}</p>
              <p className={`${DT.MICRO} text-muted-foreground mt-0.5`}>
                {formatDistanceToNow(new Date(event.createdAt), {
                  addSuffix: true,
                  locale: dateLocale,
                })}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
