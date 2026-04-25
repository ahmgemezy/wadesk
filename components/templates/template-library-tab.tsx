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
  type LibraryTemplate,
  type LibraryTemplateType,
} from "@/lib/templateLibrary";
import { useT } from "@/lib/i18n/context";
import { SearchIcon } from "lucide-react";

interface Props {
  onUseQuickReply: (template: LibraryTemplate) => void;
}

type TypeFilter = "all" | LibraryTemplateType;

export function TemplateLibraryTab({ onUseQuickReply }: Props) {
  const t = useT();
  const plan = useQuery(api.lib.tenants.getCurrentPlan);
  const isFree = plan === "free";

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [previewTemplate, setPreviewTemplate] = useState<LibraryTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [metaFormTemplate, setMetaFormTemplate] = useState<LibraryTemplate | null>(null);
  const [metaFormOpen, setMetaFormOpen] = useState(false);

  const activeCategories = useMemo<string[]>(() => {
    if (typeFilter === "all") {
      return [
        ...LIBRARY_CATEGORIES.meta,
        ...LIBRARY_CATEGORIES.quick_reply,
      ];
    }
    return LIBRARY_CATEGORIES[typeFilter];
  }, [typeFilter]);

  function handleTypeFilter(next: TypeFilter) {
    setTypeFilter(next);
    setCategoryFilter("all");
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return LIBRARY_TEMPLATES.filter((tpl) => {
      if (typeFilter !== "all" && tpl.type !== typeFilter) return false;
      if (categoryFilter !== "all" && tpl.category !== categoryFilter) return false;
      if (q && !tpl.title.toLowerCase().includes(q) && !tpl.body.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [search, typeFilter, categoryFilter]);

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

  const TYPE_FILTERS: { value: TypeFilter; label: string; labelAr: string }[] = [
    { value: "all",        label: "All",                  labelAr: "الكل" },
    { value: "meta",       label: "📢 Meta (Broadcast)",  labelAr: "📢 ميتا (حملات)" },
    { value: "quick_reply",label: "💬 Quick-Reply",        labelAr: "💬 رد سريع" },
  ];

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

      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => handleTypeFilter(f.value)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              typeFilter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {t(f.label, f.labelAr)}
          </button>
        ))}
      </div>

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
        {activeCategories.map((cat) => {
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
        {filtered.length} {filtered.length === 1 ? t("template", "قالب") : filtered.length === 2 ? t("templates", "قالبان") : t("templates", "قوالب")}
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
