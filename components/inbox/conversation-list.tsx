"use client";

import { useState } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { ConversationListItem } from "./conversation-list-item";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

type AssignmentFilter = "all" | "mine" | "unassigned";
type StageFilter = "all" | "lead" | "prospect" | "customer" | "retained" | "churned";

const STAGE_TABS: { value: StageFilter; en: string; ar: string }[] = [
  { value: "all",      en: "All",      ar: "الكل" },
  { value: "lead",     en: "Lead",     ar: "عميل محتمل" },
  { value: "prospect", en: "Prospect", ar: "مرشح" },
  { value: "customer", en: "Customer", ar: "عميل" },
  { value: "retained", en: "Retained", ar: "عميل دائم" },
  { value: "churned",  en: "Churned",  ar: "مفقود" },
];

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
  const t = useT();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AssignmentFilter>("all");
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");

  const { isAuthenticated } = useConvexAuth();

  const conversations = useQuery(
    api.inbox.listConversations,
    isAuthenticated
      ? {
          filter,
          contactStage: stageFilter,
        }
      : "skip"
  );

  const filtered = (conversations ?? []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.contactName?.toLowerCase().includes(q) ||
      c.contactPhone?.toLowerCase().includes(q) ||
      c.lastMessagePreview.toLowerCase().includes(q)
    );
  });

  const tabs: { value: AssignmentFilter; label: string }[] = [
    { value: "all", label: t("All", "الكل") },
    { value: "mine", label: t("Mine", "محادثاتي") },
    { value: "unassigned", label: t("Unassigned", "غير معينة") },
  ];

  const isRtl = t("ltr", "rtl") === "rtl";

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute inset-s-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Search...", "ابحث بالاسم أو الرقم")}
            className="ps-8 h-8 text-sm"
            dir="auto"
          />
        </div>
      </div>

      {/* Assignment filter tabs */}
      <div className="flex gap-1 p-2 border-b">
        {tabs.map((tab) => (
          <Button
            key={tab.value}
            variant={filter === tab.value ? "default" : "ghost"}
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => setFilter(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Stage filter tabs */}
      <div className="flex gap-1 px-2 pt-2 pb-1 border-b overflow-x-auto scrollbar-none">
        {STAGE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStageFilter(tab.value)}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all whitespace-nowrap",
              stageFilter === tab.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {isRtl ? tab.ar : tab.en}
          </button>
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
            ? t("No results", "لا توجد نتائج")
            : t("No conversations", "لا توجد محادثات")}
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
