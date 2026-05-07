"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ConversationList } from "@/components/inbox/conversation-list";
import { InboxQueueTree } from "@/components/inbox/inbox-queue-tree";
import { ConversationThread } from "@/components/inbox/conversation-thread";
import { MessageInput } from "@/components/inbox/message-input";
import { StatusSelector } from "@/components/inbox/status-selector";
import { TransferPicker } from "@/components/inbox/transfer-picker";
import { QuickReplyPanel } from "@/components/inbox/quick-reply-panel";
import { ContactPanel } from "@/components/contacts/contact-panel";
import { SeedButton } from "@/components/dev/seed-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";
import { useOrganization } from "@/lib/auth-hooks";

export default function InboxPage() {
  return (
    <Suspense fallback={null}>
      <InboxPageInner />
    </Suspense>
  );
}

function InboxPageInner() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFromUrl = searchParams.get("c");
  const [selectedId, setSelectedId] = useState<string | null>(initialFromUrl);
  const [quickReplyOpen, setQuickReplyOpen] = useState(false);

  useEffect(() => {
    const c = searchParams.get("c");
    if (c && c !== selectedId) {
      setSelectedId(c);
    }
  }, [searchParams, selectedId]);
  const [quickReplyContent, setQuickReplyContent] = useState("");
  const [replyTo, setReplyTo] = useState<{
    messageId: string;
    content: string;
    authorLabel: string;
  } | null>(null);

  const markAsRead = useMutation(api.inbox.markAsRead);

  const { isAuthenticated } = useConvexAuth();
  const { membership } = useOrganization();
  const orgRole = membership?.role as string | undefined;
  const isPrivileged = orgRole === "org:admin" || orgRole === "admin" || orgRole === "org:supervisor";

  // On mobile we show either the list or the chat panel, not both.
  const showListOnMobile = selectedId === null;

  const selectedConversation = useQuery(
    api.conversations.get,
    selectedId ? { conversationId: selectedId as Id<"conversations"> } : "skip",
  );

  // Get conversation list to pull contact info for the top bar
  const convList = useQuery(api.inbox.listConversations, isAuthenticated ? { filter: "all" } : "skip");
  const activeConv = convList?.find((c) => c.id === selectedId);

  const contactName = activeConv?.contactName;
  const contactPhone = activeConv?.contactPhone;
  const contactInitials = activeConv?.contactAvatarInitials;

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      const params = new URLSearchParams(searchParams.toString());
      params.set("c", id);
      router.replace(`/inbox?${params.toString()}`, { scroll: false });
      markAsRead({ conversationId: id as Id<"conversations"> }).catch(() => {
        // non-critical — ignore
      });
    },
    [markAsRead, router, searchParams],
  );

  const handleBack = () => {
    setSelectedId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("c");
    const qs = params.toString();
    router.replace(qs ? `/inbox?${qs}` : "/inbox", { scroll: false });
  };

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
        contactContext={{
          ...(contactName ? { name: contactName } : {}),
          ...(contactPhone ? { phone: contactPhone } : {}),
        }}
      />

      <div className="flex h-full overflow-hidden">
        {/* ── Conversation List column ────────────────────────────────── */}
        <div
          className={cn(
            // Mobile: full-width, hide when a conversation is open
            "w-full shrink-0 border-e flex flex-col",
            // Desktop: fixed ~320px, always visible
            "md:w-80 md:block",
            // Mobile visibility toggle
            showListOnMobile ? "block" : "hidden md:flex",
          )}
        >
          <InboxQueueTree />
          <ConversationList
            activeConversationId={selectedId ?? undefined}
            onSelect={handleSelect}
          />
        </div>

        {/* ── Chat Panel column ───────────────────────────────────────── */}
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0",
            // Mobile: hidden when list is shown
            showListOnMobile ? "hidden md:flex" : "flex",
          )}
        >
          {selectedId ? (
            <>
              {/* Top bar */}
              <div className="border-b px-3 py-2 flex items-center gap-2 shrink-0">
                {/* Back button — mobile only */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden shrink-0"
                  onClick={handleBack}
                  aria-label={t("Back", "رجوع")}
                >
                  <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                </Button>

                {/* Contact avatar + info */}
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs">
                    {contactInitials ?? "؟"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-semibold truncate leading-tight"
                    dir="auto"
                  >
                    {contactName ?? t("Contact", "عميل")}
                  </p>
                  {contactPhone && (
                    <p
                      className="text-[10px] text-muted-foreground leading-tight"
                      dir="ltr"
                    >
                      {contactPhone}
                    </p>
                  )}
                </div>

                {/* Dev seed button */}
                <SeedButton />

                {/* Controls */}
                {selectedConversation?.status !== "forwarded" && selectedConversation?.channelId && (
                  <>
                    <StatusSelector conversationId={selectedId} />
                    <TransferPicker
                      conversationId={selectedId as Id<"conversations">}
                      channelId={selectedConversation.channelId as Id<"channels">}
                      currentAssigneeId={selectedConversation.assignedAgentId ?? undefined}
                      currentDepartmentId={selectedConversation.departmentId as Id<"departments"> | undefined}
                    />
                  </>
                )}
              </div>

              {/* Message thread + composer */}
              <div className="flex flex-1 min-h-0">
                <div className="flex flex-col flex-1 min-w-0 min-h-0">
                  <ConversationThread conversationId={selectedId} replyTo={replyTo} onSetReplyTo={setReplyTo} />
                  <MessageInput
                    conversationId={selectedId}
                    onQuickReplyOpen={() => setQuickReplyOpen(true)}
                    quickReplyContent={quickReplyContent}
                    onQuickReplyConsumed={() => setQuickReplyContent("")}
                    replyTo={replyTo}
                    onClearReply={() => setReplyTo(null)}
                    isLocked={
                      !selectedConversation?.assignedAgentId &&
                      (!!selectedConversation?.departmentId || selectedConversation?.assignmentType === "unassigned")
                    }
                    isPrivileged={isPrivileged}
                    isForwarded={selectedConversation?.status === "forwarded"}
                  />
                </div>

                {/* Contact side panel — desktop only, only when real contact exists */}
                {selectedConversation?.contactId && (
                  <div className="hidden lg:block w-72 border-s overflow-y-auto shrink-0">
                    <ContactPanel
                      contactId={
                        selectedConversation.contactId as Id<"contacts">
                      }
                      channelId={
                        selectedConversation.channelId as Id<"channels">
                      }
                      conversationId={selectedId as Id<"conversations">}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {t("Select a conversation", "اختر محادثة")}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
