"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";
import { Mail } from "lucide-react";

export function GeneralSettings() {
  const t = useT();
  const currentLocale = useQuery(api.lib.tenants.getEmailLocalePublic);
  const updateLocale = useMutation(api.lib.tenants.updateEmailLocale);

  async function handleLocaleChange(locale: "ar" | "en") {
    try {
      await updateLocale({ locale });
      toast.success(t("Email language updated", "تم تحديث لغة البريد الإلكتروني"));
    } catch {
      toast.error(t("Failed to update", "فشل التحديث"));
    }
  }

  const isLoading = currentLocale === undefined;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("General Settings", "الإعدادات العامة")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("Workspace-level preferences", "تفضيلات مساحة العمل")}
        </p>
      </div>

      <div className="border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Mail className="size-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">{t("Notification Email Language", "لغة إيميلات الإشعارات")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(
                "All system emails (assignments, SLA alerts, billing) will be sent in this language",
                "جميع إيميلات النظام (التعيينات، تنبيهات SLA، الفواتير) ستُرسَل بهذه اللغة"
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            disabled={isLoading}
            onClick={() => handleLocaleChange("ar")}
            className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-sm transition-all
              ${currentLocale === "ar" || (!currentLocale && !isLoading)
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-muted-foreground/40 text-muted-foreground"
              }
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className="text-2xl">🇸🇦</span>
            <span className="font-medium">العربية</span>
            <span className="text-xs opacity-70">Arabic</span>
            {(currentLocale === "ar" || (!currentLocale && !isLoading)) && (
              <span className="absolute top-2 end-2 size-2 rounded-full bg-primary" />
            )}
          </button>

          <button
            disabled={isLoading}
            onClick={() => handleLocaleChange("en")}
            className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-sm transition-all
              ${currentLocale === "en"
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-muted-foreground/40 text-muted-foreground"
              }
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className="text-2xl">🇬🇧</span>
            <span className="font-medium">English</span>
            <span className="text-xs opacity-70">الإنجليزية</span>
            {currentLocale === "en" && (
              <span className="absolute top-2 end-2 size-2 rounded-full bg-primary" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
