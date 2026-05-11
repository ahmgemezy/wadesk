"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@/lib/auth-hooks";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { ConvexError } from "convex/values";
import { DT } from "@/lib/design-tokens";
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
  const ensureCreated = useMutation(api.onboarding.ensureCreated);
  const router = useRouter();
  // Incremented when ensureCreated returns NO_ORG so the effect retries after
  // a short delay (Convex JWT refresh lags behind the Better Auth session).
  const [retryTick, setRetryTick] = useState(0);

  const needsEnsure =
    isLoaded &&
    !!orgId &&
    (state === null || (state !== undefined && !state.completedSteps.includes("workspace_named")));

  useEffect(() => {
    if (needsEnsure) {
      ensureCreated({}).catch((err) => {
        if (err instanceof ConvexError && err.data === "NO_ORG") {
          setTimeout(() => setRetryTick((n) => n + 1), 400);
        } else {
          console.error("[Onboarding] ensureCreated failed:", err);
        }
      });
    }
  }, [needsEnsure, ensureCreated, retryTick]);

  const noOrgYet = isLoaded && !orgId;
  // Show skeleton while ensureCreated is patching workspace_named in,
  // so step 1 never flashes for orgs that already have a name.
  const loading = !isLoaded || (!!orgId && (state == null || needsEnsure));

  const completedSteps = loading || noOrgYet ? [] : (state?.completedSteps ?? []);
  const currentStep = deriveCurrentStep(completedSteps);
  const isComplete = !loading && currentStep === "onboarding_complete" && completedSteps.includes("onboarding_complete");

  useEffect(() => {
    if (isComplete) router.replace("/inbox");
  }, [isComplete, router]);

  if (loading) {
    return (
      <div className={`${DT.CARD} max-w-lg mx-auto p-8 w-full space-y-6`}>
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1">
              <div className="h-8 rounded-full bg-black/[0.06] dark:bg-white/[0.08] animate-pulse" />
            </div>
          ))}
        </div>
        <div className="space-y-4 mt-8">
          <div className="h-6 w-48 bg-black/[0.06] dark:bg-white/[0.08] animate-pulse rounded" />
          <div className="h-4 w-64 bg-black/[0.06] dark:bg-white/[0.08] animate-pulse rounded" />
          <div className="h-10 w-32 bg-black/[0.06] dark:bg-white/[0.08] animate-pulse rounded-md mt-4" />
        </div>
      </div>
    );
  }

  if (isComplete) {
    return null;
  }

  return (
    <div className={`${DT.CARD} max-w-lg mx-auto p-8 w-full space-y-8`}>
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
