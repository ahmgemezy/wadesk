import { PlanSelector } from "@/components/settings/plan-selector";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const t = (en: string, ar: string) => locale === "en" ? en : ar;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">
        {t("Billing", "الفوترة")}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        {t("Choose your subscription plan", "اختر خطة اشتراكك")}
      </p>
      <PlanSelector />
    </div>
  );
}
