"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useParams } from "next/navigation";
import { ConversationThread } from "@/components/inbox/conversation-thread";
import { MessageInput } from "@/components/inbox/message-input";
import { StatusSelector } from "@/components/inbox/status-selector";
import { AssignAgentDialog } from "@/components/inbox/assign-agent-dialog";
import { TransferDepartmentDialog } from "@/components/inbox/transfer-department-dialog";
import { useState } from "react";
import { QuickReplyPanel } from "@/components/inbox/quick-reply-panel";
import { useT } from "@/lib/i18n/context";

export default function ConversationPage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const conversationId = params.id;
  const [quickReplyOpen, setQuickReplyOpen] = useState(false);
  const [quickReplyContent, setQuickReplyContent] = useState("");
  const [replyTo, setReplyTo] = useState<{
    messageId: string;
    content: string;
    authorLabel: string;
  } | null>(null);

  const conversation = useQuery(api.conversations.get, {
    conversationId: conversationId as Id<"conversations">,
  });

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        {!conversation && t("Loading...", "جاري التحميل...")}
      </div>
    );
  }

  return (
    <>
      <QuickReplyPanel
        open={quickReplyOpen}
        onClose={() => setQuickReplyOpen(false)}
        onSelect={(content) => {
          setQuickReplyContent(content);
          setQuickReplyOpen(false);
        }}
      />
      <div className="flex flex-col h-full">
        <div className="border-b px-4 py-2.5 flex items-center justify-between gap-3 bg-background shrink-0 min-h-[52px]">
          <div className="flex items-center gap-2 min-w-0">
            <StatusSelector conversationId={conversationId} />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {conversation.channelId && (
              <TransferDepartmentDialog
                conversationId={conversationId}
                channelId={conversation.channelId as string}
                currentDepartmentId={conversation.departmentId ? (conversation.departmentId as string) : undefined}
              />
            )}
            <AssignAgentDialog
              conversationId={conversationId}
              currentAssigneeId={conversation.assignedAgentId ?? undefined}
            />
          </div>
        </div>
        <ConversationThread conversationId={conversationId} replyTo={replyTo} onSetReplyTo={setReplyTo} />
        <MessageInput
          conversationId={conversationId}
          onQuickReplyOpen={() => setQuickReplyOpen(true)}
          quickReplyContent={quickReplyContent}
          onQuickReplyConsumed={() => setQuickReplyContent("")}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
        />
      </div>
    </>
  );
}
