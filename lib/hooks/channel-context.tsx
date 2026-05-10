"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Id } from "@/convex/_generated/dataModel";

interface ChannelContextValue {
  channelId: Id<"channels"> | null;
  setChannelId: (id: Id<"channels"> | null) => void;
}

const ChannelContext = createContext<ChannelContextValue>({
  channelId: null,
  setChannelId: () => {},
});

const STORAGE_KEY = "wabdesk_channel_v1";

export function SelectedChannelProvider({ children }: { children: ReactNode }) {
  const [channelId, setChannelIdState] = useState<Id<"channels"> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setChannelIdState(saved as Id<"channels">);
  }, []);

  function setChannelId(id: Id<"channels"> | null) {
    setChannelIdState(id);
    if (id === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, id);
  }

  return (
    <ChannelContext.Provider value={{ channelId, setChannelId }}>
      {children}
    </ChannelContext.Provider>
  );
}

export function useSelectedChannel() {
  return useContext(ChannelContext);
}
