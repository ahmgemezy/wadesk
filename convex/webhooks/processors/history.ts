import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

type ContentType =
  | "text" | "image" | "audio" | "document" | "video" | "sticker" | "location" | "unsupported";

type HistoryMessage = {
  id: string;
  from: string;
  to?: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; caption?: string };
  audio?: { id: string };
  document?: { id: string; filename?: string; caption?: string };
  video?: { id: string; caption?: string };
  sticker?: { id: string };
};

function parseHistoryContent(msg: HistoryMessage): {
  content: string;
  contentType: ContentType;
  metaMediaId?: string;
} {
  switch (msg.type) {
    case "text":
      return { content: msg.text?.body ?? "", contentType: "text" };
    case "image":
      return { content: msg.image?.caption ?? "[Image]", contentType: "image", metaMediaId: msg.image?.id };
    case "audio":
      return { content: "[Voice Message]", contentType: "audio", metaMediaId: msg.audio?.id };
    case "document":
      return {
        content: msg.document?.filename ?? msg.document?.caption ?? "[Document]",
        contentType: "document",
        metaMediaId: msg.document?.id,
      };
    case "video":
      return { content: msg.video?.caption ?? "[Video]", contentType: "video", metaMediaId: msg.video?.id };
    case "sticker":
      return { content: "[Sticker]", contentType: "sticker", metaMediaId: msg.sticker?.id };
    default:
      return { content: "[Unsupported]", contentType: "unsupported" };
  }
}

/** Attempts to extract message-like objects from a history change's new_value. */
function extractMessages(change: unknown): HistoryMessage[] {
  if (!change || typeof change !== "object") return [];
  const c = change as Record<string, unknown>;
  const nv = c.new_value;

  const isMessage = (item: unknown): item is HistoryMessage =>
    !!item &&
    typeof item === "object" &&
    typeof (item as Record<string, unknown>).id === "string" &&
    typeof (item as Record<string, unknown>).from === "string" &&
    typeof (item as Record<string, unknown>).timestamp === "string" &&
    typeof (item as Record<string, unknown>).type === "string";

  if (Array.isArray(nv)) return nv.filter(isMessage);
  if (isMessage(nv)) return [nv];
  return [];
}

/** Processor for history webhook field (WhatsApp Coexistence).
 * Backfills historical messages from the mobile app, tagged source="mobile", deduped by wamid.
 * v1 (Stage 4): Handles message-type changes only; other change types are logged and skipped.
 */
export const processHistory = internalMutation({
  args: {
    tenantId: v.string(),
    channelId: v.id("channels"),
    changes: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.tenantId !== args.tenantId) {
      console.warn(JSON.stringify({ tag: "[WEBHOOK_HISTORY]", event: "channel_not_found", tenantId: args.tenantId }));
      return { processed: false, reason: "channel_not_found" };
    }

    let insertedCount = 0;
    let skippedDuplicateCount = 0;
    let skippedUnknownCount = 0;

    for (const change of args.changes) {
      const messages = extractMessages(change);

      if (messages.length === 0) {
        skippedUnknownCount++;
        console.log(JSON.stringify({
          tag: "[WEBHOOK_HISTORY]", event: "unhandled_change",
          tenantId: args.tenantId, changeField: (change as Record<string, unknown>)?.field,
        }));
        continue;
      }

      for (const msg of messages) {
        // Dedup by wamid
        const existing = await ctx.db
          .query("messages")
          .withIndex("by_meta_message_id", (q) => q.eq("metaMessageId", msg.id))
          .first();
        if (existing) {
          skippedDuplicateCount++;
          continue;
        }

        // Determine direction: outbound if sent from business phone, inbound if from customer
        const isOutbound = msg.from === channel.displayPhone;
        const direction: "outbound" | "inbound" = isOutbound ? "outbound" : "inbound";
        const customerPhone = isOutbound ? msg.to : msg.from;

        if (!customerPhone) {
          skippedUnknownCount++;
          continue;
        }

        // Find / ensure contact
        const existingContact = await ctx.db
          .query("contacts")
          .withIndex("by_tenant_phone", (q) =>
            q.eq("tenantId", args.tenantId).eq("phone", customerPhone),
          )
          .first();

        const contactId: Id<"contacts"> = existingContact
          ? existingContact._id
          : await ctx.runMutation(internal.contacts.upsertByPhone, {
              tenantId: args.tenantId,
              phone: customerPhone,
              displayName: undefined,
              wabaId: channel.wabaId,
            });

        // Find conversation — history messages attach to an existing conversation only
        const conversation = await ctx.db
          .query("conversations")
          .withIndex("by_contact", (q) => q.eq("contactId", contactId))
          .filter((q) => q.eq(q.field("channelId"), args.channelId))
          .first();

        if (!conversation) {
          skippedUnknownCount++;
          continue;
        }

        const { content, contentType, metaMediaId } = parseHistoryContent(msg);
        const timestamp = Number(msg.timestamp) * 1000;
        const messageSource: "customer" | "mobile" = isOutbound ? "mobile" : "customer";

        await ctx.db.insert("messages", {
          conversationId: conversation._id,
          tenantId: args.tenantId,
          direction,
          content,
          contentType,
          isInternalNote: false,
          authorId: msg.from,
          source: messageSource,
          metaMessageId: msg.id,
          ...(metaMediaId ? { metaMediaId } : {}),
          status: "sent",
          timestamp,
          createdAt: Date.now(),
        });

        insertedCount++;
      }
    }

    console.log(JSON.stringify({
      tag: "[WEBHOOK_HISTORY]", event: "backfill_complete",
      tenantId: args.tenantId, insertedCount, skippedDuplicateCount, skippedUnknownCount,
    }));
    return { processed: true, insertedCount, skippedDuplicateCount };
  },
});
