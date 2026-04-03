"use client";

import Link from "next/link";
import { type MarketingLocale, t } from "@/lib/marketing/i18n";
import { Button } from "@/components/ui/button";
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
      className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold">
          وا ديسك
        </Link>

        <div className="hidden items-center gap-4 md:flex">
          <Link href="#features" className="text-sm hover:text-primary">
            {t(locale, "nav.features")}
          </Link>
          <Link href="#pricing" className="text-sm hover:text-primary">
            {t(locale, "nav.pricing")}
          </Link>
          <Link href="#why-wadesk" className="text-sm hover:text-primary">
            {t(locale, "nav.whyWadesk")}
          </Link>

          <Button variant="ghost" size="sm" onClick={toggleLocale}>
            {locale === "ar" ? "EN" : "ع"}
          </Button>

          {isAuthenticated ? (
            <Button size="sm" nativeButton={false} render={<Link href="/inbox" />}>
              {t(locale, "nav.dashboard")}
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/sign-in" />}>
                {t(locale, "nav.signIn")}
              </Button>
              <Button size="sm" nativeButton={false} render={<Link href="/sign-up" />}>
                {t(locale, "nav.signUp")}
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Button variant="ghost" size="icon-xs" onClick={toggleLocale}>
            {locale === "ar" ? "EN" : "ع"}
          </Button>
          <MobileNavSheet isAuthenticated={isAuthenticated} locale={locale} />
        </div>
      </div>
    </nav>
  );
}

export { MarketingNav };
