"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useOrganization, useUser } from "@/lib/auth-hooks";
import { useT, useLocale, useTranslatedLabel } from "@/lib/i18n/context";
import { MailOpen, MailCheck, AlertTriangle, MoreHorizontal, Trash2, Star } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AVATAR_COLORS: { bg: string; color: string }[] = [
  { bg: "#dbeafe", color: "#1d4ed8" },
  { bg: "#ede9fe", color: "#7c3aed" },
  { bg: "#d1fae5", color: "#047857" },
  { bg: "#fef3c7", color: "#b45309" },
  { bg: "#fee2e2", color: "#b91c1c" },
  { bg: "#e0e7ff", color: "#4338ca" },
  { bg: "#cffafe", color: "#0e7490" },
  { bg: "#fae8ff", color: "#a21caf" },
];

function getAvatarColor(str: string) {
  let hash = 0;
  for (const ch of str) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

interface ConversationItem {
  _id: string;
  contactName?: string;
  contactPhone?: string;
  contactAvatarInitials?: string;
  assignedAgentName?: string;
  assignedAgentJobTitle?: string;
  lastMessagePreview: string;
  lastMessageAt: number;
  status: string;
  unreadCount: number;
  assignedAgentId?: string;
  labels?: string[];
  slaBreachedAt?: number;
  departmentName?: string;
  csatScore?: number;
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
  const { user } = useUser();
  const t = useT();
  const translateLabel = useTranslatedLabel();
  const locale = useLocale();
  const router = useRouter();
  const markAsRead = useMutation(api.inbox.markAsRead);
  const markAsUnread = useMutation(api.inbox.markAsUnread);
  const removeConversation = useMutation(api.conversations.remove);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function handleToggleRead(e: React.MouseEvent) {
    e.stopPropagation();
    const id = conversation._id as Id<"conversations">;
    if (conversation.unreadCount > 0) {
      markAsRead({ conversationId: id }).catch(() => {});
    } else {
      markAsUnread({ conversationId: id }).catch(() => {});
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await removeConversation({ conversationId: conversation._id as Id<"conversations"> });
      setConfirmOpen(false);
      toast.success(t("Conversation deleted", "تم حذف المحادثة"));
      if (isActive) router.push("/inbox");
    } catch (err) {
      console.error("[delete conversation]", err);
      toast.error(t("Failed to delete conversation", "فشل حذف المحادثة"));
      setDeleting(false);
    }
  }

  const isAdmin = membership?.role === "org:admin";

  const isAdminOrSupervisor =
    isAdmin ||
    membership?.role === "org:supervisor";

  const statusLabel =
    conversation.status === "open"
      ? t("Open", "مفتوح")
      : conversation.status === "pending"
        ? t("Pending", "معلق")
        : t("Resolved", "مغلق");

  const statusDotClass =
    conversation.status === "open"
      ? "bg-primary"
      : conversation.status === "pending"
        ? "bg-warning"
        : "bg-muted-foreground/40";

  const displayName = conversation.contactName ?? t("Contact", "عميل");
  const initials =
    conversation.contactAvatarInitials ??
    displayName
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("");

  const avatarColor = getAvatarColor(initials || displayName);
  const timeAgo = formatTimeAgo(conversation.lastMessageAt, locale);

  const borderClass =
    !conversation.assignedAgentId
      ? "border-s-2 border-s-amber-500"
      : conversation.assignedAgentId === user?.id
        ? "border-s-2 border-s-violet-700"
        : "border-s-2 border-s-emerald-600";

  return (
    <>
    <div
      className={cn(
        "group w-full text-start p-3 border-b border-border/60 hover:bg-muted/60 transition-colors cursor-pointer",
        isActive && "bg-accent/40 border-s-2 border-s-primary",
        !isActive && borderClass,
        !conversation.assignedAgentId && !isActive && "bg-(--unassigned-bg)",
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback
            className="text-xs font-semibold"
            style={{ backgroundColor: avatarColor.bg, color: avatarColor.color }}
          >
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Row 1: name + unread badge + time + actions */}
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span
              className="text-sm font-semibold truncate"
              dir="auto"
            >
              {displayName}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {conversation.slaBreachedAt && (
                <span
                  title={t("SLA breach — no reply yet", "انتهاك SLA — لم يتم الرد بعد")}
                  className="inline-flex items-center gap-0.5 rounded-full bg-warning/10 text-warning px-1.5 py-0.5 text-[10px] font-semibold shrink-0"
                >
                  <AlertTriangle className="size-2.5" />
                  SLA
                </span>
              )}
              {conversation.unreadCount > 0 && (
                <Badge className="text-[10px] rounded-full px-1.5 h-4 min-w-4 flex items-center justify-center">
                  {conversation.unreadCount}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
              <button
                onClick={handleToggleRead}
                title={
                  conversation.unreadCount > 0
                    ? t("Mark as read", "تعيين كمقروء")
                    : t("Mark as unread", "تعيين كغير مقروء")
                }
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              >
                {conversation.unreadCount > 0
                  ? <MailOpen className="size-3" />
                  : <MailCheck className="size-3" />}
              </button>
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    onClick={(e) => e.stopPropagation()}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground rounded p-0.5"
                  >
                    <MoreHorizontal className="size-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive gap-2"
                      onSelect={() => setConfirmOpen(true)}
                    >
                      <Trash2 className="size-3.5" />
                      {t("Delete conversation", "حذف المحادثة")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Row 2: last message preview */}
          <p
            className="text-xs text-muted-foreground truncate"
            dir="auto"
          >
            {conversation.lastMessagePreview}
          </p>

          {(conversation.labels ?? []).length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {(conversation.labels ?? []).slice(0, 4).map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-0.5 rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] leading-none text-accent-foreground font-medium max-w-18 truncate"
                >
                  {translateLabel(name)}
                </span>
              ))}
            </div>
          )}

          {/* Row 4: status + department + assigned agent */}
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1 shrink-0">
              <span className={cn("size-1.5 rounded-full shrink-0", statusDotClass)} />
              <span className="text-[10px] text-muted-foreground">{statusLabel}</span>
            </div>
            {typeof conversation.csatScore === "number" && (
              <span
                title={t(
                  `Customer rated ${conversation.csatScore}/5`,
                  `العميل قيّم ${conversation.csatScore}/5`,
                )}
                className="inline-flex items-center gap-0.5 text-[10px] font-medium text-warning"
              >
                <Star className="size-2.5 fill-warning" />
                {conversation.csatScore}/5
              </span>
            )}
            {conversation.departmentName && (
              <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 truncate max-w-20">
                {conversation.departmentName}
              </span>
            )}
            {conversation.assignedAgentId ? (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                <span className="truncate">
                  {conversation.assignedAgentId === user?.id
                    ? t("You", "أنت")
                    : (conversation.assignedAgentName ?? conversation.assignedAgentId)}
                </span>
                {conversation.assignedAgentJobTitle && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="truncate">{conversation.assignedAgentJobTitle}</span>
                  </>
                )}
              </span>
            ) : conversation.departmentName ? (
              <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 truncate">
                <span>⚠</span>
                <span>{t("Unassigned", "غير معين")} · {conversation.departmentName}</span>
              </span>
            ) : (
              <span className="text-[10px] text-[--unassigned-dot]">
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
    {isAdmin && (
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("Delete conversation?", "حذف المحادثة؟")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "This will permanently delete the conversation and all its messages. The contact will not be deleted.",
                "سيتم حذف المحادثة وجميع رسائلها نهائياً. لن يتم حذف جهة الاتصال.",
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
    </>
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
