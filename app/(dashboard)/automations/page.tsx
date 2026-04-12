"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { AutomationRulesClient } from "@/components/automations/AutomationRulesClient";

export default function AutomationsPage() {
  const { orgRole } = useAuth();
  const router = useRouter();

  if (orgRole === "org:agent") {
    router.replace("/inbox");
    return null;
  }

  return <AutomationRulesClient isAdmin={orgRole === "org:admin"} />;
}
