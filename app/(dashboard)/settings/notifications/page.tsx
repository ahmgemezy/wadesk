import { Suspense } from "react";
import { NotificationsTabShell } from "@/components/settings/notifications-tab-shell";

export default function NotificationsSettingsPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Suspense fallback={<div className="h-96 rounded-lg bg-muted animate-pulse" />}>
        <NotificationsTabShell />
      </Suspense>
    </div>
  );
}
