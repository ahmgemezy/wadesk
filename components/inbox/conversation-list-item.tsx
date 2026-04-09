"use client";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useOrganization } from "@clerk/nextjs";
import { useT, useLocale } from "@/lib/i18n/context";

interface ConversationItem {
  _id: string;
  // Contact info — populated when available (real data or mock)
  contactName?: string;
  contactPhone?: string;
  contactAvatarInitials?: string;
  // Assigned agent
  assignedAgentName?: string;
  // Conversation meta
  lastMessagePreview: string;
  lastMessageAt: number;
  status: string;
  unreadCount: number;
  assignedAgentId?: string;
}

interface ConversationListItemProps {
  conversation: ConversationItem;
  isActive?: boolean;
  onClick?: () => void;
  onAssignClick?: () => void;
}

export function ConversationListItem({
  conversation,
  isActive,
  onClick,
  onAssignClick,
}: ConversationListItemProps) {
  const { membership } = useOrganization();
  const t = useT();
  const locale = useLocale();

  const isAdminOrSupervisor =
    membership?.role === "org:admin" ||
    membership?.role === "admin" ||
    membership?.role === "org:supervisor";

  const statusLabel =
    conversation.status === "open"
      ? t("Open", "مفتوح")
      : conversation.status === "pending"
        ? t("Pending", "معلق")
        : t("Resolved", "مغلق");

  const statusColor =
    conversation.status === "open"
      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
      : conversation.status === "pending"
        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
        : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";

  const displayName = conversation.contactName ?? t("Contact", "عميل");
  const phone = conversation.contactPhone;
  const initials =
    conversation.contactAvatarInitials ??
    displayName
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("");

  const timeAgo = formatTimeAgo(conversation.lastMessageAt, locale);

  return (
    <div
      className={cn(
        "w-full text-start p-3 border-b hover:bg-accent/50 transition-colors cursor-pointer",
        isActive && "bg-accent border-s-2 border-s-primary",
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className="text-xs font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Row 1: name + time + unread */}
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span
              className="text-sm font-semibold truncate"
              dir="auto"
            >
              {displayName}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
              {conversation.unreadCount > 0 && (
                <Badge className="text-[10px] rounded-full px-1.5 h-4 min-w-4 flex items-center justify-center">
                  {conversation.unreadCount}
                </Badge>
              )}
            </div>
          </div>

          {/* Row 2: phone (if present) */}
          {phone && (
            <span
              className="text-[10px] text-muted-foreground block mb-0.5"
              dir="ltr"
            >
              {phone}
            </span>
          )}

          {/* Row 3: last message preview */}
          <p
            className="text-xs text-muted-foreground truncate"
            dir="auto"
          >
            {conversation.lastMessagePreview}
          </p>

          {/* Row 4: status + assigned agent */}
          <div className="flex items-center gap-2 mt-1">
            <span
              className={cn(
                "text-[10px] rounded-full px-1.5 py-0.5 font-medium",
                statusColor,
              )}
            >
              {statusLabel}
            </span>
            {conversation.assignedAgentName && (
              <span className="text-[10px] text-muted-foreground truncate">
                {conversation.assignedAgentName}
              </span>
            )}
            {!conversation.assignedAgentId && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400">
                {t("Unassigned", "غير معين")}
              </span>
            )}
            {isAdminOrSupervisor && onAssignClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAssignClick();
                }}
                className="text-[10px] text-primary hover:underline ms-auto"
              >
                {t("Assign", "تعيين")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp: number, locale: "ar" | "en"): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (locale === "en") {
    if (seconds < 60) return "now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "yesterday";
    return `${days}d`;
  }
  if (seconds < 60) return "الآن";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}س`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "أمس";
  return `${days}ي`;
}
