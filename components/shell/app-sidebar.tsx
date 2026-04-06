"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { UserMenu } from "./user-menu";
import { LocaleSwitcher } from "./locale-switcher";
import { resolveIcon } from "./resolve-icon";
import type { NavItem, ResolvedUser } from "@/lib/shell/types";

interface NavGroupItemProps {
  item: NavItem;
  pathname: string;
  locale: "ar" | "en";
}

function NavGroupItem({ item, pathname, locale }: NavGroupItemProps) {
  const [open, setOpen] = useState(() => pathname.startsWith(item.href));
  const Icon = resolveIcon(item.icon);
  const isActive = pathname.startsWith(item.href);
  const label = locale === "ar" ? item.labelAr : item.labelEn;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarMenuItem>
        <CollapsibleTrigger render={
          <SidebarMenuButton isActive={isActive} tooltip={label} />
        }>
          <Icon />
          <span>{label}</span>
          <ChevronDown className="ms-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-180 rtl:scale-x-[-1]" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children!.map((child) => {
              const ChildIcon = resolveIcon(child.icon);
              const childActive = pathname === child.href;
              const childLabel = locale === "ar" ? child.labelAr : child.labelEn;
              return (
                <SidebarMenuSubItem key={child.href}>
                  <SidebarMenuSubButton isActive={childActive} render={<Link href={child.href} />}>
                    <ChildIcon />
                    <span>{childLabel}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

interface AppSidebarProps {
  user: ResolvedUser;
  navItems: NavItem[];
  locale: "ar" | "en";
}

export function AppSidebar({ user, navItems, locale }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="icon"
      side={locale === "ar" ? "right" : "left"}
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <SidebarHeader className="p-3 flex flex-row items-center gap-2">
        <span className="text-sm font-semibold flex-1 group-data-[collapsible=icon]:hidden">
          WaDesk
        </span>
        <LocaleSwitcher locale={locale} />
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = resolveIcon(item.icon);
                const isActive =
                  pathname === item.href ||
                  (item.children && pathname.startsWith(item.href));
                const label = locale === "ar" ? item.labelAr : item.labelEn;

                if (item.children) {
                  return (
                    <NavGroupItem
                      key={item.href}
                      item={item}
                      pathname={pathname}
                      locale={locale}
                    />
                  );
                }

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={label}
                      render={<Link href={item.href} />}
                    >
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <UserMenu user={user} locale={locale} />
      </SidebarFooter>
    </Sidebar>
  );
}
