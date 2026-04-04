"use client";

import type { ResolvedRole } from "@/lib/shell/types";

const ROLE_LABELS: Record<ResolvedRole, { ar: string; en: string }> = {
  admin: { ar: "مدير", en: "Admin" },
  supervisor: { ar: "مشرف", en: "Supervisor" },
  agent: { ar: "وكيل", en: "Agent" },
};

interface RoleBadgeProps {
  role: ResolvedRole;
  locale: "ar" | "en";
}

export function RoleBadge({ role, locale }: RoleBadgeProps) {
  const label = ROLE_LABELS[role];
  return (
    <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
      {locale === "ar" ? label.ar : label.en}
    </span>
  );
}
