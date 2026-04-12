"use client";

import React, { useState, useRef, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";
import { interpolateTemplate } from "@/lib/automationHelpers";
import type { TriggerType } from "@/lib/automationHelpers";
import { AlertTriangle } from "lucide-react";

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
  const createRule = useMutation(api.automations.createRule);
  const updateRule = useMutation(api.automations.updateRule);
  const businessHours = useQuery(
    api.automations.getBusinessHours,
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
      <SheetContent side="left" className="sm:max-w-md overflow-y-auto" dir="rtl">
        <SheetHeader>
          <SheetTitle className="font-cairo">
            {mode === "edit"
              ? t("Edit Rule", "تعديل القاعدة")
              : t("Create Rule", "إنشاء قاعدة جديدة")}
          </SheetTitle>
          <SheetDescription className="font-cairo">
            {t(
              "Set up an automated reply rule",
              "إعداد قاعدة رد تلقائي"
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium font-cairo">
              {t("Rule Name", "اسم القاعدة")}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("e.g. Welcome greeting", "مثال: تحية ترحيبية")}
              dir="auto"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium font-cairo">
              {t("Trigger Type", "نوع المشغل")}
            </label>
            <Select value={triggerType} onValueChange={(v) => setTriggerType(v as TriggerType)}>
              <SelectTrigger className="w-full">
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
              <label className="text-sm font-medium font-cairo">
                {t("Keywords", "الكلمات المفتاحية")}
              </label>
              <div className="flex gap-2">
                <Input
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addKeyword}
                  disabled={!keywordInput.trim()}
                >
                  {t("Add", "إضافة")}
                </Button>
              </div>
              {keywordList.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {keywordList.map((kw) => (
                    <Badge
                      key={kw}
                      variant="secondary"
                      className="cursor-pointer font-cairo"
                      onClick={() => removeKeyword(kw)}
                    >
                      {kw} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {triggerType === "no_reply_timeout" && (
            <div className="space-y-2">
              <label className="text-sm font-medium font-cairo">
                {t("Timeout (minutes)", "مدة الانتظار (بالدقائق)")}
              </label>
              <Input
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
            <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-300 font-cairo">
                {t(
                  "Business hours must be configured first.",
                  "يجب ضبط ساعات العمل أولاً."
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium font-cairo">
              {t("Sender Name", "اسم المُرسِل")}
            </label>
            <Input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder={t(
                "e.g. Customer Service, Sales Team",
                "مثال: خدمة العملاء، فريق المبيعات"
              )}
              dir="auto"
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground font-cairo">
              {t(
                "Used for {{agent_name}} in the message. Leave blank to use org name.",
                "يُستخدم كـ {{agent_name}} في الرسالة. اتركه فارغاً لاستخدام اسم المؤسسة."
              )}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium font-cairo">
              {t("Response Text", "نص الرد")}
            </label>
            <Textarea
              ref={textareaRef}
              value={responseTemplate}
              onChange={(e) => setResponseTemplate(e.target.value)}
              placeholder={t(
                "Type your automated response...",
                "اكتب الرد التلقائي..."
              )}
              className="font-mono text-sm"
              style={{ direction: "auto" as React.CSSProperties["direction"], unicodeBidi: "plaintext" }}
              maxLength={1000}
              rows={5}
            />
            <div className="flex flex-wrap gap-1">
              {VARIABLE_CHIPS.map((v) => (
                <Badge
                  key={v}
                  variant="outline"
                  className="cursor-pointer text-xs"
                  onClick={() => insertVariable(v)}
                >
                  {v}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground font-cairo">
              {t(
                "{{business_name}} = org name · {{agent_name}} = sender name above",
                "{{business_name}} = اسم المؤسسة · {{agent_name}} = اسم المُرسِل أعلاه"
              )}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium font-cairo">
              {t("Media Attachment (optional)", "مرفق وسائط (اختياري)")}
            </label>
            <Input
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
                <SelectTrigger className="w-full">
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
              <label className="text-sm font-medium font-cairo">
                {t("Preview", "معاينة")}
              </label>
              <div
                className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 p-3 text-sm font-cairo whitespace-pre-wrap"
                style={{ direction: "auto" as React.CSSProperties["direction"] }}
              >
                {preview}
              </div>
              {mediaUrl.trim() && (
                <p className="text-xs text-muted-foreground font-cairo">
                  {t(`+ ${mediaType} attachment`, `+ مرفق ${mediaType === "image" ? "صورة" : mediaType === "video" ? "فيديو" : "مستند"}`)}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSubmit} disabled={!canSave || submitting} className="flex-1">
              {submitting
                ? t("Saving...", "جاري الحفظ...")
                : mode === "edit"
                  ? t("Update", "تحديث")
                  : t("Create", "إنشاء")}
            </Button>
            <Button variant="outline" onClick={onCancel}>
              {t("Cancel", "إلغاء")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
