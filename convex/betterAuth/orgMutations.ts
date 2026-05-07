import { mutation as internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

export const createInvitation = internalMutation({
  args: {
    organizationId: v.string(),
    email: v.string(),
    role: v.optional(v.union(v.null(), v.string())),
    status: v.string(),
    inviterId: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("invitation", {
      organizationId: args.organizationId,
      email: args.email,
      role: args.role ?? null,
      status: args.status,
      inviterId: args.inviterId,
      expiresAt: args.expiresAt,
      createdAt: Date.now(),
    });
    return { id: id.toString() };
  },
});

export const cancelInvitation = internalMutation({
  args: { invitationId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.invitationId as Id<"invitation">, { status: "canceled" });
  },
});

export const updateMemberRole = internalMutation({
  args: { memberId: v.string(), role: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.memberId as Id<"member">, { role: args.role });
  },
});

export const deleteMember = internalMutation({
  args: { memberId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.memberId as Id<"member">);
  },
});

export const createMember = internalMutation({
  args: {
    userId: v.string(),
    organizationId: v.string(),
    role: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("member", {
      userId: args.userId,
      organizationId: args.organizationId,
      role: args.role,
      createdAt: args.createdAt,
    });
  },
});

export const deleteOrgById = internalMutation({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.organizationId as Id<"organization">);
  },
});

export const deleteOrgMembers = internalMutation({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("member")
      .withIndex("organizationId", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    await Promise.all(members.map((m) => ctx.db.delete(m._id)));
  },
});

export const deleteOrgInvitations = internalMutation({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const invitations = await ctx.db
      .query("invitation")
      .withIndex("organizationId", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    await Promise.all(invitations.map((i) => ctx.db.delete(i._id)));
  },
});
