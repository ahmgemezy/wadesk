"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { NotificationsSettings } from "@/components/settings/notifications-settings";
import { NotificationsPreferences } from "@/components/settings/notifications-preferences";
import { NotificationsErrorBoundary } from "@/components/settings/notifications-error-boundary";
import { useT } from "@/lib/i18n/context";
import { DT } from "@/lib/design-tokens";

const VALID_TABS = ["log", "preferences"] as const;
type TabValue = (typeof VALID_TABS)[number];

function isValidTab(v: string | null): v is TabValue {
  return v !== null && (VALID_TABS as readonly string[]).includes(v);
}

export function NotificationsTabShell() {
  const t = useT();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tabParam = searchParams.get("tab");
  const activeTab: TabValue = isValidTab(tabParam) ? tabParam : "log";

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "log") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  const logPanelId = "notifications-tabpanel-log";
  const preferencesPanelId = "notifications-tabpanel-preferences";

  return (
    <div>
      <div
        role="tablist"
        className="inline-flex bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "log"}
          aria-controls={logPanelId}
          onClick={() => handleTabChange("log")}
          className={`shrink-0 ${activeTab === "log" ? DT.SIDEBAR_ITEM_ACTIVE : DT.SIDEBAR_ITEM}`}
        >
          {t("Notification Log", "سجل الإشعارات")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "preferences"}
          aria-controls={preferencesPanelId}
          onClick={() => handleTabChange("preferences")}
          className={`shrink-0 ${activeTab === "preferences" ? DT.SIDEBAR_ITEM_ACTIVE : DT.SIDEBAR_ITEM}`}
        >
          {t("Preferences", "التفضيلات")}
        </button>
      </div>
      <div
        role="tabpanel"
        id={activeTab === "log" ? logPanelId : preferencesPanelId}
        className="mt-4"
      >
        {activeTab === "log" ? (
          <NotificationsSettings />
        ) : (
          <NotificationsErrorBoundary>
            <NotificationsPreferences />
          </NotificationsErrorBoundary>
        )}
      </div>
    </div>
  );
}
