"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

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
  const setMode = useMutation(api.channels.setAssignmentMode);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">
        وضع التعيين / Assignment Mode
      </h3>
      <div className="space-y-2">
        {MODES.map((mode) => (
          <label
            key={mode.value}
            className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
              currentMode === mode.value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <input
              type="radio"
              name="assignmentMode"
              value={mode.value}
              checked={currentMode === mode.value}
              onChange={() => setMode({ channelId, mode: mode.value })}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-sm">
                {mode.labelAr} / {mode.labelEn}
              </div>
              <div className="text-xs text-muted-foreground">
                {mode.descAr} / {mode.descEn}
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
