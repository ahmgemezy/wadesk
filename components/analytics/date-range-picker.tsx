"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format, subDays, differenceInDays } from "date-fns";

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  locale?: "ar" | "en";
}

const PRESETS = [
  { labelAr: "آخر 7 أيام", labelEn: "Last 7 days", days: 7 },
  { labelAr: "آخر 30 يومًا", labelEn: "Last 30 days", days: 30 },
  { labelAr: "آخر 90 يومًا", labelEn: "Last 90 days", days: 90 },
];

export function DateRangePicker({ value, onChange, locale = "ar" }: DateRangePickerProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePreset = (days: number) => {
    setError(null);
    const to = new Date();
    const from = subDays(to, days);
    onChange({ from, to });
  };

  const handleCalendarSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range?.from || !range?.to) return;

    const diff = differenceInDays(range.to, range.from);
    if (diff > 365) {
      setError(locale === "ar" ? "الحد الأقصى 365 يومًا" : "Max range is 365 days");
      return;
    }

    setError(null);
    onChange({ from: range.from, to: range.to });
    setCalendarOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((preset) => {
        const isActive =
          differenceInDays(value.to, value.from) === preset.days &&
          format(value.to, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
        return (
          <Button
            key={preset.days}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => handlePreset(preset.days)}
          >
            {locale === "ar" ? preset.labelAr : preset.labelEn}
          </Button>
        );
      })}

      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger render={<div />} nativeButton={false}>
          <Button variant="outline" size="sm" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            {format(value.from, "yyyy/MM/dd")} — {format(value.to, "yyyy/MM/dd")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ from: value.from, to: value.to }}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
