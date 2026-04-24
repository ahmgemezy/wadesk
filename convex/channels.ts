import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { query, mutation, action, internalQuery, internalMutation, internalAction } from "./_generated/server";
import { getCallerRole, getCallerIdentity, assertAdmin, type OrgRole } from "./lib/auth";
import { getChannelLimit } from "./lib/planLimits";
import { encrypt } from "./lib/encryption";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { Plan } from "./lib/planLimits";

// ─── Queries ──────────────────────────────────────────────────────────────────

export const listForTenant = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    // Never return accessToken to client
    return channels.map((ch) => {
      const { accessToken: _a, tokenEncryptedAt: _t, ...rest } = ch;
      return rest;
    });
  },
});

export const listByPhoneId = internalQuery({
  args: { phoneNumberId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("channels")
      .withIndex("by_phone_number_id", (q) => q.eq("phoneNumberId", args.phoneNumberId))
      .collect();
  },
});

export const listByTenantId = internalQuery({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("channels")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

export const getById = internalQuery({
  args: { channelId: v.id("channels"), tenantId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) return null;
    if (args.tenantId !== undefined && channel.tenantId !== args.tenantId) return null;
    return channel;
  },
});

export const get = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) return null;
    const { accessToken: _a, tokenEncryptedAt: _t, ...rest } = channel;
    return rest;
  },
});

// ─── Internal Mutations ───────────────────────────────────────────────────────

export const setStatus = internalMutation({
  args: {
    channelId: v.id("channels"),
    status: v.union(
      v.literal("connecting"),
      v.literal("active"),
      v.literal("disconnected"),
      v.literal("reconnect_required"),
    ),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { status: args.status };
    if (args.status === "active") patch.connectedAt = Date.now();
    if (args.status === "disconnected") patch.disconnectedAt = Date.now();
    await ctx.db.patch(args.channelId, patch);
  },
});

export const incrementRoundRobinIndex = internalMutation({
  args: { channelId: v.id("channels"), tenantId: v.string() },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== args.tenantId) return;
    await ctx.db.patch(args.channelId, {
      roundRobinIndex: channel.roundRobinIndex + 1,
    });
  },
});

// ─── Public Mutations ─────────────────────────────────────────────────────────

export const setAssignmentMode = mutation({
  args: {
    channelId: v.id("channels"),
    mode: v.union(
      v.literal("first_reply"),
      v.literal("manual"),
      v.literal("round_robin"),
    ),
  },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const { tenantId } = await getCallerIdentity(ctx);

    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    if (args.mode === "round_robin") {
      const plan: Plan = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId });
      if (plan === "free" || plan === "starter") {
        throw new ConvexError({ code: "PLAN_REQUIRED", requiredPlan: "growth" });
      }
    }

    await ctx.db.patch(args.channelId, { assignmentMode: args.mode });
  },
});

export const disconnect = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const { tenantId } = await getCallerIdentity(ctx);

    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    await ctx.db.patch(args.channelId, {
      status: "disconnected",
      disconnectedAt: Date.now(),
      isActive: false,
    });
  },
});

export const rename = mutation({
  args: {
    channelId: v.id("channels"),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const { tenantId } = await getCallerIdentity(ctx);

    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    await ctx.db.patch(args.channelId, { displayName: args.displayName.trim() });
  },
});

export const create = mutation({
  args: {
    displayName: v.string(),
    phoneNumberId: v.string(),
    wabaId: v.string(),
    assignmentMode: v.optional(v.union(
      v.literal("first_reply"),
      v.literal("manual"),
      v.literal("round_robin"),
    )),
  },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const { tenantId } = await getCallerIdentity(ctx);

    const existing = await ctx.db
      .query("channels")
      .withIndex("by_tenant_phone", (q) =>
        q.eq("tenantId", tenantId).eq("phoneNumberId", args.phoneNumberId)
      )
      .first();
    if (existing) {
      throw new ConvexError("DUPLICATE_PHONE_NUMBER");
    }

    const channelId = await ctx.db.insert("channels", {
      tenantId,
      displayName: args.displayName.trim(),
      phoneNumberId: args.phoneNumberId,
      wabaId: args.wabaId,
      assignmentMode: args.assignmentMode ?? "first_reply",
      roundRobinIndex: 0,
      isActive: true,
      status: "active",
      connectedAt: Date.now(),
      createdAt: Date.now(),
    });

    const identity = await ctx.auth.getUserIdentity();
    await ctx.runMutation(internal.departments.createDefaultDepartment, {
      tenantId,
      channelId,
      name: "General",
      createdBy: identity?.subject ?? "system",
    });

    return channelId;
  },
});

export const updateName = mutation({
  args: {
    channelId: v.id("channels"),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const { tenantId } = await getCallerIdentity(ctx);

    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    await ctx.db.patch(args.channelId, {
      displayName: args.displayName.trim(),
    });
  },
});

export const remove = mutation({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const { tenantId } = await getCallerIdentity(ctx);

    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    const openConversations = await ctx.db
      .query("conversations")
      .withIndex("by_tenant_channel", (q) =>
        q.eq("tenantId", tenantId).eq("channelId", args.channelId)
      )
      .collect();

    if (openConversations.length > 0) {
      throw new ConvexError("HAS_CONVERSATIONS");
    }

    await ctx.db.delete(args.channelId);
  },
});

// ─── Embedded Signup Action ───────────────────────────────────────────────────

export const completeEmbeddedSignup = action({
  args: {
    code: v.string(),
    wabaId: v.string(),
    phoneNumberId: v.string(),
    displayPhone: v.string(),
    displayName: v.string(),
  },
  handler: async (ctx, args): Promise<{ channelId: Id<"channels">; displayPhone: string }> => {
    // 1. Auth: Admin only
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.orgId) throw new ConvexError("UNAUTHORIZED");
    const orgRole = (identity.orgRole as string | undefined) ?? "org:agent";
    if (orgRole !== "org:admin") throw new ConvexError("FORBIDDEN");
    const tenantId = identity.orgId as string;

    // 2. Plan channel limit check
    const plan: Plan = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId });
    const limit = getChannelLimit(plan);
    if (limit !== Infinity) {
      const activeChannels = await ctx.runQuery(internal.channels.listByTenantId, { tenantId });
      const activeCount = activeChannels.filter(
        (c: { status?: string }) => c.status === "active" || c.status === "connecting"
      ).length;
      if (activeCount >= limit) {
        throw new ConvexError("PLAN_LIMIT_REACHED");
      }
    }

    // 3. Exchange code for access token
    const appId = process.env.META_APP_ID ?? process.env.NEXT_PUBLIC_META_APP_ID ?? "";
    const appSecret = process.env.META_APP_SECRET ?? "";
    const tokenUrl =
      `https://graph.facebook.com/v21.0/oauth/access_token` +
      `?client_id=${encodeURIComponent(appId)}` +
      `&client_secret=${encodeURIComponent(appSecret)}` +
      `&code=${encodeURIComponent(args.code)}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: { message?: string } };

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[CHANNEL] Token exchange failed:", tokenData);
      throw new ConvexError({
        code: "TOKEN_EXCHANGE_FAILED",
        reason: tokenData.error?.message ?? "Unknown error",
      });
    }

    const accessToken = tokenData.access_token;

    // Check for token revocation (error code 190)
    if ((tokenData as { error?: { code?: number } }).error?.code === 190) {
      throw new ConvexError("TOKEN_REVOKED");
    }

    // 4. Encrypt token
    const encryptedToken = await encrypt(accessToken);

    // 5. Subscribe webhook on the WABA
    const webhookRes = await fetch(
      `https://graph.facebook.com/v21.0/${args.wabaId}/subscribed_apps`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const webhookData = (await webhookRes.json()) as { success?: boolean };
    const webhookSubscribed = webhookData.success === true;

    // 6. Upsert channel by (tenantId, phoneNumberId)
    const channelId = await ctx.runMutation(internal.channels.upsertChannel, {
      tenantId,
      phoneNumberId: args.phoneNumberId,
      displayPhone: args.displayPhone,
      displayName: args.displayName,
      wabaId: args.wabaId,
      encryptedToken,
      status: webhookSubscribed ? "active" : "connecting",
      connectedByUserId: identity.subject,
    });

    // 7. If webhook failed, schedule retry
    if (!webhookSubscribed) {
      console.warn("[CHANNEL] Webhook subscription failed — scheduling retry", {
        channelId,
        wabaId: args.wabaId,
      });
      await ctx.scheduler.runAfter(60_000, internal.channels.retryWebhookSubscription, {
        channelId,
        wabaId: args.wabaId,
        accessToken,
        attempt: 1,
      });
    }

    // 8. Mark onboarding step
    await ctx.runMutation(internal.channels.markWhatsappConnected, { tenantId });

    return { channelId, displayPhone: args.displayPhone };
  },
});

// ─── Internal Helpers ─────────────────────────────────────────────────────────

export const upsertChannel = internalMutation({
  args: {
    tenantId: v.string(),
    phoneNumberId: v.string(),
    displayPhone: v.string(),
    displayName: v.string(),
    wabaId: v.string(),
    encryptedToken: v.string(),
    status: v.union(v.literal("connecting"), v.literal("active")),
    connectedByUserId: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"channels">> => {
    const existing = await ctx.db
      .query("channels")
      .withIndex("by_tenant_phone", (q) =>
        q.eq("tenantId", args.tenantId).eq("phoneNumberId", args.phoneNumberId)
      )
      .first();

    if (existing) {
      // Reconnection path — reuse existing channelId
      await ctx.db.patch(existing._id, {
        accessToken: args.encryptedToken,
        tokenEncryptedAt: Date.now(),
        status: args.status,
        displayPhone: args.displayPhone,
        displayName: args.displayName,
        connectedAt: Date.now(),
        disconnectedAt: undefined,
        isActive: args.status === "active",
      });
      return existing._id;
    }

    const channelId = await ctx.db.insert("channels", {
      tenantId: args.tenantId,
      phoneNumberId: args.phoneNumberId,
      displayPhone: args.displayPhone,
      displayName: args.displayName,
      wabaId: args.wabaId,
      accessToken: args.encryptedToken,
      tokenEncryptedAt: Date.now(),
      assignmentMode: "manual",
      roundRobinIndex: 0,
      isActive: args.status === "active",
      status: args.status,
      connectedAt: args.status === "active" ? Date.now() : undefined,
      createdAt: Date.now(),
    });

    await ctx.runMutation(internal.departments.createDefaultDepartment, {
      tenantId: args.tenantId,
      channelId,
      name: "General",
      createdBy: args.connectedByUserId,
    });

    return channelId;
  },
});

export const markWhatsappConnected = internalMutation({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("onboardingState")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .first();

    if (!state) return;
    if (state.completedSteps.includes("whatsapp_connected")) return;

    await ctx.db.patch(state._id, {
      completedSteps: [...state.completedSteps, "whatsapp_connected"],
    });
  },
});

export const retryWebhookSubscription = internalAction({
  args: {
    channelId: v.id("channels"),
    wabaId: v.string(),
    accessToken: v.string(),
    attempt: v.number(),
  },
  handler: async (ctx, args) => {
    const MAX_ATTEMPTS = 5;

    const webhookRes = await fetch(
      `https://graph.facebook.com/v21.0/${args.wabaId}/subscribed_apps`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${args.accessToken}` },
      }
    );
    const webhookData = (await webhookRes.json()) as { success?: boolean; error?: { code?: number } };

    if (webhookData.success === true) {
      console.log("[CHANNEL] Webhook retry succeeded on attempt", args.attempt);
      await ctx.runMutation(internal.channels.setStatus, {
        channelId: args.channelId,
        status: "active",
      });
      return;
    }

    console.warn("[CHANNEL] Webhook retry failed on attempt", args.attempt, webhookData);

    if (args.attempt < MAX_ATTEMPTS) {
      await ctx.scheduler.runAfter(60_000, internal.channels.retryWebhookSubscription, {
        channelId: args.channelId,
        wabaId: args.wabaId,
        accessToken: args.accessToken,
        attempt: args.attempt + 1,
      });
    } else {
      console.error("[CHANNEL] Webhook subscription failed after", MAX_ATTEMPTS, "attempts — manual intervention required");
    }
  },
});

export const updateSlaThreshold = mutation({
  args: {
    channelId: v.id("channels"),
    thresholdMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);

    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    await ctx.db.patch(args.channelId, {
      slaThresholdMinutes:
        args.thresholdMinutes && args.thresholdMinutes > 0
          ? args.thresholdMinutes
          : undefined,
    });
  },
});
