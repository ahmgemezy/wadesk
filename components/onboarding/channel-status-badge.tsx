"use client";

import { useT } from "@/lib/i18n/context";
import { DT } from "@/lib/design-tokens";

export type ChannelStatus = "connecting" | "active" | "disconnected" | "reconnect_required";

interface ChannelStatusBadgeProps {
  status: ChannelStatus;
}

const DOT_CLASS: Record<ChannelStatus, string> = {
  active: DT.DOT_GREEN,
  connecting: `${DT.DOT_AMBER} animate-pulse`,
  disconnected: DT.DOT_GRAY,
  reconnect_required: DT.DOT_RED,
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
    <span className={`inline-flex items-center gap-1.5 ${DT.MUTED}`}>
      <span className={DOT_CLASS[status]} />
      <span className="font-cairo">{label[status]}</span>
    </span>
  );
}
