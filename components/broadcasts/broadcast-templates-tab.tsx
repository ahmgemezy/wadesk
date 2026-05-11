"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BroadcastTemplateCard } from "@/components/broadcasts/broadcast-template-card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import type { Id } from "@/convex/_generated/dataModel";
import { PlusIcon, DownloadIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";

interface Props {
  onCreateClick: () => void;
  onEditTemplate: (id: Id<"broadcastTemplates">) => void;
}

const PLAN_LIMITS: Record<string, number> = {
  free: 2,
  starter: 6,
  growth: 20,
  business: Infinity,
};

const NEXT_PLAN_INFO: Record<string, { nextPlan: string; nextLimit: number; templateCount: string }> = {
  free: { nextPlan: "Starter", nextLimit: 6, templateCount: "6" },
  starter: { nextPlan: "Growth", nextLimit: 20, templateCount: "20" },
  growth: { nextPlan: "Business", nextLimit: Infinity, templateCount: "unlimited" },
};

export function BroadcastTemplatesTab({ onCreateClick, onEditTemplate }: Props) {
  const t = useT();

  const templates = useQuery(api.broadcastTemplates.list, {});
  const plan = useQuery(api.lib.tenants.getCurrentPlan);
  const channels = useQuery(api.channels.listForTenant);
  const importFromMeta = useAction(api.broadcastTemplates.importFromMeta);

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<Id<"channels"> | "">("");
  const [importing, setImporting] = useState(false);

  async function handleImport() {
    const channelId = selectedChannelId || (channels?.length === 1 ? channels[0]._id : "");
    if (!channelId) return;
    setImporting(true);
    try {
      const result = await importFromMeta({ channelId });
      toast.success(
        t(
          `Imported ${result.imported} template${result.imported !== 1 ? "s" : ""}${result.skipped > 0 ? ` (${result.skipped} already existed)` : ""}`,
          `تم استيراد ${result.imported} قالب${result.skipped > 0 ? ` (${result.skipped} موجود مسبقاً)` : ""}`,
        ),
      );
      setImportDialogOpen(false);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e);
      const msg = raw
        .replace("ConvexError: TOKEN_EXPIRED: ", "")
        .replace("ConvexError: Meta API error: ", "")
        .replace("ConvexError: ", "");
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  }

  function openImportDialog() {
    if (channels && channels.length === 1) {
      setSelectedChannelId(channels[0]._id);
    }
    setImportDialogOpen(true);
  }

  const importButton = (
    <Button variant="outline" onClick={openImportDialog} disabled={!channels || channels.length === 0}>
      <DownloadIcon className="size-4 me-2" />
      {t("Import from Meta", "استيراد من ميتا")}
    </Button>
  );

  const usagePercentage =
    templates && plan ? (templates.length / PLAN_LIMITS[plan]) * 100 : 0;

  const showPlanBanner =
    templates &&
    plan &&
    PLAN_LIMITS[plan] !== Infinity &&
    usagePercentage >= 80;

  const planInfo = plan && NEXT_PLAN_INFO[plan];

  // Loading state
  if (templates === undefined || plan === undefined) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-2 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-5 w-16" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Import dialog (shared across empty + filled states)
  const importDialog = (
    <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("Import Templates from Meta", "استيراد القوالب من ميتا")}</DialogTitle>
          <DialogDescription>
            {t(
              "Fetch all approved templates from your WhatsApp Business account and add them to WABDesk. Templates that already exist here will be skipped.",
              "جلب جميع القوالب المعتمدة من حساب WhatsApp Business الخاص بك وإضافتها إلى WABDesk. القوالب الموجودة مسبقاً ستُتخطى.",
            )}
          </DialogDescription>
        </DialogHeader>

        {channels && channels.length > 1 && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("Channel", "القناة")}</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedChannelId}
              onChange={(e) => setSelectedChannelId(e.target.value as Id<"channels">)}
            >
              <option value="">{t("Select a channel…", "اختر قناة...")}</option>
              {channels.map((ch) => (
                <option key={ch._id} value={ch._id}>{ch.displayName ?? ch.phoneNumberId}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={() => setImportDialogOpen(false)} disabled={importing}>
            {t("Cancel", "إلغاء")}
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || (channels && channels.length > 1 && !selectedChannelId)}
          >
            {importing && <Loader2Icon className="size-4 me-2 animate-spin" />}
            {t("Import", "استيراد")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Empty state
  if (templates.length === 0) {
    return (
      <div className="space-y-4">
        {importDialog}
        {showPlanBanner && plan && planInfo && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
            {t(
              `You have ${templates.length}/${PLAN_LIMITS[plan]} broadcast templates. Upgrade to ${planInfo.nextPlan} for ${planInfo.templateCount}.`,
              `لديك ${templates.length}/${PLAN_LIMITS[plan]} قالب بث. ارقَ إلى ${planInfo.nextPlan} للحصول على ${planInfo.templateCount}.`,
            )}
          </div>
        )}

        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed bg-muted/30">
          <h3 className="text-lg font-medium mb-2">
            {t("No Broadcast Templates Yet", "لا توجد قوالب بث حتى الآن")}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            {t(
              "Create a new template or import your existing approved templates directly from Meta.",
              "أنشئ قالباً جديداً أو استورد قوالبك المعتمدة مباشرةً من ميتا.",
            )}
          </p>
          <div className="flex gap-2">
            {importButton}
            <Button onClick={onCreateClick}>
              <PlusIcon className="size-4 me-2" />
              {t("Create template", "إنشاء قالب")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Templates grid
  return (
    <div className="space-y-4">
      {importDialog}
      {showPlanBanner && plan && planInfo && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
          {t(
            `You have ${templates.length}/${PLAN_LIMITS[plan]} broadcast templates. Upgrade to ${planInfo.nextPlan} for ${planInfo.templateCount}.`,
            `لديك ${templates.length}/${PLAN_LIMITS[plan]} قالب بث. ارقَ إلى ${planInfo.nextPlan} للحصول على ${planInfo.templateCount}.`,
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        {importButton}
        <Button onClick={onCreateClick}>
          <PlusIcon className="size-4 me-2" />
          {t("Add Broadcast Template", "إضافة قالب البث")}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {templates.map((template) => (
          <BroadcastTemplateCard
            key={template._id}
            template={template}
            onEdit={onEditTemplate}
          />
        ))}
      </div>
    </div>
  );
}
