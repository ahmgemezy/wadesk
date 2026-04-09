"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useT } from "@/lib/i18n/context";

interface AssignmentModeSelectProps {
  channelId: Id<"channels">;
  currentMode: "first_reply" | "manual" | "round_robin";
}

const MODES = [
  {
    value: "first_reply" as const,
    labelEn: "First Reply Wins",
    labelAr: "أول رد",
    descEn: "First agent to reply gets assigned",
    descAr: "أول وكيل يرد يتم تعيينه",
  },
  {
    value: "manual" as const,
    labelEn: "Manual",
    labelAr: "يدوي",
    descEn: "Conversations stay unassigned until manually assigned",
    descAr: "تبقى المحادثات غير معينة حتى التعيين اليدوي",
  },
  {
    value: "round_robin" as const,
    labelEn: "Round Robin",
    labelAr: "توزيع دوري",
    descEn: "Auto-distribute conversations evenly across team",
    descAr: "توزيع المحادثات بالتساوي على الفريق",
  },
];

export function AssignmentModeSelect({
  channelId,
  currentMode,
}: AssignmentModeSelectProps) {
  const t = useT();
  const setMode = useMutation(api.channels.setAssignmentMode);
  const plan = useQuery(api.lib.tenants.getCurrentPlan);

  const isRoundRobinLocked =
    plan !== undefined && (plan === "free" || plan === "starter");

  return (
    <TooltipProvider>
      <div className="space-y-2">
        <h3 className="text-sm font-medium">
          {t("Assignment Mode", "وضع التعيين")}
        </h3>
        <div className="space-y-2">
          {MODES.map((mode) => {
            const isLocked = mode.value === "round_robin" && isRoundRobinLocked;

            const inner = (
              <div
                key={mode.value}
                className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                  isLocked
                    ? "border-border opacity-50 cursor-not-allowed"
                    : currentMode === mode.value
                      ? "border-primary bg-primary/5 cursor-pointer"
                      : "border-border hover:border-primary/50 cursor-pointer"
                }`}
              >
                <input
                  type="radio"
                  name="assignmentMode"
                  value={mode.value}
                  checked={currentMode === mode.value}
                  onChange={() => {
                    if (!isLocked) setMode({ channelId, mode: mode.value });
                  }}
                  disabled={isLocked}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-sm">
                    {t(mode.labelEn, mode.labelAr)}
                    {isLocked && (
                      <span className="ms-2 text-xs text-muted-foreground">
                        ({t("Growth plan required", "خطة النمو مطلوبة")})
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t(mode.descEn, mode.descAr)}
                  </div>
                </div>
              </div>
            );

            if (isLocked) {
              return (
                <Tooltip key={mode.value}>
                  <TooltipTrigger render={inner} />
                  <TooltipContent>
                    {t("Requires Growth plan or above", "ترقية إلى خطة النمو أو أعلى")}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return inner;
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
