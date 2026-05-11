"use client";

import { useState } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Send, SkipForward, Loader2, ChevronRight, Check, X } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { DT } from "@/lib/design-tokens";

interface StepInviteTeamProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function StepInviteTeam({ onComplete, onSkip }: StepInviteTeamProps) {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const markStep = useMutation(api.onboarding.markStep);
  const unmarkStep = useMutation(api.onboarding.unmarkStep);
  const generateInvite = useMutation(api.inviteLinks.generate);
  const abandonAndDelete = useAction(api.onboarding.abandonAndDelete);

  const handleCancel = async () => {
    setCancelling(true);
    await abandonAndDelete({}).catch(() => {});
    await authClient.signOut();
    router.push("/");
  };

  const handleSendInvite = async () => {
    if (!email.trim()) return;
    setSending(true);
    setError(null);
    try {
      await generateInvite({});
      setSent(true);
      await markStep({ step: "team_invited_or_skipped" });
      onComplete();
    } catch {
      setError(t("Failed to send invite — please try again.", "فشل إرسال الدعوة — حاول مرة تانية."));
    } finally {
      setSending(false);
    }
  };

  const handleBack = async () => {
    await unmarkStep({ step: "whatsapp_connected" });
  };

  const handleSkip = async () => {
    await markStep({ step: "team_invited_or_skipped" });
    onSkip();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center space-y-1">
        <h2 className={DT.H2}>
          {t("Invite Your Team", "دعوة الفريق")}
        </h2>
        <p className={DT.MUTED}>
          {t(
            "Invite team members to join your workspace",
            "ادعُ أعضاء الفريق للانضمام إلى مساحة العمل"
          )}
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="email"
            dir="ltr"
            placeholder="agent@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={sending || sent}
            className={`${DT.INPUT} flex-1 disabled:opacity-50`}
          />
          <button
            onClick={handleSendInvite}
            disabled={sending || sent || !email.trim()}
            className={DT.BTN_SM_PRIMARY}
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : sent ? (
              <Check className="size-4" />
            ) : (
              <Send className="size-4" />
            )}
            {sent ? t("Sent", "تم الإرسال") : t("Send", "إرسال")}
          </button>
        </div>

        {sent && (
          <div className={`${DT.LIST_ITEM} cursor-default`}>
            <Check className="size-4 text-[#34C759] dark:text-[#30D158]" />
            <span className={DT.BODY} dir="ltr">{email}</span>
            <span className={`${DT.MUTED} ms-auto`}>{t("Invited", "تم الدعوة")}</span>
          </div>
        )}
        {error && (
          <p className="text-[13px] text-[#FF3B30] bg-[#FF3B30]/10 rounded-lg px-3 py-2 text-center">
            {error}
          </p>
        )}
      </div>

      <div className="relative flex items-center gap-3">
        <div className={`flex-1 ${DT.DIVIDER}`} />
        <span className={DT.MUTED}>{t("or", "أو")}</span>
        <div className={`flex-1 ${DT.DIVIDER}`} />
      </div>

      <button
        onClick={handleSkip}
        className={`${DT.MUTED} underline flex items-center justify-center gap-2 ${DT.MUTED_HOVER} transition-colors`}
      >
        <SkipForward className="size-4" />
        {t("Skip for now", "تخطي الآن")}
      </button>

      <div className={`flex items-center justify-between pt-1 ${DT.DIVIDER}`}>
        <button
          onClick={handleBack}
          className={`flex items-center gap-1.5 ${DT.MUTED} ${DT.MUTED_HOVER} transition-colors`}
        >
          <ChevronRight className="size-4 rtl:rotate-180" />
          {t("Back", "رجوع")}
        </button>
        <button
          onClick={handleCancel}
          disabled={cancelling || sending}
          className={`flex items-center gap-1.5 text-[13px] ${DT.TEXT_RED} ${DT.TEXT_RED_HOVER} disabled:opacity-40`}
        >
          {cancelling ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
          {t("Cancel setup", "إلغاء الإعداد")}
        </button>
      </div>
    </div>
  );
}
