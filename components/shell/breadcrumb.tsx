"use client";

import { usePathname } from "next/navigation";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DT } from "@/lib/design-tokens";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

const SECTION_LABELS: Record<string, { ar: string; en: string }> = {
  settings:       { ar: "الإعدادات",      en: "Settings" },
  team:           { ar: "الفريق",          en: "Team" },
  channels:       { ar: "القنوات",        en: "Channels" },
  departments:    { ar: "الإدارات",        en: "Departments" },
  "quick-replies":{ ar: "الردود السريعة",  en: "Quick Replies" },
  billing:        { ar: "الفواتير",         en: "Billing" },
  inbox:          { ar: "الصندوق",          en: "Inbox" },
  contacts:       { ar: "جهات الاتصال",    en: "Contacts" },
  analytics:      { ar: "التحليلات",        en: "Analytics" },
};

interface BreadcrumbProps {
  locale: "ar" | "en";
}

export function Breadcrumb({ locale }: BreadcrumbProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  return (
    <nav
      className={`flex items-center gap-1.5 px-4 pt-3 ${DT.MUTED}`}
      aria-label="Breadcrumb"
    >
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const prevSegment = index > 0 ? segments[index - 1] : undefined;
        const href = "/" + segments.slice(0, index + 1).join("/");

        // Skip "departments" segment - it will be combined with the department name
        if (segment === "departments") {
          return null;
        }

        return (
          <span key={`${segment}-${index}`} className={`flex items-center gap-1.5 ${DT.MICRO}`}>
            {index > 0 && (
              <span className="text-white/40 dark:text-white/40" aria-hidden="true">
                {locale === "ar" ? "‹" : "›"}
              </span>
            )}
            {isLast ? (
              <span className={DT.BODY} aria-current="page">
                <DynamicSegment segment={segment} prevSegment={prevSegment} locale={locale} />
              </span>
            ) : (
              <Link
                href={href}
                className={`${DT.MUTED} hover:${DT.BODY} transition-colors`}
              >
                <DynamicSegment segment={segment} prevSegment={prevSegment} locale={locale} />
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function DynamicSegment({
  segment,
  prevSegment,
  locale,
}: {
  segment: string;
  prevSegment?: string;
  locale: "ar" | "en";
}) {
  const { isAuthenticated } = useConvexAuth();

  const isChannel = prevSegment === "channels";
  const channel = useQuery(
    api.channels.get,
    isAuthenticated && isChannel ? { channelId: segment as Id<"channels"> } : "skip"
  );

  const isContact = prevSegment === "contacts";
  const contactQuery = useQuery(
    api.contacts.getById,
    isAuthenticated && isContact ? { contactId: segment as Id<"contacts"> } : "skip"
  );

  const isDepartment = prevSegment === "departments";
  const department = useQuery(
    api.departments.get,
    isAuthenticated && isDepartment ? { departmentId: segment as Id<"departments"> } : "skip"
  );

  // Debug logging
  if (isChannel && typeof window !== "undefined") {
    console.log("Breadcrumb channel:", { segment, prevSegment, channel, displayName: channel?.displayName });
  }

  if (isChannel) {
    return <>{channel?.displayName ?? "…"}</>;
  }

  if (isContact) {
    const name =
      contactQuery?.contact?.customName ??
      contactQuery?.contact?.displayName ??
      contactQuery?.contact?.phone ??
      "…";
    return <>{name}</>;
  }

  if (isDepartment) {
    const departmentLabel = locale === "ar" ? "الإدارات" : "Departments";
    const departmentName = department?.name ?? "…";
    return <>{departmentLabel} - {departmentName}</>;
  }

  const label = SECTION_LABELS[segment];
  const displayText = label
    ? locale === "ar"
      ? label.ar
      : label.en
    : segment;

  return <>{displayText}</>;
}
