import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WABDesk - Sign Up",
};

const appearance = {
  variables: {
    colorPrimary: "#0071E3",
    colorDanger: "#FF3B30",
    colorNeutral: "#6E6E73",
    colorBackground: "#FFFFFF",
    colorText: "#1D1D1F",
    colorTextSecondary: "#6E6E73",
    colorInputBackground: "rgba(0, 0, 0, 0.04)",
    colorInputText: "#1D1D1F",
    borderRadius: "12px",
    fontSize: "15px",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
  },
  elements: {
    card: {
      background: "rgba(255, 255, 255, 0.88)",
      backdropFilter: "blur(24px) saturate(180%)",
      WebkitBackdropFilter: "blur(24px) saturate(180%)",
      border: "1px solid rgba(0, 0, 0, 0.08)",
      borderRadius: "22px",
      boxShadow:
        "0 2px 6px rgba(0,0,0,0.04), 0 10px 30px rgba(0,0,0,0.08), 0 30px 60px rgba(0,0,0,0.06)",
    },
    rootBox: "w-full",
    headerTitle: {
      color: "#1D1D1F",
      fontSize: "22px",
      fontWeight: "600",
      letterSpacing: "-0.4px",
    },
    headerSubtitle: {
      color: "#6E6E73",
      fontSize: "15px",
    },
    formFieldLabel: {
      color: "#1D1D1F",
      fontSize: "13px",
      fontWeight: "500",
    },
    dividerText: { color: "#6E6E73" },
    dividerLine: { backgroundColor: "rgba(0, 0, 0, 0.10)" },
    footerActionText: { color: "#6E6E73" },
    identityPreviewText: { color: "#1D1D1F" },
    badge: {
      backgroundColor: "rgba(0, 0, 0, 0.05)",
      color: "#6E6E73",
      border: "1px solid rgba(0, 0, 0, 0.08)",
    },
    badgeText: { color: "#6E6E73" },
    formButtonPrimary:
      "bg-[#0071E3] hover:bg-[#0077ED] active:bg-[#006CD1] transition-colors font-normal rounded-full text-white",
    footerActionLink: "text-[#0071E3] hover:text-[#0077ED] font-normal",
    socialButtonsBlockButton__google:
      "!bg-black/[0.04] hover:!bg-black/[0.09] active:!bg-black/[0.12] !border !border-black/[0.12] !text-[#1D1D1F] !rounded-xl transition-colors duration-150",
    socialButtonsBlockButtonText__google: { color: "#1D1D1F" },
    socialButtonsBlockButton__facebook:
      "!bg-[#1877F2] hover:!bg-[#166FE5] active:!bg-[#1558D0] !text-white !border-0 !rounded-xl transition-colors duration-150",
    socialButtonsBlockButtonText__facebook: { color: "#ffffff" },
  },
} as const;

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center w-full">
      <SignUp fallbackRedirectUrl="/onboarding" signInUrl="/sign-in" appearance={appearance} />
    </div>
  );
}
