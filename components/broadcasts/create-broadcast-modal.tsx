"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  XIcon,
  RefreshCwIcon,
  CalendarIcon,
  ClockIcon,
  SendIcon,
  SaveIcon,
  CheckIcon,
} from "lucide-react";
import { WhatsAppTemplatePreview } from "./whatsapp-template-preview";
import type { TemplateComponent } from "./whatsapp-template-preview";

type MetaTemplate = {
  name: string;
  language: string;
  status: string;
  category?: string;
  components: TemplateComponent[];
};
type BroadcastTemplate = Doc<"broadcastTemplates">;

const TEMPLATE_STATUS_CFG: Record<
  string,
  { label: { ar: string; en: string }; cls: string }
> = {
  APPROVED: {
    label: { ar: "معتمد", en: "Approved" },
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  approved: {
    label: { ar: "معتمد", en: "Approved" },
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  PENDING: {
    label: { ar: "قيد المراجعة", en: "Pending" },
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
  pending: {
    label: { ar: "قيد المراجعة", en: "Pending" },
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
  REJECTED: {
    label: { ar: "مرفوض", en: "Rejected" },
    cls: "bg-rose-50 text-rose-700 border-rose-200",
  },
  rejected: {
    label: { ar: "مرفوض", en: "Rejected" },
    cls: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

function TemplateBadge({ status, locale }: { status: string; locale: "ar" | "en" }) {
  const cfg =
    TEMPLATE_STATUS_CFG[status] ??
    TEMPLATE_STATUS_CFG["PENDING"];
  return (
    <span
      className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${cfg.cls}`}
    >
      {cfg.label[locale]}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
      {children}
    </p>
  );
}

function EmptyPreview({ locale }: { locale: "ar" | "en" }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-3 px-4">
      <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
        <SendIcon className="size-6 text-muted-foreground/40" />
      </div>
      <p className="text-xs text-muted-foreground">
        {locale === "ar"
          ? "اختر قالباً لرؤية المعاينة"
          : "Select a template to see the preview"}
      </p>
    </div>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: "ar" | "en";
};

export function CreateBroadcastModal({ open, onOpenChange, locale }: Props) {
  const isAr = locale === "ar";

  // Form state
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<Id<"channels"> | undefined>();
  const [selectedListId, setSelectedListId] = useState<Id<"contactLists"> | undefined>();

  // Template state
  const [templateSource, setTemplateSource] = useState<"meta" | "broadcast">("meta");
  const [metaTemplates, setMetaTemplates] = useState<MetaTemplate[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [selectedMetaTemplate, setSelectedMetaTemplate] = useState<MetaTemplate | null>(null);
  const [broadcastTemplates, setBroadcastTemplates] = useState<BroadcastTemplate[]>([]);
  const [selectedBroadcastTemplate, setSelectedBroadcastTemplate] = useState<BroadcastTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [overrideMediaUrl, setOverrideMediaUrl] = useState("");

  // Scheduling state
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Queries
  const lists = useQuery(api.contactLists.listForTenant);
  const channels = useQuery(api.channels.listForTenant);
  const selectedListStats = useQuery(
    api.contactLists.getStats,
    selectedListId ? { listId: selectedListId } : "skip",
  );
  const allBroadcastTemplates = useQuery(api.broadcastTemplates.list, {});

  // Mutations + actions
  const createBroadcast = useMutation(api.broadcasts.create);
  const sendBroadcast = useAction(api.broadcasts.send);
  const syncTemplates = useAction(api.metaTemplates.syncFromMeta);

  function resetForm() {
    setName("");
    setNameError(false);
    setSelectedChannelId(undefined);
    setSelectedListId(undefined);
    setTemplateSource("meta");
    setMetaTemplates([]);
    setSelectedMetaTemplate(null);
    setBroadcastTemplates([]);
    setSelectedBroadcastTemplate(null);
    setVariables({});
    setOverrideMediaUrl("");
    setScheduledDate("");
    setScheduledTime("");
    setSubmitting(false);
    setDone(false);
  }

  function handleOpenChange(v: boolean) {
    if (!v) resetForm();
    onOpenChange(v);
  }

  async function loadMetaTemplates(channelId: Id<"channels">) {
    setLoadingMeta(true);
    setSelectedMetaTemplate(null);
    try {
      const result = await syncTemplates({ channelId });
      setMetaTemplates(result as MetaTemplate[]);
    } catch {
      setMetaTemplates([]);
    } finally {
      setLoadingMeta(false);
    }
  }

  function loadBroadcastTemplatesForChannel(channelId: Id<"channels">) {
    if (!allBroadcastTemplates) return;
    const filtered = allBroadcastTemplates.filter(
      (t) => t.channelId === channelId && t.metaStatus === "approved",
    );
    setBroadcastTemplates(filtered);
    setSelectedBroadcastTemplate(null);
  }

  async function handleChannelSelect(channelId: Id<"channels">) {
    setSelectedChannelId(channelId);
    setSelectedMetaTemplate(null);
    setSelectedBroadcastTemplate(null);
    setMetaTemplates([]);
    setBroadcastTemplates([]);
    setVariables({});
    setOverrideMediaUrl("");
    if (templateSource === "meta") {
      await loadMetaTemplates(channelId);
    } else {
      loadBroadcastTemplatesForChannel(channelId);
    }
  }

  async function handleSourceChange(source: "meta" | "broadcast") {
    setTemplateSource(source);
    setSelectedMetaTemplate(null);
    setSelectedBroadcastTemplate(null);
    setMetaTemplates([]);
    setBroadcastTemplates([]);
    setVariables({});
    setOverrideMediaUrl("");
    if (!selectedChannelId) return;
    if (source === "meta") {
      await loadMetaTemplates(selectedChannelId);
    } else {
      loadBroadcastTemplatesForChannel(selectedChannelId);
    }
  }

  const activeTemplate: MetaTemplate | BroadcastTemplate | null =
    selectedMetaTemplate ?? selectedBroadcastTemplate;

  const scheduledAt = useCallback((): number | undefined => {
    if (!scheduledDate || !scheduledTime) return undefined;
    const dt = new Date(`${scheduledDate}T${scheduledTime}`);
    return isNaN(dt.getTime()) ? undefined : dt.getTime();
  }, [scheduledDate, scheduledTime]);

  const isScheduled = !!(scheduledDate && scheduledTime);
  const canSubmit =
    name.trim() &&
    selectedListId &&
    selectedChannelId &&
    activeTemplate &&
    !submitting;

  async function handleSubmit(mode: "send" | "schedule" | "draft") {
    if (!name.trim()) { setNameError(true); return; }
    if (!canSubmit) return;

    const tpl = activeTemplate!;
    const sa = mode === "schedule" ? scheduledAt() : undefined;

    if (mode === "schedule" && !sa) return;

    setSubmitting(true);
    try {
      const broadcastId = await createBroadcast({
        name: name.trim(),
        listId: selectedListId!,
        channelId: selectedChannelId!,
        templateName: tpl.name,
        templateLanguage: tpl.language,
        scheduledAt: sa,
      });

      if (mode === "send") {
        await sendBroadcast({ broadcastId });
      }

      setDone(true);
      setTimeout(() => handleOpenChange(false), 1200);
    } catch {
      // silent — Convex errors surface via the UI in production
    } finally {
      setSubmitting(false);
    }
  }

  const selectedList = lists?.find((l) => l._id === selectedListId);
  const selectedChannel = channels?.find((c) => c._id === selectedChannelId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden">
        <div
          className="flex"
          style={{ height: "88vh", maxHeight: "820px" }}
        >
          {/* ── Left panel: form ── */}
          <div className="flex flex-col flex-1 overflow-hidden min-w-0">
            {/* Header */}
            <div className="px-6 py-4 border-b shrink-0">
              <DialogTitle className="text-base font-semibold">
                {isAr ? "رسالة بث جديدة" : "New Broadcast Message"}
              </DialogTitle>
            </div>

            {/* Form body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {done ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckIcon className="size-6 text-emerald-700" />
                  </div>
                  <p className="font-semibold text-sm">
                    {isScheduled
                      ? (isAr ? "تم جدولة الحملة!" : "Campaign scheduled!")
                      : (isAr ? "تم إرسال الحملة!" : "Campaign sent!")}
                  </p>
                </div>
              ) : (
                <>
                  {/* Campaign name */}
                  <div>
                    <SectionLabel>
                      {isAr ? "اسم الحملة" : "Campaign Name"}
                    </SectionLabel>
                    <Input
                      value={name}
                      onChange={(e) => { setName(e.target.value); setNameError(false); }}
                      placeholder={isAr ? "مثال: عرض رمضان 2026" : "e.g. Ramadan Offer 2026"}
                      className={nameError ? "border-destructive" : ""}
                      dir={isAr ? "rtl" : "ltr"}
                    />
                    {nameError && (
                      <p className="text-xs text-destructive mt-1">
                        {isAr ? "اسم الحملة مطلوب" : "Campaign name is required"}
                      </p>
                    )}
                  </div>

                  {/* Recipients */}
                  <div>
                    <SectionLabel>
                      {isAr ? "المستلمون" : "Recipients"}
                    </SectionLabel>
                    <div className="flex flex-wrap items-center gap-2 p-2.5 border rounded-lg min-h-[44px]">
                      {selectedList ? (
                        <span className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                          {selectedList.name}
                          {selectedListStats && (
                            <span className="text-primary/60">
                              ({selectedListStats.total})
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedListId(undefined)}
                            className="hover:text-destructive transition-colors"
                          >
                            <XIcon className="size-3" />
                          </button>
                        </span>
                      ) : null}
                      {!selectedListId && (
                        lists === undefined ? (
                          <Skeleton className="h-5 w-40" />
                        ) : (
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value)
                                setSelectedListId(e.target.value as Id<"contactLists">);
                            }}
                            className="flex-1 text-sm text-muted-foreground bg-transparent border-none outline-none min-w-[140px]"
                          >
                            <option value="" disabled>
                              {isAr ? "اختر قائمة جهات الاتصال..." : "Search groups or contacts..."}
                            </option>
                            {lists.map((l) => (
                              <option key={l._id} value={l._id}>
                                {l.name}
                              </option>
                            ))}
                          </select>
                        )
                      )}
                    </div>
                  </div>

                  {/* Channel */}
                  <div>
                    <SectionLabel>
                      {isAr ? "رقم واتساب" : "WhatsApp Number"}
                    </SectionLabel>
                    {channels === undefined ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <div className="flex flex-col gap-2">
                        {channels.map((ch) => (
                          <button
                            key={ch._id}
                            type="button"
                            onClick={() => handleChannelSelect(ch._id)}
                            className={`text-start p-3 rounded-lg border transition-colors ${
                              selectedChannelId === ch._id
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/40"
                            }`}
                          >
                            <div className="text-sm font-medium">{ch.displayName}</div>
                            <div className="text-xs text-muted-foreground">
                              {ch.displayPhone ?? ch.phoneNumberId}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Template section — only after channel is selected */}
                  {selectedChannelId && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <SectionLabel>
                          {isAr ? "قالب الرسالة" : "Message Template"}
                        </SectionLabel>
                        {templateSource === "meta" && (
                          <button
                            type="button"
                            onClick={() => loadMetaTemplates(selectedChannelId)}
                            disabled={loadingMeta}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <RefreshCwIcon
                              className={`size-3 ${loadingMeta ? "animate-spin" : ""}`}
                            />
                            {isAr ? "تحديث" : "Refresh"}
                          </button>
                        )}
                      </div>

                      {/* Source toggle */}
                      <div className="flex rounded-lg border overflow-hidden mb-3">
                        {(["meta", "broadcast"] as const).map((src) => (
                          <button
                            key={src}
                            type="button"
                            onClick={() => handleSourceChange(src)}
                            className={`flex-1 text-xs font-medium py-2 transition-colors ${
                              templateSource === src
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {src === "meta"
                              ? isAr ? "قوالب Meta" : "Meta Templates"
                              : isAr ? "قوالب WABDesk" : "WABDesk Templates"}
                          </button>
                        ))}
                      </div>

                      {/* Template list */}
                      {templateSource === "meta" ? (
                        loadingMeta ? (
                          <div className="space-y-2">
                            <Skeleton className="h-14 w-full" />
                            <Skeleton className="h-14 w-full" />
                          </div>
                        ) : metaTemplates.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            {isAr ? "لا توجد قوالب معتمدة لهذا الرقم" : "No approved templates for this number"}
                          </p>
                        ) : (
                          <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
                            {metaTemplates.map((tpl) => {
                              const isSelected =
                                selectedMetaTemplate?.name === tpl.name &&
                                selectedMetaTemplate?.language === tpl.language;
                              return (
                                <button
                                  key={`${tpl.name}-${tpl.language}`}
                                  type="button"
                                  onClick={() => setSelectedMetaTemplate(tpl)}
                                  className={`text-start p-3 rounded-lg border transition-colors ${
                                    isSelected
                                      ? "border-primary bg-primary/5"
                                      : "border-border hover:border-primary/40"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium truncate">
                                      {tpl.name}
                                    </span>
                                    <TemplateBadge status={tpl.status} locale={locale} />
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {tpl.language}
                                    {tpl.category ? ` · ${tpl.category}` : ""}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )
                      ) : broadcastTemplates.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {isAr ? "لا توجد قوالب معتمدة لهذا الرقم" : "No approved templates for this number"}
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
                          {broadcastTemplates.map((tpl) => {
                            const isSelected = selectedBroadcastTemplate?._id === tpl._id;
                            return (
                              <button
                                key={tpl._id}
                                type="button"
                                onClick={() => {
                                  setSelectedBroadcastTemplate(tpl);
                                  setOverrideMediaUrl(tpl.headerMediaUrl ?? "");
                                  setVariables({});
                                }}
                                className={`text-start p-3 rounded-lg border transition-colors ${
                                  isSelected
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/40"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-medium truncate">
                                    {tpl.title}
                                  </span>
                                  <TemplateBadge status={tpl.metaStatus} locale={locale} />
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {tpl.language}
                                  {tpl.category ? ` · ${tpl.category}` : ""}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Variable overrides for broadcast templates */}
                      {selectedBroadcastTemplate && (
                        <div className="mt-4 space-y-3 pt-3 border-t">
                          {["IMAGE", "VIDEO", "DOCUMENT"].includes(
                            selectedBroadcastTemplate.headerType,
                          ) && (
                            <div>
                              <label className="text-xs font-medium mb-1 block">
                                {selectedBroadcastTemplate.headerType === "IMAGE"
                                  ? isAr ? "رابط الصورة" : "Image URL"
                                  : selectedBroadcastTemplate.headerType === "VIDEO"
                                    ? isAr ? "رابط الفيديو" : "Video URL"
                                    : isAr ? "رابط المستند" : "Document URL"}
                              </label>
                              <Input
                                type="url"
                                value={overrideMediaUrl}
                                onChange={(e) => setOverrideMediaUrl(e.target.value)}
                                dir="ltr"
                                placeholder="https://..."
                              />
                            </div>
                          )}
                          {selectedBroadcastTemplate.variables.map((varName) => (
                            <div key={varName}>
                              <label className="text-xs font-medium mb-1 block">
                                {isAr ? `المتغير: ${varName}` : `Variable: ${varName}`}
                              </label>
                              <Input
                                value={variables[varName] ?? ""}
                                onChange={(e) =>
                                  setVariables({ ...variables, [varName]: e.target.value })
                                }
                                placeholder={
                                  isAr ? "أدخل القيمة" : "Enter value"
                                }
                                dir="auto"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Non-approved warning */}
                      {selectedMetaTemplate &&
                        selectedMetaTemplate.status !== "APPROVED" && (
                          <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            {isAr
                              ? "⚠️ هذا القالب غير معتمد من Meta بعد — قد لا يُرسل بنجاح."
                              : "⚠️ This template is not yet approved by Meta — it may not send successfully."}
                          </div>
                        )}
                    </div>
                  )}

                  {/* Scheduling */}
                  <div>
                    <SectionLabel>
                      {isAr ? "الجدولة (اختياري)" : "Scheduling (optional)"}
                    </SectionLabel>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <CalendarIcon className="absolute start-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                        <input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          min={new Date().toISOString().split("T")[0]}
                          className="h-9 w-full rounded-md border bg-background ps-9 pe-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          dir="ltr"
                        />
                      </div>
                      <div className="relative flex-1">
                        <ClockIcon className="absolute start-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="h-9 w-full rounded-md border bg-background ps-9 pe-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          dir="ltr"
                        />
                      </div>
                    </div>
                    {isScheduled && (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {isAr
                          ? `سيُرسل في: ${new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString("ar-EG")}`
                          : `Will send at: ${new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString("en-GB")}`}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {!done && (
              <div className="border-t px-6 py-4 flex items-center justify-between gap-3 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSubmit("draft")}
                  disabled={!canSubmit}
                  className="gap-1.5"
                >
                  <SaveIcon className="size-3.5" />
                  {isAr ? "حفظ كمسودة" : "Save Draft"}
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleSubmit(isScheduled ? "schedule" : "send")}
                  disabled={!canSubmit}
                  className="gap-1.5"
                >
                  <SendIcon className="size-3.5" />
                  {submitting
                    ? (isAr ? "جاري الإرسال..." : "Sending...")
                    : isScheduled
                      ? (isAr ? "جدولة الحملة" : "Schedule Broadcast")
                      : (isAr ? "إرسال الحملة" : "Send Broadcast")}
                </Button>
              </div>
            )}
          </div>

          {/* ── Right panel: WhatsApp preview ── */}
          <div className="w-72 border-s bg-muted/20 flex flex-col shrink-0">
            <div className="px-4 py-3 border-b shrink-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {isAr ? "معاينة" : "Preview"}
              </p>
            </div>
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
              {selectedMetaTemplate ? (
                <div className="scale-90 origin-top w-full">
                  <WhatsAppTemplatePreview
                    name={selectedMetaTemplate.name}
                    components={selectedMetaTemplate.components}
                  />
                </div>
              ) : selectedBroadcastTemplate ? (
                <div className="w-full max-w-[220px]">
                  {/* Simple WhatsApp bubble for broadcast templates */}
                  <div className="rounded-2xl overflow-hidden shadow-sm border border-border bg-white">
                    <div
                      className="px-3 py-2 text-white text-xs font-semibold"
                      style={{ backgroundColor: "#075E54" }}
                    >
                      {selectedChannel?.displayName ?? "WABDesk"}
                    </div>
                    <div className="p-3 bg-[#ECE5DD] min-h-[80px]">
                      <div className="bg-white rounded-lg px-3 py-2 shadow-sm max-w-[180px] text-xs leading-relaxed">
                        {selectedBroadcastTemplate.body
                          .replace(/\{\{(\w+)\}\}/g, (_, key) =>
                            variables[key] ? `*${variables[key]}*` : `{{${key}}}`,
                          )
                          .split("\n")
                          .map((line, i) => (
                            <span key={i}>
                              {line}
                              {i < selectedBroadcastTemplate.body.split("\n").length - 1 && <br />}
                            </span>
                          ))}
                        {selectedBroadcastTemplate.footer && (
                          <p className="text-muted-foreground mt-1.5 text-[10px]">
                            {selectedBroadcastTemplate.footer}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyPreview locale={locale} />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
