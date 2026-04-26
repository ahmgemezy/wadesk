"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";

export function usePresence() {
  const { isLoaded, isSignedIn } = useUser();
  const heartbeat = useMutation(api.presence.heartbeat);
  const setStatus = useMutation(api.presence.setStatus);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Don't run until user is authenticated
    if (!isLoaded || !isSignedIn) return;

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
  }, [heartbeat, setStatus, isLoaded, isSignedIn]);
}