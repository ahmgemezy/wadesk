import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCallerIdentity, getCallerRole, assertAdmin, type OrgRole } from "./lib/auth";
import type { Id } from "./_generated/dataModel";

export const getState = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const orgId = identity.orgId as string | undefined;
    // Return null (not an error) when the JWT hasn't picked up the new org yet —
    // this happens briefly after organization.setActive while Convex refreshes the token.
    if (!orgId) return null;
    const state = await ctx.db
      .query("onboardingState")
      .withIndex("by_tenant", (q) => q.eq("tenantId", orgId))
      .first();
    return state ?? null;
  },
});

export const ensureCreated = mutation({
  args: {},
  handler: async (ctx): Promise<Id<"onboardingState">> => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);

    const existing = await ctx.db
      .query("onboardingState")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId as string))
      .first();

    if (existing) return existing._id;

    const existingTenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId as string))
      .first();

    if (!existingTenant) {
      await ctx.db.insert("tenants", {
        tenantId: tenantId as string,
        plan: "free",
        createdAt: Date.now(),
      });
    }

    return ctx.db.insert("onboardingState", {
      tenantId: tenantId as string,
      completedSteps: ["workspace_named"],
      createdBy: callerId as string,
      createdAt: Date.now(),
    });
  },
});

export const markStep = mutation({
  args: {
    step: v.union(
      v.literal("workspace_named"),
      v.literal("whatsapp_connected"),
      v.literal("team_invited_or_skipped"),
      v.literal("onboarding_complete"),
    ),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);

    const state = await ctx.db
      .query("onboardingState")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId as string))
      .first();

    if (!state) throw new Error("Onboarding state not found");

    if (state.completedSteps.includes(args.step)) return null;

    const patch: { completedSteps: string[]; completedAt?: number } = {
      completedSteps: [...state.completedSteps, args.step],
    };

    if (args.step === "onboarding_complete") {
      patch.completedAt = Date.now();
    }

    await ctx.db.patch(state._id, patch);
    return null;
  },
});
