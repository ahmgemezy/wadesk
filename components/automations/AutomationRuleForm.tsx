"use client";

import React, { useState, useRef, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSelectedChannel } from "@/lib/hooks/channel-context";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useT, useLocale } from "@/lib/i18n/context";
import { interpolateTemplate } from "@/lib/automationHelpers";
import type { TriggerType } from "@/lib/automationHelpers";
import { AlertTriangle, FileTextIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DT } from "@/lib/design-tokens";

const TRIGGER_OPTIONS: { value: TriggerType; ar: string; en: string }[] = [
  { value: "keyword", en: "Keyword", ar: "كلمة مفتاحية" },
  { value: "outside_hours", en: "Outside Business Hours", ar: "خارج ساعات العمل" },
  { value: "first_message", en: "First Message", ar: "رسالة أولى" },
  { value: "no_reply_timeout", en: "No Reply Timeout", ar: "تأخر في الرد" },
];

const VARIABLE_CHIPS = [
  "{{customer_name}}",
  "{{business_name}}",
  "{{agent_name}}",
  "{{current_time}}",
];

const SAMPLE_VARS = {
  customer_name: "أحمد محمد",
  business_name: "[اسم قناة واتساب]",
  agent_name: "فريق الدعم",
  current_time: new Date().toLocaleTimeString("ar-EG"),
};

interface AutomationRuleFormProps {
  mode: "create" | "edit";
  initialValues?: {
    _id?: Id<"automationRules">;
    name?: string;
    triggerType?: TriggerType;
    keywordList?: string[];
    timeoutMinutes?: number;
    responseTemplate?: string;
    senderName?: string;
    mediaUrl?: string;
    mediaType?: "image" | "video" | "document";
  };
  onSuccess: () => void;
  onCancel: () => void;
  open: boolean;
}

export function AutomationRuleForm({
  mode,
  initialValues,
  onSuccess,
  onCancel,
  open,
}: AutomationRuleFormProps) {
  const t = useT();
  const locale = useLocale();
  const { channelId: selectedChannelId } = useSelectedChannel();
  const createRule = useMutation(api.automations.createRule);
  const updateRule = useMutation(api.automations.updateRule);
  const businessHours = useQuery(
    api.automations.getBusinessHours,
    open ? {} : "skip"
  );
  const messageTemplates = useQuery(
    api.messageTemplates.list,
    open ? {} : "skip"
  );

  const [name, setName] = useState(initialValues?.name ?? "");
  const [triggerType, setTriggerType] = useState<TriggerType>(
    initialValues?.triggerType ?? "keyword"
  );
  const [keywordInput, setKeywordInput] = useState("");
  const [keywordList, setKeywordList] = useState<string[]>(
    initialValues?.keywordList ?? []
  );
  const [timeoutMinutes, setTimeoutMinutes] = useState<number>(
    initialValues?.timeoutMinutes ?? 5
  );
  const [responseTemplate, setResponseTemplate] = useState(
    initialValues?.responseTemplate ?? ""
  );
  const [senderName, setSenderName] = useState(initialValues?.senderName ?? "");
  const [mediaUrl, setMediaUrl] = useState(initialValues?.mediaUrl ?? "");
  const [mediaType, setMediaType] = useState<"image" | "video" | "document">(
    initialValues?.mediaType ?? "image"
  );
  const [submitting, setSubmitting] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isOutsideHours = triggerType === "outside_hours";
  const showBusinessHoursWarning = isOutsideHours && businessHours === null;
  const canSave =
    name.trim() &&
    responseTemplate.trim() &&
    !showBusinessHoursWarning &&
    (triggerType !== "keyword" || keywordList.length > 0) &&
    (triggerType !== "no_reply_timeout" || (timeoutMinutes >= 1 && timeoutMinutes <= 1440));

  const preview = useMemo(
    () => interpolateTemplate(responseTemplate || "", SAMPLE_VARS),
    [responseTemplate]
  );

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !keywordList.includes(kw)) {
      setKeywordList([...keywordList, kw]);
      setKeywordInput("");
    }
  };

  const removeKeyword = (kw: string) => {
    setKeywordList(keywordList.filter((k) => k !== kw));
  };

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = responseTemplate.slice(0, start);
    const after = responseTemplate.slice(end);
    const updated = before + variable + after;
    setResponseTemplate(updated);
    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + variable.length;
      textarea.focus();
    });
  };

  const handleSubmit = async () => {
    if (!canSave || submitting) return;
    setSubmitting(true);
    try {
      const baseArgs = {
        name: name.trim(),
        triggerType,
        responseTemplate: responseTemplate.trim(),
        senderName: senderName.trim() || undefined,
        mediaUrl: mediaUrl.trim() || undefined,
        mediaType: mediaUrl.trim() ? mediaType : undefined,
      };

      if (mode === "edit" && initialValues?._id) {
        await updateRule({
          ruleId: initialValues._id,
          ...baseArgs,
          ...(triggerType === "keyword" ? { keywordList } : {}),
          ...(triggerType === "no_reply_timeout" ? { timeoutMinutes } : {}),
        });
      } else {
        await createRule({
          ...baseArgs,
          ...(triggerType === "keyword" ? { keywordList } : {}),
          ...(triggerType === "no_reply_timeout" ? { timeoutMinutes } : {}),
          ...(selectedChannelId ? { channelId: selectedChannelId } : {}),
        });
      }
      toast.success(
        mode === "edit"
          ? t("Rule updated", "تم تحديث القاعدة")
          : t("Rule created", "تم إنشاء القاعدة")
      );
      onSuccess();
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : String(e);
      if (message.includes("PLAN_LIMIT_REACHED")) {
        toast.error(
          t(
            "Plan limit reached. Upgrade to add more rules.",
            "وصلت للحد الأقصى. ارقِّ خطتك لإضافة المزيد."
          )
        );
      } else {
        toast.error(
          t("An error occurred", "حدث خطأ")
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <SheetContent side={locale === "ar" ? "left" : "right"} className={`${DT.SHEET} sm:max-w-md overflow-y-auto`}>
        <SheetHeader>
          <SheetTitle className={`${DT.H2} font-cairo`}>
            {mode === "edit"
              ? t("Edit Rule", "تعديل القاعدة")
              : t("Create Rule", "إنشاء قاعدة جديدة")}
          </SheetTitle>
          <SheetDescription className={`${DT.MUTED} font-cairo`}>
            {t(
              "Set up an automated reply rule",
              "إعداد قاعدة رد تلقائي"
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className={`${DT.LBL} font-cairo`}>
              {t("Rule Name", "اسم القاعدة")}
            </label>
            <input
              className={DT.INPUT}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("e.g. Welcome greeting", "مثال: تحية ترحيبية")}
              dir="auto"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <label className={`${DT.LBL} font-cairo`}>
              {t("Trigger Type", "نوع المشغل")}
            </label>
            <Select value={triggerType} onValueChange={(v) => setTriggerType(v as TriggerType)}>
              <SelectTrigger className={DT.SELECT}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="font-cairo">{t(opt.en, opt.ar)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {triggerType === "keyword" && (
            <div className="space-y-2">
              <label className={`${DT.LBL} font-cairo`}>
                {t("Keywords", "الكلمات المفتاحية")}
              </label>
              <div className="flex gap-2">
                <input
                  className={DT.INPUT}
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder={t("Add keyword...", "أضف كلمة...")}
                  dir="auto"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addKeyword();
                    }
                  }}
                />
                <button
                  type="button"
                  className={DT.BTN_SM}
                  onClick={addKeyword}
                  disabled={!keywordInput.trim()}
                >
                  {t("Add", "إضافة")}
                </button>
              </div>
              {keywordList.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {keywordList.map((kw) => (
                    <button
                      key={kw}
                      type="button"
                      className={`${DT.BADGE_GREEN} cursor-pointer font-cairo`}
                      onClick={() => removeKeyword(kw)}
                    >
                      {kw} ×
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {triggerType === "no_reply_timeout" && (
            <div className="space-y-2">
              <label className={`${DT.LBL} font-cairo`}>
                {t("Timeout (minutes)", "مدة الانتظار (بالدقائق)")}
              </label>
              <input
                className={DT.INPUT}
                type="number"
                min={1}
                max={1440}
                value={timeoutMinutes}
                onChange={(e) => setTimeoutMinutes(Number(e.target.value))}
                dir="ltr"
              />
            </div>
          )}

          {showBusinessHoursWarning && (
            <Alert className={`${DT.BG_AMBER_LIGHT} ${DT.BORDER_AMBER}`}>
              <AlertTriangle className={`h-4 w-4 ${DT.TEXT_AMBER}`} />
              <AlertDescription className={`${DT.TEXT_AMBER} font-cairo`}>
                {t(
                  "Business hours must be configured first.",
                  "يجب ضبط ساعات العمل أولاً."
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className={`${DT.LBL} font-cairo`}>
              {t("Sender Name", "اسم المُرسِل")}
            </label>
            <input
              className={DT.INPUT}
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder={t(
                "e.g. Customer Service, Sales Team",
                "مثال: خدمة العملاء، فريق المبيعات"
              )}
              dir="auto"
              maxLength={60}
            />
            <p className={`${DT.MICRO} font-cairo`}>
              {t(
                "Used for {{agent_name}} in the message. Leave blank to use org name.",
                "يُستخدم كـ {{agent_name}} في الرسالة. اتركه فارغاً لاستخدام اسم المؤسسة."
              )}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={`${DT.LBL} font-cairo !mb-0`}>
                {t("Response Text", "نص الرد")}
              </label>
              <Popover>
                <PopoverTrigger render={<button type="button" className={`${DT.BTN_SM} h-7 gap-1 text-xs`} />}>
                  <FileTextIcon className="size-3.5" />
                  {t("Templates", "القوالب")}
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="end">
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {!messageTemplates?.length ? (
                      <p className={`${DT.MUTED} p-2 text-center`}>
                        {t("No templates", "لا توجد قوالب")}
                      </p>
                    ) : (
                      messageTemplates.map((tpl) => (
                        <button
                          key={tpl._id}
                          type="button"
                          className={DT.LIST_ITEM_SM}
                          onClick={() => {
                            setResponseTemplate(tpl.body);
                          }}
                        >
                          <span className="font-medium text-[#1D1D1F] dark:text-white">{tpl.title}</span>
                          {tpl.category && (
                            <span className={`${DT.MICRO} ms-1`}>
                              · {tpl.category}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <Textarea
              ref={textareaRef}
              value={responseTemplate}
              onChange={(e) => setResponseTemplate(e.target.value)}
              placeholder={t(
                "Type your automated response...",
                "اكتب الرد التلقائي..."
              )}
              className={`${DT.TEXTAREA} font-mono`}
              style={{ direction: "auto" as React.CSSProperties["direction"], unicodeBidi: "plaintext" }}
              maxLength={1000}
              rows={5}
            />
            <div className="flex flex-wrap gap-1">
              {VARIABLE_CHIPS.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`${DT.BADGE_BLUE} cursor-pointer`}
                  onClick={() => insertVariable(v)}
                >
                  {v}
                </button>
              ))}
            </div>
            <p className={`${DT.MICRO} font-cairo`}>
              {t(
                "{{business_name}} = org name · {{agent_name}} = sender name above",
                "{{business_name}} = اسم المؤسسة · {{agent_name}} = اسم المُرسِل أعلاه"
              )}
            </p>
          </div>

          <div className="space-y-2">
            <label className={`${DT.LBL} font-cairo`}>
              {t("Media Attachment (optional)", "مرفق وسائط (اختياري)")}
            </label>
            <input
              className={DT.INPUT}
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder={t(
                "Paste a public media URL (image, video, document)...",
                "الصق رابط الوسائط هنا (صورة، فيديو، مستند)..."
              )}
              dir="ltr"
              type="url"
            />
            {mediaUrl.trim() && (
              <Select value={mediaType} onValueChange={(v) => setMediaType(v as "image" | "video" | "document")}>
                <SelectTrigger className={DT.SELECT}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image"><span className="font-cairo">{t("Image", "صورة")}</span></SelectItem>
                  <SelectItem value="video"><span className="font-cairo">{t("Video", "فيديو")}</span></SelectItem>
                  <SelectItem value="document"><span className="font-cairo">{t("Document", "مستند")}</span></SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {responseTemplate && (
            <div className="space-y-2">
              <label className={`${DT.LBL} font-cairo`}>
                {t("Preview", "معاينة")}
              </label>
              <div
                className={`rounded-xl border ${DT.CATALOG_BORDER_GREEN} ${DT.CATALOG_BG_GREEN} p-3 text-sm font-cairo whitespace-pre-wrap text-[#1D1D1F] dark:text-white`}
                style={{ direction: "auto" as React.CSSProperties["direction"] }}
              >
                {preview}
              </div>
              {mediaUrl.trim() && (
                <p className={`${DT.MICRO} font-cairo`}>
                  {t(`+ ${mediaType} attachment`, `+ مرفق ${mediaType === "image" ? "صورة" : mediaType === "video" ? "فيديو" : "مستند"}`)}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              className={`${DT.BTN_PRIMARY} flex-1`}
              onClick={handleSubmit}
              disabled={!canSave || submitting}
            >
              {submitting
                ? t("Saving...", "جاري الحفظ...")
                : mode === "edit"
                  ? t("Update", "تحديث")
                  : t("Create", "إنشاء")}
            </button>
            <button
              type="button"
              className={DT.BTN_OUTLINE}
              onClick={onCancel}
            >
              {t("Cancel", "إلغاء")}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
