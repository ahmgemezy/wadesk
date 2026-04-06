"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { PartyPopper } from "lucide-react";

interface StepCompleteProps {
  locale: "ar" | "en";
}

export function StepComplete({ locale }: StepCompleteProps) {
  const router = useRouter();
  const markStep = useMutation(api.onboarding.markStep);
  const channels = useQuery(api.channels.listForTenant);

  const phoneNumber = channels?.[0]?.displayName ?? channels?.[0]?.phoneNumberId ?? "";

  const handleGoToInbox = async () => {
    await markStep({ step: "onboarding_complete" });
    router.replace("/inbox");
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <PartyPopper className="w-8 h-8 text-primary" />
      </div>

      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">
          🎉 مبروك! صندوق الرسائل جاهز.
        </h2>
        {phoneNumber && (
          <p className="text-muted-foreground mt-2">
            ابعت رسالة واتساب على <span className="font-medium text-foreground">{phoneNumber}</span> وشوفها هنا!
          </p>
        )}
      </div>

      <button
        onClick={handleGoToInbox}
        className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        {locale === "ar" ? "افتح صندوق الرسائل" : "Open Inbox"}
      </button>
    </div>
  );
}
