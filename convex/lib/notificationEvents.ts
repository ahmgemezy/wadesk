// convex/lib/notificationEvents.ts
// Single source of truth for notification event types and their defaults.
// Stage 1 of notification-prefs feature. DO NOT add fields here.

import { v } from "convex/values";
import type { Plan } from "./planLimits";

/**
 * User-toggleable event types. These are the events that appear in the
 * preferences UI. Transactional events (agent_welcome, channel_token_expired,
 * channel_deleted, billing_*) bypass this list and always send.
 */
export const TOGGLEABLE_EVENT_TYPES = [
  "sla_breach",
  "followup_due",
  "conversation_transferred",
  "conversation_assigned",
  "conversation_reopened",
  "csat_received",
  "channel_expiring_soon",
] as const;

export type ToggleableEventType = (typeof TOGGLEABLE_EVENT_TYPES)[number];

/**
 * Convex validator for the toggleable union. Use this for any mutation
 * argument that takes an eventType from the matrix.
 */
export const toggleableEventTypeValidator = v.union(
  v.literal("sla_breach"),
  v.literal("followup_due"),
  v.literal("conversation_transferred"),
  v.literal("conversation_assigned"),
  v.literal("conversation_reopened"),
  v.literal("csat_received"),
  v.literal("channel_expiring_soon"),
);

/**
 * Default preferences applied when no row exists for (tenantId, userId, eventType).
 * Decision 2a: opt-out, defaults all on for in-app. Email defaults are conservative
 * (cost-aware) — see notification-prefs/01-foundation.md for the table.
 */
export const EVENT_DEFAULTS: Record<
  ToggleableEventType,
  { inAppEnabled: boolean; emailEnabled: boolean }
> = {
  sla_breach:               { inAppEnabled: true,  emailEnabled: true  },
  followup_due:             { inAppEnabled: true,  emailEnabled: false },
  conversation_transferred: { inAppEnabled: true,  emailEnabled: false },
  conversation_assigned:    { inAppEnabled: true,  emailEnabled: true  },
  conversation_reopened:    { inAppEnabled: true,  emailEnabled: false },
  csat_received:            { inAppEnabled: true,  emailEnabled: false },
  channel_expiring_soon:    { inAppEnabled: true,  emailEnabled: true  },
};

/**
 * Events restricted to Growth+ plans. The toggle UI must hide or disable
 * these for Free/Starter users. notifyDispatch must short-circuit if the
 * tenant's plan is below the gate.
 */
export const GROWTH_PLUS_ONLY_EVENTS = new Set<ToggleableEventType>([
  "sla_breach",
  "csat_received",
]);

/**
 * Daily email cap per plan. Free is N/A — email channel is fully locked
 * behind Starter+. Soft cap: notifyDispatch silently drops the email
 * dispatch (in-app still fires) when reached.
 */
export const EMAIL_DAILY_CAP_BY_PLAN: Record<Plan, number | null> = {
  free: null, // email channel disabled entirely
  starter: 50,
  growth: 200,
  business: 1000,
};

/** Helper: returns the daily quota key for the rateLimits table. */
export function makeEmailDailyKey(tenantId: string, dateYmd: string): string {
  return `email:daily:${tenantId}:${dateYmd}`;
}

/** Helper: today's date in YYYY-MM-DD (UTC). */
export function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}
