"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { PartyPopper, Loader2 } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/i18n/context";
import { Confetti } from "@/components/ui/confetti";

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
      <div
        className="size-16 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(0,113,227,0.08)" }}
      >
        <PartyPopper className="size-8 text-[#0071E3]" />
      </div>

      <div className="space-y-1">
        <h2 className="text-[22px] font-semibold tracking-[-0.4px] text-[#1D1D1F]">
          {t("You're all set! 🎉", "مبروك! صندوق الرسائل جاهز. 🎉")}
        </h2>
        {phoneNumber ? (
          <p className="text-[15px] text-[#6E6E73]">
            {t(
              `Send a WhatsApp message to ${phoneNumber} and watch it appear in your inbox.`,
              `ابعت رسالة واتساب على ${phoneNumber} وشوفها تظهر في صندوقك.`
            )}
          </p>
        ) : (
          <p className="text-[15px] text-[#6E6E73]">
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
        className="w-full rounded-full py-2.5 text-[15px] font-normal text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ background: "#0071E3" }}
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {t("Open Inbox", "افتح صندوق الرسائل")}
      </button>
    </div>
  );
}
