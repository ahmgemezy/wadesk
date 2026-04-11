import { auth } from "@clerk/nextjs/server";
import { headers, cookies } from "next/headers";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const { orgRole } = await auth();
  const headersList = await headers();
  const cookieStore = await cookies();
  const lang = headersList.get("accept-language") ?? "";
  const cookieLocale = cookieStore.get("locale")?.value;
  const locale: "ar" | "en" =
    cookieLocale === "ar" || cookieLocale === "en"
      ? cookieLocale
      : lang.includes("ar")
        ? "ar"
        : "en";

  return <AnalyticsDashboard locale={locale} />;
}
