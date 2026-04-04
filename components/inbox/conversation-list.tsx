"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationListItem } from "./conversation-list-item";
import { useRouter } from "next/navigation";

interface ConversationListProps {
  channelId?: string;
  status?: string;
  activeConversationId?: string;
  onSelect?: (id: string) => void;
  onAssignClick?: (conversationId: string) => void;
  orgLoaded?: boolean;
}

export function ConversationList({
  channelId,
  status,
  activeConversationId,
  onSelect,
  onAssignClick,
  orgLoaded = false,
}: ConversationListProps) {
  const conversations = useQuery(api.conversations.listForCaller, orgLoaded ? {
    channelId: channelId ? (channelId as Id<"channels">) : undefined,
    status: status as "open" | "pending" | "resolved" | undefined,
  } : "skip") as Array<{
    _id: string;
    lastMessagePreview: string;
    lastMessageAt: number;
    status: string;
    unreadCount: number;
    assignedAgentId?: string;
  }> | undefined;
  const router = useRouter();

  if (conversations === undefined) {
    return (
      <div className="p-3 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4 text-center">
        لا توجد محادثات / No conversations
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      {conversations.map((conv) => (
        <ConversationListItem
          key={conv._id}
          conversation={conv}
          isActive={conv._id === activeConversationId}
          onClick={() => {
            if (onSelect) {
              onSelect(conv._id);
            } else {
              router.push(`/inbox/${conv._id}`);
            }
          }}
          onAssignClick={onAssignClick ? () => onAssignClick(conv._id) : undefined}
        />
      ))}
    </ScrollArea>
  );
}
