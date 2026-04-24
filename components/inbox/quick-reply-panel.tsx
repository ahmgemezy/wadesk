"use client";

import { useState } from "react";
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
  type QuickReply = {
    _id: string;
    title: string;
    content: string;
    category?: string;
  };

  const quickReplies: QuickReply[] | undefined = useQuery(api.quickReplies.list, open ? {} : "skip");

  const filtered = quickReplies?.filter(
    (qr: QuickReply) =>
      qr.title.includes(search) ||
      qr.content.includes(search) ||
      (qr.category?.includes(search) ?? false),
  );

  const grouped = filtered?.reduce(
    (acc: Record<string, QuickReply[]>, qr: QuickReply) => {
      const cat = qr.category ?? t("General", "عام");
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(qr);
      return acc;
    },
    {} as Record<string, QuickReply[]>,
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
