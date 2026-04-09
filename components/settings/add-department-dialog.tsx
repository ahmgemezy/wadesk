"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useT } from "@/lib/i18n/context";

interface AddDepartmentDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddDepartmentDialog({ open, onClose }: AddDepartmentDialogProps) {
  const [name, setName] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const t = useT();
  const createDepartment = useMutation(api.channels.create);

  const handleClose = () => {
    setName("");
    setPhoneNumberId("");
    setWabaId("");
    setError(null);
    onClose();
  };

  const handleCreate = async () => {
    if (!name.trim() || !phoneNumberId.trim() || !wabaId.trim()) return;
    setError(null);
    setSaving(true);
    try {
      await createDepartment({
        displayName: name.trim(),
        phoneNumberId: phoneNumberId.trim(),
        wabaId: wabaId.trim(),
      });
      handleClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("DUPLICATE_PHONE_NUMBER")) {
        setError(t("Phone number already in use", "رقم الهاتف مستخدم بالفعل"));
      } else if (msg.includes("FORBIDDEN")) {
        setError(t("Forbidden", "غير مصرح"));
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Add Department", "إضافة إدارة")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder={t("Department name", "اسم الإدارة")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Phone Number ID"
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
            dir="ltr"
          />
          <Input
            placeholder="WABA ID"
            value={wabaId}
            onChange={(e) => setWabaId(e.target.value)}
            dir="ltr"
          />
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || !phoneNumberId.trim() || !wabaId.trim() || saving}
            className="w-full"
          >
            <Plus className="size-4 me-1" />
            {saving ? t("Adding...", "جارٍ الإضافة...") : t("Add", "إضافة")}
          </Button>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md p-2">
              {error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
