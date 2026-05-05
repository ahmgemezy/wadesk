"use client";

import { useState, useRef, useEffect } from "react";
import { ReplyIcon, SmileIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/context";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface MessageActionMenuProps {
  isOutbound: boolean;
  canDelete: boolean;
  onReply: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
}

export function MessageActionMenu({
  isOutbound,
  canDelete,
  onReply,
  onDelete,
  onReact,
}: MessageActionMenuProps) {
  const t = useT();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showEmojiPicker) return;
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showEmojiPicker]);

  return (
    <div
      className={`absolute -top-8 flex items-center gap-0.5 bg-background border rounded-lg shadow-[var(--shadow-md)] px-0.5 py-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-20 ${
        isOutbound ? "end-0" : "start-0"
      }`}
    >
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        title={t("Reply", "رد")}
        onClick={onReply}
      >
        <ReplyIcon className="size-3.5" />
      </Button>

      <div className="relative" ref={pickerRef}>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          title={t("React", "تفاعل")}
          onClick={() => setShowEmojiPicker((v) => !v)}
        >
          <SmileIcon className="size-3.5" />
        </Button>
        {showEmojiPicker && (
          <div
            className={`absolute bottom-full mb-1 flex gap-1 bg-background border rounded-lg shadow-[var(--shadow-md)] p-1.5 z-30 ${
              isOutbound ? "end-0" : "start-0"
            }`}
          >
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                className="text-lg hover:scale-125 transition-transform px-0.5"
                onClick={() => {
                  onReact(emoji);
                  setShowEmojiPicker(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {canDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-destructive hover:text-destructive"
          title={t("Delete", "حذف")}
          onClick={onDelete}
        >
          <Trash2Icon className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
