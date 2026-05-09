import { v } from "convex/values";
import { query, mutation, action, internalQuery, internalMutation, internalAction } from "./_generated/server";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import {
  getCallerIdentity,
  getCallerRole,
  assertAdminOrSupervisor,
} from "./lib/auth";
import { assertBroadcastsAllowed } from "./lib/planLimits";
import type { Doc } from "./_generated/dataModel";

const META_BASE = "https://graph.facebook.com/v25.0";

export const listForTenant = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId } = await getCallerIdentity(ctx);
    return ctx.db
      .query("broadcasts")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    listId: v.id("contactLists"),
    channelId: v.id("channels"),
    templateName: v.string(),
    templateLanguage: v.string(),
    scheduledAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    const role = await getCallerRole(ctx);
    assertAdminOrSupervisor(role);

    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .first();
    const plan = (tenant?.plan ?? "free") as import("./lib/planLimits").Plan;
    assertBroadcastsAllowed(plan);

    const list = await ctx.db.get(args.listId);
    if (!list || list.tenantId !== tenantId) {
      throw new ConvexError({ message: "List not found" });
    }

    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) {
      throw new ConvexError({ message: "Channel not found" });
    }

    const now = Date.now();
    if (args.scheduledAt && args.scheduledAt <= now) {
      throw new ConvexError({ message: "Scheduled time must be in the future" });
    }

    return ctx.db.insert("broadcasts", {
      tenantId,
      name: args.name,
      listId: args.listId,
      channelId: args.channelId,
      templateName: args.templateName,
      templateLanguage: args.templateLanguage,
      status: args.scheduledAt ? "scheduled" : "draft",
      scheduledAt: args.scheduledAt,
      recipientSnapshot: [],
      recipientCount: 0,
      createdBy: callerId,
      createdAt: now,
    });
  },
});

export const send = action({
  args: { broadcastId: v.id("broadcasts") },
  handler: async (ctx, args) => {
    // Auth + role check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "UNAUTHORIZED" });
    if (!identity.orgId) throw new ConvexError({ message: "NO_ORG" });
    const tenantId = identity.orgId as string;

    const role = await getCallerRole(ctx);
    assertAdminOrSupervisor(role);

    // Plan check
    const tenant = await ctx.runQuery(internal.broadcasts.getTenantInternal, { tenantId });
    const plan = (tenant?.plan ?? "free") as import("./lib/planLimits").Plan;
    assertBroadcastsAllowed(plan);

    // Fetch broadcast
    const broadcast: Doc<"broadcasts"> | null = await ctx.runQuery(internal.broadcasts.getByIdInternal, {
      broadcastId: args.broadcastId,
      tenantId,
    });
    if (!broadcast) throw new ConvexError({ message: "Broadcast not found" });
    if (broadcast.status !== "draft") {
      throw new ConvexError({ message: "Broadcast already sent or in progress" });
    }

    // Fetch list and contacts to build snapshot
    const list: Doc<"contactLists"> | null = await ctx.runQuery(internal.broadcasts.getListInternal, {
      listId: broadcast.listId,
      tenantId,
    });
    if (!list) throw new ConvexError({ message: "List not found" });

    const contacts: Doc<"contacts">[] = await ctx.runQuery(
      internal.broadcasts.getContactsForList,
      { tenantId, filters: list.filters },
    );

    const recipientSnapshot = contacts.map((c) => ({
      contactId: c._id,
      phone: c.phone,
      name: c.customName ?? c.displayName,
    }));

    if (recipientSnapshot.length === 0) {
      throw new ConvexError({ message: "No contacts match the selected list filters." });
    }

    // Set status to "sending", reset counters and retryMap in one mutation
    await ctx.runMutation(internal.broadcasts.updateStatus, {
      broadcastId: args.broadcastId,
      status: "sending",
      recipientSnapshot,
      recipientCount: recipientSnapshot.length,
      sentCount: 0,
      failedCount: 0,
      retryMap: {},
    });

    // Schedule first batch
    await ctx.scheduler.runAfter(0, internal.actions.processBroadcastBatch.processBroadcastBatch, {
      broadcastId: args.broadcastId,
      batchIndex: 0,
      batchSize: 50,
    });

    return { scheduled: true };
  },
});

export const fetchTemplates = action({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "UNAUTHORIZED" });
    if (!identity.orgId) throw new ConvexError({ message: "NO_ORG" });
    const tenantId = identity.orgId as string;

    const channel: Doc<"channels"> | null = await ctx.runQuery(internal.broadcasts.getChannelInternal, {
      channelId: args.channelId,
      tenantId,
    });
    if (!channel) throw new ConvexError({ message: "Channel not found" });

    const token = process.env.META_SYSTEM_USER_TOKEN;
    if (!token) throw new ConvexError({ message: "META_SYSTEM_USER_TOKEN not set" });

    const res = await fetch(
      `${META_BASE}/${channel.wabaId}/message_templates?fields=name,language,status,components&limit=100`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!res.ok) {
      throw new ConvexError({ message: "Failed to fetch templates from Meta" });
    }

    const data = await res.json() as {
      data: Array<{
        name: string;
        language: string;
        status: string;
        components: unknown[];
      }>;
    };

    return data.data.filter((t) => t.status === "APPROVED");
  },
});

export const getByIdInternal = internalQuery({
  args: { broadcastId: v.id("broadcasts"), tenantId: v.string() },
  handler: async (ctx, args) => {
    const broadcast = await ctx.db.get(args.broadcastId);
    if (!broadcast || broadcast.tenantId !== args.tenantId) return null;
    return broadcast;
  },
});

export const getChannelInternal = internalQuery({
  args: { channelId: v.id("channels"), tenantId: v.string() },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== args.tenantId) return null;
    return channel;
  },
});

export const getListInternal = internalQuery({
  args: { listId: v.id("contactLists"), tenantId: v.string() },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list || list.tenantId !== args.tenantId) return null;
    return list;
  },
});

export const getContactsForList = internalQuery({
  args: {
    tenantId: v.string(),
    filters: v.object({
      countries: v.optional(v.array(v.string())),
      cities: v.optional(v.array(v.string())),
      stages: v.optional(v.array(v.union(
        v.literal("lead"),
        v.literal("prospect"),
        v.literal("customer"),
        v.literal("retained"),
        v.literal("churned"),
      ))),
      tags: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const allContacts = await ctx.db
      .query("contacts")
      .withIndex("by_tenant_archived", (q) =>
        q.eq("tenantId", args.tenantId).eq("isArchived", false),
      )
      .collect();

    return allContacts.filter((contact) => {
      if (args.filters.countries && args.filters.countries.length > 0) {
        if (!contact.country || !args.filters.countries.includes(contact.country)) return false;
      }
      if (args.filters.cities && args.filters.cities.length > 0) {
        if (!contact.city || !args.filters.cities.includes(contact.city)) return false;
      }
      if (args.filters.stages && args.filters.stages.length > 0) {
        if (!contact.stage || !args.filters.stages.includes(contact.stage as "lead" | "prospect" | "customer" | "retained" | "churned")) return false;
      }
      if (args.filters.tags && args.filters.tags.length > 0) {
        if (!args.filters.tags.some((tag) => contact.tags.includes(tag))) return false;
      }
      return true;
    });
  },
});

export const updateStatus = internalMutation({
  args: {
    broadcastId: v.id("broadcasts"),
    status: v.union(
      v.literal("draft"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("failed"),
    ),
    recipientSnapshot: v.array(v.object({
      contactId: v.id("contacts"),
      phone: v.string(),
      name: v.optional(v.string()),
    })),
    recipientCount: v.number(),
    sentCount: v.optional(v.number()),
    failedCount: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    retryMap: v.optional(v.record(v.string(), v.number())),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {
      status: args.status,
      recipientSnapshot: args.recipientSnapshot,
      recipientCount: args.recipientCount,
    };
    if (args.sentCount !== undefined) patch.sentCount = args.sentCount;
    if (args.failedCount !== undefined) patch.failedCount = args.failedCount;
    if (args.sentAt !== undefined) patch.sentAt = args.sentAt;
    if (args.retryMap !== undefined) patch.retryMap = args.retryMap;
    await ctx.db.patch(args.broadcastId, patch);
  },
});

export const getTenantInternal = internalQuery({
  args: { tenantId: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first(),
});

// Intentionally unscoped (no tenantId check) — for use by internal batch processor only.
// The caller (processBroadcastBatch) is an internalAction and cannot be called by clients.
export const getInternal = internalQuery({
  args: { broadcastId: v.id("broadcasts") },
  handler: async (ctx, args) => ctx.db.get(args.broadcastId),
});

export const incrementSent = internalMutation({
  args: { broadcastId: v.id("broadcasts") },
  handler: async (ctx, args) => {
    const b = await ctx.db.get(args.broadcastId);
    if (!b) return;
    await ctx.db.patch(args.broadcastId, { sentCount: (b.sentCount ?? 0) + 1 });
  },
});

export const markFailed = internalMutation({
  args: { broadcastId: v.id("broadcasts") },
  handler: async (ctx, args) => {
    const b = await ctx.db.get(args.broadcastId);
    if (!b) return;
    await ctx.db.patch(args.broadcastId, { failedCount: (b.failedCount ?? 0) + 1 });
  },
});

export const incrementRetry = internalMutation({
  args: { broadcastId: v.id("broadcasts"), contactId: v.string() },
  handler: async (ctx, args) => {
    const b = await ctx.db.get(args.broadcastId);
    if (!b) return;
    const retryMap = { ...(b.retryMap ?? {}) };
    retryMap[args.contactId] = (retryMap[args.contactId] ?? 0) + 1;
    await ctx.db.patch(args.broadcastId, { retryMap });
  },
});

export const markComplete = internalMutation({
  args: { broadcastId: v.id("broadcasts") },
  handler: async (ctx, args) => {
    const b = await ctx.db.get(args.broadcastId);
    if (!b) return;
    if (b.status === "sent" || b.status === "failed") return; // already terminal — idempotent
    const status = (b.sentCount ?? 0) > 0 ? "sent" : "failed";
    await ctx.db.patch(args.broadcastId, { status, sentAt: Date.now() });
  },
});

export const getDueScheduledInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    return ctx.db
      .query("broadcasts")
      .withIndex("by_status_scheduled", (q) =>
        q.eq("status", "scheduled").lte("scheduledAt", now),
      )
      .collect();
  },
});

export const sendInternal = internalAction({
  args: { broadcastId: v.id("broadcasts") },
  handler: async (ctx, args) => {
    const broadcast = await ctx.runQuery(internal.broadcasts.getInternal, {
      broadcastId: args.broadcastId,
    });
    if (!broadcast || broadcast.status !== "scheduled") return;

    const list = await ctx.runQuery(internal.broadcasts.getListInternal, {
      listId: broadcast.listId,
      tenantId: broadcast.tenantId,
    });
    if (!list) {
      await ctx.runMutation(internal.broadcasts.updateStatus, {
        broadcastId: args.broadcastId,
        status: "failed",
        recipientSnapshot: [],
        recipientCount: 0,
      });
      return;
    }

    const contacts = await ctx.runQuery(internal.broadcasts.getContactsForList, {
      tenantId: broadcast.tenantId,
      filters: list.filters,
    });

    const recipientSnapshot = contacts.map((c) => ({
      contactId: c._id,
      phone: c.phone,
      name: c.customName ?? c.displayName,
    }));

    if (recipientSnapshot.length === 0) {
      await ctx.runMutation(internal.broadcasts.updateStatus, {
        broadcastId: args.broadcastId,
        status: "failed",
        recipientSnapshot: [],
        recipientCount: 0,
      });
      return;
    }

    await ctx.runMutation(internal.broadcasts.updateStatus, {
      broadcastId: args.broadcastId,
      status: "sending",
      recipientSnapshot,
      recipientCount: recipientSnapshot.length,
      sentCount: 0,
      failedCount: 0,
      retryMap: {},
    });

    await ctx.scheduler.runAfter(
      0,
      internal.actions.processBroadcastBatch.processBroadcastBatch,
      { broadcastId: args.broadcastId, batchIndex: 0, batchSize: 50 },
    );
  },
});

export const processScheduledBroadcastsInternal = internalAction({
  args: {},
  handler: async (ctx) => {
    const due = await ctx.runQuery(internal.broadcasts.getDueScheduledInternal, {});
    for (const broadcast of due) {
      await ctx.runAction(internal.broadcasts.sendInternal, {
        broadcastId: broadcast._id,
      });
    }
  },
});
