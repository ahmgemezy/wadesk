"use client";

import dynamic from "next/dynamic";

const NotificationBell = dynamic(
  () => import("@/components/ui/notification-bell").then((m) => m.NotificationBell),
  { ssr: false },
);

export function ClientNotificationBell({ locale }: { locale: "ar" | "en" }) {
  return <NotificationBell locale={locale} />;
}
