"use client";

import { DT } from "@/lib/design-tokens";
import type { LibraryTemplate } from "@/lib/templateLibrary";
import { CATEGORY_LABELS, INDUSTRY_LABELS } from "@/lib/templateLibrary";
import { useT } from "@/lib/i18n/context";

interface Props {
  template: LibraryTemplate;
  onClick: (template: LibraryTemplate) => void;
}

function PurposeBadge({ template, t }: { template: LibraryTemplate; t: (en: string, ar: string) => string }) {
  if (template.type === "quick_reply") {
    return (
      <span className="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 border-0 px-2.5 py-0.5 rounded-full inline-flex items-center">
        💬 {t("Quick-Reply", "رد سريع")}
      </span>
    );
  }
  if (template.metaCategory === "MARKETING") {
    return (
      <span className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-0 px-2.5 py-0.5 rounded-full inline-flex items-center">
        🎯 {t("Marketing Broadcast", "حملة تسويقية")}
      </span>
    );
  }
  if (template.metaCategory === "AUTHENTICATION") {
    return (
      <span className={`text-[10px] ${DT.BG_AMBER_LIGHT} ${DT.TEXT_AMBER} border-0 px-2.5 py-0.5 rounded-full inline-flex items-center`}>
        🔐 {t("Auth Broadcast", "حملة مصادقة")}
      </span>
    );
  }
  // UTILITY (default for meta)
  return (
    <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-0 px-2.5 py-0.5 rounded-full inline-flex items-center">
      🔧 {t("Utility Broadcast", "حملة خدمية")}
    </span>
  );
}

export function LibraryTemplateCard({ template, onClick }: Props) {
  const t = useT();
  const catMeta = CATEGORY_LABELS[template.category];

  const displayIndustries = template.industries.slice(0, 2);
  const extraCount = template.industries.length - 2;

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
        <span className="shrink-0 text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-border inline-flex items-center">
          {template.language === "ar" ? "AR" : "EN"}
        </span>
      </div>

      <p
        className="text-xs text-muted-foreground line-clamp-2 leading-relaxed"
        dir={template.language === "ar" ? "rtl" : "ltr"}
      >
        {template.body}
      </p>

      <div className="flex flex-wrap gap-1.5 mt-auto pt-1 border-t border-border/50">
        <PurposeBadge template={template} t={t} />
        {catMeta && (
          <span className="text-[10px] px-2.5 py-0.5 rounded-full border border-border inline-flex items-center">
            {catMeta.icon} {t(catMeta.en, catMeta.ar)}
          </span>
        )}
        {displayIndustries.map((ind) => {
          const indMeta = INDUSTRY_LABELS[ind];
          return (
            <span key={ind} className="text-[10px] text-muted-foreground px-2.5 py-0.5 rounded-full border border-border inline-flex items-center">
              {indMeta.icon} {t(indMeta.en, indMeta.ar)}
            </span>
          );
        })}
        {extraCount > 0 && (
          <span className="text-[10px] text-muted-foreground px-2.5 py-0.5 rounded-full border border-border inline-flex items-center">
            +{extraCount}
          </span>
        )}
      </div>
    </button>
  );
}
