import { v } from "convex/values";
import { query, mutation, internalMutation, internalAction, internalQuery } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
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
    // Precise dispatch: fire at the exact scheduled time. The 30-minute cron
    // remains as a fallback for missed runs (deploys, restarts, etc.).
    await ctx.scheduler.runAt(args.scheduledAt, internal.followUps.processSingle, {
      followUpId,
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
    metaMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const followUp = await ctx.db.get(args.followUpId);
    if (!followUp) return;

    const contact = await ctx.db.get(followUp.contactId);
    const contactName = contact?.displayName ?? contact?.phone ?? "Customer";

    if (args.success) {
      const sentAt = Date.now();
      await ctx.db.patch(args.followUpId, {
        status: "sent",
        sentAt,
      });
      // Also record the outbound message in the inbox conversation so the
      // agent sees what was sent (and the customer's reply lands on the same
      // thread). A contact can have multiple conversations on the same
      // channel (e.g. one per department) — pick the most recently active
      // so the follow-up lands where the agent is currently working with
      // this customer, not the oldest stale thread.
      const candidateConversations = await ctx.db
        .query("conversations")
        .withIndex("by_contact", (q) => q.eq("contactId", followUp.contactId))
        .collect();
      let conversation = candidateConversations
        .filter(
          (c) =>
            c.tenantId === followUp.tenantId &&
            c.channelId === followUp.channelId,
        )
        .sort((a, b) => b.lastMessageAt - a.lastMessageAt)[0];

      const preview = followUp.whatsappMessage.slice(0, 100);
      let conversationId;
      if (!conversation) {
        conversationId = await ctx.db.insert("conversations", {
          tenantId: followUp.tenantId,
          channelId: followUp.channelId,
          contactId: followUp.contactId,
          status: "open",
          labels: [],
          lastMessageAt: sentAt,
          lastMessagePreview: preview,
          unreadCount: 0,
          createdAt: sentAt,
          assignedAgentId: followUp.assignedTo,
          hasFollowUp: true,
        });
        await ctx.db.patch(followUp.contactId, {
          totalConversations: (contact?.totalConversations ?? 0) + 1,
        });
      } else {
        conversationId = conversation._id;
        const patch: Record<string, unknown> = {
          lastMessageAt: sentAt,
          lastMessagePreview: preview,
          hasFollowUp: true,
        };
        // Reopen resolved conversations on a new outbound message — same
        // behaviour as inbound webhook handling.
        if (conversation.status === "resolved") {
          patch.status = "open";
          patch.slaBreachedAt = undefined;
        }
        await ctx.db.patch(conversation._id, patch);
      }

      // Resolve creator + department metadata once at insert time and
      // denormalize onto the message. The UI doesn't need to do any joins
      // and a creator's name doesn't change retroactively for a sent
      // message — so this is both faster and more debuggable than enriching
      // at query time.
      const creatorUserId = followUp.assignedTo ?? followUp.createdBy;
      let creatorDepartmentId;
      let followUpCreatorName: string | undefined;
      let followUpDepartmentName: string | undefined;
      let followUpDepartmentNameAr: string | undefined;
      if (creatorUserId) {
        const membership = await ctx.db
          .query("departmentMembers")
          .withIndex("by_tenant_user", (q) =>
            q.eq("tenantId", followUp.tenantId).eq("userId", creatorUserId),
          )
          .first();
        creatorDepartmentId = membership?.departmentId;
        followUpCreatorName = membership?.userName;
        if (creatorDepartmentId) {
          const dept = await ctx.db.get(creatorDepartmentId);
          if (dept) {
            followUpDepartmentName = dept.name;
            followUpDepartmentNameAr =
              dept.nameAr && dept.nameAr.length > 0 ? dept.nameAr : undefined;
          }
        }
      }

      await ctx.db.insert("messages", {
        conversationId,
        tenantId: followUp.tenantId,
        direction: "outbound",
        content: followUp.whatsappMessage,
        contentType: "text",
        isInternalNote: false,
        authorId: creatorUserId,
        source: "api",
        status: "sent",
        timestamp: sentAt,
        createdAt: sentAt,
        followUpId: args.followUpId,
        ...(creatorDepartmentId ? { creatorDepartmentId } : {}),
        ...(followUpCreatorName ? { followUpCreatorName } : {}),
        ...(followUpDepartmentName ? { followUpDepartmentName } : {}),
        ...(followUpDepartmentNameAr ? { followUpDepartmentNameAr } : {}),
        ...(args.metaMessageId ? { metaMessageId: args.metaMessageId } : {}),
      });

      await ctx.runMutation(internal.contactEvents.internalCreate, {
        tenantId: followUp.tenantId,
        contactId: followUp.contactId,
        type: "followup_sent",
        actorId: undefined,
        metadata: { followUpId: args.followUpId },
      });
      if (followUp.assignedTo) {
        await ctx.runMutation(internal.notifications.notifyDispatch, {
          tenantId: followUp.tenantId,
          userId: followUp.assignedTo,
          eventType: "followup_due",
          referenceId: conversationId as unknown as string,
          contactName,
          message: `تم إرسال المتابعة إلى ${contactName}`,
          emailVariables: {
            contactName,
            status: "sent",
          },
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
          // Resolve the most recent conversation for this contact on this
          // channel so the notification deep-links back to a real thread
          // (clicking the bell row should open the inbox, not /contacts).
          const candidates = await ctx.db
            .query("conversations")
            .withIndex("by_contact", (q) => q.eq("contactId", followUp.contactId))
            .collect();
          const latestConvId = candidates
            .filter(
              (c) =>
                c.tenantId === followUp.tenantId &&
                c.channelId === followUp.channelId,
            )
            .sort((a, b) => b.lastMessageAt - a.lastMessageAt)[0]?._id;
          await ctx.runMutation(internal.notifications.notifyDispatch, {
            tenantId: followUp.tenantId,
            userId: followUp.assignedTo,
            eventType: "followup_due",
            referenceId: (latestConvId as unknown as string) ?? (args.followUpId as unknown as string),
            contactName,
            message: `فشل إرسال المتابعة إلى ${contactName} بعد ${MAX_ATTEMPTS} محاولات`,
            emailVariables: {
              contactName,
              status: "failed",
            },
          });
        }
      } else {
        await ctx.db.patch(args.followUpId, { attemptCount: newAttemptCount });
      }
    }
  },
});

// ── Internal queries ─────────────────────────────────────────────────────────

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

export const _getById = internalQuery({
  args: { followUpId: v.id("followUps") },
  handler: async (ctx, args) => ctx.db.get(args.followUpId),
});

// ── Send a single follow-up (shared by processSingle and processDue) ─────────

async function dispatchOne(
  ctx: ActionCtx,
  followUp: Doc<"followUps">,
): Promise<void> {
  const channel = await ctx.runQuery(internal.channels.getById, {
    channelId: followUp.channelId,
  });

  if (!channel) {
    console.warn(`[FOLLOWUP] No channel for followUp ${followUp._id}`);
    await ctx.runMutation(internal.followUps.recordFollowUpResult, {
      followUpId: followUp._id,
      success: false,
    });
    return;
  }

  // Prefer the platform System User token (same path the inbox uses in
  // sendWhatsAppMessage). The channel-stored access token from Embedded
  // Signup is used only as a fallback — it can expire independently while
  // the system user token keeps working, which is what made follow-ups
  // silently fail while quick replies kept sending.
  let accessToken: string;
  let usedChannelToken = false;
  const envToken = process.env.META_SYSTEM_USER_TOKEN ?? process.env.WHATSAPP_API_TOKEN;
  if (envToken) {
    accessToken = envToken;
  } else if (channel.accessToken) {
    try {
      accessToken = await decrypt(channel.accessToken);
      usedChannelToken = true;
    } catch {
      console.warn(`[FOLLOWUP] Failed to decrypt token for channel ${channel._id}`);
      await ctx.runMutation(internal.followUps.recordFollowUpResult, {
        followUpId: followUp._id,
        success: false,
      });
      return;
    }
  } else {
    console.warn(`[FOLLOWUP] No token available for followUp ${followUp._id}`);
    await ctx.runMutation(internal.followUps.recordFollowUpResult, {
      followUpId: followUp._id,
      success: false,
    });
    return;
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
    let metaMessageId: string | undefined;
    if (success) {
      try {
        const data = (await res.json()) as { messages?: { id?: string }[] };
        metaMessageId = data.messages?.[0]?.id;
      } catch {
        // Successful status with unparseable body — proceed without an ID.
      }
    } else {
      const errText = await res.text();
      console.warn(`[FOLLOWUP] Meta API error for ${followUp._id}: ${errText}`);
      const metaErrorCode = parseMetaErrorCode(errText);
      // Code 190 = OAuthException (invalid/expired access token). Only treat
      // this as a channel-level problem when we actually used the channel's
      // own token; if we used the platform env token, the channel itself is
      // fine and the env token is the thing that's broken.
      if (metaErrorCode === 190 && usedChannelToken) {
        await ctx.runMutation(internal.channels.markReconnectRequiredInternal, {
          channelId: followUp.channelId,
        });
        await notifyTokenExpired(ctx, followUp);
      }
    }

    await ctx.runMutation(internal.followUps.recordFollowUpResult, {
      followUpId: followUp._id,
      success,
      metaMessageId,
    });
  } catch (err) {
    console.warn(`[FOLLOWUP] Fetch error for ${followUp._id}:`, err);
    await ctx.runMutation(internal.followUps.recordFollowUpResult, {
      followUpId: followUp._id,
      success: false,
    });
  }
}

function parseMetaErrorCode(errText: string): number | null {
  try {
    const parsed = JSON.parse(errText) as { error?: { code?: number } };
    return typeof parsed.error?.code === "number" ? parsed.error.code : null;
  } catch {
    return null;
  }
}

async function notifyTokenExpired(
  ctx: ActionCtx,
  followUp: Doc<"followUps">,
): Promise<void> {
  const recipients = new Set<string>();
  if (followUp.createdBy) recipients.add(followUp.createdBy);
  if (followUp.assignedTo) recipients.add(followUp.assignedTo);
  for (const userId of recipients) {
    await ctx.runMutation(internal.notifications.internalCreate, {
      tenantId: followUp.tenantId,
      userId,
      type: "channel_token_expired",
      referenceId: followUp.channelId as unknown as string,
      message:
        "انتهت صلاحية ربط واتساب لهذه القناة — يرجى إعادة الربط لاستئناف إرسال المتابعات.",
    });
  }
}

// ── Internal actions ─────────────────────────────────────────────────────────

export const processSingle = internalAction({
  args: { followUpId: v.id("followUps") },
  handler: async (ctx, args) => {
    const followUp = await ctx.runQuery(internal.followUps._getById, {
      followUpId: args.followUpId,
    });
    // Cancelled/sent/failed in the interval between scheduling and firing →
    // nothing to do. Status check is the cancellation mechanism (we don't
    // try to cancel the scheduled function itself).
    if (!followUp || followUp.status !== "pending") return;
    if (followUp.scheduledAt > Date.now()) return;
    await dispatchOne(ctx, followUp);
  },
});

export const processDue = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const pending = await ctx.runQuery(internal.followUps._listDue, { now });
    for (const followUp of pending) {
      await dispatchOne(ctx, followUp);
    }
  },
});
