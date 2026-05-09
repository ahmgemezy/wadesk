import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { BrandPanel } from "@/components/auth/brand-panel";
import { LocaleProvider } from "@/lib/i18n/context";

// Form-side logo — Apple blue icon + dark wordmark
function FormLogo() {
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
          fontFamily: "inherit",
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

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const defaultLocale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";

  return (
    <div className="min-h-screen flex">
      {/*
        Form panel — first in DOM:
          LTR: renders on the LEFT  (logical start) ✓
          RTL: renders on the RIGHT (logical start) ✓
      */}
      <div
        className="flex-1 flex flex-col items-center justify-center gap-8 p-8 min-h-screen"
        style={{
          background:
            "radial-gradient(ellipse 120% 60% at 50% -5%, rgba(0,113,227,0.06) 0%, transparent 55%), #F5F5F7",
        }}
      >
        <FormLogo />
        <LocaleProvider locale={defaultLocale}>{children}</LocaleProvider>
      </div>

      {/* Brand panel — locale-aware client component */}
      <BrandPanel defaultLocale={defaultLocale} />
    </div>
  );
}
