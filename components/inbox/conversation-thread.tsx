"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageBubble } from "./message-bubble";

type MessageItem = {
  _id: string;
  direction: "inbound" | "outbound";
  content: string;
  contentType?: string;
  isInternalNote: boolean;
  authorId: string | undefined;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  timestamp: number;
};

function formatDateLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return "اليوم / Today";
  if (isSameDay(date, yesterday)) return "أمس / Yesterday";

  return date.toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "long",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function groupByDate(
  messages: MessageItem[],
): { date: string; items: MessageItem[] }[] {
  const groups: { date: string; items: MessageItem[] }[] = [];
  for (const msg of messages) {
    const label = formatDateLabel(msg.timestamp);
    const last = groups[groups.length - 1];
    if (last && last.date === label) {
      last.items.push(msg);
    } else {
      groups.push({ date: label, items: [msg] });
    }
  }
  return groups;
}

export function ConversationThread({
  conversationId,
}: {
  conversationId: string;
}) {
  const rawMessages = useQuery(api.inbox.getMessages, {
    conversationId: conversationId as Id<"conversations">,
  });

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
          status: m.status as "sending" | "sent" | "delivered" | "read" | "failed",
          timestamp: m.timestamp,
        }));

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages === undefined) {
    return (
      <div className="flex-1 p-4 space-y-4">
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
        لا توجد رسائل بعد / No messages yet
      </div>
    );
  }

  const groups = groupByDate(messages);

  return (
    <ScrollArea className="flex-1">
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
                    status: msg.status === "sending" ? "sent" : msg.status,
                    timestamp: msg.timestamp,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
