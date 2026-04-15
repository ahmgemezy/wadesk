"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { AutomationRulesClient } from "@/components/automations/AutomationRulesClient";

export default function AutomationsPage() {
  const { orgRole, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (orgRole === "org:agent") {
      router.replace("/inbox");
    }
  }, [orgRole, isLoaded, router]);

  if (!isLoaded) return null;
  if (orgRole === "org:agent") return null;

  return <AutomationRulesClient isAdmin={orgRole === "org:admin"} />;
}
