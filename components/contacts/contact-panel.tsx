"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";

interface ContactPanelProps {
  contactId: Id<"contacts">;
}

export function ContactPanel({ contactId }: ContactPanelProps) {
  const data = useQuery(api.contacts.getById, { contactId });
  const customFields = useQuery(api.customFields.list, { contactId });
  const updateContact = useMutation(api.contacts.update);
  const upsertField = useMutation(api.customFields.upsert);
  const deleteField = useMutation(api.customFields.delete_);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [showNewField, setShowNewField] = useState(false);

  if (data === undefined || customFields === undefined) {
    return (
      <div dir="rtl" className="p-4 space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    );
  }

  if (data === null) {
    return (
      <div dir="rtl" className="p-4 text-center text-muted-foreground">
        لم يتم العثور على جهة الاتصال
      </div>
    );
  }

  const { contact, conversationCount } = data;
  const displayName = contact.customName ?? contact.displayName;

  function startEditing() {
    setName(contact.customName ?? "");
    setTags(contact.tags.join("، "));
    setNotes(contact.notes ?? "");
    setEditing(true);
  }

  async function saveEdits() {
    const patch: Record<string, unknown> = {};
    const newName = name.trim() || undefined;
    if (newName !== contact.customName) patch.customName = newName;
    const newTags = tags
      .split(/[,،]/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (JSON.stringify(newTags) !== JSON.stringify(contact.tags)) patch.tags = newTags;
    if (notes !== (contact.notes ?? "")) patch.notes = notes || undefined;

    if (Object.keys(patch).length > 0) {
      await updateContact({ contactId, ...patch } as Parameters<typeof updateContact>[0]);
    }
    setEditing(false);
  }

  async function handleAddField() {
    const key = newFieldKey.trim();
    const value = newFieldValue.trim();
    if (!key) return;
    await upsertField({ contactId, key, value });
    setNewFieldKey("");
    setNewFieldValue("");
    setShowNewField(false);
  }

  async function handleDeleteField(fieldId: Id<"customFields">) {
    await deleteField({ customFieldId: fieldId });
  }

  return (
    <ScrollArea className="h-full">
      <div dir="rtl" className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {editing ? (
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="الاسم"
                className="text-lg font-medium"
              />
            ) : (
              <h3 className="text-lg font-medium truncate">{displayName}</h3>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={editing ? saveEdits : startEditing}
            aria-label={editing ? "حفظ" : "تعديل"}
          >
            {editing ? (
              <span className="text-xs">حفظ</span>
            ) : (
              <PencilIcon className="size-4" />
            )}
          </Button>
          {editing && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setEditing(false)}
              aria-label="إلغاء"
            >
              <XIcon className="size-4" />
            </Button>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">رقم الهاتف</p>
          <p className="text-sm font-mono" dir="ltr">
            {contact.phone}
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">المحادثات</p>
          <p className="text-sm">{conversationCount}</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">الوسوم</p>
          {editing ? (
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="وسوم مفصولة بفواصل"
            />
          ) : (
            <div className="flex flex-wrap gap-1">
              {contact.tags.length > 0 ? (
                contact.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">بدون وسوم</span>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">ملاحظات</p>
          {editing ? (
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أضف ملاحظات..."
              rows={3}
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap">
              {contact.notes || "بدون ملاحظات"}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">حقول مخصصة</p>
            {!editing && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowNewField(true)}
                aria-label="إضافة حقل"
              >
                <PlusIcon className="size-4" />
              </Button>
            )}
          </div>

          {customFields.map((field) => (
            <div
              key={field._id}
              className="flex items-center gap-2 text-sm"
            >
              <span className="text-muted-foreground min-w-[80px]">
                {field.key}
              </span>
              <span className="flex-1">{field.value}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleDeleteField(field._id)}
                aria-label={`حذف ${field.key}`}
              >
                <Trash2Icon className="size-3" />
              </Button>
            </div>
          ))}

          {showNewField && (
            <div className="flex items-center gap-2">
              <Input
                value={newFieldKey}
                onChange={(e) => setNewFieldKey(e.target.value)}
                placeholder="المفتاح"
                className="w-24"
              />
              <Input
                value={newFieldValue}
                onChange={(e) => setNewFieldValue(e.target.value)}
                placeholder="القيمة"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleAddField}
                aria-label="حفظ الحقل"
              >
                <PlusIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setShowNewField(false);
                  setNewFieldKey("");
                  setNewFieldValue("");
                }}
                aria-label="إلغاء"
              >
                <XIcon className="size-4" />
              </Button>
            </div>
          )}

          {!showNewField && customFields.length === 0 && (
            <span className="text-xs text-muted-foreground">
              لا توجد حقول مخصصة
            </span>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
