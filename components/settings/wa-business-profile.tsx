"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useT } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2Icon,
  SaveIcon,
  UploadIcon,
  InfoIcon,
  LockIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WABusinessProfileProps {
  channelId: Id<"channels">;
}

const VERTICALS = [
  { value: "OTHER", en: "Other", ar: "أخرى" },
  { value: "AUTO", en: "Automotive", ar: "سيارات" },
  { value: "BEAUTY", en: "Beauty", ar: "جمال" },
  { value: "APPAREL", en: "Apparel", ar: "ملابس" },
  { value: "EDU", en: "Education", ar: "تعليم" },
  { value: "ENTERTAIN", en: "Entertainment", ar: "ترفيه" },
  { value: "EVENT_PLAN", en: "Event Planning", ar: "تخطيط فعاليات" },
  { value: "FINANCE", en: "Finance & Banking", ar: "مالية ومصرفية" },
  { value: "GROCERY", en: "Grocery", ar: "بقالة" },
  { value: "GOVT", en: "Government", ar: "حكومي" },
  { value: "HOTEL", en: "Hotel", ar: "فنادق" },
  { value: "HEALTH", en: "Health", ar: "صحة" },
  { value: "NONPROFIT", en: "Non-Profit", ar: "غير ربحي" },
  { value: "PROF_SERVICES", en: "Professional Services", ar: "خدمات مهنية" },
  { value: "RETAIL", en: "Retail", ar: "تجزئة" },
  { value: "TRAVEL", en: "Travel", ar: "سفر" },
  { value: "RESTAURANT", en: "Restaurant", ar: "مطاعم" },
];

export function WABusinessProfile({ channelId }: WABusinessProfileProps) {
  const t = useT();
  const router = useRouter();
  const plan = useQuery(api.lib.tenants.getCurrentPlan);
  const getProfile = useAction(api.waBusinessProfile.getProfile);
  const updateProfileAction = useAction(api.waBusinessProfile.updateProfile);
  const uploadPhotoAction = useAction(api.waBusinessProfile.uploadProfilePhoto);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);

  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [vertical, setVertical] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const [savingField, setSavingField] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProfile({ channelId })
      .then((data) => {
        if (cancelled) return;
        const d = data as Record<string, unknown>;
        setProfileData(d);
        setDescription((d.data as Record<string, string>)?.description ?? (d.description as string) ?? "");
        setAddress((d.data as Record<string, string>)?.address ?? (d.address as string) ?? "");
        setEmail((d.data as Record<string, string>)?.email ?? (d.email as string) ?? "");
        const websites = (d.data as Record<string, string[]>)?.websites ?? (d.websites as string[]) ?? [];
        setWebsite(websites[0] ?? "");
        setVertical((d.data as Record<string, string>)?.vertical ?? (d.vertical as string) ?? "");
        setPhotoUrl((d.data as Record<string, string>)?.profile_picture_url ?? (d.profile_picture_url as string) ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(
          t("Failed to load profile", "فشل تحميل الملف التجاري"),
          { description: err instanceof Error ? err.message : String(err) }
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [channelId]);

  const isPlanLocked = plan !== undefined && (plan === "free" || plan === "starter");

  const saveField = async (field: string, value: unknown) => {
    setSavingField(field);
    try {
      const payload: Record<string, unknown> = {};
      if (field === "description") payload.description = value;
      else if (field === "address") payload.address = value;
      else if (field === "email") payload.email = value;
      else if (field === "website") payload.websites = value ? [value] : [];
      else if (field === "vertical") payload.vertical = value;
      await updateProfileAction({ channelId, data: payload });
      toast.success(t("Saved", "تم الحفظ"));
    } catch (err) {
      toast.error(
        t("Update failed", "فشل التحديث"),
        { description: err instanceof Error ? err.message : String(err) }
      );
    } finally {
      setSavingField(null);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const postUrl = await generateUploadUrl();
      const res = await fetch(postUrl, { method: "POST", body: file });
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      await uploadPhotoAction({ channelId, storageId });
      setPhotoUrl(URL.createObjectURL(file));
      toast.success(t("Photo updated", "تم تحديث الصورة"));
    } catch (err) {
      toast.error(
        t("Photo upload failed", "فشل رفع الصورة"),
        { description: err instanceof Error ? err.message : String(err) }
      );
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          <span className="ms-2 text-sm text-muted-foreground">
            {t("Loading profile...", "جاري تحميل الملف التجاري...")}
          </span>
        </CardContent>
      </Card>
    );
  }

  if (isPlanLocked) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
          <LockIcon className="size-10 text-muted-foreground" />
          <p className="font-medium">
            {t("Business Profile editing requires Growth plan or above", "تحرير الملف التجاري يتطلب خطة النمو أو أعلى")}
          </p>
          <Button variant="outline" onClick={() => router.push("/settings/billing")}>
            {t("Upgrade Plan", "ترقية الخطة")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const displayName = (profileData as Record<string, string>)?.display_name ?? null;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {t("Profile Photo", "صورة الملف")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Profile"
                className="size-20 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <div className="size-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-2xl">
                ?
              </div>
            )}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={uploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingPhoto ? (
                  <Loader2Icon className="size-4 animate-spin me-1" />
                ) : (
                  <UploadIcon className="size-4 me-1" />
                )}
                {uploadingPhoto
                  ? t("Uploading...", "جاري الرفع...")
                  : t("Upload Photo", "رفع صورة")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {t("Business Information", "معلومات النشاط التجاري")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {displayName && (
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <label className="text-sm font-medium">
                    {t("Display Name", "اسم العرض")}
                  </label>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoIcon className="size-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      {t(
                        "Name changes require Meta review — contact support",
                        "تغيير الاسم يتطلب مراجعة من ميتا — تواصل مع الدعم"
                      )}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input value={displayName} readOnly className="bg-muted" disabled />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium">
                {t("Description", "الوصف")}
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={512}
                rows={3}
              />
              <div className="flex justify-start">
                <Button
                  size="sm"
                  disabled={savingField === "description"}
                  onClick={() => saveField("description", description)}
                >
                  {savingField === "description" ? (
                    <Loader2Icon className="size-4 animate-spin me-1" />
                  ) : (
                    <SaveIcon className="size-4 me-1" />
                  )}
                  {t("Save", "حفظ")}
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                {t("Address", "العنوان")}
              </label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                maxLength={256}
              />
              <div className="flex justify-start">
                <Button
                  size="sm"
                  disabled={savingField === "address"}
                  onClick={() => saveField("address", address)}
                >
                  {savingField === "address" ? (
                    <Loader2Icon className="size-4 animate-spin me-1" />
                  ) : (
                    <SaveIcon className="size-4 me-1" />
                  )}
                  {t("Save", "حفظ")}
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                {t("Email", "البريد الإلكتروني")}
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={128}
              />
              <div className="flex justify-start">
                <Button
                  size="sm"
                  disabled={savingField === "email"}
                  onClick={() => saveField("email", email)}
                >
                  {savingField === "email" ? (
                    <Loader2Icon className="size-4 animate-spin me-1" />
                  ) : (
                    <SaveIcon className="size-4 me-1" />
                  )}
                  {t("Save", "حفظ")}
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                {t("Website", "الموقع الإلكتروني")}
              </label>
              <Input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
              />
              <div className="flex justify-start">
                <Button
                  size="sm"
                  disabled={savingField === "website"}
                  onClick={() => saveField("website", website)}
                >
                  {savingField === "website" ? (
                    <Loader2Icon className="size-4 animate-spin me-1" />
                  ) : (
                    <SaveIcon className="size-4 me-1" />
                  )}
                  {t("Save", "حفظ")}
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                {t("Category", "الفئة")}
              </label>
              <select
                value={vertical}
                onChange={(e) => setVertical(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">
                  {t("Select category", "اختر الفئة")}
                </option>
                {VERTICALS.map((v) => (
                  <option key={v.value} value={v.value}>
                    {t(v.en, v.ar)}
                  </option>
                ))}
              </select>
              <div className="flex justify-start">
                <Button
                  size="sm"
                  disabled={savingField === "vertical"}
                  onClick={() => saveField("vertical", vertical)}
                >
                  {savingField === "vertical" ? (
                    <Loader2Icon className="size-4 animate-spin me-1" />
                  ) : (
                    <SaveIcon className="size-4 me-1" />
                  )}
                  {t("Save", "حفظ")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
