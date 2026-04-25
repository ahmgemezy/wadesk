"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { ConversationThread } from "@/components/inbox/conversation-thread";
import { MessageInput } from "@/components/inbox/message-input";
import { StatusSelector } from "@/components/inbox/status-selector";
import { AssignAgentDialog } from "@/components/inbox/assign-agent-dialog";
import { TransferDepartmentDialog } from "@/components/inbox/transfer-department-dialog";
import { useState } from "react";
import { QuickReplyPanel } from "@/components/inbox/quick-reply-panel";
import { useT } from "@/lib/i18n/context";
import { useOrganization } from "@clerk/nextjs";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function ConversationPage() {
  const t = useT();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const conversationId = params.id;
  const [quickReplyOpen, setQuickReplyOpen] = useState(false);
  const [quickReplyContent, setQuickReplyContent] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [replyTo, setReplyTo] = useState<{
    messageId: string;
    content: string;
    authorLabel: string;
  } | null>(null);

  const { membership } = useOrganization();
  const isAdmin = membership?.role === "org:admin" || membership?.role === "admin";

  const removeConversation = useMutation(api.conversations.remove);

  const conversation = useQuery(api.conversations.get, {
    conversationId: conversationId as Id<"conversations">,
  });

  async function handleDelete() {
    setDeleting(true);
    try {
      await removeConversation({ conversationId: conversationId as Id<"conversations"> });
      toast.success(t("Conversation deleted", "تم حذف المحادثة"));
      router.push("/inbox");
    } catch {
      toast.error(t("Failed to delete conversation", "فشل حذف المحادثة"));
      setDeleting(false);
    }
  }

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
            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 size-8">
                      <Trash2 className="size-4" />
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("Delete conversation?", "حذف المحادثة؟")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t(
                        "This will permanently delete the conversation and all its messages. This action cannot be undone.",
                        "سيتم حذف المحادثة وجميع رسائلها نهائياً. لا يمكن التراجع عن هذا الإجراء.",
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("Cancel", "إلغاء")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? t("Deleting...", "جاري الحذف...") : t("Delete", "حذف")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
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
