import type { NavItem, ResolvedRole } from "./types";
import { ROLE_ORDER } from "./role-utils";

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/inbox",
    labelAr: "الصندوق",
    labelEn: "Inbox",
    icon: "Inbox",
    minRole: "agent",
  },
  {
    href: "/contacts",
    labelAr: "جهات الاتصال",
    labelEn: "Contacts",
    icon: "Contact2",
    minRole: "agent",
  },
  {
    href: "/lists",
    labelAr: "القوائم",
    labelEn: "Lists",
    icon: "List",
    minRole: "supervisor",
  },
  {
    href: "/broadcasts",
    labelAr: "الحملات",
    labelEn: "Broadcasts",
    icon: "Megaphone",
    minRole: "supervisor",
  },
  {
    href: "/my-stats",
    labelAr: "إحصائياتي",
    labelEn: "My Stats",
    icon: "TrendingUp",
    minRole: "agent",
  },
  {
    href: "/analytics",
    labelAr: "التحليلات",
    labelEn: "Analytics",
    icon: "BarChart3",
    minRole: "supervisor",
  },
  {
    href: "/automations",
    labelAr: "قواعد تلقائية",
    labelEn: "Automations",
    icon: "Zap",
    minRole: "supervisor",
  },
  {
    href: "/settings",
    labelAr: "الإعدادات",
    labelEn: "Settings",
    icon: "Settings",
    minRole: "supervisor",
    children: [
      {
        href: "/settings/general",
        labelAr: "عام",
        labelEn: "General",
        icon: "SlidersHorizontal",
        minRole: "admin",
      },
      {
        href: "/settings/team",
        labelAr: "الفريق",
        labelEn: "Team",
        icon: "Users",
        minRole: "supervisor",
      },
      {
        href: "/settings/channels",
        labelAr: "القنوات",
        labelEn: "Channels",
        icon: "Radio",
        minRole: "admin",
      },
      {
        href: "/settings/quick-replies",
        labelAr: "الردود السريعة",
        labelEn: "Quick Replies",
        icon: "MessageSquareText",
        minRole: "supervisor",
      },
      {
        href: "/settings/templates",
        labelAr: "قوالب الرسائل",
        labelEn: "Templates",
        icon: "FileText",
        minRole: "supervisor",
      },
      {
        href: "/settings/labels",
        labelAr: "التصنيفات",
        labelEn: "Labels",
        icon: "Tag",
        minRole: "supervisor",
      },
      {
        href: "/settings/export",
        labelAr: "البيانات والخصوصية",
        labelEn: "Data & Privacy",
        icon: "Database",
        minRole: "supervisor",
      },
      {
        href: "/settings/billing",
        labelAr: "الفواتير",
        labelEn: "Billing",
        icon: "CreditCard",
        minRole: "admin",
      },
      {
        href: "/settings/csat",
        labelAr: "تقييم العملاء",
        labelEn: "CSAT",
        icon: "Star",
        minRole: "admin",
      },
    ],
  },
];

export function filterNavItems(role: ResolvedRole): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (ROLE_ORDER[role] < ROLE_ORDER[item.minRole]) return false;

    if (item.children) {
      const filteredChildren = item.children.filter(
        (child) => ROLE_ORDER[role] >= ROLE_ORDER[child.minRole],
      );
      if (filteredChildren.length === 0) return false;
      return { ...item, children: filteredChildren };
    }

    return true;
  }).map((item) => {
    if (item.children) {
      return {
        ...item,
        children: item.children.filter(
          (child) => ROLE_ORDER[role] >= ROLE_ORDER[child.minRole],
        ),
      };
    }
    return item;
  });
}
