"use client";

import { useEffect, useRef } from "react";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";

const HEARTBEAT_INTERVAL_MS = 30_000; // keep presence alive every 30 s
const INACTIVITY_AWAY_MS = 5 * 60 * 1000; // go away after 5 min idle
const NO_ORG_RETRY_DELAYS_MS = [2_000, 5_000, 10_000]; // JWT refresh lag retries

export function usePresence() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const heartbeat = useMutation(api.presence.heartbeat);
  const setStatus = useMutation(api.presence.setStatus);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const noOrgRetryRef = useRef<NodeJS.Timeout | null>(null);
  const noOrgRetryCountRef = useRef(0);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    const clearNoOrgRetry = () => {
      if (noOrgRetryRef.current) clearTimeout(noOrgRetryRef.current);
    };

    const sendHeartbeat = async (isActivity = false) => {
      try {
        await heartbeat({});
        // Success — reset JWT-lag retry counter and clear pending retry
        noOrgRetryCountRef.current = 0;
        clearNoOrgRetry();
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes("UNAUTHORIZED")) return; // session ended, stay quiet

        // NO_ORG means the Convex JWT hasn't refreshed after setActive yet.
        // Retry a few times with increasing delays instead of giving up.
        if (msg.includes("NO_ORG")) {
          const attempt = noOrgRetryCountRef.current;
          if (attempt < NO_ORG_RETRY_DELAYS_MS.length) {
            noOrgRetryCountRef.current += 1;
            noOrgRetryRef.current = setTimeout(() => sendHeartbeat(), NO_ORG_RETRY_DELAYS_MS[attempt]);
          }
          return;
        }

        console.error("Heartbeat error:", error);
        return;
      }

      if (!isActivity) return;

      // Activity path: reset the inactivity → away timer
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(async () => {
        try {
          await setStatus({ status: "away" });
        } catch (error) {
          if (!(error instanceof Error && error.message.includes("UNAUTHORIZED"))) {
            console.error("Set status error:", error);
          }
        }
      }, INACTIVITY_AWAY_MS);
    };

    const handleActivity = () => { void sendHeartbeat(true); };

    const events = ["mousedown", "keydown", "touchstart", "click"];
    events.forEach((e) => document.addEventListener(e, handleActivity));

    // Initial heartbeat — JWT may still be refreshing after setActive, so
    // sendHeartbeat has its own NO_ORG retry chain; a short initial delay is
    // still useful to let the first token exchange settle.
    const initialTimer = setTimeout(() => sendHeartbeat(), 500);

    // Periodic heartbeat so presence survives long idle sessions (listOnline
    // drops records older than 60 s, so 30 s gives a 2× safety margin).
    heartbeatIntervalRef.current = setInterval(() => sendHeartbeat(), HEARTBEAT_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimer);
      clearNoOrgRetry();
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      events.forEach((e) => document.removeEventListener(e, handleActivity));
    };
  }, [heartbeat, setStatus, isAuthenticated, isLoading]);
}