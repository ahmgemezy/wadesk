"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import type { LibraryTemplate, MetaCategory } from "@/lib/templateLibrary";
import { useT } from "@/lib/i18n/context";

interface Props {
  template: LibraryTemplate | null;
  open: boolean;
  onClose: () => void;
}

const META_CATEGORIES: MetaCategory[] = ["MARKETING", "UTILITY", "AUTHENTICATION"];

function toNameSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  return slug || "template";
}

export function MetaSubmitForm({ template, open, onClose }: Props) {
  const t = useT();
  const channels = useQuery(api.channels.listForTenant) as
    | { _id: string; displayName: string; displayPhone?: string; wabaId: string }[]
    | undefined;
  const submitToMeta = useAction(api.metaTemplates.submitToMeta);

  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [metaCategory, setMetaCategory] = useState<MetaCategory>("MARKETING");
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [channelId, setChannelId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen && template) {
      setName(toNameSlug(template.title));
      setBody(template.body);
      setMetaCategory(template.metaCategory ?? "MARKETING");
      setLanguage(template.language);
      setChannelId(channels?.[0]?._id ?? "");
      setError(null);
    }
    if (!nextOpen) onClose();
  }

  async function handleSubmit() {
    if (!channelId || !name.trim() || !body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitToMeta({
        channelId: channelId as Id<"channels">,
        name: name.trim(),
        body: body.trim(),
        metaCategory,
        language,
      });
      toast.success(
        t(
          "Template submitted — Meta will review it within a few hours",
          "تم إرسال القالب — ستراجعه ميتا خلال بضع ساعات",
        ),
      );
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const nameIsValid = /^[a-z0-9_]+$/.test(name.trim()) && name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Submit Template to Meta", "إرسال القالب لميتا")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              {t("Template Name", "اسم القالب")}
              <span className="ms-1 text-xs text-muted-foreground font-normal">
                {t("(lowercase + underscores only)", "(أحرف صغيرة ومسطّرات فقط)")}
              </span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              dir="ltr"
              placeholder="flash_sale_offer"
              className={!nameIsValid && name.length > 0 ? "border-destructive" : ""}
            />
            {!nameIsValid && name.length > 0 && (
              <p className="text-xs text-destructive">
                {t("Only lowercase letters, numbers, and underscores allowed", "أحرف صغيرة وأرقام ومسطّرات فقط")}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("Template Body", "نص القالب")}</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-28 resize-none"
              dir="auto"
            />
            <p className="text-xs text-muted-foreground">
              {t(
                "Variables like {{name}} are auto-converted to {{1}}, {{2}}, ... on submit.",
                "المتغيرات مثل {{name}} تُحوَّل تلقائياً إلى {{1}}, {{2}}, ... عند الإرسال.",
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("Meta Category", "فئة ميتا")}</label>
              <Select value={metaCategory} onValueChange={(v) => { if (v) setMetaCategory(v as MetaCategory); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {META_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("Language", "اللغة")}</label>
              <Select value={language} onValueChange={(v) => { if (v) setLanguage(v as "ar" | "en"); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية (ar)</SelectItem>
                  <SelectItem value="en">English (en)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("Submit to Channel", "إرسال إلى القناة")}</label>
            <Select value={channelId} onValueChange={(v) => { if (v) setChannelId(v); }}>
              <SelectTrigger>
                <SelectValue placeholder={t("Select channel…", "اختر القناة...")} />
              </SelectTrigger>
              <SelectContent>
                {channels?.map((ch) => (
                  <SelectItem key={ch._id} value={ch._id}>
                    {ch.displayName}
                    {ch.displayPhone ? ` — ${ch.displayPhone}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
              ⚠️ {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t mt-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t("Cancel", "إلغاء")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !channelId || !nameIsValid || !body.trim()}
          >
            {submitting && <Loader2Icon className="size-4 me-2 animate-spin" />}
            {t("Submit to Meta for Approval", "إرسال لميتا للمراجعة")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
