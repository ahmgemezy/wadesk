import { v } from "convex/values";
import { query, mutation, action, internalQuery, internalMutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import {
  getCallerIdentity,
  getCallerRole,
  assertAdminOrSupervisor,
} from "./lib/auth";
import { assertBroadcastsAllowed } from "./lib/planLimits";
import type { Doc } from "./_generated/dataModel";

const META_BASE = "https://graph.facebook.com/v21.0";

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
    return ctx.db.insert("broadcasts", {
      tenantId,
      name: args.name,
      listId: args.listId,
      channelId: args.channelId,
      templateName: args.templateName,
      templateLanguage: args.templateLanguage,
      status: "draft",
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "UNAUTHORIZED" });
    if (!identity.orgId) throw new ConvexError({ message: "NO_ORG" });
    const tenantId = identity.orgId as string;

    const broadcast: Doc<"broadcasts"> | null = await ctx.runQuery(internal.broadcasts.getByIdInternal, {
      broadcastId: args.broadcastId,
      tenantId,
    });
    if (!broadcast) throw new ConvexError({ message: "Broadcast not found" });
    if (broadcast.status !== "draft") {
      throw new ConvexError({ message: "Broadcast already sent or in progress" });
    }

    const channel: Doc<"channels"> | null = await ctx.runQuery(internal.broadcasts.getChannelInternal, {
      channelId: broadcast.channelId,
      tenantId,
    });
    if (!channel) throw new ConvexError({ message: "Channel not found" });

    const list: Doc<"contactLists"> | null = await ctx.runQuery(internal.broadcasts.getListInternal, {
      listId: broadcast.listId,
      tenantId,
    });
    if (!list) throw new ConvexError({ message: "List not found" });

    const allContacts: Doc<"contacts">[] = await ctx.runQuery(
      internal.broadcasts.getContactsForList,
      { tenantId, filters: list.filters },
    );

    const recipientSnapshot = allContacts.map((c) => c._id);

    await ctx.runMutation(internal.broadcasts.updateStatus, {
      broadcastId: args.broadcastId,
      status: "sending",
      recipientSnapshot,
      recipientCount: recipientSnapshot.length,
    });

    const token = process.env.META_SYSTEM_USER_TOKEN;
    if (!token) throw new ConvexError({ message: "META_SYSTEM_USER_TOKEN not set" });

    let sentCount = 0;
    let failedCount = 0;

    for (const contact of allContacts) {
      try {
        const res = await fetch(
          `${META_BASE}/${channel.phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: contact.phone,
              type: "template",
              template: {
                name: broadcast.templateName,
                language: { code: broadcast.templateLanguage },
              },
            }),
          },
        );

        if (res.ok) {
          sentCount++;
        } else {
          failedCount++;
        }
      } catch {
        failedCount++;
      }
    }

    await ctx.runMutation(internal.broadcasts.updateStatus, {
      broadcastId: args.broadcastId,
      status: failedCount === allContacts.length && allContacts.length > 0
        ? "failed"
        : "sent",
      recipientSnapshot,
      recipientCount: recipientSnapshot.length,
      sentCount,
      failedCount,
      sentAt: Date.now(),
    });
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
    recipientSnapshot: v.array(v.id("contacts")),
    recipientCount: v.number(),
    sentCount: v.optional(v.number()),
    failedCount: v.optional(v.number()),
    sentAt: v.optional(v.number()),
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
    await ctx.db.patch(args.broadcastId, patch);
  },
});
