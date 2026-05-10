"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/ui/sidebar";
import { resolveIcon } from "@/components/shell/resolve-icon";
import { cn } from "@/lib/utils";
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
      className="flex items-center gap-1 overflow-x-auto border-b bg-background px-4 py-2 scrollbar-none"
    >
      {activeItems.map((item) => {
        const Icon = resolveIcon(item.icon);
        const label = locale === "ar" ? item.labelAr : item.labelEn;
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
