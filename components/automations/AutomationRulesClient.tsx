"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useOrganization } from "@/lib/auth-hooks";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AutomationRuleCard } from "./AutomationRuleCard";
import { AutomationRuleForm } from "./AutomationRuleForm";
import { Plus, Zap, AlertTriangle, AlertCircle, RefreshCw } from "lucide-react";
import { DT } from "@/lib/design-tokens";
import { useT } from "@/lib/i18n/context";
import { toast } from "sonner";
import type { TriggerType } from "@/lib/automationHelpers";
import { BusinessHoursForm } from "./BusinessHoursForm";
import { useSelectedChannel } from "@/lib/hooks/channel-context";

const PLAN_RULE_LIMITS: Record<string, number> = {
  free: 2,
  starter: 10,
  growth: 30,
  business: Infinity,
};

type RuleDoc = {
  _id: Id<"automationRules">;
  name: string;
  enabled: boolean;
  priority: number;
  triggerType: TriggerType;
  keywordList?: string[];
  timeoutMinutes?: number;
  responseTemplate: string;
  senderName?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "document";
};

export function AutomationRulesClient({ isAdmin }: { isAdmin: boolean }) {
  const t = useT();
  const { organization } = useOrganization();
  const { channelId: selectedChannelId } = useSelectedChannel();
  const rules = useQuery(api.automations.listRules, selectedChannelId ? { channelId: selectedChannelId } : {}) as
    | RuleDoc[]
    | undefined;
  const plan = useQuery(api.lib.tenants.getCurrentPlan);
  const deleteRule = useMutation(api.automations.deleteRule);
  const reorderRules = useMutation(api.automations.reorderRules);
  const syncOrgName = useMutation(api.automations.syncOrgName);

  // Sync the Clerk org name into our tenants table so {{business_name}} resolves correctly
  useEffect(() => {
    if (organization?.name) {
      syncOrgName({ orgName: organization.name }).catch(() => {});
    }
  }, [organization?.name, syncOrgName]);

  const [formOpen, setFormOpen] = useState(false);
  const [editRule, setEditRule] = useState<RuleDoc | null>(null);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const isLoading = rules === undefined;

  const ruleLimit = plan ? (PLAN_RULE_LIMITS[plan] ?? PLAN_RULE_LIMITS.free) : PLAN_RULE_LIMITS.free;
  const atLimit = ruleLimit !== Infinity && (rules?.length ?? 0) >= ruleLimit;

  const handleEdit = useCallback((ruleId: Id<"automationRules">) => {
    const rule = rules?.find((r) => r._id === ruleId);
    if (rule) {
      setEditRule(rule);
      setFormOpen(true);
    }
  }, [rules]);

  const handleDelete = useCallback(
    async (ruleId: Id<"automationRules">) => {
      try {
        await deleteRule({ ruleId });
        toast.success(t("Rule deleted", "تم حذف القاعدة"));
      } catch {
        toast.error(t("An error occurred", "حدث خطأ"));
      }
    },
    [deleteRule, t]
  );

  const handleFormClose = useCallback(() => {
    setFormOpen(false);
    setEditRule(null);
  }, []);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== dropIndex && rules) {
      const reordered = [...rules];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(dropIndex, 0, moved);
      const orderedIds = reordered.map((r) => r._id);
      reorderRules({ orderedIds }).catch(() => {
        toast.error(t("Failed to reorder", "فشل إعادة الترتيب"));
      });
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (rules === null || rules === undefined) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className={`${DT.H1} font-cairo`}>
            {t("Automation Rules", "قواعد الردود التلقائية")}
          </h1>
        </div>
        <div className="rounded-lg border border-dashed border-black/[0.12] dark:border-white/[0.10] p-10 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-[#6E6E73] dark:text-white/50 mx-auto" />
          <p className={`${DT.MUTED} font-cairo`}>
            {t(
              "Failed to load rules. Try again.",
              "حدث خطأ في تحميل القواعد. حاول مرة أخرى."
            )}
          </p>
          <button
            type="button"
            className={DT.BTN_SM}
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="size-4 me-1" />
            {t("Retry", "إعادة المحاولة")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`${DT.H1} font-cairo`}>
            {t("Automation Rules", "قواعد الردود التلقائية")}
          </h1>
          {plan && rules && (
            <p className={`${DT.MUTED} font-cairo mt-1`}>
              {ruleLimit === Infinity
                ? t(`${rules.length} rules`, `${rules.length} قاعدة`)
                : t(
                    `${rules.length} of ${ruleLimit} rules`,
                    `${rules.length} من أصل ${ruleLimit} قاعدة`
                  )}
            </p>
          )}
        </div>
        <button
          type="button"
          className={DT.BTN_SM_PRIMARY}
          onClick={() => {
            setEditRule(null);
            setFormOpen(true);
          }}
          disabled={atLimit}
        >
          <Plus className="size-4 me-1" />
          {t("Add Rule", "إضافة قاعدة")}
        </button>
      </div>

      {atLimit && (
        <Alert className="mb-4 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-300 font-cairo">
            {t(
              `You've reached the limit (${ruleLimit} rules). Upgrade your plan for more.`,
              `وصلت إلى الحد الأقصى (${ruleLimit} قواعد). ارقِّ خطتك للمزيد.`
            )}
          </AlertDescription>
        </Alert>
      )}

      {rules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-black/[0.12] dark:border-white/[0.10] p-10 text-center space-y-3">
          <Zap className="h-8 w-8 text-[#6E6E73] dark:text-white/50 mx-auto" />
          <p className="font-semibold font-cairo text-[#1D1D1F] dark:text-white">
            {t("No automation rules yet", "لا توجد قواعد تلقائية بعد")}
          </p>
          <p className={`${DT.MUTED} font-cairo`}>
            {t(
              "Create your first rule to automate replies",
              "أنشئ أول قاعدة لأتمتة الردود"
            )}
          </p>
          {!atLimit && (
            <button
              type="button"
              className={`${DT.BTN_SM_PRIMARY} mt-2`}
              onClick={() => {
                setEditRule(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4 me-1" />
              {t("Create first rule", "إضافة أول قاعدة")}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {rules.map((rule, index) => (
            <div
              key={rule._id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className="relative"
            >
              {dragOverIndex === index && dragIndex !== null && dragIndex !== index && index < (dragIndex ?? 0) && (
                <div className="h-0.5 bg-primary rounded-full mb-1" />
              )}
              <AutomationRuleCard
                rule={rule}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isDragging={dragIndex === index}
              />
              {dragOverIndex === index && dragIndex !== null && dragIndex !== index && index > (dragIndex ?? 0) && (
                <div className="h-0.5 bg-primary rounded-full mt-1" />
              )}
            </div>
          ))}
        </div>
      )}

      <AutomationRuleForm
        key={editRule?._id ?? "new"}
        mode={editRule ? "edit" : "create"}
        initialValues={editRule ?? undefined}
        onSuccess={handleFormClose}
        onCancel={handleFormClose}
        open={formOpen}
      />

      {isAdmin && (
        <div className={`mt-8 pt-6 ${DT.DIVIDER}`}>
          <BusinessHoursForm isAdmin={isAdmin} />
        </div>
      )}
    </div>
  );
}
