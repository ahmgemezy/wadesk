import { getServerAuth, fetchAuthQuery } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId } = await getServerAuth();
  if (!userId) {
    redirect("/sign-in");
  }

  if (orgId) {
    const state = await fetchAuthQuery(api.onboarding.getState).catch(() => null);
    if (state && state.completedSteps.includes("onboarding_complete")) {
      redirect("/inbox");
    }
  }

  const cookieStore = await cookies();
  const locale: "ar" | "en" = cookieStore.get("locale")?.value === "en" ? "en" : "ar";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="w-full max-w-lg mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  );
}
