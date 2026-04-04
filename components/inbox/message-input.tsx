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
  const sendReply = useMutation(api.messages.sendReply);
  const addInternalNote = useMutation(api.messages.addInternalNote);

  useEffect(() => {
    if (quickReplyContent) {
      setContent(quickReplyContent);
      onQuickReplyConsumed?.();
    }
  }, [quickReplyContent, onQuickReplyConsumed]);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    try {
      if (isNote) {
        await addInternalNote({
          conversationId: conversationId as Id<"conversations">,
          content: content.trim(),
        });
      } else {
        await sendReply({
          conversationId: conversationId as Id<"conversations">,
          content: content.trim(),
        });
      }
      setContent("");
    } catch {
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
        className={`min-h-[80px] resize-none ${
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
