"use client";

import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useT, useLocale } from "@/lib/i18n/context";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { TIMEZONES, getTimezoneLabel, type TimezoneEntry } from "@/lib/timezones";
import type { DayKey, BusinessHoursSchedule, DaySchedule } from "@/lib/automationHelpers";
import { Clock } from "lucide-react";

const DAYS: { key: DayKey; ar: string; en: string }[] = [
  { key: "sat", ar: "السبت", en: "Saturday" },
  { key: "sun", ar: "الأحد", en: "Sunday" },
  { key: "mon", ar: "الاثنين", en: "Monday" },
  { key: "tue", ar: "الثلاثاء", en: "Tuesday" },
  { key: "wed", ar: "الأربعاء", en: "Wednesday" },
  { key: "thu", ar: "الخميس", en: "Thursday" },
  { key: "fri", ar: "الجمعة", en: "Friday" },
];

const _tzLabelsCache: Map<string, { ar: string; en: string }> = new Map();
function getTzLabels(tz: TimezoneEntry) {
  const cached = _tzLabelsCache.get(tz.value);
  if (cached) return cached;
  const labels = { ar: getTimezoneLabel(tz, "ar"), en: getTimezoneLabel(tz, "en") };
  _tzLabelsCache.set(tz.value, labels);
  return labels;
}

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
  const locale = useLocale();
  const businessHours = useQuery(api.automations.getBusinessHours);
  const saveBusinessHours = useMutation(api.automations.saveBusinessHours);

  const timezoneOptions = useMemo(
    () =>
      TIMEZONES.map((tz) => {
        const labels = getTzLabels(tz);
        return {
          value: tz.value,
          label: locale === "ar" ? labels.ar : labels.en,
          searchLabel: `${tz.value} ${tz.labelAr} ${tz.labelEn}`,
        };
      }),
    [locale]
  );

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
          <SearchableSelect
            options={timezoneOptions}
            value={timezone}
            onValueChange={setTimezone}
            placeholder={t("Select timezone...", "اختر المنطقة الزمنية...")}
            searchPlaceholder={t("Search timezone...", "ابحث عن المنطقة الزمنية...")}
          />
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
                  {locale === "ar" ? day.ar : day.en}
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
