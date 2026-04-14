import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { resolveRole, hasMinRole } from "@/lib/shell/role-utils";
import { AnalyticsUpsellTeaser } from "@/components/analytics/analytics-upsell-teaser";
import type { Plan } from "@/convex/lib/planLimits";

export const dynamic = "force-dynamic";

export default async function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId, orgRole, getToken } = await auth();
  if (!userId || !orgId) redirect("/sign-in");

  const role = resolveRole(orgRole ?? undefined);

  if (role === "agent") {
    redirect("/my-stats");
  }

  if (!hasMinRole(role, "supervisor")) {
    redirect("/inbox");
  }

  let plan: Plan = "free";
  const token = await getToken({ template: "convex" });
  if (token) {
    plan = await fetchQuery(api.lib.tenants.getCurrentPlan, {}, { token });
  }

  if (plan === "free" || plan === "starter") {
    return (
      <div className="p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-6">التحليلات</h1>
        <AnalyticsUpsellTeaser locale="ar" />
      </div>
    );
  }

  return <>{children}</>;
}
