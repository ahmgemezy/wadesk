export type ResolvedRole = "admin" | "supervisor" | "agent";

export type IconName =
  | "Inbox"
  | "Contact2"
  | "BarChart3"
  | "TrendingUp"
  | "Settings"
  | "Users"
  | "Radio"
  | "MessageSquareText"
  | "CreditCard"
  | "Zap"
  | "List"
  | "Megaphone"
  | "Star"
  | "Tag"
  | "FileText"
  | "Database"
  | "SlidersHorizontal"
  | "Bell"
  | "Bot";

export interface NavItem {
  href: string;
  labelAr: string;
  labelEn: string;
  icon: IconName;
  minRole: ResolvedRole;
  children?: NavItem[];
}

export interface ResolvedUser {
  name: string;
  email: string;
  imageUrl: string;
  role: "org:admin" | "org:supervisor" | "org:agent";
  orgName: string;
}
