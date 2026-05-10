"use client";

import { useT, useLocale } from "@/lib/i18n/context";
import { FileIcon, DownloadIcon, MapPinIcon, MicIcon, XIcon, Trash2Icon, ReplyIcon, CalendarClockIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { MessageActionMenu } from "./message-action-menu";

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function linkify(text: string) {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) =>
    URL_REGEX.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline break-all opacity-80 hover:opacity-100"
      >
        {part}
      </a>
    ) : (
      part
    )
  );
}

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

export type Message = {
  _id: string;
  direction: "inbound" | "outbound";
  content: string;
  contentType: "text" | "image" | "document" | "unsupported" | "audio" | "video" | "sticker" | "location" | "template" | "system_event";
  isInternalNote: boolean;
  authorId: string | undefined;
  source?: "customer" | "api" | "mobile";
  mediaUrl?: string;
  metaMessageId?: string;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  timestamp: number;
  quotedMessageId?: string;
  deletedAt?: number;
  reactions?: Reaction[];
  eventType?: "transfer_department" | "agent_assigned" | "agent_unassigned" | "resolved" | "reopened" | "csat_received" | "transfer_within_channel" | "forward_to_branch";
  eventData?: {
    actorName?: string;
    fromDept?: string;
    toDept?: string;
    agentName?: string;
    agentJobTitle?: string;
    csatScore?: number;
    targetBranchName?: string;
    targetDeptName?: string;
  };
  followUpId?: string;
  followUpCreatorName?: string;
  followUpDepartmentName?: string;
  followUpDepartmentNameAr?: string;
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
          ? "bg-(--internal-note-bg) border-accent"
          : "bg-muted border-border"
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

function ConversationEventPill({
  message,
  locale,
}: {
  message: Message;
  locale: "ar" | "en";
}) {
  const isAr = locale === "ar";
  const { eventType, eventData } = message;

  const config: Record<
    string,
    { pillBg: string; pillText: string; lineBg: string; icon: string }
  > = {
    transfer_department: {
      pillBg: "bg-white dark:bg-gray-900",
      pillText: "text-blue-700 dark:text-blue-300",
      lineBg: "bg-blue-200 dark:bg-blue-800",
      icon: "↗",
    },
    agent_assigned: {
      pillBg: "bg-white dark:bg-gray-900",
      pillText: "text-purple-700 dark:text-purple-300",
      lineBg: "bg-purple-200 dark:bg-purple-800",
      icon: "👤",
    },
    agent_unassigned: {
      pillBg: "bg-white dark:bg-gray-900",
      pillText: "text-gray-600 dark:text-gray-400",
      lineBg: "bg-gray-300 dark:bg-gray-700",
      icon: "👤",
    },
    resolved: {
      pillBg: "bg-white dark:bg-gray-900",
      pillText: "text-success",
      lineBg: "bg-green-200 dark:bg-green-800",
      icon: "✓",
    },
    reopened: {
      pillBg: "bg-white dark:bg-gray-900",
      pillText: "text-yellow-800 dark:text-yellow-300",
      lineBg: "bg-yellow-200 dark:bg-yellow-800",
      icon: "↩",
    },
    csat_received: {
      pillBg: "bg-white dark:bg-gray-900",
      pillText: "text-warning",
      lineBg: "bg-amber-200 dark:bg-amber-800",
      icon: "",
    },
    transfer_within_channel: {
      pillBg: "bg-white dark:bg-gray-900",
      pillText: "text-blue-700 dark:text-blue-300",
      lineBg: "bg-blue-200 dark:bg-blue-800",
      icon: "↗",
    },
    forward_to_branch: {
      pillBg: "bg-white dark:bg-gray-900",
      pillText: "text-indigo-700 dark:text-indigo-300",
      lineBg: "bg-indigo-200 dark:bg-indigo-800",
      icon: "↗",
    },
  };

  const style = config[eventType ?? ""] ?? config.agent_unassigned;
  const actor = eventData?.actorName ?? (isAr ? "شخص ما" : "Someone");
  const agent = eventData?.agentName ?? "";
  const toDept = eventData?.toDept ?? "";
  const csatScore = eventData?.csatScore;
  const stars = csatScore ? "⭐".repeat(csatScore) : "";

  let label = "";
  if (isAr) {
    if (eventType === "transfer_department")
      label = `${actor} نقل إلى ${toDept}`;
    else if (eventType === "agent_assigned") {
      const titleSuffix = eventData?.agentJobTitle ? ` · ${eventData.agentJobTitle}` : "";
      const isSelfClaim = actor === agent || actor === "شخص ما";
      const isSystem = eventData?.actorName === "System";
      label = isSelfClaim || isSystem
        ? `تم تعيين المحادثة لـ ${agent}${titleSuffix}`
        : `${actor} عيّن المحادثة لـ ${agent}${titleSuffix}`;
    } else if (eventType === "agent_unassigned")
      label = "تم إلغاء تعيين المحادثة";
    else if (eventType === "resolved")
      label = `${actor} أغلق المحادثة`;
    else if (eventType === "reopened")
      label = "أُعيد فتح المحادثة";
    else if (eventType === "csat_received")
      label = `${stars} العميل قيّم ${csatScore}/5`;
    else if (eventType === "transfer_within_channel")
      label = `${actor} حوّل المحادثة إلى قسم ${toDept}`;
    else if (eventType === "forward_to_branch")
      label = "تم إرسال المحادثة إلى رقم آخر — تم إغلاقها.";
  } else {
    if (eventType === "transfer_department")
      label = `${actor} transferred to ${toDept}`;
    else if (eventType === "agent_assigned") {
      const titleSuffix = eventData?.agentJobTitle ? ` · ${eventData.agentJobTitle}` : "";
      const isSelfClaim = actor === agent || actor === "Someone";
      const isSystem = eventData?.actorName === "System";
      label = isSelfClaim || isSystem
        ? `Conversation assigned to ${agent}${titleSuffix}`
        : `${actor} assigned conversation to ${agent}${titleSuffix}`;
    } else if (eventType === "agent_unassigned")
      label = "Conversation unassigned";
    else if (eventType === "resolved")
      label = `${actor} resolved this`;
    else if (eventType === "reopened")
      label = "Conversation reopened";
    else if (eventType === "csat_received")
      label = `${stars} Customer rated ${csatScore}/5`;
    else if (eventType === "transfer_within_channel")
      label = `${actor} transferred conversation to ${toDept}`;
    else if (eventType === "forward_to_branch")
      label = "Conversation forwarded to another number — closed.";
  }

  return (
    <div className="flex items-center gap-2 my-1 px-2">
      <div className={`flex-1 h-px ${style.lineBg}`} />
      <span
        className={`text-[11px] font-medium rounded-full px-3 py-0.5 whitespace-nowrap ${style.pillBg} ${style.pillText}`}
      >
        {style.icon} {label}
      </span>
      <div className={`flex-1 h-px ${style.lineBg}`} />
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

  if (message.contentType === "system_event") {
    return <ConversationEventPill message={message} locale={locale} />;
  }

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
        <div className={`max-w-[75%] rounded-2xl p-3 shadow-sm ${message.direction === "inbound" ? "bg-(--customer-bubble-bg) text-(--customer-bubble-text) rounded-ee-sm" : "bg-(--agent-bubble-bg) text-(--agent-bubble-text) rounded-es-sm"} opacity-50 italic`}>
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
        <div className="max-w-[75%] rounded-2xl rounded-ee-sm bg-(--internal-note-bg) p-3 border border-dashed border-(--internal-note-border) shadow-sm">
          <div className="text-xs font-medium text-(--internal-note-text) mb-1">
            {t("Internal Note", "ملاحظة داخلية")}
          </div>
          <div className="text-sm whitespace-pre-wrap text-(--internal-note-text)">{linkify(message.content)}</div>
          <div className="text-xs text-muted-foreground mt-1 text-start">{timeStr}</div>
        </div>
      </div>
    );
  }

  const isInbound = message.direction === "inbound";
  const isMobileSource = !isInbound && message.source === "mobile";

  const bubbleBase = `max-w-[75%] rounded-2xl p-3 shadow-sm ${
    isInbound
      ? "bg-(--customer-bubble-bg) text-(--customer-bubble-text) rounded-ee-sm"
      : "bg-(--agent-bubble-bg) text-(--agent-bubble-text) rounded-es-sm"
  }`;

  const mobileBadge = isMobileSource && (
    <span
      className="ms-2 inline-flex items-center gap-1 rounded bg-success/10 px-2 py-0.5 text-xs font-medium text-success"
      title={t("Sent from the WhatsApp mobile app", "هذه الرسالة أُرسلت من تطبيق الواتساب على الهاتف")}
    >
      📱 {t("From mobile", "من الموبايل")}
    </span>
  );

  const timeRow = (
    <div className={`text-xs text-muted-foreground mt-1 flex items-center gap-1 ${isInbound ? "justify-start" : "justify-end"}`}>
      <span>{timeStr}</span>
      {!isInbound && (
        <StatusTick
          status={message.status}
          onRetry={message.status === "failed" && onRetry ? () => onRetry(message.content) : undefined}
        />
      )}
      {mobileBadge}
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

  const isFollowUp = !!message.followUpId;
  const followUpDeptLabel =
    locale === "ar"
      ? message.followUpDepartmentNameAr ?? message.followUpDepartmentName
      : message.followUpDepartmentName;
  const followUpHeader = isFollowUp && (
    <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-blue-700 dark:text-blue-300">
      <CalendarClockIcon className="size-3 shrink-0" />
      <span>{t("Follow-up", "متابعة")}</span>
      {message.followUpCreatorName && (
        <span className="text-foreground/70">· {message.followUpCreatorName}</span>
      )}
      {followUpDeptLabel && (
        <span className="rounded-full bg-blue-100 dark:bg-blue-950 px-1.5 py-0.5 text-[10px]">
          {followUpDeptLabel}
        </span>
      )}
    </div>
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

  // Media URL is real (Convex storage) only when it starts with https://
  // New inbound messages temporarily hold the Meta media ID until resolveInboundMedia runs
  const isRealMediaUrl = (url: string | undefined): url is string =>
    !!url && url.startsWith("https://");

  if ((message.contentType === "image" || message.contentType === "sticker") && message.mediaUrl) {
    const resolved = isRealMediaUrl(message.mediaUrl);
    return (
      <>
        {resolved && lightboxSrc && (
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
            {resolved ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={message.mediaUrl}
                alt={t("Image", "صورة")}
                className="rounded max-w-xs max-h-64 object-cover cursor-zoom-in"
                loading="lazy"
                onClick={() => setLightboxSrc(message.mediaUrl!)}
              />
            ) : (
              <div className="rounded w-48 h-40 bg-muted/60 animate-pulse flex items-center justify-center text-xs text-muted-foreground">
                {t("Loading…", "جارٍ التحميل…")}
              </div>
            )}
            {resolved && message.content && message.contentType === "image" && (
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
    const resolved = isRealMediaUrl(message.mediaUrl);
    return (
      <div className={`relative group ${isInbound ? "flex justify-start" : "flex justify-end"} animate-bubble-in`}>
        {actionMenu}
        <div className={bubbleBase + " p-1.5"}>
          {quotedPreview}
          {resolved ? (
            <>
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
            </>
          ) : (
            <>
              <div className="rounded w-48 h-40 bg-muted/60 animate-pulse flex items-center justify-center text-xs text-muted-foreground">
                {t("Loading…", "جارٍ التحميل…")}
              </div>
              <div className="px-1.5">{timeRow}</div>
            </>
          )}
          {reactionBadges}
        </div>
      </div>
    );
  }

  if (message.contentType === "audio" && message.mediaUrl) {
    const resolved = isRealMediaUrl(message.mediaUrl);
    return (
      <div className={`relative group ${isInbound ? "flex justify-start" : "flex justify-end"} animate-bubble-in`}>
        {actionMenu}
        <div className={bubbleBase}>
          {quotedPreview}
          <div className="flex items-center gap-2 mb-1">
            <MicIcon className="size-4 text-muted-foreground shrink-0" />
            {resolved ? (
              <>
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
              </>
            ) : (
              <div className="h-8 w-48 bg-muted/60 animate-pulse rounded" />
            )}
          </div>
          {timeRow}
          {reactionBadges}
        </div>
      </div>
    );
  }

  if (message.contentType === "document") {
    const filename = message.content || t("Document", "مستند");
    const resolved = isRealMediaUrl(message.mediaUrl);
    const docInner = (
      <>
        {quotedPreview}
        <div className="flex items-center gap-2">
          <FileIcon className="size-5 text-muted-foreground shrink-0" />
          <span className="text-sm flex-1 truncate max-w-40">{filename}</span>
          <DownloadIcon className={`size-4 shrink-0 ${resolved ? "text-muted-foreground" : "text-muted-foreground/40"}`} />
        </div>
        {timeRow}
        {reactionBadges}
      </>
    );
    return (
      <div className={`relative group ${isInbound ? "flex justify-start" : "flex justify-end"} animate-bubble-in`}>
        {actionMenu}
        {resolved ? (
          <a
            href={message.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={filename}
            className={bubbleBase + " cursor-pointer hover:opacity-90 transition-opacity"}
          >
            {docInner}
          </a>
        ) : (
          <div className={bubbleBase}>{docInner}</div>
        )}
      </div>
    );
  }

  if (message.contentType === "location") {
    let coords: string;
    let locationName: string;
    if (message.content.includes("|")) {
      const sep = message.content.indexOf("|");
      coords = message.content.slice(0, sep);
      locationName = message.content.slice(sep + 1) || t("Location", "الموقع");
    } else {
      coords = message.content.replace(/^\[Location:\s*/, "").replace(/\]$/, "");
      locationName = t("Location", "الموقع");
    }

    const parts = coords.split(",");
    const lat = parseFloat(parts[0] ?? "");
    const lng = parseFloat(parts[1] ?? "");
    const hasCoords = !isNaN(lat) && !isNaN(lng);

    const mapsUrl = hasCoords
      ? `https://maps.google.com/?q=${lat},${lng}`
      : `https://maps.google.com/?q=${encodeURIComponent(coords)}`;

    const osmSrc = hasCoords
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.008},${lat - 0.008},${lng + 0.008},${lat + 0.008}&layer=mapnik&marker=${lat},${lng}`
      : null;

    return (
      <div className={`relative group ${isInbound ? "flex justify-start" : "flex justify-end"} animate-bubble-in`}>
        {actionMenu}
        <div className={bubbleBase + " p-0 overflow-hidden"}>
          {quotedPreview}
          {osmSrc && (
            <iframe
              src={osmSrc}
              className="w-full h-40 border-0"
              loading="lazy"
              title={locationName}
            />
          )}
          <div className="p-3">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 underline-offset-2 hover:underline"
            >
              <MapPinIcon className="size-4 text-destructive shrink-0" />
              <span className="text-sm font-medium">{locationName}</span>
            </a>
            {timeRow}
            {reactionBadges}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative group ${isInbound ? "flex justify-start" : "flex justify-end"} animate-bubble-in`}>
      {actionMenu}
      <div className={bubbleBase}>
        {followUpHeader}
        {quotedPreview}
        <div className="text-sm whitespace-pre-wrap">{linkify(message.content)}</div>
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
        <span className="text-destructive text-xs">✗</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-destructive underline hover:text-destructive/80 leading-none"
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
