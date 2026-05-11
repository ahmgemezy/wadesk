"use client";

import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DT } from "@/lib/design-tokens";
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
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${DT.BTN_ICON}`}
        aria-label={isRtl ? "الإشعارات" : "Notifications"}
      >
        <Bell className="h-4 w-4" />
        {(unreadCount ?? 0) > 0 && (
          <span className={`absolute top-1 inset-e-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white ${DT.BADGE_RED}`}>
            {(unreadCount ?? 0) > 9 ? "9+" : String(unreadCount ?? 0)}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align={isRtl ? "start" : "end"}
        className={`w-80 p-0 ${DT.CARD}`}
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className={`flex items-center justify-between ${DT.DIVIDER} px-4 py-3`}>
          <span className={`${DT.H3}`}>
            {isRtl ? "الإشعارات" : "Notifications"}
          </span>
          {(unreadCount ?? 0) > 0 && (
            <button
              onClick={() => markAllRead()}
              className={`${DT.MUTED} ${DT.MUTED_HOVER}`}
            >
              {isRtl ? "تحديد الكل كمقروء" : "Mark all read"}
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className={`py-8 text-center text-sm ${DT.MUTED}`}>
              {isRtl ? "لا توجد إشعارات" : "No notifications"}
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n._id}
                onClick={() => handleNotificationClick(n._id, n.type, n.referenceId, n.read)}
                className={cn(
                  `w-full text-start px-4 py-3 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors ${DT.DIVIDER} last:border-b-0 relative`,
                  !n.read && "bg-blue-50/50 dark:bg-blue-950/30",
                )}
              >
                {!n.read && (
                  <span
                    aria-label={isRtl ? "غير مقروء" : "Unread"}
                    className={`absolute top-3 inset-e-3 h-2 w-2 rounded-full ${DT.BG_BLUE}`}
                  />
                )}
                {n.type === "sla_breach" && (
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[10px] font-semibold mb-0.5">
                    <AlertTriangle className="size-3" />
                    {isRtl ? "انتهاك SLA" : "SLA Breach"}
                  </span>
                )}
                {n.type === "channel_expiring_soon" && (
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[10px] font-semibold mb-0.5">
                    <Clock className="size-3" />
                    {isRtl ? "رقم سيُحذف" : "Channel Expiring"}
                  </span>
                )}
                {n.type === "channel_deleted" && (
                  <span className={`inline-flex items-center gap-1 ${DT.TEXT_RED} text-[10px] font-semibold mb-0.5`}>
                    <Trash2 className="size-3" />
                    {isRtl ? "تم حذف الرقم" : "Channel Deleted"}
                  </span>
                )}
                {n.type === "conversation_transferred" && (
                  <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 text-[10px] font-semibold mb-0.5">
                    ↗ {isRtl ? "محادثة جديدة في قسمك" : "New conversation in your dept"}
                  </span>
                )}
                {n.type === "conversation_reopened" && (
                  <span className="inline-flex items-center gap-1 text-yellow-700 dark:text-yellow-500 text-[10px] font-semibold mb-0.5">
                    ↩ {isRtl ? "أعاد العميل المحادثة" : "Customer replied to resolved"}
                  </span>
                )}
                <p className={cn(`text-sm pe-4 ${DT.BODY}`, !n.read ? "font-semibold" : "font-medium")}>
                  {n.contactName ?? "—"}
                </p>
                <p className={`text-xs ${DT.MUTED} mt-0.5 line-clamp-2`}>
                  {n.message}
                </p>
                <p className={`text-[10px] ${DT.MICRO} mt-1`}>
                  {formatDistanceToNow(new Date(n.createdAt), {
                    addSuffix: true,
                    locale: isRtl ? ar : undefined,
                  })}
                </p>
              </button>
            ))
          )}
        </div>
        <div className={DT.DIVIDER}>
          <button
            onClick={() => router.push("/settings/notifications")}
            className={`w-full px-4 py-2.5 text-xs font-medium text-center ${DT.MUTED} ${DT.MUTED_HOVER} transition-colors`}
          >
            {isRtl ? "عرض الكل" : "See all"}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
