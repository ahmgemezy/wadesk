"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemberProfileMutations } from "@/hooks/use-member-profile";
import { useT } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Shield, Loader2, TriangleAlert, Mail, Phone, Briefcase } from "lucide-react";

type Profile = {
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
    disableAccount,
    enableAccount,
  } = useMemberProfileMutations();

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
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(
    new Set(profile.channels.map((ch) => ch.id))
  );
  const [updatingChannels, setUpdatingChannels] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(
    new Set(profile.departments.map((dept) => dept.id))
  );
  const [updatingDepartments, setUpdatingDepartments] = useState(false);

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

  const handleUpdateContact = async () => {
    setSavingContact(true);
    try {
      await updateContact({
        memberId,
        email: contactForm.email,
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
      <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
        {t("You cannot manage your own account.", "لا يمكنك إدارة حسابك الخاص.")}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-h-[600px] overflow-y-auto">
      {/* Contact Information */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Mail className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">
            {t("Contact Information", "معلومات التواصل")}
          </h3>
        </div>

        <div className="rounded-lg border p-4">
          {!editingContact ? (
            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">{t("Email", "البريد الإلكتروني")}: </span>
                <span dir="ltr">{profile.email || "—"}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">{t("Phone", "الهاتف")}: </span>
                <span dir="ltr">{profile.phone || "—"}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">{t("Job Title", "المسمى الوظيفي")}: </span>
                <span>{profile.jobTitle || "—"}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingContact(true)}
              >
                {t("Edit", "تعديل")}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">
                  {t("Email", "البريد الإلكتروني")}
                </label>
                <Input
                  value={contactForm.email}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, email: e.target.value })
                  }
                  type="email"
                  placeholder={t("email@example.com", "البريد@مثال.com")}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">
                  {t("Phone", "الهاتف")}
                </label>
                <Input
                  value={contactForm.phone}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, phone: e.target.value })
                  }
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">
                  {t("Job Title", "المسمى الوظيفي")}
                </label>
                <Input
                  value={contactForm.jobTitle}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, jobTitle: e.target.value })
                  }
                  placeholder={t("Job Title", "المسمى الوظيفي")}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={savingContact}
                  onClick={handleUpdateContact}
                >
                  {savingContact && <Loader2 className="size-3.5 animate-spin" />}
                  {t("Save", "حفظ")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingContact(false)}
                >
                  {t("Cancel", "إلغاء")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Channel Assignments */}
      <section>
        <h3 className="mb-3 text-sm font-semibold">
          {t("Channel Assignments", "تعيينات القنوات")}
        </h3>
        <div className="rounded-lg border p-4 space-y-3 max-h-40 overflow-y-auto">
          {availableChannels && availableChannels.length > 0 ? (
            availableChannels.map((channel) => (
              <div key={channel.id} className="flex items-center gap-2">
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
                <label className="text-sm cursor-pointer flex-1">{channel.name}</label>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{t("No channels available", "لا توجد قنوات متاحة")}</p>
          )}
        </div>
        {availableChannels && availableChannels.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={updatingChannels}
            onClick={handleUpdateChannels}
          >
            {updatingChannels && <Loader2 className="size-3.5 animate-spin" />}
            {t("Update Channels", "تحديث القنوات")}
          </Button>
        )}
      </section>

      {/* Department Assignments */}
      <section>
        <h3 className="mb-3 text-sm font-semibold">
          {t("Department Assignments", "تعيينات الأقسام")}
        </h3>
        <div className="rounded-lg border p-4 space-y-3 max-h-40 overflow-y-auto">
          {availableDepartments && availableDepartments.length > 0 ? (
            availableDepartments.map((dept) => (
              <div key={dept.id} className="flex items-center gap-2">
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
                <label className="text-sm cursor-pointer flex-1">{dept.name}</label>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{t("No departments available", "لا توجد أقسام متاحة")}</p>
          )}
        </div>
        {availableDepartments && availableDepartments.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={updatingDepartments}
            onClick={handleUpdateDepartments}
          >
            {updatingDepartments && <Loader2 className="size-3.5 animate-spin" />}
            {t("Update Departments", "تحديث الأقسام")}
          </Button>
        )}
      </section>

      {/* Role Management */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Shield className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">
            {t("Role Management", "إدارة الأدوار")}
          </h3>
        </div>

        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t("Current Role", "الدور الحالي")}
            </span>
            <Badge variant="secondary">{roleLabel(profile.role, t)}</Badge>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs text-muted-foreground">
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
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedRole || selectedRole === profile.role || changingRole}
              onClick={handleChangeRole}
            >
              {changingRole && <Loader2 className="size-3.5 animate-spin" />}
              {t("Change Role", "تغيير الدور")}
            </Button>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="rounded-lg border border-destructive/30 p-4">
        <div className="mb-3 flex items-center gap-2">
          <TriangleAlert className="size-4 text-destructive" />
          <h3 className="text-sm font-semibold text-destructive">
            {t("Danger Zone", "منطقة الخطر")}
          </h3>
        </div>

        <p className="mb-4 text-xs text-muted-foreground">
          {t(
            "Removing a member will revoke their access to the organization.",
            "إزالة عضو ستؤدي إلى سحب صلاحيته من المنظمة."
          )}
        </p>

        <div className="flex flex-col gap-2">
          <Button
            variant="destructive"
            size="sm"
            disabled={removing}
            onClick={handleRemoveMember}
          >
            {removing && <Loader2 className="size-3.5 animate-spin" />}
            {t("Remove Member", "إزالة العضو")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisableAccount}
          >
            {t("Disable Account", "تعطيل الحساب")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEnableAccount}
          >
            {t("Enable Account", "تفعيل الحساب")}
          </Button>
        </div>
      </section>
    </div>
  );
}
