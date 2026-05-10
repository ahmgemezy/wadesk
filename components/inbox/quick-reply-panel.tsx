"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSelectedChannel } from "@/lib/hooks/channel-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/context";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { extractVariables, renderTemplate } from "@/lib/templateHelpers";

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
  contactContext?: Record<string, string>;
}

export function QuickReplyPanel({
  open,
  onClose,
  onSelect,
  contactContext = {},
}: QuickReplyPanelProps) {
  const t = useT();
  const [search, setSearch] = useState("");
  const [fillItem, setFillItem] = useState<{ content: string; variables: string[] } | null>(null);
  const [fillValues, setFillValues] = useState<Record<string, string>>({});
  const [fillErrors, setFillErrors] = useState<string[]>([]);

  const { channelId } = useSelectedChannel();
  const panelArgs = open ? (channelId ? { channelId } : {}) : "skip" as const;
  const quickReplies = useQuery(api.quickReplies.list, panelArgs);
  const messageTemplates = useQuery(api.messageTemplates.list, panelArgs);

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
      <SheetContent side="left" className="w-80 p-0 flex flex-col">
        <SheetHeader className="border-b border-border/60 bg-muted/20">
          <SheetTitle>{t("Quick Replies", "ردود سريعة")}</SheetTitle>
        </SheetHeader>
        <div className="px-4 pt-3 pb-2">
          <Input
            placeholder={t("Search...", "بحث...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            dir="auto"
            className="bg-muted/50 border-border/60"
          />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 space-y-4">
          {fillItem ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">{t("Fill in variables", "املأ المتغيرات")}</p>
              {fillItem.variables.map((variable) => (
                <div key={variable} className="space-y-1">
                  <label className="text-xs text-muted-foreground">{`{{${variable}}}`}</label>
                  <Input
                    value={fillValues[variable] ?? ""}
                    onChange={(e) => {
                      setFillErrors((prev) => prev.filter((v) => v !== variable));
                      setFillValues((prev) => ({ ...prev, [variable]: e.target.value }));
                    }}
                    dir="auto"
                    className={fillErrors.includes(variable) ? "border-destructive" : ""}
                  />
                  {fillErrors.includes(variable) && (
                    <p className="text-xs text-destructive">{t("Required", "مطلوب")}</p>
                  )}
                </div>
              ))}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    const empty = fillItem.variables.filter((v) => !fillValues[v]?.trim());
                    if (empty.length > 0) { setFillErrors(empty); return; }
                    onSelect(renderTemplate(fillItem.content, fillValues));
                    setFillItem(null);
                    onClose();
                  }}
                >
                  {t("Send", "إرسال")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setFillItem(null)}>
                  {t("Back", "رجوع")}
                </Button>
              </div>
            </div>
          ) : (
          <ScrollArea className="h-[calc(100vh-200px)]">
            {grouped &&
              Object.entries(grouped).map(([category, replies]) => (
                <div key={category} className="mb-4">
                  <h3 className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground mb-2">
                    {category}
                  </h3>
                  <div className="space-y-1.5">
                    {replies.map((qr) => (
                      <button
                        key={qr._id}
                        onClick={() => {
                          const vars = extractVariables(qr.content);
                          if (vars.length > 0) {
                            const prefilledValues: Record<string, string> = {};
                            for (const v of vars) {
                              if (contactContext[v]) prefilledValues[v] = contactContext[v];
                            }
                            const unknownVars = vars.filter((v) => !contactContext[v]);
                            if (unknownVars.length === 0) {
                              onSelect(renderTemplate(qr.content, prefilledValues));
                              onClose();
                            } else {
                              setFillItem({ content: qr.content, variables: unknownVars });
                              setFillValues(prefilledValues);
                              setFillErrors([]);
                            }
                          } else {
                            onSelect(qr.content);
                            onClose();
                          }
                        }}
                        className="w-full text-start p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-accent/40 transition-all group"
                      >
                        <div className="text-sm font-medium group-hover:text-primary transition-colors">{qr.title}</div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {qr.content}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
