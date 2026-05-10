import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { computeContentHash, findDuplicateOutbound } from "../../lib/echoDeduplication";
import type { Id } from "../../_generated/dataModel";

type ContentType =
  | "text" | "image" | "audio" | "document" | "video" | "sticker" | "location" | "unsupported";

type EchoPayload = {
  type: string;
  text?: { body: string };
  image?: { id: string; caption?: string };
  audio?: { id: string };
  document?: { id: string; filename?: string; caption?: string };
  video?: { id: string; caption?: string };
  sticker?: { id: string };
};

function parseEchoContent(echo: EchoPayload): {
  content: string;
  contentType: ContentType;
  metaMediaId?: string;
} {
  switch (echo.type) {
    case "text":
      return { content: echo.text?.body ?? "", contentType: "text" };
    case "image":
      return { content: echo.image?.caption ?? "", contentType: "image", metaMediaId: echo.image?.id };
    case "audio":
      return { content: "", contentType: "audio", metaMediaId: echo.audio?.id };
    case "document":
      return {
        content: echo.document?.filename ?? echo.document?.caption ?? "",
        contentType: "document",
        metaMediaId: echo.document?.id,
      };
    case "video":
      return { content: echo.video?.caption ?? "", contentType: "video", metaMediaId: echo.video?.id };
    case "sticker":
      return { content: "", contentType: "sticker", metaMediaId: echo.sticker?.id };
    default:
      return { content: "[Unsupported]", contentType: "unsupported" };
  }
}

/** Full echo processor for smb_message_echoes webhook field (WhatsApp Coexistence).
 * 3-level dedup: primary by wamid → secondary by content hash → tertiary insert as mobile.
 */
export const processEcho = internalMutation({
  args: {
    tenantId: v.string(),
    channelId: v.id("channels"),
    echo: v.object({
      id: v.string(),
      from: v.string(),
      to: v.optional(v.string()),
      timestamp: v.string(),
      type: v.string(),
      text: v.optional(v.object({ body: v.string() })),
      image: v.optional(v.object({ id: v.string(), caption: v.optional(v.string()) })),
      audio: v.optional(v.object({ id: v.string() })),
      document: v.optional(v.object({
        id: v.string(),
        filename: v.optional(v.string()),
        caption: v.optional(v.string()),
      })),
      video: v.optional(v.object({ id: v.string(), caption: v.optional(v.string()) })),
      sticker: v.optional(v.object({ id: v.string() })),
    }),
    wabaId: v.string(),
  },
  handler: async (ctx, args) => {
    const { echo, tenantId, channelId } = args;

    // ── Kill switch ───────────────────────────────────────────────────────────
    const channel = await ctx.db.get(channelId);
    if (!channel || channel.tenantId !== tenantId) {
      console.warn(JSON.stringify({ tag: "[WEBHOOK_ECHO]", event: "channel_not_found", tenantId, channelId }));
      return { processed: false, reason: "channel_not_found" };
    }
    if (channel.coexistenceEnabled === false) {
      console.log(JSON.stringify({ tag: "[WEBHOOK_ECHO]", event: "kill_switch_active", tenantId }));
      return { processed: false, reason: "kill_switch" };
    }

    const wamid = echo.id;
    const customerPhone = echo.to;

    if (!customerPhone) {
      console.warn(JSON.stringify({ tag: "[WEBHOOK_ECHO]", event: "missing_to_field", tenantId, wamid }));
      return { processed: false, reason: "missing_to_field" };
    }

    // ── Level 1: Primary dedup by wamid ───────────────────────────────────────
    const existingByWamid = await ctx.db
      .query("messages")
      .withIndex("by_meta_message_id", (q) => q.eq("metaMessageId", wamid))
      .first();
    if (existingByWamid) {
      console.log(JSON.stringify({
        tag: "[WEBHOOK_ECHO]", event: "dedup_primary_hit",
        tenantId, wamid, existingSource: existingByWamid.source,
      }));
      return { processed: false, reason: "duplicate_wamid" };
    }

    const { content, contentType, metaMediaId } = parseEchoContent(echo);
    const timestamp = Number(echo.timestamp) * 1000;

    // ── Find / ensure contact ─────────────────────────────────────────────────
    const existingContact = await ctx.db
      .query("contacts")
      .withIndex("by_tenant_phone", (q) => q.eq("tenantId", tenantId).eq("phone", customerPhone))
      .first();

    const contactId: Id<"contacts"> = existingContact
      ? existingContact._id
      : await ctx.runMutation(internal.contacts.upsertByPhone, {
          tenantId,
          phone: customerPhone,
          displayName: undefined,
          wabaId: args.wabaId,
        });

    // ── Find conversation ─────────────────────────────────────────────────────
    let conversation = await ctx.db
      .query("conversations")
      .withIndex("by_tenant_channel", (q) =>
        q.eq("tenantId", tenantId).eq("channelId", channelId),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("contactId"), contactId),
          q.neq(q.field("status"), "resolved"),
        ),
      )
      .first();

    if (!conversation) {
      conversation = await ctx.db
        .query("conversations")
        .withIndex("by_contact", (q) => q.eq("contactId", contactId))
        .filter((q) => q.eq(q.field("channelId"), channelId))
        .first();
    }

    // ── Level 2: Secondary dedup by content hash ──────────────────────────────
    if (conversation) {
      const duplicateId = await findDuplicateOutbound(ctx, {
        conversationId: conversation._id,
        content,
        contentType,
        echoTimestamp: timestamp,
      });
      if (duplicateId) {
        await ctx.db.patch(duplicateId, { metaMessageId: wamid });
        console.log(JSON.stringify({
          tag: "[WEBHOOK_ECHO]", event: "dedup_secondary_hit",
          tenantId, wamid, matchedMessageId: duplicateId,
        }));
        return { processed: true, action: "patched_wamid" };
      }
    }

    // ── Level 3: Genuine mobile message — insert ──────────────────────────────
    let conversationId: Id<"conversations">;
    let isNewConversation = false;

    if (!conversation) {
      conversationId = await ctx.db.insert("conversations", {
        tenantId,
        channelId,
        contactId,
        status: "open",
        labels: [],
        lastMessageAt: timestamp,
        lastMessagePreview: content.slice(0, 100),
        unreadCount: 0,  // outbound echo — never increment unread
        createdAt: timestamp,
      });
      isNewConversation = true;
    } else {
      conversationId = conversation._id;

      // Update conversation preview — do NOT reopen resolved, do NOT increment unreadCount
      const patch: Record<string, unknown> = {
        lastMessageAt: timestamp,
        lastMessagePreview: content.slice(0, 100),
      };
      // Mobile reply clears SLA the same way an agent reply does
      if (conversation.slaBreachedAt !== undefined) {
        patch.slaBreachedAt = undefined;
      }
      await ctx.db.patch(conversationId, patch);
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId,
      tenantId,
      direction: "outbound",
      content,
      contentType,
      isInternalNote: false,
      authorId: echo.from,
      source: "mobile",
      metaMessageId: wamid,
      ...(metaMediaId ? { mediaUrl: metaMediaId, metaMediaId } : {}),
      status: "sent",
      timestamp,
      createdAt: Date.now(),
    });

    if (metaMediaId) {
      await ctx.scheduler.runAfter(0, internal.actions.resolveMedia.resolveInboundMedia, {
        messageId,
        mediaId: metaMediaId,
        channelId,
        tenantId,
      });
    }

    console.log(JSON.stringify({
      tag: "[WEBHOOK_ECHO]", event: "mobile_message_inserted",
      tenantId, wamid, contentType, isNewConversation,
    }));
    return { processed: true, action: "inserted_mobile" };
  },
});
