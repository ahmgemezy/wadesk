"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CheckIcon, MegaphoneIcon, RefreshCwIcon, XIcon } from "lucide-react";
import { WhatsAppTemplatePreview } from "./whatsapp-template-preview";
import type { TemplateComponent } from "./whatsapp-template-preview";

const t = {
  ar: {
    title: "إنشاء حملة جديدة",
    step1: "الجمهور",
    step2: "الرسالة",
    step3: "مراجعة وإرسال",
    selectList: "اختر القائمة",
    selectChannel: "اختر رقم WhatsApp",
    selectTemplate: "اختر قالب الرسالة",
    campaignName: "اسم الحملة",
    campaignNamePlaceholder: "مثال: عرض رمضان 2026",
    contacts: "جهة اتصال",
    approved: "معتمد",
    next: "التالي",
    back: "السابق",
    send: "إرسال الحملة",
    sending: "جاري الإرسال...",
    noTemplates: "لا توجد قوالب لهذا الرقم",
    loadingTemplates: "جاري تحميل القوالب...",
    summary: "ملخص الحملة",
    audience: "الجمهور",
    message: "القالب",
    channel: "رقم الإرسال",
    warning: "\u26A0\uFE0F هذا القالب غير معتمد من Meta بعد — قد لا يُرسل بنجاح.",
    success: "تم إرسال الحملة بنجاح!",
    nameRequired: "اسم الحملة مطلوب",
    cancel: "إلغاء",
  },
  en: {
    title: "New Broadcast Campaign",
    step1: "Audience",
    step2: "Message",
    step3: "Review & Send",
    selectList: "Select a list",
    selectChannel: "Select WhatsApp number",
    selectTemplate: "Select message template",
    campaignName: "Campaign name",
    campaignNamePlaceholder: "e.g. Ramadan Offer 2026",
    contacts: "contacts",
    approved: "Approved",
    next: "Next",
    back: "Back",
    send: "Send Campaign",
    sending: "Sending...",
    noTemplates: "No templates found for this number",
    loadingTemplates: "Loading templates...",
    summary: "Campaign Summary",
    audience: "Audience",
    message: "Template",
    channel: "Sending from",
    warning: "\u26A0\uFE0F This template is not yet approved by Meta — it may not send successfully.",
    success: "Campaign sent successfully!",
    nameRequired: "Campaign name is required",
    cancel: "Cancel",
  },
};

type Template = {
  name: string;
  language: string;
  status: string;
  category?: string;
  components: TemplateComponent[];
};

function TemplateStatusBadge({ status, locale }: { status: string; locale: "ar" | "en" }) {
  const labels: Record<string, { en: string; ar: string; cls: string }> = {
    APPROVED: { en: "Approved", ar: "معتمد", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    PENDING: { en: "Pending", ar: "قيد المراجعة", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    REJECTED: { en: "Rejected", ar: "مرفوض", cls: "bg-red-100 text-red-700 border-red-200" },
    PAUSED: { en: "Paused", ar: "موقوف", cls: "bg-gray-100 text-gray-600 border-gray-200" },
    FLAGGED: { en: "Flagged", ar: "مُبلَّغ عنه", cls: "bg-orange-100 text-orange-700 border-orange-200" },
  };
  const cfg = labels[status] ?? { en: status, ar: status, cls: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${cfg.cls}`}>
      {locale === "ar" ? cfg.ar : cfg.en}
    </span>
  );
}

type Props = {
  locale: "ar" | "en";
  initialListId?: Id<"contactLists">;
};

export function CreateBroadcastWizard({ locale, initialListId }: Props) {
  const tx = t[locale];
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState(false);
  const [selectedListId, setSelectedListId] = useState<Id<"contactLists"> | undefined>(initialListId);
  const [selectedChannelId, setSelectedChannelId] = useState<Id<"channels"> | undefined>();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const lists = useQuery(api.contactLists.listForTenant);
  const channels = useQuery(api.channels.listForTenant);
  const selectedListStats = useQuery(
    api.contactLists.getStats,
    selectedListId ? { listId: selectedListId } : "skip",
  );

  const createBroadcast = useMutation(api.broadcasts.create);
  const sendBroadcast = useAction(api.broadcasts.send);
  const syncTemplatesAction = useAction(api.metaTemplates.syncFromMeta);

  async function loadTemplates(channelId: Id<"channels">) {
    setLoadingTemplates(true);
    try {
      const result = await syncTemplatesAction({ channelId });
      setTemplates(result as Template[]);
    } catch {
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  }

  async function handleChannelSelect(channelId: Id<"channels">) {
    setSelectedChannelId(channelId);
    setSelectedTemplate(null);
    setTemplates([]);
    await loadTemplates(channelId);
  }

  async function handleSend() {
    if (!name.trim()) { setNameError(true); return; }
    if (!selectedListId || !selectedChannelId || !selectedTemplate) return;

    setSending(true);
    try {
      const broadcastId = await createBroadcast({
        name: name.trim(),
        listId: selectedListId,
        channelId: selectedChannelId,
        templateName: selectedTemplate.name,
        templateLanguage: selectedTemplate.language,
      });
      await sendBroadcast({ broadcastId });
      setDone(true);
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-20 text-center gap-4">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <CheckIcon className="size-6" />
        </div>
        <p className="text-lg font-semibold">{tx.success}</p>
        <Button onClick={() => router.push("/broadcasts")}>{locale === "ar" ? "عرض الحملات" : "View Broadcasts"}</Button>
      </div>
    );
  }

  const steps = [tx.step1, tx.step2, tx.step3];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">{tx.title}</h1>
      </div>

      <div className="flex items-center gap-2 mb-8">
        {steps.map((label, i) => {
          const idx = i + 1;
          const active = step === idx;
          const isDone = step > idx;
          return (
            <div key={idx} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : isDone
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? <CheckIcon className="size-3.5" /> : idx}
              </div>
              <span
                className={`text-sm ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}
              >
                {label}
              </span>
              {i < steps.length - 1 && (
                <div className="flex-1 h-px bg-border w-8 mx-1" />
              )}
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">{tx.campaignName}</label>
            <Input
              placeholder={tx.campaignNamePlaceholder}
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(false); }}
              className={nameError ? "border-destructive" : ""}
            />
            {nameError && <p className="text-xs text-destructive mt-1">{tx.nameRequired}</p>}
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">{tx.selectList}</label>
            {lists === undefined ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="flex flex-col gap-2">
                {lists.map((list) => (
                  <button
                    key={list._id}
                    type="button"
                    onClick={() => setSelectedListId(list._id)}
                    className={`text-start p-3 rounded-lg border transition-colors ${
                      selectedListId === list._id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="text-sm font-medium">{list.name}</div>
                  </button>
                ))}
              </div>
            )}
            {selectedListStats && (
              <p className="text-xs text-muted-foreground mt-2">
                {selectedListStats.total} {tx.contacts}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => router.push("/broadcasts")}>{tx.cancel}</Button>
            <Button
              onClick={() => setStep(2)}
              disabled={!selectedListId || !name.trim()}
            >
              {tx.next}
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">{tx.selectChannel}</label>
            {channels === undefined ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="flex flex-col gap-2">
                {channels.map((channel) => (
                  <button
                    key={channel._id}
                    type="button"
                    onClick={() => handleChannelSelect(channel._id)}
                    className={`text-start p-3 rounded-lg border transition-colors ${
                      selectedChannelId === channel._id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="text-sm font-medium">{channel.displayName}</div>
                    <div className="text-xs text-muted-foreground">{channel.displayPhone ?? channel.phoneNumberId}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedChannelId && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{tx.selectTemplate}</label>
                <button
                  type="button"
                  onClick={() => loadTemplates(selectedChannelId)}
                  disabled={loadingTemplates}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCwIcon className={`size-3 ${loadingTemplates ? "animate-spin" : ""}`} />
                  {locale === "ar" ? "تحديث" : "Refresh"}
                </button>
              </div>

              {loadingTemplates ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tx.noTemplates}</p>
              ) : (
                <div className="flex gap-4">
                  {/* Template list */}
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    {templates.map((tpl) => {
                      const isSelected = selectedTemplate?.name === tpl.name && selectedTemplate?.language === tpl.language;
                      return (
                        <button
                          key={`${tpl.name}-${tpl.language}`}
                          type="button"
                          onClick={() => setSelectedTemplate(tpl)}
                          className={`text-start p-3 rounded-lg border transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium truncate">{tpl.name}</span>
                            <TemplateStatusBadge status={tpl.status} locale={locale} />
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {tpl.language}{tpl.category ? ` • ${tpl.category}` : ""}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Preview panel */}
                  {selectedTemplate && (
                    <div className="shrink-0">
                      <WhatsAppTemplatePreview
                        name={selectedTemplate.name}
                        components={selectedTemplate.components}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedTemplate && selectedTemplate.status !== "APPROVED" && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              {tx.warning}
            </div>
          )}

          <div className="flex justify-between mt-2">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>{tx.back}</Button>
              <Button variant="outline" onClick={() => router.push("/broadcasts")}>{tx.cancel}</Button>
            </div>
            <Button
              onClick={() => setStep(3)}
              disabled={!selectedChannelId || !selectedTemplate}
            >
              {tx.next}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-6 items-start">
            <div className="flex-1 flex flex-col gap-3">
              <div className="bg-card border rounded-xl p-5 flex flex-col gap-3">
                <h2 className="text-sm font-semibold">{tx.summary}</h2>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{tx.audience}</span>
                  <span className="font-medium">
                    {lists?.find((l) => l._id === selectedListId)?.name ?? "\u2014"}{" "}
                    ({selectedListStats?.total ?? "\u2014"} {tx.contacts})
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{tx.message}</span>
                  <span className="font-medium">{selectedTemplate?.name ?? "\u2014"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{tx.channel}</span>
                  <span className="font-medium">
                    {channels?.find((c) => c._id === selectedChannelId)?.displayName ?? "\u2014"}
                  </span>
                </div>
              </div>
            </div>

            {selectedTemplate && (
              <div className="shrink-0">
                <WhatsAppTemplatePreview
                  name={selectedTemplate.name}
                  components={selectedTemplate.components}
                />
              </div>
            )}
          </div>

          <div className="flex justify-between mt-2">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>{tx.back}</Button>
              <Button variant="outline" onClick={() => router.push("/broadcasts")}>{tx.cancel}</Button>
            </div>
            <Button onClick={handleSend} disabled={sending}>
              <MegaphoneIcon className="size-4 me-1" />
              {sending ? tx.sending : tx.send}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
