"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, SkipForward, ChevronRight } from "lucide-react";
import { EmbeddedSignupButton } from "./embedded-signup-button";
import { useT } from "@/lib/i18n/context";

interface StepConnectWhatsAppProps {
  onComplete: () => void;
}

export function StepConnectWhatsApp({ onComplete }: StepConnectWhatsAppProps) {
  const markStep = useMutation(api.onboarding.markStep);
  const unmarkStep = useMutation(api.onboarding.unmarkStep);
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [displayPhone, setDisplayPhone] = useState<string | null>(null);
  const [skipping, setSkipping] = useState(false);

  const handleBack = async () => {
    await unmarkStep({ step: "workspace_named" });
    // wizard re-derives currentStep reactively
  };

  const handleSkip = async () => {
    setSkipping(true);
    try {
      await markStep({ step: "whatsapp_connected" });
      onComplete();
    } finally {
      setSkipping(false);
    }
  };

  const handleSuccess = async (_channelId: string, phone: string) => {
    setDisplayPhone(phone);
    setConnected(true);
    setError(null);
    // completeEmbeddedSignup already marks whatsapp_connected in onboardingState server-side.
    // We also call markStep here to keep the wizard completedSteps in sync.
    try {
      await markStep({ step: "whatsapp_connected" });
    } catch {
      // ignore — already marked server-side by the action
    }
    setTimeout(() => onComplete(), 2000);
  };

  if (connected) {
    return (
      <div className="flex flex-col items-center gap-6 text-center" dir="rtl">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold font-cairo">{t("Connected!", "تم الربط بنجاح!")}</h2>
          {displayPhone && (
            <p className="text-muted-foreground mt-1" dir="ltr">{displayPhone}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1 font-cairo">
            {t("Moving to the next step…", "جارٍ الانتقال للخطوة التالية…")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      <div>
        <h2 className="text-xl font-semibold font-cairo">{t("Connect WhatsApp Business", "ربط حساب واتساب بيزنس")}</h2>
        <p className="text-muted-foreground mt-1 text-sm font-cairo">
          {t("You own the WABA directly — WABDesk never locks you in.", "ستمتلك حساب WABA مباشرة — WABDesk لا يقيدك أبداً.")}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="font-cairo">{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <EmbeddedSignupButton
          onSuccess={handleSuccess}
          onError={(err) => setError(err)}
        />
        <p className="text-xs text-muted-foreground font-cairo">
          ستُفتح نافذة من ميتا لاختيار حساب واتساب بيزنس الخاص بك
        </p>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
          رجوع
        </button>
        <button
          onClick={handleSkip}
          disabled={skipping}
          className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 transition-colors"
        >
          <SkipForward className="w-4 h-4" />
          تخطي الآن
        </button>
      </div>
    </div>
  );
}
