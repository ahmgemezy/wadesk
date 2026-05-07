import type { GenericActionCtx } from "convex/server";
import type { DataModel } from "../_generated/dataModel";
import { components } from "../_generated/api";

type Ctx = GenericActionCtx<DataModel>;

export async function getAdminEmails(
  ctx: Ctx,
  orgId: string,
): Promise<Array<{ userId: string; email: string }>> {
  try {
    const allMembers = await ctx.runQuery(
      components.betterAuth.orgQueries.listOrgMembers,
      { organizationId: orgId },
    );
    const adminMembers = allMembers.filter((m) => m.role === "org:admin") as Array<{ userId: string }>;
    const users = await Promise.all(
      adminMembers.map((m) =>
        ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: "user",
          where: [{ field: "id", value: m.userId }],
        }),
      ),
    );
    return adminMembers
      .map((m, i) => ({
        userId: m.userId,
        email: (users[i]?.email ?? "") as string,
      }))
      .filter((m) => m.email.length > 0);
  } catch {
    return [];
  }
}

export async function resolveUserEmail(ctx: Ctx, userId: string): Promise<string | null> {
  try {
    const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "id", value: userId }],
    });
    return (user?.email as string | null) ?? null;
  } catch {
    return null;
  }
}

export async function resolveOrgName(ctx: Ctx, orgId: string): Promise<string> {
  try {
    const org = await ctx.runQuery(
      components.betterAuth.orgQueries.findOrg,
      { orgId },
    );
    return org?.name ?? orgId;
  } catch {
    return orgId;
  }
}
