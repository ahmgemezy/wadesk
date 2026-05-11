import { getServerAuth } from "@/lib/auth-server";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AgentMyStats } from "@/components/analytics/agent-my-stats";
import { DT } from "@/lib/design-tokens";

export const dynamic = "force-dynamic";

export default async function MyStatsPage() {
  const { userId, orgId } = await getServerAuth();
  if (!userId || !orgId) redirect("/sign-in");

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

  return (
    <div>
      <div className="p-4 md:p-6">
        <h1 className={`${DT.H1} mb-2`}>
          {locale === "ar" ? "إحصائياتي" : "My Stats"}
        </h1>
        <p className={`${DT.MUTED} mb-6`}>
          {locale === "ar"
            ? "أداؤك لهذا الشهر"
            : "Your performance this month"}
        </p>
      </div>
      <AgentMyStats locale={locale} />
    </div>
  );
}
