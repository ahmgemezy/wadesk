"use client";

import { useState } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { format } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { CalendarClock, ChevronLeft, MapPinIcon, GlobeIcon, TagIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DT } from "@/lib/design-tokens";
import { ContactTimeline } from "./contact-timeline";
import { FollowUpModal } from "./follow-up-modal";

// ---------------------------------------------------------------------------
// Stage labels
// ---------------------------------------------------------------------------

const STAGE_LABELS: Record<string, { ar: string; en: string; color: string }> =
  {
    lead: {
      ar: "عميل محتمل",
      en: "Lead",
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    },
    prospect: {
      ar: "مرشح",
      en: "Prospect",
      color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    },
    customer: {
      ar: "عميل",
      en: "Customer",
      color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    },
    retained: {
      ar: "محتفظ به",
      en: "Retained",
      color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    },
    churned: {
      ar: "مفقود",
      en: "Churned",
      color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    },
  };

// ---------------------------------------------------------------------------
// i18n strings
// ---------------------------------------------------------------------------

const TL = {
  ar: {
    notFound: "لم يتم العثور على جهة الاتصال",
    details: "التفاصيل",
    country: "الدولة",
    city: "المدينة",
    tags: "الوسوم",
    noTags: "لا توجد وسوم",
    stage: "المرحلة",
    notes: "ملاحظات",
    notesPlaceholder: "أضف ملاحظات عن جهة الاتصال...",
    stats: "إحصائيات",
    totalConversations: "المحادثات",
    firstContact: "أول تواصل",
    lastContact: "آخر تواصل",
    followUps: "المتابعات المعلقة",
    noFollowUps: "لا توجد متابعات معلقة",
    scheduleFollowUp: "جدولة متابعة",
    timeline: "النشاط الأخير",
    viewFull: "عرض الملف كاملاً ←",
    loading: "جارٍ التحميل...",
  },
  en: {
    notFound: "Contact not found",
    details: "Details",
    country: "Country",
    city: "City",
    tags: "Tags",
    noTags: "No tags",
    stage: "Stage",
    notes: "Notes",
    notesPlaceholder: "Add notes about this contact...",
    stats: "Stats",
    totalConversations: "Conversations",
    firstContact: "First Contact",
    lastContact: "Last Contact",
    followUps: "Pending Follow-ups",
    noFollowUps: "No pending follow-ups",
    scheduleFollowUp: "Schedule Follow-up",
    timeline: "Recent Activity",
    viewFull: "View full profile →",
    loading: "Loading...",
  },
} as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  contactId: Id<"contacts"> | null;
  channelId: Id<"channels"> | null;
  open: boolean;
  onClose: () => void;
  locale: "ar" | "en";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContactSidePanel({
  contactId,
  channelId,
  open,
  onClose,
  locale,
}: Props) {
  const t = TL[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const side = locale === "ar" ? "left" : "right";
  const dateLocale = locale === "ar" ? arLocale : enUS;

  // Queries
  const data = useQuery(
    api.contacts.getById,
    contactId ? { contactId } : "skip",
  );
  const followUps = useQuery(
    api.followUps.listByContact,
    contactId ? { contactId } : "skip",
  );
  const { results: timelineEvents } = usePaginatedQuery(
    api.contactEvents.getTimeline,
    contactId ? { contactId } : "skip",
    { initialNumItems: 5 },
  );

  // Mutations
  const updateContact = useMutation(api.contacts.update);
  const updateStage = useMutation(api.contacts.updateStage);

  // Local state
  const [notes, setNotes] = useState<string>("");
  const [notesInitialized, setNotesInitialized] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);

  // Init notes from server when data loads
  if (data && !notesInitialized) {
    setNotes(data.contact.notes ?? "");
    setNotesInitialized(true);
  }
  // Reset when contact changes
  const [lastContactId, setLastContactId] = useState<
    Id<"contacts"> | null
  >(null);
  if (contactId !== lastContactId) {
    setLastContactId(contactId);
    setNotesInitialized(false);
  }

  // Derived values
  const contact = data?.contact;
  const pendingFollowUps = (followUps ?? []).filter(
    (f) => f.status === "pending",
  );
  const stage = contact?.stage ?? "lead";
  const stageLabel = STAGE_LABELS[stage];
  const displayName =
    contact?.customName ?? contact?.displayName ?? "";
  const initials = displayName
    ? displayName
        .split(" ")
        .slice(0, 2)
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  const formatDate = (ts: number | undefined) => {
    if (!ts) return "—";
    return format(new Date(ts), "PP", { locale: dateLocale });
  };

  const handleStageChange = async (newStage: string) => {
    if (!contactId) return;
    await updateStage({ contactId, stage: newStage as "lead" | "prospect" | "customer" | "retained" | "churned" });
  };

  const handleNotesBlur = async () => {
    if (!contactId || !data) return;
    if (notes === (data.contact.notes ?? "")) return;
    await updateContact({ contactId, notes });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
        <SheetContent side={side} className="w-full sm:max-w-md overflow-y-auto p-0" showCloseButton>
          <div dir={dir} className="flex flex-col h-full">
            {/* Header */}
            <SheetHeader className="p-4 border-b">
              {contact ? (
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <SheetTitle className="text-base font-semibold truncate">
                      {displayName || contact.phone}
                    </SheetTitle>
                    <p className="text-sm text-muted-foreground" dir="ltr">
                      {contact.phone}
                    </p>
                  </div>
                </div>
              ) : (
                <SheetTitle>{t.loading}</SheetTitle>
              )}
            </SheetHeader>

            {!contact && (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-4">
                {data === null ? t.notFound : t.loading}
              </div>
            )}

            {contact && (
              <div className="flex-1 flex flex-col gap-0 overflow-y-auto">

                {/* Details: country, city, tags */}
                <section className="p-4 border-b space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t.details}
                  </p>
                  <div className="flex flex-col gap-2">
                    {contact.country && (
                      <div className="flex items-center gap-2 text-sm">
                        <GlobeIcon className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">{t.country}:</span>
                        <span className="font-medium">{contact.country}</span>
                      </div>
                    )}
                    {contact.city && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPinIcon className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">{t.city}:</span>
                        <span className="font-medium">{contact.city}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2 text-sm">
                      <TagIcon className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{t.tags}:</span>
                      {contact.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.map((tag) => (
                            <span
                              key={tag}
                              className={DT.BADGE_NEUTRAL}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-xs">{t.noTags}</span>
                      )}
                    </div>
                  </div>
                </section>

                {/* Stage */}
                <section className="p-4 border-b space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t.stage}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`${stageLabel?.color ?? ""} text-xs px-2 py-1 rounded-full`}>
                      {stageLabel?.[locale] ?? stage}
                    </span>
                    <Select value={stage ?? "lead"} onValueChange={(v) => v && void handleStageChange(v)}>
                      <SelectTrigger className="ms-auto h-7 w-auto text-xs px-2 py-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STAGE_LABELS).map(([key, val]) => (
                          <SelectItem key={key} value={key} className="text-xs">
                            {val[locale]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </section>

                {/* Notes */}
                <section className="p-4 border-b space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t.notes}
                  </p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={() => void handleNotesBlur()}
                    placeholder={t.notesPlaceholder}
                    className={`${DT.TEXTAREA} min-h-20 resize-none`}
                    dir={dir}
                  />
                </section>

                {/* Stats */}
                <section className="p-4 border-b space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t.stats}
                  </p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-lg font-semibold">
                        {data.conversationCount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.totalConversations}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {formatDate(contact.firstSeenAt)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.firstContact}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {formatDate(contact.lastSeenAt)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.lastContact}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Follow-ups */}
                <section className="p-4 border-b space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t.followUps}
                    </p>
                    <button
                      className={`${DT.BTN_OUTLINE} text-xs h-7`}
                      onClick={() => setFollowUpOpen(true)}
                    >
                      <CalendarClock className="h-3 w-3 me-1" />
                      {t.scheduleFollowUp}
                    </button>
                  </div>
                  {pendingFollowUps.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t.noFollowUps}</p>
                  ) : (
                    <ul className="space-y-1">
                      {pendingFollowUps.map((f) => (
                        <li
                          key={f._id}
                          className="text-xs bg-muted rounded px-3 py-2 flex items-center justify-between gap-2"
                        >
                          <span className="truncate">{f.note ?? ""}</span>
                          <span className="text-muted-foreground shrink-0">
                            {formatDate(f.scheduledAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* Timeline */}
                <section className="p-4 border-b space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t.timeline}
                  </p>
                  {timelineEvents.length > 0 ? (
                    <ContactTimeline
                      events={timelineEvents}
                      locale={locale}
                      compact
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">—</p>
                  )}
                </section>

                {/* View full profile link */}
                <div className="p-4">
                  <Link
                    href={`/contacts/${contactId}`}
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    {locale === "ar" ? (
                      <>
                        <ChevronLeft className="h-4 w-4" />
                        {t.viewFull}
                      </>
                    ) : (
                      <>
                        {t.viewFull}
                      </>
                    )}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Follow-up modal */}
      {contactId && channelId && (
        <FollowUpModal
          open={followUpOpen}
          onClose={() => setFollowUpOpen(false)}
          contactId={contactId}
          channelId={channelId}
          locale={locale}
        />
      )}
    </>
  );
}
