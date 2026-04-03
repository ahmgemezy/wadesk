"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { type MarketingLocale, t } from "@/lib/marketing/i18n";

function MobileNavSheet({ isAuthenticated, locale }: { isAuthenticated: boolean; locale: MarketingLocale }) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
        <Menu />
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle>وا ديسك</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-3 p-4">
          <Link href="#features" className="text-sm hover:text-primary">
            {t(locale, "nav.features")}
          </Link>
          <Link href="#pricing" className="text-sm hover:text-primary">
            {t(locale, "nav.pricing")}
          </Link>
          <Link href="#why-wadesk" className="text-sm hover:text-primary">
            {t(locale, "nav.whyWadesk")}
          </Link>
          <hr className="my-2" />
          {isAuthenticated ? (
            <SheetClose nativeButton={false} render={<Link href="/inbox" className="text-sm font-medium hover:text-primary" />}>
              {t(locale, "nav.dashboard")}
            </SheetClose>
          ) : (
            <>
              <SheetClose nativeButton={false} render={<Link href="/sign-in" className="text-sm font-medium hover:text-primary" />}>
                {t(locale, "nav.signIn")}
              </SheetClose>
              <SheetClose
                nativeButton={false}
                render={
                  <Link
                    href="/sign-up"
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80"
                  />
                }
              >
                {t(locale, "nav.signUp")}
              </SheetClose>
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export { MobileNavSheet };
