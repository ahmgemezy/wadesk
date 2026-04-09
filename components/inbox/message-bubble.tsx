"use client";

import { Badge } from "@/components/ui/badge";
import { useT, useLocale } from "@/lib/i18n/context";

type Message = {
  _id: string;
  direction: "inbound" | "outbound";
  content: string;
  contentType: "text" | "image" | "document" | "unsupported" | "audio" | "video" | "sticker" | "location" | "template";
  isInternalNote: boolean;
  authorId: string | undefined;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: number;
};

export function MessageBubble({ message }: { message: Message }) {
  const t = useT();
  const locale = useLocale();
  if (message.isInternalNote) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[75%] rounded-lg bg-amber-50 dark:bg-amber-950 p-3 border border-amber-200 dark:border-amber-800">
          <div className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">
            {t("Internal Note", "ملاحظة داخلية")}
          </div>
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
          <div className="text-xs text-muted-foreground mt-1 text-start">
            {new Date(message.timestamp).toLocaleTimeString(locale === "en" ? "en-US" : "ar-EG", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    );
  }

  if (message.contentType === "unsupported") {
    return (
      <div className={message.direction === "inbound" ? "flex justify-start" : "flex justify-end"}>
        <div className="max-w-[75%] rounded-lg bg-muted p-3">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <span>📎</span>
            <span>{t("[Unsupported message type]", "[رسالة غير مدعومة]")}</span>
          </div>
        </div>
      </div>
    );
  }

  const isInbound = message.direction === "inbound";

  return (
    <div className={isInbound ? "flex justify-start" : "flex justify-end"}>
      <div
        className={`max-w-[75%] rounded-lg p-3 ${
          isInbound
            ? "bg-muted"
            : "bg-green-100 dark:bg-green-900"
        }`}
      >
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        <div className={`text-xs text-muted-foreground mt-1 flex items-center gap-1 ${isInbound ? "justify-start" : "justify-end"}`}>
          <span>
            {new Date(message.timestamp).toLocaleTimeString(locale === "en" ? "en-US" : "ar-EG", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {!isInbound && message.status && (
            <StatusBadge status={message.status} />
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "failed"
      ? "destructive"
      : status === "delivered" || status === "read"
        ? "default"
        : "secondary";

  const label =
    status === "sent"
      ? "✓"
      : status === "delivered"
        ? "✓✓"
        : status === "read"
          ? "✓✓"
          : "✗";

  return (
    <Badge variant={variant} className="text-[10px] px-1 py-0">
      {label}
    </Badge>
  );
}
