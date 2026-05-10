"use client";

import { useEffect, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

/** Runs once per session to apply any pending channel/dept invite assignments for the current user. */
export function PendingAssignmentBootstrap() {
  const apply = useAction(api.pendingChannelAssignments.applyPendingForCurrentUser);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    apply({}).catch(() => {
      // Silent — not critical, will retry on next app load
    });
  }, [apply]);

  return null;
}
