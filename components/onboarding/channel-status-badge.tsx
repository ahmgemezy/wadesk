"use client";

import { useT } from "@/lib/i18n/context";

export type ChannelStatus = "connecting" | "active" | "disconnected" | "reconnect_required";

interface ChannelStatusBadgeProps {
  status: ChannelStatus;
}

const STATUS_CLASS: Record<ChannelStatus, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  connecting: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  disconnected: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  reconnect_required: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const DOT_CLASS: Record<ChannelStatus, string> = {
  active: "bg-green-500",
  connecting: "bg-yellow-500 animate-pulse",
  disconnected: "bg-gray-400",
  reconnect_required: "bg-red-500",
};

export function ChannelStatusBadge({ status }: ChannelStatusBadgeProps) {
  const t = useT();

  const label: Record<ChannelStatus, string> = {
    active: t("Active", "نشط"),
    connecting: t("Connecting", "جارٍ الاتصال"),
    disconnected: t("Disconnected", "غير متصل"),
    reconnect_required: t("Reconnect Required", "يتطلب إعادة الاتصال"),
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[status]}`} />
      <span className="font-cairo">{label[status]}</span>
    </span>
  );
}
