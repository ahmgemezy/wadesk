"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  BotIcon,
  SparklesIcon,
  MessageCircleIcon,
  BookOpenIcon,
  ZapIcon,
  ShieldCheckIcon,
} from "lucide-react";

type Tone = "friendly" | "professional" | "empathetic";
type ResponseLength = 0 | 1 | 2;

const TONE_OPTIONS: { value: Tone; labelAr: string; labelEn: string; descAr: string; descEn: string }[] = [
  {
    value: "friendly",
    labelAr: "ودي وغير رسمي",
    labelEn: "Friendly & Casual",
    descAr: "محادثة طبيعية ودافئة",
    descEn: "Natural and warm conversation",
  },
  {
    value: "professional",
    labelAr: "احترافي ورسمي",
    labelEn: "Professional & Formal",
    descAr: "لغة رسمية ومهنية",
    descEn: "Formal and business-appropriate language",
  },
  {
    value: "empathetic",
    labelAr: "متعاطف وداعم",
    labelEn: "Empathetic & Supportive",
    descAr: "اهتمام حقيقي بمشكلة العميل",
    descEn: "Genuine care for the customer's concern",
  },
];

const LENGTH_LABELS: { ar: string; en: string }[] = [
  { ar: "مختصر", en: "Concise" },
  { ar: "متوازن", en: "Medium" },
  { ar: "تفصيلي", en: "Detailed" },
];

const tx = {
  ar: {
    title: "المساعد الذكي",
    subtitle: "اضبط سلوك المساعد الذكي ليتناسب مع أسلوب عملك.",
    comingSoon: "قريباً",
    activeStatus: "تفعيل المساعد الذكي",
    activeDesc: "عند التفعيل، يرد المساعد تلقائياً على رسائل العملاء.",
    tone: "نبرة الردود",
    toneDesc: "اختر الأسلوب الذي يتحدث به المساعد مع عملائك.",
    responseLength: "طول الرد",
    responseLengthDesc: "حدد مدى تفصيل ردود المساعد.",
    rules: "قواعد الاستجابة والمعرفة",
    rulesDesc: "حدد ما يستطيع المساعد فعله وما يعرفه.",
    autoActions: "الإجراءات التلقائية",
    autoHandoff: "تصعيد تلقائي إلى وكيل بشري",
    autoHandoffDesc: "عند عدم الثقة بالإجابة",
    autoClose: "إغلاق المحادثة تلقائياً",
    autoCloseDesc: "بعد حل المشكلة بنجاح",
    customInstructions: "تعليمات مخصصة",
    customInstructionsPlaceholder:
      "مثال: لا تشارك أسعار المنافسين. لا توافق على الاسترداد بدون موافقة المدير...",
    save: "حفظ الإعدادات",
    savedToast: "تم حفظ الإعدادات",
    comingSoonToast: "هذه الميزة قادمة قريباً",
  },
  en: {
    title: "AI Assistant",
    subtitle: "Configure your AI assistant to match your business style.",
    comingSoon: "Coming Soon",
    activeStatus: "Enable AI Assistant",
    activeDesc: "When enabled, the assistant replies to customer messages automatically.",
    tone: "Tone of Voice",
    toneDesc: "Choose how the assistant communicates with your customers.",
    responseLength: "Response Length",
    responseLengthDesc: "Set how detailed the assistant's replies should be.",
    rules: "Response Rules & Knowledge",
    rulesDesc: "Define what the assistant can do and know.",
    autoActions: "Automated Actions",
    autoHandoff: "Auto-escalate to human agent",
    autoHandoffDesc: "When not confident in the answer",
    autoClose: "Auto-close conversation",
    autoCloseDesc: "After successful resolution",
    customInstructions: "Custom Instructions",
    customInstructionsPlaceholder:
      "E.g. Never share competitor pricing. Don't approve refunds without manager sign-off...",
    save: "Save Configuration",
    savedToast: "Configuration saved",
    comingSoonToast: "This feature is coming soon",
  },
};

export function AiAssistantSettings() {
  const locale = useLocale();
  const t = tx[locale];
  const [active, setActive] = useState(false);
  const [tone, setTone] = useState<Tone>("friendly");
  const [responseLength, setResponseLength] = useState<ResponseLength>(1);
  const [autoHandoff, setAutoHandoff] = useState(true);
  const [autoClose, setAutoClose] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");

  function handleSave() {
    toast.info(t.comingSoonToast);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
              <SparklesIcon className="size-3" />
              {t.comingSoon}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="shrink-0 w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <BotIcon className="size-6 text-primary" />
        </div>
      </div>

      {/* Active Status */}
      <section className="rounded-xl border bg-card p-5 space-y-1">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">{t.activeStatus}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t.activeDesc}</p>
          </div>
          <Switch
            checked={active}
            onCheckedChange={setActive}
            aria-label={t.activeStatus}
          />
        </div>
      </section>

      {/* Tone of Voice */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <MessageCircleIcon className="size-4 text-muted-foreground" />
          <div>
            <p className="font-semibold text-sm">{t.tone}</p>
            <p className="text-xs text-muted-foreground">{t.toneDesc}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TONE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTone(opt.value)}
              className={`rounded-lg border p-3 text-start transition-colors ${
                tone === opt.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "hover:bg-muted/50"
              }`}
            >
              <p className="text-sm font-medium">
                {locale === "ar" ? opt.labelAr : opt.labelEn}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {locale === "ar" ? opt.descAr : opt.descEn}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Response Length */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <BookOpenIcon className="size-4 text-muted-foreground" />
          <div>
            <p className="font-semibold text-sm">{t.responseLength}</p>
            <p className="text-xs text-muted-foreground">{t.responseLengthDesc}</p>
          </div>
        </div>
        <div className="space-y-2">
          <input
            type="range"
            min={0}
            max={2}
            step={1}
            value={responseLength}
            onChange={(e) => setResponseLength(Number(e.target.value) as ResponseLength)}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            {LENGTH_LABELS.map((l) => (
              <span key={l.en}>{locale === "ar" ? l.ar : l.en}</span>
            ))}
          </div>
        </div>
        <p className="text-xs text-primary font-medium">
          {locale === "ar"
            ? LENGTH_LABELS[responseLength].ar
            : LENGTH_LABELS[responseLength].en}
        </p>
      </section>

      {/* Response Rules & Knowledge */}
      <section className="rounded-xl border bg-card p-5 space-y-5">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="size-4 text-muted-foreground" />
          <div>
            <p className="font-semibold text-sm">{t.rules}</p>
            <p className="text-xs text-muted-foreground">{t.rulesDesc}</p>
          </div>
        </div>

        {/* Automated Actions */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <ZapIcon className="size-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t.autoActions}
            </p>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{t.autoHandoff}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.autoHandoffDesc}</p>
            </div>
            <Switch
              checked={autoHandoff}
              onCheckedChange={setAutoHandoff}
              aria-label={t.autoHandoff}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{t.autoClose}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.autoCloseDesc}</p>
            </div>
            <Switch
              checked={autoClose}
              onCheckedChange={setAutoClose}
              aria-label={t.autoClose}
            />
          </div>
        </div>

        {/* Custom Instructions */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t.customInstructions}</label>
          <Textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder={t.customInstructionsPlaceholder}
            rows={4}
            className="resize-none text-sm"
          />
        </div>
      </section>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-1.5">
          <SparklesIcon className="size-4" />
          {t.save}
        </Button>
      </div>
    </div>
  );
}
