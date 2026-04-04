import { ConvexError } from "convex/values";
import type { GenericQueryCtx, GenericMutationCtx, GenericActionCtx } from "convex/server";
import type { DataModel } from "../_generated/dataModel";

type Ctx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

export type OrgRole = "org:admin" | "org:supervisor" | "org:agent";

export async function getCallerIdentity(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("UNAUTHORIZED");
  }
  if (!identity.orgId) {
    throw new ConvexError("NO_ORG");
  }
  return {
    tenantId: identity.orgId,
    callerId: identity.subject,
    orgRole: identity.orgRole ?? "org:agent",
  };
}

export async function getCallerRole(ctx: Ctx | GenericActionCtx<DataModel>): Promise<OrgRole> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("UNAUTHORIZED");
  }
  if (!identity.orgId) {
    throw new ConvexError("NO_ORG");
  }
  const role = identity.orgRole ?? "org:agent";
  if (role !== "org:admin" && role !== "org:supervisor" && role !== "org:agent" && role !== "admin") {
    throw new ConvexError("FORBIDDEN");
  }
  if (role === "admin") return "org:admin";
  return role as OrgRole;
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
