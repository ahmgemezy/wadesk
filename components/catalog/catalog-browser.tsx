"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useT } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ShoppingBagIcon, SearchIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

export function CatalogBrowser({ conversationId }: { conversationId: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sending, setSending] = useState<string | null>(null);

  const conversation = useQuery(api.conversations.get, {
    conversationId: conversationId as Id<"conversations">,
  });

  const channelId = conversation?.channelId as Id<"channels"> | undefined;

  const syncStatus = useQuery(
    api.catalog.getSyncStatus,
    channelId ? { channelId } : "skip",
  );

  const products = useQuery(
    api.catalog.searchProducts,
    channelId ? { channelId, q } : "skip",
  );

  const sendProductCard = useMutation(api.messages.sendProductCard);

  async function handleSend(product: {
    retailerId: string;
    catalogId: string;
    name: string;
    description?: string;
    price?: string;
    currency?: string;
    imageUrl?: string;
  }) {
    setSending(product.retailerId);
    try {
      await sendProductCard({
        conversationId: conversationId as Id<"conversations">,
        catalogId: product.catalogId,
        retailerId: product.retailerId,
        name: product.name,
        description: product.description,
        price: product.price,
        currency: product.currency,
        imageUrl: product.imageUrl,
      });
      setOpen(false);
    } catch {
      toast.error(t("Failed to send product", "فشل إرسال المنتج"));
    } finally {
      setSending(null);
    }
  }

  const hasCatalog = !!syncStatus?.catalogId;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        title={t("Product catalog", "كتالوج المنتجات")}
      >
        <ShoppingBagIcon className="size-4" />
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80 p-0">
        {!hasCatalog ? (
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <ShoppingBagIcon className="size-8 text-muted-foreground/40" />
            <p className="text-sm font-medium">{t("No catalog connected", "لا يوجد كتالوج")}</p>
            <p className="text-xs text-muted-foreground">
              {t(
                "Set up a product catalog in Settings → Product Catalog",
                "أضف كتالوج منتجات من الإعدادات ← كتالوج المنتجات",
              )}
            </p>
          </div>
        ) : (
          <>
            <div className="p-2 border-b">
              <div className="relative">
                <SearchIcon className="absolute start-2 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("Search products…", "ابحث عن منتج…")}
                  className="ps-7 h-8 text-sm"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y">
              {products === undefined ? (
                <div className="flex items-center justify-center p-6">
                  <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
                </div>
              ) : products.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  {q
                    ? t("No products found", "لا توجد منتجات")
                    : t("No products yet", "لا توجد منتجات بعد")}
                </p>
              ) : (
                products.map((p) => (
                  <div
                    key={p._id}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/40 group"
                  >
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="size-10 rounded object-cover shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="size-10 rounded bg-muted flex items-center justify-center shrink-0">
                        <ShoppingBagIcon className="size-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      {p.price && (
                        <p className="text-xs text-muted-foreground">
                          {p.price}
                          {p.currency ? ` ${p.currency}` : ""}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={sending !== null}
                      onClick={() => handleSend(p)}
                    >
                      {sending === p.retailerId ? (
                        <Loader2Icon className="size-3 animate-spin" />
                      ) : (
                        t("Send", "إرسال")
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>

            {syncStatus.productCount > 0 && (
              <div className="border-t px-3 py-1.5 text-xs text-muted-foreground">
                {syncStatus.productCount} {t("products", "منتج")}
              </div>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
