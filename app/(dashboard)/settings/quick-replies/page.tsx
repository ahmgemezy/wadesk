"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function QuickRepliesPage() {
  const quickReplies = useQuery(api.quickReplies.list, {}) as
    | { _id: string; title: string; content: string; category?: string }[]
    | undefined;
  const createReply = useMutation(api.quickReplies.create);
  const removeReply = useMutation(api.quickReplies.remove);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");

  const handleCreate = async () => {
    if (!title.trim() || !body.trim()) return;
    await createReply({
      title: title.trim(),
      content: body.trim(),
      category: category.trim() || undefined,
    });
    setTitle("");
    setBody("");
    setCategory("");
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">الردود السريعة / Quick Replies</h1>

      <div className="border rounded-lg p-4 space-y-3">
        <h2 className="font-medium">
          إضافة رد جديد / Add New Reply
        </h2>
        <Input
          placeholder="العنوان / Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          dir="auto"
        />
        <Textarea
          placeholder="نص الرد / Reply body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          dir="auto"
        />
        <Input
          placeholder="الفئة (اختياري) / Category (optional)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          dir="auto"
        />
        <Button onClick={handleCreate} disabled={!title.trim() || !body.trim()}>
          إضافة / Add
        </Button>
      </div>

      <div className="space-y-2">
        {quickReplies?.map((qr) => (
          <div
            key={qr._id}
            className="border rounded-lg p-3 flex items-start justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{qr.title}</div>
              <div className="text-sm text-muted-foreground truncate">
                {qr.content}
              </div>
              {qr.category && (
                <div className="text-xs text-muted-foreground mt-1">
                  {qr.category}
                </div>
              )}
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => removeReply({ id: qr._id })}
            >
              حذف / Delete
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
