"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function MessageInput({
  conversationId,
  onQuickReplyOpen,
  quickReplyContent,
  onQuickReplyConsumed,
}: {
  conversationId: string;
  onQuickReplyOpen?: () => void;
  quickReplyContent?: string;
  onQuickReplyConsumed?: () => void;
}) {
  const [content, setContent] = useState("");
  const [isNote, setIsNote] = useState(false);

  const sendMessage = useMutation(api.inbox.sendMessage).withOptimisticUpdate(
    (localStore, args) => {
      const existing = localStore.getQuery(api.inbox.getMessages, {
        conversationId: args.conversationId,
      });
      if (existing !== undefined) {
        const now = Date.now();
        localStore.setQuery(
          api.inbox.getMessages,
          { conversationId: args.conversationId },
          [
            ...existing,
            {
              _id: ("optimistic_" + now) as Id<"messages">,
              _creationTime: now,
              conversationId: args.conversationId,
              tenantId: "",
              direction: "outbound" as const,
              content: args.content,
              contentType: "text" as const,
              isInternalNote: args.type === "note",
              authorId: undefined,
              status: "sending" as const,
              timestamp: now,
              createdAt: now,
            },
          ],
        );
      }
    },
  );

  useEffect(() => {
    if (quickReplyContent) {
      setContent(quickReplyContent);
      onQuickReplyConsumed?.();
    }
  }, [quickReplyContent, onQuickReplyConsumed]);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    const trimmed = content.trim();
    setContent("");

    try {
      await sendMessage({
        conversationId: conversationId as Id<"conversations">,
        content: trimmed,
        type: isNote ? "note" : "reply",
      });
    } catch {
      setContent(trimmed); // restore on error
      toast.error(
        isNote
          ? "فشل إضافة الملاحظة / Failed to add note"
          : "فشل إرسال الرسالة / Failed to send message",
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t p-3 space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          isNote
            ? "اكتب ملاحظة داخلية... / Add internal note..."
            : "اكتب ردك... / Type your reply..."
        }
        className={`min-h-20 resize-none ${
          isNote
            ? "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800"
            : ""
        }`}
        dir="auto"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={isNote ? "default" : "outline"}
            size="sm"
            onClick={() => setIsNote(!isNote)}
          >
            📝 {isNote ? "ملاحظة / Note" : "ملاحظة / Note"}
          </Button>
          {onQuickReplyOpen && (
            <Button variant="outline" size="sm" onClick={onQuickReplyOpen}>
              💬 رد سريع / Quick Reply
            </Button>
          )}
        </div>
        <Button onClick={handleSubmit} disabled={!content.trim()}>
          {isNote ? "حفظ / Save" : "إرسال / Send"}
        </Button>
      </div>
    </div>
  );
}
