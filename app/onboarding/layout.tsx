import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

function detectLocale(headersList: Headers): "ar" | "en" {
  const lang = headersList.get("accept-language") ?? "";
  if (lang.includes("ar")) return "ar";
  return "en";
}

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId, getToken } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  if (orgId) {
    const token = await getToken({ template: "convex" });
    if (token) {
      const state = await fetchQuery(api.onboarding.getState, {}, { token });
      if (state && state.completedSteps.includes("onboarding_complete")) {
        redirect("/inbox");
      }
    }
  }

  const headersList = await headers();
  const locale = detectLocale(headersList);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="w-full max-w-lg mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  );
}
