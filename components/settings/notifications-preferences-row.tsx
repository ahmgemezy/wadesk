"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EVENT_LABELS } from "@/lib/notifications/eventLabels";
import { useT } from "@/lib/i18n/context";
import type { ToggleableEventType } from "@/convex/lib/notificationEvents";
import { DT } from "@/lib/design-tokens";

type Props = {
  eventType: ToggleableEventType;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  isPlanGated: boolean;
  isEmailGated: boolean;
  onUpdate: (inAppEnabled: boolean, emailEnabled: boolean) => void;
};

export function NotificationsPreferencesRow({
  eventType,
  inAppEnabled,
  emailEnabled,
  isPlanGated,
  isEmailGated,
  onUpdate,
}: Props) {
  const t = useT();
  const label = EVENT_LABELS[eventType];
  const inAppId = `inapp-${eventType}`;
  const emailId = `email-${eventType}`;

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium">
            {t(label.en, label.ar)}
          </span>
          {isPlanGated && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant="outline"
                    className="cursor-help border-primary/30 bg-primary/5 text-[10px] text-primary"
                  >
                    Growth+
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <span>
                    {t(
                      "Available on Growth and above. ",
                      "متاح في باقة Growth وأعلى. ",
                    )}
                  </span>
                  <Link href="/settings/billing" className="underline">
                    {t("Upgrade", "ترقية")}
                  </Link>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t(label.descriptionEn, label.descriptionAr)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-6">
        <div
          className={cn(
            "flex flex-col items-center gap-1",
            isPlanGated && "opacity-50",
          )}
        >
          <label
            htmlFor={inAppId}
            className={`${DT.MICRO}`}
          >
            {t("In-app", "داخل التطبيق")}
          </label>
          <input
            id={inAppId}
            type="checkbox"
            checked={inAppEnabled}
            onChange={(e) =>
              onUpdate(e.target.checked, emailEnabled)
            }
            disabled={isPlanGated}
            className={`w-4 h-4 rounded cursor-pointer ${DT.CHECKBOX_ACCENT} disabled:opacity-50`}
          />
        </div>

        <div
          className={cn(
            "flex flex-col items-center gap-1",
            (isPlanGated || isEmailGated) && "opacity-50",
          )}
        >
          <label
            htmlFor={emailId}
            className={`${DT.MICRO}`}
          >
            {t("Email", "البريد الإلكتروني")}
          </label>
          <input
            id={emailId}
            type="checkbox"
            checked={emailEnabled}
            onChange={(e) =>
              onUpdate(inAppEnabled, e.target.checked)
            }
            disabled={isPlanGated || isEmailGated}
            className={`w-4 h-4 rounded cursor-pointer ${DT.CHECKBOX_ACCENT} disabled:opacity-50`}
          />
        </div>
      </div>
    </div>
  );
}
