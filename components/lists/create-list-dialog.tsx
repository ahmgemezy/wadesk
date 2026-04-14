"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { XIcon, UsersIcon, CheckIcon, GlobeIcon, MapPinIcon } from "lucide-react";
import { useEffect, useRef } from "react";

// ─── World Countries (ISO 3166-1 alpha-2, excluding IL) ──────────────────────
// Each entry: [iso, arabicName, englishName]
const ALL_COUNTRIES: [string, string, string][] = [
  ["AF","أفغانستان","Afghanistan"],["AL","ألبانيا","Albania"],["DZ","الجزائر","Algeria"],
  ["AD","أندورا","Andorra"],["AO","أنغولا","Angola"],["AG","أنتيغوا وباربودا","Antigua and Barbuda"],
  ["AR","الأرجنتين","Argentina"],["AM","أرمينيا","Armenia"],["AU","أستراليا","Australia"],
  ["AT","النمسا","Austria"],["AZ","أذربيجان","Azerbaijan"],["BS","البهاما","Bahamas"],
  ["BH","البحرين","Bahrain"],["BD","بنغلاديش","Bangladesh"],["BB","باربادوس","Barbados"],
  ["BY","بيلاروسيا","Belarus"],["BE","بلجيكا","Belgium"],["BZ","بليز","Belize"],
  ["BJ","بنين","Benin"],["BT","بوتان","Bhutan"],["BO","بوليفيا","Bolivia"],
  ["BA","البوسنة والهرسك","Bosnia and Herzegovina"],["BW","بوتسوانا","Botswana"],
  ["BR","البرازيل","Brazil"],["BN","بروناي","Brunei"],["BG","بلغاريا","Bulgaria"],
  ["BF","بوركينا فاسو","Burkina Faso"],["BI","بوروندي","Burundi"],["CV","الرأس الأخضر","Cape Verde"],
  ["KH","كمبوديا","Cambodia"],["CM","الكاميرون","Cameroon"],["CA","كندا","Canada"],
  ["CF","جمهورية أفريقيا الوسطى","Central African Republic"],["TD","تشاد","Chad"],
  ["CL","تشيلي","Chile"],["CN","الصين","China"],["CO","كولومبيا","Colombia"],
  ["KM","جزر القمر","Comoros"],["CG","جمهورية الكونغو","Congo"],
  ["CD","جمهورية الكونغو الديمقراطية","Congo (DRC)"],["CR","كوستاريكا","Costa Rica"],
  ["HR","كرواتيا","Croatia"],["CU","كوبا","Cuba"],["CY","قبرص","Cyprus"],
  ["CZ","التشيك","Czech Republic"],["DK","الدنمارك","Denmark"],["DJ","جيبوتي","Djibouti"],
  ["DM","دومينيكا","Dominica"],["DO","جمهورية الدومينيكان","Dominican Republic"],
  ["EC","الإكوادور","Ecuador"],["EG","مصر","Egypt"],["SV","السلفادور","El Salvador"],
  ["GQ","غينيا الاستوائية","Equatorial Guinea"],["ER","إريتريا","Eritrea"],
  ["EE","إستونيا","Estonia"],["SZ","إسواتيني","Eswatini"],["ET","إثيوبيا","Ethiopia"],
  ["FJ","فيجي","Fiji"],["FI","فنلندا","Finland"],["FR","فرنسا","France"],
  ["GA","الغابون","Gabon"],["GM","غامبيا","Gambia"],["GE","جورجيا","Georgia"],
  ["DE","ألمانيا","Germany"],["GH","غانا","Ghana"],["GR","اليونان","Greece"],
  ["GD","غرينادا","Grenada"],["GT","غواتيمالا","Guatemala"],["GN","غينيا","Guinea"],
  ["GW","غينيا بيساو","Guinea-Bissau"],["GY","غيانا","Guyana"],["HT","هايتي","Haiti"],
  ["HN","هندوراس","Honduras"],["HU","المجر","Hungary"],["IS","آيسلندا","Iceland"],
  ["IN","الهند","India"],["ID","إندونيسيا","Indonesia"],["IR","إيران","Iran"],
  ["IQ","العراق","Iraq"],["IE","أيرلندا","Ireland"],["IT","إيطاليا","Italy"],
  ["JM","جامايكا","Jamaica"],["JP","اليابان","Japan"],["JO","الأردن","Jordan"],
  ["KZ","كازاخستان","Kazakhstan"],["KE","كينيا","Kenya"],["KI","كيريباتي","Kiribati"],
  ["KP","كوريا الشمالية","Korea (North)"],["KR","كوريا الجنوبية","Korea (South)"],
  ["KW","الكويت","Kuwait"],["KG","قيرغيزستان","Kyrgyzstan"],["LA","لاوس","Laos"],
  ["LV","لاتفيا","Latvia"],["LB","لبنان","Lebanon"],["LS","ليسوتو","Lesotho"],
  ["LR","ليبيريا","Liberia"],["LY","ليبيا","Libya"],["LI","ليختنشتاين","Liechtenstein"],
  ["LT","ليتوانيا","Lithuania"],["LU","لوكسمبورغ","Luxembourg"],
  ["MG","مدغشقر","Madagascar"],["MW","مالاوي","Malawi"],["MY","ماليزيا","Malaysia"],
  ["MV","المالديف","Maldives"],["ML","مالي","Mali"],["MT","مالطا","Malta"],
  ["MH","جزر مارشال","Marshall Islands"],["MR","موريتانيا","Mauritania"],
  ["MU","موريشيوس","Mauritius"],["MX","المكسيك","Mexico"],["FM","ميكرونيزيا","Micronesia"],
  ["MD","مولدوفا","Moldova"],["MC","موناكو","Monaco"],["MN","منغوليا","Mongolia"],
  ["ME","الجبل الأسود","Montenegro"],["MA","المغرب","Morocco"],["MZ","موزمبيق","Mozambique"],
  ["MM","ميانمار","Myanmar"],["NA","ناميبيا","Namibia"],["NR","ناورو","Nauru"],
  ["NP","نيبال","Nepal"],["NL","هولندا","Netherlands"],["NZ","نيوزيلندا","New Zealand"],
  ["NI","نيكاراغوا","Nicaragua"],["NE","النيجر","Niger"],["NG","نيجيريا","Nigeria"],
  ["MK","مقدونيا الشمالية","North Macedonia"],["NO","النرويج","Norway"],
  ["OM","عُمان","Oman"],["PK","باكستان","Pakistan"],["PW","بالاو","Palau"],
  ["PS","فلسطين","Palestine"],["PA","بنما","Panama"],["PG","بابوا غينيا الجديدة","Papua New Guinea"],
  ["PY","باراغواي","Paraguay"],["PE","بيرو","Peru"],["PH","الفلبين","Philippines"],
  ["PL","بولندا","Poland"],["PT","البرتغال","Portugal"],["QA","قطر","Qatar"],
  ["RO","رومانيا","Romania"],["RU","روسيا","Russia"],["RW","رواندا","Rwanda"],
  ["KN","سانت كيتس ونيفيس","Saint Kitts and Nevis"],["LC","سانت لوسيا","Saint Lucia"],
  ["VC","سانت فنسنت وجزر غرينادين","Saint Vincent and the Grenadines"],
  ["WS","ساموا","Samoa"],["SM","سان مارينو","San Marino"],
  ["ST","ساو تومي وبرينسيبي","Sao Tome and Principe"],["SA","السعودية","Saudi Arabia"],
  ["SN","السنغال","Senegal"],["RS","صربيا","Serbia"],["SC","سيشيل","Seychelles"],
  ["SL","سيراليون","Sierra Leone"],["SG","سنغافورة","Singapore"],
  ["SK","سلوفاكيا","Slovakia"],["SI","سلوفينيا","Slovenia"],
  ["SB","جزر سليمان","Solomon Islands"],["SO","الصومال","Somalia"],
  ["ZA","جنوب أفريقيا","South Africa"],["SS","جنوب السودان","South Sudan"],
  ["ES","إسبانيا","Spain"],["LK","سريلانكا","Sri Lanka"],["SD","السودان","Sudan"],
  ["SR","سورينام","Suriname"],["SE","السويد","Sweden"],["CH","سويسرا","Switzerland"],
  ["SY","سوريا","Syria"],["TW","تايوان","Taiwan"],["TJ","طاجيكستان","Tajikistan"],
  ["TZ","تنزانيا","Tanzania"],["TH","تايلاند","Thailand"],["TL","تيمور الشرقية","Timor-Leste"],
  ["TG","توغو","Togo"],["TO","تونغا","Tonga"],["TT","ترينيداد وتوباغو","Trinidad and Tobago"],
  ["TN","تونس","Tunisia"],["TR","تركيا","Turkey"],["TM","تركمانستان","Turkmenistan"],
  ["TV","توفالو","Tuvalu"],["UG","أوغندا","Uganda"],["UA","أوكرانيا","Ukraine"],
  ["AE","الإمارات","UAE"],["GB","المملكة المتحدة","United Kingdom"],
  ["US","الولايات المتحدة","United States"],["UY","أوروغواي","Uruguay"],
  ["UZ","أوزبكستان","Uzbekistan"],["VU","فانواتو","Vanuatu"],
  ["VE","فنزويلا","Venezuela"],["VN","فيتنام","Vietnam"],["YE","اليمن","Yemen"],
  ["ZM","زامبيا","Zambia"],["ZW","زيمبابوي","Zimbabwe"],
];

// Build lookup maps
const COUNTRY_BY_ISO = new Map(ALL_COUNTRIES.map(([iso, ar, en]) => [iso, { ar, en }]));

// ─── Stage config ─────────────────────────────────────────────────────────────
type Stage = "lead" | "prospect" | "customer" | "retained" | "churned";
const STAGES: Stage[] = ["lead", "prospect", "customer", "retained", "churned"];

const STAGE_LABELS: Record<Stage, { ar: string; en: string }> = {
  lead:     { ar: "عميل محتمل", en: "Lead" },
  prospect: { ar: "مرشح",       en: "Prospect" },
  customer: { ar: "عميل",       en: "Customer" },
  retained: { ar: "عميل دائم", en: "Retained" },
  churned:  { ar: "مفقود",      en: "Churned" },
};

const STAGE_STYLES: Record<Stage, { active: string; idle: string }> = {
  lead:     { active: "bg-slate-100 text-slate-700 border-slate-400 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-500",     idle: "hover:border-slate-300" },
  prospect: { active: "bg-blue-50 text-blue-700 border-blue-400 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-500",         idle: "hover:border-blue-200" },
  customer: { active: "bg-emerald-50 text-emerald-700 border-emerald-400 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-500", idle: "hover:border-emerald-200" },
  retained: { active: "bg-violet-50 text-violet-700 border-violet-400 dark:bg-violet-900/50 dark:text-violet-300 dark:border-violet-500", idle: "hover:border-violet-200" },
  churned:  { active: "bg-rose-50 text-rose-700 border-rose-400 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-500",         idle: "hover:border-rose-200" },
};

// ─── i18n ─────────────────────────────────────────────────────────────────────
const t = {
  ar: {
    title: "إنشاء قائمة",
    editTitle: "تعديل القائمة",
    namePlaceholder: "اسم القائمة",
    descriptionPlaceholder: "وصف اختياري",
    country: "الدولة",
    city: "المدينة",
    stage: "مرحلة العميل",
    tags: "الوسوم",
    cityPlaceholder: "اكتب مدينة واضغط Enter",
    tagPlaceholder: "اكتب وسماً واضغط Enter",
    previewLabel: "النتائج المتوقعة",
    contacts: "جهة اتصال",
    save: "حفظ القائمة",
    update: "تحديث القائمة",
    cancel: "إلغاء",
    nameRequired: "اسم القائمة مطلوب",
    saving: "جاري الحفظ...",
    allContacts: "جميع جهات الاتصال",
    noCountries: "لا توجد دول في جهات الاتصال",
  },
  en: {
    title: "Create List",
    editTitle: "Edit List",
    namePlaceholder: "List name",
    descriptionPlaceholder: "Optional description",
    country: "Country",
    city: "City",
    stage: "Customer Stage",
    tags: "Tags",
    cityPlaceholder: "Type a city and press Enter",
    tagPlaceholder: "Type a tag and press Enter",
    previewLabel: "Expected results",
    contacts: "contacts",
    save: "Save List",
    update: "Update List",
    cancel: "Cancel",
    nameRequired: "List name is required",
    saving: "Saving...",
    allContacts: "All contacts",
    noCountries: "No countries found in contacts",
  },
};

type InitialData = {
  listId: Id<"contactLists">;
  name: string;
  description?: string;
  filters: {
    countries?: string[];
    cities?: string[];
    stages?: Stage[];
    tags?: string[];
  };
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: "ar" | "en";
  initialData?: InitialData;
};

export function CreateListDialog({ open, onOpenChange, locale, initialData }: Props) {
  const tx = t[locale];
  const isRTL = locale === "ar";
  const isEditMode = !!initialData;
  const createList = useMutation(api.contactLists.create);
  const updateList = useMutation(api.contactLists.update);

  // Fetch countries that actually exist in this tenant's contacts
  const availableIsoCodes = useQuery(api.contactLists.getAvailableCountries);
  const backfillCountries = useMutation(api.contacts.backfillCountries);
  const backfillRan = useRef(false);

  // On first open, backfill country from phone for contacts that don't have it yet
  useEffect(() => {
    if (open && !backfillRan.current) {
      backfillRan.current = true;
      backfillCountries().catch(() => {});
    }
  }, [open, backfillCountries]);

  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [selectedCountries, setSelectedCountries] = useState<string[]>(initialData?.filters.countries ?? []);
  // Fetch cities that actually exist in contacts, filtered by selected countries
  const availableCities = useQuery(api.contactLists.getAvailableCities, {
    countries: selectedCountries.length > 0 ? selectedCountries : undefined,
  });
  const [cities, setCities] = useState<string[]>(initialData?.filters.cities ?? []);
  const [cityInput, setCityInput] = useState("");
  const [selectedStages, setSelectedStages] = useState<Stage[]>(initialData?.filters.stages ?? []);
  const [tags, setTags] = useState<string[]>(initialData?.filters.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);

  // Sync state when initialData changes (e.g. dialog re-opened with different list)
  useEffect(() => {
    if (open) {
      setName(initialData?.name ?? "");
      setDescription(initialData?.description ?? "");
      setSelectedCountries(initialData?.filters.countries ?? []);
      setCities(initialData?.filters.cities ?? []);
      setSelectedStages(initialData?.filters.stages ?? []);
      setTags(initialData?.filters.tags ?? []);
      setNameError(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

  // Countries available in this tenant's contacts, mapped to names
  const availableCountries = useMemo(() => {
    if (!availableIsoCodes) return [];
    return availableIsoCodes
      .map((iso) => {
        const names = COUNTRY_BY_ISO.get(iso);
        return { iso, label: names ? names[locale] : iso };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [availableIsoCodes, locale]);

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

  function handleCityKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && cityInput.trim()) {
      e.preventDefault();
      const val = cityInput.trim();
      if (!cities.includes(val)) setCities((prev) => [...prev, val]);
      setCityInput("");
    }
  }

  function handleTagKey(e: React.KeyboardEvent<HTMLInputElement>) {
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
      if (isEditMode) {
        await updateList({
          listId: initialData.listId,
          name: name.trim(),
          description: description.trim() || undefined,
          filters,
        });
      } else {
        await createList({
          name: name.trim(),
          description: description.trim() || undefined,
          filters,
        });
      }
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const hasFilters =
    selectedCountries.length > 0 ||
    cities.length > 0 ||
    selectedStages.length > 0 ||
    tags.length > 0;

  const topStages = preview
    ? Object.entries(preview.stageBreakdown)
        .filter(([, c]) => c > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <SheetContent
        side={isRTL ? "right" : "left"}
        className="flex flex-col gap-0 p-0 overflow-hidden w-[min(92vw,960px)] sm:w-[min(80vw,960px)]"
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle className="text-base font-semibold">{isEditMode ? tx.editTitle : tx.title}</SheetTitle>
        </SheetHeader>

        {/* Two-column body: filters | preview */}
        <div className="flex-1 overflow-hidden flex">
          {/* ── Left: scrollable filters ── */}
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5 border-e">
            {/* Identity */}
            <div className="flex flex-col gap-3">
              <div>
                <Input
                  placeholder={tx.namePlaceholder}
                  value={name}
                  onChange={(e) => { setName(e.target.value); setNameError(false); }}
                  className={`h-10 font-medium ${nameError ? "border-destructive" : ""}`}
                  autoFocus
                />
                {nameError && (
                  <p className="text-xs text-destructive mt-1.5">{tx.nameRequired}</p>
                )}
              </div>
              <Input
                placeholder={tx.descriptionPlaceholder}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="border-t" />

            {/* Country */}
            <FilterSection label={tx.country}>
              {availableIsoCodes === undefined ? (
                <div className="flex flex-wrap gap-2">
                  {[60, 80, 55, 70, 65].map((w, i) => (
                    <div key={i} className={`h-8 rounded-full bg-muted animate-pulse`} style={{ width: w }} />
                  ))}
                </div>
              ) : availableCountries.length === 0 ? (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <GlobeIcon className="size-4" />
                  {tx.noCountries}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableCountries.map(({ iso, label }) => (
                    <ToggleChip
                      key={iso}
                      selected={selectedCountries.includes(iso)}
                      onClick={() => toggleCountry(iso)}
                    >
                      {label}
                    </ToggleChip>
                  ))}
                </div>
              )}
            </FilterSection>

            {/* City */}
            <FilterSection label={tx.city}>
              {availableCities === undefined ? (
                <div className="flex flex-wrap gap-2">
                  {[55, 70, 60, 80].map((w, i) => (
                    <div key={i} className="h-8 rounded-full bg-muted animate-pulse" style={{ width: w }} />
                  ))}
                </div>
              ) : availableCities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {availableCities.map((city) => (
                    <ToggleChip
                      key={city}
                      selected={cities.includes(city)}
                      onClick={() =>
                        setCities((prev) =>
                          prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city],
                        )
                      }
                    >
                      {city}
                    </ToggleChip>
                  ))}
                </div>
              ) : (
                <>
                  {cities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {cities.map((city) => (
                        <TagChip key={city} onRemove={() => setCities((prev) => prev.filter((c) => c !== city))}>
                          {city}
                        </TagChip>
                      ))}
                    </div>
                  )}
                  <Input
                    placeholder={tx.cityPlaceholder}
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    onKeyDown={handleCityKey}
                    className="h-9 text-sm"
                  />
                  {selectedCountries.length > 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPinIcon className="size-3" />
                      {locale === "ar" ? "لا توجد مدن مسجلة للدول المحددة" : "No cities recorded for the selected countries"}
                    </p>
                  )}
                </>
              )}
            </FilterSection>

            {/* Stage */}
            <FilterSection label={tx.stage}>
              <div className="flex flex-wrap gap-2">
                {STAGES.map((stage) => {
                  const selected = selectedStages.includes(stage);
                  const s = STAGE_STYLES[stage];
                  return (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => toggleStage(stage)}
                      className={`
                        inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border font-medium transition-all duration-150
                        ${selected ? s.active : `bg-transparent text-muted-foreground border-border ${s.idle}`}
                      `}
                    >
                      {selected && <CheckIcon className="size-3 shrink-0" />}
                      {STAGE_LABELS[stage][locale]}
                    </button>
                  );
                })}
              </div>
            </FilterSection>

            {/* Tags */}
            <FilterSection label={tx.tags}>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((tag) => (
                    <TagChip key={tag} onRemove={() => setTags((prev) => prev.filter((t) => t !== tag))}>
                      {tag}
                    </TagChip>
                  ))}
                </div>
              )}
              <Input
                placeholder={tx.tagPlaceholder}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKey}
                className="h-9 text-sm"
              />
            </FilterSection>
          </div>

          {/* ── Right: live preview (fixed, not scrolling) ── */}
          <div className="w-64 shrink-0 flex flex-col bg-muted/30 p-5 gap-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {tx.previewLabel}
            </p>

            {/* Big number */}
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-1.5">
                <UsersIcon className="size-4 text-primary mb-0.5 shrink-0" />
                <span className="text-3xl font-bold text-foreground tabular-nums leading-none">
                  {preview === undefined ? "—" : preview.count.toLocaleString()}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{tx.contacts}</span>
            </div>

            {/* Stage breakdown */}
            {topStages.length > 0 && (
              <div className="flex flex-col gap-2.5">
                {topStages.map(([stage, count]) => (
                  <div key={stage} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground truncate">
                      {(STAGE_LABELS as Record<string, { ar: string; en: string }>)[stage]?.[locale] ?? stage}
                    </span>
                    <span className="text-xs font-semibold tabular-nums shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            )}

            {!hasFilters && preview !== undefined && (
              <p className="text-xs text-muted-foreground">{tx.allContacts}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t shrink-0 flex justify-end gap-2 bg-background">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
            {tx.cancel}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? tx.saving : isEditMode ? tx.update : tx.save}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      {children}
    </div>
  );
}

function ToggleChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-full border transition-all duration-150 font-medium
        ${selected
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-transparent text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
        }
      `}
    >
      {selected && <CheckIcon className="size-3 shrink-0" />}
      {children}
    </button>
  );
}

function TagChip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full font-medium">
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <XIcon className="size-3" />
      </button>
    </span>
  );
}
