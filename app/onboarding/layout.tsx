import { getServerAuth, fetchAuthQuery } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

function WABDeskLogo() {
  return (
    <div dir="ltr" style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: "#0071E3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 4px 16px rgba(0,113,227,0.28)",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"
            fill="white"
          />
          <path
            d="M8 10h8M8 14h5"
            stroke="rgba(0,113,227,0.65)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
          fontSize: 20,
          fontWeight: 600,
          color: "#1D1D1F",
          letterSpacing: "-0.4px",
        }}
      >
        WABDesk
      </span>
    </div>
  );
}

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
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-10"
      dir={locale === "ar" ? "rtl" : "ltr"}
      style={{
        background:
          "radial-gradient(ellipse 120% 60% at 50% -5%, rgba(0,113,227,0.06) 0%, transparent 55%), #F5F5F7",
      }}
    >
      <WABDeskLogo />

      <div
        className="w-full max-w-lg"
        style={{
          background: "rgba(255,255,255,0.90)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 22,
          boxShadow: "0 2px 6px rgba(0,0,0,0.04), 0 10px 30px rgba(0,0,0,0.08)",
          padding: 32,
        }}
      >
        {children}
      </div>
    </div>
  );
}
