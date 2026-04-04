"use client";

import Link from "next/link";
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
import { resolveIcon } from "./resolve-icon";
import type { NavItem, ResolvedUser } from "@/lib/shell/types";

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
      <SidebarHeader className="p-3">
        <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">
          WaDesk
        </span>
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
                    <Collapsible
                      key={item.href}
                      defaultOpen={pathname.startsWith(item.href)}
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger render={
                          <SidebarMenuButton
                            isActive={isActive}
                            tooltip={label}
                          />
                        }>
                          <Icon />
                          <span>{label}</span>
                          <ChevronDown className="ms-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-180 rtl:scale-x-[-1]" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.children.map((child) => {
                              const ChildIcon = resolveIcon(child.icon);
                              const childActive = pathname === child.href;
                              const childLabel =
                                locale === "ar" ? child.labelAr : child.labelEn;

                              return (
                                <SidebarMenuSubItem key={child.href}>
                                  <SidebarMenuSubButton
                                    isActive={childActive}
                                    render={
                                      <Link href={child.href} />
                                    }
                                  >
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
