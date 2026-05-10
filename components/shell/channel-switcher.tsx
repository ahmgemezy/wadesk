"use client";

import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSelectedChannel } from "@/lib/hooks/channel-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronsUpDown, Hash, Layers } from "lucide-react";

interface ChannelSwitcherProps {
  locale: "ar" | "en";
}

export function ChannelSwitcher({ locale }: ChannelSwitcherProps) {
  const { isAuthenticated } = useConvexAuth();
  const { channelId, setChannelId } = useSelectedChannel();

  const channels = useQuery(
    api.channels.listAccessible,
    isAuthenticated ? {} : "skip",
  ) ?? [];

  if (channels.length === 0) return null;

  const activeChannel = channelId ? channels.find((c) => c._id === channelId) : null;
  const label = activeChannel?.displayName ?? (locale === "ar" ? "كل القنوات" : "All Channels");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-7 w-full items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors data-[state=open]:bg-accent data-[state=open]:text-foreground outline-none">
        {activeChannel ? (
          <Hash className="size-3 shrink-0" />
        ) : (
          <Layers className="size-3 shrink-0" />
        )}
        <span className="truncate">{label}</span>
        <ChevronsUpDown className="size-3 shrink-0 ms-auto" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-48"
        align={locale === "ar" ? "end" : "start"}
        side="bottom"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {locale === "ar" ? "القنوات" : "Channels"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setChannelId(null)}
            className="gap-2"
            data-active={channelId === null}
          >
            <Layers className="size-3.5 text-muted-foreground" />
            <span>{locale === "ar" ? "كل القنوات" : "All Channels"}</span>
            {channelId === null && <span className="ms-auto text-xs text-muted-foreground">✓</span>}
          </DropdownMenuItem>
          {channels.map((ch) => (
            <DropdownMenuItem
              key={ch._id}
              onClick={() => setChannelId(ch._id as Id<"channels">)}
              className="gap-2"
            >
              <Hash className="size-3.5 text-muted-foreground" />
              <span className="truncate">{ch.displayName}</span>
              {channelId === ch._id && <span className="ms-auto text-xs text-muted-foreground">✓</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
