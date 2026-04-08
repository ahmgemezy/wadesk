"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { ConversationListItem } from "./conversation-list-item";

type AssignmentFilter = "all" | "mine" | "unassigned";

interface ConversationListProps {
  activeConversationId?: string;
  onSelect?: (id: string) => void;
  onAssignClick?: (conversationId: string) => void;
}

export function ConversationList({
  activeConversationId,
  onSelect,
  onAssignClick,
}: ConversationListProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AssignmentFilter>("all");

  const conversations = useQuery(api.inbox.listConversations, { filter });

  const filtered = (conversations ?? []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.contactName?.toLowerCase().includes(q) ||
      c.contactPhone?.toLowerCase().includes(q) ||
      c.lastMessagePreview.toLowerCase().includes(q)
    );
  });

  const tabs: { value: AssignmentFilter; labelAr: string; labelEn: string }[] = [
    { value: "all", labelAr: "الكل", labelEn: "All" },
    { value: "mine", labelAr: "محادثاتي", labelEn: "Mine" },
    { value: "unassigned", labelAr: "غير معينة", labelEn: "Unassigned" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute inset-s-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الرقم / Search..."
            className="ps-8 h-8 text-sm"
            dir="auto"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-2 border-b">
        {tabs.map((tab) => (
          <Button
            key={tab.value}
            variant={filter === tab.value ? "default" : "ghost"}
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => setFilter(tab.value)}
          >
            {tab.labelAr}
          </Button>
        ))}
      </div>

      {/* List */}
      {conversations === undefined ? (
        <div className="p-3 space-y-2 flex-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm p-4 text-center">
          {search
            ? "لا توجد نتائج / No results"
            : "لا توجد محادثات / No conversations"}
        </div>
      ) : (
        <ScrollArea className="flex-1">
          {filtered.map((conv) => (
            <ConversationListItem
              key={conv.id}
              conversation={{
                _id: conv.id,
                contactName: conv.contactName,
                contactPhone: conv.contactPhone,
                contactAvatarInitials: conv.contactAvatarInitials,
                assignedAgentId: conv.assignedAgentId,
                assignedAgentName: conv.assignedAgentName,
                lastMessagePreview: conv.lastMessagePreview,
                lastMessageAt: conv.lastMessageAt,
                status: conv.status,
                unreadCount: conv.unreadCount,
              }}
              isActive={conv.id === activeConversationId}
              onClick={() => onSelect?.(conv.id)}
              onAssignClick={
                onAssignClick ? () => onAssignClick(conv.id) : undefined
              }
            />
          ))}
        </ScrollArea>
      )}
    </div>
  );
}
