"use client";

import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  pending:  { label: "Pending Review", labelAr: "قيد المراجعة",     className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  approved: { label: "Approved",       labelAr: "معتمد",            className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  rejected: { label: "Rejected",       labelAr: "مرفوض",            className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
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
  const status = STATUS_CONFIG[template.metaStatus];

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
        <div className="absolute top-2 inset-e-2 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
          {template.metaStatus === "pending" && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleCheckStatus}
              disabled={syncing}
              title={t("Check approval status", "تحقق من حالة الموافقة")}
            >
              {syncing
                ? <Loader2Icon className="size-3.5 animate-spin" />
                : <RefreshCwIcon className="size-3.5" />
              }
            </Button>
          )}

          {isLocked && (
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onEdit(template._id)}
                  disabled={isLocked}
                >
                  <PencilIcon className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {template.metaStatus === "pending"
                  ? t("Template is pending Meta review", "القالب قيد مراجعة ميتا")
                  : t("Approved templates cannot be edited", "لا يمكن تعديل القوالب المعتمدة")}
              </TooltipContent>
            </Tooltip>
          )}
          {!isLocked && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit(template._id)}
              disabled={isLocked}
            >
              <PencilIcon className="size-3.5" />
            </Button>
          )}

          {isLocked && (
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleDelete}
                  disabled={isLocked || removing}
                >
                  {removing
                    ? <Loader2Icon className="size-3.5 animate-spin" />
                    : <Trash2Icon className="size-3.5" />
                  }
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t("Cannot delete while pending or approved", "لا يمكن الحذف أثناء المراجعة أو الاعتماد")}
              </TooltipContent>
            </Tooltip>
          )}
          {!isLocked && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleDelete}
              disabled={isLocked || removing}
            >
              {removing
                ? <Loader2Icon className="size-3.5 animate-spin" />
                : <Trash2Icon className="size-3.5" />
              }
            </Button>
          )}
        </div>

        <CardHeader className="pb-2 pe-16 space-y-0 text-start">
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status.className}`}>
              {t(status.label, status.labelAr)}
            </span>
            <Badge variant="outline" className="text-[10px] uppercase">
              {template.language}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {HEADER_ICONS[template.headerType]} {template.headerType}
            </Badge>
          </div>
          <CardTitle className="text-base font-semibold leading-tight line-clamp-1">
            {template.title}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {template.category}
          </p>
        </CardHeader>

        {template.metaStatus === "rejected" && template.metaRejectionReason && (
          <CardContent className="pt-0">
            <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2 text-xs text-red-700 dark:text-red-400">
              {template.metaRejectionReason}
            </div>
          </CardContent>
        )}
      </Card>
    </TooltipProvider>
  );
}
