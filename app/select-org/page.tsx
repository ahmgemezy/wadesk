"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/context";

interface Org {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
}

export default function SelectOrgPage() {
  const router = useRouter();
  const t = useT();
  const { data: orgs, isPending } = authClient.useListOrganizations() as {
    data: Org[] | null;
    isPending: boolean;
  };
  const [selecting, setSelecting] = useState<string | null>(null);

  const handleSelect = async (organizationId: string) => {
    setSelecting(organizationId);
    await authClient.organization.setActive({ organizationId });
    // Full page reload instead of client-side navigation: ConvexBetterAuthProvider
    // only refreshes its JWT when session.id changes, but setActive mutates the
    // same session (updating activeOrganizationId). A hard reload forces a fresh
    // token fetch from the server, which now reads the correct activeOrganizationId.
    window.location.href = "/inbox";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold">{t("Select Workspace", "اختر مساحة العمل")}</h1>
          <p className="text-sm text-muted-foreground">{t("Select a workspace to continue", "اختر مساحة عمل للمتابعة")}</p>
        </div>

        {isPending ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !orgs || orgs.length === 0 ? (
          <div className="text-center space-y-4 py-4">
            <p className="text-sm text-muted-foreground">{t("No workspaces found", "لا توجد مساحات عمل")}</p>
            <Button onClick={() => router.push("/onboarding")} className="w-full">
              {t("Create Workspace", "إنشاء مساحة عمل")}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSelect(org.id)}
                disabled={!!selecting}
                className="w-full flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-start hover:bg-accent transition-colors disabled:opacity-60"
              >
                <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {org.logo ? (
                    <img src={org.logo} alt={org.name} className="size-9 rounded-lg object-cover" />
                  ) : (
                    <Building2 className="size-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{org.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{org.slug}</p>
                </div>
                {selecting === org.id && (
                  <Loader2 className="size-4 animate-spin text-muted-foreground shrink-0" />
                )}
              </button>
            ))}

            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                onClick={() => router.push("/onboarding")}
                className="w-full text-sm"
              >
                {t("+ Create New Workspace", "+ إنشاء مساحة عمل جديدة")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
