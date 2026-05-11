"use client";

import { useState, use, useEffect } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DepartmentList } from "@/components/settings/department-list";
import { DT } from "@/lib/design-tokens";
import { Pencil, Check, X, Trash2, UserCircle, AlertTriangle, Clock, CheckCircle2, Zap, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmbeddedSignupButton } from "@/components/onboarding/embedded-signup-button";

export default function ChannelSettingsPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const t = useT();
  const { isAuthenticated } = useConvexAuth();
  const { channelId: rawChannelId } = use(params);
  const channelId = rawChannelId as Id<"channels">;
  const channel = useQuery(api.channels.get, isAuthenticated ? { channelId } : "skip");
  const updateName = useMutation(api.channels.updateName);
  const removeChannel = useMutation(api.channels.remove);
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [saving, setSaving] = useState(false);

  const updateSlaThreshold = useMutation(api.sla.updateChannelSlaThreshold);
  const [slaMinutes, setSlaMinutes] = useState<string>("");
  const [savingSla, setSavingSla] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectError, setReconnectError] = useState<string | null>(null);
  const [reconnectSuccess, setReconnectSuccess] = useState(false);

  const updateReopenWindow = useMutation(api.channels.updateReopenWindow);
  const [reopenHours, setReopenHours] = useState<string>("");
  const [savingReopen, setSavingReopen] = useState(false);

  const updateMissedCallAutoReply = useMutation(api.channels.updateMissedCallAutoReply);
  const [callReply, setCallReply] = useState<string>("");
  const [savingCallReply, setSavingCallReply] = useState(false);

  const rules = useQuery(api.automations.listRules, {}) as { _id: string }[] | undefined;
  const templates = useQuery(api.messageTemplates.list, {}) as { _id: string }[] | undefined;
  const automationCount = rules?.length ?? 0;
  const templateCount = templates?.length ?? 0;

  useEffect(() => {
    if (channel) {
      setSlaMinutes(channel.slaThresholdMinutes ? String(channel.slaThresholdMinutes) : "");
      setReopenHours(channel.reopenWindowHours ? String(channel.reopenWindowHours) : "");
      setCallReply(channel.missedCallAutoReply ?? "");
    }
  }, [channel?.slaThresholdMinutes, channel?.reopenWindowHours, channel?.missedCallAutoReply]);
  const router = useRouter();

  const isInGracePeriod =
    channel &&
    (channel.status === "disconnected" || channel.status === "reconnect_required") &&
    !!channel.disconnectedAt;
  const graceDaysLeft = isInGracePeriod
    ? Math.max(0, 30 - Math.floor((Date.now() - (channel?.disconnectedAt ?? 0)) / 86_400_000))
    : null;

  const startEdit = () => {
    if (!channel) return;
    setNameValue(channel.displayName);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setNameValue("");
  };

  const saveName = async () => {
    if (!nameValue.trim()) return;
    setSaving(true);
    try {
      await updateName({ channelId, displayName: nameValue.trim() });
      setEditing(false);
    } catch {
      toast.error(t("Update failed", "فشل التحديث"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!channel) return;
    if (!confirm(t(`Delete "${channel.displayName}"?`, `حذف "${channel.displayName}"؟`))) return;
    try {
      await removeChannel({ channelId });
      router.push("/settings/channels");
      toast.success(t("Deleted", "تم الحذف"));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("HAS_CONVERSATIONS")) {
        toast.error(t("Cannot delete — has conversations", "لا يمكن الحذف - توجد محادثات"));
      } else {
        toast.error(msg);
      }
    }
  };

  if (channel === undefined) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <div className="h-8 rounded bg-muted animate-pulse w-48" />
        <div className="h-32 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center text-muted-foreground">
        {t("Channel not found", "القناة غير موجودة")}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Grace period warning banner */}
      {isInGracePeriod && graceDaysLeft !== null && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 font-cairo">
              <Clock className="size-4" />
              {graceDaysLeft === 0
                ? t("This number will be deleted today", "سيتم حذف هذا الرقم اليوم")
                : t(
                    `This number will be deleted in ${graceDaysLeft} days`,
                    `سيتم حذف هذا الرقم خلال ${graceDaysLeft} أيام`
                  )}
            </span>
            {reconnecting ? (
              <EmbeddedSignupButton
                onSuccess={() => {
                  setReconnecting(false);
                  setReconnectSuccess(true);
                  toast.success(t("Channel reconnected successfully!", "تم إعادة ربط القناة بنجاح!"));
                  setTimeout(() => {
                    router.refresh();
                  }, 500);
                }}
                onError={(err) => setReconnectError(err)}
                label={t("Reconnect Now", "أعد الاتصال الآن")}
              />
            ) : (
              <button className={DT.BTN_PRIMARY}
                onClick={() => { setReconnecting(true); setReconnectError(null); }}
              >
                {t("Reconnect Now", "أعد الاتصال الآن")}
              </button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {reconnectError && (
        <Alert variant="destructive">
          <AlertDescription className="font-cairo text-xs">{reconnectError}</AlertDescription>
        </Alert>
      )}

      {reconnectSuccess && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-300">
            <p className="font-semibold font-cairo mb-2">
              {t("Reconnected successfully!", "تم إعادة الاتصال بنجاح!")}
            </p>
            <p className="text-xs mb-3 font-cairo text-green-700 dark:text-green-400">
              {t("Your workspace data is ready:", "بياناتك جاهزة:")}
            </p>
            <div className="flex flex-wrap gap-2">
              <button className={`${DT.BTN_PRIMARY} h-7 text-xs border-green-300 text-green-800 hover:bg-green-100 dark:text-green-300 dark:border-green-700 dark:hover:bg-green-900/30 gap-1.5`}
                onClick={() => router.push("/automations")}>
                <Zap className="size-3" />
                {t(`${automationCount} Automation Rules`, `${automationCount} قاعدة أتمتة`)}
              </button>
              <button className={`${DT.BTN_PRIMARY} h-7 text-xs border-green-300 text-green-800 hover:bg-green-100 dark:text-green-300 dark:border-green-700 dark:hover:bg-green-900/30 gap-1.5`}
                onClick={() => router.push("/settings/templates")}>
                <FileText className="size-3" />
                {t(`${templateCount} Templates`, `${templateCount} قالب`)}
              </button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <input className={`${DT.INPUT} max-w-sm text-2xl font-bold h-auto px-3 py-1`}
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                disabled={saving}
                autoFocus
              />
              <button className={DT.BTN_PRIMARY} onClick={saveName} disabled={saving || !nameValue.trim()}>
                <Check className="size-4" />
              </button>
              <button className={DT.BTN_PRIMARY} onClick={cancelEdit} disabled={saving}>
                <X className="size-4" />
              </button>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">{channel.displayName}</h1>
              <button className={DT.BTN_PRIMARY} onClick={startEdit}>
                <Pencil className="size-4" />
              </button>
            </>
          )}
        </div>
        <button className={DT.BTN_PRIMARY}
          onClick={handleDelete}
        >
          <Trash2 className="size-4 me-1" />
          {t("Delete", "حذف")}
        </button>
      </div>

      <div className="space-y-2 border-t pt-6">
        <h3 className="text-sm font-medium">{t("SLA Threshold", "حد SLA")}</h3>
        <p className="text-xs text-muted-foreground">
          {t(
            "Flag conversations with no agent reply after this many minutes. Leave empty to disable.",
            "علّم المحادثات التي لم يتم الرد عليها خلال هذه الدقائق. اتركه فارغاً للتعطيل.",
          )}
        </p>
        <div className="flex items-center gap-2">
          <input className={`${DT.INPUT} w-32`}
            type="number"
            min={1}
            max={1440}
            placeholder={t("e.g. 10", "مثال: 10")}
            value={slaMinutes}
            onChange={(e) => setSlaMinutes(e.target.value)}
          />
          <span className="text-sm text-muted-foreground">
            {t("minutes", "دقيقة")}
          </span>
          <button className={DT.BTN_PRIMARY}
            disabled={savingSla}
            onClick={async () => {
              setSavingSla(true);
              try {
                const parsed = parseInt(slaMinutes);
                await updateSlaThreshold({
                  channelId,
                  thresholdMinutes: isNaN(parsed) || parsed <= 0 ? undefined : parsed,
                });
                toast.success(t("SLA threshold saved", "تم حفظ حد SLA"));
              } catch {
                toast.error(t("Failed to save SLA threshold", "فشل حفظ حد SLA"));
              } finally {
                setSavingSla(false);
              }
            }}
          >
            {savingSla ? t("Saving...", "جاري الحفظ...") : t("Save", "حفظ")}
          </button>
          {slaMinutes && (
            <button className={DT.BTN_PRIMARY}
              onClick={async () => {
                setSavingSla(true);
                try {
                  await updateSlaThreshold({ channelId, thresholdMinutes: undefined });
                  setSlaMinutes("");
                  toast.success(t("SLA disabled", "تم تعطيل SLA"));
                } catch {
                  toast.error(t("Failed to disable SLA", "فشل تعطيل SLA"));
                } finally {
                  setSavingSla(false);
                }
              }}
            >
              {t("Disable", "تعطيل")}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2 border-t pt-6">
        <h3 className="text-sm font-medium">{t("Reopen Window", "نافذة إعادة الفتح")}</h3>
        <p className="text-xs text-muted-foreground">
          {t(
            "If a customer replies within this many hours of resolving, reopen the same conversation. After that, start a new one. Default: 24 hours.",
            "إذا رد العميل خلال هذا العدد من الساعات بعد إغلاق المحادثة، يُعاد فتحها. بعد ذلك، تبدأ محادثة جديدة. الافتراضي: 24 ساعة.",
          )}
        </p>
        <div className="flex items-center gap-2">
          <input className={`${DT.INPUT} w-32`}
            type="number"
            min={1}
            max={720}
            placeholder={t("e.g. 24", "مثال: 24")}
            value={reopenHours}
            onChange={(e) => setReopenHours(e.target.value)}
          />
          <span className="text-sm text-muted-foreground">
            {t("hours", "ساعة")}
          </span>
          <button className={DT.BTN_PRIMARY}
            disabled={savingReopen}
            onClick={async () => {
              setSavingReopen(true);
              try {
                const parsed = parseInt(reopenHours);
                await updateReopenWindow({
                  channelId,
                  hours: isNaN(parsed) || parsed <= 0 ? undefined : parsed,
                });
                toast.success(t("Reopen window saved", "تم حفظ نافذة إعادة الفتح"));
              } catch {
                toast.error(t("Failed to save", "فشل الحفظ"));
              } finally {
                setSavingReopen(false);
              }
            }}
          >
            {savingReopen ? t("Saving...", "جاري الحفظ...") : t("Save", "حفظ")}
          </button>
          {reopenHours && (
            <button className={DT.BTN_PRIMARY}
              onClick={async () => {
                setSavingReopen(true);
                try {
                  await updateReopenWindow({ channelId, hours: undefined });
                  setReopenHours("");
                  toast.success(t("Reset to default (24h)", "تمت إعادة الضبط (24 ساعة)"));
                } catch {
                  toast.error(t("Failed to reset", "فشل إعادة الضبط"));
                } finally {
                  setSavingReopen(false);
                }
              }}
            >
              {t("Reset", "إعادة")}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2 border-t pt-6">
        <h3 className="text-sm font-medium">{t("Missed Call Auto-Reply", "رد تلقائي على المكالمات الفائتة")}</h3>
        <p className="text-xs text-muted-foreground font-cairo">
          {t(
            "Sent automatically when a customer calls your WhatsApp number and no one answers. Leave empty to use the default message.",
            "يُرسَل تلقائياً عندما يتصل العميل على رقم واتساب ولا يرد أحد. اتركه فارغاً لاستخدام الرسالة الافتراضية.",
          )}
        </p>
        <textarea className={`${DT.TEXTAREA} max-w-sm font-cairo`}
          dir="rtl"
          rows={3}
          maxLength={1000}
          placeholder={t(
            "Default: مرحباً! رأينا مكالمتك 😊 كيف نقدر نساعدك؟",
            "الافتراضي: مرحباً! رأينا مكالمتك 😊 كيف نقدر نساعدك؟",
          )}
          value={callReply}
          onChange={(e) => setCallReply(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <button className={DT.BTN_PRIMARY}
            disabled={savingCallReply}
            onClick={async () => {
              setSavingCallReply(true);
              try {
                await updateMissedCallAutoReply({
                  channelId,
                  message: callReply.trim() || undefined,
                });
                toast.success(t("Auto-reply saved", "تم حفظ الرد التلقائي"));
              } catch {
                toast.error(t("Failed to save", "فشل الحفظ"));
              } finally {
                setSavingCallReply(false);
              }
            }}
          >
            {savingCallReply ? t("Saving...", "جاري الحفظ...") : t("Save", "حفظ")}
          </button>
          {callReply && (
            <button className={DT.BTN_PRIMARY}
              onClick={async () => {
                setSavingCallReply(true);
                try {
                  await updateMissedCallAutoReply({ channelId, message: undefined });
                  setCallReply("");
                  toast.success(t("Reset to default", "تمت إعادة الضبط للافتراضي"));
                } catch {
                  toast.error(t("Failed to reset", "فشل إعادة الضبط"));
                } finally {
                  setSavingCallReply(false);
                }
              }}
            >
              {t("Reset", "إعادة")}
            </button>
          )}
        </div>
      </div>

      <div className="border-t pt-6">
        <DepartmentList channelId={channelId} />
      </div>

      {channel.status === "active" && (
        <div className="border-t pt-6 space-y-3">
          <h3 className="text-sm font-medium">{t("Workspace Settings", "إعدادات مساحة العمل")}</h3>
          <p className="text-xs text-muted-foreground font-cairo">
            {t(
              "Automation rules and message templates apply to all your channels.",
              "قواعد الأتمتة وقوالب الرسائل تُطبَّق على جميع قنواتك."
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <button className={`${DT.BTN_PRIMARY} gap-1.5`}
              onClick={() => router.push("/automations")}>
              <Zap className="size-3.5" />
              {rules === undefined
                ? t("Automation Rules", "قواعد الأتمتة")
                : t(`${automationCount} Automation Rules`, `${automationCount} قاعدة أتمتة`)}
            </button>
            <button className={`${DT.BTN_PRIMARY} gap-1.5`}
              onClick={() => router.push("/settings/templates")}>
              <FileText className="size-3.5" />
              {templates === undefined
                ? t("Message Templates", "قوالب الرسائل")
                : t(`${templateCount} Templates`, `${templateCount} قالب`)}
            </button>
          </div>
        </div>
      )}

      <div className="border-t pt-6">
        <button className={`${DT.BTN_PRIMARY} gap-2`}
          onClick={() => router.push(`/settings/channels/${channelId}/profile`)}
        >
          <UserCircle className="size-4" />
          {t("Business Profile", "الملف التجاري")}
        </button>
      </div>
    </div>
  );
}
