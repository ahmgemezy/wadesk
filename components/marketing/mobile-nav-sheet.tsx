"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { type MarketingLocale, t } from "@/lib/marketing/i18n";
import { DT } from "@/lib/design-tokens";

function MobileNavSheet({ isAuthenticated, locale }: { isAuthenticated: boolean; locale: MarketingLocale }) {
  return (
    <Sheet>
      <SheetTrigger className={`${DT.BTN_ICON} md:hidden`}>
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="right" className={`${DT.SHEET} w-72`}>
        <SheetHeader>
          <SheetTitle className={DT.H2}>{locale === "ar" ? "واب ديسك" : "WABDesk"}</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-4">
          <SheetClose
            nativeButton={false}
            render={
              <Link href="#features" className={DT.LIST_ITEM}>
                {t(locale, "nav.features")}
              </Link>
            }
          />
          <SheetClose
            nativeButton={false}
            render={
              <Link href="#pricing" className={DT.LIST_ITEM}>
                {t(locale, "nav.pricing")}
              </Link>
            }
          />
          <SheetClose
            nativeButton={false}
            render={
              <Link href="#why-wabdesk" className={DT.LIST_ITEM}>
                {t(locale, "nav.whyWABDesk")}
              </Link>
            }
          />
          <hr className={`${DT.DIVIDER} my-2`} />
          {isAuthenticated ? (
            <SheetClose
              nativeButton={false}
              render={
                <Link href="/inbox" className={`${DT.BTN_PRIMARY} w-full`}>
                  {t(locale, "nav.dashboard")}
                </Link>
              }
            />
          ) : (
            <>
              <SheetClose
                nativeButton={false}
                render={
                  <Link href="/sign-in" className={DT.LIST_ITEM}>
                    {t(locale, "nav.signIn")}
                  </Link>
                }
              />
              <SheetClose
                nativeButton={false}
                render={
                  <Link href="/sign-up" className={`${DT.BTN_PRIMARY} w-full mt-2`}>
                    {t(locale, "nav.signUp")}
                  </Link>
                }
              />
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export { MobileNavSheet };
