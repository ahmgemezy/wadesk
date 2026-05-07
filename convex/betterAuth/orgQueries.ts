import { query as internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

const memberShape = v.object({
  id: v.string(),
  _id: v.id("member"),
  _creationTime: v.number(),
  organizationId: v.string(),
  userId: v.string(),
  role: v.string(),
  createdAt: v.number(),
});

const invitationShape = v.object({
  id: v.string(),
  _id: v.id("invitation"),
  _creationTime: v.number(),
  organizationId: v.string(),
  email: v.string(),
  role: v.optional(v.union(v.null(), v.string())),
  status: v.string(),
  expiresAt: v.number(),
  createdAt: v.number(),
  inviterId: v.string(),
});

const orgShape = v.union(
  v.null(),
  v.object({
    id: v.string(),
    _id: v.id("organization"),
    _creationTime: v.number(),
    name: v.string(),
    slug: v.string(),
    logo: v.optional(v.union(v.null(), v.string())),
    createdAt: v.number(),
    metadata: v.optional(v.union(v.null(), v.string())),
  }),
);

export const listOrgMembers = internalQuery({
  args: { organizationId: v.string() },
  returns: v.array(memberShape),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("member")
      .withIndex("organizationId", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    return rows.map((m) => ({ id: m._id as string, ...m }));
  },
});

export const listMembersByUserId = internalQuery({
  args: { userId: v.string() },
  returns: v.array(memberShape),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("member")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .collect();
    return rows.map((m) => ({ id: m._id as string, ...m }));
  },
});

export const findOrgMember = internalQuery({
  args: { organizationId: v.string(), userId: v.string() },
  returns: v.union(v.null(), memberShape),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("member")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();
    const m = rows[0];
    return m ? { id: m._id as string, ...m } : null;
  },
});

export const listPendingInvitations = internalQuery({
  args: { organizationId: v.string() },
  returns: v.array(invitationShape),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("invitation")
      .withIndex("organizationId", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
    return rows.map((inv) => ({ id: inv._id as string, ...inv }));
  },
});

export const findPendingInvitationByEmail = internalQuery({
  args: { organizationId: v.string(), email: v.string() },
  returns: v.array(invitationShape),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("invitation")
      .withIndex("email", (q) => q.eq("email", args.email))
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("status"), "pending"),
        ),
      )
      .collect();
    return rows.map((inv) => ({ id: inv._id as string, ...inv }));
  },
});

export const findOrg = internalQuery({
  args: { orgId: v.string() },
  returns: orgShape,
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId as Id<"organization">);
    return org ? { id: org._id as string, ...org } : null;
  },
});
