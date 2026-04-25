"use client";

import { Badge } from "@/components/ui/badge";
import type { LibraryTemplate } from "@/lib/templateLibrary";
import { CATEGORY_LABELS } from "@/lib/templateLibrary";
import { useT } from "@/lib/i18n/context";

interface Props {
  template: LibraryTemplate;
  onClick: (template: LibraryTemplate) => void;
}

export function LibraryTemplateCard({ template, onClick }: Props) {
  const t = useT();
  const catMeta = CATEGORY_LABELS[template.category];

  return (
    <button
      type="button"
      onClick={() => onClick(template)}
      className="w-full text-start rounded-lg border bg-card hover:bg-accent/50 hover:border-primary/30 transition-colors p-4 flex flex-col gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold leading-tight line-clamp-1">
          {template.title}
        </span>
        <Badge variant="outline" className="shrink-0 text-[10px] uppercase tracking-wider">
          {template.language === "ar" ? "AR" : "EN"}
        </Badge>
      </div>

      <p
        className="text-xs text-muted-foreground line-clamp-2 leading-relaxed"
        dir={template.language === "ar" ? "rtl" : "ltr"}
      >
        {template.body}
      </p>

      <div className="flex flex-wrap gap-1.5 mt-auto">
        {template.type === "meta" ? (
          <Badge variant="secondary" className="text-[10px] bg-orange-500/10 text-orange-600 dark:text-orange-400 border-0">
            📢 {t("Meta", "ميتا")}
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-0">
            💬 {t("Quick-Reply", "رد سريع")}
          </Badge>
        )}
        {catMeta && (
          <Badge variant="outline" className="text-[10px]">
            {catMeta.icon} {t(catMeta.en, catMeta.ar)}
          </Badge>
        )}
      </div>
    </button>
  );
}
