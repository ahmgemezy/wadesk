"use client";

import Link from "next/link";
import { useMarketingLocale } from "@/lib/marketing/i18n";
import { CookieSettingsButton } from "@/components/consent/cookie-settings-button";
import { DT } from "@/lib/design-tokens";

type LegalPage = "privacy" | "terms" | "dpa" | "cookies";

const labels: Record<LegalPage, { ar: string; en: string; href: string }> = {
  privacy: { ar: "سياسة الخصوصية",              en: "Privacy Policy",  href: "/privacy" },
  terms:   { ar: "شروط الخدمة",                  en: "Terms of Service", href: "/terms" },
  dpa:     { ar: "اتفاقية البيانات",              en: "DPA",              href: "/dpa" },
  cookies: { ar: "سياسة ملفات تعريف الارتباط",   en: "Cookie Policy",   href: "/cookies" },
};

const siblingPages: Record<LegalPage, LegalPage[]> = {
  privacy: ["terms", "dpa", "cookies"],
  terms:   ["privacy", "dpa", "cookies"],
  dpa:     ["privacy", "terms", "cookies"],
  cookies: ["privacy", "terms", "dpa"],
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
      className="flex min-h-dvh flex-col bg-white dark:bg-[#000000]"
    >
      {/* Nav */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-black/[0.06] dark:bg-[#111111]/80 dark:border-white/[0.05]">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/" className={DT.H3}>
            {isAr ? "واب ديسك" : "WABDesk"}
          </Link>

          <nav className="flex items-center gap-3">
            {siblingPages[currentPage].map((page) => (
              <Link
                key={page}
                href={labels[page].href}
                className={`hidden sm:inline ${DT.MUTED} hover:text-[#1D1D1F] dark:hover:text-white transition-colors`}
              >
                {isAr ? labels[page].ar : labels[page].en}
              </Link>
            ))}

            <button
              type="button"
              onClick={() => setLocale(isAr ? "en" : "ar")}
              className={DT.BTN_SM}
            >
              {isAr ? "EN" : "ع"}
            </button>

            <Link href="/" className={`${DT.MUTED} hover:text-[#1D1D1F] dark:hover:text-white transition-colors`}>
              {isAr ? "→ الرئيسية" : "← Home"}
            </Link>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <div className={`${DT.CARD} max-w-3xl mx-auto my-8`}>
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#F5F5F7] dark:bg-[#111111] border-t border-black/[0.06] dark:border-white/[0.05]">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-2 px-4 py-6 text-center sm:flex-row sm:justify-between">
          <p className={DT.MUTED}>
            {isAr ? "© 2026 واب ديسك. جميع الحقوق محفوظة." : "© 2026 WABDesk. All rights reserved."}
          </p>
          <div className="flex flex-wrap gap-4">
            {(["privacy", "terms", "dpa", "cookies"] as LegalPage[]).map((page) => (
              <Link
                key={page}
                href={labels[page].href}
                className={`transition-colors ${
                  currentPage === page
                    ? "text-[#1D1D1F] dark:text-white font-medium text-[13px]"
                    : `${DT.MUTED} hover:text-[#1D1D1F] dark:hover:text-white`
                }`}
              >
                {isAr ? labels[page].ar : labels[page].en}
              </Link>
            ))}
            <CookieSettingsButton />
          </div>
        </div>
      </footer>
    </div>
  );
}
