"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DT } from "@/lib/design-tokens";
import type { DateRange } from "./date-range-picker";
import { motion } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon, UserIcon } from "lucide-react";

import { getCurrencyByCode } from "@/lib/currencies";

type Currency = string;

const STAGE_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  lead:     { ar: "عميل محتمل", en: "Lead",     color: "bg-[#0071E3]/10 text-[#0071E3] border-[#0071E3]/20 dark:bg-[#0A84FF]/15 dark:text-[#0A84FF] dark:border-[#0A84FF]/25" },
  prospect: { ar: "فرصة",       en: "Prospect", color: "bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/20 dark:bg-[#FF9F0A]/15 dark:text-[#FF9F0A] dark:border-[#FF9F0A]/25" },
  customer: { ar: "عميل",       en: "Customer", color: "bg-[#34C759]/10 text-[#34C759] border-[#34C759]/20 dark:bg-[#30D158]/15 dark:text-[#30D158] dark:border-[#30D158]/25" },
  retained: { ar: "عميل وفي",   en: "Retained", color: "bg-[#5AC8FA]/10 text-[#5AC8FA] border-[#5AC8FA]/20 dark:bg-[#64D2FF]/15 dark:text-[#64D2FF] dark:border-[#64D2FF]/25" },
  churned:  { ar: "خسرناه",     en: "Churned",  color: "bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/20 dark:bg-[#FF453A]/15 dark:text-[#FF453A] dark:border-[#FF453A]/25" },
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
  const meta = currency ? getCurrencyByCode(currency) : null;

  const contacts = useQuery(
    api.analytics.getContactsByRevenueCurrency,
    currency && open ? { currency, startTs, endTs } : "skip",
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={locale === "ar" ? "right" : "left"} className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className={DT.H3}>
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
          <p className={`text-center py-8 ${DT.MUTED}`}>
            {locale === "ar" ? "لا توجد جهات اتصال" : "No contacts found"}
          </p>
        ) : (
          <div className="space-y-2">
            {contacts.map((contact) => {
              const stage = contact.stage ? STAGE_LABELS[contact.stage] : null;
              return (
                <div
                  key={contact._id}
                  className={`flex items-center justify-between ${DT.CARD_FLAT} px-4 py-3 gap-3`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-8 rounded-full bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 flex items-center justify-center shrink-0">
                      <UserIcon className="size-4 text-[#0071E3] dark:text-[#0A84FF]" />
                    </div>
                    <div className="min-w-0">
                      <p className={`${DT.BODY} font-medium truncate`}>{contact.displayName}</p>
                      <p className={`${DT.MICRO} font-mono`} dir="ltr">{contact.phone}</p>
                      {stage && (
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] mt-1 ${stage.color}`}>
                          {locale === "ar" ? stage.ar : stage.en}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-end" dir="ltr">
                    <p className={`${DT.BODY} font-semibold`}>{formatAmount(contact.spent)}</p>
                    <p className={DT.MICRO}>{currency}</p>
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
      <div className={`${DT.CARD_SM} p-5`}>
        <Skeleton className="h-4 w-24 mb-3" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`${DT.CARD_SM} relative p-5 overflow-hidden`}>
        <div className="flex items-center justify-between mb-3">
          <div className={DT.MICRO}>
            {locale === "ar" ? "الإيرادات" : "Revenue"}
          </div>
          {data.contactsWithRevenue > 0 && (
            <span className={DT.MICRO}>
              {data.contactsWithRevenue}{" "}
              {locale === "ar" ? "عميل بإيراد مسجل" : "contacts with revenue"}
            </span>
          )}
        </div>
        {data.breakdown.length === 0 ? (
          <p className={`text-center py-4 ${DT.MUTED}`}>
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
              const meta = getCurrencyByCode(currency) ?? {
                code: currency,
                symbol: currency,
                nameAr: currency,
                nameEn: currency,
              };
              return (
                <motion.button
                  key={currency}
                  variants={{ hidden: { opacity: 0, x: 10 }, show: { opacity: 1, x: 0 } }}
                  onClick={() => setSelectedCurrency(currency)}
                  className={`w-full flex items-center justify-between ${DT.CARD_FLAT} px-4 py-3 hover:bg-black/[0.06] dark:hover:bg-white/[0.07] transition-colors group cursor-pointer text-start`}
                >
                  <div className="flex flex-col">
                    <span className={DT.MICRO}>
                      {locale === "ar" ? meta.nameAr : meta.nameEn}
                    </span>
                    <span className={`${DT.MICRO} font-mono`}>{currency}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-baseline gap-1.5" dir="ltr">
                      <span className="text-[32px] font-semibold tracking-[-0.5px] text-[#1D1D1F] dark:text-white">
                        {formatAmount(amount)}
                      </span>
                      <span className={DT.MUTED}>{meta.symbol}</span>
                    </div>
                    <ChevronIcon className={`size-4 ${DT.TEXT_GRAY} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </div>

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
