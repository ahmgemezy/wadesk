"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { resolveIcon } from "./resolve-icon";
import { DT } from "@/lib/design-tokens";
import type { NavItem } from "@/lib/shell/types";

interface BottomNavProps {
  items: NavItem[];
  locale: "ar" | "en";
}

export function BottomNav({ items, locale }: BottomNavProps) {
  const pathname = usePathname();
  const visibleItems = items.slice(0, 5);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex md:hidden bg-white/90 backdrop-blur-xl border-t border-black/[0.06] dark:bg-[#111111]/90 dark:border-white/[0.05] pb-[env(safe-area-inset-bottom)]"
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      {visibleItems.map((item) => {
        const Icon = resolveIcon(item.icon);
        const isActive = pathname === item.href || (item.children && pathname.startsWith(item.href));
        const label = locale === "ar" ? item.labelAr : item.labelEn;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
              isActive
                ? `${DT.TEXT_BLUE} border-t-2 ${DT.BORDER_BLUE}`
                : DT.TEXT_GRAY
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="size-5" />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
