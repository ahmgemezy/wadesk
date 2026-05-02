"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";

interface ClaimButtonProps {
  conversationId: string;
  show: boolean;
}

export function ClaimButton({ conversationId, show }: ClaimButtonProps) {
  const t = useT();
  const claimMutation = useMutation(api.conversations.claim);
  const [claiming, setClaiming] = useState(false);

  if (!show) return null;

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await claimMutation({
        conversationId: conversationId as Id<"conversations">,
      });
      toast.success(t("Conversation claimed", "تم استلام المحادثة"));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("ALREADY_ASSIGNED")) {
        toast.error(t("Already assigned to another agent", "تم تعيين المحادثة لوكيل آخر"));
      } else if (msg.includes("NOT_DEPARTMENT_MEMBER")) {
        toast.error(t("You are not a member of this department", "لست عضواً في هذه الإدارة"));
      } else {
        toast.error(t("Failed to claim conversation", "فشل استلام المحادثة"));
      }
    } finally {
      setClaiming(false);
    }
  };

  return (
    <Button
      size="sm"
      className="gap-1.5"
      onClick={handleClaim}
      disabled={claiming}
    >
      {claiming ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Zap className="h-3.5 w-3.5" />
      )}
      {t("Claim", "استلام")}
    </Button>
  );
}
