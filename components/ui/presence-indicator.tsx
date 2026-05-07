"use client";

import { useQuery } from "convex/react";
import { useOrganization } from "@/lib/auth-hooks";
import { api } from "@/convex/_generated/api";

interface PresenceIndicatorProps {
  userId: string;
  showLabel?: boolean;
}

export function PresenceIndicator({ userId, showLabel = false }: PresenceIndicatorProps) {
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const onlineUsers = useQuery(api.presence.listOnline, { tenantId: orgId ?? undefined }) ?? [];
  const isOnline = onlineUsers.some((u) => u.userId === userId);

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`w-2 h-2 rounded-full ${
          isOnline ? "bg-green-500" : "bg-gray-300"
        }`}
        title={isOnline ? "Online" : "Offline"}
      />
      {showLabel && (
        <span className="text-xs text-muted-foreground">
          {isOnline ? "Online" : "Offline"}
        </span>
      )}
    </span>
  );
}

export function useOnlineStatus() {
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const onlineUsers = useQuery(api.presence.listOnline, { tenantId: orgId ?? undefined }) ?? [];
  return onlineUsers;
}