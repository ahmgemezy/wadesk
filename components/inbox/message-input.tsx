"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";
import {
  ImageIcon,
  FileIcon,
  MicIcon,
  VideoIcon,
  MapPinIcon,
  SmileIcon,
  XIcon,
  Loader2Icon,
} from "lucide-react";
import dynamic from "next/dynamic";
import { TemplatePicker } from "@/components/templates/template-picker";
import { ReplyContextBanner } from "./reply-context-banner";

// Lazy-load emoji picker to keep initial bundle small
const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

type AttachmentType = "image" | "document" | "audio" | "video";

interface PendingAttachment {
  file: File;
  type: AttachmentType;
  previewUrl?: string;
}

interface LocationPayload {
  latitude: number;
  longitude: number;
  name?: string;
}

function resolveAttachmentType(file: File): AttachmentType {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  return "document";
}

export function MessageInput({
  conversationId,
  onQuickReplyOpen,
  quickReplyContent,
  onQuickReplyConsumed,
  replyTo,
  onClearReply,
}: {
  conversationId: string;
  onQuickReplyOpen?: () => void;
  quickReplyContent?: string;
  onQuickReplyConsumed?: () => void;
  replyTo?: { messageId: string; content: string; authorLabel: string } | null;
  onClearReply?: () => void;
}) {
  const t = useT();
  const [content, setContent] = useState("");
  const [isNote, setIsNote] = useState(false);
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
  const [location, setLocation] = useState<LocationPayload | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [locating, setLocating] = useState(false);
  const [templateContent, setTemplateContent] = useState<string | null>(null);

  const imageRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

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

  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const sendMediaReply = useAction(api.messages.sendMediaReply);
  const sendLocationReply = useMutation(api.messages.sendLocationReply);
  const sendQuotedReplyMutation = useMutation(api.messages.sendQuotedReply);

  // Close emoji picker on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    }
    if (showEmoji) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showEmoji]);

  useEffect(() => {
    if (quickReplyContent) {
      setContent(quickReplyContent);
      onQuickReplyConsumed?.();
    }
  }, [quickReplyContent, onQuickReplyConsumed]);

  useEffect(() => {
    if (templateContent) {
      setContent(templateContent);
      setTemplateContent(null);
    }
  }, [templateContent]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = resolveAttachmentType(file);
    const previewUrl = type === "image" ? URL.createObjectURL(file) : undefined;
    setAttachment({ file, type, previewUrl });
    setLocation(null);
    e.target.value = "";
  }

  function clearAttachment() {
    if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
  }

  function handleLocationPick() {
    if (!navigator.geolocation) {
      toast.error(t("Geolocation not supported", "الموقع الجغرافي غير مدعوم"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          name: t("My Location", "موقعي"),
        });
        setAttachment(null);
        setLocating(false);
      },
      () => {
        toast.error(t("Could not get location", "تعذّر الحصول على الموقع"));
        setLocating(false);
      },
    );
  }

  const handleSubmit = async () => {
    if (location) {
      await handleLocationSubmit();
      return;
    }
    if (attachment) {
      await handleMediaSubmit();
      return;
    }
    if (!content.trim()) return;

    const trimmed = content.trim();
    setContent("");

    try {
      if (replyTo) {
        await sendQuotedReplyMutation({
          conversationId: conversationId as Id<"conversations">,
          content: trimmed,
          quotedMessageId: replyTo.messageId as Id<"messages">,
        });
        onClearReply?.();
      } else {
        await sendMessage({
          conversationId: conversationId as Id<"conversations">,
          content: trimmed,
          type: isNote ? "note" : "reply",
        });
      }
    } catch {
      setContent(trimmed);
      toast.error(
        isNote
          ? t("Failed to add note", "فشل إضافة الملاحظة")
          : t("Failed to send message", "فشل إرسال الرسالة"),
      );
    }
  };

  const handleMediaSubmit = async () => {
    if (!attachment) return;
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": attachment.file.type },
        body: attachment.file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      await sendMediaReply({
        conversationId: conversationId as Id<"conversations">,
        storageId,
        contentType: attachment.type,
        filename: attachment.file.name,
      });
      clearAttachment();
    } catch {
      toast.error(t("Failed to send attachment", "فشل إرسال المرفق"));
    } finally {
      setUploading(false);
    }
  };

  const handleLocationSubmit = async () => {
    if (!location) return;
    setUploading(true);
    try {
      await sendLocationReply({
        conversationId: conversationId as Id<"conversations">,
        latitude: location.latitude,
        longitude: location.longitude,
        name: location.name,
      });
      setLocation(null);
    } catch {
      toast.error(t("Failed to send location", "فشل إرسال الموقع"));
    } finally {
      setUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSend = !uploading && (!!attachment || !!location || !!content.trim());

  return (
    <div className="relative border-t p-3 space-y-2 shrink-0">
      {/* Attachment preview */}
      {attachment && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted text-sm">
          {attachment.type === "image" && attachment.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={attachment.previewUrl}
              alt=""
              className="h-12 w-12 rounded object-cover"
            />
          ) : attachment.type === "video" ? (
            <VideoIcon className="size-5 text-muted-foreground" />
          ) : attachment.type === "audio" ? (
            <MicIcon className="size-5 text-muted-foreground" />
          ) : (
            <FileIcon className="size-5 text-muted-foreground" />
          )}
          <span className="flex-1 truncate">{attachment.file.name}</span>
          <button
            onClick={clearAttachment}
            className="text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      )}

      {/* Location preview */}
      {location && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted text-sm">
          <MapPinIcon className="size-5 text-red-500 shrink-0" />
          <span className="flex-1">
            {location.name ?? t("Location", "موقع")}
            <span className="text-xs text-muted-foreground ms-2" dir="ltr">
              {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </span>
          </span>
          <button
            onClick={() => setLocation(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div ref={emojiRef} className="absolute bottom-full mb-1 inset-s-0 z-50">
          <EmojiPicker
            onEmojiClick={(e) => {
              setContent((prev) => prev + e.emoji);
              textareaRef.current?.focus();
            }}
            height={350}
            searchDisabled={false}
          />
        </div>
      )}

      {/* Reply context banner */}
      {replyTo && (
        <ReplyContextBanner
          quotedContent={replyTo.content}
          quotedAuthor={replyTo.authorLabel}
          onClear={() => onClearReply?.()}
        />
      )}

      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          isNote
            ? t("Add internal note...", "اكتب ملاحظة داخلية...")
            : t("Type your reply...", "اكتب ردك...")
        }
        className={`min-h-20 resize-none ${
          isNote
            ? "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800"
            : ""
        }`}
        dir="auto"
      />

      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 flex-wrap">
          <Button
            variant={isNote ? "default" : "outline"}
            size="sm"
            onClick={() => setIsNote(!isNote)}
          >
            📝 {t("Note", "ملاحظة")}
          </Button>
          {onQuickReplyOpen && (
            <Button variant="outline" size="sm" onClick={onQuickReplyOpen}>
              💬 {t("Quick Reply", "رد سريع")}
            </Button>
          )}

          {/* Template picker — hidden in note mode */}
          {!isNote && (
            <TemplatePicker onSelect={(text) => setTemplateContent(text)} />
          )}

          {/* Attachment & extras — hidden in note mode */}
          {!isNote && (
            <>
              <Button
                variant="ghost"
                size="icon"
                title={t("Emoji", "إيموجي")}
                onClick={() => setShowEmoji((v) => !v)}
              >
                <SmileIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title={t("Send image", "إرسال صورة")}
                onClick={() => imageRef.current?.click()}
              >
                <ImageIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title={t("Send video", "إرسال فيديو")}
                onClick={() => videoRef.current?.click()}
              >
                <VideoIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title={t("Send document", "إرسال مستند")}
                onClick={() => docRef.current?.click()}
              >
                <FileIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title={t("Send audio", "إرسال صوت")}
                onClick={() => audioRef.current?.click()}
              >
                <MicIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title={t("Send location", "إرسال الموقع")}
                onClick={handleLocationPick}
                disabled={locating}
              >
                {locating ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <MapPinIcon className="size-4" />
                )}
              </Button>
            </>
          )}
        </div>

        <Button onClick={handleSubmit} disabled={!canSend} className="shrink-0">
          {uploading ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : isNote ? (
            t("Save", "حفظ")
          ) : (
            t("Send", "إرسال")
          )}
        </Button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={imageRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/mp4,video/3gpp,video/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={docRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={audioRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
