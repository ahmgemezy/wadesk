"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationsPreferencesRow } from "@/components/settings/notifications-preferences-row";
import { useNotificationPreferences } from "@/hooks/use-notification-preferences";
import { TOGGLEABLE_EVENT_TYPES } from "@/convex/lib/notificationEvents";
import { useT } from "@/lib/i18n/context";
import { useSelectedChannel } from "@/lib/hooks/channel-context";
import { DT } from "@/lib/design-tokens";

function PreferenceRowSkeleton() {
  return (
    <div className={`${DT.CARD_FLAT} flex items-center justify-between p-4`}>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-56" />
      </div>
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center gap-1">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-5 w-9 rounded-full" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-5 w-9 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function PreferencesLoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 7 }).map((_, i) => (
        <PreferenceRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function NotificationsPreferences() {
  const t = useT();
  const { channelId: selectedChannelId } = useSelectedChannel();
  const { preferences, plan, isLoading, updatePreference } =
    useNotificationPreferences(selectedChannelId);

  return (
    <section className={DT.CARD}>
      <header className="px-6 pt-6 pb-4 space-y-1.5">
        <h2 className={DT.H2}>
          {t("Notification Preferences", "تفضيلات الإشعارات")}
        </h2>
        <p className={DT.MUTED}>
          {t(
            "Manage how you receive notifications across channels.",
            "إدارة كيفية تلقي الإشعارات عبر القنوات.",
          )}
        </p>
      </header>
      <div className="px-6 pb-6">
        {isLoading ? (
          <PreferencesLoadingSkeleton />
        ) : preferences === undefined ? null : (
          <>
            {plan === "free" && (
              <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                {t(
                  "Email notifications are available on Starter plans and above. ",
                  "إشعارات البريد الإلكتروني متاحة في باقة Starter وأعلى. ",
                )}
                <Link
                  href="/settings/billing"
                  className="font-medium underline"
                >
                  {t("Upgrade", "ترقية")}
                </Link>
              </div>
            )}
            {TOGGLEABLE_EVENT_TYPES.map((eventType, index) => {
              const pref = preferences.find(
                (p) => p.eventType === eventType,
              );
              if (!pref) return null;
              return (
                <div key={eventType}>
                  <NotificationsPreferencesRow
                    eventType={eventType}
                    inAppEnabled={pref.inAppEnabled}
                    emailEnabled={pref.emailEnabled}
                    isPlanGated={pref.isPlanGated}
                    isEmailGated={pref.isEmailGated}
                    onUpdate={(inApp, email) =>
                      updatePreference(eventType, inApp, email)
                    }
                  />
                  {index < TOGGLEABLE_EVENT_TYPES.length - 1 && (
                    <div className={DT.DIVIDER} />
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </section>
  );
}
