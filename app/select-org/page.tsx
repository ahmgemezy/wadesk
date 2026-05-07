"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Building2, Loader2, ChevronRight, LogOut, Plus } from "lucide-react";
import { useT, useLocale } from "@/lib/i18n/context";

interface Org {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
}

function WABDeskLogo() {
  return (
    <div dir="ltr" className="flex items-center gap-2.5">
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
          <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="white" />
          <path d="M8 10h8M8 14h5" stroke="rgba(0,113,227,0.65)" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
      <span
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
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

export default function SelectOrgPage() {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const { data: orgs, isPending } = authClient.useListOrganizations() as {
    data: Org[] | null;
    isPending: boolean;
  };
  const [selecting, setSelecting] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const handleSelect = async (organizationId: string) => {
    setSelecting(organizationId);
    await authClient.organization.setActive({ organizationId });
    window.location.href = "/inbox?welcome=1";
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await authClient.signOut();
    router.push("/");
  };

  const hasOrgs = orgs && orgs.length > 0;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 gap-8"
      dir={locale === "ar" ? "rtl" : "ltr"}
      style={{
        background:
          "radial-gradient(ellipse 120% 60% at 50% -5%, rgba(0,113,227,0.06) 0%, transparent 55%), #F5F5F7",
      }}
    >
      <WABDeskLogo />

      <div
        className="w-full max-w-sm"
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
        {/* Header */}
        <div className="text-center mb-6 space-y-1">
          <h1 className="text-[22px] font-semibold tracking-[-0.4px] text-[#1D1D1F]">
            {hasOrgs
              ? t("Your Workspaces", "مساحات العمل")
              : t("Welcome to WABDesk", "أهلاً بك في WABDesk")}
          </h1>
          <p className="text-[15px] text-[#6E6E73]">
            {hasOrgs
              ? t("Select a workspace to continue", "اختر مساحة عمل للمتابعة")
              : t("Create your first workspace to get started", "أنشئ مساحة عملك الأولى للبدء")}
          </p>
        </div>

        {/* Body */}
        {isPending ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-[#6E6E73]" />
          </div>
        ) : !hasOrgs ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center gap-5 py-2">
            <div
              className="size-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(0,113,227,0.08)" }}
            >
              <Building2 className="size-8 text-[#0071E3]" />
            </div>
            <p className="text-[14px] text-[#6E6E73] text-center leading-relaxed px-2">
              {t(
                "You don't have any workspaces yet. Create one to start managing your WhatsApp conversations as a team.",
                "ليس لديك أي مساحات عمل بعد. أنشئ واحدة لبدء إدارة محادثات واتساب مع فريقك."
              )}
            </p>
            <button
              onClick={() => router.push("/onboarding")}
              className="w-full rounded-full py-2.5 text-[15px] font-normal text-white transition-colors flex items-center justify-center gap-2"
              style={{ background: "#0071E3" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#0077ED")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#0071E3")}
            >
              <Plus className="size-4" />
              {t("Create Workspace", "إنشاء مساحة عمل")}
            </button>
          </div>
        ) : (
          /* ── Org list ── */
          <div className="space-y-2">
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSelect(org.id)}
                disabled={!!selecting}
                className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-start transition-colors disabled:opacity-60"
                style={{ border: "1px solid rgba(0,0,0,0.08)", background: "rgba(0,0,0,0.02)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(0,113,227,0.05)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "rgba(0,0,0,0.02)")
                }
              >
                <div
                  className="size-9 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ background: "rgba(0,113,227,0.10)" }}
                >
                  {org.logo ? (
                    <img src={org.logo} alt={org.name} className="size-9 object-cover" />
                  ) : (
                    <Building2 className="size-4 text-[#0071E3]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-[#1D1D1F] truncate">{org.name}</p>
                  <p className="text-[12px] text-[#6E6E73] truncate">{org.slug}</p>
                </div>
                {selecting === org.id ? (
                  <Loader2 className="size-4 animate-spin text-[#6E6E73] shrink-0" />
                ) : (
                  <ChevronRight className="size-4 text-[#6E6E73] shrink-0 rtl:rotate-180" />
                )}
              </button>
            ))}

            <div className="pt-3 border-t border-black/8">
              <button
                onClick={() => router.push("/onboarding")}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-[14px] text-[#0071E3] hover:text-[#0077ED] transition-colors"
              >
                <Plus className="size-3.5" />
                {t("Create another workspace", "إنشاء مساحة عمل أخرى")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cancel / Sign out — always visible */}
      <button
        onClick={handleSignOut}
        disabled={signingOut || !!selecting}
        className="flex items-center gap-1.5 text-[13px] text-[#6E6E73] hover:text-[#1D1D1F] transition-colors disabled:opacity-40"
      >
        {signingOut ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <LogOut className="size-3.5" />
        )}
        {t("Sign out and go back", "تسجيل الخروج والعودة")}
      </button>
    </div>
  );
}
