"use client";

import { useState, useRef, useCallback } from "react";
import { useAuth, useUser } from "@/lib/auth-hooks";
import { authClient } from "@/lib/auth-client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useT } from "@/lib/i18n/context";
import { DT } from "@/lib/design-tokens";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Upload, Link as LinkIcon, User } from "lucide-react";
import type { ResolvedUser } from "@/lib/shell/types";

interface MyProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: ResolvedUser;
}

export function MyProfileModal({ open, onOpenChange, currentUser }: MyProfileModalProps) {
  const t = useT();
  const { isLoaded, orgId } = useAuth();
  const { user } = useUser();
  const profile = useQuery(api.profiles.getMyProfile, isLoaded && orgId ? {} : "skip");
  const updateMyProfile = useMutation(api.profiles.updateMyProfile);
  const generateAvatarUploadUrl = useMutation(api.profiles.generateAvatarUploadUrl);
  const getStorageUrl = useMutation(api.profiles.getStorageUrl);

  // Details form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [bio, setBio] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

  // Avatar state
  const [avatarTab, setAvatarTab] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form when modal opens or profile loads
  const initForm = useCallback(() => {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
    setPhone(profile?.phone ?? "");
    setJobTitle(profile?.jobTitle ?? "");
    setBio(profile?.bio ?? "");
    setUrlInput(user?.imageUrl ?? "");
  }, [user, profile]);

  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) {
    setLastOpen(true);
    initForm();
  }
  if (!open && lastOpen) {
    setLastOpen(false);
  }

  const effectiveAvatar = user?.imageUrl ?? currentUser.imageUrl;
  const effectiveName = user?.fullName ?? user?.firstName ?? currentUser.name;
  const initials = effectiveName
    ? effectiveName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  async function handleSaveDetails() {
    setSavingDetails(true);
    try {
      const nameParts = [firstName.trim(), lastName.trim()].filter(Boolean);
      if (nameParts.length > 0) {
        await authClient.updateUser({ name: nameParts.join(" ") });
      }
      await updateMyProfile({
        phone: phone.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      toast.success(t("Profile updated", "تم تحديث الملف الشخصي"));
    } catch {
      toast.error(t("Failed to save", "فشل الحفظ"));
    } finally {
      setSavingDetails(false);
    }
  }

  function stageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error(t("Only image files are allowed", "يُسمح بملفات الصور فقط"));
      return;
    }
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(file);
    setPendingPreviewUrl(URL.createObjectURL(file));
  }

  async function confirmUpload() {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const uploadUrl = await generateAvatarUploadUrl();
      const res = await fetch(uploadUrl, { method: "POST", body: pendingFile, headers: { "Content-Type": pendingFile.type } });
      const { storageId } = await res.json() as { storageId: string };
      const imageUrl = await getStorageUrl({ storageId: storageId as Parameters<typeof getStorageUrl>[0]["storageId"] });
      if (imageUrl) {
        await authClient.updateUser({ image: imageUrl });
      }
      setPendingFile(null);
      setPendingPreviewUrl(null);
      toast.success(t("Avatar updated", "تم تحديث الصورة الشخصية"));
    } catch {
      toast.error(t("Upload failed", "فشل الرفع"));
    } finally {
      setUploading(false);
    }
  }

  function cancelUpload() {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(null);
    setPendingPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSaveUrl() {
    const url = urlInput.trim();
    if (!url) return;
    setSavingAvatar(true);
    try {
      await authClient.updateUser({ image: url });
      toast.success(t("Avatar updated", "تم تحديث الصورة الشخصية"));
    } catch {
      toast.error(t("Failed to save", "فشل الحفظ"));
    } finally {
      setSavingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    setSavingAvatar(true);
    try {
      await authClient.updateUser({ image: null });
      setUrlInput("");
      toast.success(t("Avatar removed", "تمت إزالة الصورة الشخصية"));
    } catch {
      toast.error(t("Failed to remove", "فشل الحذف"));
    } finally {
      setSavingAvatar(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-md ${DT.DIALOG}`}>
        <DialogHeader>
          <DialogTitle>{t("My Profile", "ملفي الشخصي")}</DialogTitle>
        </DialogHeader>

        {/* Current avatar preview */}
        <div className={`flex items-center gap-3 pb-2 ${DT.DIVIDER}`}>
          <Avatar className="size-14">
            <AvatarImage src={effectiveAvatar} alt={effectiveName} />
            <AvatarFallback><User className="size-6" /></AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className={`${DT.BODY} font-medium truncate`}>{effectiveName}</span>
            <span className={`${DT.MICRO} truncate`}>{currentUser.email}</span>
          </div>
        </div>

        <Tabs defaultValue="details">
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">
              {t("Details", "البيانات")}
            </TabsTrigger>
            <TabsTrigger value="avatar" className="flex-1">
              {t("Avatar", "الصورة الشخصية")}
            </TabsTrigger>
          </TabsList>

          {/* ── Details tab ── */}
          <TabsContent value="details" className="space-y-3 pt-3">
            <div className="space-y-1">
              <label className={DT.LBL}>
                {t("First Name", "الاسم الأول")}
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t("First name", "الاسم الأول")}
                className={DT.INPUT}
              />
            </div>
            <div className="space-y-1">
              <label className={DT.LBL}>
                {t("Last Name", "اسم العائلة")}
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t("Last name", "اسم العائلة")}
                className={DT.INPUT}
              />
            </div>
            <div className="space-y-1">
              <label className={DT.LBL}>
                {t("Phone", "رقم الهاتف")}
              </label>
              <input
                type="text"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+201000000000"
                className={DT.INPUT}
              />
            </div>
            <div className="space-y-1">
              <label className={DT.LBL}>
                {t("Job Title", "المسمى الوظيفي")}
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder={t("e.g. Sales Agent", "مثال: مندوب مبيعات")}
                className={DT.INPUT}
              />
            </div>
            <div className="space-y-1">
              <label className={DT.LBL}>
                {t("Bio", "نبذة")}
              </label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t("A short bio…", "نبذة مختصرة…")}
                className={DT.INPUT}
              />
            </div>
            <button
              className={DT.BTN_PRIMARY}
              onClick={handleSaveDetails}
              disabled={savingDetails}
            >
              {savingDetails && <Loader2 className="size-3.5 animate-spin" />}
              {t("Save Details", "حفظ البيانات")}
            </button>
          </TabsContent>

          {/* ── Avatar tab ── */}
          <TabsContent value="avatar" className="pt-3 space-y-3">
            <Tabs value={avatarTab} onValueChange={(v) => setAvatarTab(v as "upload" | "url")}>
              <TabsList className="w-full">
                <TabsTrigger value="upload" className="flex-1 gap-1.5">
                  <Upload className="size-3.5" />
                  {t("Upload File", "رفع ملف")}
                </TabsTrigger>
                <TabsTrigger value="url" className="flex-1 gap-1.5">
                  <LinkIcon className="size-3.5" />
                  {t("Image URL", "رابط صورة")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="pt-3 space-y-3">
                {pendingPreviewUrl ? (
                  <div className="space-y-3">
                    <div className="flex justify-center">
                      <img
                        src={pendingPreviewUrl}
                        alt="preview"
                        className={`size-24 rounded-full object-cover border-2 ${DT.BORDER_BLUE}`}
                      />
                    </div>
                    <p className={`text-center ${DT.MUTED}`}>
                      {pendingFile?.name}
                    </p>
                    <div className="flex gap-2">
                      <button className={`flex-1 ${DT.BTN_PRIMARY}`} onClick={confirmUpload} disabled={uploading}>
                        {uploading && <Loader2 className="size-3.5 animate-spin" />}
                        {t("Save Photo", "حفظ الصورة")}
                      </button>
                      <button className={`flex-1 ${DT.BTN_OUTLINE}`} onClick={cancelUpload} disabled={uploading}>
                        {t("Cancel", "إلغاء")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      dragOver ? `${DT.BORDER_BLUE} ${DT.BG_BLUE_LIGHT}` : `border-black/12 dark:border-white/12 ${DT.BORDER_BLUE_HOVER}`
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      const file = e.dataTransfer.files[0];
                      if (file) stageFile(file);
                    }}
                  >
                    <Upload className={`size-6 mx-auto mb-2 ${DT.MUTED}`} />
                    <p className={`text-sm ${DT.MUTED}`}>
                      {t("Click or drag an image here", "انقر أو اسحب صورة هنا")}
                    </p>
                    <p className={`text-xs ${DT.MUTED} mt-1`}>PNG، JPG، WEBP</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) stageFile(file);
                    e.target.value = "";
                  }}
                />
              </TabsContent>

              <TabsContent value="url" className="pt-3 space-y-3">
                <div className="space-y-1">
                  <label className={DT.LBL}>
                    {t("Paste an image URL", "الصق رابط الصورة")}
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className={DT.INPUT}
                  />
                </div>
                {urlInput && (
                  <div className="flex justify-center">
                    <img
                      src={urlInput}
                      alt="preview"
                      className="size-20 rounded-full object-cover border border-black/12 dark:border-white/12"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                )}
                <button
                  className={DT.BTN_PRIMARY}
                  onClick={handleSaveUrl}
                  disabled={savingAvatar || !urlInput.trim()}
                >
                  {savingAvatar && <Loader2 className="size-3.5 animate-spin" />}
                  {t("Save Avatar", "حفظ الصورة")}
                </button>
              </TabsContent>
            </Tabs>

            {user?.imageUrl && (
              <button
                className={`w-full px-5 py-2 text-sm font-normal ${DT.TEXT_RED} ${DT.BG_RED_HOVER} rounded-full transition-colors disabled:opacity-50`}
                onClick={handleRemoveAvatar}
                disabled={savingAvatar}
              >
                {t("Remove current avatar", "إزالة الصورة الحالية")}
              </button>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
