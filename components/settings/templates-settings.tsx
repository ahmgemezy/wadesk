"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useT } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { PlusIcon, PencilIcon, Trash2Icon, Loader2Icon } from "lucide-react";
import { extractVariables } from "@/lib/templateHelpers";
import { TemplateLibraryTab } from "@/components/templates/template-library-tab";
import { BroadcastTemplatesTab } from "@/components/broadcasts/broadcast-templates-tab";
import { BroadcastTemplateBuilder } from "@/components/broadcasts/broadcast-template-builder";
import type { LibraryTemplate } from "@/lib/templateLibrary";

export function TemplatesSettings() {
  const t = useT();

  const templates = useQuery(api.messageTemplates.list, {}) as
    | {
        _id: string;
        title: string;
        body: string;
        category?: string;
        language: "ar" | "en";
        variables: string[];
      }[]
    | undefined;

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
  const [broadcastBuilderOpen, setBroadcastBuilderOpen] = useState(false);
  const [broadcastEditingId, setBroadcastEditingId] = useState<string | null>(null);

  const detectedVars = extractVariables(body);

  function openForCreate(prefill?: Pick<LibraryTemplate, "title" | "body" | "category" | "language">) {
    setEditingId(null);
    setTitle(prefill?.title ?? "");
    setBody(prefill?.body ?? "");
    setCategory(prefill?.category ?? "");
    setLanguage(prefill?.language ?? "ar");
    setDialogOpen(true);
  }

  function openForEdit(
    tpl: { _id: string; title: string; body: string; category?: string; language?: "ar" | "en" },
  ) {
    setEditingId(tpl._id);
    setTitle(tpl.title);
    setBody(tpl.body);
    setCategory(tpl.category || "");
    setLanguage(tpl.language ?? "ar");
    setDialogOpen(true);
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
      <Tabs defaultValue="my-templates">
        <TabsList className="mb-4">
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

        <TabsContent value="my-templates" className="space-y-4">
          <div className="flex items-center justify-end">
            <Button onClick={() => openForCreate()}>
              <PlusIcon className="size-4 me-2" />
              {t("Add Template", "إضافة قالب")}
            </Button>
          </div>

          {templates === undefined ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader className="pb-2 pe-16 space-y-0">
                    <Skeleton className="h-5 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed bg-muted/30">
              <h3 className="text-lg font-medium">
                {t("No Templates Yet", "لا توجد قوالب بعد")}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                {t(
                  "Create message templates with placeholders to standardize your replies.",
                  "أنشئ قوالب رسائل بمتغيرات لتوحيد ردودك.",
                )}
              </p>
              <Button variant="outline" onClick={() => openForCreate()}>
                <PlusIcon className="size-4 me-2" />
                {t("Create your first template", "أنشئ قالبك الأول")}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((tpl) => (
                <Card key={tpl._id} className="relative group overflow-hidden flex flex-col">
                  <div className="absolute top-2 inset-e-2 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openForEdit(tpl)}
                    >
                      <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleRemove(tpl._id)}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                  <CardHeader className="pb-2 pe-16 space-y-0 text-start">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <Badge
                        variant={tpl.language === "ar" ? "default" : "outline"}
                        className="w-fit font-normal text-[10px] uppercase tracking-wider"
                      >
                        {tpl.language === "ar" ? "AR" : "EN"}
                      </Badge>
                      {tpl.category && (
                        <Badge
                          variant="secondary"
                          className="w-fit font-normal text-[10px] uppercase tracking-wider"
                        >
                          {tpl.category}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base font-semibold leading-tight line-clamp-1">
                      {tpl.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 text-sm text-muted-foreground space-y-2 text-start">
                    <p className="whitespace-pre-wrap opacity-90 line-clamp-3">
                      {tpl.body}
                    </p>
                    {tpl.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tpl.variables.map((variable) => (
                          <Badge key={variable} variant="outline" className="text-[10px]">
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="library">
          <TemplateLibraryTab
            onUseQuickReply={(tpl) => openForCreate(tpl)}
          />
        </TabsContent>

        <TabsContent value="broadcast-templates">
          <BroadcastTemplatesTab
            onCreateClick={() => {
              setBroadcastEditingId(null);
              setBroadcastBuilderOpen(true);
            }}
          />
        </TabsContent>
      </Tabs>

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
              <label className="text-sm font-medium">{t("Title", "العنوان")}</label>
              <Input
                placeholder={t("e.g. Welcome Message", "مثال: رسالة ترحيب")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                dir="auto"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("Body", "النص")}</label>
              <Textarea
                placeholder={t(
                  "Hello {{name}}, thank you for contacting us!",
                  "مرحباً {{name}}، شكراً لتواصلك معنا!",
                )}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-35 resize-none"
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
              <label className="text-sm font-medium">
                {t("Category (optional)", "الفئة (اختياري)")}
              </label>
              <Input
                placeholder={t("e.g. Support", "مثال: دعم")}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                dir="auto"
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("Cancel", "إلغاء")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !title.trim() || !body.trim()}
            >
              {saving && <Loader2Icon className="size-4 me-2 animate-spin" />}
              {t("Save", "حفظ")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={broadcastBuilderOpen} onOpenChange={setBroadcastBuilderOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {broadcastEditingId
                ? t("Edit Broadcast Template", "تعديل قالب البث")
                : t("Create Broadcast Template", "إنشاء قالب البث")}
            </DialogTitle>
          </DialogHeader>
          <BroadcastTemplateBuilder
            templateId={broadcastEditingId ?? undefined}
            onClose={() => setBroadcastBuilderOpen(false)}
            onSave={() => {
              setBroadcastBuilderOpen(false);
              setBroadcastEditingId(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
