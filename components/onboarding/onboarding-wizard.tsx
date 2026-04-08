"use client";

import { useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { StepProgress } from "./step-progress";
import { StepWorkspaceName } from "./step-workspace-name";
import { StepConnectWhatsApp } from "./step-connect-whatsapp";
import { StepInviteTeam } from "./step-invite-team";
import { StepComplete } from "./step-complete";

const STEP_ORDER = [
  "workspace_named",
  "whatsapp_connected",
  "team_invited_or_skipped",
  "onboarding_complete",
] as const;

function deriveCurrentStep(completedSteps: string[]): string {
  for (const step of STEP_ORDER) {
    if (!completedSteps.includes(step)) return step;
  }
  return "onboarding_complete";
}

interface OnboardingWizardProps {
  locale: "ar" | "en";
}

export function OnboardingWizard({ locale }: OnboardingWizardProps) {
  const { isLoaded, orgId } = useAuth();
  const state = useQuery(api.onboarding.getState, isLoaded && orgId ? {} : "skip");
  const router = useRouter();

  const noOrgYet = isLoaded && !orgId;
  const loading = !isLoaded || (!!orgId && state === undefined);

  const completedSteps = loading || noOrgYet ? [] : (state?.completedSteps ?? []);
  const currentStep = deriveCurrentStep(completedSteps);
  const isComplete = !loading && currentStep === "onboarding_complete" && completedSteps.includes("onboarding_complete");

  useEffect(() => {
    if (isComplete) router.replace("/inbox");
  }, [isComplete, router]);

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1">
              <div className="h-8 rounded-full bg-muted animate-pulse" />
            </div>
          ))}
        </div>
        <div className="space-y-4 mt-8">
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
          <div className="h-10 w-32 bg-muted animate-pulse rounded-md mt-4" />
        </div>
      </div>
    );
  }

  if (isComplete) {
    return null;
  }

  return (
    <div className="w-full space-y-8">
      <StepProgress
        completedSteps={completedSteps}
        currentStep={currentStep}
        locale={locale}
      />

      <div className="mt-8">
        {currentStep === "workspace_named" && <StepWorkspaceName />}
        {currentStep === "whatsapp_connected" && (
          <StepConnectWhatsApp onComplete={() => {}} />
        )}
        {currentStep === "team_invited_or_skipped" && (
          <StepInviteTeam
            onComplete={() => {}}
            onSkip={() => {}}
          />
        )}
        {currentStep === "onboarding_complete" && (
          <StepComplete locale={locale} />
        )}
      </div>
    </div>
  );
}
