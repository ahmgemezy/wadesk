"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useT } from "@/lib/i18n/context";
import { useSelectedChannel } from "@/lib/hooks/channel-context";
import { DT } from "@/lib/design-tokens";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  PlusIcon,
  SearchIcon,
  DownloadIcon,
  FileTextIcon,
  Trash2Icon,
  Loader2Icon,
} from "lucide-react";
import { extractVariables } from "@/lib/templateHelpers";
import { TemplateLibraryTab } from "@/components/templates/template-library-tab";
import { BroadcastTemplatesTab } from "@/components/broadcasts/broadcast-templates-tab";
import { BroadcastTemplateBuilder } from "@/components/broadcasts/broadcast-template-builder";
import type { LibraryTemplate } from "@/lib/templateLibrary";

type Template = {
  _id: string;
  title: string;
  body: string;
  category?: string;
  language: "ar" | "en";
  variables: string[];
};

const CATEGORY_COLORS: Record<string, string> = {
  marketing: "bg-purple-100 text-purple-700",
  utility: "bg-emerald-100 text-emerald-700",
  authentication: "bg-blue-100 text-blue-700",
  onboarding: "bg-indigo-100 text-indigo-700",
  support: "bg-amber-100 text-amber-700",
  orders: "bg-orange-100 text-orange-700",
  greeting: "bg-sky-100 text-sky-700",
  followup: "bg-teal-100 text-teal-700",
  complaint: "bg-rose-100 text-rose-700",
};

function getCategoryColor(cat?: string): string {
  if (!cat) return "bg-slate-100 text-slate-600";
  return CATEGORY_COLORS[cat.toLowerCase()] ?? "bg-slate-100 text-slate-600";
}

function renderBody(text: string): React.ReactNode {
  return text.split(/(\{\{[^}]+\}\})/g).map((part, i) =>
    /^\{\{[^}]+\}\}$/.test(part) ? (
      <span key={i} className="text-blue-600 font-medium">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function TemplatesSettings() {
  const t = useT();
  const { isAuthenticated } = useConvexAuth();
  const { channelId } = useSelectedChannel();

  const templates = useQuery(
    api.messageTemplates.list,
    isAuthenticated ? (channelId ? { channelId } : {}) : "skip",
  ) as Template[] | undefined;

  const createTemplate = useMutation(api.messageTemplates.create);
  const updateTemplate = useMutation(api.messageTemplates.update);
  const removeTemplate = useMutation(api.messageTemplates.remove);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");

  const [broadcastBuilderOpen, setBroadcastBuilderOpen] = useState(false);
  const [broadcastEditingId, setBroadcastEditingId] = useState<string | null>(
    null,
  );

  const detectedVars = extractVariables(body);

  // Derive category pills from data
  const categoryPills = useMemo(() => {
    const unique = new Set(
      (templates ?? []).map((tpl) => tpl.category).filter(Boolean) as string[],
    );
    return ["All", ...Array.from(unique)];
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (activeCategory === "All") return templates;
    return templates.filter(
      (tpl) =>
        tpl.category?.toLowerCase() === activeCategory.toLowerCase(),
    );
  }, [templates, activeCategory]);

  function openForCreate(
    prefill?: Pick<LibraryTemplate, "title" | "body" | "category" | "language">,
  ) {
    setEditingId(null);
    setTitle(prefill?.title ?? "");
    setBody(prefill?.body ?? "");
    setCategory(prefill?.category ?? "");
    setLanguage(prefill?.language ?? "ar");
    setDialogOpen(true);
  }

  function openForEdit(tpl: Template) {
    setEditingId(tpl._id);
    setTitle(tpl.title);
    setBody(tpl.body);
    setCategory(tpl.category ?? "");
    setLanguage(tpl.language ?? "ar");
    setDialogOpen(true);
  }

  async function handleSelect(tpl: Template) {
    try {
      await navigator.clipboard.writeText(tpl.body);
      toast.success(t("Copied to clipboard!", "تم النسخ!"));
    } catch {
      // clipboard may fail in non-HTTPS; still open the copy dialog
    }
    openForCreate({
      title: `Copy of ${tpl.title}`,
      body: tpl.body,
      category: tpl.category ?? "",
      language: tpl.language,
    });
  }

  async function handleSave() {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateTemplate({
          id: editingId as Id<"messageTemplates">,
          title: title.trim(),
          body: body.trim(),
          category: category.trim() || undefined,
          language,
        });
        toast.success(t("Template updated", "تم تحديث القالب"));
      } else {
        await createTemplate({
          title: title.trim(),
          body: body.trim(),
          category: category.trim() || undefined,
          language,
          ...(channelId ? { channelId } : {}),
        });
        toast.success(t("Template created", "تم إنشاء القالب"));
      }
      setDialogOpen(false);
    } catch {
      toast.error(t("Failed to save template", "فشل حفظ القالب"));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      await removeTemplate({ id: id as Id<"messageTemplates"> });
      toast.success(t("Template deleted", "تم حذف القالب"));
    } catch {
      toast.error(t("Failed to delete", "فشل الحذف"));
    }
  }

  return (
    <>
      {/* ── Page header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="relative hidden sm:block">
          <SearchIcon className="absolute inset-s-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder={t("Search templates...", "البحث في القوالب...")}
            className="h-9 rounded-lg border bg-background ps-9 pe-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring w-52"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`${DT.BTN_SM} gap-1.5`}
            onClick={() =>
              toast.info(
                t("Coming soon!", "قريباً!"),
              )
            }
          >
            <DownloadIcon className="size-3.5" />
            {t("Export Library", "تصدير المكتبة")}
          </button>
          <button className={`${DT.BTN_SM_PRIMARY} gap-1.5`} onClick={() => openForCreate()}>
            <PlusIcon className="size-4" />
            {t("Create New Template", "قالب جديد")}
          </button>
        </div>
      </div>

      <Tabs defaultValue="my-templates">
        <TabsList className="mb-6">
          <TabsTrigger value="my-templates">
            {t("My Templates", "قوالبي")}
          </TabsTrigger>
          <TabsTrigger value="library">
            📚 {t("Template Library", "مكتبة القوالب")}
          </TabsTrigger>
          <TabsTrigger value="broadcast-templates">
            {t("Broadcast Templates", "قوالب البث")}
          </TabsTrigger>
        </TabsList>

        {/* ── My Templates ── */}
        <TabsContent value="my-templates" className="space-y-5">
          {/* Category pills */}
          {templates !== undefined && categoryPills.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {categoryPills.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Loading skeleton */}
          {templates === undefined && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-60 rounded-xl" />
              ))}
            </div>
          )}

          {/* Empty state */}
          {templates !== undefined && filteredTemplates.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl border-dashed bg-muted/20">
              <FileTextIcon className="size-10 text-muted-foreground/40 mb-3" />
              <h3 className="font-semibold">
                {t("No Templates Yet", "لا توجد قوالب بعد")}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                {t(
                  "Create message templates with placeholders to standardize your replies.",
                  "أنشئ قوالب رسائل بمتغيرات لتوحيد ردودك.",
                )}
              </p>
              <button
                className={`${DT.BTN_SM} mt-4 gap-1.5`}
                onClick={() => openForCreate()}
              >
                <PlusIcon className="size-4" />
                {t("Create your first template", "أنشئ قالبك الأول")}
              </button>
            </div>
          )}

          {/* Card grid */}
          {templates !== undefined && filteredTemplates.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((tpl) => (
                <div
                  key={tpl._id}
                  className="group relative rounded-xl border bg-card overflow-hidden flex flex-col hover:shadow-md transition-shadow"
                >
                  {/* Card body */}
                  <div className="p-5 flex-1 flex flex-col gap-3">
                    {/* Top row: category badge + icons */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {tpl.category && (
                          <span
                            className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full mb-2 ${getCategoryColor(tpl.category)}`}
                          >
                            {tpl.category}
                          </span>
                        )}
                        {!tpl.category && (
                          <Badge
                            variant={tpl.language === "ar" ? "default" : "outline"}
                            className="text-[10px] mb-2"
                          >
                            {tpl.language === "ar" ? "AR" : "EN"}
                          </Badge>
                        )}
                        <h3 className="text-lg font-bold leading-tight line-clamp-1">
                          {tpl.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 pt-1">
                        <FileTextIcon className="size-4 text-muted-foreground/40" />
                        <button
                          type="button"
                          onClick={() => handleRemove(tpl._id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          title={t("Delete", "حذف")}
                        >
                          <Trash2Icon className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Body preview with inline variable highlighting */}
                    <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed flex-1">
                      {renderBody(tpl.body)}
                    </p>
                  </div>

                  {/* Bottom action bar */}
                  <div className="flex border-t">
                    <button
                      type="button"
                      onClick={() => openForEdit(tpl)}
                      className="flex-1 py-3 text-sm font-medium text-center hover:bg-muted transition-colors"
                    >
                      {t("Edit", "تعديل")}
                    </button>
                    <div className="w-px bg-border" />
                    <button
                      type="button"
                      onClick={() => handleSelect(tpl)}
                      className="flex-1 py-3 text-sm font-semibold text-center text-primary hover:bg-primary/5 transition-colors"
                    >
                      {t("Select", "اختيار")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="library">
          <TemplateLibraryTab onUseQuickReply={(tpl) => openForCreate(tpl)} />
        </TabsContent>

        <TabsContent value="broadcast-templates">
          <BroadcastTemplatesTab
            onCreateClick={() => {
              setBroadcastEditingId(null);
              setBroadcastBuilderOpen(true);
            }}
            onEditTemplate={(templateId) => {
              setBroadcastEditingId(templateId);
              setBroadcastBuilderOpen(true);
            }}
          />
        </TabsContent>
      </Tabs>

      {/* ── Create / Edit dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-130">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? t("Edit Template", "تعديل القالب")
                : t("Add New Template", "إضافة قالب جديد")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className={DT.LBL}>{t("Title", "العنوان")}</label>
              <input
                type="text"
                placeholder={t("e.g. Welcome Message", "مثال: رسالة ترحيب")}
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                dir="auto"
                className={DT.INPUT}
              />
            </div>
            <div className="space-y-2">
              <label className={DT.LBL}>{t("Body", "النص")}</label>
              <textarea
                placeholder={t(
                  "Hello {{name}}, thank you for contacting us!",
                  "مرحباً {{name}}، شكراً لتواصلك معنا!",
                )}
                value={body}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
                className={`min-h-35 resize-none ${DT.TEXTAREA}`}
                dir="auto"
              />
              {detectedVars.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    {t("Variables:", "المتغيرات:")}
                  </span>
                  {detectedVars.map((variable) => (
                    <Badge key={variable} variant="secondary" className="text-xs">
                      {`{{${variable}}}`}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className={DT.LBL}>
                {t("Category (optional)", "الفئة (اختياري)")}
              </label>
              <input
                type="text"
                placeholder={t("e.g. Support", "مثال: دعم")}
                value={category}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCategory(e.target.value)}
                dir="auto"
                className={DT.INPUT}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("Language", "اللغة")}</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage("ar")}
                  className={`flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors ${
                    language === "ar"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-muted"
                  }`}
                >
                  العربية
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors ${
                    language === "en"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-muted"
                  }`}
                >
                  English
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <button className={DT.BTN_OUTLINE} onClick={() => setDialogOpen(false)}>
              {t("Cancel", "إلغاء")}
            </button>
            <button
              className={DT.BTN_PRIMARY}
              onClick={handleSave}
              disabled={saving || !title.trim() || !body.trim()}
            >
              {saving && <Loader2Icon className="size-4 me-2 animate-spin" />}
              {t("Save", "حفظ")}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Broadcast template builder dialog ── */}
      <Dialog open={broadcastBuilderOpen} onOpenChange={setBroadcastBuilderOpen}>
        <DialogContent className="sm:max-w-4xl h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
            <DialogTitle>
              {broadcastEditingId
                ? t("Edit Broadcast Template", "تعديل قالب البث")
                : t("Create Broadcast Template", "إنشاء قالب البث")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            <BroadcastTemplateBuilder
              templateId={broadcastEditingId ?? undefined}
              onClose={() => setBroadcastBuilderOpen(false)}
              onSave={() => {
                setBroadcastBuilderOpen(false);
                setBroadcastEditingId(null);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
