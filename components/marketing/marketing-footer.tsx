"use client";

import Link from "next/link";
import { type MarketingLocale, t } from "@/lib/marketing/i18n";
import { CookieSettingsButton } from "@/components/consent/cookie-settings-button";
import { DT } from "@/lib/design-tokens";

function MarketingFooter({ locale }: { locale: MarketingLocale }) {
  return (
    <footer className="bg-[#F5F5F7] dark:bg-[#111111] border-t border-black/[0.06] dark:border-white/[0.05]">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/sign-up" className={`${DT.MUTED} ${DT.MUTED_HOVER} transition-colors`}>
            {t(locale, "footer.signUp")}
          </Link>
          <Link href="/sign-in" className={`${DT.MUTED} ${DT.MUTED_HOVER} transition-colors`}>
            {t(locale, "footer.signIn")}
          </Link>
          <Link href="#pricing" className={`${DT.MUTED} ${DT.MUTED_HOVER} transition-colors`}>
            {t(locale, "footer.pricing")}
          </Link>
          <Link href="/privacy" className={`${DT.MUTED} ${DT.MUTED_HOVER} transition-colors`}>
            {t(locale, "footer.privacy")}
          </Link>
          <Link href="/terms" className={`${DT.MUTED} ${DT.MUTED_HOVER} transition-colors`}>
            {t(locale, "footer.terms")}
          </Link>
          <Link href="/dpa" className={`${DT.MUTED} ${DT.MUTED_HOVER} transition-colors`}>
            {t(locale, "footer.dpa")}
          </Link>
          <Link href="/cookies" className={`${DT.MUTED} ${DT.MUTED_HOVER} transition-colors`}>
            {t(locale, "footer.cookies")}
          </Link>
          <CookieSettingsButton />
        </div>
        <p className={DT.MUTED}>
          {t(locale, "footer.copyright")}
        </p>
      </div>
    </footer>
  );
}

export { MarketingFooter };
