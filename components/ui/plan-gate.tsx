"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PLAN_RANK, type Plan } from "@/convex/lib/planLimits";
import { useT } from "@/lib/i18n/context";

interface PlanGateProps {
  /** Minimum plan required to access this feature */
  requiredPlan: Exclude<Plan, "free">;
  /** Content to lock. Required for "overlay" variant; optional for "banner". */
  children?: React.ReactNode;
  /** Pre-translated feature label shown in the lock message */
  featureLabel?: string;
  /**
   * "overlay" – renders children grayed/blurred behind a lock panel (use for sections/cards).
   * "banner"  – shows a compact inline notice; children are not rendered.
   */
  variant?: "overlay" | "banner";
}

const PLAN_LABEL: Record<Exclude<Plan, "free">, [string, string]> = {
  starter: ["Starter", "ستارتر"],
  growth: ["Growth", "النمو"],
  business: ["Business", "بيزنس"],
};

export function PlanGate({
  requiredPlan,
  children,
  featureLabel,
  variant = "overlay",
}: PlanGateProps) {
  const t = useT();
  const status = useQuery(api.lib.tenants.getSubscriptionStatus);

  // While loading, show children normally to avoid flash of locked state
  if (status === undefined) return <>{children}</>;

  const currentPlan: Plan = status.plan ?? "free";
  if (PLAN_RANK[currentPlan] >= PLAN_RANK[requiredPlan]) return <>{children}</>;

  const [planEn, planAr] = PLAN_LABEL[requiredPlan];
  const planName = t(planEn, planAr);

  const lockMessage = featureLabel
    ? t(
        `${featureLabel} requires the ${planEn} plan or above.`,
        `${featureLabel} يتطلب خطة ${planAr} أو أعلى.`,
      )
    : t(
        `This feature requires the ${planEn} plan or above.`,
        `هذه الميزة تتطلب خطة ${planAr} أو أعلى.`,
      );

  const upgradeLink = (
    <Link
      href="/settings/billing"
      className="font-semibold underline underline-offset-2 hover:opacity-80"
    >
      {t(`Upgrade to ${planEn}`, `ترقية إلى ${planName}`)}
    </Link>
  );

  if (variant === "banner") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
        <Lock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="flex-1 text-amber-800 dark:text-amber-300">{lockMessage}</span>
        <span className="shrink-0 text-amber-700 dark:text-amber-300">{upgradeLink}</span>
      </div>
    );
  }

  // overlay variant: children are visible but locked behind a panel
  return (
    <div className="relative rounded-lg">
      <div className="pointer-events-none select-none opacity-40" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-muted-foreground/30 bg-background/85 p-6 backdrop-blur-[2px]">
        <Lock className="size-5 text-muted-foreground" />
        <p className="max-w-xs text-center text-sm text-muted-foreground">{lockMessage}</p>
        <span className="text-sm text-primary">{upgradeLink}</span>
      </div>
    </div>
  );
}
