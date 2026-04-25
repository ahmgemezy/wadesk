import { v, ConvexError } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id, Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { getCallerIdentity, assertAdminOrSupervisor, assertAdmin, type OrgRole } from "./lib/auth";
import { assertAutomationRuleLimitNotReached } from "./lib/planLimits";
import type { Plan } from "./lib/planLimits";
import {
  interpolateTemplate,
  isOutsideBusinessHours,
  type BusinessHoursSchedule,
} from "../lib/automationHelpers";

export const listRules = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as OrgRole);
    return ctx.db
      .query("automationRules")
      .withIndex("by_tenant_priority", (q) => q.eq("tenantId", tenantId))
      .collect();
  },
});

export const getBusinessHours = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as OrgRole);
    const doc = await ctx.db
      .query("businessHours")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .first();
    if (!doc) return null;
    return { timezone: doc.timezone, schedule: doc.schedule as BusinessHoursSchedule };
  },
});

export const createRule = mutation({
  args: {
    name: v.string(),
    triggerType: v.union(
      v.literal("keyword"),
      v.literal("outside_hours"),
      v.literal("first_message"),
      v.literal("no_reply_timeout"),
    ),
    keywordList: v.optional(v.array(v.string())),
    timeoutMinutes: v.optional(v.number()),
    responseTemplate: v.string(),
    senderName: v.optional(v.string()),
    mediaUrl: v.optional(v.string()),
    mediaType: v.optional(v.union(
      v.literal("image"),
      v.literal("video"),
      v.literal("document"),
    )),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as OrgRole);

    if (!args.name.trim()) throw new ConvexError("NAME_REQUIRED");
    if (args.name.length > 100) throw new ConvexError("NAME_TOO_LONG");
    if (!args.responseTemplate.trim()) throw new ConvexError("TEMPLATE_REQUIRED");
    if (args.responseTemplate.length > 1000) throw new ConvexError("TEMPLATE_TOO_LONG");

    if (
      args.triggerType === "keyword" &&
      (!args.keywordList || args.keywordList.length === 0)
    ) {
      throw new ConvexError("KEYWORD_LIST_REQUIRED");
    }

    if (
      args.triggerType === "no_reply_timeout" &&
      (!args.timeoutMinutes || args.timeoutMinutes < 1 || args.timeoutMinutes > 1440)
    ) {
      throw new ConvexError("TIMEOUT_MINUTES_REQUIRED");
    }

    if (args.triggerType === "outside_hours") {
      const bh = await ctx.db
        .query("businessHours")
        .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
        .first();
      if (!bh) throw new ConvexError("BUSINESS_HOURS_REQUIRED");
    }

    const plan: Plan = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId });
    const existingRules = await ctx.db
      .query("automationRules")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
    assertAutomationRuleLimitNotReached(existingRules.length, plan);

    const maxPriority = existingRules.reduce(
      (max, r) => Math.max(max, r.priority),
      -1,
    );

    return ctx.db.insert("automationRules", {
      tenantId,
      name: args.name.trim(),
      enabled: true,
      priority: maxPriority + 1,
      triggerType: args.triggerType,
      keywordList: args.keywordList,
      timeoutMinutes: args.timeoutMinutes,
      responseTemplate: args.responseTemplate.trim(),
      senderName: args.senderName?.trim() || undefined,
      mediaUrl: args.mediaUrl?.trim() || undefined,
      mediaType: args.mediaType,
      createdBy: callerId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateRule = mutation({
  args: {
    ruleId: v.id("automationRules"),
    name: v.optional(v.string()),
    triggerType: v.optional(
      v.union(
        v.literal("keyword"),
        v.literal("outside_hours"),
        v.literal("first_message"),
        v.literal("no_reply_timeout"),
      ),
    ),
    keywordList: v.optional(v.array(v.string())),
    timeoutMinutes: v.optional(v.number()),
    responseTemplate: v.optional(v.string()),
    senderName: v.optional(v.string()),
    mediaUrl: v.optional(v.string()),
    mediaType: v.optional(v.union(
      v.literal("image"),
      v.literal("video"),
      v.literal("document"),
    )),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as OrgRole);

    const rule = await ctx.db.get(args.ruleId);
    if (!rule || rule.tenantId !== tenantId) throw new ConvexError("NOT_FOUND");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name.trim();
    if (args.triggerType !== undefined) patch.triggerType = args.triggerType;
    if (args.keywordList !== undefined) patch.keywordList = args.keywordList;
    if (args.timeoutMinutes !== undefined) patch.timeoutMinutes = args.timeoutMinutes;
    if (args.responseTemplate !== undefined)
      patch.responseTemplate = args.responseTemplate.trim();
    if (args.senderName !== undefined)
      patch.senderName = args.senderName.trim() || undefined;
    if (args.mediaUrl !== undefined)
      patch.mediaUrl = args.mediaUrl.trim() || undefined;
    if (args.mediaType !== undefined) patch.mediaType = args.mediaType;

    await ctx.db.patch(args.ruleId, patch);
  },
});

export const deleteRule = mutation({
  args: { ruleId: v.id("automationRules") },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as OrgRole);

    const rule = await ctx.db.get(args.ruleId);
    if (!rule || rule.tenantId !== tenantId) throw new ConvexError("NOT_FOUND");

    await ctx.db.delete(args.ruleId);

    const remaining = await ctx.db
      .query("automationRules")
      .withIndex("by_tenant_priority", (q) => q.eq("tenantId", tenantId))
      .collect();

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].priority !== i) {
        await ctx.db.patch(remaining[i]._id, { priority: i });
      }
    }
  },
});

export const toggleRule = mutation({
  args: {
    ruleId: v.id("automationRules"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as OrgRole);

    const rule = await ctx.db.get(args.ruleId);
    if (!rule || rule.tenantId !== tenantId) throw new ConvexError("NOT_FOUND");

    await ctx.db.patch(args.ruleId, {
      enabled: args.enabled,
      updatedAt: Date.now(),
    });
  },
});

export const reorderRules = mutation({
  args: { orderedIds: v.array(v.id("automationRules")) },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as OrgRole);

    const existing = await ctx.db
      .query("automationRules")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    const existingIds = new Set(existing.map((r) => r._id));
    const orderedSet = new Set(args.orderedIds);

    if (
      existingIds.size !== orderedSet.size ||
      [...existingIds].some((id) => !orderedSet.has(id))
    ) {
      throw new ConvexError("INVALID_ORDER");
    }

    for (let i = 0; i < args.orderedIds.length; i++) {
      await ctx.db.patch(args.orderedIds[i], { priority: i });
    }
  },
});

export const syncOrgName = mutation({
  args: { orgName: v.string() },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { orgName: args.orgName });
    }
  },
});

export const saveBusinessHours = mutation({
  args: {
    timezone: v.string(),
    schedule: v.any(),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdmin(orgRole as OrgRole);

    if (!args.timezone.trim()) throw new ConvexError("INVALID_TIMEZONE");

    try {
      Intl.DateTimeFormat(undefined, { timeZone: args.timezone });
    } catch {
      throw new ConvexError("INVALID_TIMEZONE");
    }

    const existing = await ctx.db
      .query("businessHours")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        timezone: args.timezone,
        schedule: args.schedule,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("businessHours", {
        tenantId,
        timezone: args.timezone,
        schedule: args.schedule,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

async function fireAutomatedReply(
  ctx: MutationCtx,
  args: {
    rule: Doc<"automationRules">;
    conversation: Doc<"conversations">;
    channel: Doc<"channels">;
    contact: Doc<"contacts">;
    businessName: string;
  },
): Promise<void> {
  const contactName =
    args.contact.customName ?? args.contact.displayName ?? "عزيزي العميل";

  const bh = await ctx.db
    .query("businessHours")
    .withIndex("by_tenant", (q) => q.eq("tenantId", args.rule.tenantId))
    .first();
  const timezone = bh?.timezone ?? "Asia/Riyadh";

  // Use saved org name if available, fall back to channel display name
  const tenant = await ctx.db
    .query("tenants")
    .withIndex("by_tenantId", (q) => q.eq("tenantId", args.rule.tenantId))
    .first();
  const businessName = tenant?.orgName ?? args.businessName;

  // Use rule's senderName if set, otherwise fall back to org name or default
  const agentName = args.rule.senderName ?? businessName ?? "فريق الدعم";

  const resolved = interpolateTemplate(args.rule.responseTemplate, {
    customer_name: contactName,
    business_name: businessName,
    agent_name: agentName,
    current_time: new Date().toLocaleTimeString("ar-EG", { timeZone: timezone }),
  });

  const now = Date.now();

  const messageId = await ctx.db.insert("messages", {
    conversationId: args.conversation._id,
    tenantId: args.rule.tenantId,
    direction: "outbound",
    content: resolved,
    contentType: "text",
    isInternalNote: false,
    authorId: "automation",
    status: "sending",
    timestamp: now,
    createdAt: now,
  });

  await ctx.db.patch(args.conversation._id, {
    lastMessageAt: now,
    lastMessagePreview: resolved.slice(0, 100),
  });

  await ctx.scheduler.runAfter(
    0,
    internal.actions.sendWhatsAppMessage.sendMessage,
    {
      messageId,
      phoneNumberId: args.channel.phoneNumberId,
      contactPhone: args.contact.phone,
      content: resolved,
      tenantId: args.rule.tenantId,
    },
  );

  await ctx.db.insert("ruleFireLog", {
    tenantId: args.rule.tenantId,
    ruleId: args.rule._id,
    conversationId: args.conversation._id,
    firedAt: now,
    triggerType: args.rule.triggerType,
  });
}

export const evaluateAndFireAutomations = internalMutation({
  args: {
    tenantId: v.string(),
    channelId: v.id("channels"),
    conversationId: v.id("conversations"),
    messageContent: v.string(),
    isNewConversation: v.boolean(),
  },
  handler: async (ctx, args) => {
    const lastOutbound = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("desc")
      .filter((q) =>
        q.and(
          q.eq(q.field("direction"), "outbound"),
          q.eq(q.field("isInternalNote"), false),
        ),
      )
      .first();

    if (
      lastOutbound &&
      lastOutbound.authorId != null &&
      lastOutbound.authorId !== "automation"
    ) {
      const lastInbound = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", args.conversationId),
        )
        .order("desc")
        .filter((q) => q.eq(q.field("direction"), "inbound"))
        .first();

      if (lastInbound && lastOutbound.createdAt > lastInbound.createdAt) {
        return;
      }
    }

    const rules = await ctx.db
      .query("automationRules")
      .withIndex("by_tenant_priority", (q) =>
        q.eq("tenantId", args.tenantId),
      )
      .filter((q) => q.eq(q.field("enabled"), true))
      .collect();

    if (rules.length === 0) return;

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return;

    const contact = await ctx.db.get(conversation.contactId);
    if (!contact) return;

    const channel = await ctx.db.get(args.channelId);
    if (!channel) return;

    const businessHours = await ctx.db
      .query("businessHours")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .first();

    for (const rule of rules) {
      let matched = false;

      switch (rule.triggerType) {
        case "keyword": {
          if (rule.keywordList && rule.keywordList.length > 0) {
            const lowerContent = args.messageContent.toLowerCase();
            matched = rule.keywordList.some((kw) =>
              lowerContent.includes(kw.toLowerCase()),
            );
          }
          break;
        }
        case "outside_hours": {
          if (businessHours) {
            matched = isOutsideBusinessHours(
              businessHours.schedule as BusinessHoursSchedule,
              businessHours.timezone,
            );
          }
          break;
        }
        case "first_message": {
          if (
            args.isNewConversation &&
            (contact.totalConversations ?? 0) <= 1
          ) {
            matched = true;
          }
          break;
        }
        case "no_reply_timeout": {
          break;
        }
      }

      if (matched) {
        await fireAutomatedReply(ctx, {
          rule,
          conversation,
          channel,
          contact,
          businessName: channel.displayName,
        });
        return;
      }
    }
  },
});

export const checkNoReplyTimeouts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const tenants = await ctx.db.query("tenants").collect();

    for (const tenant of tenants) {
      const rules = await ctx.db
        .query("automationRules")
        .withIndex("by_tenant_enabled", (q) =>
          q.eq("tenantId", tenant.tenantId).eq("enabled", true),
        )
        .filter((q) => q.eq(q.field("triggerType"), "no_reply_timeout"))
        .collect();

      for (const rule of rules) {
        if (!rule.timeoutMinutes) continue;
        const threshold = now - rule.timeoutMinutes * 60000;

        const conversations = await ctx.db
          .query("conversations")
          .withIndex("by_tenant_status", (q) =>
            q.eq("tenantId", tenant.tenantId).eq("status", "open"),
          )
          .collect();

        for (const conversation of conversations) {
          if (!conversation.assignedAgentId) continue;

          const msgs = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) =>
              q.eq("conversationId", conversation._id),
            )
            .order("desc")
            .take(50);

          let lastInboundAt: number | null = null;
          let agentReplied = false;

          for (const msg of msgs) {
            if (msg.direction === "inbound") {
              lastInboundAt = msg.timestamp;
              break;
            }
            if (
              msg.direction === "outbound" &&
              !msg.isInternalNote &&
              msg.authorId != null &&
              msg.authorId !== "automation"
            ) {
              agentReplied = true;
              break;
            }
          }

          if (!lastInboundAt || agentReplied || lastInboundAt > threshold)
            continue;

          const existingLog = await ctx.db
            .query("ruleFireLog")
            .withIndex("by_rule_conversation", (q) =>
              q.eq("ruleId", rule._id).eq("conversationId", conversation._id),
            )
            .first();

          if (existingLog && existingLog.firedAt > threshold) continue;

          const contact = await ctx.db.get(conversation.contactId);
          if (!contact) continue;

          const channel = await ctx.db.get(conversation.channelId);
          if (!channel) continue;

          await fireAutomatedReply(ctx, {
            rule,
            conversation,
            channel,
            contact,
            businessName: channel.displayName,
          });
        }
      }
    }
  },
});
