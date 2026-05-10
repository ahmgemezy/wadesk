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

export const listAccessible = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    const sanitize = (ch: (typeof channels)[number]) => {
      const { accessToken: _a, tokenEncryptedAt: _t, ...rest } = ch;
      return rest;
    };

    if (orgRole === "org:admin" || orgRole === "org:supervisor") {
      return channels.map(sanitize);
    }

    // Agents: only channels they are a member of
    const memberships = await ctx.db
      .query("channelMembers")
      .withIndex("by_tenant_user", (q) => q.eq("tenantId", tenantId).eq("userId", callerId))
      .collect();
    const memberChannelIds = new Set(memberships.map((m) => m.channelId.toString()));
    return channels.filter((ch) => memberChannelIds.has(ch._id.toString())).map(sanitize);
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

export const getByWabaId = internalQuery({
  args: { wabaId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("channels")
      .withIndex("by_waba_id", (q) => q.eq("wabaId", args.wabaId))
      .first();
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
    if (args.status === "disconnected" || args.status === "reconnect_required") {
      patch.disconnectedAt = Date.now();
    }
    await ctx.db.patch(args.channelId, patch);

    if (args.status === "disconnected" || args.status === "reconnect_required") {
      const ch = await ctx.db.get(args.channelId);
      if (ch) {
        await ctx.scheduler.runAfter(0, internal.conversations.internalCloseAllForChannel, {
          channelId: args.channelId,
          tenantId: ch.tenantId,
        });
      }
    }
  },
});

// Marks a channel as needing reconnection without closing its conversations.
// Used when the WhatsApp access token returns auth errors (e.g. Meta code 190)
// from a background path — closing every conversation on a token blip would
// be far too destructive.
export const markReconnectRequiredInternal = internalMutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) return;
    if (channel.status === "reconnect_required") return;
    await ctx.db.patch(args.channelId, {
      status: "reconnect_required",
      disconnectedAt: Date.now(),
    });
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

    await ctx.scheduler.runAfter(0, internal.conversations.internalCloseAllForChannel, {
      channelId: args.channelId,
      tenantId,
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

export const updateReopenWindow = mutation({
  args: {
    channelId: v.id("channels"),
    hours: v.optional(v.number()),  // undefined → use default 24h
  },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdmin(role);

    const { tenantId } = await getCallerIdentity(ctx);

    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) {
      throw new ConvexError("NOT_FOUND");
    }

    if (args.hours !== undefined && (args.hours < 1 || args.hours > 720)) {
      throw new ConvexError("INVALID_WINDOW");
    }

    await ctx.db.patch(args.channelId, {
      reopenWindowHours: args.hours,
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

    const allConversations = await ctx.db
      .query("conversations")
      .withIndex("by_tenant_channel", (q) =>
        q.eq("tenantId", tenantId).eq("channelId", args.channelId)
      )
      .collect();

    const openConversations = allConversations.filter(
      (c) => c.status !== "resolved"
    );

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
    accessToken: v.optional(v.string()),
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

    // 3. Get access token — use provided token or exchange code
    let accessToken = args.accessToken ?? "";
    if (!accessToken) {
      const appId = process.env.META_APP_ID ?? process.env.NEXT_PUBLIC_META_APP_ID ?? "";
      const appSecret = process.env.META_APP_SECRET ?? "";
      const tokenUrl =
        `https://graph.facebook.com/v25.0/oauth/access_token` +
        `?client_id=${encodeURIComponent(appId)}` +
        `&client_secret=${encodeURIComponent(appSecret)}` +
        `&code=${encodeURIComponent(args.code)}`;

      const tokenRes = await fetch(tokenUrl);
      const tokenData = (await tokenRes.json()) as { access_token?: string; error?: { message?: string; code?: number } };

      if (!tokenRes.ok || !tokenData.access_token) {
        console.error("[CHANNEL] Token exchange failed:", tokenData);
        throw new ConvexError({
          code: "TOKEN_EXCHANGE_FAILED",
          reason: tokenData.error?.message ?? "Unknown error",
        });
      }

      accessToken = tokenData.access_token;

      if (tokenData.error?.code === 190) {
        throw new ConvexError("TOKEN_REVOKED");
      }
    }

    // 3b. Assign WABDesk system user to client's WABA (BSP architecture)
    // After this, the platform system user token works for all this WABA's operations
    const systemUserId = process.env.META_SYSTEM_USER_ID ?? "";
    const platformToken = process.env.WHATSAPP_API_TOKEN ?? "";
    if (systemUserId && platformToken) {
      const assignRes = await fetch(
        `https://graph.facebook.com/v25.0/${args.wabaId}/assigned_users`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            user: systemUserId,
            tasks: JSON.stringify(["MANAGE", "DEVELOP", "MESSAGING"]),
          }),
        }
      );
      if (assignRes.ok) {
        // Switch to permanent platform token — client token will eventually expire
        accessToken = platformToken;
      } else {
        const err = await assignRes.json();
        console.warn("[CHANNEL] System user assignment failed, falling back to client token", err);
      }
    }

    // 4. Encrypt token
    const encryptedToken = await encrypt(accessToken);

    // 5. Subscribe webhook on the WABA
    const webhookRes = await fetch(
      `https://graph.facebook.com/v25.0/${args.wabaId}/subscribed_apps`,
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

// Dev-only: connect a channel using credentials from Meta Developer Console
// (bypasses Embedded Signup OAuth). Only callable when DEV_MANUAL_CONNECT=true in Convex env.
export const devConnectWithCredentials = action({
  args: {
    phoneNumberId: v.string(),
    wabaId: v.string(),
    displayPhone: v.string(),
    displayName: v.string(),
  },
  handler: async (ctx, args): Promise<{ channelId: Id<"channels">; displayPhone: string }> => {
    if (process.env.DEV_MANUAL_CONNECT !== "true") {
      throw new ConvexError("NOT_AVAILABLE");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.orgId) throw new ConvexError("UNAUTHORIZED");
    const orgRole = (identity.orgRole as string | undefined) ?? "org:agent";
    if (orgRole !== "org:admin") throw new ConvexError("FORBIDDEN");
    const tenantId = identity.orgId as string;

    const plan: Plan = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId });
    const limit = getChannelLimit(plan);
    if (limit !== Infinity) {
      const activeChannels = await ctx.runQuery(internal.channels.listByTenantId, { tenantId });
      const activeCount = activeChannels.filter(
        (c: { status?: string }) => c.status === "active" || c.status === "connecting"
      ).length;
      if (activeCount >= limit) throw new ConvexError("PLAN_LIMIT_REACHED");
    }

    const accessToken = process.env.WHATSAPP_API_TOKEN ?? "";
    if (!accessToken) throw new ConvexError("WHATSAPP_API_TOKEN_NOT_SET");

    const encryptedToken = await encrypt(accessToken);

    const webhookRes = await fetch(
      `https://graph.facebook.com/v25.0/${args.wabaId}/subscribed_apps`,
      { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const webhookData = (await webhookRes.json()) as { success?: boolean };
    const webhookSubscribed = webhookData.success === true;

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

    if (!webhookSubscribed) {
      await ctx.scheduler.runAfter(60_000, internal.channels.retryWebhookSubscription, {
        channelId,
        wabaId: args.wabaId,
        accessToken,
        attempt: 1,
      });
    }

    await ctx.runMutation(internal.channels.markWhatsappConnected, { tenantId });
    console.log(`[DEV_CONNECT] Channel created: ${args.displayPhone} / ${args.phoneNumberId}`);
    return { channelId, displayPhone: args.displayPhone };
  },
});

export const discoverWabaFromCode = action({
  args: {
    accessToken: v.string(),
  },
  handler: async (ctx, args): Promise<{ wabaId: string; phoneNumberId: string; displayPhone: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.orgId) throw new ConvexError("UNAUTHORIZED");

    const accessToken = args.accessToken;
    const apiBase = process.env.META_GRAPH_API_BASE_URL ?? "https://graph.facebook.com";

    const userRes = await fetch(`${apiBase}/v25.0/me?fields=id&access_token=${accessToken}`);
    const userData = (await userRes.json()) as { id?: string };
    if (!userData.id) {
      console.error("[CHANNEL] Fallback: Could not get user ID:", userData);
      throw new ConvexError("WABA_DISCOVERY_FAILED");
    }

    const businessesRes = await fetch(
      `${apiBase}/v25.0/${userData.id}/businesses?access_token=${accessToken}`
    );
    const businessesData = (await businessesRes.json()) as { data?: { id: string }[] };
    const businesses = businessesData.data ?? [];

    if (businesses.length === 0) {
      console.error("[CHANNEL] Fallback: No businesses found for user");
      throw new ConvexError("WABA_DISCOVERY_FAILED");
    }

    for (const biz of businesses) {
      const wabasRes = await fetch(
        `${apiBase}/v25.0/${biz.id}/owned_whatsapp_business_accounts?access_token=${accessToken}`
      );
      const wabasData = (await wabasRes.json()) as { data?: { id: string }[] };
      const wabas = wabasData.data ?? [];

      for (const waba of wabas) {
        const phonesRes = await fetch(
          `${apiBase}/v25.0/${waba.id}/phone_numbers?access_token=${accessToken}`
        );
        const phonesData = (await phonesRes.json()) as {
          data?: { id: string; display_phone_number?: string; verified_name?: string }[];
        };
        const phones = phonesData.data ?? [];

        if (phones.length > 0) {
          const phone = phones[0];
          return {
            wabaId: waba.id,
            phoneNumberId: phone.id,
            displayPhone: phone.display_phone_number ?? phone.id,
          };
        }
      }
    }

    console.error("[CHANNEL] Fallback: No WABA with phone numbers found");
    throw new ConvexError("WABA_DISCOVERY_FAILED");
  },
});

// ─── Internal Helpers ─────────────────────────────────────────────────────────

export const setProfilePictureUrl = internalMutation({
  args: { channelId: v.id("channels"), profilePictureUrl: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.channelId, { profilePictureUrl: args.profilePictureUrl });
  },
});

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
    // 1. Same-tenant reconnection: reuse existing channel document as-is
    const sameTenantExisting = await ctx.db
      .query("channels")
      .withIndex("by_tenant_phone", (q) =>
        q.eq("tenantId", args.tenantId).eq("phoneNumberId", args.phoneNumberId)
      )
      .first();

    if (sameTenantExisting) {
      await ctx.db.patch(sameTenantExisting._id, {
        accessToken: args.encryptedToken,
        tokenEncryptedAt: Date.now(),
        status: args.status,
        displayPhone: args.displayPhone,
        displayName: args.displayName,
        connectedAt: Date.now(),
        disconnectedAt: undefined,
        deactivationWarningsSent: undefined,
        isActive: args.status === "active",
      });
      return sameTenantExisting._id;
    }

    // 2. Cross-tenant: same phone number was connected under a different tenant.
    // The phone number is the stable anchor — transfer the channel document (and all
    // its departments) to the current tenant so the customer's setup is preserved.
    const crossTenantExisting = await ctx.db
      .query("channels")
      .withIndex("by_phone_number_id", (q) =>
        q.eq("phoneNumberId", args.phoneNumberId)
      )
      .first();

    if (crossTenantExisting) {
      await ctx.db.patch(crossTenantExisting._id, {
        tenantId: args.tenantId,
        accessToken: args.encryptedToken,
        tokenEncryptedAt: Date.now(),
        status: args.status,
        displayPhone: args.displayPhone,
        displayName: args.displayName,
        connectedAt: Date.now(),
        disconnectedAt: undefined,
        deactivationWarningsSent: undefined,
        isActive: args.status === "active",
      });

      // Re-home departments and channel members to the new tenant
      const depts = await ctx.db
        .query("departments")
        .withIndex("by_channel", (q) => q.eq("channelId", crossTenantExisting._id))
        .collect();
      for (const dept of depts) {
        await ctx.db.patch(dept._id, { tenantId: args.tenantId });
      }

      const members = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel", (q) => q.eq("channelId", crossTenantExisting._id))
        .collect();
      for (const member of members) {
        await ctx.db.patch(member._id, { tenantId: args.tenantId });
      }

      return crossTenantExisting._id;
    }

    // 3. First connection of this number — create channel + seed default department
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
      `https://graph.facebook.com/v25.0/${args.wabaId}/subscribed_apps`,
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

export const listOtherChannelsForForward = query({
  args: { excludeChannelId: v.id("channels") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const all = await ctx.db
      .query("channels")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
    return all
      .filter(
        (c) => c._id !== args.excludeChannelId && (c.status === "active" || c.status === undefined),
      )
      .map((c) => ({ _id: c._id, displayName: c.displayName, displayPhone: c.displayPhone }));
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
