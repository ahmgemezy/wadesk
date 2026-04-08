import { PlanSelector } from "@/components/settings/plan-selector";

export const dynamic = "force-dynamic";

export default function BillingPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">
        الفوترة / Billing
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        اختر خطة اشتراكك / Choose your subscription plan
      </p>
      <PlanSelector />
    </div>
  );
}
