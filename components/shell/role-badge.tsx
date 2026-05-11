"use client";

import { DT } from "@/lib/design-tokens";
import type { ResolvedRole } from "@/lib/shell/types";

const ROLE_LABELS: Record<ResolvedRole, { ar: string; en: string }> = {
  admin: { ar: "مدير", en: "Admin" },
  supervisor: { ar: "مشرف", en: "Supervisor" },
  agent: { ar: "وكيل", en: "Agent" },
};

const ROLE_BADGES: Record<ResolvedRole, string> = {
  admin: DT.BADGE_BLUE,
  supervisor: DT.BADGE_AMBER,
  agent: DT.BADGE_NEUTRAL,
};

interface RoleBadgeProps {
  role: ResolvedRole;
  locale: "ar" | "en";
}

export function RoleBadge({ role, locale }: RoleBadgeProps) {
  const label = ROLE_LABELS[role];
  return (
    <span className={ROLE_BADGES[role]}>
      {locale === "ar" ? label.ar : label.en}
    </span>
  );
}
