"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrgRole } from "./team-member-list";

interface RoleSelectProps {
  value: OrgRole;
  onChange: (role: OrgRole) => void;
}

const ROLES: { value: OrgRole; label: string }[] = [
  { value: "org:agent", label: "وكيل / Agent" },
  { value: "org:supervisor", label: "مشرف / Supervisor" },
  { value: "org:admin", label: "مدير / Admin" },
];

export function RoleSelect({ value, onChange }: RoleSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as OrgRole)}>
      <SelectTrigger dir="ltr" className="w-full">
        <SelectValue />
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
