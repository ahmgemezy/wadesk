import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";

function buildUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl}/join/${token}`;
}

function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const generate = mutation({
  args: {},
  handler: async (ctx) => {
    const { getCallerRole, assertAdmin } = await import("./lib/auth");
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;
    const callerId = identity.subject as string;

    const existing = await ctx.db
      .query("inviteLinks")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    for (const link of existing) {
      if (!link.revoked) {
        await ctx.db.patch(link._id, { revoked: true });
      }
    }

    const token = generateToken();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    await ctx.db.insert("inviteLinks", {
      tenantId,
      token,
      createdBy: callerId,
      expiresAt,
      revoked: false,
      defaultRole: "org:agent",
      createdAt: Date.now(),
    });

    return { token, expiresAt, url: buildUrl(token) };
  },
});

export const revokeLink = mutation({
  args: {},
  handler: async (ctx) => {
    const { getCallerRole, assertAdmin } = await import("./lib/auth");
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;

    const links = await ctx.db
      .query("inviteLinks")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    const active = links.find((l) => !l.revoked && l.expiresAt > Date.now());
    if (active) {
      await ctx.db.patch(active._id, { revoked: true });
    }
  },
});

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const { getCallerRole, assertAdmin } = await import("./lib/auth");
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHORIZED");
    const tenantId = identity.orgId as string;

    const links = await ctx.db
      .query("inviteLinks")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    const active = links.find((l) => !l.revoked && l.expiresAt > Date.now());
    if (!active) return null;

    return {
      token: active.token,
      expiresAt: active.expiresAt,
      url: buildUrl(active.token),
      createdAt: active.createdAt,
    };
  },
});

export const getActiveForTenant = internalQuery({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("inviteLinks")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    return links.find((l) => !l.revoked && l.expiresAt > Date.now()) ?? null;
  },
});

export const getByToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("inviteLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .collect();
    return links[0] ?? null;
  },
});

export const ensureActive = internalMutation({
  args: { tenantId: v.string(), createdBy: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("inviteLinks")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const active = existing.find((l) => !l.revoked && l.expiresAt > Date.now());

    if (active) {
      return { token: active.token, url: buildUrl(active.token), expiresAt: active.expiresAt };
    }

    for (const link of existing) {
      if (!link.revoked) {
        await ctx.db.patch(link._id, { revoked: true });
      }
    }

    const token = generateToken();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    await ctx.db.insert("inviteLinks", {
      tenantId: args.tenantId,
      token,
      createdBy: args.createdBy,
      expiresAt,
      revoked: false,
      defaultRole: "org:agent",
      createdAt: Date.now(),
    });

    return { token, url: buildUrl(token), expiresAt };
  },
});
