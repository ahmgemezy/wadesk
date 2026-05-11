"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-hooks";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemberProfileMutations } from "@/hooks/use-member-profile";
import type { Id } from "@/convex/_generated/dataModel";
import { useT } from "@/lib/i18n/context";
import { DT } from "@/lib/design-tokens";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Shield, Loader2, TriangleAlert, Mail, Upload, Link as LinkIcon } from "lucide-react";

type Profile = {
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string | null;
  imageUrl: string | null;
  role: string;
  joinedAt: number | null;
  phone: string | null;
  jobTitle: string | null;
  bio: string | null;
  channels: { id: string; name: string }[];
  departments: { id: string; name: string }[];
};

function roleLabel(role: string, t: (en: string, ar: string) => string) {
  switch (role) {
    case "org:admin":
      return t("Admin", "مدير");
    case "org:supervisor":
      return t("Supervisor", "مشرف");
    case "org:agent":
      return t("Agent", "وكيل");
    default:
      return role;
  }
}

type ManageTabProps = {
  memberId: string;
  profile: Profile;
  onClose: () => void;
  onUpdated: () => void;
};

export function ManageTab({ memberId, profile, onClose, onUpdated }: ManageTabProps) {
  const t = useT();
  const { userId: currentUserId } = useAuth();
  const {
    updateRole,
    removeMember,
    updateChannels,
    updateDepartments,
    updateContact,
    updateDisplayName,
    updateAvatarFromStorage,
    updateAvatarFromUrl,
    removeAvatar,
    disableAccount,
    enableAccount,
  } = useMemberProfileMutations();
  const generateUploadUrl = useMutation(api.profiles.generateAvatarUploadUrl);

  const availableChannels = useQuery(api.memberQueries.getAvailableChannels, {});
  const availableDepartments = useQuery(api.memberQueries.getAvailableDepartments, {});

  const [selectedRole, setSelectedRole] = useState<string>("");
  const [changingRole, setChangingRole] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    email: profile.email || "",
    phone: profile.phone || "",
    jobTitle: profile.jobTitle || "",
  });

  // Display name editing
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [firstNameInput, setFirstNameInput] = useState(profile.firstName || "");
  const [lastNameInput, setLastNameInput] = useState(profile.lastName || "");
  const [savingDisplayName, setSavingDisplayName] = useState(false);

  // Avatar upload state (admin editing member avatar)
  const [avatarTab, setAvatarTab] = useState<"upload" | "url">("upload");
  const [avatarUrlInput, setAvatarUrlInput] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingAvatarUrl, setSavingAvatarUrl] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(
    new Set(profile.channels.map((ch) => ch.id))
  );
  const [updatingChannels, setUpdatingChannels] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(
    new Set(profile.departments.map((dept) => dept.id))
  );
  const [updatingDepartments, setUpdatingDepartments] = useState(false);

  const filteredDepartments = (availableDepartments ?? []).filter(
    (dept) => dept.channelId && selectedChannels.has(dept.channelId)
  );

  useEffect(() => {
    // Skip while availableDepartments is still loading — an empty array here
    // would incorrectly wipe pre-selected departments from the profile.
    if (availableDepartments === undefined) return;
    const validDeptIds = new Set<string>(filteredDepartments.map((d) => d.id));
    setSelectedDepartments((prev) => {
      const next = new Set([...prev].filter((id) => validDeptIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChannels, availableDepartments]);

  const isSelf = currentUserId === memberId;

  const handleChangeRole = async () => {
    if (!selectedRole || selectedRole === profile.role) return;

    setChangingRole(true);
    try {
      await updateRole({
        memberId,
        newRole: selectedRole as "org:admin" | "org:supervisor" | "org:agent",
      });
      toast.success(t("Role updated successfully", "تم تحديث الدور بنجاح"));
      setSelectedRole("");
      onUpdated();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("Failed to update role", "فشل تحديث الدور")
      );
    } finally {
      setChangingRole(false);
    }
  };

  const handleUpdateDisplayName = async () => {
    if (!firstNameInput.trim()) return;
    setSavingDisplayName(true);
    try {
      await updateDisplayName({
        memberId,
        firstName: firstNameInput.trim(),
        lastName: lastNameInput.trim() || undefined,
      });
      toast.success(t("Name updated", "تم تحديث الاسم"));
      setEditingDisplayName(false);
      onUpdated();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("Failed to update name", "فشل تحديث الاسم")
      );
    } finally {
      setSavingDisplayName(false);
    }
  };

  const handleUpdateContact = async () => {
    setSavingContact(true);
    try {
      await updateContact({
        memberId,
        phone: contactForm.phone,
        jobTitle: contactForm.jobTitle,
      });
      toast.success(t("Contact info updated", "تم تحديث بيانات التواصل"));
      setEditingContact(false);
      onUpdated();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("Failed to update contact info", "فشل تحديث بيانات التواصل")
      );
    } finally {
      setSavingContact(false);
    }
  };

  const stageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(t("Only image files are allowed", "يُسمح بملفات الصور فقط"));
      return;
    }
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(file);
    setPendingPreviewUrl(URL.createObjectURL(file));
  };

  const confirmUpload = async () => {
    if (!pendingFile) return;
    setUploadingAvatar(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": pendingFile.type },
        body: pendingFile,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = await res.json();
      await updateAvatarFromStorage({ memberId, storageId: storageId as Id<"_storage"> });
      setPendingFile(null);
      setPendingPreviewUrl(null);
      toast.success(t("Avatar updated", "تم تحديث الصورة الشخصية"));
      onUpdated();
    } catch {
      toast.error(t("Upload failed", "فشل الرفع"));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const cancelUpload = () => {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(null);
    setPendingPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSaveAvatarUrl = async () => {
    const url = avatarUrlInput.trim();
    if (!url) return;
    setSavingAvatarUrl(true);
    try {
      await updateAvatarFromUrl({ memberId, url });
      toast.success(t("Avatar updated", "تم تحديث الصورة الشخصية"));
      onUpdated();
    } catch {
      toast.error(t("Failed to save", "فشل الحفظ"));
    } finally {
      setSavingAvatarUrl(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setSavingAvatarUrl(true);
    try {
      await removeAvatar({ memberId });
      setAvatarUrlInput("");
      toast.success(t("Avatar removed", "تمت إزالة الصورة الشخصية"));
      onUpdated();
    } catch {
      toast.error(t("Failed to remove", "فشل الحذف"));
    } finally {
      setSavingAvatarUrl(false);
    }
  };

  const handleUpdateChannels = async () => {
    setUpdatingChannels(true);
    try {
      await updateChannels({ memberId, channelIds: Array.from(selectedChannels) });
      toast.success(t("Channels updated", "تم تحديث القنوات"));
      onUpdated();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("Failed to update channels", "فشل تحديث القنوات")
      );
    } finally {
      setUpdatingChannels(false);
    }
  };

  const handleUpdateDepartments = async () => {
    setUpdatingDepartments(true);
    try {
      await updateDepartments({ memberId, departmentIds: Array.from(selectedDepartments) });
      toast.success(t("Departments updated", "تم تحديث الأقسام"));
      onUpdated();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("Failed to update departments", "فشل تحديث الأقسام")
      );
    } finally {
      setUpdatingDepartments(false);
    }
  };

  const handleRemoveMember = async () => {
    const confirmed = window.confirm(
      t(
        "Are you sure you want to remove this member? This action cannot be undone.",
        "هل أنت متأكد من إزالة هذا العضو؟ لا يمكن التراجع عن هذا الإجراء.",
      )
    );
    if (!confirmed) return;

    setRemoving(true);
    try {
      await removeMember({ memberId });
      toast.success(t("Member removed successfully", "تمت إزالة العضو بنجاح"));
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("Failed to remove member", "فشل إزالة العضو")
      );
    } finally {
      setRemoving(false);
    }
  };

  const handleDisableAccount = async () => {
    const confirmed = window.confirm(
      t(
        "Are you sure you want to disable this account? They will not be able to access the system.",
        "هل أنت متأكد من تعطيل هذا الحساب؟ لن يتمكن من الوصول إلى النظام.",
      )
    );
    if (!confirmed) return;

    try {
      await disableAccount({ memberId });
      toast.success(t("Account disabled", "تم تعطيل الحساب"));
      onUpdated();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("Failed to disable account", "فشل تعطيل الحساب")
      );
    }
  };

  const handleEnableAccount = async () => {
    try {
      await enableAccount({ memberId });
      toast.success(t("Account enabled", "تم تفعيل الحساب"));
      onUpdated();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("Failed to enable account", "فشل تفعيل الحساب")
      );
    }
  };

  if (isSelf) {
    return (
      <div className={`rounded-2xl border border-dashed border-black/[0.10] dark:border-white/[0.10] py-12 text-center ${DT.MUTED}`}>
        {t("You cannot manage your own account.", "لا يمكنك إدارة حسابك الخاص.")}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-h-[600px] overflow-y-auto">
      {/* Contact Information */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Mail className="size-4 text-[#6E6E73] dark:text-white/50" />
          <h3 className={DT.H3}>
            {t("Contact Information", "معلومات التواصل")}
          </h3>
        </div>

        {/* Display Name (synced to Clerk) */}
        <div className={`${DT.LIST_ITEM} mb-3 cursor-default`}>
          {!editingDisplayName ? (
            <div className="flex items-center justify-between w-full">
              <div className={DT.BODY}>
                <span className={DT.MUTED}>{t("Name", "الاسم")}: </span>
                <span>{profile.name || "—"}</span>
              </div>
              <button type="button" className={DT.BTN_SM} onClick={() => {
                setFirstNameInput(profile.firstName || "");
                setLastNameInput(profile.lastName || "");
                setEditingDisplayName(true);
              }}>
                {t("Edit", "تعديل")}
              </button>
            </div>
          ) : (
            <div className="space-y-3 w-full">
              <div>
                <label className={DT.LBL}>
                  {t("First Name", "الاسم الأول")}
                </label>
                <input
                  value={firstNameInput}
                  onChange={(e) => setFirstNameInput(e.target.value)}
                  placeholder={t("First name", "الاسم الأول")}
                  className={DT.INPUT}
                />
              </div>
              <div>
                <label className={DT.LBL}>
                  {t("Last Name", "اسم العائلة")}
                </label>
                <input
                  value={lastNameInput}
                  onChange={(e) => setLastNameInput(e.target.value)}
                  placeholder={t("Last name", "اسم العائلة")}
                  className={DT.INPUT}
                />
              </div>
              <div className="flex gap-2">
                <button type="button" className={DT.BTN_PRIMARY} disabled={savingDisplayName || !firstNameInput.trim()} onClick={handleUpdateDisplayName}>
                  {savingDisplayName && <Loader2 className="size-3.5 animate-spin" />}
                  {t("Save", "حفظ")}
                </button>
                <button type="button" className={DT.BTN_OUTLINE} onClick={() => setEditingDisplayName(false)}>
                  {t("Cancel", "إلغاء")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Other contact fields */}
        <div className={`${DT.CARD_SM} p-4`}>
          {!editingContact ? (
            <div className="space-y-3">
              <div className={DT.BODY}>
                <span className={DT.MUTED}>{t("Email", "البريد الإلكتروني")}: </span>
                <span dir="ltr">{profile.email || "—"}</span>
              </div>
              <div className={DT.BODY}>
                <span className={DT.MUTED}>{t("Phone", "الهاتف")}: </span>
                <span dir="ltr">{profile.phone || "—"}</span>
              </div>
              <div className={DT.BODY}>
                <span className={DT.MUTED}>{t("Job Title", "المسمى الوظيفي")}: </span>
                <span>{profile.jobTitle || "—"}</span>
              </div>
              <button
                type="button"
                className={DT.BTN_SM}
                onClick={() => setEditingContact(true)}
              >
                {t("Edit", "تعديل")}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className={DT.LBL}>
                  {t("Phone", "الهاتف")}
                </label>
                <input
                  value={contactForm.phone}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, phone: e.target.value })
                  }
                  type="tel"
                  dir="ltr"
                  placeholder="+20 100 000 0000"
                  className={DT.INPUT}
                />
              </div>
              <div>
                <label className={DT.LBL}>
                  {t("Job Title", "المسمى الوظيفي")}
                </label>
                <input
                  value={contactForm.jobTitle}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, jobTitle: e.target.value })
                  }
                  placeholder={t("Job Title", "المسمى الوظيفي")}
                  className={DT.INPUT}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={DT.BTN_PRIMARY}
                  disabled={savingContact}
                  onClick={handleUpdateContact}
                >
                  {savingContact && <Loader2 className="size-3.5 animate-spin" />}
                  {t("Save", "حفظ")}
                </button>
                <button
                  type="button"
                  className={DT.BTN_OUTLINE}
                  onClick={() => setEditingContact(false)}
                >
                  {t("Cancel", "إلغاء")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="mb-3 mt-4 flex items-center gap-2">
          <Upload className="size-4 text-[#6E6E73] dark:text-white/50" />
          <h3 className={DT.H3}>
            {t("Profile Photo", "الصورة الشخصية")}
          </h3>
        </div>
        <div className={`${DT.CARD_SM} p-4`}>
          <Tabs value={avatarTab} onValueChange={(v) => setAvatarTab(v as "upload" | "url")}>
            <TabsList className="w-full mb-3">
              <TabsTrigger value="upload" className="flex-1 gap-1.5">
                <Upload className="size-3.5" />
                {t("Upload File", "رفع ملف")}
              </TabsTrigger>
              <TabsTrigger value="url" className="flex-1 gap-1.5">
                <LinkIcon className="size-3.5" />
                {t("Image URL", "رابط صورة")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-3 pt-1">
              {pendingPreviewUrl ? (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <img
                      src={pendingPreviewUrl}
                      alt="preview"
                      className={`size-20 rounded-full object-cover border-2 ${DT.BORDER_BLUE}`}
                    />
                  </div>
                  <p className={`text-center ${DT.MICRO} truncate`}>
                    {pendingFile?.name}
                  </p>
                  <div className="flex gap-2">
                    <button type="button" className={`${DT.BTN_PRIMARY} flex-1`} onClick={confirmUpload} disabled={uploadingAvatar}>
                      {uploadingAvatar && <Loader2 className="size-3.5 animate-spin" />}
                      {t("Save Photo", "حفظ الصورة")}
                    </button>
                    <button type="button" className={`${DT.BTN_OUTLINE} flex-1`} onClick={cancelUpload} disabled={uploadingAvatar}>
                      {t("Cancel", "إلغاء")}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
                    dragOver ? `${DT.BORDER_BLUE} ${DT.BG_BLUE_LIGHT}` : `border-black/[0.12] dark:border-white/[0.10] ${DT.BORDER_BLUE_HOVER}`
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
                  <Upload className="size-5 mx-auto mb-1.5 text-[#6E6E73] dark:text-white/50" />
                  <p className={DT.MUTED}>
                    {t("Click or drag an image here", "انقر أو اسحب صورة هنا")}
                  </p>
                  <p className={`${DT.MICRO} mt-0.5`}>PNG، JPG، WEBP</p>
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

            <TabsContent value="url" className="space-y-3">
              <input
                dir="ltr"
                value={avatarUrlInput}
                onChange={(e) => setAvatarUrlInput(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className={DT.INPUT}
              />
              {avatarUrlInput && (
                <div className="flex justify-center">
                  <img
                    src={avatarUrlInput}
                    alt="preview"
                    className="size-16 rounded-full object-cover border border-black/[0.08] dark:border-white/[0.08]"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
              <button
                type="button"
                className={`${DT.BTN_PRIMARY} w-full`}
                onClick={handleSaveAvatarUrl}
                disabled={savingAvatarUrl || !avatarUrlInput.trim()}
              >
                {savingAvatarUrl && <Loader2 className="size-3.5 animate-spin" />}
                {t("Save Photo", "حفظ الصورة")}
              </button>
            </TabsContent>
          </Tabs>

          {profile.imageUrl && (
            <button
              type="button"
              className={`${DT.BTN_SM} mt-2 w-full !text-[#FF3B30] dark:!text-[#FF453A] !border-transparent`}
              onClick={handleRemoveAvatar}
              disabled={savingAvatarUrl}
            >
              {t("Remove current photo", "إزالة الصورة الحالية")}
            </button>
          )}
        </div>
      </section>

      {/* Channel Assignments */}
      <section>
        <h3 className={`mb-3 ${DT.H3}`}>
          {t("Channel Assignments", "تعيينات القنوات")}
        </h3>
        <div className={`${DT.CARD_SM} p-4 space-y-1 max-h-40 overflow-y-auto`}>
          {availableChannels && availableChannels.length > 0 ? (
            availableChannels.map((channel) => (
              <div key={channel.id} className={`${DT.LIST_ITEM} cursor-default`}>
                <Checkbox
                  checked={selectedChannels.has(channel.id)}
                  onCheckedChange={(checked) => {
                    const newSet = new Set(selectedChannels);
                    if (checked) {
                      newSet.add(channel.id);
                    } else {
                      newSet.delete(channel.id);
                    }
                    setSelectedChannels(newSet);
                  }}
                />
                <label className={`${DT.BODY} cursor-pointer flex-1`}>{channel.name}</label>
              </div>
            ))
          ) : (
            <p className={DT.MUTED}>{t("No channels available", "لا توجد قنوات متاحة")}</p>
          )}
        </div>
        {availableChannels && availableChannels.length > 0 && (
          <button
            type="button"
            className={`${DT.BTN_SM} mt-3`}
            disabled={updatingChannels}
            onClick={handleUpdateChannels}
          >
            {updatingChannels && <Loader2 className="size-3.5 animate-spin" />}
            {t("Update Channels", "تحديث القنوات")}
          </button>
        )}
      </section>

      {/* Department Assignments */}
      <section>
        <h3 className={`mb-3 ${DT.H3}`}>
          {t("Department Assignments", "تعيينات الأقسام")}
        </h3>
        <div className={`${DT.CARD_SM} p-4 space-y-1 max-h-40 overflow-y-auto`}>
          {selectedChannels.size === 0 ? (
            <p className={DT.MUTED}>
              {t("Select a channel above to see its departments.", "اختر قناة أعلاه لعرض أقسامها.")}
            </p>
          ) : filteredDepartments.length > 0 ? (
            filteredDepartments.map((dept) => (
              <div key={dept.id} className={`${DT.LIST_ITEM} cursor-default`}>
                <Checkbox
                  checked={selectedDepartments.has(dept.id)}
                  onCheckedChange={(checked) => {
                    const newSet = new Set(selectedDepartments);
                    if (checked) {
                      newSet.add(dept.id);
                    } else {
                      newSet.delete(dept.id);
                    }
                    setSelectedDepartments(newSet);
                  }}
                />
                <label className={`${DT.BODY} cursor-pointer flex-1`}>{dept.name}</label>
              </div>
            ))
          ) : (
            <p className={DT.MUTED}>
              {t("No departments in the selected channels.", "لا توجد أقسام في القنوات المختارة.")}
            </p>
          )}
        </div>
        {filteredDepartments.length > 0 && (
          <button
            type="button"
            className={`${DT.BTN_SM} mt-3`}
            disabled={updatingDepartments}
            onClick={handleUpdateDepartments}
          >
            {updatingDepartments && <Loader2 className="size-3.5 animate-spin" />}
            {t("Update Departments", "تحديث الأقسام")}
          </button>
        )}
      </section>

      {/* Role Management */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Shield className="size-4 text-[#6E6E73] dark:text-white/50" />
          <h3 className={DT.H3}>
            {t("Role Management", "إدارة الأدوار")}
          </h3>
        </div>

        <div className={`space-y-3 ${DT.CARD_SM} p-4`}>
          <div className="flex items-center justify-between">
            <span className={DT.MUTED}>
              {t("Current Role", "الدور الحالي")}
            </span>
            <span className={DT.BADGE_NEUTRAL}>{roleLabel(profile.role, t)}</span>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className={DT.LBL}>
                {t("New Role", "الدور الجديد")}
              </label>
              <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t("Select a role...", "اختر دورًا...")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="org:admin">{t("Admin", "مدير")}</SelectItem>
                  <SelectItem value="org:supervisor">
                    {t("Supervisor", "مشرف")}
                  </SelectItem>
                  <SelectItem value="org:agent">{t("Agent", "وكيل")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <button
              type="button"
              className={DT.BTN_SM}
              disabled={!selectedRole || selectedRole === profile.role || changingRole}
              onClick={handleChangeRole}
            >
              {changingRole && <Loader2 className="size-3.5 animate-spin" />}
              {t("Change Role", "تغيير الدور")}
            </button>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className={`rounded-2xl border border-[#FF3B30]/30 dark:border-[#FF453A]/30 p-4`}>
        <div className="mb-3 flex items-center gap-2">
          <TriangleAlert className={`size-4 ${DT.TEXT_RED}`} />
          <h3 className={`${DT.H3} ${DT.TEXT_RED}`}>
            {t("Danger Zone", "منطقة الخطر")}
          </h3>
        </div>

        <p className={`mb-4 ${DT.MICRO}`}>
          {t(
            "Removing a member will revoke their access to the organization.",
            "إزالة عضو ستؤدي إلى سحب صلاحيته من المنظمة."
          )}
        </p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            className={DT.BTN_DESTRUCTIVE}
            disabled={removing}
            onClick={handleRemoveMember}
          >
            {removing && <Loader2 className="size-3.5 animate-spin" />}
            {t("Remove Member", "إزالة العضو")}
          </button>
          <button
            type="button"
            className={DT.BTN_OUTLINE}
            onClick={handleDisableAccount}
          >
            {t("Disable Account", "تعطيل الحساب")}
          </button>
          <button
            type="button"
            className={DT.BTN_OUTLINE}
            onClick={handleEnableAccount}
          >
            {t("Enable Account", "تفعيل الحساب")}
          </button>
        </div>
      </section>
    </div>
  );
}
