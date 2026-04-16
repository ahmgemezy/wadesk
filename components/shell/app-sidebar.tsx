"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
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
  const { isAuthenticated } = useConvexAuth();
  const conversations = useQuery(
    api.inbox.listConversations,
    isAuthenticated ? { filter: "all" } : "skip",
  );
  const totalUnread = conversations?.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0) ?? 0;

  return (
    <Sidebar
      collapsible="icon"
      side={locale === "ar" ? "right" : "left"}
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <SidebarHeader className="p-3 flex flex-row items-center gap-2">
        <span className="text-base font-bold flex-1 tracking-tight text-foreground group-data-[collapsible=icon]:hidden">
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

                const isInbox = item.href === "/inbox";
                const unreadTooltip = isInbox && totalUnread > 0
                  ? locale === "ar"
                    ? `${label} · ${totalUnread} رسائل غير مقروءة`
                    : `${label} · ${totalUnread} unread messages`
                  : label;

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={unreadTooltip}
                      render={<Link href={item.href} />}
                    >
                      <Icon />
                      <span>{label}</span>
                      {isInbox && totalUnread > 0 && (
                        <span className="ms-auto min-w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1 leading-none group-data-[collapsible=icon]:hidden">
                          {totalUnread > 99 ? "99+" : totalUnread}
                        </span>
                      )}
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
