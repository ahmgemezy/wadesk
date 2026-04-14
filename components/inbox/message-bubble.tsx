"use client";

import { useT, useLocale } from "@/lib/i18n/context";
import { FileIcon, DownloadIcon, MapPinIcon, MicIcon, XIcon } from "lucide-react";
import { useState, useEffect } from "react";

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

type Message = {
  _id: string;
  direction: "inbound" | "outbound";
  content: string;
  contentType: "text" | "image" | "document" | "unsupported" | "audio" | "video" | "sticker" | "location" | "template";
  isInternalNote: boolean;
  authorId: string | undefined;
  mediaUrl?: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: number;
};

export function MessageBubble({ message }: { message: Message }) {
  const t = useT();
  const locale = useLocale();
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const timeStr = new Date(message.timestamp).toLocaleTimeString(
    locale === "en" ? "en-US" : "ar-EG",
    { hour: "2-digit", minute: "2-digit" },
  );

  if (message.isInternalNote) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[75%] rounded-lg bg-amber-50 dark:bg-amber-950 p-3 border border-amber-200 dark:border-amber-800">
          <div className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">
            {t("Internal Note", "ملاحظة داخلية")}
          </div>
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
          <div className="text-xs text-muted-foreground mt-1 text-start">{timeStr}</div>
        </div>
      </div>
    );
  }

  const isInbound = message.direction === "inbound";
  const bubbleBase = `max-w-[75%] rounded-lg p-3 ${isInbound ? "bg-muted" : "bg-green-100 dark:bg-green-900"}`;
  const timeRow = (
    <div className={`text-xs text-muted-foreground mt-1 flex items-center gap-1 ${isInbound ? "justify-start" : "justify-end"}`}>
      <span>{timeStr}</span>
      {!isInbound && <StatusTick status={message.status} />}
    </div>
  );

  if (message.contentType === "unsupported") {
    return (
      <div className={isInbound ? "flex justify-start" : "flex justify-end"}>
        <div className={bubbleBase}>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <span>📎</span>
            <span>{t("[Unsupported message type]", "[رسالة غير مدعومة]")}</span>
          </div>
          {timeRow}
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
        <div className={isInbound ? "flex justify-start" : "flex justify-end"}>
          <div className={bubbleBase + " p-1.5"}>
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
          </div>
        </div>
      </>
    );
  }

  if (message.contentType === "video" && message.mediaUrl) {
    return (
      <div className={isInbound ? "flex justify-start" : "flex justify-end"}>
        <div className={bubbleBase + " p-1.5"}>
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
        </div>
      </div>
    );
  }

  if (message.contentType === "audio" && message.mediaUrl) {
    return (
      <div className={isInbound ? "flex justify-start" : "flex justify-end"}>
        <div className={bubbleBase}>
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
        </div>
      </div>
    );
  }

  if (message.contentType === "document") {
    const filename = message.content || t("Document", "مستند");
    return (
      <div className={isInbound ? "flex justify-start" : "flex justify-end"}>
        <div className={bubbleBase}>
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
        </div>
      </div>
    );
  }

  if (message.contentType === "location") {
    // content stored as "lat,lng" or "lat,lng|Name" from webhook parser
    const parts = message.content.split("|");
    const coords = parts[0];
    const name = parts[1] ?? t("Location", "الموقع");
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${coords}`;
    return (
      <div className={isInbound ? "flex justify-start" : "flex justify-end"}>
        <div className={bubbleBase}>
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
        </div>
      </div>
    );
  }

  // Default: text / template
  return (
    <div className={isInbound ? "flex justify-start" : "flex justify-end"}>
      <div className={bubbleBase}>
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        {timeRow}
      </div>
    </div>
  );
}

function StatusTick({ status }: { status: string }) {
  if (status === "failed") return <span className="text-red-500 text-xs">✗</span>;
  if (status === "read") return <span className="text-blue-400 text-xs">✓✓</span>;
  if (status === "delivered") return <span className="text-muted-foreground text-xs">✓✓</span>;
  return <span className="text-muted-foreground text-xs">✓</span>;
}
