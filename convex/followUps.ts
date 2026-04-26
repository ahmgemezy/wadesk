import { v } from "convex/values";
import { query, mutation, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCallerIdentity } from "./lib/auth";
import { decrypt } from "./lib/encryption";

const MAX_ATTEMPTS = 2;

// ── Queries ───────────────────────────────────────────────────────────────────

export const listByContact = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.tenantId !== tenantId) return [];
    return ctx.db
      .query("followUps")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .order("desc")
      .collect();
  },
});

export const listPending = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);
    const all = await ctx.db
      .query("followUps")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "pending"),
      )
      .order("asc")
      .collect();

    if (orgRole === "org:agent") {
      return all.filter((f) => f.assignedTo === callerId);
    }
    return all;
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    contactId: v.id("contacts"),
    channelId: v.id("channels"),
    scheduledAt: v.number(),
    note: v.optional(v.string()),
    whatsappMessage: v.string(),
    expectedRevenue: v.optional(v.number()),
    currency: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.tenantId !== tenantId) {
      throw new Error("Contact not found");
    }
    const followUpId = await ctx.db.insert("followUps", {
      tenantId,
      contactId: args.contactId,
      channelId: args.channelId,
      phoneNumber: contact.phone,
      scheduledAt: args.scheduledAt,
      note: args.note,
      whatsappMessage: args.whatsappMessage,
      expectedRevenue: args.expectedRevenue,
      currency: args.currency,
      status: "pending",
      attemptCount: 0,
      createdBy: callerId,
      assignedTo: args.assignedTo ?? callerId,
      createdAt: Date.now(),
    });
    await ctx.runMutation(internal.contactEvents.internalCreate, {
      tenantId,
      contactId: args.contactId,
      type: "followup_scheduled",
      actorId: callerId,
      metadata: {
        scheduledAt: args.scheduledAt,
        assignedTo: args.assignedTo ?? callerId,
        expectedRevenue: args.expectedRevenue,
        currency: args.currency,
      },
    });
    return followUpId;
  },
});

export const cancel = mutation({
  args: { followUpId: v.id("followUps") },
  handler: async (ctx, args) => {
    const { tenantId } = await getCallerIdentity(ctx);
    const followUp = await ctx.db.get(args.followUpId);
    if (!followUp || followUp.tenantId !== tenantId) {
      throw new Error("Follow-up not found");
    }
    if (followUp.status !== "pending") {
      throw new Error("Can only cancel pending follow-ups");
    }
    await ctx.db.patch(args.followUpId, { status: "cancelled" });
  },
});

// ── Internal: record result after send attempt ────────────────────────────────

export const recordFollowUpResult = internalMutation({
  args: {
    followUpId: v.id("followUps"),
    success: v.boolean(),
  },
  handler: async (ctx, args) => {
    const followUp = await ctx.db.get(args.followUpId);
    if (!followUp) return;

    const contact = await ctx.db.get(followUp.contactId);
    const contactName = contact?.displayName ?? contact?.phone ?? "Customer";

    if (args.success) {
      await ctx.db.patch(args.followUpId, {
        status: "sent",
        sentAt: Date.now(),
      });
      await ctx.runMutation(internal.contactEvents.internalCreate, {
        tenantId: followUp.tenantId,
        contactId: followUp.contactId,
        type: "followup_sent",
        actorId: undefined,
        metadata: { followUpId: args.followUpId },
      });
      if (followUp.assignedTo) {
        await ctx.runMutation(internal.notifications.internalCreate, {
          tenantId: followUp.tenantId,
          userId: followUp.assignedTo,
          type: "followup_due",
          referenceId: args.followUpId,
          contactName,
          message: `تم إرسال المتابعة إلى ${contactName}`,
        });
      }
    } else {
      const newAttemptCount = followUp.attemptCount + 1;
      if (newAttemptCount >= MAX_ATTEMPTS) {
        await ctx.db.patch(args.followUpId, {
          status: "failed",
          attemptCount: newAttemptCount,
        });
        if (contact) {
          await ctx.db.patch(followUp.contactId, {
            stage: "churned",
            stageUpdatedAt: Date.now(),
          });
        }
        await ctx.runMutation(internal.contactEvents.internalCreate, {
          tenantId: followUp.tenantId,
          contactId: followUp.contactId,
          type: "followup_failed",
          actorId: undefined,
          metadata: {
            expectedRevenue: followUp.expectedRevenue,
            currency: followUp.currency,
            attempts: newAttemptCount,
          },
        });
        await ctx.runMutation(internal.contactEvents.internalCreate, {
          tenantId: followUp.tenantId,
          contactId: followUp.contactId,
          type: "lost",
          actorId: undefined,
          metadata: {
            expectedRevenue: followUp.expectedRevenue,
            currency: followUp.currency,
          },
        });
        if (followUp.assignedTo) {
          await ctx.runMutation(internal.notifications.internalCreate, {
            tenantId: followUp.tenantId,
            userId: followUp.assignedTo,
            type: "followup_due",
            referenceId: args.followUpId,
            contactName,
            message: `فشل إرسال المتابعة إلى ${contactName} بعد ${MAX_ATTEMPTS} محاولات`,
          });
        }
      } else {
        await ctx.db.patch(args.followUpId, { attemptCount: newAttemptCount });
      }
    }
  },
});

// ── Internal query: fetch due follow-ups ──────────────────────────────────────

export const _listDue = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("followUps")
      .withIndex("by_scheduled", (q) => q.lte("scheduledAt", args.now))
      .collect();
    return pending.filter((f) => f.status === "pending");
  },
});

// ── Internal action: process due follow-ups (called by cron) ─────────────────

export const processDue = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const pending: Awaited<ReturnType<typeof ctx.runQuery<typeof internal.followUps._listDue>>> =
      await ctx.runQuery(internal.followUps._listDue, { now });

    for (const followUp of pending) {
      const channel = await ctx.runQuery(internal.channels.getById, {
        channelId: followUp.channelId,
      });

      if (!channel || !channel.accessToken) {
        console.warn(`[FOLLOWUP] No channel/token for followUp ${followUp._id}`);
        await ctx.runMutation(internal.followUps.recordFollowUpResult, {
          followUpId: followUp._id,
          success: false,
        });
        continue;
      }

      let accessToken: string;
      try {
        accessToken = await decrypt(channel.accessToken);
      } catch {
        console.warn(`[FOLLOWUP] Failed to decrypt token for channel ${channel._id}`);
        await ctx.runMutation(internal.followUps.recordFollowUpResult, {
          followUpId: followUp._id,
          success: false,
        });
        continue;
      }

      const apiVersion = process.env.WHATSAPP_API_VERSION ?? "v25.0";
      const url = `https://graph.facebook.com/${apiVersion}/${channel.phoneNumberId}/messages`;

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: followUp.phoneNumber,
            type: "text",
            text: { body: followUp.whatsappMessage },
          }),
        });

        const success = res.ok;
        if (!success) {
          const errText = await res.text();
          console.warn(`[FOLLOWUP] Meta API error for ${followUp._id}: ${errText}`);
        }

        await ctx.runMutation(internal.followUps.recordFollowUpResult, {
          followUpId: followUp._id,
          success,
        });
      } catch (err) {
        console.warn(`[FOLLOWUP] Fetch error for ${followUp._id}:`, err);
        await ctx.runMutation(internal.followUps.recordFollowUpResult, {
          followUpId: followUp._id,
          success: false,
        });
      }
    }
  },
});
