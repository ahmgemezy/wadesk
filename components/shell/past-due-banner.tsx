"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DT } from "@/lib/design-tokens";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export function PastDueBanner() {
  const status = useQuery(api.lib.tenants.getSubscriptionStatus);

  if (status?.paymentStatus !== "past_due") return null;

  return (
    <div className={`flex items-center gap-2 ${DT.BG_RED} border-b ${DT.BORDER_RED} px-4 py-2 text-sm text-white`}>
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        Payment failed — update your billing info to keep access.{" "}
        <Link href="/settings/billing" className="underline font-medium">
          Go to Billing
        </Link>
      </span>
    </div>
  );
}
