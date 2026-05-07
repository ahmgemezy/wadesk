"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import { Loader2 } from "lucide-react";

export function StepWorkspaceName() {
  const ensureCreated = useMutation(api.onboarding.ensureCreated);

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setError(err.message ?? "فشل إنشاء مساحة العمل / Failed to create workspace");
        return;
      }
      if (data?.id) {
        await authClient.organization.setActive({ organizationId: data.id });
        // After setActive, the Convex JWT may still carry the old (org-less) token
        // for a short window while it refreshes. Retry until the JWT has the new org.
        for (let i = 0; i < 10; i++) {
          try {
            await ensureCreated({});
            break;
          } catch (err) {
            if (err instanceof ConvexError && err.data === "NO_ORG" && i < 9) {
              await new Promise(r => setTimeout(r, 200));
            } else {
              throw err;
            }
          }
        }
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
        <h2 className="text-xl font-semibold text-foreground">سمّي مساحة العمل</h2>
        <p className="text-muted-foreground mt-1">Choose a name for your workspace</p>
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
          {loading ? "جارٍ الإنشاء..." : "إنشاء مساحة العمل / Create Workspace"}
        </button>
      </form>
    </div>
  );
}
