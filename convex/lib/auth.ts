import { ConvexError } from "convex/values";
import type { GenericQueryCtx, GenericMutationCtx, GenericActionCtx } from "convex/server";
import type { DataModel } from "../_generated/dataModel";

type Ctx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

export type OrgRole = "org:admin" | "org:supervisor" | "org:agent";

export async function getCallerIdentity(ctx: Ctx | GenericActionCtx<DataModel>) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("UNAUTHORIZED");
  }
  const orgId = identity.orgId as string | undefined;
  if (!orgId) {
    throw new ConvexError("NO_ORG");
  }
  const orgRole = identity.orgRole as string | undefined;
  if (!orgRole) {
    throw new ConvexError("NO_ROLE");
  }
  return {
    tenantId: orgId,
    callerId: identity.subject,
    orgRole,
  };
}

export async function getCallerRole(ctx: Ctx | GenericActionCtx<DataModel>): Promise<OrgRole> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("UNAUTHORIZED");
  }
  const orgId = identity.orgId as string | undefined;
  if (!orgId) {
    throw new ConvexError("NO_ORG");
  }
  const orgRole = identity.orgRole as string | undefined;
  if (!orgRole) {
    throw new ConvexError("NO_ROLE");
  }
  if (orgRole !== "org:admin" && orgRole !== "org:supervisor" && orgRole !== "org:agent") {
    throw new ConvexError("FORBIDDEN");
  }
  return orgRole;
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
