"use client";

import { useState } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
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
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";

interface Props {
  conversationId: string;
  channelId: string;
  currentDepartmentId?: string;
}

export function TransferDepartmentDialog({
  conversationId,
  channelId,
  currentDepartmentId,
}: Props) {
  const t = useT();
  const { isAuthenticated } = useConvexAuth();
  const [open, setOpen] = useState(false);
  const [transferring, setTransferring] = useState(false);

  const departments = useQuery(
    api.departments.listForTransfer,
    isAuthenticated && open
      ? {
          channelId: channelId as Id<"channels">,
          excludeDepartmentId: currentDepartmentId as Id<"departments"> | undefined,
        }
      : "skip"
  );

  const transfer = useMutation(api.conversations.transferToDepartment);

  const handleTransfer = async (targetDeptId: Id<"departments">) => {
    setTransferring(true);
    try {
      await transfer({
        conversationId: conversationId as Id<"conversations">,
        targetDepartmentId: targetDeptId,
      });
      toast.success(t("Conversation transferred", "تم نقل المحادثة"));
      setOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("CROSS_CHANNEL_TRANSFER_NOT_ALLOWED")) {
        toast.error(t("Cannot transfer across numbers", "لا يمكن النقل بين أرقام مختلفة"));
      } else {
        toast.error(t("Transfer failed", "فشل نقل المحادثة"));
      }
    } finally {
      setTransferring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" title={t("Transfer", "نقل")} />}>
        <ArrowRightLeft className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Transfer to Department", "نقل إلى إدارة")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          {departments === undefined ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : departments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("No other departments available", "لا توجد إدارات أخرى متاحة")}
            </p>
          ) : (
            departments.map((dept) => (
              <Button
                key={dept._id}
                variant="outline"
                className="w-full justify-start text-sm"
                disabled={transferring}
                onClick={() => handleTransfer(dept._id)}
              >
                {dept.name}
                {dept.isDefault && (
                  <span className="ms-2 text-xs text-muted-foreground">
                    ({t("Default", "افتراضية")})
                  </span>
                )}
              </Button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
