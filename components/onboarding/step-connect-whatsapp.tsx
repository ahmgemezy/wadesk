"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";
import { EmbeddedSignupButton } from "./embedded-signup-button";

interface StepConnectWhatsAppProps {
  onComplete: () => void;
}

export function StepConnectWhatsApp({ onComplete }: StepConnectWhatsAppProps) {
  const markStep = useMutation(api.onboarding.markStep);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [displayPhone, setDisplayPhone] = useState<string | null>(null);

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
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold font-cairo">تم الربط بنجاح!</h2>
          {displayPhone && (
            <p className="text-muted-foreground mt-1" dir="ltr">{displayPhone}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1 font-cairo">
            جارٍ الانتقال للخطوة التالية...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold font-cairo">ربط حساب واتساب بيزنس</h2>
        <p className="text-muted-foreground mt-1 text-sm font-cairo">
          ستمتلك حساب WABA مباشرة — WaDesk لا يقيدك أبداً.
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Connect your WhatsApp Business Account — you own it directly.
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
    </div>
  );
}
