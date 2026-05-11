"use client";

import { useState, use, useEffect } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DepartmentMembers } from "@/components/settings/department-members";
import { DepartmentAssignmentMode } from "@/components/settings/department-assignment-mode";
import { DT } from "@/lib/design-tokens";
import { Pencil, Check, X, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";

export default function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ channelId: string; departmentId: string }>;
}) {
  const t = useT();
  const { isAuthenticated } = useConvexAuth();
  const { channelId, departmentId: rawDeptId } = use(params);
  const departmentId = rawDeptId as Id<"departments">;
  const dept = useQuery(
    api.departments.get,
    isAuthenticated ? { departmentId } : "skip"
  );
  const updateDept = useMutation(api.departments.update);
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [descValue, setDescValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (dept) {
      setNameValue(dept.name);
      setDescValue(dept.description ?? "");
    }
  }, [dept]);

  const saveName = async () => {
    if (!nameValue.trim()) return;
    setSaving(true);
    try {
      await updateDept({
        departmentId,
        name: nameValue.trim(),
        description: descValue.trim() || undefined,
      });
      setEditing(false);
    } catch {
      toast.error(t("Update failed", "فشل التحديث"));
    } finally {
      setSaving(false);
    }
  };

  if (dept === undefined) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <div className="h-8 rounded bg-muted animate-pulse w-48" />
        <div className="h-32 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  if (!dept) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center text-muted-foreground">
        {t("Department not found", "الإدارة غير موجودة")}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <button className={`${DT.BTN_PRIMARY} gap-1`}
        onClick={() => router.push(`/settings/channels/${channelId}`)}
      >
        <ArrowLeft className="size-4" />
        {t("Back to Departments", "العودة للإدارات")}
      </button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {editing ? (
            <div className="flex items-center gap-2">
              <input className={`${DT.INPUT} max-w-xs`}
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                disabled={saving}
              />
              <button className={DT.BTN_PRIMARY} onClick={saveName} disabled={saving || !nameValue.trim()}>
                <Check className="size-4" />
              </button>
              <button className={DT.BTN_PRIMARY}
                onClick={() => {
                  setEditing(false);
                  setNameValue(dept.name);
                  setDescValue(dept.description ?? "");
                }}
                disabled={saving}
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>{dept.name}</span>
              <button className={DT.BTN_PRIMARY} onClick={() => setEditing(true)}>
                <Pencil className="size-3" />
              </button>
            </div>
          )}
        </h1>
      </div>

      {editing && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">{t("Description", "الوصف")}</h3>
          <input className={`${DT.INPUT}`}
            value={descValue}
            onChange={(e) => setDescValue(e.target.value)}
            disabled={saving}
            placeholder={t("Optional description...", "وصف اختياري...")}
          />
        </div>
      )}

      {!editing && dept.description && (
        <p className="text-sm text-muted-foreground">{dept.description}</p>
      )}

      <div className="border-t pt-6">
        <DepartmentAssignmentMode
          departmentId={departmentId}
          currentMode={dept.assignmentMode ?? "first_reply"}
        />
      </div>

      <div className="border-t pt-6">
        <DepartmentMembers departmentId={departmentId} />
      </div>
    </div>
  );
}
