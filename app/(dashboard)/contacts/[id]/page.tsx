"use client";

import { use, useState } from "react";
import { useQuery, useMutation, usePaginatedQuery, useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ContactTimeline } from "@/components/contacts/contact-timeline";
import { CustomerJourneyMap } from "@/components/contacts/customer-journey-map";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight,
  ArrowLeft,
  CalendarClock,
  GlobeIcon,
  MapPinIcon,
  TagIcon,
  ActivityIcon,
  SmileIcon,
  FrownIcon,
  MehIcon,
} from "lucide-react";
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
  const insightsData = useQuery(api.customerInsights.getContactInsights, isAuthenticated ? { contactId } : "skip");
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

  const channelId = (followUps ?? [])[0]?.channelId as Id<"channels"> | undefined ?? channels?.[0]?._id;

  // Sentiment Helper
  const getSentimentDetails = (sentiment: string | null) => {
    switch (sentiment) {
      case "positive": return { icon: <SmileIcon className="size-4 text-emerald-500" />, label: t("Positive", "إيجابي"), color: "bg-emerald-500/10 text-emerald-500" };
      case "negative": return { icon: <FrownIcon className="size-4 text-red-500" />, label: t("Negative", "سلبي"), color: "bg-red-500/10 text-red-500" };
      case "neutral": return { icon: <MehIcon className="size-4 text-amber-500" />, label: t("Neutral", "محايد"), color: "bg-amber-500/10 text-amber-500" };
      default: return { icon: <MehIcon className="size-4 text-muted-foreground" />, label: t("Unknown", "غير معروف"), color: "bg-muted text-muted-foreground" };
    }
  };

  const sentiment = getSentimentDetails(insightsData?.sentimentOverall ?? null);
  const healthScore = insightsData?.healthScore ?? null;

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-muted/10">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/contacts")}
          aria-label={t("Back", "رجوع")}
          className="shrink-0"
        >
          {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
        </Button>

        <Avatar className="h-10 w-10 shrink-0 ring-2 ring-background shadow-sm">
          <AvatarFallback className="bg-primary/5 text-primary font-semibold">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-lg truncate text-foreground" dir="auto">{displayName}</p>
          {contact.phone && (
            <p className="text-sm text-muted-foreground font-medium" dir="ltr">{contact.phone}</p>
          )}
        </div>

        <Badge variant="secondary" className="px-3 py-1 font-semibold text-xs shrink-0 capitalize shadow-none border-border/50">
          {isRtl ? stageLabel.ar : stageLabel.en}
        </Badge>

        <Select value={stage} onValueChange={(v) => void updateStage({ contactId, stage: v as Stage })}>
          <SelectTrigger className="h-9 w-32 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAGES.map((s) => (
              <SelectItem key={s} value={s} className="font-medium">
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
          className="shrink-0 gap-2 shadow-sm"
        >
          <CalendarClock className="h-4 w-4" />
          {t("Schedule Follow-up", "جدولة متابعة")}
        </Button>
      </div>

      <div className="p-6">
        <div className="grid lg:grid-cols-3 gap-6 max-w-7xl mx-auto items-start">
          
          {/* Left Column: Insights & Details */}
          <div className="space-y-6">
            
            {/* Insights Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ActivityIcon className="size-4 text-primary" />
                  {t("Customer Insights", "رؤى العميل")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Health Score */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("Health Score", "درجة الصحة")}
                  </span>
                  {healthScore !== null ? (
                    <div className="flex items-center gap-3">
                      <div className="text-3xl font-bold tracking-tight text-foreground">{healthScore}</div>
                      <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-500", 
                            healthScore > 70 ? "bg-emerald-500" : healthScore > 40 ? "bg-amber-500" : "bg-red-500"
                          )} 
                          style={{ width: `${healthScore}%` }} 
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("No data available", "لا توجد بيانات")}</p>
                  )}
                </div>

                {/* Sentiment */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-border/50">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("Overall Sentiment", "الانطباع العام")}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium", sentiment.color)}>
                      {sentiment.icon}
                      {sentiment.label}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Details Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">{t("Profile Details", "تفاصيل الملف الشخصي")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {(contact.country || contact.city) ? (
                  <div className="space-y-3">
                    {contact.country && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <GlobeIcon className="size-4 shrink-0" />
                          <span>{t("Country", "الدولة")}</span>
                        </div>
                        <span className="font-medium text-foreground">{contact.country}</span>
                      </div>
                    )}
                    {contact.city && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPinIcon className="size-4 shrink-0" />
                          <span>{t("City", "المدينة")}</span>
                        </div>
                        <span className="font-medium text-foreground">{contact.city}</span>
                      </div>
                    )}
                  </div>
                ) : null}

                {contact.tags?.length > 0 && (
                  <div className="pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2 text-muted-foreground mb-3">
                      <TagIcon className="size-4 shrink-0" />
                      <span>{t("Tags", "الوسوم")}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {contact.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="font-normal text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {contact.notes && (
                  <div className="pt-2 border-t border-border/50">
                    <span className="text-muted-foreground mb-2 block">{t("Notes", "ملاحظات")}</span>
                    <p className="p-3 bg-[#f1f5f9] dark:bg-muted/50 rounded-md text-sm text-foreground whitespace-pre-wrap leading-relaxed shadow-inner">
                      {contact.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats Summary */}
            <Card>
              <CardContent className="p-0 flex divide-x divide-border">
                <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-bold tracking-tight">{contactData.conversationCount ?? 0}</span>
                  <span className="text-xs text-muted-foreground mt-1">{t("Conversations", "محادثات")}</span>
                </div>
                {contact.lastSeenAt && (
                  <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-sm font-semibold truncate w-full" title={new Date(contact.lastSeenAt).toLocaleDateString()}>
                      {formatDistanceToNow(new Date(contact.lastSeenAt), { locale: dateLocale })}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">{t("Last Active", "آخر نشاط")}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Timeline & Journeys */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="min-h-[600px] flex flex-col">
              <Tabs defaultValue="journey" className="flex flex-col flex-1">
                <div className="border-b px-6 py-3">
                  <TabsList className="bg-muted/50">
                    <TabsTrigger value="journey" className="text-xs font-medium">
                      {t("Journey Map", "خريطة الرحلة")}
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="text-xs font-medium">
                      {t("Detailed Activity", "النشاط المفصل")}
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <CardContent className="flex-1 p-6 overflow-y-auto">
                  <TabsContent value="journey" className="mt-0 h-full">
                    <CustomerJourneyMap contactId={contactId} locale={isRtl ? "ar" : "en"} />
                  </TabsContent>
                  
                  <TabsContent value="activity" className="mt-0 h-full">
                    <ContactTimeline events={events} locale={isRtl ? "ar" : "en"} />
                    {status === "CanLoadMore" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-6 w-full shadow-sm"
                        onClick={() => loadMore(20)}
                      >
                        {t("Load more", "تحميل المزيد")}
                      </Button>
                    )}
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>

            {/* Follow-ups Grid */}
            {(pendingFollowUps.length > 0 || pastFollowUps.length > 0) && (
              <div className="grid sm:grid-cols-2 gap-4">
                {pendingFollowUps.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-primary">
                        {t("Pending Follow-ups", "المتابعات المعلقة")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {pendingFollowUps.map((f) => (
                          <li key={f._id} className="text-sm border border-border/60 bg-muted/10 rounded-md p-3 space-y-1.5 shadow-sm">
                            <p className="font-medium text-foreground">
                              {new Date(f.scheduledAt).toLocaleString(dateLocale.code)}
                            </p>
                            <p className="text-muted-foreground line-clamp-2 leading-relaxed">{f.whatsappMessage}</p>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {pastFollowUps.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-muted-foreground">
                        {t("Past Follow-ups", "المتابعات السابقة")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {pastFollowUps.slice(0, 3).map((f) => (
                          <li key={f._id} className="text-sm border border-transparent bg-muted/40 rounded-md p-3 space-y-1.5">
                            <p className="font-medium text-muted-foreground capitalize flex justify-between">
                              <span>{f.status}</span>
                              <span className="text-xs opacity-70">{new Date(f.scheduledAt).toLocaleDateString(dateLocale.code)}</span>
                            </p>
                            <p className="text-muted-foreground line-clamp-1">{f.whatsappMessage}</p>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
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
