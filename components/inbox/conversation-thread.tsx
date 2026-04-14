"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageBubble } from "./message-bubble";
import { LabelPicker } from "./label-picker";
import { useLocale, useTranslatedLabel } from "@/lib/i18n/context";
import { toast } from "sonner";

type MessageItem = {
  _id: string;
  direction: "inbound" | "outbound";
  content: string;
  contentType?: string;
  isInternalNote: boolean;
  authorId: string | undefined;
  mediaUrl?: string;
  metaMessageId?: string;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  timestamp: number;
  quotedMessageId?: string;
  deletedAt?: number;
  reactions?: { emoji: string; reactorId: string }[];
};

function formatDateLabel(timestamp: number, locale: "ar" | "en"): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return locale === "en" ? "Today" : "اليوم";
  if (isSameDay(date, yesterday)) return locale === "en" ? "Yesterday" : "أمس";

  return date.toLocaleDateString(locale === "en" ? "en-US" : "ar-EG", {
    day: "numeric",
    month: "long",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function groupByDate(
  messages: MessageItem[],
  locale: "ar" | "en",
): { date: string; items: MessageItem[] }[] {
  const groups: { date: string; items: MessageItem[] }[] = [];
  for (const msg of messages) {
    const label = formatDateLabel(msg.timestamp, locale);
    const last = groups[groups.length - 1];
    if (last && last.date === label) {
      last.items.push(msg);
    } else {
      groups.push({ date: label, items: [msg] });
    }
  }
  return groups;
}

type ReplyTo = {
  messageId: string;
  content: string;
  authorLabel: string;
} | null;

export function ConversationThread({
  conversationId,
  replyTo,
  onSetReplyTo,
}: {
  conversationId: string;
  replyTo?: ReplyTo;
  onSetReplyTo?: (reply: ReplyTo) => void;
}) {
  const locale = useLocale();
  const translateLabel = useTranslatedLabel();
  const rawMessages = useQuery(api.inbox.getMessages, {
    conversationId: conversationId as Id<"conversations">,
  });

  const deleteMessageMutation = useMutation(api.messages.deleteMessage);
  const reactToMessageMutation = useMutation(api.messages.reactToMessage);

  const { isAuthenticated } = useConvexAuth();
  const allLabels = useQuery(api.labels.list, isAuthenticated ? undefined : "skip");
  const activeConv = useQuery(
    api.inbox.getConversation,
    isAuthenticated ? { conversationId: conversationId as Id<"conversations"> } : "skip"
  );
  const activeLabels: string[] = activeConv?.labels ?? [];

  const COLOR_MAP: Record<string, string> = {
    red: "bg-red-500",
    green: "bg-green-500",
    blue: "bg-blue-500",
    yellow: "bg-yellow-400",
    purple: "bg-purple-500",
    orange: "bg-orange-500",
    pink: "bg-pink-500",
    gray: "bg-gray-400",
  };

  const messages: MessageItem[] | undefined =
    rawMessages === undefined
      ? undefined
      : rawMessages.map((m) => ({
          _id: m._id as string,
          direction: m.direction as "inbound" | "outbound",
          content: m.content,
          contentType: m.contentType as string,
          isInternalNote: m.isInternalNote,
          authorId: m.authorId,
          mediaUrl: m.mediaUrl,
          metaMessageId: m.metaMessageId,
          status: m.status as "sending" | "sent" | "delivered" | "read" | "failed",
          timestamp: m.timestamp,
          quotedMessageId: m.quotedMessageId as string | undefined,
          deletedAt: m.deletedAt as number | undefined,
          reactions: m.reactions as { emoji: string; reactorId: string }[] | undefined,
        }));

  const messagesById = new Map(
    (messages ?? []).map((m) => [m._id, m]),
  );

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages === undefined) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
          >
            <Skeleton
              className={`h-12 rounded-lg ${i % 2 === 0 ? "w-3/4" : "w-1/2"}`}
            />
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        {locale === "en" ? "No messages yet" : "لا توجد رسائل بعد"}
      </div>
    );
  }

  const groups = groupByDate(messages, locale);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b flex-wrap min-h-9">
        {rawMessages !== undefined && (
          <>
            <LabelPicker
              conversationId={conversationId}
              activeLabels={activeLabels}
            />
            {activeLabels.map((name) => {
              const meta = (allLabels ?? []).find((l) => l.name === name);
              const colorClass = meta ? (COLOR_MAP[meta.color] ?? "bg-gray-400") : "bg-gray-400";
              return (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-muted"
                >
                  <span className={`size-1.5 rounded-full ${colorClass}`} />
                  {meta?.emoji ? `${meta.emoji} ` : ""}{translateLabel(name)}
                </span>
              );
            })}
          </>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 space-y-4">
        {groups.map((group) => (
          <div key={group.date}>
            {/* Date divider */}
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-muted-foreground px-2 whitespace-nowrap">
                {group.date}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Messages for this date */}
            <div className="space-y-3">
              {group.items.map((msg) => (
                <MessageBubble
                  key={msg._id}
                  message={{
                    _id: msg._id,
                    direction: msg.direction,
                    content: msg.content,
                    contentType: (msg.contentType ?? "text") as
                      | "text"
                      | "image"
                      | "document"
                      | "unsupported"
                      | "audio"
                      | "video"
                      | "sticker"
                      | "location"
                      | "template",
                    isInternalNote: msg.isInternalNote,
                    authorId: msg.authorId,
                    mediaUrl: msg.mediaUrl,
                    metaMessageId: msg.metaMessageId,
                    status: msg.status === "sending" ? "sent" : msg.status,
                    timestamp: msg.timestamp,
                    quotedMessageId: msg.quotedMessageId,
                    deletedAt: msg.deletedAt,
                    reactions: msg.reactions,
                  }}
                  quotedMessage={
                    msg.quotedMessageId
                      ? (messagesById.get(msg.quotedMessageId) as any ?? null)
                      : null
                  }
                  onReply={(m) =>
                    onSetReplyTo?.({
                      messageId: m._id,
                      content: m.content.slice(0, 100),
                      authorLabel:
                        m.direction === "outbound"
                          ? locale === "en" ? "You" : "أنت"
                          : locale === "en" ? "Customer" : "العميل",
                    })
                  }
                  onDelete={async (messageId) => {
                    try {
                      await deleteMessageMutation({ messageId: messageId as Id<"messages"> });
                    } catch {
                      toast.error(locale === "en" ? "Failed to delete message" : "فشل حذف الرسالة");
                    }
                  }}
                  onReact={async (messageId, emoji) => {
                    try {
                      await reactToMessageMutation({ messageId: messageId as Id<"messages">, emoji });
                    } catch {
                      toast.error(locale === "en" ? "Failed to react" : "فشل التفاعل");
                    }
                  }}
                />
              ))}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      </div>
    </div>
  );
}
