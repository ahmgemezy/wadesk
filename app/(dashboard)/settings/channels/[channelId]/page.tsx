"use client";

import { useState, use, useEffect } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DepartmentList } from "@/components/settings/department-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X, Trash2, UserCircle, AlertTriangle, Clock } from "lucide-react";
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

  useEffect(() => {
    if (channel) {
      setSlaMinutes(channel.slaThresholdMinutes ? String(channel.slaThresholdMinutes) : "");
    }
  }, [channel?.slaThresholdMinutes]);
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
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setReconnecting(true); setReconnectError(null); }}
              >
                {t("Reconnect Now", "أعد الاتصال الآن")}
              </Button>
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
          <AlertDescription className="text-green-800 dark:text-green-300 font-cairo">
            {t("Reconnected successfully!", "تم إعادة الاتصال بنجاح!")}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                disabled={saving}
                className="max-w-sm text-2xl font-bold h-auto px-3 py-1"
                autoFocus
              />
              <Button size="icon-sm" onClick={saveName} disabled={saving || !nameValue.trim()}>
                <Check className="size-4" />
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={cancelEdit} disabled={saving}>
                <X className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">{channel.displayName}</h1>
              <Button size="icon-sm" variant="ghost" onClick={startEdit}>
                <Pencil className="size-4" />
              </Button>
            </>
          )}
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
        >
          <Trash2 className="size-4 me-1" />
          {t("Delete", "حذف")}
        </Button>
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
          <Input
            type="number"
            min={1}
            max={1440}
            placeholder={t("e.g. 10", "مثال: 10")}
            value={slaMinutes}
            onChange={(e) => setSlaMinutes(e.target.value)}
            className="w-32"
          />
          <span className="text-sm text-muted-foreground">
            {t("minutes", "دقيقة")}
          </span>
          <Button
            size="sm"
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
          </Button>
          {slaMinutes && (
            <Button
              size="sm"
              variant="ghost"
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
            </Button>
          )}
        </div>
      </div>

      <div className="border-t pt-6">
        <DepartmentList channelId={channelId} />
      </div>

      <div className="border-t pt-6">
        <Button
          variant="outline"
          onClick={() => router.push(`/settings/channels/${channelId}/profile`)}
          className="gap-2"
        >
          <UserCircle className="size-4" />
          {t("Business Profile", "الملف التجاري")}
        </Button>
      </div>
    </div>
  );
}
