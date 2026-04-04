"use client";

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
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as OrgRole)}
      dir="ltr"
      className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {ROLES.map((r) => (
        <option key={r.value} value={r.value}>
          {r.label}
        </option>
      ))}
    </select>
  );
}
