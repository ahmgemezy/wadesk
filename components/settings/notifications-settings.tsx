"use client";

import { useState } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { useOrganization } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Clock, Trash2, Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { notificationRoute } from "@/lib/notification-routes";
import { useT } from "@/lib/i18n/context";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { useLocale } from "@/lib/i18n/context";

export function NotificationsSettings() {
  const t = useT();
  const locale = useLocale();
  const isRtl = locale === "ar";
  const router = useRouter();

  const { isAuthenticated } = useConvexAuth();
  const { membership } = useOrganization();
  const role = membership?.role as string | undefined;
  const isAdmin = role === "org:admin" || role === "admin";

  const notificationsQuery = useQuery(
    api.notifications.listAllForUser,
    isAuthenticated ? undefined : "skip",
  );
  const notifications = notificationsQuery ?? [];

  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const removeOne = useMutation(api.notifications.remove);
  const removeAll = useMutation(api.notifications.removeAll);

  const [busy, setBusy] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function handleClick(
    notificationId: Id<"notifications">,
    type: string,
    referenceId: string,
    isRead: boolean,
  ) {
    if (!isRead) {
      markRead({ notificationId }).catch(() => {});
    }
    router.push(notificationRoute(type, referenceId));
  }

  async function handleMarkAllRead() {
    setBusy(true);
    try {
      await markAllRead();
      toast.success(t("All marked as read", "تم تحديد الكل كمقروء"));
    } catch {
      toast.error(t("Failed", "فشل"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(notificationId: Id<"notifications">) {
    if (!confirm(t("Delete this notification?", "حذف هذا الإشعار؟"))) return;
    try {
      await removeOne({ notificationId });
      toast.success(t("Deleted", "تم الحذف"));
    } catch {
      toast.error(t("Failed to delete", "فشل الحذف"));
    }
  }

  async function handleClearAll() {
    if (
      !confirm(
        t(
          "Delete all notifications? This cannot be undone.",
          "حذف كل الإشعارات؟ لا يمكن التراجع.",
        ),
      )
    )
      return;
    setBusy(true);
    try {
      await removeAll();
      toast.success(t("All notifications cleared", "تم حذف كل الإشعارات"));
    } catch {
      toast.error(t("Failed to clear", "فشل الحذف"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="size-4" />
            {t("Notifications Log", "سجل الإشعارات")}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t(
              "Notifications older than 30 days are removed automatically.",
              "تُحذف الإشعارات الأقدم من 30 يوماً تلقائياً.",
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={busy}
            >
              <CheckCheck className="size-3.5 me-1.5" />
              {t("Mark all read", "تحديد الكل كمقروء")}
            </Button>
          )}
          {isAdmin && notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={busy}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5 me-1.5" />
              {t("Clear all", "حذف الكل")}
            </Button>
          )}
        </div>
      </div>

      {notificationsQuery === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
              <Skeleton className="size-2 rounded-full mt-2 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="border rounded-lg py-12 text-center text-sm text-muted-foreground">
          {t("No notifications", "لا توجد إشعارات")}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {notifications.map((n) => (
            <li
              key={n._id}
              className={cn(
                "group flex items-start gap-3 rounded-lg border p-3 transition-colors",
                !n.read && "bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900",
              )}
            >
              <span
                aria-label={!n.read ? (isRtl ? "غير مقروء" : "Unread") : undefined}
                className={cn(
                  "size-2 rounded-full mt-2 shrink-0",
                  !n.read ? "bg-blue-500" : "bg-transparent",
                )}
              />
              <button
                onClick={() => handleClick(n._id, n.type, n.referenceId, n.read)}
                className="flex-1 text-start min-w-0"
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  {n.type === "sla_breach" && (
                    <span className="inline-flex items-center gap-1 text-amber-600 text-[10px] font-semibold">
                      <AlertTriangle className="size-3" />
                      {t("SLA Breach", "انتهاك SLA")}
                    </span>
                  )}
                  {n.type === "channel_expiring_soon" && (
                    <span className="inline-flex items-center gap-1 text-amber-600 text-[10px] font-semibold">
                      <Clock className="size-3" />
                      {t("Channel Expiring", "رقم سيُحذف")}
                    </span>
                  )}
                  {n.type === "channel_deleted" && (
                    <span className="inline-flex items-center gap-1 text-destructive text-[10px] font-semibold">
                      <Trash2 className="size-3" />
                      {t("Channel Deleted", "تم حذف الرقم")}
                    </span>
                  )}
                  {n.type === "conversation_transferred" && (
                    <span className="inline-flex items-center gap-1 text-blue-600 text-[10px] font-semibold">
                      ↗ {t("New conversation in your dept", "محادثة جديدة في قسمك")}
                    </span>
                  )}
                  {n.type === "conversation_reopened" && (
                    <span className="inline-flex items-center gap-1 text-yellow-700 text-[10px] font-semibold">
                      ↩ {t("Customer replied to resolved", "أعاد العميل المحادثة")}
                    </span>
                  )}
                </div>
                <p className={cn("text-sm mt-0.5", !n.read ? "font-semibold" : "font-medium")}>
                  {n.contactName ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {n.message}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), {
                    addSuffix: true,
                    locale: isRtl ? ar : undefined,
                  })}
                </p>
              </button>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  onClick={() => handleDelete(n._id)}
                  aria-label={t("Delete", "حذف")}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
