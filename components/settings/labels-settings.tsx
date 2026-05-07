"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Smile, X, Pencil, Check } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useT, useTranslatedLabel } from "@/lib/i18n/context";
import { useOrganization } from "@/lib/auth-hooks";
import { cn } from "@/lib/utils";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

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
  const updateLabel = useMutation(api.labels.update);

  // ── Create form state ──
  const [name, setName] = useState("");
  const [color, setColor] = useState("blue");
  const [emoji, setEmoji] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  // ── Edit state ──
  const [editingId, setEditingId] = useState<Id<"conversationLabels"> | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("blue");
  const [editEmoji, setEditEmoji] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);
  const editEmojiRef = useRef<HTMLDivElement>(null);

  function startEdit(label: { _id: Id<"conversationLabels">; name: string; color: string; emoji?: string }) {
    setEditingId(label._id);
    setEditName(label.name);
    setEditColor(label.color);
    setEditEmoji(label.emoji ?? "");
    setEditError(null);
    setShowEditEmojiPicker(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
    setShowEditEmojiPicker(false);
  }

  useEffect(() => {
    if (!showEmojiPicker) return;
    function handleClickOutside(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  useEffect(() => {
    if (!showEditEmojiPicker) return;
    function handleClickOutside(e: MouseEvent) {
      if (editEmojiRef.current && !editEmojiRef.current.contains(e.target as Node)) {
        setShowEditEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEditEmojiPicker]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setFormError(null);
    try {
      await createLabel({ name: name.trim(), color, emoji: emoji.trim() || undefined });
      setName("");
      setEmoji("");
      toast.success(t("Label created", "تم إنشاء التصنيف"));
    } catch (err: unknown) {
      const convexData = (err as { data?: unknown })?.data;
      const msg = typeof convexData === "string" ? convexData : (err instanceof Error ? err.message : String(err));
      if (msg.includes("LABEL_EXISTS")) {
        setFormError(t('A label named "' + name.trim() + '" already exists.', `يوجد تصنيف باسم "${name.trim()}" بالفعل.`));
      } else {
        setFormError(t("Failed to create label — please try again.", "فشل إنشاء التصنيف — حاول مرة أخرى."));
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

  async function handleSaveEdit() {
    if (!editingId || !editName.trim()) return;
    setSaving(true);
    setEditError(null);
    try {
      await updateLabel({ labelId: editingId, name: editName.trim(), color: editColor, emoji: editEmoji || undefined });
      cancelEdit();
      toast.success(t("Label updated", "تم تحديث التصنيف"));
    } catch (err: unknown) {
      const convexData = (err as { data?: unknown })?.data;
      const msg = typeof convexData === "string" ? convexData : (err instanceof Error ? err.message : String(err));
      if (msg.includes("LABEL_EXISTS")) {
        setEditError(t(`A label named "${editName.trim()}" already exists.`, `يوجد تصنيف باسم "${editName.trim()}" بالفعل.`));
      } else {
        setEditError(t("Failed to update — please try again.", "فشل التحديث — حاول مرة أخرى."));
      }
    } finally {
      setSaving(false);
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
          {labels.map((label) => {
            const isEditing = editingId === label._id;
            if (isEditing) {
              return (
                <div key={label._id} className="rounded-lg border border-primary/40 bg-accent/30 px-3 py-3 space-y-3">
                  <div className="flex gap-2">
                    {/* Edit emoji picker */}
                    <div className="relative" ref={editEmojiRef}>
                      <button
                        type="button"
                        onClick={() => setShowEditEmojiPicker((v) => !v)}
                        className={cn(
                          "flex items-center justify-center size-10 rounded-md border text-lg transition-colors",
                          "hover:bg-accent hover:border-primary",
                          showEditEmojiPicker && "border-primary bg-accent",
                        )}
                      >
                        {editEmoji ? editEmoji : <Smile className="size-4 text-muted-foreground" />}
                      </button>
                      {editEmoji && (
                        <button
                          type="button"
                          onClick={() => setEditEmoji("")}
                          className="absolute -top-1.5 -inset-e-1.5 size-4 rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/40 flex items-center justify-center"
                        >
                          <X className="size-2.5" />
                        </button>
                      )}
                      {showEditEmojiPicker && (
                        <div className="absolute top-full mt-1 z-50">
                          <EmojiPicker
                            onEmojiClick={(e) => { setEditEmoji(e.emoji); setShowEditEmojiPicker(false); }}
                            height={350}
                            searchDisabled={false}
                          />
                        </div>
                      )}
                    </div>
                    <Input
                      value={editName}
                      onChange={(e) => { setEditName(e.target.value); setEditError(null); }}
                      className="flex-1"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setEditColor(c.value)}
                        className={cn(
                          "size-6 rounded-full transition-all",
                          c.bg,
                          editColor === c.value
                            ? "ring-2 ring-offset-2 ring-foreground scale-110"
                            : "opacity-70 hover:opacity-100",
                        )}
                        aria-label={c.value}
                      />
                    ))}
                  </div>
                  {editError && (
                    <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{editError}</p>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit} disabled={saving || !editName.trim()}>
                      <Check className="size-3.5 me-1.5" />
                      {saving ? t("Saving...", "جاري الحفظ...") : t("Save", "حفظ")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving}>
                      {t("Cancel", "إلغاء")}
                    </Button>
                  </div>
                </div>
              );
            }
            return (
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
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-foreground"
                      onClick={() => startEdit(label)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemove(label._id, translateLabel(label.name))}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={handleCreate} className="space-y-3 border-t pt-4">
        <h3 className="text-sm font-medium">{t("New Label", "تصنيف جديد")}</h3>
        <div className="flex gap-2">
          <div className="relative" ref={emojiRef}>
            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className={cn(
                "flex items-center justify-center size-10 rounded-md border text-lg transition-colors",
                "hover:bg-accent hover:border-primary",
                showEmojiPicker && "border-primary bg-accent",
              )}
              title={t("Pick emoji", "اختر رمزاً")}
            >
              {emoji ? emoji : <Smile className="size-4 text-muted-foreground" />}
            </button>
            {emoji && (
              <button
                type="button"
                onClick={() => setEmoji("")}
                className="absolute -top-1.5 -inset-e-1.5 size-4 rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/40 flex items-center justify-center"
                title={t("Clear emoji", "إزالة الرمز")}
              >
                <X className="size-2.5" />
              </button>
            )}
            {showEmojiPicker && (
              <div className="absolute top-full mt-1 z-50">
                <EmojiPicker
                  onEmojiClick={(e) => {
                    setEmoji(e.emoji);
                    setShowEmojiPicker(false);
                  }}
                  height={350}
                  searchDisabled={false}
                />
              </div>
            )}
          </div>
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); setFormError(null); }}
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
        {formError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
            {formError}
          </p>
        )}
        <Button type="submit" size="sm" disabled={creating || !name.trim()}>
          <Plus className="size-3.5 me-1.5" />
          {creating ? t("Creating...", "جاري الإنشاء...") : t("Create Label", "إنشاء تصنيف")}
        </Button>
      </form>
    </div>
  );
}
