"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BroadcastTemplateCard } from "@/components/broadcasts/broadcast-template-card";
import type { Id } from "@/convex/_generated/dataModel";
import { PlusIcon } from "lucide-react";
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

  // Empty state
  if (templates.length === 0) {
    return (
      <div className="space-y-4">
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
              "Create your first broadcast template to send WhatsApp broadcasts without leaving WABDesk.",
              "أنشئ قالب البث الأول لديك لإرسال حملات WhatsApp دون مغادرة WABDesk.",
            )}
          </p>
          <Button variant="outline" onClick={onCreateClick}>
            <PlusIcon className="size-4 me-2" />
            {t("Create your first template", "أنشئ قالبك الأول")}
          </Button>
        </div>
      </div>
    );
  }

  // Templates grid
  return (
    <div className="space-y-4">
      {showPlanBanner && plan && planInfo && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
          {t(
            `You have ${templates.length}/${PLAN_LIMITS[plan]} broadcast templates. Upgrade to ${planInfo.nextPlan} for ${planInfo.templateCount}.`,
            `لديك ${templates.length}/${PLAN_LIMITS[plan]} قالب بث. ارقَ إلى ${planInfo.nextPlan} للحصول على ${planInfo.templateCount}.`,
          )}
        </div>
      )}

      <div className="flex items-center justify-end">
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
