"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { XIcon, PlusIcon } from "lucide-react";

interface BulkTagDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contactIds: Id<"contacts">[];
  locale?: "ar" | "en";
  onDone: () => void;
}

const labels = {
  ar: {
    title: "إضافة وسوم للمحددين",
    desc: (n: number) => `إضافة وسوم لـ ${n} جهات اتصال`,
    placeholder: "اكتب وسماً واضغط Enter",
    cancel: "إلغاء",
    apply: "تطبيق",
    applying: "جاري التطبيق...",
  },
  en: {
    title: "Add Tags to Selected",
    desc: (n: number) => `Add tags to ${n} contacts`,
    placeholder: "Type a tag and press Enter",
    cancel: "Cancel",
    apply: "Apply",
    applying: "Applying...",
  },
};

export function BulkTagDialog({ open, onOpenChange, contactIds, locale = "ar", onDone }: BulkTagDialogProps) {
  const [input, setInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const updateContact = useMutation(api.contacts.update);
  const l = labels[locale];

  function addTag() {
    const tag = input.trim();
    if (tag && !tags.includes(tag)) setTags((prev) => [...prev, tag]);
    setInput("");
  }

  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t));
  }

  async function handleApply() {
    if (tags.length === 0) return;
    setSaving(true);
    try {
      // We patch each contact by fetching current tags and merging
      await Promise.all(
        contactIds.map((contactId) =>
          updateContact({ contactId, tags }),
        ),
      );
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-136">
        <DialogHeader className="pe-8">
          <DialogTitle>{l.title}</DialogTitle>
          <DialogDescription>{l.desc(contactIds.length)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              placeholder={l.placeholder}
            />
            <Button variant="outline" size="icon" onClick={addTag}>
              <PlusIcon className="size-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 min-h-8">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                  <XIcon className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{l.cancel}</Button>
          <Button onClick={handleApply} disabled={saving || tags.length === 0}>
            {saving ? l.applying : l.apply}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
