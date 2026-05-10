"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageBubble } from "./message-bubble";
import { LabelPicker } from "./label-picker";
import { useLocale, useTranslatedLabel, useT } from "@/lib/i18n/context";
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
  eventType?: string;
  eventData?: {
    actorName?: string;
    fromDept?: string;
    toDept?: string;
    agentName?: string;
  };
  followUpId?: string;
  followUpCreatorName?: string;
  followUpDepartmentName?: string;
  followUpDepartmentNameAr?: string;
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
  const t = useT();
  const translateLabel = useTranslatedLabel();
  const rawMessages = useQuery(api.inbox.getMessages, {
    conversationId: conversationId as Id<"conversations">,
  });

  const deleteMessageMutation = useMutation(api.messages.deleteMessage);
  const reactToMessageMutation = useMutation(api.messages.reactToMessage);
  const sendMessageMutation = useMutation(api.inbox.sendMessage);

  const { isAuthenticated } = useConvexAuth();
  const allLabels = useQuery(api.labels.list, isAuthenticated ? {} : "skip");
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
          eventType: (m as typeof m & { eventType?: string }).eventType,
          eventData: (m as typeof m & { eventData?: MessageItem["eventData"] }).eventData,
          followUpId: (m as typeof m & { followUpId?: string }).followUpId,
          followUpCreatorName: (m as typeof m & { followUpCreatorName?: string }).followUpCreatorName,
          followUpDepartmentName: (m as typeof m & { followUpDepartmentName?: string }).followUpDepartmentName,
          followUpDepartmentNameAr: (m as typeof m & { followUpDepartmentNameAr?: string }).followUpDepartmentNameAr,
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
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-[#f7f3ee] dark:bg-zinc-950">
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
      <div className="flex-1 flex items-center justify-center text-stone-400 bg-[#f7f3ee] dark:bg-zinc-950">
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
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-accent/20 text-accent-foreground"
                >
                  <span className={`size-1.5 rounded-full ${colorClass}`} />
                  {meta?.emoji ? `${meta.emoji} ` : ""}{translateLabel(name)}
                </span>
              );
            })}
          </>
        )}
      </div>
      {activeConv?.status === "forwarded" && (
        <div className="border-b border-warning/20 bg-warning/10 px-4 py-2 text-sm text-warning">
          {activeConv.forwardedToChannelName
            ? t(
                `This conversation was forwarded to ${activeConv.forwardedToChannelName}${
                  activeConv.forwardedToDepartmentName
                    ? ` / ${activeConv.forwardedToDepartmentName}`
                    : ""
                } — replies are disabled.`,
                `تم تحويل هذه المحادثة إلى ${activeConv.forwardedToChannelName}${
                  activeConv.forwardedToDepartmentName
                    ? ` / ${activeConv.forwardedToDepartmentName}`
                    : ""
                } — الردود معطلة.`
              )
            : t(
                "This conversation was forwarded to another branch — replies are disabled.",
                "تم تحويل هذه المحادثة إلى فرع آخر — الردود معطلة."
              )}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto bg-[#f7f3ee] dark:bg-zinc-950">
        <div className="p-4 space-y-4">
        {groups.map((group) => (
          <div key={group.date}>
            {/* Date divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-black/10" />
              <span className="text-[10px] font-medium text-stone-500 bg-stone-200 dark:bg-zinc-800 dark:text-zinc-400 px-3 py-1 rounded-full whitespace-nowrap">
                {group.date}
              </span>
              <div className="flex-1 h-px bg-black/10" />
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
                      | "template"
                      | "system_event",
                    isInternalNote: msg.isInternalNote,
                    authorId: msg.authorId,
                    mediaUrl: msg.mediaUrl,
                    metaMessageId: msg.metaMessageId,
                    status: msg.status,
                    timestamp: msg.timestamp,
                    quotedMessageId: msg.quotedMessageId,
                    deletedAt: msg.deletedAt,
                    reactions: msg.reactions,
                    eventType: msg.eventType as "transfer_department" | "agent_assigned" | "agent_unassigned" | "resolved" | "reopened" | undefined,
                    eventData: msg.eventData,
                    followUpId: msg.followUpId,
                    followUpCreatorName: msg.followUpCreatorName,
                    followUpDepartmentName: msg.followUpDepartmentName,
                    followUpDepartmentNameAr: msg.followUpDepartmentNameAr,
                  }}
                  quotedMessage={
                    msg.quotedMessageId
                      ? (messagesById.get(msg.quotedMessageId) ?? null) as import("./message-bubble").Message | null
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
                  onRetry={async (content) => {
                    try {
                      await sendMessageMutation({
                        conversationId: conversationId as Id<"conversations">,
                        content,
                        type: "reply",
                      });
                    } catch {
                      toast.error(locale === "en" ? "Failed to resend message" : "فشل إعادة إرسال الرسالة");
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
