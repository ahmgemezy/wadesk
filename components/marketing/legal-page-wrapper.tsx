"use client";

import Link from "next/link";
import { useMarketingLocale } from "@/lib/marketing/i18n";
import { Button } from "@/components/ui/button";

type LegalPage = "privacy" | "terms" | "dpa";

const labels: Record<LegalPage, { ar: string; en: string; href: string }> = {
  privacy: { ar: "سياسة الخصوصية", en: "Privacy Policy", href: "/privacy" },
  terms:   { ar: "شروط الخدمة",     en: "Terms of Service", href: "/terms" },
  dpa:     { ar: "اتفاقية البيانات", en: "DPA",              href: "/dpa" },
};

const siblingPages: Record<LegalPage, LegalPage[]> = {
  privacy: ["terms", "dpa"],
  terms:   ["privacy", "dpa"],
  dpa:     ["privacy", "terms"],
};

interface LegalPageWrapperProps {
  children: React.ReactNode;
  currentPage: LegalPage;
}

export function LegalPageWrapper({ children, currentPage }: LegalPageWrapperProps) {
  const { locale, setLocale } = useMarketingLocale();
  const isAr = locale === "ar";

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      lang={locale}
      className="flex min-h-dvh flex-col bg-background text-foreground"
    >
      {/* Nav */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-bold">
            {isAr ? "واب ديسك" : "WABDesk"}
          </Link>

          <nav className="flex items-center gap-3 text-sm text-muted-foreground">
            {/* Sibling legal page links */}
            {siblingPages[currentPage].map((page) => (
              <Link
                key={page}
                href={labels[page].href}
                className="hidden sm:inline hover:text-foreground transition-colors"
              >
                {isAr ? labels[page].ar : labels[page].en}
              </Link>
            ))}

            {/* Language toggle */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setLocale(isAr ? "en" : "ar")}
            >
              {isAr ? "EN" : "ع"}
            </Button>

            {/* Home */}
            <Link href="/" className="hover:text-foreground transition-colors">
              {isAr ? "→ الرئيسية" : "← Home"}
            </Link>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t bg-muted/40">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-2 px-4 py-6 text-center sm:flex-row sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {isAr ? "© 2026 واب ديسك. جميع الحقوق محفوظة." : "© 2026 WABDesk. All rights reserved."}
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            {(["privacy", "terms", "dpa"] as LegalPage[]).map((page) => (
              <Link
                key={page}
                href={labels[page].href}
                className={`transition-colors hover:text-foreground ${currentPage === page ? "text-foreground font-medium" : ""}`}
              >
                {isAr ? labels[page].ar : labels[page].en}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
