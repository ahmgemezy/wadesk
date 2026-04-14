"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import type { TriggerType } from "@/lib/automationHelpers";

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
  onDelete: (ruleId: Id<"automationRules">) => void;
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

  const handleToggle = (checked: boolean) => {
    toggleRule({ ruleId: rule._id, enabled: checked });
  };

  const responsePreview =
    rule.responseTemplate.length > 80
      ? rule.responseTemplate.slice(0, 80) + "..."
      : rule.responseTemplate;

  return (
    <>
      <div
        className={`rounded-lg border p-4 transition-all ${isDragging ? "shadow-lg opacity-80" : ""} ${removing ? "opacity-0 scale-95" : ""}`}
      >
        <div className="flex items-center gap-3">
          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground">
            <GripVertical className="size-5" />
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium font-cairo truncate">
                {rule.name}
              </span>
              <Badge variant="secondary" className="text-xs shrink-0">
                {triggerLabel ? t(triggerLabel.en, triggerLabel.ar) : rule.triggerType}
              </Badge>
              {rule.triggerType === "no_reply_timeout" && rule.timeoutMinutes && (
                <span className="text-xs text-muted-foreground font-cairo">
                  {t(`${rule.timeoutMinutes} min`, `بعد ${rule.timeoutMinutes} دقيقة بدون رد`)}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground font-cairo truncate">
              {responsePreview}
            </p>
            {rule.triggerType === "keyword" && rule.keywordList && rule.keywordList.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {rule.keywordList.map((kw) => (
                  <Badge key={kw} variant="outline" className="text-xs">
                    {kw}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Switch checked={rule.enabled} onCheckedChange={handleToggle} />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit(rule._id)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowDeleteDialog(true)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-cairo">
              {t("Delete Rule?", "حذف القاعدة؟")}
            </DialogTitle>
            <DialogDescription className="font-cairo">
              {t(
                `"${rule.name}" will be permanently deleted.`,
                `سيتم حذف "${rule.name}" نهائياً.`
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {t("Cancel", "إلغاء")}
            </DialogClose>
            <Button
              variant="destructive"
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
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
