// convex/broadcastTemplates.ts
import { v } from "convex/values";
import { query, mutation, action, internalQuery, internalMutation, internalAction } from "./_generated/server";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getCallerIdentity, getCallerRole, assertAdminOrSupervisor } from "./lib/auth";
import {
  assertBroadcastTemplateLimitNotReached,
  getBroadcastTemplateLimit,
  type Plan,
} from "./lib/planLimits";

const META_BASE = "https://graph.facebook.com/v25.0";

function extractVariables(body: string): string[] {
  const matches = body.matchAll(/\{\{(\w+)\}\}/g);
  return [...new Set([...matches].map((m) => m[1].toLowerCase()))];
}

// ── Public query ──────────────────────────────────────────────────────────────

export const list = query({
  args: { metaStatus: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);

    if (args.metaStatus) {
      return ctx.db
        .query("broadcastTemplates")
        .withIndex("by_tenant_status", (q) =>
          q.eq("tenantId", tenantId).eq("metaStatus", args.metaStatus as "draft" | "pending" | "approved" | "rejected" | "paused"),
        )
        .order("desc")
        .collect();
    }

    return ctx.db
      .query("broadcastTemplates")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .order("desc")
      .collect();
  },
});

export const getLimitInfo = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const plan: Plan = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId });
    const all = await ctx.db
      .query("broadcastTemplates")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
    return { count: all.length, limit: getBroadcastTemplateLimit(plan), plan };
  },
});

// ── Public mutations ──────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    channelId: v.id("channels"),
    name: v.string(),
    title: v.string(),
    language: v.string(),
    category: v.union(v.literal("MARKETING"), v.literal("UTILITY")),
    headerType: v.union(
      v.literal("NONE"), v.literal("TEXT"),
      v.literal("IMAGE"), v.literal("VIDEO"), v.literal("DOCUMENT"),
    ),
    headerText: v.optional(v.string()),
    headerMediaUrl: v.optional(v.string()),
    body: v.string(),
    footer: v.optional(v.string()),
    buttons: v.optional(v.array(v.object({
      type: v.union(v.literal("URL"), v.literal("PHONE_NUMBER"), v.literal("QUICK_REPLY")),
      text: v.string(),
      value: v.string(),
      isDynamic: v.optional(v.boolean()),
    }))),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as Parameters<typeof assertAdminOrSupervisor>[0]);

    // Verify channel belongs to tenant
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== tenantId) throw new ConvexError("CHANNEL_NOT_FOUND");

    const plan: Plan = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId });
    const existing = await ctx.db
      .query("broadcastTemplates")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
    assertBroadcastTemplateLimitNotReached(existing.length, plan);

    return ctx.db.insert("broadcastTemplates", {
      tenantId,
      channelId: args.channelId,
      name: args.name,
      title: args.title,
      language: args.language,
      category: args.category,
      headerType: args.headerType,
      headerText: args.headerText,
      headerMediaUrl: args.headerMediaUrl,
      body: args.body,
      variables: extractVariables(args.body),
      footer: args.footer,
      buttons: args.buttons,
      metaStatus: "draft",
      createdBy: callerId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("broadcastTemplates"),
    channelId: v.optional(v.id("channels")),
    name: v.optional(v.string()),
    title: v.optional(v.string()),
    language: v.optional(v.string()),
    category: v.optional(v.union(v.literal("MARKETING"), v.literal("UTILITY"))),
    headerType: v.optional(v.union(
      v.literal("NONE"), v.literal("TEXT"),
      v.literal("IMAGE"), v.literal("VIDEO"), v.literal("DOCUMENT"),
    )),
    headerText: v.optional(v.string()),
    headerMediaUrl: v.optional(v.string()),
    body: v.optional(v.string()),
    footer: v.optional(v.string()),
    buttons: v.optional(v.array(v.object({
      type: v.union(v.literal("URL"), v.literal("PHONE_NUMBER"), v.literal("QUICK_REPLY")),
      text: v.string(),
      value: v.string(),
      isDynamic: v.optional(v.boolean()),
    }))),
  },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as Parameters<typeof assertAdminOrSupervisor>[0]);

    const tpl = await ctx.db.get(args.id);
    if (!tpl || tpl.tenantId !== tenantId) throw new ConvexError("NOT_FOUND");
    if (tpl.metaStatus === "pending" || tpl.metaStatus === "approved") {
      throw new ConvexError("TEMPLATE_LOCKED");
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.channelId !== undefined) patch.channelId = args.channelId;
    if (args.name !== undefined) patch.name = args.name;
    if (args.title !== undefined) patch.title = args.title;
    if (args.language !== undefined) patch.language = args.language;
    if (args.category !== undefined) patch.category = args.category;
    if (args.headerType !== undefined) patch.headerType = args.headerType;
    if (args.headerText !== undefined) patch.headerText = args.headerText;
    if (args.headerMediaUrl !== undefined) patch.headerMediaUrl = args.headerMediaUrl;
    if (args.footer !== undefined) patch.footer = args.footer;
    if (args.buttons !== undefined) patch.buttons = args.buttons;
    if (args.body !== undefined) {
      patch.body = args.body;
      patch.variables = extractVariables(args.body);
    }

    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("broadcastTemplates") },
  handler: async (ctx, args) => {
    const { tenantId, orgRole } = await getCallerIdentity(ctx);
    assertAdminOrSupervisor(orgRole as Parameters<typeof assertAdminOrSupervisor>[0]);

    const tpl = await ctx.db.get(args.id);
    if (!tpl || tpl.tenantId !== tenantId) throw new ConvexError("NOT_FOUND");
    if (tpl.metaStatus === "pending" || tpl.metaStatus === "approved") {
      throw new ConvexError("TEMPLATE_LOCKED");
    }

    await ctx.db.delete(args.id);
  },
});

// ── Internal helpers ──────────────────────────────────────────────────────────

export const getTemplateInternal = internalQuery({
  args: { id: v.id("broadcastTemplates"), tenantId: v.string() },
  handler: async (ctx, args) => {
    const tpl = await ctx.db.get(args.id);
    if (!tpl || tpl.tenantId !== args.tenantId) return null;
    return tpl;
  },
});

export const getChannelInternal = internalQuery({
  args: { channelId: v.id("channels"), tenantId: v.string() },
  handler: async (ctx, args) => {
    const ch = await ctx.db.get(args.channelId);
    if (!ch || ch.tenantId !== args.tenantId) return null;
    return ch;
  },
});

export const getTemplateByIdInternal = internalQuery({
  args: { id: v.id("broadcastTemplates") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const patchStatusInternal = internalMutation({
  args: {
    id: v.id("broadcastTemplates"),
    metaStatus: v.union(
      v.literal("draft"), v.literal("pending"), v.literal("approved"),
      v.literal("rejected"), v.literal("paused"),
    ),
    metaTemplateId: v.optional(v.string()),
    metaRejectionReason: v.optional(v.string()),
    metaSubmittedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {
      metaStatus: args.metaStatus,
      updatedAt: Date.now(),
    };
    if (args.metaTemplateId !== undefined) patch.metaTemplateId = args.metaTemplateId;
    if (args.metaRejectionReason !== undefined) patch.metaRejectionReason = args.metaRejectionReason;
    if (args.metaSubmittedAt !== undefined) patch.metaSubmittedAt = args.metaSubmittedAt;
    await ctx.db.patch(args.id, patch);
  },
});

export const listPendingInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("broadcastTemplates")
      .filter((q) => q.eq(q.field("metaStatus"), "pending"))
      .collect();
  },
});

// ── Helper: build Meta API components ─────────────────────────────────────────

function buildMetaComponents(tpl: {
  headerType: string;
  headerText?: string;
  body: string;
  variables: string[];
  footer?: string;
  buttons?: Array<{
    type: string;
    text: string;
    value: string;
    isDynamic?: boolean;
  }>;
}): unknown[] {
  const components: unknown[] = [];

  // Header
  if (tpl.headerType !== "NONE") {
    if (tpl.headerType === "TEXT") {
      components.push({ type: "HEADER", format: "TEXT", text: tpl.headerText ?? "" });
    } else {
      components.push({ type: "HEADER", format: tpl.headerType });
    }
  }

  // Body — map named {{variable}} to positional {{1}}, {{2}} …
  let metaBody = tpl.body;
  const varExamples: string[] = [];
  tpl.variables.forEach((varName, idx) => {
    metaBody = metaBody.replaceAll(`{{${varName}}}`, `{{${idx + 1}}}`);
    varExamples.push(`example_${varName}`);
  });
  const bodyComp: Record<string, unknown> = { type: "BODY", text: metaBody };
  if (varExamples.length > 0) {
    bodyComp.example = { body_text: [varExamples] };
  }
  components.push(bodyComp);

  // Footer
  if (tpl.footer) {
    components.push({ type: "FOOTER", text: tpl.footer });
  }

  // Buttons
  if (tpl.buttons && tpl.buttons.length > 0) {
    const metaButtons = tpl.buttons.map((btn) => {
      if (btn.type === "URL") {
        const url = btn.isDynamic ? `${btn.value}{{1}}` : btn.value;
        const btnObj: Record<string, unknown> = { type: "URL", text: btn.text, url };
        if (btn.isDynamic) btnObj.example = ["example-suffix"];
        return btnObj;
      }
      if (btn.type === "PHONE_NUMBER") {
        return { type: "PHONE_NUMBER", text: btn.text, phone_number: btn.value };
      }
      return { type: "QUICK_REPLY", text: btn.text };
    });
    components.push({ type: "BUTTONS", buttons: metaButtons });
  }

  return components;
}

// ── submit action ─────────────────────────────────────────────────────────────

export const submit = action({
  args: { id: v.id("broadcastTemplates") },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdminOrSupervisor(role);

    const identity = await ctx.auth.getUserIdentity();
    const tenantId = identity!.orgId as string;

    const tpl = await ctx.runQuery(internal.broadcastTemplates.getTemplateInternal, {
      id: args.id,
      tenantId,
    });
    if (!tpl) throw new ConvexError("NOT_FOUND");
    if (tpl.metaStatus !== "draft" && tpl.metaStatus !== "rejected") {
      throw new ConvexError("TEMPLATE_LOCKED");
    }

    const channel = await ctx.runQuery(internal.broadcastTemplates.getChannelInternal, {
      channelId: tpl.channelId,
      tenantId,
    });
    if (!channel) throw new ConvexError("CHANNEL_NOT_FOUND");

    const { decrypt } = await import("./lib/encryption");
    const token = channel.accessToken ? await decrypt(channel.accessToken) : null;
    if (!token) throw new ConvexError("CHANNEL_TOKEN_MISSING");

    const components = buildMetaComponents(tpl);

    const res = await fetch(`${META_BASE}/${channel.wabaId}/message_templates`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: tpl.name,
        language: tpl.language,
        category: tpl.category,
        components,
      }),
    });

    const data = await res.json() as { id?: string; error?: { message: string } };

    if (!res.ok || data.error) {
      const errMsg = data.error?.message ?? `HTTP ${res.status}`;
      throw new ConvexError(`Meta API error: ${errMsg}`);
    }

    await ctx.runMutation(internal.broadcastTemplates.patchStatusInternal, {
      id: args.id,
      metaStatus: "pending",
      metaTemplateId: data.id,
      metaSubmittedAt: Date.now(),
    });

    return { success: true };
  },
});

// ── syncStatus action ─────────────────────────────────────────────────────────

export const syncStatus = action({
  args: { id: v.id("broadcastTemplates") },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdminOrSupervisor(role);

    const identity = await ctx.auth.getUserIdentity();
    const tenantId = identity!.orgId as string;

    const tpl = await ctx.runQuery(internal.broadcastTemplates.getTemplateInternal, {
      id: args.id,
      tenantId,
    });
    if (!tpl || tpl.metaStatus !== "pending") return;

    await ctx.runAction(internal.broadcastTemplates.syncStatusInternal, { id: args.id });
  },
});

export const syncStatusInternal = internalAction({
  args: { id: v.id("broadcastTemplates") },
  handler: async (ctx, args) => {
    const tpl = await ctx.runQuery(internal.broadcastTemplates.getTemplateByIdInternal, {
      id: args.id,
    });
    if (!tpl || tpl.metaStatus !== "pending") return;

    const channel = await ctx.runQuery(internal.broadcastTemplates.getChannelInternal, {
      channelId: tpl.channelId,
      tenantId: tpl.tenantId,
    });
    if (!channel) return;

    const { decrypt } = await import("./lib/encryption");
    const token = channel.accessToken ? await decrypt(channel.accessToken) : null;
    if (!token) return;

    const res = await fetch(
      `${META_BASE}/${channel.wabaId}/message_templates?name=${encodeURIComponent(tpl.name)}&fields=status,rejected_reason`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) return;

    const data = await res.json() as {
      data?: Array<{ status: string; rejected_reason?: string }>;
    };
    const entry = data.data?.[0];
    if (!entry) return;

    const newStatus = entry.status.toLowerCase() as "approved" | "rejected" | "paused" | "pending";
    if (newStatus === tpl.metaStatus) return;

    await ctx.runMutation(internal.broadcastTemplates.patchStatusInternal, {
      id: args.id,
      metaStatus: newStatus,
      metaRejectionReason: entry.rejected_reason,
    });

    // Notify creator on approval
    if (newStatus === "approved") {
      await ctx.runMutation(internal.notifications.internalCreate, {
        tenantId: tpl.tenantId,
        userId: tpl.createdBy,
        referenceId: tpl._id,
        message: `Template "${tpl.title}" was approved by Meta and is ready to use in Broadcasts.`,
      });
    }
  },
});

// ── Cron handler ──────────────────────────────────────────────────────────────

export const syncAllPendingInternal = internalAction({
  args: {},
  handler: async (ctx) => {
    const pending = await ctx.runQuery(internal.broadcastTemplates.listPendingInternal, {});
    for (const tpl of pending) {
      await ctx.runAction(internal.broadcastTemplates.syncStatusInternal, { id: tpl._id });
    }
  },
});
