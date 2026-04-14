"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";
import type { DayKey, BusinessHoursSchedule, DaySchedule } from "@/lib/automationHelpers";
import { Clock } from "lucide-react";

const DAYS: { key: DayKey; ar: string }[] = [
  { key: "sat", ar: "السبت" },
  { key: "sun", ar: "الأحد" },
  { key: "mon", ar: "الاثنين" },
  { key: "tue", ar: "الثلاثاء" },
  { key: "wed", ar: "الأربعاء" },
  { key: "thu", ar: "الخميس" },
  { key: "fri", ar: "الجمعة" },
];

const MENA_TIMEZONES = [
  { value: "Asia/Riyadh", label: "الرياض (AST)" },
  { value: "Asia/Dubai", label: "دبي (GST)" },
  { value: "Asia/Kuwait", label: "الكويت (AST)" },
  { value: "Asia/Baghdad", label: "بغداد (AST)" },
  { value: "Africa/Cairo", label: "القاهرة (EET)" },
  { value: "Asia/Amman", label: "عمّان (EET)" },
  { value: "Asia/Beirut", label: "بيروت (EET)" },
  { value: "Asia/Damascus", label: "دمشق (EET)" },
  { value: "Asia/Qatar", label: "قطر (AST)" },
  { value: "Asia/Muscat", label: "مسقط (GST)" },
  { value: "Asia/Jerusalem", label: "القدس (IST)" },
  { value: "Africa/Casablanca", label: "الدار البيضاء (WET)" },
  { value: "Africa/Tunis", label: "تونس (CET)" },
  { value: "Africa/Algiers", label: "الجزائر (CET)" },
];

const DEFAULT_SCHEDULE: BusinessHoursSchedule = {
  sat: { enabled: true, open: "09:00", close: "17:00" },
  sun: { enabled: true, open: "09:00", close: "17:00" },
  mon: { enabled: true, open: "09:00", close: "17:00" },
  tue: { enabled: true, open: "09:00", close: "17:00" },
  wed: { enabled: true, open: "09:00", close: "17:00" },
  thu: { enabled: true, open: "09:00", close: "17:00" },
  fri: { enabled: false, open: "09:00", close: "17:00" },
};

interface BusinessHoursFormProps {
  isAdmin: boolean;
}

export function BusinessHoursForm({ isAdmin }: BusinessHoursFormProps) {
  const t = useT();
  const businessHours = useQuery(api.automations.getBusinessHours);
  const saveBusinessHours = useMutation(api.automations.saveBusinessHours);

  const [schedule, setSchedule] = useState<BusinessHoursSchedule>(DEFAULT_SCHEDULE);
  const [timezone, setTimezone] = useState("Asia/Riyadh");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (businessHours) {
      setSchedule({
        ...DEFAULT_SCHEDULE,
        ...(businessHours.schedule as BusinessHoursSchedule),
      });
      setTimezone(businessHours.timezone);
    }
  }, [businessHours]);

  const updateDay = (dayKey: DayKey, field: keyof DaySchedule, value: string | boolean) => {
    setSchedule((prev) => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], [field]: value },
    }));
  };

  const handleSave = async () => {
    if (saving || !isAdmin) return;
    setSaving(true);
    try {
      await saveBusinessHours({ timezone, schedule });
      toast.success(t("Business hours saved", "تم حفظ ساعات العمل"));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes("INVALID_TIMEZONE")) {
        toast.error(t("Invalid timezone", "منطقة زمنية غير صالحة"));
      } else {
        toast.error(t("An error occurred", "حدث خطأ"));
      }
    } finally {
      setSaving(false);
    }
  };

  if (businessHours === undefined) {
    return (
      <div className="space-y-3">
        <div className="h-7 w-40 rounded bg-muted animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Clock className="size-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold font-cairo">
          {t("Business Hours", "ساعات العمل")}
        </h2>
      </div>
      <p className="text-sm text-muted-foreground font-cairo mb-4">
        {t(
          "Used by the \"Outside Business Hours\" trigger — when a customer messages outside these hours, the automation fires automatically.",
          "تُستخدم مع قاعدة \"خارج ساعات العمل\" — عندما تصلك رسالة خارج هذه الأوقات، يتم إرسال الرد التلقائي تلقائياً."
        )}
      </p>

      {!businessHours && (
        <p className="text-sm text-muted-foreground font-cairo mb-3">
          {t(
            "Not configured yet. Set your business hours for outside-hours rules.",
            "لم يتم الضبط بعد. اضبط ساعات العمل لاستخدام قواعد خارج أوقات العمل."
          )}
        </p>
      )}

      <div className="space-y-3">
        <div className="space-y-2">
          <label className="text-sm font-medium font-cairo">
            {t("Timezone", "المنطقة الزمنية")}
          </label>
          <Select value={timezone} onValueChange={(v) => { if (v !== null) setTimezone(v); }}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MENA_TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  <span className="font-cairo">{tz.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {DAYS.map((day) => {
            const daySchedule = schedule[day.key];
            return (
              <div
                key={day.key}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <Checkbox
                  checked={daySchedule.enabled}
                  onCheckedChange={(checked) =>
                    updateDay(day.key, "enabled", checked === true)
                  }
                  disabled={!isAdmin}
                />
                <span className="w-20 text-sm font-cairo font-medium">
                  {day.ar}
                </span>
                <div className="flex items-center gap-2 ms-auto">
                  {daySchedule.open === "00:00" && daySchedule.close === "23:59" ? (
                    <span className="text-sm font-cairo text-primary font-medium px-2">
                      {t("24 hrs", "٢٤ ساعة")}
                    </span>
                  ) : (
                    <>
                      <Input
                        type="time"
                        value={daySchedule.open}
                        onChange={(e) => updateDay(day.key, "open", e.target.value)}
                        dir="ltr"
                        className="w-28 h-8 text-sm"
                        disabled={!isAdmin || !daySchedule.enabled}
                      />
                      <span className="text-sm text-muted-foreground">—</span>
                      <Input
                        type="time"
                        value={daySchedule.close}
                        onChange={(e) => updateDay(day.key, "close", e.target.value)}
                        dir="ltr"
                        className="w-28 h-8 text-sm"
                        disabled={!isAdmin || !daySchedule.enabled}
                      />
                    </>
                  )}
                  {isAdmin && daySchedule.enabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs font-cairo"
                      onClick={() => {
                        if (daySchedule.open === "00:00" && daySchedule.close === "23:59") {
                          updateDay(day.key, "open", "09:00");
                          updateDay(day.key, "close", "17:00");
                        } else {
                          updateDay(day.key, "open", "00:00");
                          updateDay(day.key, "close", "23:59");
                        }
                      }}
                    >
                      {daySchedule.open === "00:00" && daySchedule.close === "23:59"
                        ? t("Custom", "مخصص")
                        : t("24h", "٢٤ ساعة")}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {isAdmin && (
          <Button onClick={handleSave} disabled={saving}>
            {saving
              ? t("Saving...", "جاري الحفظ...")
              : t("Save Business Hours", "حفظ ساعات العمل")}
          </Button>
        )}
      </div>
    </div>
  );
}
