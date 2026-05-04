"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { useAuth } from "@clerk/nextjs";

/**
 * ConvexAuthGuard
 *
 * Wraps all dashboard children and delays rendering until both Convex's
 * client-side auth token AND Clerk's org context are ready. Without the org
 * check, ConvexProviderWithClerk can issue a token before the active org is
 * reflected in the session (e.g. fresh sign-in), producing a JWT with an
 * empty orgId claim — causing every Convex query to throw NO_ORG.
 *
 * If Clerk is fully loaded but the session has no active org, we redirect
 * client-side to /select-org as a fallback to the server-side layout redirect.
 */
export function ConvexAuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { isLoaded: clerkLoaded, orgId } = useAuth();
  const router = useRouter();

  // If Clerk is fully initialised but there's no active org, push to the org
  // selector. The server-side layout already handles this, but there is a
  // window on the client where the session cookie is read but org activation
  // hasn't propagated to useAuth yet.
  useEffect(() => {
    if (clerkLoaded && !orgId) {
      router.replace("/select-org");
    }
  }, [clerkLoaded, orgId, router]);

  if (isLoading || !isAuthenticated || !clerkLoaded || !orgId) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
