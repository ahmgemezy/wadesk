"use client";

import { useT, useLocale } from "@/lib/i18n/context";
import { FileIcon, DownloadIcon, MapPinIcon, MicIcon, XIcon, Trash2Icon, ReplyIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { MessageActionMenu } from "./message-action-menu";

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="absolute top-4 inset-e-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <a
          href={src}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="text-white bg-black/50 rounded-full p-1.5 hover:bg-black/70"
          aria-label="Download"
        >
          <DownloadIcon className="size-5" />
        </a>
        <button
          className="text-white bg-black/50 rounded-full p-1.5 hover:bg-black/70"
          onClick={onClose}
          aria-label="Close"
        >
          <XIcon className="size-5" />
        </button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

type Reaction = {
  emoji: string;
  reactorId: string;
};

type Message = {
  _id: string;
  direction: "inbound" | "outbound";
  content: string;
  contentType: "text" | "image" | "document" | "unsupported" | "audio" | "video" | "sticker" | "location" | "template";
  isInternalNote: boolean;
  authorId: string | undefined;
  mediaUrl?: string;
  metaMessageId?: string;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  timestamp: number;
  quotedMessageId?: string;
  deletedAt?: number;
  reactions?: Reaction[];
};

function QuotedMessagePreview({ quoted, isOutbound }: { quoted: Message; isOutbound: boolean }) {
  const t = useT();
  const preview = quoted.deletedAt
    ? t("Deleted message", "رسالة محذوفة")
    : quoted.contentType === "image"
    ? t("📷 Photo", "📷 صورة")
    : quoted.contentType === "audio"
    ? t("🎵 Audio", "🎵 صوت")
    : quoted.contentType === "document"
    ? t("📄 Document", "📄 مستند")
    : quoted.content.slice(0, 80);

  return (
    <div
      className={`rounded px-2 py-1 mb-1 text-xs border-s-2 ${
        isOutbound
          ? "bg-[--internal-note-bg] border-[--accent]"
          : "bg-[--muted] border-[--border]"
      }`}
    >
      <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
        <ReplyIcon className="size-3" />
        <span>{quoted.direction === "outbound" ? t("You", "أنت") : t("Customer", "العميل")}</span>
      </div>
      <p className="truncate text-muted-foreground">{preview}</p>
    </div>
  );
}

function ReactionBadges({
  reactions,
  messageId,
  onReact,
}: {
  reactions: Reaction[];
  messageId: string;
  onReact: (messageId: string, emoji: string) => void;
}) {
  const grouped = reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(grouped).map(([emoji, count]) => (
        <button
          key={emoji}
          onClick={() => onReact(messageId, emoji)}
          className="flex items-center gap-0.5 text-xs bg-muted hover:bg-muted/80 rounded-full px-1.5 py-0.5 border"
        >
          <span>{emoji}</span>
          {count > 1 && <span className="text-muted-foreground">{count}</span>}
        </button>
      ))}
    </div>
  );
}

export function MessageBubble({
  message,
  quotedMessage,
  onReply,
  onDelete,
  onReact,
  onRetry,
}: {
  message: Message;
  quotedMessage?: Message | null;
  onReply: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  onRetry?: (content: string) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const timeStr = new Date(message.timestamp).toLocaleTimeString(
    locale === "en" ? "en-US" : "ar-EG",
    { hour: "2-digit", minute: "2-digit" },
  );

  const canDelete =
    !message.isInternalNote &&
    message.direction === "outbound" &&
    !!message.metaMessageId &&
    Date.now() - message.timestamp < 216_000_000;

  if (message.deletedAt) {
    return (
      <div className={message.direction === "inbound" ? "flex justify-start" : "flex justify-end"}>
        <div className={`max-w-[75%] rounded-[20px] p-3 ${message.direction === "inbound" ? "bg-[--customer-bubble-bg] text-[--customer-bubble-text] rounded-ee-sm" : "bg-[--agent-bubble-bg] text-[--agent-bubble-text] rounded-es-sm"} opacity-50 italic`}>
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Trash2Icon className="size-3" />
            {t(message.direction === "outbound" ? "You deleted this message" : "This message was deleted", message.direction === "outbound" ? "حذفت هذه الرسالة" : "تم حذف هذه الرسالة")}
          </div>
          <div className="text-xs text-muted-foreground mt-1 text-start">{timeStr}</div>
        </div>
      </div>
    );
  }

  if (message.isInternalNote) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[75%] rounded-[20px] rounded-ee-sm bg-[--internal-note-bg] p-3 border border-dashed border-[--internal-note-border]">
          <div className="text-xs font-medium text-[--internal-note-text] mb-1">
            {t("Internal Note", "ملاحظة داخلية")}
          </div>
          <div className="text-sm whitespace-pre-wrap text-[--internal-note-text]">{message.content}</div>
          <div className="text-xs text-muted-foreground mt-1 text-start">{timeStr}</div>
        </div>
      </div>
    );
  }

  const isInbound = message.direction === "inbound";
  const bubbleBase = `max-w-[75%] rounded-[20px] p-3 ${
    isInbound
      ? "bg-[--customer-bubble-bg] text-[--customer-bubble-text] rounded-ee-sm"
      : "bg-gradient-to-br from-[#00e5a0] to-[#00c4b4] text-[#0a1020] rounded-es-sm"
  }`;
  const timeRow = (
    <div className={`text-xs text-muted-foreground mt-1 flex items-center gap-1 ${isInbound ? "justify-start" : "justify-end"}`}>
      <span>{timeStr}</span>
      {!isInbound && (
        <StatusTick
          status={message.status}
          onRetry={message.status === "failed" && onRetry ? () => onRetry(message.content) : undefined}
        />
      )}
    </div>
  );

  const reactionBadges = message.reactions && message.reactions.length > 0 && (
    <ReactionBadges
      reactions={message.reactions}
      messageId={message._id}
      onReact={onReact}
    />
  );

  const quotedPreview = quotedMessage && (
    <QuotedMessagePreview quoted={quotedMessage} isOutbound={!isInbound} />
  );

  const actionMenu = (
    <MessageActionMenu
      isOutbound={!isInbound}
      canDelete={canDelete}
      onReply={() => onReply(message)}
      onDelete={() => onDelete(message._id)}
      onReact={(emoji) => onReact(message._id, emoji)}
    />
  );

  if (message.contentType === "unsupported") {
    return (
      <div className={`relative group ${isInbound ? "flex justify-start" : "flex justify-end"} animate-bubble-in`}>
        {actionMenu}
        <div className={bubbleBase}>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <span>📎</span>
            <span>{t("[Unsupported message type]", "[رسالة غير مدعومة]")}</span>
          </div>
          {timeRow}
          {reactionBadges}
        </div>
      </div>
    );
  }

  if ((message.contentType === "image" || message.contentType === "sticker") && message.mediaUrl) {
    return (
      <>
        {lightboxSrc && (
          <ImageLightbox
            src={lightboxSrc}
            alt={t("Image", "صورة")}
            onClose={() => setLightboxSrc(null)}
          />
        )}
        <div className={`relative group ${isInbound ? "flex justify-start" : "flex justify-end"} animate-bubble-in`}>
          {actionMenu}
          <div className={bubbleBase + " p-1.5"}>
            {quotedPreview}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.mediaUrl}
              alt={t("Image", "صورة")}
              className="rounded max-w-xs max-h-64 object-cover cursor-zoom-in"
              loading="lazy"
              onClick={() => setLightboxSrc(message.mediaUrl!)}
            />
            {message.content && message.contentType === "image" && (
              <p className="text-sm mt-1 px-1.5">{message.content}</p>
            )}
            <div className="px-1.5">{timeRow}</div>
            {reactionBadges}
          </div>
        </div>
      </>
    );
  }

  if (message.contentType === "video" && message.mediaUrl) {
    return (
      <div className={`relative group ${isInbound ? "flex justify-start" : "flex justify-end"} animate-bubble-in`}>
        {actionMenu}
        <div className={bubbleBase + " p-1.5"}>
          {quotedPreview}
          <video
            src={message.mediaUrl}
            controls
            className="rounded max-w-xs max-h-64"
          />
          <div className="px-1.5 flex items-center justify-between">
            {timeRow}
            <a
              href={message.mediaUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
              aria-label={t("Download", "تحميل")}
            >
              <DownloadIcon className="size-4" />
            </a>
          </div>
          {reactionBadges}
        </div>
      </div>
    );
  }

  if (message.contentType === "audio" && message.mediaUrl) {
    return (
      <div className={`relative group ${isInbound ? "flex justify-start" : "flex justify-end"} animate-bubble-in`}>
        {actionMenu}
        <div className={bubbleBase}>
          {quotedPreview}
          <div className="flex items-center gap-2 mb-1">
            <MicIcon className="size-4 text-muted-foreground shrink-0" />
            <audio src={message.mediaUrl} controls className="h-8 w-48" />
            <a
              href={message.mediaUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground shrink-0"
              aria-label={t("Download", "تحميل")}
            >
              <DownloadIcon className="size-4" />
            </a>
          </div>
          {timeRow}
          {reactionBadges}
        </div>
      </div>
    );
  }

  if (message.contentType === "document") {
    const filename = message.content || t("Document", "مستند");
    return (
      <div className={`relative group ${isInbound ? "flex justify-start" : "flex justify-end"} animate-bubble-in`}>
        {actionMenu}
        <div className={bubbleBase}>
          {quotedPreview}
          <div className="flex items-center gap-2">
            <FileIcon className="size-5 text-muted-foreground shrink-0" />
            <span className="text-sm flex-1 truncate max-w-40">{filename}</span>
            {message.mediaUrl && (
              <a
                href={message.mediaUrl}
                download={filename}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
                aria-label={t("Download", "تحميل")}
              >
                <DownloadIcon className="size-4" />
              </a>
            )}
          </div>
          {timeRow}
          {reactionBadges}
        </div>
      </div>
    );
  }

  if (message.contentType === "location") {
    const parts = message.content.split("|");
    const coords = parts[0];
    const name = parts[1] ?? t("Location", "الموقع");
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${coords}`;
    return (
      <div className={`relative group ${isInbound ? "flex justify-start" : "flex justify-end"} animate-bubble-in`}>
        {actionMenu}
        <div className={bubbleBase}>
          {quotedPreview}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:underline"
          >
            <MapPinIcon className="size-4 text-red-500 shrink-0" />
            <span className="text-sm">{name}</span>
          </a>
          <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">{coords}</p>
          {timeRow}
          {reactionBadges}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative group ${isInbound ? "flex justify-start" : "flex justify-end"} animate-bubble-in`}>
      {actionMenu}
      <div className={bubbleBase}>
        {quotedPreview}
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        {timeRow}
        {reactionBadges}
      </div>
    </div>
  );
}

function StatusTick({ status, onRetry }: { status: string; onRetry?: () => void }) {
  if (status === "failed") {
    return (
      <span className="flex items-center gap-1">
        <span className="text-red-500 text-xs">✗</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-red-500 underline hover:text-red-600 leading-none"
          >
            Retry
          </button>
        )}
      </span>
    );
  }
  if (status === "read") return <span className="text-blue-400 text-xs">✓✓</span>;
  if (status === "delivered") return <span className="text-muted-foreground text-xs">✓✓</span>;
  if (status === "sending") return <span className="text-muted-foreground text-xs animate-pulse">·</span>;
  return <span className="text-muted-foreground text-xs">✓</span>;
}
