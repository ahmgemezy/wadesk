import {
  Inbox,
  Contact2,
  BarChart3,
  TrendingUp,
  Settings,
  Users,
  Radio,
  MessageSquareText,
  CreditCard,
  Zap,
  List,
  Megaphone,
} from "lucide-react";
import type { IconName } from "@/lib/shell/types";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<IconName, LucideIcon> = {
  Inbox,
  Contact2,
  BarChart3,
  TrendingUp,
  Settings,
  Users,
  Radio,
  MessageSquareText,
  CreditCard,
  Zap,
  List,
  Megaphone,
};

export function resolveIcon(name: IconName): LucideIcon {
  return ICON_MAP[name];
}
