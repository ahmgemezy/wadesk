"use client";

import { DT } from "@/lib/design-tokens";
import Link from "next/link";

interface AnalyticsUpsellTeaserProps {
  locale?: "ar" | "en";
}

export function AnalyticsUpsellTeaser({ locale = "ar" }: AnalyticsUpsellTeaserProps) {
  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="grid gap-4 sm:grid-cols-3 blur-[6px] pointer-events-none select-none">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`${DT.CARD} p-6`}>
              <div className="h-16 bg-black/[0.06] dark:bg-white/[0.08] rounded" />
            </div>
          ))}
        </div>
        <div className={`${DT.CARD} absolute inset-0 flex items-center justify-center`}>
          <div className="text-center space-y-4 p-6">
            <p className={`text-[17px] font-medium ${DT.BODY}`}>
              {locale === "ar"
                ? "ترقية إلى Growth للوصول إلى التحليلات"
                : "Upgrade to Growth for Analytics"}
            </p>
            <Link href="/settings/billing" className={DT.BTN_SM_PRIMARY}>
              {locale === "ar" ? "ترقية الآن" : "Upgrade Now"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
