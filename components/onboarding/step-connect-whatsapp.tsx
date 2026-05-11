"use client";

import { useState } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CheckCircle2, SkipForward, ChevronRight, Loader2, X } from "lucide-react";
import { EmbeddedSignupButton } from "./embedded-signup-button";
import { useT } from "@/lib/i18n/context";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { DT } from "@/lib/design-tokens";

interface StepConnectWhatsAppProps {
  onComplete: () => void;
}

export function StepConnectWhatsApp({ onComplete }: StepConnectWhatsAppProps) {
  const markStep = useMutation(api.onboarding.markStep);
  const unmarkStep = useMutation(api.onboarding.unmarkStep);
  const abandonAndDelete = useAction(api.onboarding.abandonAndDelete);
  const t = useT();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [displayPhone, setDisplayPhone] = useState<string | null>(null);
  const [skipping, setSkipping] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    await abandonAndDelete({}).catch(() => {});
    await authClient.signOut();
    router.push("/");
  };

  const handleBack = async () => {
    await unmarkStep({ step: "workspace_named" });
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
    try {
      await markStep({ step: "whatsapp_connected" });
    } catch {
      // already marked server-side
    }
    setTimeout(() => onComplete(), 2000);
  };

  if (connected) {
    return (
      <div className="flex flex-col items-center gap-5 text-center py-2">
        <div className="rounded-full size-16 bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] dark:text-[#30D158] flex items-center justify-center">
          <CheckCircle2 className="size-8" />
        </div>
        <div className="space-y-1">
          <h2 className={DT.H2}>
            {t("Connected!", "تم الربط بنجاح!")}
          </h2>
          {displayPhone && (
            <p className={DT.MUTED} dir="ltr">{displayPhone}</p>
          )}
          <p className={DT.MUTED}>
            {t("Moving to the next step…", "جارٍ الانتقال للخطوة التالية…")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center space-y-1">
        <h2 className={DT.H2}>
          {t("Connect WhatsApp Business", "ربط حساب واتساب بيزنس")}
        </h2>
        <p className={DT.MUTED}>
          {t(
            "You own the WABA directly — WABDesk never locks you in.",
            "ستمتلك حساب WABA مباشرة — WABDesk لا يقيدك أبداً."
          )}
        </p>
      </div>

      {error && (
        <p className="text-[13px] text-[#FF3B30] bg-[#FF3B30]/10 rounded-lg px-3 py-2 text-center">
          {error}
        </p>
      )}

      <div className="space-y-2">
        <EmbeddedSignupButton
          onSuccess={handleSuccess}
          onError={(err) => setError(err)}
        />
        <p className={`${DT.INFO_BOX} text-center`}>
          {t(
            "A Meta window will open to link your WhatsApp Business account.",
            "ستُفتح نافذة من ميتا لاختيار حساب واتساب بيزنس الخاص بك."
          )}
        </p>
      </div>

      <div className={`flex items-center justify-between pt-1 ${DT.DIVIDER}`}>
        <button
          onClick={handleBack}
          className={`flex items-center gap-1.5 ${DT.MUTED} ${DT.MUTED_HOVER} transition-colors`}
        >
          <ChevronRight className="size-4 rtl:rotate-180" />
          {t("Back", "رجوع")}
        </button>
        <div className="flex items-center gap-4">
          <button
            onClick={handleSkip}
            disabled={skipping || cancelling}
            className={`${DT.MUTED} underline flex items-center gap-1.5 ${DT.MUTED_HOVER} transition-colors disabled:opacity-40`}
          >
            {skipping ? <Loader2 className="size-3.5 animate-spin" /> : <SkipForward className="size-3.5" />}
            {t("Skip for now", "تخطي الآن")}
          </button>
          <button
            onClick={handleCancel}
            disabled={cancelling || skipping}
            className={`flex items-center gap-1.5 text-[13px] ${DT.TEXT_RED} ${DT.TEXT_RED_HOVER} disabled:opacity-40`}
          >
            {cancelling ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
            {t("Cancel setup", "إلغاء الإعداد")}
          </button>
        </div>
      </div>
    </div>
  );
}
