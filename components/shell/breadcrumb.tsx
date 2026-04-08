"use client";

import { usePathname } from "next/navigation";

const SECTION_LABELS: Record<string, { ar: string; en: string }> = {
  settings: { ar: "الإعدادات", en: "Settings" },
  team: { ar: "الفريق", en: "Team" },
  channels: { ar: "الإدارات", en: "Departments" },
  "quick-replies": { ar: "الردود السريعة", en: "Quick Replies" },
  billing: { ar: "الفواتير", en: "Billing" },
  inbox: { ar: "الصندوق", en: "Inbox" },
  contacts: { ar: "جهات الاتصال", en: "Contacts" },
  analytics: { ar: "التحليلات", en: "Analytics" },
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
      className="flex items-center gap-1.5 text-sm text-muted-foreground px-4 pt-3"
      aria-label="Breadcrumb"
    >
      {segments.map((segment, index) => {
        const label = SECTION_LABELS[segment];
        const displayText = label
          ? locale === "ar"
            ? label.ar
            : label.en
          : segment;
        const isLast = index === segments.length - 1;

        return (
          <span key={`${segment}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && (
              <span className="text-muted-foreground/50" aria-hidden="true">
                {locale === "ar" ? "‹" : "›"}
              </span>
            )}
            <span
              className={isLast ? "text-foreground font-medium" : "text-muted-foreground"}
              aria-current={isLast ? "page" : undefined}
            >
              {displayText}
            </span>
          </span>
        );
      })}
    </nav>
  );
}
