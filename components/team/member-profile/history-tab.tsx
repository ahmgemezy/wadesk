"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/context";
import { DT } from "@/lib/design-tokens";
import { MessageSquare, ScrollText, Search, Phone } from "lucide-react";

type Conversation = {
  id: string;
  customerName: string | null;
  customerPhone: string | null;
  status: string;
  assignedAt: number | null;
  lastMessageAt: number;
};

type AuditEntry = {
  _id: string;
  action: string;
  timestamp: number;
};

type HistoryTabProps = {
  recentConversations: Conversation[] | undefined;
  auditLog: AuditEntry[] | undefined;
};

function formatAction(action: string, t: (en: string, ar: string) => string) {
  switch (action) {
    case "role_changed":
      return t("Role Changed", "تغيير الدور");
    case "removed":
      return t("Removed from Organization", "إزالة من المنظمة");
    default:
      return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function formatDate(ts: number, t: (en: string, ar: string) => string) {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays === 0) {
    return t("Today", "اليوم") + " " + date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) {
    return t("Yesterday", "أمس") + " " + date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays < 7) {
    return `${diffDays} ${t("days ago", "يوم مضت")}`;
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function ConversationSkeleton() {
  return (
    <div className={`${DT.CARD_SM} flex items-center justify-between p-3`}>
      <div className="flex flex-col gap-2">
        <div className="h-4 w-32 animate-pulse rounded bg-black/[0.06] dark:bg-white/[0.08]" />
        <div className="h-3 w-24 animate-pulse rounded bg-black/[0.06] dark:bg-white/[0.08]" />
      </div>
      <div className="h-5 w-16 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
    </div>
  );
}

function AuditLogSkeleton() {
  return (
    <div className={`${DT.CARD_SM} flex items-center justify-between p-3`}>
      <div className="h-4 w-36 animate-pulse rounded bg-black/[0.06] dark:bg-white/[0.08]" />
      <div className="h-3 w-24 animate-pulse rounded bg-black/[0.06] dark:bg-white/[0.08]" />
    </div>
  );
}

export function HistoryTab({ recentConversations, auditLog }: HistoryTabProps) {
  const t = useT();
  const [auditFilter, setAuditFilter] = useState("");

  const filteredAuditLog = auditLog
    ?.filter((entry) =>
      entry.action.toLowerCase().includes(auditFilter.toLowerCase()),
    );

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center gap-2">
          <MessageSquare className="size-4 text-[#6E6E73] dark:text-white/50" />
          <h3 className={DT.H3}>
            {t("Recent Conversations", "المحادثات الأخيرة")}
          </h3>
        </div>

        {recentConversations === undefined ? (
          <div className="space-y-2">
            <ConversationSkeleton />
            <ConversationSkeleton />
            <ConversationSkeleton />
          </div>
        ) : recentConversations.length === 0 ? (
          <p className={`rounded-2xl border border-dashed border-black/[0.10] dark:border-white/[0.10] py-8 text-center ${DT.MUTED}`}>
            {t("No recent conversations", "لا توجد محادثات حديثة")}
          </p>
        ) : (
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {recentConversations.map((conv) => (
              <div
                key={conv.id}
                className={DT.LIST_ITEM}
              >
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <span className={`${DT.BODY} font-medium truncate`}>{conv.customerName ?? conv.customerPhone ?? t("Unknown", "غير معروف")}</span>
                  <span className={`flex items-center gap-1 ${DT.MICRO}`} dir="ltr">
                    <Phone className="size-3" />
                    {conv.customerPhone}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={
                      conv.status === "pending"
                        ? DT.BADGE_AMBER
                        : conv.status === "resolved"
                          ? DT.BADGE_GREEN
                          : DT.BADGE_BLUE
                    }
                  >
                    {conv.status === "open"
                      ? t("Open", "مفتوح")
                      : conv.status === "pending"
                        ? t("Pending", "قيد الانتظار")
                        : t("Resolved", "تم الحل")}
                  </span>
                  <span className={DT.MICRO}>
                    {formatDate(conv.lastMessageAt, t)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <ScrollText className="size-4 text-[#6E6E73] dark:text-white/50" />
          <h3 className={DT.H3}>
            {t("Activity Log", "سجل النشاط")}
          </h3>
        </div>

        <div className="mb-3 relative">
          <Search className="absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#6E6E73] dark:text-white/50" />
          <input
            placeholder={t("Filter by action...", "تصفية حسب الإجراء...")}
            value={auditFilter}
            onChange={(e) => setAuditFilter(e.target.value)}
            className={`${DT.INPUT} ps-8`}
          />
        </div>

        {auditLog === undefined ? (
          <div className="space-y-2">
            <AuditLogSkeleton />
            <AuditLogSkeleton />
            <AuditLogSkeleton />
          </div>
        ) : !filteredAuditLog || filteredAuditLog.length === 0 ? (
          <p className={`rounded-2xl border border-dashed border-black/[0.10] dark:border-white/[0.10] py-8 text-center ${DT.MUTED}`}>
            {t("No activity recorded", "لا يوجد نشاط مسجل")}
          </p>
        ) : (
          <div className="max-h-96 space-y-1 overflow-y-auto">
            {filteredAuditLog.map((entry) => (
              <div
                key={entry._id}
                className={DT.LIST_ITEM}
              >
                <span className={`${DT.BODY} font-medium flex-1`}>
                  {formatAction(entry.action, t)}
                </span>
                <span className={DT.MICRO}>
                  {formatDate(entry.timestamp, t)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
