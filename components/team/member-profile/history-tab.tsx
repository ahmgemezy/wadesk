"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/context";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex flex-col gap-2">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
    </div>
  );
}

function AuditLogSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="h-4 w-36 animate-pulse rounded bg-muted" />
      <div className="h-3 w-24 animate-pulse rounded bg-muted" />
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
          <MessageSquare className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">
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
          <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            {t("No recent conversations", "لا توجد محادثات حديثة")}
          </p>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {recentConversations.map((conv) => (
              <div
                key={conv.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{conv.customerName ?? conv.customerPhone ?? t("Unknown", "غير معروف")}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground" dir="ltr">
                    <Phone className="size-3" />
                    {conv.customerPhone}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge
                    variant={
                      conv.status === "open"
                        ? "default"
                        : conv.status === "pending"
                          ? "secondary"
                          : "outline"
                    }
                    className={
                      conv.status === "pending"
                        ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                        : conv.status === "resolved"
                          ? "border-green-500/30 text-green-600 dark:text-green-400"
                          : ""
                    }
                  >
                    {conv.status === "open"
                      ? t("Open", "مفتوح")
                      : conv.status === "pending"
                        ? t("Pending", "قيد الانتظار")
                        : t("Resolved", "تم الحل")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
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
          <ScrollText className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">
            {t("Activity Log", "سجل النشاط")}
          </h3>
        </div>

        <div className="mb-3 relative">
          <Search className="absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("Filter by action...", "تصفية حسب الإجراء...")}
            value={auditFilter}
            onChange={(e) => setAuditFilter(e.target.value)}
            className="ps-8"
          />
        </div>

        {auditLog === undefined ? (
          <div className="space-y-2">
            <AuditLogSkeleton />
            <AuditLogSkeleton />
            <AuditLogSkeleton />
          </div>
        ) : !filteredAuditLog || filteredAuditLog.length === 0 ? (
          <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            {t("No activity recorded", "لا يوجد نشاط مسجل")}
          </p>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {filteredAuditLog.map((entry) => (
              <div
                key={entry._id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <span className="text-sm font-medium">
                  {formatAction(entry.action, t)}
                </span>
                <span className="text-xs text-muted-foreground">
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
