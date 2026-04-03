"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ConversationList } from "@/components/inbox/conversation-list";
import { ConversationThread } from "@/components/inbox/conversation-thread";
import { MessageInput } from "@/components/inbox/message-input";
import { StatusSelector } from "@/components/inbox/status-selector";
import { AssignAgentDialog } from "@/components/inbox/assign-agent-dialog";
import { QuickReplyPanel } from "@/components/inbox/quick-reply-panel";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";

export default function InboxPage() {
  const { isLoaded, orgId } = useAuth();
  const hasOrg = isLoaded && !!orgId;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<string | undefined>(
    undefined,
  );
  const [statusFilter, setStatusFilter] = useState<
    "open" | "pending" | "resolved" | undefined
  >(undefined);
  const [quickReplyOpen, setQuickReplyOpen] = useState(false);
  const [quickReplyContent, setQuickReplyContent] = useState("");

  const channels = useQuery(api.channels.listForTenant, hasOrg ? {} : "skip") as Array<{
    _id: string;
    displayName: string;
  }> | undefined;

  const selectedConversation = useQuery(
    api.conversations.get,
    selectedId ? { conversationId: selectedId as Id<"conversations"> } : "skip",
  );

  return (
    <>
      <Toaster />
      <QuickReplyPanel
        open={quickReplyOpen}
        onClose={() => setQuickReplyOpen(false)}
        onSelect={(content) => {
          setQuickReplyContent(content);
          setQuickReplyOpen(false);
        }}
      />
      <div className="h-screen flex flex-col">
        <div className="border-b p-2 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 me-auto">
            <Button
              variant={channelFilter === undefined ? "default" : "outline"}
              size="sm"
              onClick={() => setChannelFilter(undefined)}
            >
              الكل / All
            </Button>
            {channels?.map((ch) => (
              <Button
                key={ch._id}
                variant={channelFilter === ch._id ? "default" : "outline"}
                size="sm"
                onClick={() => setChannelFilter(ch._id)}
              >
                {ch.displayName}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant={statusFilter === undefined ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(undefined)}
            >
              الكل / All
            </Button>
            {(["open", "pending", "resolved"] as const).map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setStatusFilter(statusFilter === s ? undefined : s)
                }
              >
                {s === "open"
                  ? "مفتوح"
                  : s === "pending"
                    ? "معلق"
                    : "مغلق"}
              </Button>
            ))}
          </div>
        </div>

        <ResizablePanelGroup
          orientation="horizontal"
          className="flex-1"
        >
          <ResizablePanel defaultSize={30} minSize={20}>
            <ConversationList
              channelId={channelFilter}
              status={statusFilter}
              activeConversationId={selectedId ?? undefined}
              onSelect={setSelectedId}
              orgLoaded={hasOrg}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={70}>
            {selectedId ? (
              <div className="flex flex-col h-full">
                <div className="border-b p-2 flex items-center justify-between">
                  <StatusSelector conversationId={selectedId} />
                  <AssignAgentDialog
                    conversationId={selectedId}
                    currentAssigneeId={
                      selectedConversation?.assignedAgentId ?? undefined
                    }
                  />
                </div>
                <ConversationThread conversationId={selectedId} />
                <MessageInput
                  conversationId={selectedId}
                  onQuickReplyOpen={() => setQuickReplyOpen(true)}
                  quickReplyContent={quickReplyContent}
                  onQuickReplyConsumed={() => setQuickReplyContent("")}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                اختر محادثة / Select a conversation
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </>
  );
}
