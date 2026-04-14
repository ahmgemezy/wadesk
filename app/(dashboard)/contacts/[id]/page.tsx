"use client";

import { use, useState } from "react";
import { useQuery, useMutation, usePaginatedQuery, useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ContactTimeline } from "@/components/contacts/contact-timeline";
import { FollowUpModal } from "@/components/contacts/follow-up-modal";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowRight, ArrowLeft, CalendarClock, GlobeIcon, MapPinIcon, TagIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT, useLocale } from "@/lib/i18n/context";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";

const STAGE_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  lead:     { ar: "عميل محتمل", en: "Lead",     color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  prospect: { ar: "مرشح",       en: "Prospect",  color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  customer: { ar: "عميل",       en: "Customer",  color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  retained: { ar: "محتفظ به",   en: "Retained",  color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  churned:  { ar: "مفقود",      en: "Churned",   color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
};

const STAGES = ["lead", "prospect", "customer", "retained", "churned"] as const;
type Stage = typeof STAGES[number];

export default function ContactProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useT();
  const locale = useLocale();
  const { id } = use(params);
  const router = useRouter();
  const isRtl = locale === "ar";
  const dateLocale = isRtl ? ar : enUS;

  const { isAuthenticated } = useConvexAuth();
  const contactId = id as Id<"contacts">;

  const contactData = useQuery(api.contacts.getById, isAuthenticated ? { contactId } : "skip");
  const followUps = useQuery(api.followUps.listByContact, isAuthenticated ? { contactId } : "skip");
  const { results: events, loadMore, status } = usePaginatedQuery(
    api.contactEvents.getTimeline,
    isAuthenticated ? { contactId } : "skip",
    { initialNumItems: 20 }
  );
  const channels = useQuery(api.channels.listForTenant, isAuthenticated ? undefined : "skip");

  const updateStage = useMutation(api.contacts.updateStage);
  const [followUpOpen, setFollowUpOpen] = useState(false);

  if (contactData === undefined) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        {t("Loading...", "جاري التحميل...")}
      </div>
    );
  }

  if (contactData === null) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        {t("Contact not found", "العميل غير موجود")}
      </div>
    );
  }

  const contact = contactData.contact;
  const stage: Stage = (contact.stage as Stage) ?? "lead";
  const stageLabel = STAGE_LABELS[stage];

  const displayName = contact.customName ?? contact.displayName ?? contact.phone;
  const initials = (displayName ?? "?").slice(0, 2).toUpperCase();

  const pendingFollowUps = (followUps ?? []).filter((f) => f.status === "pending");
  const pastFollowUps = (followUps ?? []).filter(
    (f) => f.status !== "pending" && f.status !== "cancelled"
  );

  // Get channelId from existing follow-up, or default to the first available channel
  const channelId = (followUps ?? [])[0]?.channelId as Id<"channels"> | undefined ?? channels?.[0]?._id;

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/contacts")}
          aria-label={t("Back", "رجوع")}
        >
          {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
        </Button>

        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-lg truncate" dir="auto">{displayName}</p>
          {contact.phone && (
            <p className="text-sm text-muted-foreground" dir="ltr">{contact.phone}</p>
          )}
        </div>

        {/* Stage badge */}
        <span className={cn("px-2 py-1 rounded-full text-xs font-medium shrink-0", stageLabel.color)}>
          {isRtl ? stageLabel.ar : stageLabel.en}
        </span>

        {/* Stage changer */}
        <Select value={stage} onValueChange={(v) => void updateStage({ contactId, stage: v as Stage })}>
          <SelectTrigger className="h-8 w-auto text-sm px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {isRtl ? STAGE_LABELS[s].ar : STAGE_LABELS[s].en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={() => {
            if (!channelId) {
              toast.error(t("Please connect a WhatsApp channel first.", "يرجى ربط قناة واتساب أولاً."));
              return;
            }
            setFollowUpOpen(true);
          }}
          size="sm"
          className="shrink-0 gap-2"
        >
          <CalendarClock className="h-4 w-4" />
          {t("Schedule Follow-up", "جدولة متابعة")}
        </Button>
      </div>

      {/* Two-column body */}
      <div className="grid lg:grid-cols-3 gap-0 h-[calc(100vh-73px)]">
        {/* Left: full timeline */}
        <div className="lg:col-span-2 border-e overflow-y-auto p-6">
          <h2 className="font-semibold mb-4">{t("Activity Timeline", "سجل النشاط")}</h2>
          <ContactTimeline events={events} locale={isRtl ? "ar" : "en"} />
          {status === "CanLoadMore" && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full"
              onClick={() => loadMore(20)}
            >
              {t("Load more", "تحميل المزيد")}
            </Button>
          )}
        </div>

        {/* Right: details + follow-ups */}
        <div className="overflow-y-auto p-6 space-y-6">

          {/* Contact details */}
          {(contact.country || contact.city || contact.tags?.length > 0 || contact.notes) && (
            <div>
              <h3 className="font-medium text-sm mb-3">{t("Details", "التفاصيل")}</h3>
              <div className="space-y-2 text-sm">
                {contact.country && (
                  <div className="flex items-center gap-2">
                    <GlobeIcon className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">{t("Country", "الدولة")}:</span>
                    <span>{contact.country}</span>
                  </div>
                )}
                {contact.city && (
                  <div className="flex items-center gap-2">
                    <MapPinIcon className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">{t("City", "المدينة")}:</span>
                    <span>{contact.city}</span>
                  </div>
                )}
                {contact.tags?.length > 0 && (
                  <div className="flex items-start gap-2">
                    <TagIcon className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{t("Tags", "الوسوم")}:</span>
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.map((tag) => (
                        <span key={tag} className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {contact.notes && (
                  <div className="mt-2 p-3 bg-muted rounded-lg text-sm text-muted-foreground whitespace-pre-wrap">
                    {contact.notes}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stats */}
          <div>
            <h3 className="font-medium text-sm mb-3">{t("Stats", "الإحصائيات")}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("Conversations", "المحادثات")}</span>
                <span>{contactData.conversationCount ?? 0}</span>
              </div>
              {contact.firstSeenAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("First contact", "أول تواصل")}</span>
                  <span dir="ltr">{new Date(contact.firstSeenAt).toLocaleDateString()}</span>
                </div>
              )}
              {contact.lastSeenAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("Last contact", "آخر تواصل")}</span>
                  <span>
                    {formatDistanceToNow(new Date(contact.lastSeenAt), {
                      addSuffix: true,
                      locale: dateLocale,
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Pending follow-ups */}
          {pendingFollowUps.length > 0 && (
            <div>
              <h3 className="font-medium text-sm mb-3">
                {t("Pending Follow-ups", "المتابعات المعلقة")}
              </h3>
              <ul className="space-y-2">
                {pendingFollowUps.map((f) => (
                  <li key={f._id} className="text-sm border rounded p-3 space-y-1">
                    <p className="font-medium">
                      {new Date(f.scheduledAt).toLocaleString()}
                    </p>
                    <p className="text-muted-foreground line-clamp-2">{f.whatsappMessage}</p>
                    {f.expectedRevenue && (
                      <p className="text-xs text-muted-foreground">
                        {f.expectedRevenue} {f.currency}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Past follow-ups */}
          {pastFollowUps.length > 0 && (
            <div>
              <h3 className="font-medium text-sm mb-3">
                {t("Past Follow-ups", "المتابعات السابقة")}
              </h3>
              <ul className="space-y-2">
                {pastFollowUps.map((f) => (
                  <li
                    key={f._id}
                    className="text-sm border rounded p-3 space-y-1 opacity-70"
                  >
                    <p className="font-medium capitalize">
                      {f.status} — {new Date(f.scheduledAt).toLocaleString()}
                    </p>
                    <p className="text-muted-foreground line-clamp-1">{f.whatsappMessage}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Follow-up modal */}
      {followUpOpen && channelId && (
        <FollowUpModal
          open={followUpOpen}
          onClose={() => setFollowUpOpen(false)}
          contactId={contactId}
          channelId={channelId}
          locale={isRtl ? "ar" : "en"}
        />
      )}
    </div>
  );
}
