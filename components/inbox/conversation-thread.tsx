"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "./message-bubble";

export function ConversationThread({
  conversationId,
}: {
  conversationId: string;
}) {
  const messages = useQuery(api.messages.listForConversation, {
    conversationId: conversationId as Id<"conversations">,
  });
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
            className={`h-12 rounded-lg bg-muted animate-pulse ${
              i % 2 === 0 ? "w-3/4" : "w-1/2 ms-auto"
            }`}
          />
        ))}
      </div>
    );
  }

  if (messages === null || (Array.isArray(messages) && "error" in (messages as object))) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
        <p>خطأ في تحميل الرسائل / Error loading messages</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          إعادة المحاولة / Retry
        </Button>
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

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-3">
        {messages.map((msg) => (
          <MessageBubble key={msg._id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
