"use client";

import { useState } from "react";
import { useAction, useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";
import { DT } from "@/lib/design-tokens";

interface ForwardToBranchDialogProps {
  conversationId: Id<"conversations">;
  channelId: Id<"channels">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ForwardToBranchDialog({
  conversationId,
  channelId,
  open,
  onOpenChange,
}: ForwardToBranchDialogProps) {
  const t = useT();
  const { isAuthenticated } = useConvexAuth();
  const [targetChannelId, setTargetChannelId] = useState("");
  const [targetDeptId, setTargetDeptId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const channels = useQuery(
    api.channels.listOtherChannelsForForward,
    isAuthenticated ? { excludeChannelId: channelId } : "skip",
  );
  const departments = useQuery(
    api.departments.listForTransfer,
    isAuthenticated && targetChannelId
      ? { channelId: targetChannelId as Id<"channels">, excludeDepartmentId: undefined }
      : "skip",
  );
  const preview = useQuery(
    api.conversations.previewForwardMessage,
    isAuthenticated && targetChannelId
      ? {
          conversationId,
          targetChannelId: targetChannelId as Id<"channels">,
        }
      : "skip",
  );

  const forward = useAction(api.conversations.forwardToBranch);

  const handleSubmit = async () => {
    if (!targetChannelId) return;
    setSubmitting(true);
    try {
      await forward({
        conversationId,
        targetChannelId: targetChannelId as Id<"channels">,
        targetDepartmentId: (targetDeptId || undefined) as Id<"departments"> | undefined,
      });
      toast.success(t("Conversation forwarded", "تم تحويل المحادثة"));
      onOpenChange(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("OUTSIDE_24H_WINDOW")) {
        toast.error(
          t(
            "Outside the 24h window — ask the customer to message first",
            "خارج نافذة 24 ساعة — اطلب من العميل المراسلة أولاً",
          ),
        );
      } else if (msg.includes("TARGET_CHANNEL_INACTIVE")) {
        toast.error(
          t("That branch isn't connected right now", "هذا الفرع غير متصل حاليا"),
        );
      } else if (msg.includes("CONVERSATION_NOT_OPEN")) {
        toast.error(t("Conversation is not open", "المحادثة ليست مفتوحة"));
      } else {
        toast.error(t("Forward failed", "فشل التحويل"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DT.DIALOG}>
        <DialogHeader>
          <DialogTitle>{t("Send to another number", "إرسال لرقم آخر")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <label className="text-sm font-medium">{t("Target branch", "الفرع المستهدف")}</label>
            {channels === undefined ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : channels.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("No other branches", "لا توجد فروع أخرى")}
              </p>
            ) : (
              <select
                className={DT.SELECT}
                value={targetChannelId}
                onChange={(e) => {
                  setTargetChannelId(e.target.value);
                  setTargetDeptId("");
                }}
              >
                <option value="">{t("Select…", "اختر…")}</option>
                {channels.map((c: { _id: string; displayName?: string; displayPhone?: string }) => (
                  <option key={c._id} value={c._id}>
                    {c.displayName} {c.displayPhone ?? ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              {t("Target department (optional)", "إدارة مستهدفة (اختياري)")}
            </label>
            <select
              className={`${DT.SELECT} disabled:opacity-50`}
              value={targetDeptId}
              onChange={(e) => setTargetDeptId(e.target.value)}
              disabled={!targetChannelId || departments === undefined}
            >
              <option value="">{t("— none —", "— بدون —")}</option>
              {(departments ?? []).map((d: { _id: string; name: string }) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {preview && (
            <div className="space-y-1">
              <label className="text-sm font-medium">
                {t(
                  "Message that will be sent to the customer",
                  "الرسالة التي سيتم إرسالها للعميل",
                )}
              </label>
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                {preview}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t("Cancel", "إلغاء")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={submitting || !targetChannelId}
            >
              {submitting && <Loader2 className="size-4 animate-spin me-2" />}
              {t("Forward and close", "أرسل وأغلق المحادثة")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
