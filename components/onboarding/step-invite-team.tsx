"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Send, SkipForward, Loader2, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n/context";

interface StepInviteTeamProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function StepInviteTeam({ onComplete, onSkip }: StepInviteTeamProps) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const markStep = useMutation(api.onboarding.markStep);
  const unmarkStep = useMutation(api.onboarding.unmarkStep);
  const generateInvite = useMutation(api.inviteLinks.generate);

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
      setError("فشل إرسال الدعوة — حاول مرة تانية");
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
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">{t("Invite Team", "دعوة الفريق")}</h2>
        <p className="text-muted-foreground mt-1">
          {t("Invite team members to join your workspace", "ادعُ أعضاء الفريق للانضمام إلى مساحة العمل")}
        </p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <div className="flex gap-2">
          <input
            type="email"
            dir="ltr"
            placeholder="agent@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={sending || sent}
          />
          <button
            onClick={handleSendInvite}
            disabled={sending || sent || !email.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            أرسل دعوة
          </button>
        </div>

        {sent && (
          <p className="text-sm text-green-600 text-center">تم إرسال الدعوة ✓</p>
        )}

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">أو</span>
          </div>
        </div>

        <button
          onClick={handleSkip}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <SkipForward className="w-4 h-4" />
          تخطي الآن
        </button>

        <button
          onClick={handleBack}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
          رجوع للخطوة السابقة
        </button>
      </div>
    </div>
  );
}
