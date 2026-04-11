"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useOrganization } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Currency = "EGP" | "SAR" | "AED" | "USD";

interface Props {
  open: boolean;
  onClose: () => void;
  contactId: Id<"contacts">;
  channelId: Id<"channels">;
  locale: "ar" | "en";
}

export function FollowUpModal({ open, onClose, contactId, channelId, locale }: Props) {
  const isRtl = locale === "ar";
  const { memberships } = useOrganization({ memberships: { infinite: true } });
  const createFollowUp = useMutation(api.followUps.create);

  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [revenue, setRevenue] = useState("");
  const [currency, setCurrency] = useState<Currency>("EGP");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("__self__");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setScheduledDate("");
    setScheduledTime("09:00");
    setRevenue("");
    setCurrency("EGP");
    setNote("");
    setMessage("");
    setAssignedTo("__self__");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduledDate || !message.trim()) return;

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).getTime();

    setSubmitting(true);
    try {
      await createFollowUp({
        contactId,
        channelId,
        scheduledAt,
        note: note.trim() || undefined,
        whatsappMessage: message.trim(),
        expectedRevenue: revenue ? Number(revenue) : undefined,
        currency: revenue ? currency : undefined,
        assignedTo: assignedTo === "__self__" ? undefined : assignedTo,
      });
      toast.success(isRtl ? "تمت جدولة المتابعة" : "Follow-up scheduled");
      reset();
      onClose();
    } catch {
      toast.error(isRtl ? "فشل جدولة المتابعة" : "Failed to schedule follow-up");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent dir={isRtl ? "rtl" : "ltr"} className="sm:max-w-136">
        <DialogHeader className="pe-8">
          <DialogTitle>{isRtl ? "جدولة متابعة" : "Schedule Follow-up"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label htmlFor="fu-date" className="text-sm font-medium">{isRtl ? "التاريخ" : "Date"}</label>
              <Input
                id="fu-date"
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="fu-time" className="text-sm font-medium">{isRtl ? "الوقت" : "Time"}</label>
              <Input
                id="fu-time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>

          {/* Revenue + Currency */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label htmlFor="fu-revenue" className="text-sm font-medium">{isRtl ? "الإيراد المتوقع" : "Expected Revenue"}</label>
              <Input
                id="fu-revenue"
                type="number"
                min="0"
                placeholder="0"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{isRtl ? "العملة" : "Currency"}</label>
              <Select value={currency} onValueChange={(v) => { if (v) setCurrency(v as Currency); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EGP">EGP</SelectItem>
                  <SelectItem value="SAR">SAR</SelectItem>
                  <SelectItem value="AED">AED</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Internal Note */}
          <div className="space-y-1">
            <label htmlFor="fu-note" className="text-sm font-medium">{isRtl ? "ملاحظة داخلية (اختياري)" : "Internal Note (optional)"}</label>
            <Textarea
              id="fu-note"
              rows={2}
              placeholder={isRtl ? "مرئي للوكلاء فقط" : "Visible to agents only"}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* WhatsApp Message */}
          <div className="space-y-1">
            <label htmlFor="fu-message" className="text-sm font-medium">{isRtl ? "رسالة واتساب *" : "WhatsApp Message *"}</label>
            <Textarea
              id="fu-message"
              rows={3}
              required
              placeholder={isRtl ? "الرسالة التي ستُرسل للعميل" : "Message sent to customer"}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {/* Assign To */}
          <div className="space-y-1">
            <label className="text-sm font-medium">{isRtl ? "التعيين إلى" : "Assign to"}</label>
            <Select value={assignedTo} onValueChange={(v) => setAssignedTo(v ?? "__self__")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__self__">{isRtl ? "أنا" : "Me"}</SelectItem>
                {memberships?.data?.map((m) => {
                  const ud = m.publicUserData;
                  if (!ud) return null;
                  return (
                    <SelectItem key={ud.userId} value={ud.userId ?? ""}>
                      {ud.firstName} {ud.lastName}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="submit" disabled={submitting || !scheduledDate || !message.trim()}>
              {submitting
                ? (isRtl ? "جاري الحفظ..." : "Saving...")
                : (isRtl ? "جدولة" : "Schedule")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
