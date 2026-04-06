"use client";

import { Check } from "lucide-react";

const STEPS = [
  { key: "workspace_named", ar: "اسم العمل", en: "Workspace" },
  { key: "whatsapp_connected", ar: "ربط واتساب", en: "Connect WhatsApp" },
  { key: "team_invited_or_skipped", ar: "دعوة الفريق", en: "Invite Team" },
  { key: "onboarding_complete", ar: "جاهز!", en: "You're ready!" },
] as const;

interface StepProgressProps {
  completedSteps: string[];
  currentStep: string;
  locale: "ar" | "en";
}

export function StepProgress({ completedSteps, currentStep, locale }: StepProgressProps) {
  return (
    <nav aria-label={locale === "ar" ? "خطوات الإعداد" : "Setup progress"}>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-0">
        {STEPS.map((step, i) => {
          const isCompleted = completedSteps.includes(step.key);
          const isCurrent = step.key === currentStep;
          const isLast = i === STEPS.length - 1;

          return (
            <div key={step.key} className="flex flex-col md:flex-row items-start md:items-center gap-1 md:gap-2 flex-1 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium shrink-0 ${
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                        ? "bg-primary/10 text-primary border-2 border-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span
                  className={`text-sm ${
                    isCurrent ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}
                >
                  {step[locale]}
                </span>
              </div>
              {!isLast && (
                <div className="hidden md:block flex-1 h-px bg-border ms-2 me-2" />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
