"use client";

import Link from "next/link";
import { type MarketingLocale, t } from "@/lib/marketing/i18n";

function MarketingFooter({ locale }: { locale: MarketingLocale }) {
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <Link href="/sign-up" className="hover:text-primary">
            {t(locale, "footer.signUp")}
          </Link>
          <Link href="/sign-in" className="hover:text-primary">
            {t(locale, "footer.signIn")}
          </Link>
          <Link href="#pricing" className="hover:text-primary">
            {t(locale, "footer.pricing")}
          </Link>
          <Link href="/privacy" className="hover:text-primary">
            {t(locale, "footer.privacy")}
          </Link>
          <Link href="/terms" className="hover:text-primary">
            {t(locale, "footer.terms")}
          </Link>
          <Link href="/dpa" className="hover:text-primary">
            {t(locale, "footer.dpa")}
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          {t(locale, "footer.copyright")}
        </p>
      </div>
    </footer>
  );
}

export { MarketingFooter };
