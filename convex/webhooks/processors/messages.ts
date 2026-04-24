import type { GenericActionCtx } from "convex/server";
import type { DataModel } from "../../_generated/dataModel";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

type Ctx = GenericActionCtx<DataModel>;

export type MetaMessage = {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; caption?: string };
  audio?: { id: string };
  document?: { id: string; filename?: string; caption?: string };
  video?: { id: string; caption?: string };
  sticker?: { id: string };
  location?: { latitude: number; longitude: number; name?: string };
  reaction?: { message_id: string; emoji: string };
  interactive?: {
    type: "button_reply" | "list_reply";
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
  system?: { body: string; type: string; wa_id?: string };
};

type ContentType =
  | "text"
  | "image"
  | "audio"
  | "document"
  | "video"
  | "sticker"
  | "location"
  | "unsupported";

function parseMessageContent(msg: MetaMessage): {
  content: string;
  contentType: ContentType;
  mediaUrl?: string;
} {
  switch (msg.type) {
    case "text":
      return { content: msg.text?.body ?? "", contentType: "text" };
    case "image":
      return {
        content: msg.image?.caption ?? "[Image]",
        contentType: "image",
        mediaUrl: msg.image?.id,
      };
    case "audio":
      return { content: "[Voice Message]", contentType: "audio" };
    case "document":
      return {
        content: msg.document?.filename ?? msg.document?.caption ?? "[Document]",
        contentType: "document",
        mediaUrl: msg.document?.id,
      };
    case "video":
      return {
        content: msg.video?.caption ?? "[Video]",
        contentType: "video",
        mediaUrl: msg.video?.id,
      };
    case "sticker":
      return { content: "[Sticker]", contentType: "sticker" };
    case "location": {
      const loc = msg.location;
      const label = loc?.name ?? `${loc?.latitude ?? ""},${loc?.longitude ?? ""}`;
      return { content: `[Location: ${label}]`, contentType: "location" };
    }
    case "interactive": {
      const interactive = msg.interactive;
      if (interactive?.type === "button_reply") {
        return { content: interactive.button_reply?.title ?? "[Button Reply]", contentType: "text" };
      }
      if (interactive?.type === "list_reply") {
        return { content: interactive.list_reply?.title ?? "[List Reply]", contentType: "text" };
      }
      return { content: "[Interactive]", contentType: "unsupported" };
    }
    case "system":
      return { content: msg.system?.body ?? "[System Message]", contentType: "unsupported" };
    default:
      return { content: "[Unsupported message type]", contentType: "unsupported" };
  }
}

export async function processMessages(
  ctx: Ctx,
  channel: { _id: Id<"channels">; tenantId: string },
  messages: MetaMessage[],
  contactsFromPayload: { profile: { name: string }; wa_id: string }[],
): Promise<void> {
  for (const msg of messages) {
    // Incoming reactions — handled separately, no conversation message created
    if (msg.type === "reaction") {
      const reaction = msg.reaction;
      if (reaction) {
        await ctx.runMutation(internal.messages.handleIncomingReaction, {
          tenantId: channel.tenantId,
          metaMessageId: reaction.message_id,
          reactorPhone: msg.from,
          emoji: reaction.emoji ?? "",
        });
      }
      continue;
    }

    const { content, contentType, mediaUrl } = parseMessageContent(msg);
    const senderName = contactsFromPayload?.[0]?.profile?.name;

    // CSAT response check — single digit 1–5 before creating a conversation message
    if (/^[1-5]$/.test(content.trim()) && contentType === "text") {
      const isCsat: boolean = await ctx.runMutation(internal.csat.checkAndRecordResponse, {
        tenantId: channel.tenantId,
        senderPhone: msg.from,
        content: content.trim(),
        channelId: channel._id,
      });
      if (isCsat) continue;
    }

    const result: {
      messageId: Id<"messages">;
      conversationId: Id<"conversations">;
      isNewConversation: boolean;
      isDuplicate: boolean;
    } = await ctx.runMutation(internal.messages.createInbound, {
      tenantId: channel.tenantId,
      channelId: channel._id,
      metaMessageId: msg.id,
      senderPhone: msg.from,
      wabaId: channel._id as unknown as string,
      content,
      contentType,
      mediaUrl,
      timestamp: Number(msg.timestamp) * 1000,
      senderDisplayName: senderName,
    });

    if (result.isDuplicate) continue;

    if (result.isNewConversation) {
      const conversation = await ctx.runQuery(internal.conversations.getInternal, {
        conversationId: result.conversationId,
      });

      if (conversation?.departmentId) {
        const department = await ctx.runQuery(internal.departments.getInternal, {
          departmentId: conversation.departmentId,
        });
        if (department?.assignmentMode === "round_robin") {
          await ctx.runAction(internal.actions.roundRobin.assignRoundRobin, {
            tenantId: channel.tenantId,
            channelId: channel._id,
            departmentId: conversation.departmentId,
            conversationId: result.conversationId,
          });
        }
      }
    }

    await ctx.runMutation(internal.automations.evaluateAndFireAutomations, {
      tenantId: channel.tenantId,
      channelId: channel._id,
      conversationId: result.conversationId,
      messageContent: content,
      isNewConversation: result.isNewConversation,
    });
  }
}
