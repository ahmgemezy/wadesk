"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrgRole } from "./team-member-list";
import { useT } from "@/lib/i18n/context";
import { DT } from "@/lib/design-tokens";

interface RoleSelectProps {
  value: OrgRole;
  onChange: (role: OrgRole) => void;
  disabled?: boolean;
}

export function RoleSelect({ value, onChange, disabled }: RoleSelectProps) {
  const t = useT();

  const ROLES: { value: OrgRole; label: string }[] = [
    { value: "org:agent", label: t("Agent", "وكيل") },
    { value: "org:supervisor", label: t("Supervisor", "مشرف") },
    { value: "org:admin", label: t("Admin", "مدير") },
  ];

  return (
    <Select value={value} onValueChange={(v) => onChange(v as OrgRole)} disabled={disabled}>
      <SelectTrigger className={DT.SELECT}>
        <span>{ROLES.find((r) => r.value === value)?.label ?? value}</span>
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r.value} value={r.value}>
            {r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
