import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

export const create = internalMutation({
  args: {
    tenantId: v.string(),
    email: v.string(),
    channelId: v.optional(v.id("channels")),
    departmentId: v.optional(v.id("departments")),
    role: v.union(v.literal("org:supervisor"), v.literal("org:agent")),
  },
  handler: async (ctx, args) => {
    if (!args.channelId) return;
    const existing = await ctx.db
      .query("pendingChannelAssignments")
      .withIndex("by_email_tenant", (q) =>
        q.eq("email", args.email).eq("tenantId", args.tenantId)
      )
      .collect();
    for (const e of existing.filter((r) => !r.applied)) {
      await ctx.db.delete(e._id);
    }
    await ctx.db.insert("pendingChannelAssignments", {
      tenantId: args.tenantId,
      email: args.email,
      channelId: args.channelId,
      departmentId: args.departmentId,
      role: args.role,
      applied: false,
      createdAt: Date.now(),
    });
  },
});

export const findByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("pendingChannelAssignments")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .filter((q) => q.eq(q.field("applied"), false))
      .collect();
  },
});

export const markApplied = internalMutation({
  args: { id: v.id("pendingChannelAssignments") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { applied: true });
  },
});

/** Internal version — called from validateAndJoin after member is created. */
export const applyPendingInternal = internalAction({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;
    const email = identity.email ?? "";
    if (!email) return;
    const userId = identity.subject as string;
    const tenantId = identity.orgId as string;
    if (!tenantId) return;

    const pending = await ctx.runQuery(internal.pendingChannelAssignments.findByEmail, { email });
    for (const a of pending) {
      if (a.tenantId !== tenantId) continue;
      if (!a.channelId) continue;

      const userName = identity.name ?? email;

      await ctx.runMutation(internal.channelMembers.addMemberInternal, {
        tenantId,
        channelId: a.channelId,
        userId,
        userName,
        userEmail: email,
        role: a.role,
      });

      if (a.departmentId) {
        await ctx.runMutation(internal.departmentMembers.addMemberInternal, {
          tenantId,
          departmentId: a.departmentId,
          userId,
          userName,
          userEmail: email,
          role: a.role,
        });
      }

      await ctx.runMutation(internal.pendingChannelAssignments.markApplied, { id: a._id });
    }
  },
});

/** Public version — called from the client bootstrap component on app load. */
export const applyPendingForCurrentUser = action({
  args: {},
  handler: async (ctx) => {
    await ctx.runAction(internal.pendingChannelAssignments.applyPendingInternal, {});
  },
});
