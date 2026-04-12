export type TriggerType =
  | "keyword"
  | "outside_hours"
  | "first_message"
  | "no_reply_timeout";

export type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export type DaySchedule = {
  open: string;
  close: string;
  enabled: boolean;
};

export type BusinessHoursSchedule = Record<DayKey, DaySchedule>;

export type InterpolationVars = {
  customer_name: string;
  business_name: string;
  agent_name: string;
  current_time: string;
};

export function interpolateTemplate(
  template: string,
  vars: Partial<InterpolationVars>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    switch (key) {
      case "customer_name":
        return vars.customer_name ?? "عزيزي العميل";
      case "business_name":
        return vars.business_name ?? "";
      case "agent_name":
        return vars.agent_name ?? "فريق الدعم";
      case "current_time":
        return vars.current_time ?? "";
      default:
        return match;
    }
  });
}

const JS_DAY_TO_SCHEDULE_DAY: Record<number, DayKey> = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
};

function parseTimeToMinutes(time: string): number {
  const parts = time.split(":");
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

export function isOutsideBusinessHours(
  schedule: BusinessHoursSchedule,
  timezone: string,
): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const weekdayPart = parts.find((p) => p.type === "weekday");
  const hourPart = parts.find((p) => p.type === "hour");
  const minutePart = parts.find((p) => p.type === "minute");

  if (!weekdayPart || !hourPart || !minutePart) return false;

  const jsDayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const jsDay = jsDayMap[weekdayPart.value] ?? 0;
  const dayKey = JS_DAY_TO_SCHEDULE_DAY[jsDay];
  const daySchedule = schedule[dayKey];

  if (!daySchedule || !daySchedule.enabled) return true;

  const currentMinutes =
    parseInt(hourPart.value, 10) * 60 + parseInt(minutePart.value, 10);
  const openMinutes = parseTimeToMinutes(daySchedule.open);
  const closeMinutes = parseTimeToMinutes(daySchedule.close);

  if (closeMinutes < openMinutes) {
    return currentMinutes < openMinutes && currentMinutes >= closeMinutes;
  }

  return currentMinutes < openMinutes || currentMinutes >= closeMinutes;
}

export type ResolveVariablesContext = {
  contactCustomName?: string;
  contactDisplayName: string;
  businessName: string;
  agentName?: string;
  timezone: string;
};

export function resolveVariables(
  ctx: ResolveVariablesContext,
): InterpolationVars {
  return {
    customer_name:
      ctx.contactCustomName ?? ctx.contactDisplayName ?? "عزيزي العميل",
    business_name: ctx.businessName,
    agent_name: ctx.agentName ?? "فريق الدعم",
    current_time: new Date().toLocaleTimeString("ar-EG", {
      timeZone: ctx.timezone,
    }),
  };
}
