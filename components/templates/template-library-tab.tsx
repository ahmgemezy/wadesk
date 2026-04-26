"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { LibraryTemplateCard } from "@/components/templates/library-template-card";
import { LibraryTemplatePreview } from "@/components/templates/library-template-preview";
import { MetaSubmitForm } from "@/components/templates/meta-submit-form";
import {
  LIBRARY_TEMPLATES,
  LIBRARY_CATEGORIES,
  CATEGORY_LABELS,
  INDUSTRY_LABELS,
  type LibraryTemplate,
  type Industry,
  type MetaCategory,
} from "@/lib/templateLibrary";
import { useT } from "@/lib/i18n/context";
import { SearchIcon } from "lucide-react";

interface Props {
  onUseQuickReply: (template: LibraryTemplate) => void;
}

const ALL_CATEGORIES = [
  ...LIBRARY_CATEGORIES.meta,
  ...LIBRARY_CATEGORIES.quick_reply,
];

const INDUSTRY_ORDER: Industry[] = [
  "ecommerce", "food", "health", "realestate",
  "education", "beauty", "auto", "finance", "travel", "general",
];

const PURPOSE_FILTERS: { value: "all" | MetaCategory; labelEn: string; labelAr: string }[] = [
  { value: "all",            labelEn: "All purposes",        labelAr: "كل الأغراض" },
  { value: "MARKETING",      labelEn: "🎯 Marketing",         labelAr: "🎯 تسويقي" },
  { value: "UTILITY",        labelEn: "🔧 Utility",           labelAr: "🔧 خدمي" },
  { value: "AUTHENTICATION", labelEn: "🔐 Authentication",    labelAr: "🔐 مصادقة" },
];

export function TemplateLibraryTab({ onUseQuickReply }: Props) {
  const t = useT();
  const plan = useQuery(api.lib.tenants.getCurrentPlan);
  const isFree = plan === "free";

  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState<"all" | Industry>("all");
  const [purposeFilter, setPurposeFilter] = useState<"all" | MetaCategory>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [previewTemplate, setPreviewTemplate] = useState<LibraryTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [metaFormTemplate, setMetaFormTemplate] = useState<LibraryTemplate | null>(null);
  const [metaFormOpen, setMetaFormOpen] = useState(false);

  function handleIndustryFilter(next: "all" | Industry) {
    setIndustryFilter(next);
    setPurposeFilter("all");
    setCategoryFilter("all");
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return LIBRARY_TEMPLATES.filter((tpl) => {
      // "general" tagged templates appear under any specific industry tab
      if (
        industryFilter !== "all" &&
        !tpl.industries.includes(industryFilter) &&
        !tpl.industries.includes("general")
      ) return false;
      // purpose filter: quick_reply has no metaCategory → excluded when purpose is active
      if (purposeFilter !== "all" && tpl.metaCategory !== purposeFilter) return false;
      if (categoryFilter !== "all" && tpl.category !== categoryFilter) return false;
      if (q && !tpl.title.toLowerCase().includes(q) && !tpl.body.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [search, industryFilter, purposeFilter, categoryFilter]);

  function handleCardClick(template: LibraryTemplate) {
    setPreviewTemplate(template);
    setPreviewOpen(true);
  }

  function handleUseQuickReply(template: LibraryTemplate) {
    if (isFree) return;
    onUseQuickReply(template);
  }

  function handleUseMeta(template: LibraryTemplate) {
    if (isFree) return;
    setMetaFormTemplate(template);
    setMetaFormOpen(true);
  }

  return (
    <div className="space-y-4">
      {isFree && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
          {t(
            "Browse templates freely! Upgrade to Starter to save quick-reply templates or submit Meta templates for approval.",
            "تصفّح القوالب بحرية! ارتقِ إلى خطة ستارتر لحفظ قوالب الرد السريع أو إرسال قوالب ميتا للمراجعة.",
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          className="ps-9"
          placeholder={t("Search templates…", "البحث في القوالب...")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          dir="auto"
        />
      </div>

      {/* Industry tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1 border-b border-border scrollbar-none" dir="ltr">
        <button
          type="button"
          onClick={() => handleIndustryFilter("all")}
          className={`shrink-0 px-3 py-2 text-xs font-medium rounded-t transition-colors border-b-2 -mb-px ${
            industryFilter === "all"
              ? "border-primary text-foreground bg-muted/50"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          🌐 {t("All", "الكل")}
        </button>
        {INDUSTRY_ORDER.map((ind) => {
          const meta = INDUSTRY_LABELS[ind];
          return (
            <button
              key={ind}
              type="button"
              onClick={() => handleIndustryFilter(ind)}
              className={`shrink-0 px-3 py-2 text-xs font-medium rounded-t transition-colors border-b-2 -mb-px ${
                industryFilter === ind
                  ? "border-primary text-foreground bg-muted/50"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {meta.icon} {t(meta.en, meta.ar)}
            </button>
          );
        })}
      </div>

      {/* Purpose chips */}
      <div className="flex flex-wrap gap-2">
        {PURPOSE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setPurposeFilter(f.value)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              purposeFilter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {t(f.labelEn, f.labelAr)}
          </button>
        ))}
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setCategoryFilter("all")}
          className={`rounded-full px-2.5 py-1 text-xs transition-colors border ${
            categoryFilter === "all"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-muted-foreground"
          }`}
        >
          {t("All categories", "كل الفئات")}
        </button>
        {ALL_CATEGORIES.map((cat) => {
          const meta = CATEGORY_LABELS[cat];
          if (!meta) return null;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat === categoryFilter ? "all" : cat)}
              className={`rounded-full px-2.5 py-1 text-xs transition-colors border ${
                categoryFilter === cat
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-muted-foreground"
              }`}
            >
              {meta.icon} {t(meta.en, meta.ar)}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length}{" "}
        {filtered.length === 1
          ? t("template", "قالب")
          : filtered.length === 2
            ? t("templates", "قالبان")
            : t("templates", "قوالب")}
      </p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed bg-muted/30">
          <p className="text-sm text-muted-foreground">
            {t("No templates match your search.", "لا توجد قوالب تطابق بحثك.")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((tpl) => (
            <LibraryTemplateCard
              key={tpl.id}
              template={tpl}
              onClick={handleCardClick}
            />
          ))}
        </div>
      )}

      <LibraryTemplatePreview
        template={previewTemplate}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onUseQuickReply={handleUseQuickReply}
        onUseMeta={handleUseMeta}
        isFree={isFree}
      />

      <MetaSubmitForm
        template={metaFormTemplate}
        open={metaFormOpen}
        onClose={() => setMetaFormOpen(false)}
      />
    </div>
  );
}
