"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { useState } from "react";
import { toast } from "sonner";
import type { TriggerType } from "@/lib/automationHelpers";
import { DT } from "@/lib/design-tokens";

const TRIGGER_LABELS: Record<TriggerType, { en: string; ar: string }> = {
  keyword: { en: "Keyword", ar: "كلمة مفتاحية" },
  outside_hours: { en: "Outside Hours", ar: "خارج ساعات العمل" },
  first_message: { en: "First Message", ar: "رسالة أولى" },
  no_reply_timeout: { en: "No Reply Timeout", ar: "تأخر في الرد" },
};

interface AutomationRuleCardProps {
  rule: {
    _id: Id<"automationRules">;
    name: string;
    enabled: boolean;
    priority: number;
    triggerType: TriggerType;
    keywordList?: string[];
    timeoutMinutes?: number;
    responseTemplate: string;
  };
  onEdit: (ruleId: Id<"automationRules">) => void;
  onDelete: (ruleId: Id<"automationRules">) => Promise<void>;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

export function AutomationRuleCard({
  rule,
  onEdit,
  onDelete,
  isDragging,
  dragHandleProps,
}: AutomationRuleCardProps) {
  const t = useT();
  const toggleRule = useMutation(api.automations.toggleRule);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [removing, setRemoving] = useState(false);

  const triggerLabel = TRIGGER_LABELS[rule.triggerType];

  const handleToggle = async (checked: boolean) => {
    try {
      await toggleRule({ ruleId: rule._id, enabled: checked });
    } catch {
      toast.error(t("Failed to toggle rule", "فشل تبديل القاعدة"));
    }
  };

  const responsePreview =
    rule.responseTemplate.length > 80
      ? rule.responseTemplate.slice(0, 80) + "..."
      : rule.responseTemplate;

  const enabledOpacity = rule.enabled ? "" : "opacity-60";

  return (
    <>
      <div
        className={`${DT.CARD_SM} p-4 transition-all ${enabledOpacity} ${isDragging ? "shadow-lg opacity-80" : ""} ${removing ? "opacity-0 scale-95" : ""}`}
      >
        <div className={`${DT.LIST_ITEM} cursor-default hover:bg-transparent dark:hover:bg-transparent !px-0 !py-0`}>
          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-[#6E6E73] dark:text-white/50">
            <GripVertical className="size-5" />
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className={`font-medium font-cairo truncate ${DT.TEXT_PRIMARY}`}>
                {rule.name}
              </span>
              <span className={`${DT.BADGE_BLUE} shrink-0 font-cairo`}>
                {triggerLabel ? t(triggerLabel.en, triggerLabel.ar) : rule.triggerType}
              </span>
              {rule.triggerType === "no_reply_timeout" && rule.timeoutMinutes && (
                <span className={`${DT.MICRO} font-cairo`}>
                  {t(`${rule.timeoutMinutes} min`, `بعد ${rule.timeoutMinutes} دقيقة بدون رد`)}
                </span>
              )}
            </div>
            <p className={`${DT.MUTED} font-cairo truncate`}>
              {responsePreview}
            </p>
            {rule.triggerType === "keyword" && rule.keywordList && rule.keywordList.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {rule.keywordList.map((kw) => (
                  <span key={kw} className={`${DT.BADGE_GREEN} font-cairo`}>
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Switch checked={rule.enabled} onCheckedChange={handleToggle} />
            <button
              type="button"
              className={DT.BTN_ICON}
              onClick={() => onEdit(rule._id)}
              aria-label={t("Edit", "تعديل")}
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              className={`${DT.BTN_ICON} ${DT.HOVER_RED_DESTRUCTIVE}`}
              onClick={() => setShowDeleteDialog(true)}
              aria-label={t("Delete", "حذف")}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className={DT.DIALOG}>
          <DialogHeader>
            <DialogTitle className={`${DT.H3} font-cairo`}>
              {t("Delete Rule?", "حذف القاعدة؟")}
            </DialogTitle>
            <DialogDescription className={`${DT.MUTED} font-cairo`}>
              {t(
                `"${rule.name}" will be permanently deleted.`,
                `سيتم حذف "${rule.name}" نهائياً.`
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<button type="button" className={DT.BTN_OUTLINE} />}>
              {t("Cancel", "إلغاء")}
            </DialogClose>
            <button
              type="button"
              className={DT.BTN_DESTRUCTIVE}
              onClick={async () => {
                setRemoving(true);
                setShowDeleteDialog(false);
                try {
                  await onDelete(rule._id);
                } catch {
                  setRemoving(false);
                }
              }}
            >
              {t("Delete", "حذف")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
