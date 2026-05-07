"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { useAuth } from "@/lib/auth-hooks";

// ConvexAuthGuard delays rendering dashboard children until the Convex auth
// token is ready and the user has an active org in their session. If the
// session has no active org, redirect to /select-org as a client-side fallback
// to the server-side layout redirect.
export function ConvexAuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { isLoaded, orgId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !orgId && isAuthenticated) {
      router.replace("/select-org");
    }
  }, [isLoaded, orgId, isAuthenticated, router]);

  if (isLoading || !isAuthenticated || !isLoaded || !orgId) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
