export type ResolvedRole = "admin" | "supervisor" | "agent";

export type IconName =
  | "Inbox"
  | "Contact2"
  | "BarChart3"
  | "Settings"
  | "Users"
  | "Radio"
  | "MessageSquareText"
  | "CreditCard";

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
