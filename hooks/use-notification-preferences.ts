"use client";

import { useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  GROWTH_PLUS_ONLY_EVENTS,
  type ToggleableEventType,
} from "@/convex/lib/notificationEvents";
import { useT } from "@/lib/i18n/context";
import type { Plan } from "@/convex/lib/planLimits";
import type { Id } from "@/convex/_generated/dataModel";

type PreferenceRow = {
  eventType: ToggleableEventType;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  isPlanGated: boolean;
  isEmailGated: boolean;
};

type UseNotificationPreferencesReturn = {
  preferences: PreferenceRow[] | undefined;
  plan: Plan | undefined;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | undefined;
  updatePreference: (
    eventType: ToggleableEventType,
    inAppEnabled: boolean,
    emailEnabled: boolean,
  ) => Promise<void>;
};

export function useNotificationPreferences(channelId?: Id<"channels"> | null): UseNotificationPreferencesReturn {
  const t = useT();
  const queryArgs = channelId ? { channelId } : {};

  const rawPreferences = useQuery(api.notifications.getPreferences, queryArgs);
  const plan = useQuery(api.lib.tenants.getCurrentPlan);

  const updatePrefMutation = useMutation(
    api.notifications.updatePreference,
  ).withOptimisticUpdate((localStore, args) => {
    const key = args.channelId ? { channelId: args.channelId } : {};
    const existing = localStore.getQuery(api.notifications.getPreferences, key);
    if (existing === undefined) return;
    const updated = existing.map((row) =>
      row.eventType === args.eventType
        ? {
            ...row,
            inAppEnabled: args.inAppEnabled,
            emailEnabled: args.emailEnabled,
          }
        : row,
    );
    localStore.setQuery(api.notifications.getPreferences, key, updated);
  });

  const computedPreferences = useMemo<PreferenceRow[] | undefined>(() => {
    if (rawPreferences === undefined || plan === undefined) return undefined;
    return rawPreferences.map((row) => ({
      ...row,
      isPlanGated:
        GROWTH_PLUS_ONLY_EVENTS.has(row.eventType) &&
        (plan === "free" || plan === "starter"),
      isEmailGated: plan === "free",
    }));
  }, [rawPreferences, plan]);

  const updatePreference = useCallback(
    async (
      eventType: ToggleableEventType,
      inAppEnabled: boolean,
      emailEnabled: boolean,
    ): Promise<void> => {
      try {
        await updatePrefMutation({ eventType, inAppEnabled, emailEnabled, ...(channelId ? { channelId } : {}) });
      } catch (err) {
        toast.error(
          t(
            "Failed to update preference. Please try again.",
            "تعذّر تحديث التفضيل. حاول مجدداً.",
          ),
        );
        throw err;
      }
    },
    [updatePrefMutation, t],
  );

  return {
    preferences: computedPreferences,
    plan,
    isLoading: rawPreferences === undefined || plan === undefined,
    isError: false,
    errorMessage: undefined,
    updatePreference,
  };
}
