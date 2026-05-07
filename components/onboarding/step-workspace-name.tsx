"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n/context";

export function StepWorkspaceName() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
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
        // OnboardingWizard watches for orgId+state===null and calls ensureCreated
        // reactively, so no need to poll here.
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "فشل إنشاء مساحة العمل");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">{t("Name Your Workspace", "سمّي مساحة العمل")}</h2>
        <p className="text-muted-foreground mt-1">{t("Choose a name for your workspace", "اختر اسمًا لمساحة عملك")}</p>
      </div>

      <form onSubmit={handleCreate} className="w-full space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Acme Corp"
          disabled={loading}
          className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground"
        />
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full rounded-full bg-primary text-primary-foreground py-2.5 text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          {loading ? t("Creating…", "جارٍ الإنشاء…") : t("Create Workspace", "إنشاء مساحة العمل")}
        </button>
      </form>

      <button
        type="button"
        onClick={async () => {
          await authClient.signOut();
          router.push("/");
        }}
        disabled={loading}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        {t("Cancel", "إلغاء")}
      </button>
    </div>
  );
}
