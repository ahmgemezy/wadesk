"use client";

import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Bell, AlertTriangle, Clock, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { notificationRoute } from "@/lib/notification-routes";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export function NotificationBell({ locale }: { locale: "ar" | "en" }) {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();

  const unreadCount = useQuery(api.notifications.getUnreadCount, isAuthenticated ? undefined : "skip");
  const notifications = useQuery(api.notifications.listForUser, isAuthenticated ? undefined : "skip") ?? [];
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);

  const isRtl = locale === "ar";

  function handleNotificationClick(
    notificationId: Id<"notifications">,
    type: string,
    referenceId: string,
    isRead: boolean,
  ) {
    try {
      if (!isRead) {
        markRead({ notificationId });
      }
      router.push(notificationRoute(type, referenceId));
    } catch {
      // Silently ignore errors
    }
  }

  return (
    <Popover>
      <PopoverTrigger
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        aria-label={isRtl ? "الإشعارات" : "Notifications"}
      >
        <Bell className="h-4 w-4" />
        {(unreadCount ?? 0) > 0 && (
          <span className="absolute top-1 inset-e-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {(unreadCount ?? 0) > 9 ? "9+" : String(unreadCount ?? 0)}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align={isRtl ? "start" : "end"}
        className="w-80 p-0"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-semibold text-sm">
            {isRtl ? "الإشعارات" : "Notifications"}
          </span>
          {(unreadCount ?? 0) > 0 && (
            <button
              onClick={() => markAllRead()}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {isRtl ? "تحديد الكل كمقروء" : "Mark all read"}
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {isRtl ? "لا توجد إشعارات" : "No notifications"}
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n._id}
                onClick={() => handleNotificationClick(n._id, n.type, n.referenceId, n.read)}
                className={cn(
                  "w-full text-start px-4 py-3 hover:bg-muted transition-colors border-b last:border-b-0 relative",
                  !n.read && "bg-blue-50 dark:bg-blue-950/20",
                )}
              >
                {!n.read && (
                  <span
                    aria-label={isRtl ? "غير مقروء" : "Unread"}
                    className="absolute top-3 inset-e-3 h-2 w-2 rounded-full bg-blue-500"
                  />
                )}
                {n.type === "sla_breach" && (
                  <span className="inline-flex items-center gap-1 text-amber-600 text-[10px] font-semibold mb-0.5">
                    <AlertTriangle className="size-3" />
                    {isRtl ? "انتهاك SLA" : "SLA Breach"}
                  </span>
                )}
                {n.type === "channel_expiring_soon" && (
                  <span className="inline-flex items-center gap-1 text-amber-600 text-[10px] font-semibold mb-0.5">
                    <Clock className="size-3" />
                    {isRtl ? "رقم سيُحذف" : "Channel Expiring"}
                  </span>
                )}
                {n.type === "channel_deleted" && (
                  <span className="inline-flex items-center gap-1 text-destructive text-[10px] font-semibold mb-0.5">
                    <Trash2 className="size-3" />
                    {isRtl ? "تم حذف الرقم" : "Channel Deleted"}
                  </span>
                )}
                {n.type === "conversation_transferred" && (
                  <span className="inline-flex items-center gap-1 text-blue-600 text-[10px] font-semibold mb-0.5">
                    ↗ {isRtl ? "محادثة جديدة في قسمك" : "New conversation in your dept"}
                  </span>
                )}
                {n.type === "conversation_reopened" && (
                  <span className="inline-flex items-center gap-1 text-yellow-700 text-[10px] font-semibold mb-0.5">
                    ↩ {isRtl ? "أعاد العميل المحادثة" : "Customer replied to resolved"}
                  </span>
                )}
                <p className={cn("text-sm pe-4", !n.read ? "font-semibold" : "font-medium")}>
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
            ))
          )}
        </div>
        <div className="border-t">
          <button
            onClick={() => router.push("/settings/notifications")}
            className="w-full px-4 py-2.5 text-xs font-medium text-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {isRtl ? "عرض الكل" : "See all"}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
