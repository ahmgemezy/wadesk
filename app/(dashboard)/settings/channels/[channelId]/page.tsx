"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AssignmentModeSelect } from "@/components/settings/assignment-mode-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ChannelSettingsPage({
  params,
}: {
  params: { channelId: string };
}) {
  const channelId = params.channelId as Id<"channels">;
  const channel = useQuery(api.channels.get, { channelId });
  const updateName = useMutation(api.channels.updateName);
  const removeChannel = useMutation(api.channels.remove);
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const startEdit = () => {
    if (!channel) return;
    setNameValue(channel.displayName);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setNameValue("");
  };

  const saveName = async () => {
    if (!nameValue.trim()) return;
    setSaving(true);
    try {
      await updateName({ channelId, displayName: nameValue.trim() });
      setEditing(false);
    } catch {
      toast.error("فشل التحديث / Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!channel) return;
    if (!confirm(`حذف "${channel.displayName}"؟ / Delete "${channel.displayName}"?`)) return;
    try {
      await removeChannel({ channelId });
      router.push("/settings/channels");
      toast.success("تم الحذف / Deleted");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("HAS_CONVERSATIONS")) {
        toast.error("لا يمكن الحذف - توجد محادثات / Cannot delete — has conversations");
      } else {
        toast.error(msg);
      }
    }
  };

  if (channel === undefined) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <div className="h-8 rounded bg-muted animate-pulse w-48" />
        <div className="h-32 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center text-muted-foreground">
        الإدارة غير موجودة / Department not found
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          إعدادات الإدارة / Department Settings
        </h1>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
        >
          <Trash2 className="size-4 me-1" />
          حذف / Delete
        </Button>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">الاسم / Name</h3>
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              disabled={saving}
              className="max-w-sm"
            />
            <Button size="icon-sm" onClick={saveName} disabled={saving || !nameValue.trim()}>
              <Check className="size-4" />
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={cancelEdit} disabled={saving}>
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{channel.displayName}</span>
            <Button size="icon-sm" variant="ghost" onClick={startEdit}>
              <Pencil className="size-3" />
            </Button>
          </div>
        )}
      </div>

      <AssignmentModeSelect
        channelId={channelId}
        currentMode={channel.assignmentMode}
      />
    </div>
  );
}
