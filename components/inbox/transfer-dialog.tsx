"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";

interface Props {
  conversationId: string;
  channelId: string;
  currentDepartmentId?: string;
}

export function TransferDialog({ conversationId, channelId, currentDepartmentId }: Props) {
  const t = useT();
  const { isAuthenticated } = useConvexAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<string>("within");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" title={t("Transfer", "نقل")} />}>
        <ArrowRightLeft className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Transfer", "نقل")}</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="within" className="flex-1">
              {t("Within branch", "داخل الفرع")}
            </TabsTrigger>
            <TabsTrigger value="forward" className="flex-1">
              {t("Forward to branch", "تحويل لفرع آخر")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="within">
            <WithinBranchPanel
              conversationId={conversationId}
              channelId={channelId}
              currentDepartmentId={currentDepartmentId}
              isAuthenticated={isAuthenticated}
              onDone={() => setOpen(false)}
            />
          </TabsContent>
          <TabsContent value="forward">
            <ForwardToBranchPanel
              conversationId={conversationId}
              channelId={channelId}
              isAuthenticated={isAuthenticated}
              onDone={() => setOpen(false)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function WithinBranchPanel({
  conversationId,
  channelId,
  currentDepartmentId,
  isAuthenticated,
  onDone,
}: {
  conversationId: string;
  channelId: string;
  currentDepartmentId?: string;
  isAuthenticated: boolean;
  onDone: () => void;
}) {
  const t = useT();
  const [deptId, setDeptId] = useState<string>("");
  const [agentId, setAgentId] = useState<string>("any");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const departments = useQuery(
    api.departments.listForTransfer,
    isAuthenticated
      ? {
          channelId: channelId as Id<"channels">,
          excludeDepartmentId: currentDepartmentId as Id<"departments"> | undefined,
        }
      : "skip"
  );

  const agents = useQuery(
    api.departmentMembers.listForDepartment,
    isAuthenticated && deptId
      ? { departmentId: deptId as Id<"departments"> }
      : "skip"
  );

  const transfer = useMutation(api.conversations.transferWithinChannel);

  const submit = async () => {
    if (!deptId) return;
    setSubmitting(true);
    try {
      await transfer({
        conversationId: conversationId as Id<"conversations">,
        targetDepartmentId: deptId as Id<"departments">,
        assignAgentId: agentId === "any" ? undefined : agentId,
        internalNote: note.trim() || undefined,
      });
      toast.success(t("Conversation transferred", "تم نقل المحادثة"));
      onDone();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("AGENT_NOT_IN_DEPARTMENT")) {
        toast.error(t("Selected agent is no longer in this department", "العضو لم يعد ضمن هذه الإدارة"));
      } else if (msg.includes("DEPARTMENT_ARCHIVED")) {
        toast.error(t("Department is archived", "الإدارة مؤرشفة"));
      } else if (msg.includes("CROSS_CHANNEL_USE_FORWARD")) {
        toast.error(t("Use Forward to send to another branch", "استخدم التحويل لفرع آخر"));
      } else {
        toast.error(t("Transfer failed", "فشل نقل المحادثة"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 pt-3">
      <div className="space-y-1">
        <label className="text-sm font-medium">{t("Department", "الإدارة")}</label>
        {departments === undefined ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={deptId}
            onChange={(e) => {
              setDeptId(e.target.value);
              setAgentId("any");
            }}
          >
            <option value="">{t("Select…", "اختر…")}</option>
            {departments.map((d: any) => (
              <option key={d._id} value={d._id}>
                {d.name}
                {d.isDefault ? ` (${t("Default", "افتراضية")})` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">
          {t("Agent in department (optional)", "موظف داخل الإدارة (اختياري)")}
        </label>
        <select
          className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          disabled={!deptId || agents === undefined}
        >
          <option value="any">{t("Any agent — keep unassigned", "أي موظف — اتركها بدون تعيين")}</option>
          {(agents ?? []).map((a: any) => (
            <option key={a.userId} value={a.userId}>
              {a.userName ?? a.userId}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">
          {t("Note for the receiving team (optional)", "ملاحظة للفريق المستلم (اختياري)")}
        </label>
        <textarea
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onDone} disabled={submitting}>
          {t("Cancel", "إلغاء")}
        </Button>
        <Button onClick={submit} disabled={submitting || !deptId}>
          {submitting && <Loader2 className="size-4 animate-spin me-2" />}
          {t("Transfer", "نقل")}
        </Button>
      </div>
    </div>
  );
}

function ForwardToBranchPanel({
  conversationId,
  channelId,
  isAuthenticated,
  onDone,
}: {
  conversationId: string;
  channelId: string;
  isAuthenticated: boolean;
  onDone: () => void;
}) {
  const t = useT();
  const [targetChannelId, setTargetChannelId] = useState<string>("");
  const [targetDeptId, setTargetDeptId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const channels = useQuery(
    api.channels.listOtherChannelsForForward,
    isAuthenticated ? { excludeChannelId: channelId as Id<"channels"> } : "skip"
  );

  const departments = useQuery(
    api.departments.listForTransfer,
    isAuthenticated && targetChannelId
      ? { channelId: targetChannelId as Id<"channels">, excludeDepartmentId: undefined }
      : "skip"
  );

  const preview = useQuery(
    api.conversations.previewForwardMessage,
    isAuthenticated && targetChannelId
      ? {
          conversationId: conversationId as Id<"conversations">,
          targetChannelId: targetChannelId as Id<"channels">,
        }
      : "skip"
  );

  const forward = useAction(api.conversations.forwardToBranch);

  const submit = async () => {
    if (!targetChannelId) return;
    setSubmitting(true);
    try {
      await forward({
        conversationId: conversationId as Id<"conversations">,
        targetChannelId: targetChannelId as Id<"channels">,
        targetDepartmentId: (targetDeptId || undefined) as Id<"departments"> | undefined,
      });
      toast.success(t("Conversation forwarded", "تم تحويل المحادثة"));
      onDone();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("OUTSIDE_24H_WINDOW")) {
        toast.error(t("Outside the 24h window — ask the customer to message first", "خارج نافذة 24 ساعة — اطلب من العميل المراسلة أولاً"));
      } else if (msg.includes("TARGET_CHANNEL_INACTIVE")) {
        toast.error(t("That branch isn't connected right now", "هذا الفرع غير متصل حاليا"));
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
    <div className="space-y-3 pt-3">
      <div className="space-y-1">
        <label className="text-sm font-medium">{t("Target branch", "الفرع المستهدف")}</label>
        {channels === undefined ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : channels.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("No other branches", "لا توجد فروع أخرى")}</p>
        ) : (
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={targetChannelId}
            onChange={(e) => {
              setTargetChannelId(e.target.value);
              setTargetDeptId("");
            }}
          >
            <option value="">{t("Select…", "اختر…")}</option>
            {channels.map((c: any) => (
              <option key={c._id} value={c._id}>
                {c.displayName} <span dir="ltr">{c.displayPhone ?? ""}</span>
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
          className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
          value={targetDeptId}
          onChange={(e) => setTargetDeptId(e.target.value)}
          disabled={!targetChannelId || departments === undefined}
        >
          <option value="">{t("— none —", "— بدون —")}</option>
          {(departments ?? []).map((d: any) => (
            <option key={d._id} value={d._id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {preview && (
        <div className="space-y-1">
          <label className="text-sm font-medium">
            {t("Message that will be sent to the customer", "الرسالة التي سيتم إرسالها للعميل")}
          </label>
          <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
            {preview}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {t(
          "After forwarding, this conversation will be closed and marked as Forwarded.",
          "بعد التحويل ستُغلق المحادثة وتُحفظ كمحوَّلة."
        )}
      </p>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onDone} disabled={submitting}>
          {t("Cancel", "إلغاء")}
        </Button>
        <Button onClick={submit} disabled={submitting || !targetChannelId || !preview}>
          {submitting && <Loader2 className="size-4 animate-spin me-2" />}
          {t("Forward & Close", "تحويل وإغلاق")}
        </Button>
      </div>
    </div>
  );
}
