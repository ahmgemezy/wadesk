"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import type { DateRange } from "./date-range-picker";
import { motion } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon, UserIcon } from "lucide-react";

type Currency = "EGP" | "SAR" | "AED" | "USD";

const CURRENCY_META: Record<Currency, { symbol: string; nameAr: string; nameEn: string }> = {
  EGP: { symbol: "ج.م", nameAr: "جنيه مصري", nameEn: "Egyptian Pound" },
  SAR: { symbol: "ر.س", nameAr: "ريال سعودي", nameEn: "Saudi Riyal" },
  AED: { symbol: "د.إ", nameAr: "درهم إماراتي", nameEn: "UAE Dirham" },
  USD: { symbol: "$", nameAr: "دولار أمريكي", nameEn: "US Dollar" },
};

const STAGE_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  lead:     { ar: "عميل محتمل", en: "Lead",     color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  prospect: { ar: "فرصة",       en: "Prospect", color: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  customer: { ar: "عميل",       en: "Customer", color: "bg-green-500/15 text-green-400 border-green-500/20" },
  retained: { ar: "عميل وفي",   en: "Retained", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  churned:  { ar: "خسرناه",     en: "Churned",  color: "bg-red-500/15 text-red-400 border-red-500/20" },
};

function formatAmount(amount: number): string {
  return amount.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Drill-down sheet — loads contacts for a specific currency
function RevenueDrillDown({
  currency,
  startTs,
  endTs,
  locale,
  open,
  onOpenChange,
}: {
  currency: Currency | null;
  startTs: number;
  endTs: number;
  locale: "ar" | "en";
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const meta = currency ? CURRENCY_META[currency] : null;

  const contacts = useQuery(
    api.analytics.getContactsByRevenueCurrency,
    currency && open ? { currency, startTs, endTs } : "skip",
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={locale === "ar" ? "right" : "left"} className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="font-sans text-base">
            {locale === "ar"
              ? `العملاء — ${meta?.nameAr ?? ""}`
              : `Contacts — ${meta?.nameEn ?? ""}`}
          </SheetTitle>
        </SheetHeader>

        {!contacts ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 font-sans">
            {locale === "ar" ? "لا توجد جهات اتصال" : "No contacts found"}
          </p>
        ) : (
          <div className="space-y-2">
            {contacts.map((contact) => {
              const stage = contact.stage ? STAGE_LABELS[contact.stage] : null;
              return (
                <div
                  key={contact._id}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <UserIcon className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium font-sans truncate">{contact.displayName}</p>
                      <p className="text-xs text-muted-foreground font-mono" dir="ltr">{contact.phone}</p>
                      {stage && (
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-sans mt-1 ${stage.color}`}>
                          {locale === "ar" ? stage.ar : stage.en}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-end" dir="ltr">
                    <p className="text-sm font-bold font-sans">{formatAmount(contact.spent)}</p>
                    <p className="text-xs text-muted-foreground">{currency}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

interface RevenueWidgetProps {
  dateRange: DateRange;
  locale?: "ar" | "en";
}

export function RevenueWidget({ dateRange, locale = "ar" }: RevenueWidgetProps) {
  const startTs = dateRange.from.getTime();
  const endTs = dateRange.to.getTime();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);

  const data = useQuery(api.analytics.getRevenueByCurrency, { startTs, endTs });

  const ChevronIcon = locale === "ar" ? ChevronLeftIcon : ChevronRightIcon;

  if (!data) {
    return (
      <Card className="bg-card/40 backdrop-blur-xl border-border/50 shadow-2xl">
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="relative bg-card/40 backdrop-blur-xl border-border/50 shadow-2xl overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground font-sans">
              {locale === "ar" ? "الإيرادات" : "Revenue"}
            </CardTitle>
            {data.contactsWithRevenue > 0 && (
              <span className="text-xs text-muted-foreground font-sans">
                {data.contactsWithRevenue}{" "}
                {locale === "ar" ? "عميل بإيراد مسجل" : "contacts with revenue"}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {data.breakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4 font-sans">
              {locale === "ar"
                ? "لا توجد إيرادات مسجلة لهذه الفترة"
                : "No revenue recorded for this period"}
            </p>
          ) : (
            <motion.div
              className="space-y-2"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
            >
              {data.breakdown.map(({ currency, amount }) => {
                const meta = CURRENCY_META[currency as Currency] ?? {
                  symbol: currency,
                  nameAr: currency,
                  nameEn: currency,
                };
                return (
                  <motion.button
                    key={currency}
                    variants={{ hidden: { opacity: 0, x: 10 }, show: { opacity: 1, x: 0 } }}
                    onClick={() => setSelectedCurrency(currency as Currency)}
                    className="w-full flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3 border border-border/40 hover:bg-muted/70 hover:border-primary/30 transition-colors group cursor-pointer text-start"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-sans">
                        {locale === "ar" ? meta.nameAr : meta.nameEn}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">{currency}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-baseline gap-1.5" dir="ltr">
                        <span className="text-lg font-bold tracking-tight font-sans text-foreground">
                          {formatAmount(amount)}
                        </span>
                        <span className="text-sm text-muted-foreground font-sans">{meta.symbol}</span>
                      </div>
                      <ChevronIcon className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </CardContent>

        <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 to-transparent pointer-events-none" />
      </Card>

      <RevenueDrillDown
        currency={selectedCurrency}
        startTs={startTs}
        endTs={endTs}
        locale={locale}
        open={selectedCurrency !== null}
        onOpenChange={(v) => { if (!v) setSelectedCurrency(null); }}
      />
    </>
  );
}
