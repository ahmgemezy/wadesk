import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery, internalAction, action } from "./_generated/server";
import { getCallerIdentity, getCallerRole, assertAdmin, type OrgRole } from "./lib/auth";
import type { Id } from "./_generated/dataModel";
import { internal, components } from "./_generated/api";
import { getAdminEmails, resolveOrgName } from "./lib/emailHelpers";

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

    if (existing) {
      if (!existing.completedSteps.includes("workspace_named")) {
        await ctx.db.patch(existing._id, {
          completedSteps: ["workspace_named", ...existing.completedSteps],
        });
      }
      return existing._id;
    }

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

export const unmarkStep = mutation({
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

    if (!state) return null;

    await ctx.db.patch(state._id, {
      completedSteps: state.completedSteps.filter((s) => s !== args.step),
    });
    return null;
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

// Deletes onboardingState + tenants rows for a given tenantId.
// Called by abandonAndDelete and cleanupIncompleteOrgs.
export const deleteOnboardingRecords = internalMutation({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("onboardingState")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .first();
    if (state) await ctx.db.delete(state._id);

    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();
    if (tenant) await ctx.db.delete(tenant._id);
  },
});

// Called when admin clicks "Sign out and go back" during onboarding.
// Deletes the incomplete org and all related records before signing out.
export const abandonAndDelete = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const tenantId = identity?.orgId as string | undefined;
    if (!tenantId) return;

    // Safety: do not delete if onboarding is already complete
    const state = await ctx.runQuery(internal.onboarding.getStateInternal, { tenantId });
    if (state?.completedSteps.includes("onboarding_complete")) return;

    await ctx.runMutation(internal.onboarding.deleteOnboardingRecords, { tenantId });
    await ctx.runMutation(components.betterAuth.orgMutations.deleteOrgInvitations, { organizationId: tenantId });
    await ctx.runMutation(components.betterAuth.orgMutations.deleteOrgMembers, { organizationId: tenantId });
    await ctx.runMutation(components.betterAuth.orgMutations.deleteOrgById, { organizationId: tenantId });
  },
});

// Internal query used by abandonAndDelete (actions can't use ctx.db directly).
export const getStateInternal = internalQuery({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("onboardingState")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .first();
  },
});

const HOURS_24 = 24 * 60 * 60 * 1000;
const HOURS_48 = 48 * 60 * 60 * 1000;

// Daily cron: warns admins at 24h, deletes incomplete orgs at 48h.
export const cleanupIncompleteOrgs = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const allStates = await ctx.runQuery(internal.onboarding.listIncompleteStates, {});

    for (const state of allStates) {
      const age = now - state.createdAt;
      const tenantId = state.tenantId;

      if (age >= HOURS_48) {
        // Delete the org and all related records
        await ctx.runMutation(internal.onboarding.deleteOnboardingRecords, { tenantId });
        await ctx.runMutation(components.betterAuth.orgMutations.deleteOrgInvitations, { organizationId: tenantId });
        await ctx.runMutation(components.betterAuth.orgMutations.deleteOrgMembers, { organizationId: tenantId });
        await ctx.runMutation(components.betterAuth.orgMutations.deleteOrgById, { organizationId: tenantId });
        console.log(`[ONBOARDING_CLEANUP] Deleted incomplete org ${tenantId}`);
      } else if (age >= HOURS_24 && !state.warningSentAt) {
        // Send warning email
        const admins = await getAdminEmails(ctx, tenantId);
        const orgName = await resolveOrgName(ctx, tenantId);
        const deleteDate = new Date(state.createdAt + HOURS_48).toLocaleDateString("en-GB");

        for (const admin of admins) {
          await ctx.runAction(internal.actions.sendEmail.sendEmail, {
            to: admin.email,
            templateKey: "onboarding_reminder",
            locale: "ar",
            variables: { orgName, deleteDate },
          });
        }

        await ctx.runMutation(internal.onboarding.markWarningSent, { tenantId, warningSentAt: now });
        console.log(`[ONBOARDING_CLEANUP] Warning sent for org ${tenantId}`);
      }
    }
  },
});

export const listIncompleteStates = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("onboardingState").collect();
    // Only orgs that never connected WhatsApp are considered abandoned.
    // Completing steps 3/4 is optional — a connected WABA is a real workspace.
    return all.filter((s) => !s.completedSteps.includes("whatsapp_connected"));
  },
});

export const markWarningSent = internalMutation({
  args: { tenantId: v.string(), warningSentAt: v.number() },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("onboardingState")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .first();
    if (state) await ctx.db.patch(state._id, { warningSentAt: args.warningSentAt });
  },
});
