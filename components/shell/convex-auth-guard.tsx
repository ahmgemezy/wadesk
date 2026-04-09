"use client";

import { useConvexAuth } from "convex/react";

/**
 * ConvexAuthGuard
 *
 * Wraps all dashboard children and delays rendering until Convex's client-side
 * auth token has fully synced from Clerk. This prevents any child component from
 * firing Convex queries before the identity is ready, eliminating UNAUTHORIZED
 * errors that occur during hard refresh or language switching.
 *
 * The server-side layout already redirects unauthenticated users, so there's no
 * risk of this guard blocking legitimate visitors indefinitely.
 */
export function ConvexAuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
