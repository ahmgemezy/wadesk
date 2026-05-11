"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/ui/sidebar";
import { resolveIcon } from "@/components/shell/resolve-icon";
import { cn } from "@/lib/utils";
import { DT } from "@/lib/design-tokens";
import type { NavItem } from "@/lib/shell/types";

const ADMIN_PREFIXES = ["/settings/team", "/settings/channels", "/settings/billing"];

interface SettingsSubNavProps {
  items: NavItem[];
  adminItems?: NavItem[];
  locale: "ar" | "en";
}

export function SettingsSubNav({ items, adminItems = [], locale }: SettingsSubNavProps) {
  const { state } = useSidebar();
  const pathname = usePathname();

  if (state !== "collapsed") return null;

  const isAdminRoute = ADMIN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  const activeItems = isAdminRoute ? adminItems : items;

  if (activeItems.length === 0) return null;

  return (
    <nav
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="mx-4 my-2 flex items-center gap-1 overflow-x-auto rounded-2xl bg-black/[0.03] p-1 scrollbar-none dark:bg-white/[0.03]"
    >
      {activeItems.map((item) => {
        const Icon = resolveIcon(item.icon);
        const label = locale === "ar" ? item.labelAr : item.labelEn;
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn("shrink-0", isActive ? DT.SIDEBAR_ITEM_ACTIVE : DT.SIDEBAR_ITEM)}
          >
            <Icon className="size-4 shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
