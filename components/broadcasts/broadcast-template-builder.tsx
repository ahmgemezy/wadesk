"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2Icon, PlusIcon, Trash2Icon, SendIcon } from "lucide-react";
import { WhatsAppTemplatePreview } from "@/components/broadcasts/whatsapp-template-preview";
import type { TemplateComponent } from "@/components/broadcasts/whatsapp-template-preview";
import { useT } from "@/lib/i18n/context";

type HeaderType = "NONE" | "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
type ButtonType = "URL" | "PHONE_NUMBER" | "QUICK_REPLY";
type Category = "MARKETING" | "UTILITY";

interface BtnField {
  type: ButtonType;
  text: string;
  value: string;
  isDynamic: boolean;
}

interface Props {
  templateId?: string | null;
  onClose: () => void;
  onSave: () => void;
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function extractVariables(body: string): string[] {
  const matches = body.matchAll(/\{\{(\w+)\}\}/g);
  return [...new Set([...matches].map((m) => m[1].toLowerCase()))];
}

const HEADER_OPTIONS: { value: HeaderType; label: string; labelAr: string }[] = [
  { value: "NONE",     label: "None",     labelAr: "بدون" },
  { value: "TEXT",     label: "Text",     labelAr: "نص" },
  { value: "IMAGE",    label: "Image",    labelAr: "صورة" },
  { value: "VIDEO",    label: "Video",    labelAr: "فيديو" },
  { value: "DOCUMENT", label: "Document", labelAr: "مستند" },
];

const VAR_GROUPS = [
  {
    id: "customer",
    labelEn: "Customer",
    labelAr: "العميل",
    vars: [
      { key: "name",       descEn: "Full name",    descAr: "الاسم الكامل" },
      { key: "first_name", descEn: "First name",   descAr: "الاسم الأول" },
      { key: "phone",      descEn: "Phone",        descAr: "الهاتف" },
      { key: "city",       descEn: "City",         descAr: "المدينة" },
    ],
  },
  {
    id: "order",
    labelEn: "Order",
    labelAr: "الطلب",
    vars: [
      { key: "order_id",        descEn: "Order #",       descAr: "رقم الطلب" },
      { key: "order_status",    descEn: "Status",        descAr: "الحالة" },
      { key: "product",         descEn: "Product",       descAr: "المنتج" },
      { key: "quantity",        descEn: "Quantity",      descAr: "الكمية" },
      { key: "tracking_number", descEn: "Tracking #",    descAr: "رقم التتبع" },
      { key: "delivery_date",   descEn: "Delivery date", descAr: "تاريخ التسليم" },
    ],
  },
  {
    id: "payment",
    labelEn: "Payment",
    labelAr: "الدفع",
    vars: [
      { key: "amount",     descEn: "Amount",      descAr: "المبلغ" },
      { key: "discount",   descEn: "Discount",    descAr: "الخصم" },
      { key: "code",       descEn: "Promo code",  descAr: "كود الخصم" },
      { key: "invoice_id", descEn: "Invoice #",   descAr: "رقم الفاتورة" },
    ],
  },
  {
    id: "datetime",
    labelEn: "Date & Time",
    labelAr: "التاريخ والوقت",
    vars: [
      { key: "date",             descEn: "Date",             descAr: "التاريخ" },
      { key: "time",             descEn: "Time",             descAr: "الوقت" },
      { key: "appointment_date", descEn: "Appointment",      descAr: "تاريخ الموعد" },
      { key: "expiry_date",      descEn: "Expiry date",      descAr: "تاريخ الانتهاء" },
    ],
  },
  {
    id: "general",
    labelEn: "General",
    labelAr: "عام",
    vars: [
      { key: "link",          descEn: "Link",          descAr: "رابط" },
      { key: "business_name", descEn: "Business name", descAr: "اسم الشركة" },
      { key: "agent_name",    descEn: "Agent name",    descAr: "اسم الموظف" },
      { key: "note",          descEn: "Note",          descAr: "ملاحظة" },
    ],
  },
] as const;

export function BroadcastTemplateBuilder({ templateId, onClose, onSave }: Props) {
  const t = useT();
  const channels = useQuery(api.channels.listForTenant);
  const template = useQuery(api.broadcastTemplates.getById,
    templateId ? { id: templateId as Id<"broadcastTemplates"> } : "skip"
  );

  const create = useMutation(api.broadcastTemplates.create);
  const update = useMutation(api.broadcastTemplates.update);
  const submit = useAction(api.broadcastTemplates.submit);

  const [channelId, setChannelId] = useState<Id<"channels"> | "">("");
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [category, setCategory] = useState<Category>("MARKETING");
  const [headerType, setHeaderType] = useState<HeaderType>("NONE");
  const [headerText, setHeaderText] = useState("");
  const [headerMediaUrl, setHeaderMediaUrl] = useState("");
  const [body, setBody] = useState("");
  const [footer, setFooter] = useState("");
  const [showFooter, setShowFooter] = useState(false);
  const [buttons, setButtons] = useState<BtnField[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeVarGroup, setActiveVarGroup] = useState<typeof VAR_GROUPS[number]["id"]>("customer");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const isLocked = template?.metaStatus === "pending" || template?.metaStatus === "approved";

  useEffect(() => {
    if (template) {
      setChannelId(template.channelId);
      setTitle(template.title);
      setName(template.name);
      setLanguage(template.language as "ar" | "en");
      setCategory(template.category);
      setHeaderType(template.headerType);
      setHeaderText(template.headerText ?? "");
      setHeaderMediaUrl(template.headerMediaUrl ?? "");
      setBody(template.body);
      setFooter(template.footer ?? "");
      setShowFooter(!!template.footer);
      setButtons((template.buttons ?? []).map(b => ({ ...b, isDynamic: b.isDynamic ?? false })));
    } else {
      setChannelId("");
      setTitle(""); setName(""); setLanguage("ar"); setCategory("MARKETING");
      setHeaderType("NONE"); setHeaderText(""); setHeaderMediaUrl("");
      setBody(""); setFooter(""); setShowFooter(false); setButtons([]);
    }
  }, [template]);

  // Auto-generate Meta name from title
  function handleTitleChange(v: string) {
    setTitle(v);
    if (!templateId) setName(slugify(v));
  }

  const detectedVars = extractVariables(body);

  function insertVariable(varName: string) {
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const tag = `{{${varName}}}`;
    const next = body.slice(0, start) + tag + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    });
  }

  // Build live preview components
  const previewComponents: TemplateComponent[] = [];
  if (headerType !== "NONE") {
    previewComponents.push({
      type: "HEADER",
      format: headerType,
      text: headerType === "TEXT" ? headerText : undefined,
    });
  }
  if (body) previewComponents.push({ type: "BODY", text: body });
  if (footer) previewComponents.push({ type: "FOOTER", text: footer });
  if (buttons.length > 0) {
    previewComponents.push({
      type: "BUTTONS",
      buttons: buttons.map((b) => ({
        type: b.type as "URL" | "PHONE_NUMBER" | "QUICK_REPLY",
        text: b.text,
        url: b.type === "URL" ? b.value : undefined,
        phone_number: b.type === "PHONE_NUMBER" ? b.value : undefined,
      })),
    });
  }

  function addButton() {
    if (buttons.length >= 3) return;
    setButtons((prev) => [...prev, { type: "URL", text: "", value: "", isDynamic: false }]);
  }

  function updateButton(idx: number, patch: Partial<BtnField>) {
    setButtons((prev) => prev.map((b, i) => i === idx ? { ...b, ...patch } : b));
  }

  function removeButton(idx: number) {
    setButtons((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!title.trim() || !body.trim() || !channelId) return;
    setSaving(true);
    try {
      const payload = {
        channelId: channelId as Id<"channels">,
        name: name.trim(),
        title: title.trim(),
        language,
        category,
        headerType,
        headerText: headerType === "TEXT" ? headerText : undefined,
        headerMediaUrl: ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType) ? headerMediaUrl || undefined : undefined,
        body: body.trim(),
        footer: showFooter && footer.trim() ? footer.trim() : undefined,
        buttons: buttons.length > 0 ? buttons : undefined,
      };

      if (templateId) {
        await update({ id: templateId as Id<"broadcastTemplates">, ...payload });
        toast.success(t("Template saved", "تم حفظ القالب"));
      } else {
        await create(payload);
        toast.success(t("Template created", "تم إنشاء القالب"));
      }
      onSave();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg.includes("PLAN_LIMIT") ? t("Plan limit reached", "وصلت لحد الخطة") : t("Failed to save", "فشل الحفظ"));
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitToMeta() {
    if (!templateId) return;
    setSubmitting(true);
    try {
      await submit({ id: templateId as Id<"broadcastTemplates"> });
      toast.success(t("Submitted to Meta for review", "تم الإرسال لميتا للمراجعة"));
      onSave();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg.replace("ConvexError: Meta API error: ", ""));
    } finally {
      setSubmitting(false);
    }
  }

  const canSave = !isLocked && !!title.trim() && !!body.trim() && !!channelId;
  const canSubmitToMeta = templateId && !isLocked && !!title.trim() && !!body.trim() && !!channelId;

  return (
    <div className="flex flex-col h-full">
        {isLocked && (
          <div className="mx-6 mt-4 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-3 py-2 text-sm text-amber-700 dark:text-amber-400 shrink-0">
            {template?.metaStatus === "pending"
              ? t("This template is pending Meta review and cannot be edited.", "هذا القالب قيد مراجعة ميتا ولا يمكن تعديله.")
              : t("Approved templates cannot be edited.", "لا يمكن تعديل القوالب المعتمدة.")}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 flex-1 min-h-0">
          {/* ── Left: Scrollable form ── */}
          <div className="overflow-y-auto px-6 py-5 space-y-4 border-e border-border">
            {/* Basic Info */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>{t("Display Title", "العنوان")}</Label>
                <Input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder={t("e.g. Product Showcase", "مثال: عرض المنتج")}
                  dir="auto"
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("Template Name (Meta slug)", "اسم القالب (Meta)")}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value.replace(/[^a-z0-9_]/g, ""))}
                  placeholder="product_showcase_ar"
                  dir="ltr"
                  disabled={isLocked}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {t("Lowercase letters, numbers, underscores only", "أحرف صغيرة وأرقام وشرطة سفلية فقط")}
                </p>
              </div>
              <div className="space-y-1">
                <Label>{t("Channel", "القناة")}</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value as Id<"channels">)}
                  disabled={isLocked}
                >
                  <option value="">{t("Select a channel…", "اختر قناة...")}</option>
                  {channels?.map((ch) => (
                    <option key={ch._id} value={ch._id}>{ch.displayName ?? ch.phoneNumberId}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Label>{t("Language", "اللغة")}</Label>
                  <div className="flex gap-2">
                    {(["ar", "en"] as const).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        disabled={isLocked}
                        onClick={() => setLanguage(lang)}
                        className={`flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors ${
                          language === lang
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background hover:bg-muted"
                        }`}
                      >
                        {lang === "ar" ? "العربية" : "English"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <Label>{t("Category", "الفئة")}</Label>
                  <div className="flex gap-2">
                    {(["MARKETING", "UTILITY"] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        disabled={isLocked}
                        onClick={() => setCategory(cat)}
                        className={`flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors ${
                          category === cat
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background hover:bg-muted"
                        }`}
                      >
                        {cat === "MARKETING" ? t("Marketing", "تسويق") : t("Utility", "خدمي")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="space-y-2">
              <Label>{t("Header", "الترويسة")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {HEADER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isLocked}
                    onClick={() => setHeaderType(opt.value)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      headerType === opt.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-muted-foreground"
                    }`}
                  >
                    {t(opt.label, opt.labelAr)}
                  </button>
                ))}
              </div>
              {headerType === "TEXT" && (
                <Input
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  placeholder={t("Header text…", "نص الترويسة...")}
                  dir="auto"
                  disabled={isLocked}
                />
              )}
              {["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType) && (
                <div className="space-y-1">
                  <Input
                    value={headerMediaUrl}
                    onChange={(e) => setHeaderMediaUrl(e.target.value)}
                    placeholder="https://cdn.example.com/image.jpg"
                    dir="ltr"
                    disabled={isLocked}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("Default media URL — agents can override when sending a broadcast", "رابط الوسائط الافتراضي — يمكن للوكلاء تغييره عند إرسال الحملة")}
                  </p>
                </div>
              )}
            </div>

            {/* Body */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label>{t("Body", "النص")}</Label>
                <span className="text-[11px] text-muted-foreground">
                  {t("Use {{variable}} to personalise", "استخدم {{متغير}} للتخصيص")}
                </span>
              </div>

              {/* Variable picker */}
              <div className="rounded-md border border-border overflow-hidden">
                {/* Tab strip */}
                <div className="flex border-b border-border overflow-x-auto scrollbar-none bg-muted/40">
                  {VAR_GROUPS.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      disabled={isLocked}
                      onClick={() => setActiveVarGroup(group.id)}
                      className={[
                        "shrink-0 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors",
                        activeVarGroup === group.id
                          ? "border-primary text-foreground bg-background"
                          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60",
                      ].join(" ")}
                    >
                      {t(group.labelEn, group.labelAr)}
                    </button>
                  ))}
                </div>

                {/* Chip grid */}
                <div className="p-2.5 flex flex-wrap gap-1.5 bg-background">
                  {VAR_GROUPS.find((g) => g.id === activeVarGroup)?.vars.map(({ key, descEn, descAr }) => {
                    const isUsed = detectedVars.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={isLocked}
                        onClick={() => insertVariable(key)}
                        className={[
                          "group flex flex-col items-start px-2.5 py-1.5 rounded-md border text-left transition-all",
                          isUsed
                            ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                            : "border-border bg-muted/30 hover:border-border hover:bg-muted/60",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                        ].join(" ")}
                      >
                        <span className={["text-[11px] font-medium leading-none mb-[3px]", isUsed ? "text-primary" : "text-foreground"].join(" ")}>
                          {t(descEn, descAr)}
                        </span>
                        <span className={["text-[10px] font-mono leading-none", isUsed ? "text-primary/60" : "text-muted-foreground"].join(" ")}>
                          {`{{${key}}}`}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Footer hint */}
                <div className="px-3 py-1.5 border-t border-border bg-muted/20">
                  <p className="text-[10px] text-muted-foreground">
                    {t(
                      "Click a variable to insert it at your cursor. Agents fill in the values before sending.",
                      "اضغط على متغير لإدراجه عند المؤشر. يملأ الوكلاء القيم قبل الإرسال."
                    )}
                  </p>
                </div>
              </div>

              <Textarea
                ref={bodyRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t("Hello {{name}}, your order {{order_id}} is ready!", "أهلاً {{name}}، طلبك {{order_id}} جاهز!")}
                className="min-h-[120px] resize-none text-sm"
                dir="auto"
                disabled={isLocked}
              />

              {detectedVars.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {t("In this message:", "في هذه الرسالة:")}
                  </span>
                  {detectedVars.map((v) => (
                    <Badge key={v} variant="secondary" className="text-[11px] font-mono py-0">{`{{${v}}}`}</Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="space-y-2">
              {!showFooter ? (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setShowFooter(true)}
                  disabled={isLocked}
                >
                  + {t("Add Footer", "إضافة تذييل")}
                </button>
              ) : (
                <div className="space-y-1">
                  <Label>{t("Footer", "التذييل")}</Label>
                  <Input
                    value={footer}
                    onChange={(e) => setFooter(e.target.value)}
                    maxLength={60}
                    placeholder={t("e.g. Thank you for your business", "مثال: شكراً لتعاملك معنا")}
                    dir="auto"
                    disabled={isLocked}
                  />
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="space-y-2">
              {buttons.length > 0 && (
                <div className="space-y-2">
                  <Label>{t("Buttons", "الأزرار")}</Label>
                  {buttons.map((btn, idx) => (
                    <div key={idx} className="border rounded-md p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <select
                          className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                          value={btn.type}
                          onChange={(e) => updateButton(idx, { type: e.target.value as ButtonType, isDynamic: false })}
                          disabled={isLocked}
                        >
                          <option value="URL">URL</option>
                          <option value="PHONE_NUMBER">{t("Phone", "هاتف")}</option>
                          <option value="QUICK_REPLY">{t("Quick Reply", "رد سريع")}</option>
                        </select>
                        <Input
                          className="flex-1 h-7 text-xs"
                          value={btn.text}
                          onChange={(e) => updateButton(idx, { text: e.target.value })}
                          placeholder={t("Button label", "نص الزر")}
                          dir="auto"
                          disabled={isLocked}
                        />
                        <button type="button" onClick={() => removeButton(idx)} disabled={isLocked}>
                          <Trash2Icon className="size-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                      {btn.type !== "QUICK_REPLY" && (
                        <Input
                          className="text-xs"
                          value={btn.value}
                          onChange={(e) => updateButton(idx, { value: e.target.value })}
                          placeholder={btn.type === "URL" ? "https://shop.com/" : "+201234567890"}
                          dir="ltr"
                          disabled={isLocked}
                        />
                      )}
                      {btn.type === "URL" && (
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`dynamic-${idx}`}
                            checked={btn.isDynamic}
                            onCheckedChange={(v) => updateButton(idx, { isDynamic: v })}
                            disabled={isLocked}
                          />
                          <Label htmlFor={`dynamic-${idx}`} className="text-xs cursor-pointer">
                            {t("Dynamic suffix {{1}}", "لاحقة متغيرة {{1}}")}
                          </Label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!isLocked && buttons.length < 3 && (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                  onClick={addButton}
                >
                  <PlusIcon className="size-3" />
                  {t("Add Button", "إضافة زر")}
                </button>
              )}
            </div>
          </div>

          {/* ── Right: Sticky preview ── */}
          <div className="overflow-y-auto px-6 py-5 flex flex-col items-center gap-3">
            <p className="text-xs text-muted-foreground self-center">
              {t("Live Preview", "معاينة مباشرة")}
            </p>
            <WhatsAppTemplatePreview
              name={name || "template_name"}
              components={previewComponents}
            />
          </div>
        </div>

      {/* Action bar — pinned to bottom */}
      <div className="flex justify-between items-center px-6 py-4 border-t shrink-0">
        <Button variant="outline" onClick={onClose}>
          {t("Cancel", "إلغاء")}
        </Button>
        <div className="flex gap-2">
          {canSubmitToMeta && (
            <Button
              variant="outline"
              onClick={handleSubmitToMeta}
              disabled={submitting || saving}
            >
              {submitting && <Loader2Icon className="size-4 me-2 animate-spin" />}
              <SendIcon className="size-4 me-2" />
              {t("Submit to Meta", "إرسال لميتا")}
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!canSave || saving || submitting}
          >
            {saving && <Loader2Icon className="size-4 me-2 animate-spin" />}
            {t("Save as Draft", "حفظ كمسودة")}
          </Button>
        </div>
      </div>
    </div>
  );
}
