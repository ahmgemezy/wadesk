"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NotificationsSettings } from "@/components/settings/notifications-settings";
import { useT } from "@/lib/i18n/context";

// Stage 4 will add this import after creating the file:
// import { NotificationsPreferences } from "@/components/settings/notifications-preferences";

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

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="log">
          {t("Notification Log", "سجل الإشعارات")}
        </TabsTrigger>
        <TabsTrigger value="preferences">
          {t("Preferences", "التفضيلات")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="log" className="mt-4">
        <NotificationsSettings />
      </TabsContent>
      <TabsContent value="preferences" className="mt-4">
        {/* Stage 4: uncomment import above and replace this div with <NotificationsPreferences /> */}
        <div className="h-64 rounded-lg bg-muted animate-pulse" />
      </TabsContent>
    </Tabs>
  );
}
