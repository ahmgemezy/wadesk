"use client";

import { useState } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Send, SkipForward, Loader2, ChevronRight, Check, X } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

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
        <h2 className="text-[22px] font-semibold tracking-[-0.4px] text-[#1D1D1F]">
          {t("Invite Your Team", "دعوة الفريق")}
        </h2>
        <p className="text-[15px] text-[#6E6E73]">
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
            className="flex-1 rounded-xl border border-black/12 bg-black/4 px-3.5 py-2.5 text-[15px] text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all placeholder:text-[#6E6E73] disabled:opacity-50"
          />
          <button
            onClick={handleSendInvite}
            disabled={sending || sent || !email.trim()}
            className="flex items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-normal text-white transition-colors disabled:opacity-50"
            style={{ background: "#0071E3" }}
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
          <p className="text-[13px] text-[#34C759] text-center">
            {t("Invitation sent successfully.", "تم إرسال الدعوة بنجاح.")}
          </p>
        )}
        {error && (
          <p className="text-[13px] text-[#FF3B30] bg-[#FF3B30]/10 rounded-lg px-3 py-2 text-center">
            {error}
          </p>
        )}
      </div>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-black/8" />
        <span className="text-[12px] text-[#6E6E73]">{t("or", "أو")}</span>
        <div className="flex-1 h-px bg-black/8" />
      </div>

      <button
        onClick={handleSkip}
        className="w-full rounded-full border border-black/12 py-2.5 text-[15px] font-normal text-[#1D1D1F] hover:bg-black/4 transition-colors flex items-center justify-center gap-2"
      >
        <SkipForward className="size-4 text-[#6E6E73]" />
        {t("Skip for now", "تخطي الآن")}
      </button>

      <div className="flex items-center justify-between pt-1 border-t border-black/8">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-[13px] text-[#6E6E73] hover:text-[#1D1D1F] transition-colors"
        >
          <ChevronRight className="size-4 rtl:rotate-180" />
          {t("Back", "رجوع")}
        </button>
        <button
          onClick={handleCancel}
          disabled={cancelling || sending}
          className="flex items-center gap-1.5 text-[13px] text-[#FF3B30] hover:text-[#CC2A20] transition-colors disabled:opacity-40"
        >
          {cancelling ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
          {t("Cancel setup", "إلغاء الإعداد")}
        </button>
      </div>
    </div>
  );
}
