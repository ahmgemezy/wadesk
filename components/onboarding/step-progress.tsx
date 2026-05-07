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

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className="size-8 rounded-full flex items-center justify-center text-[13px] font-semibold transition-colors"
                style={{
                  background: isCompleted
                    ? "#0071E3"
                    : isCurrent
                      ? "rgba(0,113,227,0.08)"
                      : "rgba(0,0,0,0.06)",
                  color: isCompleted ? "#fff" : isCurrent ? "#0071E3" : "#6E6E73",
                  border: isCurrent ? "2px solid #0071E3" : "2px solid transparent",
                }}
              >
                {isCompleted ? <Check className="size-4" strokeWidth={2.5} /> : i + 1}
              </div>
              <span
                className="text-[11px] leading-tight text-center max-w-16"
                style={{
                  color: isCurrent ? "#1D1D1F" : isCompleted ? "#0071E3" : "#6E6E73",
                  fontWeight: isCurrent ? 600 : 400,
                }}
              >
                {step[locale]}
              </span>
            </div>

            {!isLast && (
              <div
                className="flex-1 h-px mx-2 mb-5 transition-colors"
                style={{ background: isCompleted ? "#0071E3" : "rgba(0,0,0,0.10)" }}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
