"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/context";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type ReplyItem = {
  _id: string;
  title: string;
  content: string;
  category?: string;
};

interface QuickReplyPanelProps {
  open: boolean;
  onClose: () => void;
  onSelect: (body: string) => void;
}

export function QuickReplyPanel({
  open,
  onClose,
  onSelect,
}: QuickReplyPanelProps) {
  const t = useT();
  const [search, setSearch] = useState("");

  const quickReplies = useQuery(api.quickReplies.list, open ? {} : "skip");
  const messageTemplates = useQuery(api.messageTemplates.list, open ? {} : "skip");

  const allItems: ReplyItem[] | undefined = useMemo(() => {
    if (!quickReplies || !messageTemplates) return undefined;
    const fromQR: ReplyItem[] = quickReplies.map((qr) => ({
      _id: qr._id,
      title: qr.title,
      content: qr.content,
      category: qr.category,
    }));
    const fromMT: ReplyItem[] = messageTemplates.map((mt) => ({
      _id: `mt_${mt._id}`,
      title: mt.title,
      content: mt.body,
      category: mt.category,
    }));
    return [...fromQR, ...fromMT];
  }, [quickReplies, messageTemplates]);

  const filtered = allItems?.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.content.toLowerCase().includes(search.toLowerCase()) ||
      (item.category?.toLowerCase().includes(search.toLowerCase()) ?? false),
  );

  const grouped = filtered?.reduce(
    (acc: Record<string, ReplyItem[]>, item: ReplyItem) => {
      const cat = item.category ?? t("General", "عام");
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    },
    {} as Record<string, ReplyItem[]>,
  );

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle>{t("Quick Replies", "ردود سريعة")}</SheetTitle>
        </SheetHeader>
        <div className="p-4 space-y-4">
          <Input
            placeholder={t("Search...", "بحث...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            dir="auto"
          />
          <ScrollArea className="h-[calc(100vh-200px)]">
            {grouped &&
              Object.entries(grouped).map(([category, replies]) => (
                <div key={category} className="mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    {category}
                  </h3>
                  <div className="space-y-1">
                    {replies.map((qr) => (
                      <button
                        key={qr._id}
                        onClick={() => {
                          onSelect(qr.content);
                          onClose();
                        }}
                        className="w-full text-start p-2 rounded-md hover:bg-accent transition-colors"
                      >
                        <div className="text-sm font-medium">{qr.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {qr.content}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
