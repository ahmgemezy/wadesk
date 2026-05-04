import { ConvexError } from "convex/values";
import type { GenericQueryCtx, GenericMutationCtx, GenericActionCtx } from "convex/server";
import type { DataModel } from "../_generated/dataModel";

type Ctx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

export type OrgRole = "org:admin" | "org:supervisor" | "org:agent";

// Clerk v2 session tokens store org info in a compact nested object:
//   { o: { id: "org_...", rol: "admin", slg: "..." } }
// Older JWT template tokens used top-level camelCase claims:
//   { orgId: "org_...", orgRole: "org:admin" }
// We support both formats.

function resolveOrgId(identity: Record<string, unknown>): string | undefined {
  const direct = identity.orgId as string | undefined;
  if (direct) return direct;
  const o = identity.o as { id?: string } | undefined;
  return o?.id;
}

// Clerk v2 compact format omits the "org:" prefix from role names.
// Normalise to the full "org:…" form used throughout the codebase.
function normalizeOrgRole(raw: string | null | undefined): OrgRole {
  if (!raw) return "org:agent";
  if (raw.startsWith("org:")) return raw as OrgRole;
  return `org:${raw}` as OrgRole;
}

function resolveOrgRole(identity: Record<string, unknown>): OrgRole {
  const direct = identity.orgRole as string | undefined;
  if (direct) return normalizeOrgRole(direct);
  const o = identity.o as { rol?: string } | undefined;
  return normalizeOrgRole(o?.rol);
}

export async function getCallerIdentity(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("UNAUTHORIZED");
  }
  const orgId = resolveOrgId(identity as Record<string, unknown>);
  if (!orgId) {
    throw new ConvexError("NO_ORG");
  }
  return {
    tenantId: orgId,
    callerId: identity.subject,
    // Cast to string to preserve the type callers expect (they do their own
    // "admin" / "org:admin" checks against this value).
    orgRole: resolveOrgRole(identity as Record<string, unknown>) as string,
  };
}

export async function getCallerRole(ctx: Ctx | GenericActionCtx<DataModel>): Promise<OrgRole> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("UNAUTHORIZED");
  }
  const orgId = resolveOrgId(identity as Record<string, unknown>);
  if (!orgId) {
    throw new ConvexError("NO_ORG");
  }
  const role = resolveOrgRole(identity as Record<string, unknown>);
  if (role !== "org:admin" && role !== "org:supervisor" && role !== "org:agent") {
    throw new ConvexError("FORBIDDEN");
  }
  return role;
}

export function assertAdmin(role: OrgRole): void {
  if (role !== "org:admin") {
    throw new ConvexError("FORBIDDEN");
  }
}

export function assertAdminOrSupervisor(role: OrgRole): void {
  if (role !== "org:admin" && role !== "org:supervisor") {
    throw new ConvexError("FORBIDDEN");
  }
}
