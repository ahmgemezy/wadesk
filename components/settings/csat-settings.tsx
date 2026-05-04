"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";
import { useOrganization } from "@clerk/nextjs";
import { Lock, RefreshCw, CheckCircle2, Clock, XCircle, Wifi } from "lucide-react";

type TemplateStatus = "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | null;
type CsatLanguage = "ar" | "en";

// Mirror of the server-side CSAT_TEMPLATE_CONFIG — only the preview-relevant parts.
const TEMPLATE_PREVIEW: Record<CsatLanguage, { body: string; dir: "rtl" | "ltr"; label: string }> = {
  ar: {
    label: "العربية",
    dir: "rtl",
    body: "شكراً على تواصلك مع [اسم الشركة] 😊\n\nكيف كانت تجربتك معنا؟\n\n1 - سيء جداً\n2 - سيء\n3 - مقبول\n4 - جيد\n5 - ممتاز\n\nأرسل الرقم المناسب",
  },
  en: {
    label: "English",
    dir: "ltr",
    body: "Thank you for contacting [Company Name] 😊\n\nHow was your experience with us?\n\n1 - Very Bad\n2 - Bad\n3 - Acceptable\n4 - Good\n5 - Excellent\n\nReply with the number",
  },
};

function StatusBadge({ status }: { status: TemplateStatus }) {
  const t = useT();
  if (status === "APPROVED") {
    return (
      <Badge variant="outline" className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="size-3" />
        {t("Approved — Active", "معتمد — نشط")}
      </Badge>
    );
  }
  if (status === "PENDING") {
    return (
      <Badge variant="outline" className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <Clock className="size-3" />
        {t("Pending Meta Review", "قيد مراجعة Meta")}
      </Badge>
    );
  }
  if (status === "REJECTED" || status === "PAUSED") {
    return (
      <Badge variant="outline" className="gap-1 border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400">
        <XCircle className="size-3" />
        {status === "PAUSED" ? t("Paused", "موقوف") : t("Rejected by Meta", "مرفوض من Meta")}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <Wifi className="size-3" />
      {t("Not submitted", "لم يُرسل بعد")}
    </Badge>
  );
}

export function CsatSettings() {
  const t = useT();
  const { isAuthenticated } = useConvexAuth();
  const { membership } = useOrganization();
  const role = membership?.role as string | undefined;
  const isAdmin = role === "org:admin" || role === "admin";

  const settings = useQuery(api.csat.getSettings, isAuthenticated ? undefined : "skip");
  const templateStatuses = useQuery(api.csat.getCsatTemplateStatuses, isAuthenticated ? undefined : "skip");
  const updateSettings = useMutation(api.csat.updateSettings);
  const syncStatuses = useAction(api.csat.syncCsatTemplateStatuses);
  const resubmitTemplate = useAction(api.csat.resubmitCsatTemplate);

  const [enabled, setEnabled] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState(5);
  const [language, setLanguage] = useState<CsatLanguage>("ar");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [resubmitting, setResubmitting] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setDelayMinutes(settings.delayMinutes);
      setLanguage((settings.language ?? "ar") as CsatLanguage);
    }
  }, [settings]);

  async function handleSave() {
    setSaving(true);
    try {
      await updateSettings({ enabled, delayMinutes, language });
      toast.success(t("Settings saved", "تم حفظ الإعدادات"));
      if (enabled) {
        toast.info(
          t(
            "Submitting CSAT template to Meta for approval…",
            "جاري إرسال قالب CSAT إلى Meta للاعتماد…",
          ),
          { duration: 5000 },
        );
      }
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

  async function handleSync() {
    setSyncing(true);
    try {
      await syncStatuses({});
      toast.success(t("Status refreshed", "تم تحديث الحالة"));
    } catch {
      toast.error(t("Failed to sync", "فشل التحديث"));
    } finally {
      setSyncing(false);
    }
  }

  async function handleResubmit(channelId: Id<"channels">) {
    setResubmitting(channelId);
    try {
      await resubmitTemplate({ channelId });
      toast.success(t("Template resubmitted to Meta", "تم إعادة إرسال القالب إلى Meta"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg.includes("CHANNEL_NOT_FOUND") ? t("Channel not found", "القناة غير موجودة") : t("Resubmission failed", "فشلت إعادة الإرسال"));
    } finally {
      setResubmitting(null);
    }
  }

  const hasPending = templateStatuses?.some((s) => s.status === "PENDING");
  const hasRejected = templateStatuses?.some((s) => s.status === "REJECTED" || s.status === "PAUSED");
  const allApproved = !!templateStatuses?.length && templateStatuses.every((s) => s.status === "APPROVED");

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

  const preview = TEMPLATE_PREVIEW[language];

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

      {/* Enable toggle + delay */}
      <div className="space-y-4 rounded-lg border p-4">
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
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

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
              onChange={(e) =>
                setDelayMinutes(Math.max(0, Math.min(60, parseInt(e.target.value) || 0)))
              }
              className="w-20 text-center"
            />
          </div>
        )}
      </div>

      {/* Template language selector */}
      <div className="rounded-lg border p-4 space-y-3">
        <div>
          <p className="text-sm font-medium">{t("Message Language", "لغة الرسالة")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t(
              "WaDesk will submit the selected language template to Meta automatically.",
              "سيرسل WaDesk القالب باللغة المختارة إلى Meta تلقائياً.",
            )}
          </p>
        </div>

        {/* Segmented language toggle */}
        <div className="inline-flex rounded-md border bg-muted p-1 gap-1">
          {(["ar", "en"] as CsatLanguage[]).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                language === lang
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {TEMPLATE_PREVIEW[lang].label}
            </button>
          ))}
        </div>

        {/* Message preview */}
        <div className="rounded-lg bg-muted/50 border p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {t("Message preview", "معاينة الرسالة")}
          </p>
          <div
            className="text-sm whitespace-pre-line leading-relaxed"
            dir={preview.dir}
          >
            {preview.body}
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving || settings === undefined}>
        {saving ? t("Saving…", "جاري الحفظ…") : t("Save Settings", "حفظ الإعدادات")}
      </Button>

      {/* Template approval status — shown when CSAT is currently enabled (from DB) */}
      {settings.enabled && templateStatuses !== undefined && (
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{t("WhatsApp Template Approval", "اعتماد قالب واتساب")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t(
                  "WaDesk automatically submitted the CSAT template to Meta on your behalf.",
                  "أرسل WaDesk قالب CSAT إلى Meta تلقائياً نيابةً عنك.",
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              className="shrink-0"
            >
              <RefreshCw className={`size-3.5 me-1.5 ${syncing ? "animate-spin" : ""}`} />
              {t("Refresh", "تحديث")}
            </Button>
          </div>

          {hasPending && !allApproved && (
            <div className="rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              {t(
                "Meta is reviewing your CSAT template. This usually takes a few minutes to a few hours. You'll be notified once approved.",
                "Meta تراجع قالب CSAT الخاص بك. يستغرق ذلك عادةً دقائق إلى ساعات. ستُبلَّغ فور الاعتماد.",
              )}
            </div>
          )}

          {hasRejected && (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-700 dark:text-red-400">
              {t(
                "One or more channels had their template rejected by Meta. Use the Resubmit button below. If rejection persists, ensure your WhatsApp Business account is verified.",
                "رفضت Meta القالب لقناة أو أكثر. اضغط إعادة الإرسال أدناه. إذا استمر الرفض، تأكد من تحقق حساب WhatsApp Business الخاص بك.",
              )}
            </div>
          )}

          {allApproved && (
            <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
              {t(
                "All channels are ready. CSAT messages will be sent automatically when conversations are resolved.",
                "جميع القنوات جاهزة. ستُرسَل رسائل CSAT تلقائياً عند إغلاق المحادثات.",
              )}
            </div>
          )}

          {templateStatuses.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("No WhatsApp channels connected yet.", "لا توجد قنوات واتساب متصلة بعد.")}
            </p>
          ) : (
            <div className="space-y-2">
              {templateStatuses.map((ch) => (
                <div
                  key={ch.channelId}
                  className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{ch.channelName}</p>
                    {ch.displayPhone && (
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        {ch.displayPhone}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={ch.status as TemplateStatus} />
                    {(ch.status === "REJECTED" || ch.status === "PAUSED" || ch.status === null) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={resubmitting === ch.channelId}
                        onClick={() => handleResubmit(ch.channelId as Id<"channels">)}
                      >
                        {resubmitting === ch.channelId
                          ? t("Submitting…", "جاري الإرسال…")
                          : t("Resubmit", "إعادة إرسال")}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {templateStatuses.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {t(
                "Template status updates automatically when Meta approves or rejects.",
                "تتحدث حالة القالب تلقائياً عند قرار Meta.",
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
