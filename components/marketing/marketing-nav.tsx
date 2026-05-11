"use client";

import Link from "next/link";
import Image from "next/image";
import { type MarketingLocale, t } from "@/lib/marketing/i18n";
import { DT } from "@/lib/design-tokens";
import { MobileNavSheet } from "@/components/marketing/mobile-nav-sheet";

function MarketingNav({
  isAuthenticated,
  locale,
  setLocale,
}: {
  isAuthenticated: boolean;
  locale: MarketingLocale;
  setLocale: (locale: MarketingLocale) => void;
}) {
  const toggleLocale = () => {
    setLocale(locale === "ar" ? "en" : "ar");
  };

  return (
    <nav
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-black/[0.06] dark:bg-[#111111]/80 dark:border-white/[0.05]"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className={`${DT.H3} flex items-center gap-2`}>
          <Image src="/logo.png" alt="WABDesk" width={28} height={28} className="rounded-md" />
          {locale === "ar" ? "واب ديسك" : "WABDesk"}
        </Link>

        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="#features"
            className={`${DT.MUTED} ${DT.MUTED_HOVER} transition-colors`}
          >
            {t(locale, "nav.features")}
          </Link>
          <Link
            href="#pricing"
            className={`${DT.MUTED} ${DT.MUTED_HOVER} transition-colors`}
          >
            {t(locale, "nav.pricing")}
          </Link>
          <Link
            href="#why-wabdesk"
            className={`${DT.MUTED} ${DT.MUTED_HOVER} transition-colors`}
          >
            {t(locale, "nav.whyWABDesk")}
          </Link>

          <button
            type="button"
            onClick={toggleLocale}
            className={`${DT.MUTED} ${DT.MUTED_HOVER} transition-colors`}
          >
            {locale === "ar" ? "EN" : "ع"}
          </button>

          {isAuthenticated ? (
            <Link href="/inbox" className={DT.BTN_SM_PRIMARY}>
              {t(locale, "nav.dashboard")}
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className={`${DT.MUTED} ${DT.MUTED_HOVER} transition-colors`}
              >
                {t(locale, "nav.signIn")}
              </Link>
              <Link href="/sign-up" className={DT.BTN_SM_PRIMARY}>
                {t(locale, "nav.signUp")}
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={toggleLocale}
            className={`${DT.MUTED} ${DT.MUTED_HOVER} transition-colors px-2`}
          >
            {locale === "ar" ? "EN" : "ع"}
          </button>
          <MobileNavSheet isAuthenticated={isAuthenticated} locale={locale} />
        </div>
      </div>
    </nav>
  );
}

export { MarketingNav };
