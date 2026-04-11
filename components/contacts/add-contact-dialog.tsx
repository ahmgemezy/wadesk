"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { AlertCircleIcon } from "lucide-react";

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (contactId: Id<"contacts">) => void;
  locale?: "ar" | "en";
}

const labels = {
  ar: {
    title: "إضافة جهة اتصال",
    desc: "أدخل بيانات جهة الاتصال الجديدة",
    phone: "رقم الهاتف *",
    name: "الاسم",
    tags: "الوسوم",
    tagsPlaceholder: "وسوم مفصولة بفواصل",
    notes: "ملاحظات",
    notesPlaceholder: "ملاحظات...",
    country: "الدولة",
    city: "المدينة",
    spent: "إجمالي الإنفاق",
    category: "الفئة",
    duplicate: "رقم الهاتف موجود مسبقاً",
    cancel: "إلغاء",
    save: "إضافة جهة اتصال",
    saving: "جاري الحفظ...",
  },
  en: {
    title: "Add Contact",
    desc: "Enter the details for the new contact",
    phone: "Phone number *",
    name: "Name",
    tags: "Tags",
    tagsPlaceholder: "Comma-separated tags",
    notes: "Notes",
    notesPlaceholder: "Notes...",
    country: "Country",
    city: "City",
    spent: "Total Spent",
    category: "Category",
    duplicate: "Phone number already exists",
    cancel: "Cancel",
    save: "Add Contact",
    saving: "Saving...",
  },
};

export function AddContactDialog({
  open,
  onOpenChange,
  onSuccess,
  locale = "ar",
}: AddContactDialogProps) {
  const createContact = useMutation(api.contacts.create);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [notes, setNotes] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [spent, setSpent] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [duplicateError, setDuplicateError] = useState<Id<"contacts"> | null>(null);

  const l = labels[locale];

  function normalizePhone(raw: string): string | null {
    const cleaned = raw.trim();
    const parsed = parsePhoneNumberFromString(cleaned);
    if (!parsed || !parsed.isValid()) return null;
    return parsed.format("E.164");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDuplicateError(null);

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) return;

    const tags = tagsInput
      .split(/[,،]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const spentNum = spent.trim() ? parseFloat(spent.trim()) : undefined;

    setSaving(true);
    try {
      const result = await createContact({
        phone: normalizedPhone,
        customName: name.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        notes: notes.trim() || undefined,
        country: country.trim() || undefined,
        city: city.trim() || undefined,
        spent: spentNum,
        category: category.trim() || undefined,
      });

      if (result && typeof result === "object" && "error" in result) {
        setDuplicateError(result.existingId);
        return;
      }

      setPhone(""); setName(""); setTagsInput(""); setNotes("");
      setCountry(""); setCity(""); setSpent(""); setCategory("");
      onOpenChange(false);
      if (result && typeof result !== "object" && onSuccess) {
        onSuccess(result as Id<"contacts">);
      }
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (!saving) {
      setDuplicateError(null);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-136">
        <DialogHeader className="pe-8">
          <DialogTitle>{l.title}</DialogTitle>
          <DialogDescription>{l.desc}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{l.phone}</label>
            <Input
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setDuplicateError(null); }}
              placeholder="+201012345678"
              dir="ltr"
              required
              disabled={saving}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{l.name}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={l.name}
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{l.country}</label>
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder={l.country}
                disabled={saving}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{l.city}</label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={l.city}
                disabled={saving}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{l.category}</label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={l.category}
                disabled={saving}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{l.spent}</label>
              <Input
                value={spent}
                onChange={(e) => setSpent(e.target.value)}
                placeholder="0"
                type="number"
                min="0"
                dir="ltr"
                disabled={saving}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{l.tags}</label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder={l.tagsPlaceholder}
              disabled={saving}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{l.notes}</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={l.notesPlaceholder}
              rows={2}
              disabled={saving}
            />
          </div>

          {duplicateError && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircleIcon className="size-4 shrink-0" />
              <span>{l.duplicate}</span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
              {l.cancel}
            </Button>
            <Button type="submit" disabled={saving || !phone.trim()}>
              {saving ? l.saving : l.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
