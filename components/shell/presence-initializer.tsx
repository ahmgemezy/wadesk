"use client";

import { usePresence } from "@/hooks/use-presence";

export function PresenceInitializer() {
  usePresence();
  return null;
}
