"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MessageCircle } from "lucide-react";

interface StepConnectWhatsAppProps {
  onComplete: () => void;
}

export function StepConnectWhatsApp({ onComplete }: StepConnectWhatsAppProps) {
  const markStep = useMutation(api.onboarding.markStep);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      await markStep({ step: "whatsapp_connected" });
      onComplete();
    } catch {
      setError("فشل ربط الواتساب — حاول مرة تانية");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">ربط واتساب بزنس</h2>
        <p className="text-muted-foreground mt-1">Connect your WhatsApp Business number</p>
      </div>

      <div className="w-full flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <MessageCircle className="w-8 h-8 text-green-600" />
        </div>

        <p className="text-sm text-muted-foreground text-center max-w-sm">
          هيوصلك رقم واتساب بزنس مخصص. ربطه بمساحة العمل عشان تقدر تستقبل وتبعت رسائل.
        </p>

        {error && (
          <div className="w-full rounded-md bg-destructive/10 p-3 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        <button
          onClick={handleConnect}
          disabled={connecting}
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
        >
          {connecting ? "جاري الربط..." : "ربط واتساب"}
        </button>

        {error && (
          <button
            onClick={handleConnect}
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            حاول مرة تانية
          </button>
        )}
      </div>
    </div>
  );
}
