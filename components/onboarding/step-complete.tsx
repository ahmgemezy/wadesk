"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { PartyPopper, Loader2 } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/i18n/context";
import { Confetti } from "@/components/ui/confetti";
import { DT } from "@/lib/design-tokens";

interface StepCompleteProps {
  locale: "ar" | "en";
}

export function StepComplete({ locale: _locale }: StepCompleteProps) {
  const router = useRouter();
  const t = useT();
  const markStep = useMutation(api.onboarding.markStep);
  const channels = useQuery(api.channels.listForTenant);
  const [loading, setLoading] = useState(false);

  const phoneNumber = channels?.[0]?.displayName ?? channels?.[0]?.phoneNumberId ?? "";

  const handleGoToInbox = async () => {
    setLoading(true);
    await markStep({ step: "onboarding_complete" });
    router.replace("/inbox");
  };

  return (
    <div className="flex flex-col items-center gap-6 text-center py-2">
      <Confetti durationMs={4000} />
      <div className="rounded-full size-16 bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] dark:text-[#30D158] flex items-center justify-center">
        <PartyPopper className="size-8" />
      </div>

      <div className="space-y-1">
        <h2 className={DT.H2}>
          {t("You're all set! 🎉", "مبروك! صندوق الرسائل جاهز. 🎉")}
        </h2>
        {phoneNumber ? (
          <p className={DT.MUTED}>
            {t(
              `Send a WhatsApp message to ${phoneNumber} and watch it appear in your inbox.`,
              `ابعت رسالة واتساب على ${phoneNumber} وشوفها تظهر في صندوقك.`
            )}
          </p>
        ) : (
          <p className={DT.MUTED}>
            {t(
              "Your workspace is ready. Open your inbox to start.",
              "مساحة العمل جاهزة. افتح صندوق الرسائل للبدء."
            )}
          </p>
        )}
      </div>

      <button
        onClick={handleGoToInbox}
        disabled={loading}
        className={`${DT.BTN_PRIMARY} w-full`}
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {t("Open Inbox", "افتح صندوق الرسائل")}
      </button>
    </div>
  );
}
