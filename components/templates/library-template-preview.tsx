"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCopyIcon, LockIcon, SparklesIcon, CheckCircle2Icon, AlertTriangleIcon } from "lucide-react";
import { toast } from "sonner";
import type { LibraryTemplate } from "@/lib/templateLibrary";
import { CATEGORY_LABELS } from "@/lib/templateLibrary";
import { useT } from "@/lib/i18n/context";

interface Props {
  template: LibraryTemplate | null;
  open: boolean;
  onClose: () => void;
  onUseQuickReply: (template: LibraryTemplate) => void;
  onUseMeta: (template: LibraryTemplate) => void;
  isFree?: boolean;
}

function highlightVars(body: string): ReactNode[] {
  const parts = body.split(/(\\{\\{\\w+\\}\\})/g);
  return parts.map((part, i) => {
    if (/^\\{\\{\\w+\\}\\}$/.test(part)) {
      return (
        <span
          key={i}
          className="inline-flex items-center rounded-md bg-primary/15 text-primary dark:text-primary px-1 py-px font-mono text-[11px] font-medium"
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function LibraryTemplatePreview({
  template,
  open,
  onClose,
  onUseQuickReply,
  onUseMeta,
  isFree = false,
}: Props) {
  const t = useT();

  if (!template) return null;

  const catMeta = CATEGORY_LABELS[template.category];

  function handleCopy() {
    navigator.clipboard.writeText(template!.body);
    toast.success(t("Copied to clipboard", "تم النسخ"));
  }

  function handleUse() {
    if (template!.type === "meta") {
      onUseMeta(template!);
    } else {
      onUseQuickReply(template!);
    }
    onClose();
  }

  const isMeta = template.type === "meta";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]">

        {/* ── Header ──────────────────────────────────────────── */}
        <DialogHeader className="border-b border-border/60 bg-muted/20 px-6 py-4 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-primary shrink-0" />
            {template.title}
          </DialogTitle>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {isMeta ? (
              <Badge variant="secondary" className="text-[10px] bg-orange-500/10 text-orange-600 dark:text-orange-400 border-0 rounded-full">
                📢 Meta
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary dark:text-primary border-0 rounded-full">
                💬 {t("Quick-Reply", "رد سريع")}
              </Badge>
            )}
            {catMeta && (
              <Badge variant="outline" className="text-[10px] rounded-full">
                {catMeta.icon} {t(catMeta.en, catMeta.ar)}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] uppercase rounded-full tracking-wider">
              {template.language}
            </Badge>
          </div>
        </DialogHeader>

        {/* ── Scrollable body ─────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-6 py-5 space-y-5">

            {/* ── WhatsApp-style preview ─────────────────────── */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">
                {t("Preview", "معاينة")}
              </p>
              <div className="rounded-xl bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-4 shadow-inner">
                <div className="relative">
                  <div
                    className="inline-block rounded-xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed max-w-full shadow-md"
                    style={{
                      background: "linear-gradient(135deg, #1a2e40 0%, #1f3a4d 100%)",
                      color: "#e9edef",
                    }}
                    dir={template.language === "ar" ? "rtl" : "ltr"}
                  >
                    {highlightVars(template.body)}
                    <div className="flex items-center justify-end gap-1 mt-1.5">
                      <span className="text-[10px] text-[#8696a0]/80">9:41 AM</span>
                      <span className="text-[10px] text-[#53bdeb]">✓✓</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Variables ──────────────────────────────────── */}
            {template.variables.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">
                  {t("Variables", "المتغيرات")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {template.variables.map((v) => (
                    <Badge
                      key={v}
                      variant="outline"
                      className="text-xs font-mono rounded-full bg-primary/5 text-primary dark:text-primary border-primary/20"
                    >
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* ── Info banner ────────────────────────────────── */}
            {isMeta ? (
              <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/8 border border-amber-500/15 px-4 py-3">
                <AlertTriangleIcon className="size-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  {t(
                    "Meta templates require approval before use in broadcasts. Submitting will send it to Meta for review.",
                    "قوالب ميتا تحتاج موافقة قبل الاستخدام في الحملات. الإرسال سيذهب إلى ميتا للمراجعة.",
                  )}
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-xl bg-emerald-500/8 border border-emerald-500/15 px-4 py-3">
                <CheckCircle2Icon className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                  {t(
                    "Quick-reply templates are ready to use immediately — no Meta approval needed.",
                    "قوالب الرد السريع جاهزة للاستخدام فوراً — لا تحتاج موافقة ميتا.",
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer actions ──────────────────────────────────── */}
        <div className="border-t px-6 py-4 shrink-0 space-y-3">
          <div className="flex gap-2 w-full">
            {isFree ? (
              <Button className="flex-1" disabled variant="outline">
                <LockIcon className="size-4 me-2" />
                {t("Upgrade to use", "ارتقِ للاستخدام")}
              </Button>
            ) : (
              <Button className="flex-1" onClick={handleUse}>
                {isMeta
                  ? t("Submit to Meta", "إرسال لميتا")
                  : t("Use This Template", "استخدم هذا القالب")}
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={handleCopy}
              aria-label={t("Copy body", "نسخ النص")}
              title={t("Copy body", "نسخ النص")}
            >
              <ClipboardCopyIcon className="size-4" />
            </Button>
          </div>

          {isFree && (
            <p className="text-xs text-muted-foreground text-center">
              <Link href="/settings/billing" className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">
                {t("Upgrade to Starter or above", "ارتقِ إلى ستارتر أو أعلى")}
              </Link>{" "}
              {t("to save templates or submit to Meta.", "لحفظ القوالب أو إرسالها لميتا.")}
            </p>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
}
