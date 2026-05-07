"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocale } from "@/lib/shell/locale-action";

interface LocaleSwitcherProps {
  locale: "ar" | "en";
}

export function LocaleSwitcher({ locale }: LocaleSwitcherProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    const next = locale === "ar" ? "en" : "ar";
    startTransition(async () => {
      await setLocale(next);
      // router.refresh() re-fetches all RSC layouts (updating <html lang dir>)
      // without tearing down the Convex client, so the page stays stable.
      router.refresh();
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className="flex items-center justify-center rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors disabled:opacity-50 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8"
      title={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
    >
      <span className="group-data-[collapsible=icon]:hidden">
        {locale === "ar" ? "EN" : "ع"}
      </span>
      <span className="hidden group-data-[collapsible=icon]:block">
        {locale === "ar" ? "E" : "ع"}
      </span>
    </button>
  );
}
