import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { getCallerRole, getCallerIdentity, assertAdmin, assertAdminOrSupervisor } from "./lib/auth";

function buildUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl}/join/${token}`;
}

function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** List all non-revoked invite links for the caller's tenant, newest first */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId } = await getCallerIdentity(ctx);

    const links = await ctx.db
      .query("inviteLinks")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    return links
      .filter((l) => !l.revoked)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((l) => ({
        _id: l._id,
        token: l.token,
        label: l.label ?? null,
        defaultRole: l.defaultRole,
        expiresAt: l.expiresAt,
        createdBy: l.createdBy,
        createdAt: l.createdAt,
        url: buildUrl(l.token),
        isExpired: l.expiresAt <= Date.now(),
        neverExpires: l.expiresAt === Number.MAX_SAFE_INTEGER,
      }));
  },
});

/** Create a new invite link */
export const create = mutation({
  args: {
    label: v.string(),
    role: v.union(v.literal("org:agent"), v.literal("org:supervisor")),
    expiresInDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    const orgRole = await getCallerRole(ctx);

    assertAdminOrSupervisor(orgRole);

    // Supervisors can only create org:agent links
    if (orgRole === "org:supervisor" && args.role === "org:supervisor") {
      throw new ConvexError("FORBIDDEN");
    }

    const token = generateToken();
    const expiresAt = args.expiresInDays
      ? Date.now() + args.expiresInDays * 24 * 60 * 60 * 1000
      : Number.MAX_SAFE_INTEGER; // never expires

    await ctx.db.insert("inviteLinks", {
      tenantId,
      token,
      label: args.label,
      createdBy: callerId,
      expiresAt,
      revoked: false,
      defaultRole: args.role,
      createdAt: Date.now(),
    });

    return { token, expiresAt, url: buildUrl(token) };
  },
});

/** Revoke a specific invite link by ID */
export const revoke = mutation({
  args: { linkId: v.id("inviteLinks") },
  handler: async (ctx, { linkId }) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    const orgRole = await getCallerRole(ctx);

    assertAdminOrSupervisor(orgRole);

    const link = await ctx.db.get(linkId);
    if (!link || link.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    // Supervisor can only revoke their own links
    if (orgRole === "org:supervisor" && link.createdBy !== callerId) {
      throw new ConvexError("FORBIDDEN");
    }

    await ctx.db.patch(linkId, { revoked: true });
  },
});

/** Regenerate a link — revoke old token, issue new token, same label/role */
export const regenerate = mutation({
  args: { linkId: v.id("inviteLinks") },
  handler: async (ctx, { linkId }) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    const orgRole = await getCallerRole(ctx);

    assertAdminOrSupervisor(orgRole);

    const link = await ctx.db.get(linkId);
    if (!link || link.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    // Supervisor can only regenerate their own links
    if (orgRole === "org:supervisor" && link.createdBy !== callerId) {
      throw new ConvexError("FORBIDDEN");
    }

    const newToken = generateToken();

    await ctx.db.patch(linkId, { token: newToken });

    return { token: newToken, url: buildUrl(newToken), expiresAt: link.expiresAt };
  },
});

// ─── Legacy / internal helpers (kept for backward compat) ─────────────────────

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

// Legacy single-link API (kept for any callers that use generate/revokeLink/getActive)
export const generate = mutation({
  args: {},
  handler: async (ctx) => {
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
    const role = await getCallerRole(ctx);
    if (role !== "org:admin" && role !== "org:supervisor") {
      throw new ConvexError("FORBIDDEN");
    }

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
