import { headers } from "next/headers";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const headersList = await headers();
  const lang = headersList.get("accept-language") ?? "";
  const locale: "ar" | "en" = lang.includes("ar") ? "ar" : "en";

  return <OnboardingWizard locale={locale} />;
}
