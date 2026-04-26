"use client";

import { useState } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Star, Archive, Users, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/context";

interface Props {
  channelId: Id<"channels">;
}

export function DepartmentList({ channelId }: Props) {
  const t = useT();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const departments = useQuery(
    api.departments.listForChannel,
    isAuthenticated ? { channelId } : "skip"
  );
  const createDept = useMutation(api.departments.create);
  const archiveDept = useMutation(api.departments.archive);
  const setDefault = useMutation(api.departments.setDefault);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  if (departments === undefined) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const isDefault = departments.length === 0;
      await createDept({
        channelId,
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        isDefault,
      });
      setNewName("");
      setNewDesc("");
      setCreateOpen(false);
      toast.success(t("Department created", "تم إنشاء الإدارة"));
    } catch {
      toast.error(t("Failed to create department", "فشل إنشاء الإدارة"));
    } finally {
      setCreating(false);
    }
  };

  const handleArchive = async (deptId: Id<"departments">, name: string) => {
    if (!confirm(t(`Archive "${name}"?`, `أرشفة "${name}"؟`))) return;
    try {
      await archiveDept({ departmentId: deptId });
      toast.success(t("Department archived", "تم أرشفة الإدارة"));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("CANNOT_ARCHIVE_DEFAULT")) {
        toast.error(t("Cannot archive the default department", "لا يمكن أرشفة الإدارة الافتراضية"));
      } else {
        toast.error(t("Failed to archive", "فشل الأرشفة"));
      }
    }
  };

  const handleSetDefault = async (deptId: Id<"departments">) => {
    try {
      await setDefault({ departmentId: deptId });
      toast.success(t("Default department updated", "تم تحديث الإدارة الافتراضية"));
    } catch {
      toast.error(t("Failed to update default", "فشل تحديث الإدارة الافتراضية"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          {t("Departments", "الإدارات")}
        </h3>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm" variant="outline" />}>
            <Plus className="size-4 me-1" />
            {t("Add Department", "إضافة إدارة")}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("Create Department", "إنشاء إدارة")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Input
                placeholder={t("Department name", "اسم الإدارة")}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Input
                placeholder={t("Description (optional)", "الوصف (اختياري)")}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
              <Button onClick={handleCreate} disabled={creating || !newName.trim()} className="w-full">
                {creating ? t("Creating...", "جاري الإنشاء...") : t("Create", "إنشاء")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {departments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          {t("No departments yet. Create one to organize your team.", "لا توجد إدارات بعد. أنشئ واحدة لتنظيم فريقك.")}
        </p>
      ) : (
        <div className="space-y-2">
          {departments.map((dept) => (
            <div
              key={dept._id}
              className="flex items-center gap-3 rounded-lg border px-3 py-2.5 group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{dept.name}</span>
                  {dept.isDefault && (
                    <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 shrink-0">
                      <Star className="size-3" />
                      {t("Default", "افتراضية")}
                    </Badge>
                  )}
                </div>
                {dept.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{dept.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {dept.assignmentMode === "first_reply" && t("First reply wins", "أول رد يأخذ المحادثة")}
                  {dept.assignmentMode === "manual" && t("Manual assignment", "توزيع يدوي")}
                  {dept.assignmentMode === "round_robin" && t("Round robin", "توزيع دوري")}
                  {!dept.assignmentMode && t("First reply wins", "أول رد يأخذ المحادثة")}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {!dept.isDefault && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleSetDefault(dept._id)}
                    title={t("Set as default", "تعيين كافتراضية")}
                  >
                    <Star className="size-3.5" />
                  </Button>
                )}
                {!dept.isDefault && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    onClick={() => handleArchive(dept._id, dept.name)}
                    title={t("Archive", "أرشفة")}
                  >
                    <Archive className="size-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    router.push(`/settings/channels/${channelId}/departments/${dept._id}`)
                  }
                  title={t("Manage members", "إدارة الأعضاء")}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
