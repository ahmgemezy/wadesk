"use client";

import { useState } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { useAuth, useOrganization } from "@/lib/auth-hooks";
import { useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { ConversationListItem } from "./conversation-list-item";
import { useT, useTranslatedLabel } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { useSelectedChannel } from "@/lib/hooks/channel-context";

type AssignmentFilter = "all" | "mine" | "unassigned" | "unread";
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
  const translateLabel = useTranslatedLabel();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AssignmentFilter>("all");
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const [labelFilter, setLabelFilter] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const urlScope = searchParams.get("scope") ?? "";

  const scopeFilter = (() => {
    if (urlScope === "forwarded") return { status: "forwarded" as const };
    if (urlScope === "resolved") return { status: "resolved" as const };
    if (urlScope === "mentions") return { filter: "mine" as const };
    const channelMatch = urlScope.match(/^channel:([^:]+):(.+)$/);
    if (channelMatch) {
      const [, channelId, sub] = channelMatch;
      return {
        channelId: channelId as Id<"channels">,
        ...(sub === "unassigned" ? { filter: "unassigned" as const } : {}),
      };
    }
    const deptMatch = urlScope.match(/^dept:([^:]+):(.+)$/);
    if (deptMatch) {
      const [, deptId, sub] = deptMatch;
      return {
        departmentId: deptId as Id<"departments">,
        ...(sub === "unassigned" ? { filter: "unassigned" as const } : {}),
        ...(sub === "mine" ? { filter: "mine" as const } : {}),
      };
    }
    if (urlScope === "mine") return { filter: "mine" as const };
    if (urlScope === "unassigned") return { filter: "unassigned" as const };
    return {};
  })();

  const { isAuthenticated } = useConvexAuth();
  const { userId } = useAuth();
  const { channelId: globalChannelId } = useSelectedChannel();
  // Global channel context applies when the URL scope doesn't already specify a channel
  const effectiveChannelId = "channelId" in scopeFilter ? scopeFilter.channelId : globalChannelId;
  const { memberships } = useOrganization({ memberships: true });

  const jobTitles = useQuery(
    api.memberQueries.getJobTitlesByTenant,
    isAuthenticated ? {} : "skip",
  );

  // Build a userId → display name map for the assigned agent label
  const memberNames = Object.fromEntries(
    (memberships?.data ?? []).map((m) => {
      const uid = m.publicUserData?.userId ?? "";
      const name =
        [m.publicUserData?.firstName, m.publicUserData?.lastName]
          .filter(Boolean)
          .join(" ") ||
        m.publicUserData?.identifier ||
        uid;
      return [uid, name];
    }),
  );

  const allLabels = useQuery(api.labels.list, isAuthenticated ? {} : "skip") ?? [];

  // Load all conversations for the selected stage — filter assignment client-side
  // so we can show counts on all 3 tabs simultaneously without extra queries.
  const allConversations = useQuery(
    api.inbox.listConversations,
    isAuthenticated
      ? {
          filter: ("filter" in scopeFilter ? scopeFilter.filter : "all") as "all" | "mine" | "unassigned",
          contactStage: stageFilter,
          ...(effectiveChannelId ? { channelId: effectiveChannelId } : {}),
          ...("departmentId" in scopeFilter ? { departmentId: scopeFilter.departmentId } : {}),
          ...("status" in scopeFilter ? { status: scopeFilter.status } : {}),
        }
      : "skip"
  );

  // Derive per-tab counts
  const countAll = allConversations?.length ?? 0;
  const countMine = allConversations?.filter((c) => c.assignedAgentId === userId).length ?? 0;
  const countUnassigned = allConversations?.filter((c) => !c.assignedAgentId).length ?? 0;
  const countUnread = allConversations?.filter((c) => (c.unreadCount ?? 0) > 0).length ?? 0;

  // Apply assignment filter client-side
  const assignmentFiltered = (allConversations ?? []).filter((c) => {
    if (filter === "mine") return c.assignedAgentId === userId;
    if (filter === "unassigned") return !c.assignedAgentId;
    if (filter === "unread") return (c.unreadCount ?? 0) > 0;
    return true;
  });

  // Apply search
  const filtered = assignmentFiltered.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.contactName?.toLowerCase().includes(q) ||
      c.contactPhone?.toLowerCase().includes(q) ||
      c.lastMessagePreview.toLowerCase().includes(q)
    );
  });

  const labelFiltered = labelFilter
    ? filtered.filter((c) => (c.labels ?? []).includes(labelFilter))
    : filtered;

  const tabs: { value: AssignmentFilter; label: string; count: number }[] = [
    { value: "all", label: t("All", "الكل"), count: countAll },
    { value: "mine", label: t("Mine", "محادثاتي"), count: countMine },
    { value: "unassigned", label: t("Unassigned", "غير معينة"), count: countUnassigned },
    { value: "unread", label: t("Unread", "غير مقروء"), count: countUnread },
  ];

  const isRtl = t("ltr", "rtl") === "rtl";

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Search */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute inset-s-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Search...", "ابحث بالاسم أو الرقم")}
            className="ps-8 h-8 text-sm bg-muted/50 border-border/60"
            dir="auto"
          />
        </div>
      </div>

      {/* Assignment filter tabs */}
      <div className="flex gap-1 p-2 border-b overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <Button
            key={tab.value}
            variant={filter === tab.value ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setFilter(tab.value)}
          >
            {tab.label}
            {allConversations !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0 text-[10px] font-semibold leading-4 min-w-4.5 text-center",
                  filter === tab.value
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Stage filter tabs */}
      <div className="flex gap-1 px-2 pt-2 pb-1 border-b overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STAGE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStageFilter(tab.value)}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all whitespace-nowrap",
              stageFilter === tab.value
                ? "bg-primary text-primary-foreground shadow-[var(--shadow-xs)]"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {isRtl ? tab.ar : tab.en}
          </button>
        ))}
      </div>

      {/* Label filter */}
      {allLabels.length > 0 && (
        <div className="flex gap-1 px-2 py-1.5 border-b overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setLabelFilter(null)}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all",
              labelFilter === null
                ? "bg-primary text-primary-foreground shadow-[var(--shadow-xs)]"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {t("All", "الكل")}
          </button>
          {allLabels.map((label) => (
            <button
              key={label._id}
              onClick={() => setLabelFilter(labelFilter === label.name ? null : label.name)}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all flex items-center gap-1",
                labelFilter === label.name
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-xs)]"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {label.emoji && <span>{label.emoji}</span>}
              {translateLabel(label.name)}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {allConversations === undefined ? (
        <div className="p-3 space-y-2 flex-1 min-h-0 overflow-y-auto">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-lg bg-gradient-to-r from-muted via-muted/60 to-muted animate-shimmer"
            />
          ))}
        </div>
      ) : labelFiltered.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm p-4 text-center">
          {search
            ? t("No results", "لا توجد نتائج")
            : t("No conversations", "لا توجد محادثات")}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {labelFiltered.map((conv) => (
            <ConversationListItem
              key={conv.id}
              conversation={{
                _id: conv.id,
                contactName: conv.contactName,
                contactPhone: conv.contactPhone,
                contactAvatarInitials: conv.contactAvatarInitials,
                assignedAgentId: conv.assignedAgentId,
                assignedAgentName: conv.assignedAgentId
                  ? (memberNames[conv.assignedAgentId] ?? undefined)
                  : undefined,
                assignedAgentJobTitle: conv.assignedAgentId
                  ? (jobTitles?.[conv.assignedAgentId] ?? undefined)
                  : undefined,
                lastMessagePreview: conv.lastMessagePreview,
                lastMessageAt: conv.lastMessageAt,
                status: conv.status,
                unreadCount: conv.unreadCount,
                labels: conv.labels,
                slaBreachedAt: conv.slaBreachedAt,
                departmentName: conv.departmentName,
                csatScore: conv.csatScore,
              }}
              isActive={conv.id === activeConversationId}
              onClick={() => onSelect?.(conv.id)}
              onAssignClick={
                onAssignClick ? () => onAssignClick(conv.id) : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
