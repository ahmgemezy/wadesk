"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth-hooks";
import { Mail, ImageIcon, Loader2Icon } from "lucide-react";
import { ForwardTemplateCard } from "./forward-template-card";

function getInitials(name: string | null): string {
  if (!name) return "W";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function BrandLogoCard() {
  const t = useT();
  const { orgRole } = useAuth();
  const isAdmin = orgRole === "org:admin";

  const profile = useQuery(api.lib.tenants.getTenantProfile);
  const generateUploadUrl = useMutation(api.lib.tenants.generateLogoUploadUrl);
  const updateLogo = useMutation(api.lib.tenants.updateTenantLogo);

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("Only image files are allowed", "يُسمح بالصور فقط"));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("Image must be under 2 MB", "يجب أن تكون الصورة أقل من 2 ميجابايت"));
      return;
    }
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("upload_failed");
      const { storageId } = await res.json() as { storageId: Id<"_storage"> };
      await updateLogo({ storageId });
      toast.success(t("Logo updated", "تم تحديث الشعار"));
    } catch {
      toast.error(t("Failed to upload logo", "فشل رفع الشعار"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const logoUrl = profile?.logoUrl ?? null;
  const orgName = profile?.orgName ?? null;
  const initials = getInitials(orgName);

  return (
    <div className="border rounded-lg p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <ImageIcon className="size-4 text-primary" />
        </div>
        <div>
          <p className="font-medium text-sm">{t("Brand Logo", "شعار العلامة التجارية")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t(
              "Shown in the WhatsApp message preview for broadcast campaigns",
              "يظهر في معاينة رسائل واتساب لحملات البث"
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Logo preview */}
        <div className="size-16 rounded-xl border-2 border-border overflow-hidden flex items-center justify-center bg-muted shrink-0">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={orgName ?? "logo"}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-lg font-bold text-muted-foreground select-none">
              {initials}
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          {isAdmin ? (
            <>
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <ImageIcon className="size-3.5" />
                )}
                {uploading
                  ? t("Uploading…", "جاري الرفع…")
                  : logoUrl
                    ? t("Change Logo", "تغيير الشعار")
                    : t("Upload Logo", "رفع الشعار")}
              </button>
              <p className="text-xs text-muted-foreground">
                {t("PNG, JPG or SVG · max 2 MB", "PNG أو JPG أو SVG · الحد الأقصى 2 ميجابايت")}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={handleFile}
              />
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t("Only admins can change the logo", "يمكن للمديرين فقط تغيير الشعار")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

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

      <BrandLogoCard />

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

      <ForwardTemplateCard />
    </div>
  );
}
