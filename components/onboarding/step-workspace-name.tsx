"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Loader2, LogOut } from "lucide-react";
import { useT } from "@/lib/i18n/context";

export function StepWorkspaceName() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useT();
  const router = useRouter();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workspace";
      const { data, error: err } = await authClient.organization.create({ name: trimmed, slug });
      if (err) {
        setError(err.message ?? t("Failed to create workspace", "فشل إنشاء مساحة العمل"));
        return;
      }
      if (data?.id) {
        await authClient.organization.setActive({ organizationId: data.id });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("Failed to create workspace", "فشل إنشاء مساحة العمل"));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setSigningOut(true);
    await authClient.signOut();
    router.push("/");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center space-y-1">
        <h2 className="text-[22px] font-semibold tracking-[-0.4px] text-[#1D1D1F]">
          {t("Name Your Workspace", "سمّي مساحة العمل")}
        </h2>
        <p className="text-[15px] text-[#6E6E73]">
          {t("Choose a name for your workspace", "اختر اسمًا لمساحة عملك")}
        </p>
      </div>

      <form onSubmit={handleCreate} className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Acme Corp"
          disabled={loading}
          className="w-full rounded-xl border border-black/12 bg-black/4 px-3.5 py-2.5 text-[15px] text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all placeholder:text-[#6E6E73] disabled:opacity-50"
        />
        {error && (
          <p className="text-[13px] text-[#FF3B30] bg-[#FF3B30]/10 rounded-lg px-3 py-2">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full rounded-full py-2.5 text-[15px] font-normal text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: "#0071E3" }}
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          {loading ? t("Creating…", "جارٍ الإنشاء…") : t("Create Workspace", "إنشاء مساحة العمل")}
        </button>
      </form>

      <button
        type="button"
        onClick={handleCancel}
        disabled={loading || signingOut}
        className="flex items-center justify-center gap-1.5 text-[13px] text-[#6E6E73] hover:text-[#1D1D1F] transition-colors disabled:opacity-40 mx-auto"
      >
        {signingOut ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
        {t("Sign out and go back", "تسجيل الخروج والعودة")}
      </button>
    </div>
  );
}
