"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useT } from "@/lib/i18n/context";
import { DT } from "@/lib/design-tokens";
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
            <ShoppingBagIcon className="size-8 text-[#6E6E73]/40 dark:text-white/30" />
            <p className={`${DT.H3}`}>{t("No catalog connected", "لا يوجد كتالوج")}</p>
            <p className={DT.MUTED}>
              {t(
                "Set up a product catalog in Settings → Product Catalog",
                "أضف كتالوج منتجات من الإعدادات ← كتالوج المنتجات",
              )}
            </p>
          </div>
        ) : (
          <>
            <div className={`p-2 ${DT.DIVIDER}`}>
              <div className="relative">
                <SearchIcon className="absolute start-2 top-1/2 -translate-y-1/2 size-3.5 text-[#6E6E73] dark:text-white/50 pointer-events-none" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("Search products…", "ابحث عن منتج…")}
                  className={`${DT.INPUT_SM} ps-7`}
                  autoFocus
                />
              </div>
            </div>

            <div className={`max-h-72 overflow-y-auto`}>
              {products === undefined ? (
                <div className="flex items-center justify-center p-6">
                  <Loader2Icon className="size-4 animate-spin text-[#6E6E73] dark:text-white/50" />
                </div>
              ) : products.length === 0 ? (
                <p className={`p-4 text-center ${DT.MUTED}`}>
                  {q
                    ? t("No products found", "لا توجد منتجات")
                    : t("No products yet", "لا توجد منتجات بعد")}
                </p>
              ) : (
                <div className="p-2 flex flex-col gap-1.5">
                  {products.map((p) => (
                    <div
                      key={p._id}
                      className={`${DT.CARD_SM} p-2 flex items-center gap-2 group`}
                    >
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="size-10 rounded-xl object-cover shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="size-10 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center shrink-0">
                          <ShoppingBagIcon className="size-4 text-[#6E6E73] dark:text-white/50" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`${DT.H3} truncate`}>{p.name}</p>
                        {p.price && (
                          <p className={`${DT.BODY} font-medium`}>
                            {p.price}
                            {p.currency ? ` ${p.currency}` : ""}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        className={`${DT.BTN_SM_PRIMARY} opacity-0 group-hover:opacity-100 transition-opacity`}
                        disabled={sending !== null}
                        onClick={() => handleSend(p)}
                      >
                        {sending === p.retailerId ? (
                          <Loader2Icon className="size-3 animate-spin" />
                        ) : (
                          t("Send", "إرسال")
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {syncStatus.productCount > 0 && (
              <div className={`${DT.DIVIDER} px-3 py-1.5 ${DT.MICRO}`}>
                {syncStatus.productCount} {t("products", "منتج")}
              </div>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
