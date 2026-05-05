"use client";

import { useState } from "react";
import { useOrganization, useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";
import { ForwardToBranchDialog } from "./forward-to-branch-dialog";

interface TransferPickerProps {
  conversationId: Id<"conversations">;
  channelId: Id<"channels">;
  currentAssigneeId?: string;
  currentDepartmentId?: Id<"departments">;
}

export function TransferPicker({
  conversationId,
  channelId,
  currentAssigneeId,
  currentDepartmentId,
}: TransferPickerProps) {
  const t = useT();
  const { user } = useUser();
  const { memberships } = useOrganization({ memberships: true });
  const { isAuthenticated } = useConvexAuth();

  const [open, setOpen] = useState(false);
  const [pendingDeptId, setPendingDeptId] = useState<Id<"departments"> | null>(null);
  const [note, setNote] = useState("");
  const [forwardOpen, setForwardOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const assign = useMutation(api.conversations.assign);
  const claim = useMutation(api.conversations.claim);
  const transfer = useMutation(api.conversations.transferWithinChannel);

  const jobTitles = useQuery(
    api.memberQueries.getJobTitlesByTenant,
    isAuthenticated ? {} : "skip",
  );
  const departments = useQuery(
    api.departments.listForTransfer,
    isAuthenticated
      ? { channelId, excludeDepartmentId: currentDepartmentId }
      : "skip",
  );

  const handleClose = (next: boolean) => {
    setOpen(next);
    if (!next) setPendingDeptId(null);
  };

  const handleTakeIt = async () => {
    setClaiming(true);
    try {
      await claim({ conversationId });
      setOpen(false);
      toast.success(t("Conversation claimed", "تم استلام المحادثة"));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("NOT_IN_DEPARTMENT_QUEUE")) {
        toast.error(t("This conversation is not in a department queue", "هذه المحادثة ليست في طابور قسم"));
      } else if (msg.includes("ALREADY_ASSIGNED")) {
        toast.error(t("Already assigned", "تم التعيين بالفعل"));
      } else {
        toast.error(t("Failed", "فشل"));
      }
    } finally {
      setClaiming(false);
    }
  };

  const handleAssignToAgent = async (agentId: string, agentName: string) => {
    const agentJobTitle = jobTitles?.[agentId];
    try {
      await assign({ conversationId, agentId, agentName, agentJobTitle });
      setOpen(false);
      toast.success(t("Conversation assigned", "تم التعيين"));
    } catch {
      toast.error(t("Failed", "فشل"));
    }
  };

  const handleConfirmDeptTransfer = async () => {
    if (!pendingDeptId) return;
    setSubmitting(true);
    try {
      await transfer({
        conversationId,
        targetDepartmentId: pendingDeptId,
        internalNote: note.trim() || undefined,
      });
      setOpen(false);
      setPendingDeptId(null);
      toast.success(t("Conversation transferred", "تم التحويل"));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("AGENT_NOT_IN_DEPARTMENT")) {
        toast.error(t("Agent not in department", "العضو لم يعد ضمن هذه الإدارة"));
      } else {
        toast.error(t("Transfer failed", "فشل التحويل"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const members = memberships?.data ?? [];

  return (
    <>
      <Popover open={open} onOpenChange={handleClose}>
        <PopoverTrigger
          render={(props) => (
            <Button {...props} size="sm" variant="outline">
              {t("Transfer", "تحويل")} ↗
            </Button>
          )}
        />
        <PopoverContent align="end" className="w-72 p-0 max-h-[420px] overflow-y-auto">
          {pendingDeptId ? (
            <div className="p-3 space-y-3">
              <p className="text-sm font-medium">
                {t("Internal note (optional)", "ملاحظة داخلية (اختياري)")}
              </p>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder={t(
                  "e.g. Answer and transfer back to me",
                  "مثال: أجب وأعد التحويل لي",
                )}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPendingDeptId(null)}
                  disabled={submitting}
                >
                  {t("Back", "رجوع")}
                </Button>
                <Button size="sm" disabled={submitting} onClick={handleConfirmDeptTransfer}>
                  {submitting && <Loader2 className="size-3 animate-spin me-1" />}
                  {t("Transfer", "تحويل")}
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="px-3 pt-3 pb-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                {t("Team members", "أعضاء الفريق")}
              </div>

              <button
                className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-accent text-start disabled:opacity-50"
                onClick={handleTakeIt}
                disabled={claiming}
              >
                <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-semibold shrink-0">
                  {claiming
                    ? <Loader2 className="size-3 animate-spin" />
                    : (user?.firstName?.[0] ?? user?.emailAddresses?.[0]?.emailAddress?.[0] ?? "?").toUpperCase()}
                </div>
                <span className="text-sm font-medium">{t("Take it yourself", "خذها أنت")}</span>
              </button>

              {members.map((m) => {
                const uid = m.publicUserData?.userId ?? "";
                if (uid === user?.id) return null;
                const name =
                  [m.publicUserData?.firstName, m.publicUserData?.lastName]
                    .filter(Boolean)
                    .join(" ") ||
                  m.publicUserData?.identifier ||
                  uid;
                const jobTitle = jobTitles?.[uid];
                const isCurrent = uid === currentAssigneeId;
                return (
                  <button
                    key={uid}
                    className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-accent text-start"
                    onClick={() => handleAssignToAgent(uid, name)}
                  >
                    <div className="size-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold shrink-0">
                      {name[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate flex items-center gap-1">
                        {name}
                        {isCurrent && (
                          <span className="text-[10px] text-muted-foreground">✓</span>
                        )}
                      </div>
                      {jobTitle && (
                        <div className="text-[10px] text-muted-foreground truncate">
                          {jobTitle}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}

              {departments && departments.length > 0 && (
                <>
                  <div className="px-3 pt-3 pb-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wide border-t mt-1">
                    {t("Departments", "الأقسام")}
                  </div>
                  {departments.map((d) => (
                    <button
                      key={d._id}
                      className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-accent text-start"
                      onClick={() => setPendingDeptId(d._id as Id<"departments">)}
                    >
                      <span className="text-base leading-none">🏢</span>
                      <span className="text-sm truncate">{d.name}</span>
                    </button>
                  ))}
                </>
              )}

              <div className="border-t mt-1 pb-1">
                <button
                  className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-destructive/10 text-start"
                  onClick={() => {
                    setOpen(false);
                    setForwardOpen(true);
                  }}
                >
                  <span className="text-base leading-none">📲</span>
                  <span className="flex-1 text-sm text-destructive">
                    {t("Send to another number", "إرسال لرقم آخر")}
                  </span>
                  <span className="text-[10px] bg-destructive/15 text-destructive px-1.5 py-0.5 rounded shrink-0">
                    {t("closes", "يُغلق المحادثة")}
                  </span>
                </button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <ForwardToBranchDialog
        conversationId={conversationId}
        channelId={channelId}
        open={forwardOpen}
        onOpenChange={setForwardOpen}
      />
    </>
  );
}
