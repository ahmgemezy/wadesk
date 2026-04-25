"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCopyIcon } from "lucide-react";
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
}

function highlightVars(body: string): React.ReactNode[] {
  const parts = body.split(/(\{\{\w+\}\})/g);
  return parts.map((part, i) => {
    if (/^\{\{\w+\}\}$/.test(part)) {
      return (
        <span
          key={i}
          className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded px-0.5 font-mono text-xs"
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

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-lg">{template.title}</SheetTitle>
          <div className="flex flex-wrap gap-1.5">
            {template.type === "meta" ? (
              <Badge variant="secondary" className="text-xs bg-orange-500/10 text-orange-600 dark:text-orange-400 border-0">
                📢 Meta
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-0">
                💬 {t("Quick-Reply", "رد سريع")}
              </Badge>
            )}
            {catMeta && (
              <Badge variant="outline" className="text-xs">
                {catMeta.icon} {t(catMeta.en, catMeta.ar)}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs uppercase">
              {template.language}
            </Badge>
          </div>
        </SheetHeader>

        <div className="rounded-xl bg-[#0a1628] p-3 mb-4">
          <div
            className="inline-block bg-[#1f2c34] rounded-lg px-3 py-2 text-sm text-[#e9edef] leading-relaxed max-w-full"
            dir={template.language === "ar" ? "rtl" : "ltr"}
          >
            {highlightVars(template.body)}
            <div className="text-[10px] text-[#8696a0] mt-1 text-end">✓✓ 9:41 AM</div>
          </div>
        </div>

        {template.variables.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              {t("Variables", "المتغيرات")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {template.variables.map((v) => (
                <Badge
                  key={v}
                  variant="outline"
                  className="text-xs font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                >
                  {`{{${v}}}`}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {template.type === "meta" ? (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 mb-4">
            ⚠️{" "}
            {t(
              "Meta templates require approval before use in broadcasts. Submitting will send it to Meta for review.",
              "قوالب ميتا تحتاج موافقة قبل الاستخدام في الحملات. الإرسال سيذهب إلى ميتا للمراجعة.",
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 mb-4">
            ✅{" "}
            {t(
              "Quick-reply templates are ready to use immediately — no Meta approval needed.",
              "قوالب الرد السريع جاهزة للاستخدام فوراً — لا تحتاج موافقة ميتا.",
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button className="flex-1" onClick={handleUse}>
            {template.type === "meta"
              ? t("Submit to Meta", "إرسال لميتا")
              : t("Use This Template", "استخدم هذا القالب")}
          </Button>
          <Button variant="outline" size="icon" onClick={handleCopy} title={t("Copy body", "نسخ النص")}>
            <ClipboardCopyIcon className="size-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
