"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
      <SheetTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}>
        <Menu />
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle>{locale === "ar" ? "واب ديسك" : "WABDesk"}</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-3 p-4">
          <Link href="#features" className="text-sm hover:text-primary">
            {t(locale, "nav.features")}
          </Link>
          <Link href="#pricing" className="text-sm hover:text-primary">
            {t(locale, "nav.pricing")}
          </Link>
          <Link href="#why-wabdesk" className="text-sm hover:text-primary">
            {t(locale, "nav.whyWABDesk")}
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
