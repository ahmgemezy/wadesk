"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useConvexAuth } from "convex/react";
import { useAuth } from "@/lib/auth-hooks";
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
import { ChevronDown, Building2, ChevronsUpDown } from "lucide-react";
import { UserMenu } from "./user-menu";
import { LocaleSwitcher } from "./locale-switcher";
import { resolveIcon } from "./resolve-icon";
import { ChannelSwitcher } from "./channel-switcher";
import { useSelectedChannel } from "@/lib/hooks/channel-context";
import type { NavItem, ResolvedUser } from "@/lib/shell/types";
import type { Id } from "@/convex/_generated/dataModel";

interface NavGroupItemProps {
  item: NavItem;
  pathname: string;
  locale: "ar" | "en";
}

function NavGroupItem({ item, pathname, locale }: NavGroupItemProps) {
  const [open, setOpen] = useState(() => pathname.startsWith(item.href));
  const router = useRouter();
  const Icon = resolveIcon(item.icon);
  const isActive = pathname.startsWith(item.href);
  const label = locale === "ar" ? item.labelAr : item.labelEn;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarMenuItem>
        <CollapsibleTrigger render={
          <SidebarMenuButton isActive={isActive} tooltip={label} onClick={() => router.push(item.href)} />
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
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { isLoaded, orgId } = useAuth();
  const { channelId: selectedChannelId } = useSelectedChannel();
  const conversations = useQuery(
    api.inbox.listConversations,
    !isLoading && isAuthenticated && isLoaded && !!orgId
      ? { filter: "all", ...(selectedChannelId ? { channelId: selectedChannelId as Id<"channels"> } : {}) }
      : "skip",
  );
  const totalUnread = conversations?.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0) ?? 0;

  return (
    <Sidebar
      collapsible="icon"
      side={locale === "ar" ? "right" : "left"}
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <SidebarHeader className="p-3 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-base font-semibold tracking-tight text-foreground">WABDesk</span>
            <Link
              href="/select-org"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Building2 className="size-3 shrink-0" />
              <span className="truncate">{user.orgName}</span>
              <ChevronsUpDown className="size-3 shrink-0" />
            </Link>
          </div>
          <LocaleSwitcher locale={locale} />
        </div>
        <div className="group-data-[collapsible=icon]:hidden">
          <ChannelSwitcher locale={locale} />
        </div>
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
