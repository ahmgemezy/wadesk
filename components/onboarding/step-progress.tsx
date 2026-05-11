"use client";

import { Check } from "lucide-react";

const STEPS = [
  { key: "workspace_named",         ar: "مساحة العمل", en: "Workspace" },
  { key: "whatsapp_connected",      ar: "ربط واتساب",  en: "Connect WhatsApp" },
  { key: "team_invited_or_skipped", ar: "دعوة الفريق", en: "Invite Team" },
  { key: "onboarding_complete",     ar: "جاهز!",       en: "You're ready!" },
] as const;

interface StepProgressProps {
  completedSteps: string[];
  currentStep: string;
  locale: "ar" | "en";
}

export function StepProgress({ completedSteps, currentStep, locale }: StepProgressProps) {
  return (
    <nav
      aria-label={locale === "ar" ? "خطوات الإعداد" : "Setup progress"}
      className="flex items-center"
    >
      {STEPS.map((step, i) => {
        const isCompleted = completedSteps.includes(step.key);
        const isCurrent   = step.key === currentStep;
        const isLast      = i === STEPS.length - 1;

        const circleBase = "size-8 rounded-full flex items-center justify-center text-[13px] font-semibold transition-colors";
        const circleState = isCompleted
          ? "bg-[#0071E3] dark:bg-[#0A84FF] text-white"
          : isCurrent
            ? "ring-2 ring-[#0071E3] dark:ring-[#0A84FF] bg-white dark:bg-[#1C1C1E] text-[#0071E3] dark:text-[#0A84FF]"
            : "bg-black/[0.06] dark:bg-white/[0.08] text-[#6E6E73]";

        const labelState = isCurrent
          ? "text-[#1D1D1F] dark:text-white font-semibold"
          : isCompleted
            ? "text-[#0071E3] dark:text-[#0A84FF]"
            : "text-[#6E6E73] dark:text-white/50";

        const trackState = isCompleted
          ? "bg-[#0071E3] dark:bg-[#0A84FF]"
          : "bg-black/[0.08] dark:bg-white/[0.10]";

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className={`${circleBase} ${circleState}`}>
                {isCompleted ? <Check className="size-4" strokeWidth={2.5} /> : i + 1}
              </div>
              <span className={`text-[11px] leading-tight text-center max-w-16 ${labelState}`}>
                {step[locale]}
              </span>
            </div>

            {!isLast && (
              <div className={`flex-1 rounded-full h-1 mx-2 mb-5 transition-colors ${trackState}`} />
            )}
          </div>
        );
      })}
    </nav>
  );
}
