import { cookies } from "next/headers";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const cookieStore = await cookies();
  const locale: "ar" | "en" = cookieStore.get("locale")?.value === "en" ? "en" : "ar";

  return <OnboardingWizard locale={locale} />;
}
