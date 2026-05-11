"use client";

import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DT } from "@/lib/design-tokens";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PencilIcon, Trash2Icon, RefreshCwIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useT } from "@/lib/i18n/context";

type BroadcastTemplate = {
  _id: Id<"broadcastTemplates">;
  title: string;
  language: string;
  category: "MARKETING" | "UTILITY";
  headerType: "NONE" | "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
  metaStatus: "draft" | "pending" | "approved" | "rejected" | "paused";
  metaRejectionReason?: string;
};

const STATUS_CONFIG = {
  draft:    { label: "Draft",          labelAr: "مسودة",            className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  pending:  { label: "Pending Review", labelAr: "قيد المراجعة",     className: `${DT.BG_AMBER_LIGHT} ${DT.TEXT_AMBER}` },
  approved: { label: "Approved",       labelAr: "معتمد",            className: `${DT.BG_GREEN_LIGHT} ${DT.TEXT_GREEN}` },
  rejected: { label: "Rejected",       labelAr: "مرفوض",            className: `${DT.BG_RED_LIGHT} ${DT.TEXT_RED_LIGHT}` },
  paused:   { label: "Paused",         labelAr: "موقوف",            className: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
};

const HEADER_ICONS: Record<string, string> = {
  NONE: "—", TEXT: "T", IMAGE: "🖼", VIDEO: "🎬", DOCUMENT: "📄",
};

interface Props {
  template: BroadcastTemplate;
  onEdit: (id: Id<"broadcastTemplates">) => void;
}

export function BroadcastTemplateCard({ template, onEdit }: Props) {
  const t = useT();
  const remove = useMutation(api.broadcastTemplates.remove);
  const syncStatus = useAction(api.broadcastTemplates.syncStatus);
  const [syncing, setSyncing] = useState(false);
  const [removing, setRemoving] = useState(false);

  const isLocked = template.metaStatus === "pending" || template.metaStatus === "approved";
  const status = STATUS_CONFIG[template.metaStatus] ?? STATUS_CONFIG.draft;

  async function handleDelete() {
    setRemoving(true);
    try {
      await remove({ id: template._id });
      toast.success(t("Template deleted", "تم حذف القالب"));
    } catch {
      toast.error(t("Failed to delete", "فشل الحذف"));
    } finally {
      setRemoving(false);
    }
  }

  async function handleCheckStatus() {
    setSyncing(true);
    try {
      await syncStatus({ id: template._id });
      toast.success(t("Status updated", "تم تحديث الحالة"));
    } catch {
      toast.error(t("Failed to check status", "فشل التحقق من الحالة"));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <TooltipProvider>
      <Card className="relative group overflow-hidden flex flex-col">
        {/* Action buttons */}
        <div className="absolute top-2 end-2 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
          {template.metaStatus === "pending" && (
            <button
              className={DT.BTN_ICON_SM}
              onClick={handleCheckStatus}
              disabled={syncing}
              title={t("Check approval status", "تحقق من حالة الموافقة")}
            >
              {syncing
                ? <Loader2Icon className="size-3.5 animate-spin" />
                : <RefreshCwIcon className="size-3.5" />
              }
            </button>
          )}

          {isLocked && (
            <Tooltip>
              <TooltipTrigger>
                <button
                  className={DT.BTN_ICON_SM}
                  onClick={() => onEdit(template._id)}
                  disabled={isLocked}
                >
                  <PencilIcon className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {template.metaStatus === "pending"
                  ? t("Template is pending Meta review", "القالب قيد مراجعة ميتا")
                  : t("Approved templates cannot be edited", "لا يمكن تعديل القوالب المعتمدة")}
              </TooltipContent>
            </Tooltip>
          )}
          {!isLocked && (
            <button
              className={DT.BTN_ICON_SM}
              onClick={() => onEdit(template._id)}
              disabled={isLocked}
              title={t("Edit template", "تحرير القالب")}
            >
              <PencilIcon className="size-3.5" />
            </button>
          )}

          {isLocked && (
            <Tooltip>
              <TooltipTrigger>
                <button
                  className={`${DT.BTN_ICON_SM} ${DT.TEXT_RED}`}
                  onClick={handleDelete}
                  disabled={isLocked || removing}
                >
                  {removing
                    ? <Loader2Icon className="size-3.5 animate-spin" />
                    : <Trash2Icon className="size-3.5" />
                  }
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {t("Cannot delete while pending or approved", "لا يمكن الحذف أثناء المراجعة أو الاعتماد")}
              </TooltipContent>
            </Tooltip>
          )}
          {!isLocked && (
            <button
              className={`${DT.BTN_ICON_SM} ${DT.TEXT_RED}`}
              onClick={handleDelete}
              disabled={isLocked || removing}
            >
              {removing
                ? <Loader2Icon className="size-3.5 animate-spin" />
                : <Trash2Icon className="size-3.5" />
              }
            </button>
          )}
        </div>

        <CardHeader className="pb-2 pe-16 space-y-0 text-start">
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status.className}`}>
              {t(status.label, status.labelAr)}
            </span>
            <span className={`${DT.BADGE_NEUTRAL} text-[10px] uppercase`}>
              {template.language}
            </span>
            <span className={`${DT.BADGE_BLUE} text-[10px]`}>
              {HEADER_ICONS[template.headerType]} {template.headerType}
            </span>
          </div>
          <CardTitle className="text-base font-semibold leading-tight line-clamp-1">
            {template.title}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {template.category === "MARKETING"
              ? t("Marketing", "تسويق")
              : t("Utility", "أداة")}
          </p>
        </CardHeader>

        {template.metaStatus === "rejected" && template.metaRejectionReason && (
          <CardContent className="pt-0">
            <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2 text-xs text-red-700 dark:text-red-200">
              {template.metaRejectionReason}
            </div>
          </CardContent>
        )}
      </Card>
    </TooltipProvider>
  );
}
