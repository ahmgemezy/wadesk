"use client";

export type ChannelStatus = "connecting" | "active" | "disconnected" | "reconnect_required";

interface ChannelStatusBadgeProps {
  status: ChannelStatus;
}

const STATUS_CONFIG: Record<
  ChannelStatus,
  { label: string; labelEn: string; className: string }
> = {
  active: {
    label: "نشط",
    labelEn: "Active",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  connecting: {
    label: "جارٍ الاتصال",
    labelEn: "Connecting",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  disconnected: {
    label: "غير متصل",
    labelEn: "Disconnected",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  reconnect_required: {
    label: "يتطلب إعادة الاتصال",
    labelEn: "Reconnect Required",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
};

export function ChannelStatusBadge({ status }: ChannelStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "active"
            ? "bg-green-500"
            : status === "connecting"
              ? "bg-yellow-500 animate-pulse"
              : status === "reconnect_required"
                ? "bg-red-500"
                : "bg-gray-400"
        }`}
      />
      <span dir="rtl" className="font-cairo">
        {config.label}
      </span>
    </span>
  );
}
