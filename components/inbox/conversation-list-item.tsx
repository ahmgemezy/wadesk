"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useOrganization } from "@clerk/nextjs";

interface ConversationListItemProps {
  conversation: {
    _id: string;
    lastMessagePreview: string;
    lastMessageAt: number;
    status: string;
    unreadCount: number;
    assignedAgentId?: string;
  };
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

  const isAdminOrSupervisor =
    membership?.role === "org:admin" || membership?.role === "admin";

  const statusLabel =
    conversation.status === "open"
      ? "مفتوح"
      : conversation.status === "pending"
        ? "معلق"
        : "مغلق";

  const statusVariant =
    conversation.status === "open"
      ? "default"
      : conversation.status === "pending"
        ? "secondary"
        : "outline";

  const timeAgo = formatTimeAgo(conversation.lastMessageAt);

  return (
    <div
      className={cn(
        "w-full text-start p-3 border-b hover:bg-accent/50 transition-colors cursor-pointer",
        isActive && "bg-accent",
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium truncate">
              محادثة / Conversation
            </span>
            <Badge variant={statusVariant} className="text-[10px]">
              {statusLabel}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {conversation.lastMessagePreview}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
          {conversation.unreadCount > 0 && (
            <Badge className="text-[10px] rounded-full px-1.5">
              {conversation.unreadCount}
            </Badge>
          )}
          {isAdminOrSupervisor && onAssignClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAssignClick();
              }}
              className="text-[10px] text-primary hover:underline"
            >
              تعيين / Assign
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "الآن";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}س`;
  const days = Math.floor(hours / 24);
  return `${days}ي`;
}
