"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";
import { useOrganization } from "@clerk/nextjs";
import { Lock } from "lucide-react";

export function CsatSettings() {
  const t = useT();
  const { isAuthenticated } = useConvexAuth();
  const { membership } = useOrganization();
  const role = membership?.role as string | undefined;
  const isAdmin = role === "org:admin" || role === "admin";

  const settings = useQuery(api.csat.getSettings, isAuthenticated ? undefined : "skip");
  const updateSettings = useMutation(api.csat.updateSettings);

  const [enabled, setEnabled] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState(5);
  const [saving, setSaving] = useState(false);

  // Sync form state from loaded settings
  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setDelayMinutes(settings.delayMinutes);
    }
  }, [settings]);

  async function handleSave() {
    setSaving(true);
    try {
      await updateSettings({ enabled, delayMinutes });
      toast.success(t("Settings saved", "تم حفظ الإعدادات"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("PLAN_LIMIT") || msg.includes("FORBIDDEN")) {
        toast.error(t("CSAT is available on Growth and above", "CSAT متاح لخطة النمو وما فوق"));
      } else {
        toast.error(t("Failed to save", "فشل الحفظ"));
      }
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Lock className="size-4" />
        {t("Only admins can configure CSAT.", "يمكن للمدراء فقط ضبط إعدادات CSAT.")}
      </div>
    );
  }

  if (settings === undefined) {
    return <div className="h-32 rounded-lg bg-muted animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("Customer Satisfaction (CSAT)", "تقييم رضا العملاء (CSAT)")}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t(
            "Automatically ask customers to rate their experience after a conversation is resolved.",
            "اطلب تلقائياً من العملاء تقييم تجربتهم بعد إغلاق المحادثة.",
          )}
        </p>
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t("Enable CSAT", "تفعيل CSAT")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(
                "Send a rating request when a conversation is resolved.",
                "أرسل طلب تقييم عند إغلاق المحادثة.",
              )}
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {/* Delay setting */}
        {enabled && (
          <div className="flex items-center gap-3 pt-2 border-t">
            <label className="text-sm font-medium flex-1">
              {t("Send after (minutes)", "الإرسال بعد (دقائق)")}
            </label>
            <Input
              type="number"
              min={0}
              max={60}
              value={delayMinutes}
              onChange={(e) => setDelayMinutes(Math.max(0, Math.min(60, parseInt(e.target.value) || 0)))}
              className="w-20 text-center"
            />
          </div>
        )}
      </div>

      {/* Preview of the message that will be sent */}
      {enabled && (
        <div className="rounded-lg bg-muted/50 border p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {t("Message preview (Arabic)", "معاينة الرسالة (عربي)")}
          </p>
          <div className="text-sm whitespace-pre-line leading-relaxed" dir="rtl">
            {`شكراً على تواصلك مع [اسم الشركة] 😊\n\nكيف كانت تجربتك معنا؟\n\n1 - سيء جداً\n2 - سيء\n3 - مقبول\n4 - جيد\n5 - ممتاز\n\nأرسل الرقم المناسب`}
          </div>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving || settings === undefined}>
        {saving ? t("Saving...", "جاري الحفظ...") : t("Save Settings", "حفظ الإعدادات")}
      </Button>
    </div>
  );
}
