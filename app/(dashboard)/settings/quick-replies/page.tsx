"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

import { useT } from "@/lib/i18n/context";
import { Plus, Pencil, Trash2, MessageSquare } from "lucide-react";

export default function QuickRepliesPage() {
  const quickReplies = useQuery(api.quickReplies.list, {}) as
    | { _id: string; title: string; content: string; category?: string }[]
    | undefined;
  const createReply = useMutation(api.quickReplies.create);
  const removeReply = useMutation(api.quickReplies.remove);
  const updateReply = useMutation(api.quickReplies.update);

  const t = useT();
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");

  // Reset form when sheet closes/opens for creation
  const openForCreate = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
    setCategory("");
    setIsSheetOpen(true);
  };

  const openForEdit = (qr: { _id: string; title: string; content: string; category?: string }) => {
    setEditingId(qr._id);
    setTitle(qr.title);
    setBody(qr.content);
    setCategory(qr.category || "");
    setIsSheetOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) return;

    if (editingId) {
      await updateReply({
        id: editingId as Id<"quickReplies">,
        title: title.trim(),
        content: body.trim(),
        category: category.trim() || undefined,
      });
    } else {
      await createReply({
        title: title.trim(),
        content: body.trim(),
        category: category.trim() || undefined,
      });
    }

    setIsSheetOpen(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("Quick Replies", "الردود السريعة")}</h1>
        <Button onClick={openForCreate}>
          <Plus className="me-2 size-4" />
          {t("Add Reply", "إضافة رد")}
        </Button>
      </div>

      {quickReplies && quickReplies.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed bg-muted/30">
          <MessageSquare className="size-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">{t("No Quick Replies Yet", "لا توجد ردود سريعة بعد")}</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            {t("Create templates for common answers to reply faster to your customers.", "قم بإنشاء قوالب للإجابات الشائعة للرد بشكل أسرع على عملائك.")}
          </p>
          <Button variant="outline" onClick={openForCreate}>
            <Plus className="me-2 size-4" />
            {t("Create your first reply", "أنشئ ردك الأول")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickReplies?.map((qr) => (
            <Card key={qr._id} className="relative group overflow-hidden flex flex-col">
              <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon-sm" onClick={() => openForEdit(qr)}>
                  <Pencil className="size-3.5" />
                  <span className="sr-only">Edit</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon-sm" 
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeReply({ id: qr._id as Id<"quickReplies"> })}
                >
                  <Trash2 className="size-3.5" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
              
              <CardHeader className="pb-2 pe-16 space-y-0 text-start">
                {qr.category && (
                  <Badge variant="secondary" className="mb-2 w-fit font-normal text-[10px] uppercase tracking-wider">
                    {qr.category}
                  </Badge>
                )}
                <CardTitle className="text-base font-semibold leading-tight line-clamp-1">
                  {qr.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 text-sm text-muted-foreground whitespace-pre-wrap text-start opacity-90 line-clamp-4">
                {qr.content}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="flex flex-col w-full sm:!max-w-[450px] text-start p-0">
          <SheetHeader className="px-6 pt-6 pb-2">
            <SheetTitle>
              {editingId ? t("Edit Quick Reply", "تعديل الرد السريع") : t("Add New Reply", "إضافة رد جديد")}
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-5 flex-1 overflow-y-auto px-6 pb-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("Title", "العنوان")}</label>
              <Input
                placeholder={t("e.g. Greeting", "مثال: ترحيب")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                dir="auto"
              />
            </div>
            
            <div className="space-y-2 flex flex-col min-h-[200px]">
              <label className="text-sm font-medium">{t("Reply body", "نص الرد")}</label>
              <Textarea
                placeholder={t("Hello, how can I help you?", "مرحباً، كيف يمكنني مساعدتك؟")}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="flex-1 resize-none"
                dir="auto"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("Category (optional)", "الفئة (اختياري)")}</label>
              <Input
                placeholder={t("e.g. Support", "مثال: دعم")}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                dir="auto"
              />
            </div>
          </div>

          <div className="p-6 border-t mt-auto flex flex-col gap-2">
            <Button onClick={handleSave} disabled={!title.trim() || !body.trim()} className="w-full">
              {t("Save", "حفظ")}
            </Button>
            <Button variant="outline" onClick={() => setIsSheetOpen(false)} className="w-full">
              {t("Cancel", "إلغاء")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
