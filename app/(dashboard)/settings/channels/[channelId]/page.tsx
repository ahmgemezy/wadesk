"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AssignmentModeSelect } from "@/components/settings/assignment-mode-select";

export default function ChannelSettingsPage({
  params,
}: {
  params: { channelId: string };
}) {
  const channel = useQuery(api.channels.get, {
    channelId: params.channelId as Id<"channels">,
  });

  if (channel === undefined) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <div className="h-8 rounded bg-muted animate-pulse w-48" />
        <div className="h-32 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center text-muted-foreground">
        القناة غير موجودة / Channel not found
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">
        إعدادات القناة / Channel Settings
      </h1>
      <div className="text-sm text-muted-foreground">
        {channel.displayName}
      </div>
      <AssignmentModeSelect
        channelId={params.channelId as Id<"channels">}
        currentMode={channel.assignmentMode}
      />
    </div>
  );
}
