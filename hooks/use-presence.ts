"use client";

import { useEffect, useRef } from "react";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";

export function usePresence() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const heartbeat = useMutation(api.presence.heartbeat);
  const setStatus = useMutation(api.presence.setStatus);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Don't run until Convex's auth identity is fully synced — gates against
    // the 5-minute inactivity timer firing setStatus after the Clerk JWT for
    // the "convex" template has lapsed.
    if (isLoading || !isAuthenticated) return;

    const handleActivity = async () => {
      // Clear existing inactivity timer
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      // Send heartbeat (silently fail if unauthorized)
      try {
        await heartbeat({});
      } catch (error) {
        if (!(error instanceof Error && error.message.includes("UNAUTHORIZED"))) {
          console.error("Heartbeat error:", error);
        }
        return;
      }

      // Set timer for automatic away status after 5 minutes of inactivity
      inactivityTimerRef.current = setTimeout(async () => {
        try {
          await setStatus({ status: "away" });
        } catch (error) {
          if (!(error instanceof Error && error.message.includes("UNAUTHORIZED"))) {
            console.error("Set status error:", error);
          }
        }
      }, 5 * 60 * 1000); // 5 minutes
    };

    // Attach activity listeners
    const events = ["mousedown", "keydown", "touchstart", "click"];
    events.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    // Initial heartbeat on mount (with slight delay to ensure auth is ready)
    const initialHeartbeatTimeout = setTimeout(handleActivity, 500);

    // Cleanup
    return () => {
      clearTimeout(initialHeartbeatTimeout);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [heartbeat, setStatus, isAuthenticated, isLoading]);
}