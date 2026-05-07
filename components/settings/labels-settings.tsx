"use client";

import { useState } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useT, useTranslatedLabel } from "@/lib/i18n/context";
import { useOrganization } from "@/lib/auth-hooks";
import { cn } from "@/lib/utils";

const COLORS = [
  { value: "red",    bg: "bg-red-500" },
  { value: "green",  bg: "bg-green-500" },
  { value: "blue",   bg: "bg-blue-500" },
  { value: "yellow", bg: "bg-yellow-400" },
  { value: "purple", bg: "bg-purple-500" },
  { value: "orange", bg: "bg-orange-500" },
  { value: "pink",   bg: "bg-pink-500" },
  { value: "gray",   bg: "bg-gray-400" },
];

export function LabelsSettings() {
  const t = useT();
  const translateLabel = useTranslatedLabel();
  const { isAuthenticated } = useConvexAuth();
  const { membership } = useOrganization();
  const role = membership?.role as string | undefined;
  const isAdmin = role === "org:admin" || role === "admin";

  const DEFAULT_LABELS = [
    { name: t("Complaint", "شكوى"),       color: "red",    emoji: "⚠️" },
    { name: t("Inquiry", "استفسار"),      color: "blue",   emoji: "❓" },
    { name: t("Sales", "مبيعات"),         color: "green",  emoji: "💰" },
    { name: t("Tech Support", "دعم فني"), color: "purple", emoji: "🔧" },
    { name: "VIP",                        color: "yellow", emoji: "⭐" },
  ];

  const labelsQuery = useQuery(api.labels.list, isAuthenticated ? undefined : "skip");
  const labels = labelsQuery ?? [];
  const createLabel = useMutation(api.labels.create);
  const removeLabel = useMutation(api.labels.remove);

  const [name, setName] = useState("");
  const [color, setColor] = useState("blue");
  const [emoji, setEmoji] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createLabel({ name: name.trim(), color, emoji: emoji.trim() || undefined });
      setName("");
      setEmoji("");
      toast.success(t("Label created", "تم إنشاء التصنيف"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("LABEL_EXISTS")) {
        toast.error(t("Label already exists", "التصنيف موجود بالفعل"));
      } else {
        toast.error(t("Failed to create label", "فشل إنشاء التصنيف"));
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleRemove(labelId: Id<"conversationLabels">, labelName: string) {
    if (!confirm(t(`Delete label "${labelName}"? It will be removed from all conversations.`, `حذف التصنيف "${labelName}"؟ سيتم إزالته من كل المحادثات.`))) return;
    try {
      await removeLabel({ labelId });
      toast.success(t("Label deleted", "تم حذف التصنيف"));
    } catch {
      toast.error(t("Failed to delete", "فشل الحذف"));
    }
  }

  async function seedDefaults() {
    for (const def of DEFAULT_LABELS) {
      try {
        await createLabel(def);
      } catch {
        // skip if already exists
      }
    }
    toast.success(t("Default labels added", "تم إضافة التصنيفات الافتراضية"));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("Conversation Labels", "تصنيفات المحادثات")}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("Tag conversations to categorize and filter them.", "صنّف المحادثات لتنظيمها وتصفيتها بسهولة.")}
          </p>
        </div>
        {labels.length === 0 && isAdmin && (
          <Button variant="outline" size="sm" onClick={seedDefaults}>
            {t("Add defaults", "إضافة الافتراضية")}
          </Button>
        )}
      </div>

      {labelsQuery === undefined ? (
        <div className="space-y-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border px-3 py-2">
              <Skeleton className="size-3 rounded-full shrink-0" />
              <Skeleton className="h-4 w-24 flex-1" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {labels.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
              {t("No labels yet. Create your first one below.", "لا توجد تصنيفات بعد. أنشئ أول تصنيف أدناه.")}
            </p>
          )}
          {labels.map((label) => (
            <div
              key={label._id}
              className="flex items-center gap-3 rounded-lg border px-3 py-2"
            >
              <span
                className={cn(
                  "size-3 rounded-full shrink-0",
                  COLORS.find((c) => c.value === label.color)?.bg ?? "bg-gray-400",
                )}
              />
              <span className="flex-1 text-sm">
                {label.emoji ? `${label.emoji} ` : ""}{translateLabel(label.name)}
              </span>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(label._id, translateLabel(label.name))}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleCreate} className="space-y-3 border-t pt-4">
        <h3 className="text-sm font-medium">{t("New Label", "تصنيف جديد")}</h3>
        <div className="flex gap-2">
          <Input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder={t("Emoji (optional)", "رمز (اختياري)")}
            className="w-28 text-center"
            maxLength={2}
          />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("Label name", "اسم التصنيف")}
            className="flex-1"
            required
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className={cn(
                "size-6 rounded-full transition-all",
                c.bg,
                color === c.value
                  ? "ring-2 ring-offset-2 ring-foreground scale-110"
                  : "opacity-70 hover:opacity-100",
              )}
              aria-label={c.value}
            />
          ))}
        </div>
        <Button type="submit" size="sm" disabled={creating || !name.trim()}>
          <Plus className="size-3.5 me-1.5" />
          {creating ? t("Creating...", "جاري الإنشاء...") : t("Create Label", "إنشاء تصنيف")}
        </Button>
      </form>
    </div>
  );
}
