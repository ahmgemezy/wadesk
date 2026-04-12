"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { XIcon } from "lucide-react";

type Stage = "lead" | "prospect" | "customer" | "retained" | "churned";

const STAGES: Stage[] = ["lead", "prospect", "customer", "retained", "churned"];

const STAGE_LABELS: Record<Stage, { ar: string; en: string }> = {
  lead: { ar: "عميل محتمل", en: "Lead" },
  prospect: { ar: "مرشح", en: "Prospect" },
  customer: { ar: "عميل", en: "Customer" },
  retained: { ar: "عميل دائم", en: "Retained" },
  churned: { ar: "مفقود", en: "Churned" },
};

const STAGE_COLORS: Record<Stage, string> = {
  lead: "bg-slate-100 text-slate-700",
  prospect: "bg-blue-100 text-blue-700",
  customer: "bg-emerald-100 text-emerald-700",
  retained: "bg-violet-100 text-violet-700",
  churned: "bg-rose-100 text-rose-700",
};

const COMMON_COUNTRIES = [
  { iso: "EG", ar: "مصر", en: "Egypt" },
  { iso: "SA", ar: "السعودية", en: "Saudi Arabia" },
  { iso: "AE", ar: "الإمارات", en: "UAE" },
  { iso: "KW", ar: "الكويت", en: "Kuwait" },
  { iso: "QA", ar: "قطر", en: "Qatar" },
  { iso: "BH", ar: "البحرين", en: "Bahrain" },
  { iso: "OM", ar: "عُمان", en: "Oman" },
  { iso: "JO", ar: "الأردن", en: "Jordan" },
  { iso: "LB", ar: "لبنان", en: "Lebanon" },
];

const t = {
  ar: {
    title: "إنشاء قائمة جديدة",
    namePlaceholder: "اسم القائمة...",
    descriptionPlaceholder: "وصف اختياري...",
    filters: "الفلاتر",
    country: "الدولة",
    city: "المدينة",
    stage: "المرحلة",
    tags: "الوسوم",
    cityPlaceholder: "اكتب مدينة واضغط Enter...",
    tagPlaceholder: "اكتب وسماً واضغط Enter...",
    preview: "معاينة النتائج",
    contacts: "جهة اتصال مطابقة",
    save: "حفظ القائمة",
    cancel: "إلغاء",
    nameRequired: "الاسم مطلوب",
    saving: "جاري الحفظ...",
  },
  en: {
    title: "Create New List",
    namePlaceholder: "List name...",
    descriptionPlaceholder: "Optional description...",
    filters: "Filters",
    country: "Country",
    city: "City",
    stage: "Stage",
    tags: "Tags",
    cityPlaceholder: "Type a city and press Enter...",
    tagPlaceholder: "Type a tag and press Enter...",
    preview: "Live Preview",
    contacts: "matching contacts",
    save: "Save List",
    cancel: "Cancel",
    nameRequired: "Name is required",
    saving: "Saving...",
  },
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: "ar" | "en";
};

export function CreateListDialog({ open, onOpenChange, locale }: Props) {
  const tx = t[locale];
  const createList = useMutation(api.contactLists.create);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [cityInput, setCityInput] = useState("");
  const [selectedStages, setSelectedStages] = useState<Stage[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);

  const filters = useMemo(
    () => ({
      countries: selectedCountries.length > 0 ? selectedCountries : undefined,
      cities: cities.length > 0 ? cities : undefined,
      stages: selectedStages.length > 0 ? selectedStages : undefined,
      tags: tags.length > 0 ? tags : undefined,
    }),
    [selectedCountries, cities, selectedStages, tags],
  );

  const preview = useQuery(api.contactLists.previewCount, { filters });

  function toggleCountry(iso: string) {
    setSelectedCountries((prev) =>
      prev.includes(iso) ? prev.filter((c) => c !== iso) : [...prev, iso],
    );
  }

  function toggleStage(stage: Stage) {
    setSelectedStages((prev) =>
      prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage],
    );
  }

  function addCity(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && cityInput.trim()) {
      e.preventDefault();
      const val = cityInput.trim();
      if (!cities.includes(val)) setCities((prev) => [...prev, val]);
      setCityInput("");
    }
  }

  function addTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const val = tagInput.trim();
      if (!tags.includes(val)) setTags((prev) => [...prev, val]);
      setTagInput("");
    }
  }

  function reset() {
    setName("");
    setDescription("");
    setSelectedCountries([]);
    setCities([]);
    setCityInput("");
    setSelectedStages([]);
    setTags([]);
    setTagInput("");
    setNameError(false);
  }

  async function handleSave() {
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    setSaving(true);
    try {
      await createList({
        name: name.trim(),
        description: description.trim() || undefined,
        filters,
      });
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const topStages = preview
    ? Object.entries(preview.stageBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
    : [];

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <SheetContent
        side={locale === "ar" ? "right" : "left"}
        className="w-full sm:max-w-2xl flex flex-col gap-0 p-0"
        dir={locale === "ar" ? "rtl" : "ltr"}
      >
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{tx.title}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto flex flex-col sm:flex-row">
          <div className="flex-1 p-6 flex flex-col gap-5 border-e">
            <div>
              <Input
                placeholder={tx.namePlaceholder}
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError(false); }}
                className={nameError ? "border-destructive" : ""}
              />
              {nameError && (
                <p className="text-xs text-destructive mt-1">{tx.nameRequired}</p>
              )}
            </div>

            <Input
              placeholder={tx.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                {tx.country}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_COUNTRIES.map((c) => (
                  <button
                    key={c.iso}
                    type="button"
                    onClick={() => toggleCountry(c.iso)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      selectedCountries.includes(c.iso)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {c[locale]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                {tx.city}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {cities.map((city) => (
                  <Badge key={city} variant="secondary" className="gap-1">
                    {city}
                    <button type="button" onClick={() => setCities((prev) => prev.filter((c) => c !== city))}>
                      <XIcon className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                placeholder={tx.cityPlaceholder}
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onKeyDown={addCity}
              />
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                {tx.stage}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {STAGES.map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => toggleStage(stage)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      selectedStages.includes(stage)
                        ? `${STAGE_COLORS[stage]} border-transparent`
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {STAGE_LABELS[stage][locale]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                {tx.tags}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button type="button" onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}>
                      <XIcon className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                placeholder={tx.tagPlaceholder}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={addTag}
              />
            </div>
          </div>

          <div className="w-full sm:w-56 p-6 bg-muted/30 flex flex-col gap-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {tx.preview}
            </p>
            <div>
              <div className="text-3xl font-bold text-primary">
                {preview === undefined ? "—" : preview.count}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{tx.contacts}</div>
            </div>
            {topStages.length > 0 && (
              <div className="flex flex-col gap-2">
                {topStages.map(([stage, count]) => (
                  <div key={stage} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {STAGE_LABELS[stage as Stage]?.[locale] ?? stage}
                    </span>
                    <span className="text-xs font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
            {tx.cancel}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? tx.saving : tx.save}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
