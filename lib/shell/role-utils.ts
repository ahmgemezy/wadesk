import type { ResolvedRole } from "./types";

export const ROLE_ORDER: Record<ResolvedRole, number> = {
  agent: 0,
  supervisor: 1,
  admin: 2,
};

export function resolveRole(
  orgRole: string | undefined,
): ResolvedRole {
  if (orgRole === "org:admin") return "admin";
  if (orgRole === "org:supervisor") return "supervisor";
  return "agent";
}

export function hasMinRole(
  userRole: ResolvedRole,
  requiredRole: ResolvedRole,
): boolean {
  return ROLE_ORDER[userRole] >= ROLE_ORDER[requiredRole];
}
